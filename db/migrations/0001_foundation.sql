CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS app_users (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    email text,
    display_name text,
    phone text,
    avatar_url text,
    status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'pending', 'disabled')),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_app_users_email_unique
    ON app_users (lower(email))
    WHERE email IS NOT NULL;

CREATE TABLE IF NOT EXISTS auth_provider_links (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    app_user_id uuid NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
    provider text NOT NULL,
    provider_user_id text NOT NULL,
    logto_user_id text,
    provider_email text,
    provider_metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (provider, provider_user_id)
);

CREATE INDEX IF NOT EXISTS idx_auth_provider_links_app_user_id
    ON auth_provider_links (app_user_id);

CREATE INDEX IF NOT EXISTS idx_auth_provider_links_logto_user_id
    ON auth_provider_links (logto_user_id)
    WHERE logto_user_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS platform_admins (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    app_user_id uuid NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
    admin_role text NOT NULL DEFAULT 'admin',
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (app_user_id)
);

CREATE TABLE IF NOT EXISTS business_roles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id text NOT NULL,
    role_key text NOT NULL,
    display_name text NOT NULL,
    description text,
    is_system boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (business_id, role_key)
);

CREATE INDEX IF NOT EXISTS idx_business_roles_business_id
    ON business_roles (business_id);

CREATE TABLE IF NOT EXISTS business_memberships (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id text NOT NULL,
    app_user_id uuid NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
    role_id uuid REFERENCES business_roles(id) ON DELETE SET NULL,
    membership_status text NOT NULL DEFAULT 'active' CHECK (membership_status IN ('invited', 'active', 'suspended', 'revoked')),
    invited_by_user_id uuid REFERENCES app_users(id) ON DELETE SET NULL,
    invited_at timestamptz,
    revoked_by_user_id uuid REFERENCES app_users(id) ON DELETE SET NULL,
    revoked_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (business_id, app_user_id)
);

CREATE INDEX IF NOT EXISTS idx_business_memberships_business_id
    ON business_memberships (business_id);

CREATE INDEX IF NOT EXISTS idx_business_memberships_app_user_id
    ON business_memberships (app_user_id);

CREATE TABLE IF NOT EXISTS module_access (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id text NOT NULL,
    app_user_id uuid REFERENCES app_users(id) ON DELETE CASCADE,
    role_id uuid REFERENCES business_roles(id) ON DELETE CASCADE,
    module_key text NOT NULL,
    access_level text NOT NULL DEFAULT 'read' CHECK (access_level IN ('none', 'read', 'write', 'admin')),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_module_access_business_id
    ON module_access (business_id);

CREATE INDEX IF NOT EXISTS idx_module_access_app_user_id
    ON module_access (app_user_id)
    WHERE app_user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_module_access_role_id
    ON module_access (role_id)
    WHERE role_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS business_import_batches (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    source_type text NOT NULL,
    source_ref text,
    city text,
    district text,
    neighborhood text,
    import_status text NOT NULL DEFAULT 'pending' CHECK (import_status IN ('pending', 'running', 'completed', 'failed')),
    imported_count integer NOT NULL DEFAULT 0,
    matched_count integer NOT NULL DEFAULT 0,
    skipped_count integer NOT NULL DEFAULT 0,
    failed_count integer NOT NULL DEFAULT 0,
    metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_by_user_id uuid REFERENCES app_users(id) ON DELETE SET NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_business_import_batches_created_at
    ON business_import_batches (created_at DESC);

CREATE TABLE IF NOT EXISTS business_discovery_profiles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id text NOT NULL,
    import_batch_id uuid REFERENCES business_import_batches(id) ON DELETE SET NULL,
    source_type text,
    source_ref text,
    source_confidence numeric(5,4),
    city text,
    district text,
    neighborhood text,
    address text,
    latitude numeric(10,7),
    longitude numeric(10,7),
    claim_state text NOT NULL DEFAULT 'unclaimed' CHECK (claim_state IN ('unclaimed', 'claim_pending', 'claimed_verified', 'claimed_rejected', 'disputed', 'removed')),
    discover_status text NOT NULL DEFAULT 'draft' CHECK (discover_status IN ('draft', 'published', 'hidden', 'removed')),
    metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (business_id)
);

CREATE INDEX IF NOT EXISTS idx_business_discovery_profiles_city_district_neighborhood
    ON business_discovery_profiles (city, district, neighborhood);

CREATE INDEX IF NOT EXISTS idx_business_discovery_profiles_claim_state
    ON business_discovery_profiles (claim_state);

CREATE INDEX IF NOT EXISTS idx_business_discovery_profiles_discover_status
    ON business_discovery_profiles (discover_status);

CREATE INDEX IF NOT EXISTS idx_business_discovery_profiles_import_batch_id
    ON business_discovery_profiles (import_batch_id)
    WHERE import_batch_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS business_claims (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id text NOT NULL,
    app_user_id uuid NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
    discovery_profile_id uuid REFERENCES business_discovery_profiles(id) ON DELETE SET NULL,
    claim_state text NOT NULL DEFAULT 'claim_pending' CHECK (claim_state IN ('claim_pending', 'claimed_verified', 'claimed_rejected', 'disputed', 'removed')),
    claim_reason text,
    evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
    reviewed_by_user_id uuid REFERENCES app_users(id) ON DELETE SET NULL,
    reviewed_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_business_claims_business_id
    ON business_claims (business_id);

CREATE INDEX IF NOT EXISTS idx_business_claims_app_user_id
    ON business_claims (app_user_id);

CREATE INDEX IF NOT EXISTS idx_business_claims_claim_state
    ON business_claims (claim_state);

CREATE TABLE IF NOT EXISTS business_reports (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id text NOT NULL,
    discovery_profile_id uuid REFERENCES business_discovery_profiles(id) ON DELETE SET NULL,
    app_user_id uuid REFERENCES app_users(id) ON DELETE SET NULL,
    report_type text NOT NULL,
    report_status text NOT NULL DEFAULT 'open' CHECK (report_status IN ('open', 'reviewing', 'resolved', 'dismissed')),
    city text,
    district text,
    neighborhood text,
    address text,
    details text,
    reviewed_by_user_id uuid REFERENCES app_users(id) ON DELETE SET NULL,
    reviewed_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_business_reports_business_id
    ON business_reports (business_id);

CREATE INDEX IF NOT EXISTS idx_business_reports_report_status
    ON business_reports (report_status);

CREATE INDEX IF NOT EXISTS idx_business_reports_city_district_neighborhood
    ON business_reports (city, district, neighborhood);

CREATE TABLE IF NOT EXISTS audit_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    app_user_id uuid REFERENCES app_users(id) ON DELETE SET NULL,
    business_id text,
    membership_id uuid REFERENCES business_memberships(id) ON DELETE SET NULL,
    event_name text NOT NULL,
    event_category text NOT NULL,
    actor_type text NOT NULL,
    ip_address inet,
    user_agent text,
    request_id text,
    metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_events_business_id
    ON audit_events (business_id)
    WHERE business_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_audit_events_app_user_id
    ON audit_events (app_user_id)
    WHERE app_user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_audit_events_created_at
    ON audit_events (created_at DESC);
