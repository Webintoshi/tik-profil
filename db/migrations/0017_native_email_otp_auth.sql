ALTER TABLE app_users
    ADD COLUMN IF NOT EXISTS email_verified_at timestamptz,
    ADD COLUMN IF NOT EXISTS last_login_at timestamptz,
    ADD COLUMN IF NOT EXISTS disabled_at timestamptz;

CREATE TABLE IF NOT EXISTS native_auth_challenges (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    email_hash text NOT NULL,
    purpose text NOT NULL CHECK (purpose IN ('sign_in', 'sign_up')),
    code_hash text NOT NULL,
    request_ip_hash text NOT NULL,
    attempt_count integer NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
    max_attempts integer NOT NULL DEFAULT 5 CHECK (max_attempts BETWEEN 1 AND 10),
    sent_at timestamptz NOT NULL DEFAULT now(),
    expires_at timestamptz NOT NULL,
    consumed_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_native_auth_challenges_email_created
    ON native_auth_challenges (email_hash, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_native_auth_challenges_ip_created
    ON native_auth_challenges (request_ip_hash, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_native_auth_challenges_pending
    ON native_auth_challenges (expires_at)
    WHERE consumed_at IS NULL;

CREATE TABLE IF NOT EXISTS native_auth_rate_limit_locks (
    scope_hash text PRIMARY KEY,
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS native_auth_sessions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    app_user_id uuid NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
    refresh_token_hash text NOT NULL UNIQUE,
    device_id_hash text NOT NULL,
    device_platform text NOT NULL DEFAULT 'unknown'
        CHECK (device_platform IN ('android', 'ios', 'web', 'unknown')),
    device_name text,
    rotation_counter integer NOT NULL DEFAULT 0 CHECK (rotation_counter >= 0),
    created_at timestamptz NOT NULL DEFAULT now(),
    last_used_at timestamptz NOT NULL DEFAULT now(),
    expires_at timestamptz NOT NULL,
    revoked_at timestamptz,
    revoke_reason text
);

CREATE INDEX IF NOT EXISTS idx_native_auth_sessions_user_active
    ON native_auth_sessions (app_user_id, last_used_at DESC)
    WHERE revoked_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_native_auth_sessions_expires
    ON native_auth_sessions (expires_at)
    WHERE revoked_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_auth_provider_links_native_email_user
    ON auth_provider_links (app_user_id)
    WHERE provider = 'native_email';
