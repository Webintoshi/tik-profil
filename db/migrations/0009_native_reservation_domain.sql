CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE TABLE IF NOT EXISTS restaurant_reservation_resources (
    id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
    business_id text NOT NULL,
    name text NOT NULL,
    description text,
    image_url text,
    capacity integer NOT NULL DEFAULT 1 CHECK (capacity > 0),
    unit_price numeric(12, 2) NOT NULL DEFAULT 0 CHECK (unit_price >= 0),
    time_slots jsonb NOT NULL DEFAULT '[]'::jsonb,
    is_active boolean NOT NULL DEFAULT true,
    sort_order integer NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS restaurant_reservations (
    id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
    app_user_id uuid,
    business_id text NOT NULL,
    business_name text NOT NULL,
    business_slug text NOT NULL,
    resource_id text NOT NULL,
    resource_name text NOT NULL,
    customer_name text NOT NULL,
    customer_phone text NOT NULL,
    customer_email text,
    starts_at timestamptz NOT NULL,
    ends_at timestamptz NOT NULL,
    party_size integer NOT NULL DEFAULT 1 CHECK (party_size > 0),
    unit_price numeric(12, 2) NOT NULL DEFAULT 0 CHECK (unit_price >= 0),
    total_amount numeric(12, 2) NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
    status text NOT NULL DEFAULT 'pending',
    notes text,
    idempotency_key text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CHECK (ends_at > starts_at)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_restaurant_reservation_resources_business_resource
    ON restaurant_reservation_resources (business_id, id);
CREATE INDEX IF NOT EXISTS idx_restaurant_reservations_owner_recent
    ON restaurant_reservations (app_user_id, created_at DESC) WHERE app_user_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_restaurant_reservations_app_user_idempotency
    ON restaurant_reservations (app_user_id, idempotency_key)
    WHERE app_user_id IS NOT NULL AND idempotency_key IS NOT NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'restaurant_reservation_resources_business_id_fkey'
          AND conrelid = 'public.restaurant_reservation_resources'::regclass
    ) THEN
        ALTER TABLE restaurant_reservation_resources
            ADD CONSTRAINT restaurant_reservation_resources_business_id_fkey
            FOREIGN KEY (business_id) REFERENCES businesses (id) ON DELETE CASCADE NOT VALID;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'restaurant_reservations_app_user_id_fkey'
          AND conrelid = 'public.restaurant_reservations'::regclass
    ) THEN
        ALTER TABLE restaurant_reservations
            ADD CONSTRAINT restaurant_reservations_app_user_id_fkey
            FOREIGN KEY (app_user_id) REFERENCES app_users (id) ON DELETE SET NULL;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'restaurant_reservations_business_id_fkey'
          AND conrelid = 'public.restaurant_reservations'::regclass
    ) THEN
        ALTER TABLE restaurant_reservations
            ADD CONSTRAINT restaurant_reservations_business_id_fkey
            FOREIGN KEY (business_id) REFERENCES businesses (id) ON DELETE CASCADE NOT VALID;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'restaurant_reservations_resource_id_fkey'
          AND conrelid = 'public.restaurant_reservations'::regclass
    ) THEN
        ALTER TABLE restaurant_reservations
            ADD CONSTRAINT restaurant_reservations_resource_id_fkey
            FOREIGN KEY (business_id, resource_id)
            REFERENCES restaurant_reservation_resources (business_id, id) NOT VALID;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'restaurant_reservations_no_resource_overlap'
          AND conrelid = 'public.restaurant_reservations'::regclass
    ) THEN
        ALTER TABLE restaurant_reservations
            ADD CONSTRAINT restaurant_reservations_no_resource_overlap
            EXCLUDE USING gist (
                business_id WITH =,
                resource_id WITH =,
                tstzrange(starts_at, ends_at, '[)') WITH &&
            ) WHERE (status IN ('pending', 'confirmed'));
    END IF;
END $$;

