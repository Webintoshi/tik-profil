CREATE TABLE IF NOT EXISTS reward_balances (
    app_user_id uuid PRIMARY KEY REFERENCES app_users(id) ON DELETE CASCADE,
    balance bigint NOT NULL DEFAULT 0 CHECK (balance >= 0),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS reward_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    app_user_id uuid NOT NULL REFERENCES app_users(id) ON DELETE RESTRICT,
    business_id text,
    city text,
    action_type text NOT NULL CHECK (action_type IN ('DISCOVERY', 'CONTACT', 'CHECK_IN', 'REVERSAL')),
    reward_group text NOT NULL CHECK (reward_group IN ('DISCOVERY', 'CONTACT', 'CHECK_IN', 'REVERSAL')),
    base_points integer NOT NULL DEFAULT 0,
    awarded_points integer NOT NULL DEFAULT 0,
    discovery_score_delta integer NOT NULL DEFAULT 0,
    status text NOT NULL CHECK (status IN ('APPROVED', 'REJECTED', 'REVERSED', 'PENDING')),
    reason_code text,
    client_event_id text NOT NULL UNIQUE,
    source_event_id uuid REFERENCES reward_events(id) ON DELETE RESTRICT,
    metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
    risk_flags text[] NOT NULL DEFAULT ARRAY[]::text[],
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reward_events_user_created
    ON reward_events (app_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_reward_events_user_business_group_created
    ON reward_events (app_user_id, business_id, reward_group, created_at DESC)
    WHERE status = 'APPROVED' AND business_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_reward_events_city_created
    ON reward_events (lower(city), created_at DESC, app_user_id)
    WHERE status = 'APPROVED' AND city IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_reward_events_action_daily
    ON reward_events (app_user_id, action_type, created_at DESC)
    WHERE status = 'APPROVED';

COMMENT ON TABLE reward_events IS
    'Immutable Tık Puan and discovery-score ledger. Corrections are appended as reversal rows.';
