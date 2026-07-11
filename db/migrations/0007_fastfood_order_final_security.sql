DO $migration_guard$
BEGIN
    IF to_regclass('public.ff_coupons') IS NULL THEN
        RAISE EXCEPTION 'FASTFOOD_ORDER_FINAL_SECURITY_REQUIRED_TABLE_MISSING: ff_coupons';
    END IF;
    IF to_regclass('public.ff_order_notification_outbox') IS NULL THEN
        RAISE EXCEPTION 'FASTFOOD_ORDER_FINAL_SECURITY_REQUIRED_TABLE_MISSING: ff_order_notification_outbox';
    END IF;
END
$migration_guard$;

ALTER TABLE ff_coupons
    ADD COLUMN IF NOT EXISTS normalized_code text
    GENERATED ALWAYS AS (upper(btrim(code))) STORED;

CREATE INDEX IF NOT EXISTS idx_ff_coupons_business_normalized_code
    ON ff_coupons (business_id, normalized_code)
    WHERE normalized_code IS NOT NULL;

ALTER TABLE ff_order_notification_outbox
    ADD COLUMN IF NOT EXISTS claim_token uuid;

DROP FUNCTION IF EXISTS claim_fastfood_notification_outbox(integer);

CREATE OR REPLACE FUNCTION claim_fastfood_notification_outbox(p_limit integer DEFAULT 20)
RETURNS TABLE(
    id text,
    business_id text,
    order_id text,
    event_type text,
    idempotency_key text,
    attempt_count integer,
    claim_token uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $claim$
BEGIN
    RETURN QUERY
    WITH candidates AS (
        SELECT pending.id
        FROM ff_order_notification_outbox pending
        WHERE (pending.status = 'pending' AND pending.available_at <= now())
           OR (pending.status = 'processing' AND pending.locked_at < now() - interval '5 minutes')
        ORDER BY pending.created_at
        FOR UPDATE SKIP LOCKED
        LIMIT greatest(1, least(COALESCE(p_limit, 20), 100))
    ), claimed AS (
        UPDATE ff_order_notification_outbox target
        SET status = 'processing',
            attempt_count = COALESCE(target.attempt_count, 0) + 1,
            claim_token = gen_random_uuid(),
            locked_at = now(),
            updated_at = now()
        FROM candidates
        WHERE target.id = candidates.id
        RETURNING target.id, target.business_id, target.order_id, target.event_type,
            target.idempotency_key, target.attempt_count, target.claim_token
    )
    SELECT claimed.id, claimed.business_id, claimed.order_id, claimed.event_type,
        claimed.idempotency_key, claimed.attempt_count, claimed.claim_token
    FROM claimed;
END
$claim$;

REVOKE ALL ON FUNCTION claim_fastfood_notification_outbox(integer) FROM PUBLIC;

DO $outbox_grants$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
        GRANT EXECUTE ON FUNCTION claim_fastfood_notification_outbox(integer) TO service_role;
    END IF;
END
$outbox_grants$;
