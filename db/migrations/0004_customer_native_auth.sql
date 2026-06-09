CREATE UNIQUE INDEX IF NOT EXISTS idx_app_users_phone_unique
    ON app_users (phone)
    WHERE phone IS NOT NULL;

CREATE TABLE IF NOT EXISTS customer_otp_challenges (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    phone_e164 text NOT NULL,
    code_hash text NOT NULL,
    code_salt text NOT NULL,
    provider text NOT NULL DEFAULT 'netgsm',
    delivery_channel text NOT NULL DEFAULT 'sms',
    purpose text NOT NULL DEFAULT 'customer_login',
    status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'consumed', 'expired', 'locked')),
    attempts integer NOT NULL DEFAULT 0,
    max_attempts integer NOT NULL DEFAULT 3,
    provider_job_id text,
    expires_at timestamptz NOT NULL,
    consumed_at timestamptz,
    ip_hash text,
    user_agent_hash text,
    metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_customer_otp_challenges_phone_created_desc
    ON customer_otp_challenges (phone_e164, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_customer_otp_challenges_pending
    ON customer_otp_challenges (phone_e164, expires_at)
    WHERE status = 'pending';