CREATE OR REPLACE FUNCTION enforce_hotel_reservation_overlap()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.room_id IS NOT NULL
       AND NEW.reservation_status IN ('pending', 'confirmed')
       AND EXISTS (
           SELECT 1 FROM hotel_reservations existing
           WHERE existing.business_id = NEW.business_id
             AND existing.room_id = NEW.room_id
             AND existing.id::text <> NEW.id::text
             AND existing.reservation_status IN ('pending', 'confirmed')
             AND tstzrange(existing.check_in_date, existing.check_out_date, '[)')
                 && tstzrange(NEW.check_in_date, NEW.check_out_date, '[)')
       ) THEN
        RAISE EXCEPTION 'Hotel room reservation overlaps an active reservation'
            USING ERRCODE = '23P01';
    END IF;
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION enforce_vehicle_reservation_overlap()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.status IN ('pending', 'confirmed')
       AND EXISTS (
           SELECT 1 FROM vehicle_reservations existing
           WHERE existing.business_id = NEW.business_id
             AND existing.vehicle_id = NEW.vehicle_id
             AND existing.id::text <> NEW.id::text
             AND existing.status IN ('pending', 'confirmed')
             AND daterange(existing.start_date, existing.end_date, '[]')
                 && daterange(NEW.start_date, NEW.end_date, '[]')
       ) THEN
        RAISE EXCEPTION 'Vehicle reservation overlaps an active reservation'
            USING ERRCODE = '23P01';
    END IF;
    RETURN NEW;
END;
$$;

