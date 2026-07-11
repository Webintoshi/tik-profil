DO $$
DECLARE
    app_user_id_type text;
BEGIN
    IF to_regclass('public.app_users') IS NULL THEN
        RAISE EXCEPTION 'listing_inquiries requires public.app_users before migration 0011 can run';
    END IF;

    SELECT format_type(attribute.atttypid, attribute.atttypmod)
    INTO app_user_id_type
    FROM pg_attribute attribute
    WHERE attribute.attrelid = 'public.app_users'::regclass
      AND attribute.attname = 'id'
      AND NOT attribute.attisdropped;

    IF app_user_id_type IS NULL THEN
        RAISE EXCEPTION 'listing_inquiries could not determine the type of app_users.id';
    END IF;

    EXECUTE format($schema$
        CREATE TABLE IF NOT EXISTS listing_inquiries (
            id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
            app_user_id %s NOT NULL,
            business_id text NOT NULL,
            business_name text NOT NULL,
            business_slug text NOT NULL,
            listing_id text NOT NULL,
            listing_title text NOT NULL,
            listing_price numeric(14, 2) NOT NULL CHECK (listing_price >= 0),
            listing_currency text NOT NULL,
            listing_image_url text,
            module_id text NOT NULL CHECK (module_id IN ('emlak', 'realestate')),
            customer_name text NOT NULL,
            customer_phone text NOT NULL,
            customer_email text,
            message text,
            status text NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending', 'contacted', 'resolved', 'rejected', 'cancelled')),
            idempotency_key text NOT NULL,
            idempotency_fingerprint text NOT NULL,
            created_at timestamptz NOT NULL DEFAULT now(),
            updated_at timestamptz NOT NULL DEFAULT now(),
            CHECK (length(business_slug) BETWEEN 1 AND 200),
            CHECK (length(listing_currency) BETWEEN 1 AND 12),
            CHECK (length(customer_name) BETWEEN 1 AND 120),
            CHECK (length(customer_phone) BETWEEN 1 AND 30),
            CHECK (customer_email IS NULL OR length(customer_email) <= 254),
            CHECK (message IS NULL OR length(message) <= 2000),
            CHECK (length(idempotency_key) BETWEEN 8 AND 128),
            CHECK (length(idempotency_fingerprint) = 64)
        )
    $schema$, app_user_id_type);

    IF NOT EXISTS (
        SELECT 1
        FROM pg_attribute inquiry_attribute
        JOIN pg_attribute user_attribute
          ON user_attribute.attrelid = 'public.app_users'::regclass
         AND user_attribute.attname = 'id'
         AND NOT user_attribute.attisdropped
         AND user_attribute.atttypid = inquiry_attribute.atttypid
         AND user_attribute.atttypmod = inquiry_attribute.atttypmod
        WHERE inquiry_attribute.attrelid = 'public.listing_inquiries'::regclass
          AND inquiry_attribute.attname = 'app_user_id'
          AND NOT inquiry_attribute.attisdropped
    ) THEN
        RAISE EXCEPTION 'listing_inquiries.app_user_id type must match app_users.id';
    END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_listing_inquiries_app_user_idempotency
    ON listing_inquiries (app_user_id, idempotency_key);

CREATE INDEX IF NOT EXISTS idx_listing_inquiries_owner_recent
    ON listing_inquiries (app_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_listing_inquiries_business_status_recent
    ON listing_inquiries (business_id, status, created_at DESC);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'listing_inquiries_app_user_id_fkey'
          AND conrelid = 'public.listing_inquiries'::regclass
          AND contype = 'f'
    ) THEN
        ALTER TABLE listing_inquiries
            ADD CONSTRAINT listing_inquiries_app_user_id_fkey
            FOREIGN KEY (app_user_id) REFERENCES app_users (id) ON DELETE CASCADE;
    END IF;
END $$;
