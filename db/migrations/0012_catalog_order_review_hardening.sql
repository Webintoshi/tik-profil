-- Forward-only verification for catalog objects created by migration 0010.
-- Existing migration checksums stay immutable for already-upgraded environments.

DO $$
BEGIN
    IF to_regclass('public.ecommerce_orders') IS NULL THEN
        RETURN;
    END IF;

    IF to_regclass('public.app_users') IS NULL THEN
        RAISE EXCEPTION 'app_users is required for catalog order ownership';
    END IF;

    IF EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'public.ecommerce_orders'::regclass
          AND conname = 'ecommerce_orders_app_user_id_fkey'
    ) AND NOT EXISTS (
        SELECT 1 FROM pg_constraint constraint_row
        WHERE constraint_row.conrelid = 'public.ecommerce_orders'::regclass
          AND constraint_row.conname = 'ecommerce_orders_app_user_id_fkey'
          AND constraint_row.contype = 'f'
          AND constraint_row.confrelid = 'public.app_users'::regclass
          AND constraint_row.confdeltype = 'n'
          AND pg_get_constraintdef(constraint_row.oid) ~* 'FOREIGN KEY \(app_user_id\).*REFERENCES .*app_users\(id\).*ON DELETE SET NULL'
    ) THEN
        RAISE EXCEPTION 'ecommerce_orders_app_user_id_fkey exists with incompatible semantics';
    ELSIF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'public.ecommerce_orders'::regclass
          AND conname = 'ecommerce_orders_app_user_id_fkey'
    ) THEN
        ALTER TABLE ecommerce_orders
            ADD CONSTRAINT ecommerce_orders_app_user_id_fkey
            FOREIGN KEY (app_user_id) REFERENCES app_users(id) ON DELETE SET NULL NOT VALID;
    END IF;

    IF to_regclass('public.uq_ecommerce_orders_business_idempotency') IS NOT NULL
       AND NOT EXISTS (
            SELECT 1
            FROM pg_index index_row
            WHERE index_row.indexrelid = 'public.uq_ecommerce_orders_business_idempotency'::regclass
              AND index_row.indrelid = 'public.ecommerce_orders'::regclass
              AND index_row.indisunique
              AND pg_get_indexdef(index_row.indexrelid) ~* '\(business_id, idempotency_key\).*WHERE \(idempotency_key IS NOT NULL\)'
       ) THEN
        RAISE EXCEPTION 'uq_ecommerce_orders_business_idempotency exists with incompatible semantics';
    ELSE
        CREATE UNIQUE INDEX IF NOT EXISTS uq_ecommerce_orders_business_idempotency
            ON ecommerce_orders (business_id, idempotency_key)
            WHERE idempotency_key IS NOT NULL;
    END IF;
END $$;