DO $$
BEGIN
    IF to_regclass('public.hotel_reservations') IS NOT NULL THEN
        ALTER TABLE hotel_reservations ADD COLUMN IF NOT EXISTS app_user_id uuid;
        ALTER TABLE hotel_reservations ADD COLUMN IF NOT EXISTS business_name text;
        ALTER TABLE hotel_reservations ADD COLUMN IF NOT EXISTS business_slug text;
        ALTER TABLE hotel_reservations ADD COLUMN IF NOT EXISTS resource_name text;
        ALTER TABLE hotel_reservations ADD COLUMN IF NOT EXISTS idempotency_key text;

        IF to_regclass('public.hotel_room_types') IS NOT NULL THEN
            UPDATE hotel_reservations reservation
            SET business_name = COALESCE(reservation.business_name, business.name),
                business_slug = COALESCE(reservation.business_slug, business.slug),
                resource_name = COALESCE(reservation.resource_name, resource.name)
            FROM businesses business
            JOIN hotel_room_types resource ON resource.business_id = business.id
            WHERE business.id = reservation.business_id
              AND resource.id = reservation.room_type_id
              AND (reservation.business_name IS NULL OR reservation.business_slug IS NULL OR reservation.resource_name IS NULL);
        END IF;

        CREATE INDEX IF NOT EXISTS idx_hotel_reservations_owner_recent
            ON hotel_reservations (app_user_id, created_at DESC) WHERE app_user_id IS NOT NULL;
        CREATE UNIQUE INDEX IF NOT EXISTS idx_hotel_reservations_app_user_idempotency
            ON hotel_reservations (app_user_id, idempotency_key)
            WHERE app_user_id IS NOT NULL AND idempotency_key IS NOT NULL;

        IF to_regclass('public.hotel_room_types') IS NOT NULL THEN
            CREATE UNIQUE INDEX IF NOT EXISTS idx_hotel_room_types_business_resource
                ON hotel_room_types (business_id, id);
        END IF;

        IF NOT EXISTS (
            SELECT 1 FROM pg_constraint
            WHERE conname = 'hotel_reservations_app_user_id_fkey'
              AND conrelid = 'public.hotel_reservations'::regclass
        ) THEN
            ALTER TABLE hotel_reservations
                ADD CONSTRAINT hotel_reservations_app_user_id_fkey
                FOREIGN KEY (app_user_id) REFERENCES app_users (id) ON DELETE SET NULL;
        END IF;
        IF NOT EXISTS (
            SELECT 1 FROM pg_constraint
            WHERE conname = 'hotel_reservations_business_id_fkey'
              AND conrelid = 'public.hotel_reservations'::regclass
        ) THEN
            ALTER TABLE hotel_reservations
                ADD CONSTRAINT hotel_reservations_business_id_fkey
                FOREIGN KEY (business_id) REFERENCES businesses (id) ON DELETE CASCADE NOT VALID;
        END IF;
        IF to_regclass('public.hotel_room_types') IS NOT NULL AND NOT EXISTS (
            SELECT 1 FROM pg_constraint
            WHERE conname = 'hotel_reservations_room_type_id_fkey'
              AND conrelid = 'public.hotel_reservations'::regclass
        ) THEN
            ALTER TABLE hotel_reservations
                ADD CONSTRAINT hotel_reservations_room_type_id_fkey
                FOREIGN KEY (business_id, room_type_id)
                REFERENCES hotel_room_types (business_id, id) NOT VALID;
        END IF;
        IF NOT EXISTS (
            SELECT 1 FROM pg_constraint
            WHERE conname = 'hotel_reservations_no_room_overlap'
              AND conrelid = 'public.hotel_reservations'::regclass
        ) AND NOT EXISTS (
            SELECT 1
            FROM hotel_reservations existing
            JOIN hotel_reservations conflicting
              ON conflicting.business_id = existing.business_id
             AND conflicting.room_id = existing.room_id
             AND conflicting.id::text > existing.id::text
             AND conflicting.reservation_status IN ('pending', 'confirmed')
             AND tstzrange(existing.check_in_date, existing.check_out_date, '[)')
                 && tstzrange(conflicting.check_in_date, conflicting.check_out_date, '[)')
            WHERE existing.room_id IS NOT NULL
              AND existing.reservation_status IN ('pending', 'confirmed')
        ) THEN
            ALTER TABLE hotel_reservations
                ADD CONSTRAINT hotel_reservations_no_room_overlap
                EXCLUDE USING gist (
                    business_id WITH =,
                    room_id WITH =,
                    tstzrange(check_in_date, check_out_date, '[)') WITH &&
                ) WHERE (room_id IS NOT NULL AND reservation_status IN ('pending', 'confirmed'));
        END IF;
        IF NOT EXISTS (
            SELECT 1 FROM pg_trigger
            WHERE tgname = 'hotel_reservations_overlap_guard'
              AND tgrelid = 'public.hotel_reservations'::regclass
              AND NOT tgisinternal
        ) THEN
            CREATE TRIGGER hotel_reservations_overlap_guard
                BEFORE INSERT OR UPDATE OF room_id, check_in_date, check_out_date, reservation_status
                ON hotel_reservations
                FOR EACH ROW EXECUTE FUNCTION enforce_hotel_reservation_overlap();
        END IF;
    END IF;
END $$;

