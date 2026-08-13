CREATE TABLE IF NOT EXISTS business_media_assets (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id text NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    purpose text NOT NULL CHECK (purpose IN ('logo', 'cover', 'gallery')),
    storage_provider text NOT NULL CHECK (storage_provider IN ('r2', 'google_places', 'external')),
    source_type text NOT NULL,
    rights_basis text NOT NULL CHECK (
        rights_basis IN (
            'business_owned',
            'business_licensed',
            'admin_licensed',
            'provider_terms',
            'unknown_review'
        )
    ),
    source_ref text,
    object_key text UNIQUE,
    upload_object_key text UNIQUE,
    public_url text,
    mime_type text,
    declared_byte_size bigint CHECK (declared_byte_size IS NULL OR declared_byte_size > 0),
    verified_byte_size bigint CHECK (verified_byte_size IS NULL OR verified_byte_size > 0),
    content_sha256 text CHECK (content_sha256 IS NULL OR content_sha256 ~ '^[a-f0-9]{64}$'),
    status text NOT NULL DEFAULT 'pending' CHECK (
        status IN ('pending', 'ready', 'superseded', 'failed', 'quarantined', 'deleted')
    ),
    metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
    verified_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_business_media_assets_business_created
    ON business_media_assets (business_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_business_media_assets_pending
    ON business_media_assets (created_at)
    WHERE status = 'pending';

CREATE UNIQUE INDEX IF NOT EXISTS idx_business_media_assets_active_profile_slot
    ON business_media_assets (business_id, purpose)
    WHERE status = 'ready' AND purpose IN ('logo', 'cover');

CREATE UNIQUE INDEX IF NOT EXISTS idx_business_media_assets_source_unique
    ON business_media_assets (business_id, purpose, storage_provider, source_type, source_ref)
    WHERE source_ref IS NOT NULL;
