CREATE TABLE IF NOT EXISTS customer_profiles (
    app_user_id uuid PRIMARY KEY REFERENCES app_users(id) ON DELETE CASCADE,
    display_name text,
    phone text,
    avatar_url text,
    birth_date date,
    marital_status text,
    occupation text,
    hobbies text[] NOT NULL DEFAULT ARRAY[]::text[],
    preferences jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS customer_addresses (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    app_user_id uuid NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
    label text NOT NULL,
    full_address text NOT NULL,
    district text NOT NULL,
    city text NOT NULL,
    latitude numeric(9, 6),
    longitude numeric(9, 6),
    is_default boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_customer_addresses_app_user_id
    ON customer_addresses (app_user_id, created_at ASC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_customer_addresses_one_default
    ON customer_addresses (app_user_id)
    WHERE is_default = true;

CREATE TABLE IF NOT EXISTS customer_favorites (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    app_user_id uuid NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
    business_slug text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (app_user_id, business_slug)
);

CREATE INDEX IF NOT EXISTS idx_customer_favorites_app_user_recent
    ON customer_favorites (app_user_id, created_at DESC);

DO $$
BEGIN
    IF to_regclass('public.ff_orders') IS NOT NULL THEN
        ALTER TABLE ff_orders
            ADD COLUMN IF NOT EXISTS app_user_id uuid;
        IF NOT EXISTS (
            SELECT 1 FROM pg_constraint
            WHERE conname = 'ff_orders_app_user_id_fkey'
              AND conrelid = 'public.ff_orders'::regclass
        ) THEN
            ALTER TABLE ff_orders
                ADD CONSTRAINT ff_orders_app_user_id_fkey
                FOREIGN KEY (app_user_id) REFERENCES app_users(id) ON DELETE SET NULL;
        END IF;
        CREATE INDEX IF NOT EXISTS idx_ff_orders_app_user_recent
            ON ff_orders (app_user_id, created_at DESC)
            WHERE app_user_id IS NOT NULL;
    END IF;
END $$;

DO $$
BEGIN
    IF to_regclass('public.ecommerce_orders') IS NOT NULL THEN
        ALTER TABLE ecommerce_orders
            ADD COLUMN IF NOT EXISTS app_user_id uuid;
        IF NOT EXISTS (
            SELECT 1 FROM pg_constraint
            WHERE conname = 'ecommerce_orders_app_user_id_fkey'
              AND conrelid = 'public.ecommerce_orders'::regclass
        ) THEN
            ALTER TABLE ecommerce_orders
                ADD CONSTRAINT ecommerce_orders_app_user_id_fkey
                FOREIGN KEY (app_user_id) REFERENCES app_users(id) ON DELETE SET NULL;
        END IF;
        CREATE INDEX IF NOT EXISTS idx_ecommerce_orders_app_user_recent
            ON ecommerce_orders (app_user_id, created_at DESC)
            WHERE app_user_id IS NOT NULL;
    END IF;
END $$;

DO $$
BEGIN
    IF to_regclass('public.hotel_reservations') IS NOT NULL THEN
        ALTER TABLE hotel_reservations
            ADD COLUMN IF NOT EXISTS app_user_id uuid;
        IF NOT EXISTS (
            SELECT 1 FROM pg_constraint
            WHERE conname = 'hotel_reservations_app_user_id_fkey'
              AND conrelid = 'public.hotel_reservations'::regclass
        ) THEN
            ALTER TABLE hotel_reservations
                ADD CONSTRAINT hotel_reservations_app_user_id_fkey
                FOREIGN KEY (app_user_id) REFERENCES app_users(id) ON DELETE SET NULL;
        END IF;
        CREATE INDEX IF NOT EXISTS idx_hotel_reservations_app_user_recent
            ON hotel_reservations (app_user_id, created_at DESC)
            WHERE app_user_id IS NOT NULL;
    END IF;
END $$;

DO $$
BEGIN
    IF to_regclass('public.vehicle_reservations') IS NOT NULL THEN
        ALTER TABLE vehicle_reservations
            ADD COLUMN IF NOT EXISTS app_user_id uuid;
        IF NOT EXISTS (
            SELECT 1 FROM pg_constraint
            WHERE conname = 'vehicle_reservations_app_user_id_fkey'
              AND conrelid = 'public.vehicle_reservations'::regclass
        ) THEN
            ALTER TABLE vehicle_reservations
                ADD CONSTRAINT vehicle_reservations_app_user_id_fkey
                FOREIGN KEY (app_user_id) REFERENCES app_users(id) ON DELETE SET NULL;
        END IF;
        CREATE INDEX IF NOT EXISTS idx_vehicle_reservations_app_user_recent
            ON vehicle_reservations (app_user_id, created_at DESC)
            WHERE app_user_id IS NOT NULL;
    END IF;
END $$;
