CREATE TABLE IF NOT EXISTS business_import_candidates (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    first_seen_batch_id uuid REFERENCES business_import_batches(id) ON DELETE SET NULL,
    provider text NOT NULL CHECK (provider IN ('google_places')),
    provider_place_id text NOT NULL,
    sector_key text NOT NULL CHECK (sector_key IN ('petshop')),
    city text NOT NULL,
    district_scope text,
    candidate_status text NOT NULL DEFAULT 'discovered' CHECK (candidate_status IN (
        'discovered', 'needs_data', 'ready', 'approved', 'rejected', 'duplicate', 'provisioning', 'published', 'failed'
    )),
    matched_business_id text REFERENCES businesses(id) ON DELETE SET NULL,
    dedupe_reason text,
    reviewed_by_user_id uuid REFERENCES app_users(id) ON DELETE SET NULL,
    reviewed_at timestamptz,
    failure_code text,
    provisioning_state jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT business_import_candidates_city_pilot_check
        CHECK (city = 'Ordu'),
    UNIQUE (provider, provider_place_id)
);

CREATE INDEX IF NOT EXISTS idx_business_import_candidates_status
    ON business_import_candidates (candidate_status);

CREATE INDEX IF NOT EXISTS idx_business_import_candidates_first_seen_batch_id
    ON business_import_candidates (first_seen_batch_id)
    WHERE first_seen_batch_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS business_import_batch_candidates (
    import_batch_id uuid NOT NULL REFERENCES business_import_batches(id) ON DELETE CASCADE,
    candidate_id uuid NOT NULL REFERENCES business_import_candidates(id) ON DELETE CASCADE,
    created_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (import_batch_id, candidate_id)
);

CREATE INDEX IF NOT EXISTS idx_business_import_batch_candidates_candidate_id
    ON business_import_batch_candidates (candidate_id);

CREATE TABLE IF NOT EXISTS business_source_facts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    candidate_id uuid NOT NULL REFERENCES business_import_candidates(id) ON DELETE CASCADE,
    field_key text NOT NULL,
    field_value text NOT NULL,
    source_type text NOT NULL CHECK (source_type IN (
        'business_website', 'business_submitted', 'public_registry', 'admin_verified'
    )),
    source_url text,
    verified_by_user_id uuid REFERENCES app_users(id) ON DELETE SET NULL,
    verified_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (candidate_id, field_key, source_type)
);

CREATE INDEX IF NOT EXISTS idx_business_source_facts_candidate_id
    ON business_source_facts (candidate_id);

CREATE TABLE IF NOT EXISTS business_account_issuances (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    candidate_id uuid NOT NULL REFERENCES business_import_candidates(id) ON DELETE CASCADE,
    business_id text REFERENCES businesses(id) ON DELETE SET NULL,
    app_user_id uuid REFERENCES app_users(id) ON DELETE SET NULL,
    login_alias text NOT NULL,
    provider text NOT NULL DEFAULT 'logto' CHECK (provider IN ('logto')),
    provider_user_id text,
    issuance_status text NOT NULL DEFAULT 'reserved' CHECK (issuance_status IN (
        'reserved', 'issued', 'delivered', 'password_changed', 'active', 'failed'
    )),
    issued_at timestamptz,
    delivered_at timestamptz,
    activated_at timestamptz,
    reset_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (candidate_id),
    UNIQUE (login_alias)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_business_account_issuances_provider_user_id
    ON business_account_issuances (provider, provider_user_id)
    WHERE provider_user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_business_account_issuances_app_user_id
    ON business_account_issuances (app_user_id)
    WHERE app_user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_business_account_issuances_business_id
    ON business_account_issuances (business_id)
    WHERE business_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS business_recovery_contacts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    account_issuance_id uuid NOT NULL REFERENCES business_account_issuances(id) ON DELETE CASCADE,
    recovery_channel text NOT NULL CHECK (recovery_channel IN ('email', 'phone')),
    recovery_value text NOT NULL,
    verification_token_hash text NOT NULL CHECK (verification_token_hash ~ '^[a-f0-9]{64}$'),
    verification_expires_at timestamptz NOT NULL,
    verification_used_at timestamptz,
    verified_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CHECK (verification_expires_at > created_at)
);

CREATE INDEX IF NOT EXISTS idx_business_recovery_contacts_token_hash
    ON business_recovery_contacts (verification_token_hash)
    WHERE verification_used_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_business_recovery_contacts_account_issuance_id
    ON business_recovery_contacts (account_issuance_id);
