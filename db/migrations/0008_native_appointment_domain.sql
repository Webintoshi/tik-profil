CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE TABLE IF NOT EXISTS clinic_appointments (
    id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
    business_id text NOT NULL,
    service_id text NOT NULL,
    staff_id text NOT NULL,
    date date NOT NULL,
    time_slot text NOT NULL,
    status text NOT NULL DEFAULT 'pending',
    notes text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS beauty_appointments (
    id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
    business_id text NOT NULL,
    service_id text NOT NULL,
    staff_id text NOT NULL,
    date date NOT NULL,
    time_slot text NOT NULL,
    status text NOT NULL DEFAULT 'pending',
    notes text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE clinic_appointments ADD COLUMN IF NOT EXISTS app_user_id uuid;
ALTER TABLE clinic_appointments ADD COLUMN IF NOT EXISTS customer_name text;
ALTER TABLE clinic_appointments ADD COLUMN IF NOT EXISTS customer_phone text;
ALTER TABLE clinic_appointments ADD COLUMN IF NOT EXISTS customer_email text;
ALTER TABLE clinic_appointments ADD COLUMN IF NOT EXISTS business_name text;
ALTER TABLE clinic_appointments ADD COLUMN IF NOT EXISTS business_slug text;
ALTER TABLE clinic_appointments ADD COLUMN IF NOT EXISTS service_name text;
ALTER TABLE clinic_appointments ADD COLUMN IF NOT EXISTS service_price numeric(12, 2) NOT NULL DEFAULT 0;
ALTER TABLE clinic_appointments ADD COLUMN IF NOT EXISTS staff_name text;
ALTER TABLE clinic_appointments ADD COLUMN IF NOT EXISTS idempotency_key text;
ALTER TABLE clinic_appointments ADD COLUMN IF NOT EXISTS starts_at timestamptz;
ALTER TABLE clinic_appointments ADD COLUMN IF NOT EXISTS ends_at timestamptz;

ALTER TABLE beauty_appointments ADD COLUMN IF NOT EXISTS app_user_id uuid;
ALTER TABLE beauty_appointments ADD COLUMN IF NOT EXISTS customer_name text;
ALTER TABLE beauty_appointments ADD COLUMN IF NOT EXISTS customer_phone text;
ALTER TABLE beauty_appointments ADD COLUMN IF NOT EXISTS customer_email text;
ALTER TABLE beauty_appointments ADD COLUMN IF NOT EXISTS business_name text;
ALTER TABLE beauty_appointments ADD COLUMN IF NOT EXISTS business_slug text;
ALTER TABLE beauty_appointments ADD COLUMN IF NOT EXISTS service_name text;
ALTER TABLE beauty_appointments ADD COLUMN IF NOT EXISTS service_price numeric(12, 2) NOT NULL DEFAULT 0;
ALTER TABLE beauty_appointments ADD COLUMN IF NOT EXISTS staff_name text;
ALTER TABLE beauty_appointments ADD COLUMN IF NOT EXISTS idempotency_key text;
ALTER TABLE beauty_appointments ADD COLUMN IF NOT EXISTS starts_at timestamptz;
ALTER TABLE beauty_appointments ADD COLUMN IF NOT EXISTS ends_at timestamptz;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'clinic_appointments_app_user_id_fkey'
    ) THEN
        ALTER TABLE clinic_appointments
            ADD CONSTRAINT clinic_appointments_app_user_id_fkey
            FOREIGN KEY (app_user_id) REFERENCES app_users (id) ON DELETE SET NULL;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'beauty_appointments_app_user_id_fkey'
    ) THEN
        ALTER TABLE beauty_appointments
            ADD CONSTRAINT beauty_appointments_app_user_id_fkey
            FOREIGN KEY (app_user_id) REFERENCES app_users (id) ON DELETE SET NULL;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_clinic_appointments_owner_recent
    ON clinic_appointments (app_user_id, created_at DESC) WHERE app_user_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_clinic_appointments_idempotency
    ON clinic_appointments (app_user_id, idempotency_key) WHERE app_user_id IS NOT NULL AND idempotency_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_beauty_appointments_owner_recent
    ON beauty_appointments (app_user_id, created_at DESC) WHERE app_user_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_beauty_appointments_idempotency
    ON beauty_appointments (app_user_id, idempotency_key) WHERE app_user_id IS NOT NULL AND idempotency_key IS NOT NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'clinic_appointments_no_staff_overlap'
    ) THEN
        ALTER TABLE clinic_appointments
            ADD CONSTRAINT clinic_appointments_no_staff_overlap
            EXCLUDE USING gist (
                business_id WITH =,
                staff_id WITH =,
                tstzrange(starts_at, ends_at, '[)') WITH &&
            ) WHERE (status IN ('pending', 'confirmed') AND starts_at IS NOT NULL AND ends_at IS NOT NULL);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'beauty_appointments_no_staff_overlap'
    ) THEN
        ALTER TABLE beauty_appointments
            ADD CONSTRAINT beauty_appointments_no_staff_overlap
            EXCLUDE USING gist (
                business_id WITH =,
                staff_id WITH =,
                tstzrange(starts_at, ends_at, '[)') WITH &&
            ) WHERE (status IN ('pending', 'confirmed') AND starts_at IS NOT NULL AND ends_at IS NOT NULL);
    END IF;
END $$;