DO $$
BEGIN
    IF to_regclass('public.vehicle_reservations') IS NOT NULL THEN
        ALTER TABLE vehicle_reservations ADD COLUMN IF NOT EXISTS app_user_id uuid;
        ALTER TABLE vehicle_reservations ADD COLUMN IF NOT EXISTS business_name text;
        ALTER TABLE vehicle_reservations ADD COLUMN IF NOT EXISTS business_slug text;
        ALTER TABLE vehicle_reservations ADD COLUMN IF NOT EXISTS resource_name text;
        ALTER TABLE vehicle_reservations ADD COLUMN IF NOT EXISTS idempotency_key text;

        IF to_regclass('public.vehicles') IS NOT NULL THEN
            UPDATE vehicle_reservations reservation
            SET business_name = COALESCE(reservation.business_name, business.name),
                business_slug = COALESCE(reservation.business_slug, business.slug),
                resource_name = COALESCE(
                    reservation.resource_name,
                    concat_ws(' ', resource.brand, resource.model, resource.year::text)
                )
            FROM businesses business
            JOIN vehicles resource ON resource.business_id = business.id
            WHERE business.id = reservation.business_id
              AND resource.id = reservation.vehicle_id
              AND (reservation.business_name IS NULL OR reservation.business_slug IS NULL OR reservation.resource_name IS NULL);
        END IF;

        CREATE INDEX IF NOT EXISTS idx_vehicle_reservations_owner_recent
            ON vehicle_reservations (app_user_id, created_at DESC) WHERE app_user_id IS NOT NULL;
        CREATE UNIQUE INDEX IF NOT EXISTS idx_vehicle_reservations_app_user_idempotency
            ON vehicle_reservations (app_user_id, idempotency_key)
            WHERE app_user_id IS NOT NULL AND idempotency_key IS NOT NULL;

        IF to_regclass('public.vehicles') IS NOT NULL THEN
            CREATE UNIQUE INDEX IF NOT EXISTS idx_vehicles_business_resource
                ON vehicles (business_id, id);
        END IF;

        IF NOT EXISTS (
            SELECT 1 FROM pg_constraint
            WHERE conname = 'vehicle_reservations_app_user_id_fkey'
              AND conrelid = 'public.vehicle_reservations'::regclass
        ) THEN
            ALTER TABLE vehicle_reservations
                ADD CONSTRAINT vehicle_reservations_app_user_id_fkey
                FOREIGN KEY (app_user_id) REFERENCES app_users (id) ON DELETE SET NULL;
        END IF;
        IF NOT EXISTS (
            SELECT 1 FROM pg_constraint
            WHERE conname = 'vehicle_reservations_business_id_fkey'
              AND conrelid = 'public.vehicle_reservations'::regclass
        ) THEN
            ALTER TABLE vehicle_reservations
                ADD CONSTRAINT vehicle_reservations_business_id_fkey
                FOREIGN KEY (business_id) REFERENCES businesses (id) ON DELETE CASCADE NOT VALID;
        END IF;
        IF to_regclass('public.vehicles') IS NOT NULL AND NOT EXISTS (
            SELECT 1 FROM pg_constraint
            WHERE conname = 'vehicle_reservations_vehicle_id_fkey'
              AND conrelid = 'public.vehicle_reservations'::regclass
        ) THEN
            ALTER TABLE vehicle_reservations
                ADD CONSTRAINT vehicle_reservations_vehicle_id_fkey
                FOREIGN KEY (business_id, vehicle_id)
                REFERENCES vehicles (business_id, id) NOT VALID;
        END IF;
        IF NOT EXISTS (
            SELECT 1 FROM pg_constraint
            WHERE conname = 'vehicle_reservations_no_vehicle_overlap'
              AND conrelid = 'public.vehicle_reservations'::regclass
        ) AND NOT EXISTS (
            SELECT 1
            FROM vehicle_reservations existing
            JOIN vehicle_reservations conflicting
              ON conflicting.business_id = existing.business_id
             AND conflicting.vehicle_id = existing.vehicle_id
             AND conflicting.id::text > existing.id::text
             AND conflicting.status IN ('pending', 'confirmed')
             AND daterange(existing.start_date, existing.end_date, '[]')
                 && daterange(conflicting.start_date, conflicting.end_date, '[]')
            WHERE existing.status IN ('pending', 'confirmed')
        ) THEN
            ALTER TABLE vehicle_reservations
                ADD CONSTRAINT vehicle_reservations_no_vehicle_overlap
                EXCLUDE USING gist (
                    business_id WITH =,
                    vehicle_id WITH =,
                    daterange(start_date, end_date, '[]') WITH &&
                ) WHERE (status IN ('pending', 'confirmed'));
        END IF;
        IF NOT EXISTS (
            SELECT 1 FROM pg_trigger
            WHERE tgname = 'vehicle_reservations_overlap_guard'
              AND tgrelid = 'public.vehicle_reservations'::regclass
              AND NOT tgisinternal
        ) THEN
            CREATE TRIGGER vehicle_reservations_overlap_guard
                BEFORE INSERT OR UPDATE OF vehicle_id, start_date, end_date, status
                ON vehicle_reservations
                FOR EACH ROW EXECUTE FUNCTION enforce_vehicle_reservation_overlap();
        END IF;
    END IF;
END $$;
