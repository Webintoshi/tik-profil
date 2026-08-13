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
