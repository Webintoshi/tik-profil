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
        SELECT 1 FROM pg_constraint
        WHERE conname = 'clinic_appointments_app_user_id_fkey'
          AND conrelid = 'clinic_appointments'::regclass
    ) THEN
        ALTER TABLE clinic_appointments
            ADD CONSTRAINT clinic_appointments_app_user_id_fkey
            FOREIGN KEY (app_user_id) REFERENCES app_users (id) ON DELETE SET NULL;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'beauty_appointments_app_user_id_fkey'
          AND conrelid = 'beauty_appointments'::regclass
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

UPDATE clinic_appointments appointment
SET starts_at = COALESCE(
        appointment.starts_at,
        (appointment.date::date::text || 'T' || left(appointment.time_slot, 5) || ':00+03:00')::timestamptz
    ),
    ends_at = COALESCE(
        appointment.ends_at,
        (appointment.date::date::text || 'T' || left(appointment.time_slot, 5) || ':00+03:00')::timestamptz
            + make_interval(mins => COALESCE(service.duration_minutes, 30))
    )
FROM clinic_services service
WHERE service.id = appointment.service_id
  AND appointment.starts_at IS NULL
  AND appointment.time_slot ~ '^[0-2][0-9]:[0-5][0-9]';

UPDATE beauty_appointments appointment
SET starts_at = COALESCE(
        appointment.starts_at,
        (appointment.date::date::text || 'T' || left(appointment.time_slot, 5) || ':00+03:00')::timestamptz
    ),
    ends_at = COALESCE(
        appointment.ends_at,
        (appointment.date::date::text || 'T' || left(appointment.time_slot, 5) || ':00+03:00')::timestamptz
            + make_interval(mins => COALESCE(service.duration_minutes, 30))
    )
FROM beauty_services service
WHERE service.id = appointment.service_id
  AND appointment.starts_at IS NULL
  AND appointment.time_slot ~ '^[0-2][0-9]:[0-5][0-9]';

DO $$
BEGIN
    IF to_regclass('public.app_documents') IS NOT NULL THEN
        EXECUTE $migration$
            INSERT INTO beauty_appointments (
                id, business_id, business_name, business_slug, service_id, service_name,
                service_price, staff_id, staff_name, customer_name, customer_phone,
                customer_email, date, time_slot, starts_at, ends_at, status, notes,
                created_at, updated_at
            )
            SELECT document.id,
                   document.data->>'businessId',
                   COALESCE(business.name, ''),
                   COALESCE(business.slug, ''),
                   document.data->>'serviceId',
                   COALESCE(document.data->>'serviceName', service.name, ''),
                   COALESCE(service.price, 0),
                   document.data->>'staffId',
                   COALESCE(document.data->>'staffName', staff.name, ''),
                   COALESCE(document.data->>'customerName', ''),
                   COALESCE(document.data->>'customerPhone', ''),
                   NULLIF(document.data->>'customerEmail', ''),
                   (document.data->>'date')::date,
                   left(document.data->>'time', 5),
                   ((document.data->>'date') || 'T' || left(document.data->>'time', 5) || ':00+03:00')::timestamptz,
                   ((document.data->>'date') || 'T' || left(document.data->>'time', 5) || ':00+03:00')::timestamptz
                       + make_interval(mins => COALESCE(
                           service.duration_minutes,
                           CASE WHEN document.data->>'serviceDuration' ~ '^[0-9]+$'
                                THEN (document.data->>'serviceDuration')::integer END,
                           30
                       )),
                   CASE WHEN document.data->>'status' IN ('pending', 'confirmed', 'cancelled', 'rejected', 'completed')
                        THEN document.data->>'status' ELSE 'pending' END,
                   NULLIF(COALESCE(document.data->>'note', document.data->>'notes'), ''),
                   COALESCE(document.created_at, now()),
                   COALESCE(document.updated_at, now())
            FROM app_documents document
            LEFT JOIN businesses business ON business.id = document.data->>'businessId'
            LEFT JOIN beauty_services service ON service.id = document.data->>'serviceId'
                AND service.business_id = document.data->>'businessId'
            LEFT JOIN beauty_staff staff ON staff.id = document.data->>'staffId'
                AND staff.business_id = document.data->>'businessId'
            WHERE document.collection = 'beauty_appointments'
              AND document.data->>'businessId' IS NOT NULL
              AND document.data->>'serviceId' IS NOT NULL
              AND document.data->>'staffId' IS NOT NULL
              AND document.data->>'date' ~ '^\d{4}-\d{2}-\d{2}$'
              AND document.data->>'time' ~ '^[0-2][0-9]:[0-5][0-9]$'
            ON CONFLICT (id) DO NOTHING
        $migration$;
    END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_clinic_services_business_resource
    ON clinic_services (business_id, id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_clinic_staff_business_resource
    ON clinic_staff (business_id, id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_beauty_services_business_resource
    ON beauty_services (business_id, id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_beauty_staff_business_resource
    ON beauty_staff (business_id, id);

DO $$
DECLARE
    constraint_spec text;
BEGIN
    FOREACH constraint_spec IN ARRAY ARRAY[
        'clinic_appointments_business_fkey|clinic_appointments|FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE',
        'clinic_appointments_service_fkey|clinic_appointments|FOREIGN KEY (business_id, service_id) REFERENCES clinic_services(business_id, id)',
        'clinic_appointments_staff_fkey|clinic_appointments|FOREIGN KEY (business_id, staff_id) REFERENCES clinic_staff(business_id, id)',
        'beauty_appointments_business_fkey|beauty_appointments|FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE',
        'beauty_appointments_service_fkey|beauty_appointments|FOREIGN KEY (business_id, service_id) REFERENCES beauty_services(business_id, id)',
        'beauty_appointments_staff_fkey|beauty_appointments|FOREIGN KEY (business_id, staff_id) REFERENCES beauty_staff(business_id, id)'
    ]
    LOOP
        IF NOT EXISTS (
            SELECT 1 FROM pg_constraint
            WHERE conname = split_part(constraint_spec, '|', 1)
              AND conrelid = split_part(constraint_spec, '|', 2)::regclass
        ) THEN
            EXECUTE format(
                'ALTER TABLE %I ADD CONSTRAINT %I %s NOT VALID',
                split_part(constraint_spec, '|', 2),
                split_part(constraint_spec, '|', 1),
                split_part(constraint_spec, '|', 3)
            );
        END IF;
    END LOOP;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'clinic_appointments_no_staff_overlap'
          AND conrelid = 'clinic_appointments'::regclass
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
        SELECT 1 FROM pg_constraint
        WHERE conname = 'beauty_appointments_no_staff_overlap'
          AND conrelid = 'beauty_appointments'::regclass
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
