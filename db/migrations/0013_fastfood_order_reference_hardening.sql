DO $migration_guard$
BEGIN
    IF to_regclass('public.ff_orders') IS NULL THEN
        RAISE EXCEPTION 'FASTFOOD_ORDER_REFERENCE_REQUIRED_TABLE_MISSING: ff_orders';
    END IF;
    IF to_regprocedure('public.create_fastfood_order_atomic(text,text,uuid,text,text,text,text,text,text,text,text,jsonb,numeric,numeric,numeric,numeric,text,text,text,text,timestamptz)') IS NULL THEN
        RAISE EXCEPTION 'FASTFOOD_ORDER_REFERENCE_REQUIRED_FUNCTION_MISSING: create_fastfood_order_atomic';
    END IF;
END
$migration_guard$;

WITH duplicate_references AS (
    SELECT id,
        row_number() OVER (PARTITION BY business_id, order_number ORDER BY created_at, id) AS duplicate_position
    FROM ff_orders
    WHERE order_number IS NOT NULL
)
UPDATE ff_orders orders
SET order_number = '#MIG-' || orders.id::text,
    updated_at = now()
FROM duplicate_references duplicates
WHERE orders.id = duplicates.id
  AND duplicates.duplicate_position > 1;

DO $deduplication_check$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM ff_orders
        WHERE order_number IS NOT NULL
        GROUP BY business_id, order_number
        HAVING count(*) > 1
    ) THEN
        RAISE EXCEPTION 'FASTFOOD_ORDER_NUMBER_DEDUPLICATION_FAILED';
    END IF;
END
$deduplication_check$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_ff_orders_business_order_number
    ON ff_orders (business_id, order_number)
    WHERE order_number IS NOT NULL;

DO $index_postcondition$
DECLARE
    v_is_unique boolean;
    v_is_valid boolean;
    v_is_ready boolean;
    v_predicate text;
    v_columns text[];
BEGIN
    SELECT
        index_meta.indisunique,
        index_meta.indisvalid,
        index_meta.indisready,
        pg_get_expr(index_meta.indpred, index_meta.indrelid),
        ARRAY(
            SELECT attribute.attname
            FROM unnest(index_meta.indkey::smallint[]) WITH ORDINALITY AS key_column(attnum, position)
            JOIN pg_attribute attribute
              ON attribute.attrelid = index_meta.indrelid
             AND attribute.attnum = key_column.attnum
            ORDER BY key_column.position
        )
    INTO v_is_unique, v_is_valid, v_is_ready, v_predicate, v_columns
    FROM pg_index index_meta
    JOIN pg_class index_class ON index_class.oid = index_meta.indexrelid
    JOIN pg_namespace index_namespace ON index_namespace.oid = index_class.relnamespace
    WHERE index_namespace.nspname = 'public'
      AND index_class.relname = 'idx_ff_orders_business_order_number';

    IF NOT FOUND
       OR v_is_unique IS NOT TRUE
       OR v_is_valid IS NOT TRUE
       OR v_is_ready IS NOT TRUE
       OR v_columns IS DISTINCT FROM ARRAY['business_id', 'order_number']::text[]
       OR lower(regexp_replace(COALESCE(v_predicate, ''), '[[:space:]()]', '', 'g')) <> 'order_numberisnotnull'
    THEN
        RAISE EXCEPTION 'FASTFOOD_ORDER_NUMBER_INDEX_POSTCONDITION_FAILED';
    END IF;
END
$index_postcondition$;

ALTER FUNCTION create_fastfood_order_atomic(
    text,text,uuid,text,text,text,text,text,text,text,text,jsonb,
    numeric,numeric,numeric,numeric,text,text,text,text,timestamptz
) RENAME TO create_fastfood_order_atomic_v1;

CREATE OR REPLACE FUNCTION create_fastfood_order_atomic(
    p_idempotency_key text,
    p_idempotency_fingerprint text,
    p_app_user_id uuid,
    p_business_id text,
    p_business_name text,
    p_order_number text,
    p_customer_name text,
    p_customer_phone text,
    p_customer_address text,
    p_delivery_type text,
    p_payment_method text,
    p_items jsonb,
    p_subtotal numeric,
    p_delivery_fee numeric,
    p_coupon_discount numeric,
    p_total numeric,
    p_customer_note text,
    p_coupon_id text,
    p_coupon_code text,
    p_table_id text,
    p_created_at timestamptz
)
RETURNS TABLE(order_id text, order_number text, status text, was_created boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
    v_result record;
    v_current_status text;
    v_constraint_name text;
BEGIN
    SELECT * INTO v_result
    FROM create_fastfood_order_atomic_v1(
        p_idempotency_key, p_idempotency_fingerprint, p_app_user_id,
        p_business_id, p_business_name, p_order_number, p_customer_name,
        p_customer_phone, p_customer_address, p_delivery_type, p_payment_method,
        p_items, p_subtotal, p_delivery_fee, p_coupon_discount, p_total,
        p_customer_note, p_coupon_id, p_coupon_code, p_table_id, p_created_at
    );

    v_current_status := v_result.status;
    IF v_result.was_created IS FALSE THEN
        SELECT current_order.status::text
        INTO v_current_status
        FROM ff_orders current_order
        WHERE current_order.id::text = v_result.order_id
        LIMIT 1;
    END IF;

    RETURN QUERY SELECT
        v_result.order_id::text,
        v_result.order_number::text,
        COALESCE(v_current_status, 'pending')::text,
        v_result.was_created::boolean;
EXCEPTION
    WHEN unique_violation THEN
        GET STACKED DIAGNOSTICS v_constraint_name = CONSTRAINT_NAME;
        IF v_constraint_name = 'idx_ff_orders_business_order_number' THEN
            RAISE EXCEPTION 'ORDER_NUMBER_CONFLICT' USING ERRCODE = '23505';
        END IF;
        RAISE;
END
$function$;

REVOKE ALL ON FUNCTION create_fastfood_order_atomic(
    text,text,uuid,text,text,text,text,text,text,text,text,jsonb,
    numeric,numeric,numeric,numeric,text,text,text,text,timestamptz
) FROM PUBLIC;

DO $order_grants$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
        GRANT EXECUTE ON FUNCTION create_fastfood_order_atomic(
            text,text,uuid,text,text,text,text,text,text,text,text,jsonb,
            numeric,numeric,numeric,numeric,text,text,text,text,timestamptz
        ) TO service_role;
    END IF;
END
$order_grants$;
