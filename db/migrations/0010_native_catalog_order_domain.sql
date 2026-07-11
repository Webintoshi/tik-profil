-- Canonical ecommerce checkout hardening. Checkout fails closed when the
-- established ecommerce tables are absent; legacy app_documents are not read.

DO $$
BEGIN
    IF to_regclass('public.ecommerce_products') IS NOT NULL THEN
        ALTER TABLE ecommerce_products
            ADD COLUMN IF NOT EXISTS slug text,
            ADD COLUMN IF NOT EXISTS stock_quantity integer NOT NULL DEFAULT 0,
            ADD COLUMN IF NOT EXISTS track_stock boolean NOT NULL DEFAULT false;

        IF NOT EXISTS (
            SELECT 1 FROM pg_constraint
            WHERE conrelid = 'public.ecommerce_products'::regclass
              AND conname = 'ecommerce_products_stock_quantity_nonnegative'
        ) THEN
            ALTER TABLE ecommerce_products
                ADD CONSTRAINT ecommerce_products_stock_quantity_nonnegative
                CHECK (stock_quantity >= 0) NOT VALID;
        END IF;
    END IF;
END $$;

DO $$
BEGIN
    IF to_regclass('public.ecommerce_coupons') IS NOT NULL THEN
        ALTER TABLE ecommerce_coupons
            ADD COLUMN IF NOT EXISTS current_usage_count integer NOT NULL DEFAULT 0;

        IF NOT EXISTS (
            SELECT 1 FROM pg_constraint
            WHERE conrelid = 'public.ecommerce_coupons'::regclass
              AND conname = 'ecommerce_coupons_usage_nonnegative'
        ) THEN
            ALTER TABLE ecommerce_coupons
                ADD CONSTRAINT ecommerce_coupons_usage_nonnegative
                CHECK (current_usage_count >= 0) NOT VALID;
        END IF;
    END IF;
END $$;

DO $$
DECLARE
    app_user_id_type text;
    order_app_user_id_type text;
BEGIN
    IF to_regclass('public.ecommerce_orders') IS NOT NULL THEN
        IF to_regclass('public.app_users') IS NULL THEN
            RAISE EXCEPTION 'app_users is required before native catalog checkout migration';
        END IF;

        SELECT format_type(attribute.atttypid, attribute.atttypmod)
          INTO app_user_id_type
          FROM pg_attribute attribute
         WHERE attribute.attrelid = 'public.app_users'::regclass
           AND attribute.attname = 'id'
           AND NOT attribute.attisdropped;

        IF NOT EXISTS (
            SELECT 1 FROM pg_attribute attribute
            WHERE attribute.attrelid = 'public.ecommerce_orders'::regclass
              AND attribute.attname = 'app_user_id'
              AND NOT attribute.attisdropped
        ) THEN
            EXECUTE format('ALTER TABLE ecommerce_orders ADD COLUMN app_user_id %s', app_user_id_type);
        ELSE
            SELECT format_type(attribute.atttypid, attribute.atttypmod)
              INTO order_app_user_id_type
              FROM pg_attribute attribute
             WHERE attribute.attrelid = 'public.ecommerce_orders'::regclass
               AND attribute.attname = 'app_user_id'
               AND NOT attribute.attisdropped;
            IF order_app_user_id_type <> app_user_id_type THEN
                RAISE EXCEPTION 'ecommerce_orders.app_user_id type % does not match app_users.id type %',
                    order_app_user_id_type, app_user_id_type;
            END IF;
        END IF;

        ALTER TABLE ecommerce_orders
            ADD COLUMN IF NOT EXISTS customer_city text,
            ADD COLUMN IF NOT EXISTS customer_district text,
            ADD COLUMN IF NOT EXISTS shipping_method text,
            ADD COLUMN IF NOT EXISTS idempotency_key text,
            ADD COLUMN IF NOT EXISTS idempotency_fingerprint text;

        IF NOT EXISTS (
            SELECT 1 FROM pg_constraint
            WHERE conrelid = 'public.ecommerce_orders'::regclass
              AND conname = 'ecommerce_orders_totals_nonnegative'
        ) THEN
            ALTER TABLE ecommerce_orders
                ADD CONSTRAINT ecommerce_orders_totals_nonnegative
                CHECK (subtotal >= 0 AND total >= 0 AND shipping_fee >= 0) NOT VALID;
        END IF;

        IF to_regclass('public.app_users') IS NOT NULL AND NOT EXISTS (
            SELECT 1 FROM pg_constraint
            WHERE conrelid = 'public.ecommerce_orders'::regclass
              AND conname = 'ecommerce_orders_app_user_id_fkey'
        ) THEN
            ALTER TABLE ecommerce_orders
                ADD CONSTRAINT ecommerce_orders_app_user_id_fkey
                FOREIGN KEY (app_user_id) REFERENCES app_users(id) ON DELETE SET NULL NOT VALID;
        END IF;

        CREATE UNIQUE INDEX IF NOT EXISTS uq_ecommerce_orders_business_idempotency
            ON ecommerce_orders (business_id, idempotency_key)
            WHERE idempotency_key IS NOT NULL;
        CREATE INDEX IF NOT EXISTS idx_ecommerce_orders_app_user_recent
            ON ecommerce_orders (app_user_id, created_at DESC)
            WHERE app_user_id IS NOT NULL;
    END IF;
END $$;
