-- ============================================
-- TIKPROFIL COFFEE SHOP MODULE - SUBSCRIPTIONS (FIXED)
-- business_id: UUID -> TEXT
-- ============================================

-- 15. coffee_subscriptions
CREATE TABLE IF NOT EXISTS coffee_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES coffee_loyalty_customers(id) ON DELETE CASCADE,

    -- Plan
    plan_type TEXT NOT NULL, -- unlimited_coffee, daily_coffee, bean_subscription
    plan_name TEXT,
    description TEXT,

    -- Pricing
    price DECIMAL(10,2) NOT NULL,
    currency TEXT DEFAULT 'TRY',

    -- Limits
    drinks_per_day INTEGER, -- unlimited için null
    drinks_remaining_today INTEGER,

    -- Dates
    starts_at TIMESTAMPTZ NOT NULL,
    ends_at TIMESTAMPTZ,
    next_billing_at TIMESTAMPTZ,

    -- Payment
    payment_method TEXT,
    auto_renew BOOLEAN DEFAULT true,

    -- Status
    status TEXT DEFAULT 'active', -- active, paused, cancelled, expired

    -- Usage tracking
    total_drinks_claimed INTEGER DEFAULT 0,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_coffee_subscription_business ON coffee_subscriptions(business_id);
CREATE INDEX IF NOT EXISTS idx_coffee_subscription_customer ON coffee_subscriptions(customer_id);
CREATE INDEX IF NOT EXISTS idx_coffee_subscription_status ON coffee_subscriptions(status);

-- 16. coffee_subscription_usage
CREATE TABLE IF NOT EXISTS coffee_subscription_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subscription_id UUID NOT NULL REFERENCES coffee_subscriptions(id) ON DELETE CASCADE,
    order_id UUID REFERENCES coffee_orders(id),

    drink_claimed TEXT, -- İçecek adı
    claimed_at TIMESTAMPTZ DEFAULT NOW(),

    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_coffee_sub_usage_subscription ON coffee_subscription_usage(subscription_id);

-- Enable RLS
ALTER TABLE coffee_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE coffee_subscription_usage ENABLE ROW LEVEL SECURITY;
