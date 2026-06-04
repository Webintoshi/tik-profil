CREATE TABLE IF NOT EXISTS businesses (
    id text PRIMARY KEY,
    slug text NOT NULL,
    previous_slugs text[] NOT NULL DEFAULT '{}'::text[],
    name text NOT NULL,
    email text,
    phone text,
    whatsapp text,
    status text,
    package text,
    package_id text,
    plan_id text,
    owner text,
    industry_id text,
    industry_label text,
    active_module text,
    logo text,
    cover text,
    slogan text,
    about text,
    address text,
    maps_url text,
    social_links jsonb NOT NULL DEFAULT '{}'::jsonb,
    show_hours boolean NOT NULL DEFAULT false,
    working_hours jsonb NOT NULL DEFAULT '{}'::jsonb,
    city text,
    district text,
    lat numeric,
    lng numeric,
    rating numeric,
    review_count integer NOT NULL DEFAULT 0,
    is_verified boolean NOT NULL DEFAULT false,
    source text NOT NULL DEFAULT 'legacy_staging',
    legacy_source jsonb,
    created_at timestamptz,
    updated_at timestamptz,
    imported_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_runtime_businesses_slug_lower_unique
    ON businesses (lower(slug));

CREATE INDEX IF NOT EXISTS idx_runtime_businesses_previous_slugs_gin
    ON businesses USING GIN (previous_slugs);

CREATE INDEX IF NOT EXISTS idx_runtime_businesses_status
    ON businesses (status)
    WHERE status IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_runtime_businesses_city_district
    ON businesses (city, district);

CREATE TABLE IF NOT EXISTS business_modules (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id text NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    module_key text NOT NULL,
    is_enabled boolean NOT NULL DEFAULT true,
    source text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (business_id, module_key)
);

CREATE INDEX IF NOT EXISTS idx_business_modules_business_id
    ON business_modules (business_id);

CREATE TABLE IF NOT EXISTS staff_members (
    id text PRIMARY KEY,
    business_id text NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    app_user_id uuid REFERENCES app_users(id) ON DELETE SET NULL,
    email text,
    phone text,
    name text,
    role_key text,
    permission_ids text[] NOT NULL DEFAULT '{}'::text[],
    is_active boolean NOT NULL DEFAULT true,
    last_login_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    source text,
    legacy_source jsonb
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_staff_members_business_email_unique
    ON staff_members (business_id, lower(email))
    WHERE email IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_staff_members_business_id
    ON staff_members (business_id);

CREATE TABLE IF NOT EXISTS legacy_auth_credentials (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    subject_type text NOT NULL,
    business_id text REFERENCES businesses(id) ON DELETE CASCADE,
    app_user_id uuid REFERENCES app_users(id) ON DELETE CASCADE,
    staff_member_id text REFERENCES staff_members(id) ON DELETE CASCADE,
    legacy_subject_id text NOT NULL,
    login_identifier text NOT NULL,
    password_hash text NOT NULL,
    hash_scheme text,
    is_active boolean NOT NULL DEFAULT true,
    rehash_required boolean NOT NULL DEFAULT false,
    last_login_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    source text,
    legacy_source jsonb,
    UNIQUE (subject_type, legacy_subject_id)
);

CREATE INDEX IF NOT EXISTS idx_legacy_auth_credentials_lookup
    ON legacy_auth_credentials (subject_type, lower(login_identifier), COALESCE(business_id, ''));

CREATE INDEX IF NOT EXISTS idx_legacy_auth_credentials_app_user_id
    ON legacy_auth_credentials (app_user_id)
    WHERE app_user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_legacy_auth_credentials_staff_member_id
    ON legacy_auth_credentials (staff_member_id)
    WHERE staff_member_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS qr_scan_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    legacy_qr_scan_id text UNIQUE,
    business_id text NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    business_slug text,
    ip_hash text,
    user_agent text,
    scanned_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    source text,
    legacy_source jsonb
);

CREATE INDEX IF NOT EXISTS idx_qr_scan_events_business_id_scanned_at_desc
    ON qr_scan_events (business_id, scanned_at DESC);

CREATE INDEX IF NOT EXISTS idx_qr_scan_events_business_slug
    ON qr_scan_events (business_slug)
    WHERE business_slug IS NOT NULL;
