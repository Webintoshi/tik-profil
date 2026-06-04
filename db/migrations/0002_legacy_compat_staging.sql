CREATE TABLE IF NOT EXISTS legacy_businesses (
    legacy_business_id text PRIMARY KEY,
    slug text,
    name text,
    status text,
    source text NOT NULL DEFAULT 'public.businesses',
    source_row jsonb NOT NULL,
    normalized jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamptz,
    updated_at timestamptz,
    imported_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_legacy_businesses_slug_lower
    ON legacy_businesses (lower(slug))
    WHERE slug IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_legacy_businesses_status
    ON legacy_businesses (status)
    WHERE status IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_legacy_businesses_imported_at
    ON legacy_businesses (imported_at DESC);

CREATE TABLE IF NOT EXISTS legacy_admin_credentials (
    legacy_admin_id text PRIMARY KEY,
    username text NOT NULL,
    email text,
    display_name text,
    admin_role text,
    is_active boolean,
    password_hash text NOT NULL,
    source text NOT NULL DEFAULT 'public.admins',
    source_row jsonb NOT NULL,
    normalized jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamptz,
    updated_at timestamptz,
    last_login_at timestamptz,
    imported_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_legacy_admin_credentials_username_lower
    ON legacy_admin_credentials (lower(username));

CREATE INDEX IF NOT EXISTS idx_legacy_admin_credentials_email_lower
    ON legacy_admin_credentials (lower(email))
    WHERE email IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_legacy_admin_credentials_imported_at
    ON legacy_admin_credentials (imported_at DESC);

CREATE TABLE IF NOT EXISTS legacy_business_owner_credentials (
    legacy_owner_id text PRIMARY KEY,
    business_id text,
    email text,
    full_name text,
    owner_status text,
    is_active boolean,
    password_hash text NOT NULL,
    source text NOT NULL DEFAULT 'app_documents/business_owners',
    source_row jsonb NOT NULL,
    normalized jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamptz,
    updated_at timestamptz,
    last_login_at timestamptz,
    imported_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_legacy_business_owner_credentials_business_id
    ON legacy_business_owner_credentials (business_id)
    WHERE business_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_legacy_business_owner_credentials_email_lower
    ON legacy_business_owner_credentials (lower(email))
    WHERE email IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_legacy_business_owner_credentials_imported_at
    ON legacy_business_owner_credentials (imported_at DESC);

CREATE TABLE IF NOT EXISTS legacy_business_staff_credentials (
    legacy_staff_id text PRIMARY KEY,
    business_id text,
    email text,
    phone text,
    name text,
    staff_role text,
    permissions jsonb NOT NULL DEFAULT '[]'::jsonb,
    staff_status text,
    is_active boolean,
    password_hash text NOT NULL,
    source text NOT NULL DEFAULT 'app_documents/business_staff',
    source_row jsonb NOT NULL,
    normalized jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamptz,
    updated_at timestamptz,
    last_login_at timestamptz,
    imported_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_legacy_business_staff_credentials_business_id
    ON legacy_business_staff_credentials (business_id)
    WHERE business_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_legacy_business_staff_credentials_email_lower
    ON legacy_business_staff_credentials (lower(email))
    WHERE email IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_legacy_business_staff_credentials_role
    ON legacy_business_staff_credentials (staff_role)
    WHERE staff_role IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_legacy_business_staff_credentials_imported_at
    ON legacy_business_staff_credentials (imported_at DESC);

CREATE TABLE IF NOT EXISTS legacy_qr_scans (
    legacy_qr_scan_id text PRIMARY KEY,
    business_id text,
    business_slug text,
    ip_hash text,
    user_agent text,
    source text NOT NULL DEFAULT 'app_documents/qr_scans',
    source_row jsonb NOT NULL,
    normalized jsonb NOT NULL DEFAULT '{}'::jsonb,
    scanned_at timestamptz,
    created_at timestamptz,
    updated_at timestamptz,
    imported_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_legacy_qr_scans_business_id
    ON legacy_qr_scans (business_id)
    WHERE business_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_legacy_qr_scans_business_slug
    ON legacy_qr_scans (business_slug)
    WHERE business_slug IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_legacy_qr_scans_scanned_at
    ON legacy_qr_scans (scanned_at DESC)
    WHERE scanned_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_legacy_qr_scans_imported_at
    ON legacy_qr_scans (imported_at DESC);

CREATE TABLE IF NOT EXISTS legacy_app_documents_archive (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    collection text NOT NULL,
    document_id text NOT NULL,
    data jsonb NOT NULL,
    source_row jsonb NOT NULL,
    created_at timestamptz,
    updated_at timestamptz,
    imported_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_legacy_app_documents_archive_collection_document_id_unique
    ON legacy_app_documents_archive (collection, document_id);

CREATE INDEX IF NOT EXISTS idx_legacy_app_documents_archive_collection
    ON legacy_app_documents_archive (collection);

CREATE INDEX IF NOT EXISTS idx_legacy_app_documents_archive_imported_at
    ON legacy_app_documents_archive (imported_at DESC);

CREATE TABLE IF NOT EXISTS import_manifests (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    run_id text NOT NULL,
    entity text NOT NULL,
    source text NOT NULL,
    row_count integer NOT NULL,
    checksum text NOT NULL,
    artifact_path text NOT NULL,
    artifact_bytes bigint,
    metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_import_manifests_run_id_entity_unique
    ON import_manifests (run_id, entity);

CREATE INDEX IF NOT EXISTS idx_import_manifests_run_id
    ON import_manifests (run_id);

CREATE INDEX IF NOT EXISTS idx_import_manifests_created_at
    ON import_manifests (created_at DESC);

CREATE TABLE IF NOT EXISTS import_validation_results (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    run_id text NOT NULL,
    entity text,
    check_name text NOT NULL,
    status text NOT NULL CHECK (status IN ('pass', 'warn', 'fail', 'pending')),
    expected_count integer,
    actual_count integer,
    details jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_import_validation_results_run_id
    ON import_validation_results (run_id);

CREATE INDEX IF NOT EXISTS idx_import_validation_results_status
    ON import_validation_results (status);

CREATE INDEX IF NOT EXISTS idx_import_validation_results_created_at
    ON import_validation_results (created_at DESC);
