-- ============================================
-- TIKPROFIL COFFEE SHOP MODULE - FIXED
-- business_id: UUID -> TEXT (compatible with businesses table)
-- ============================================

-- 1. coffee_categories
CREATE TABLE IF NOT EXISTS coffee_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    slug TEXT NOT NULL,
    icon TEXT DEFAULT 'coffee',
    image_url TEXT,
    description TEXT,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_coffee_categories_business ON coffee_categories(business_id);

-- 2. coffee_sizes
CREATE TABLE IF NOT EXISTS coffee_sizes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    name_en TEXT,
    volume_ml INTEGER,
    volume_oz INTEGER,
    price_modifier DECIMAL(10,2) DEFAULT 0,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_coffee_sizes_business ON coffee_sizes(business_id);

-- 3. coffee_extra_groups
CREATE TABLE IF NOT EXISTS coffee_extra_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    slug TEXT NOT NULL,
    selection_type TEXT DEFAULT 'single',
    min_selection INTEGER DEFAULT 0,
    max_selection INTEGER DEFAULT 1,
    is_required BOOLEAN DEFAULT false,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_coffee_extra_groups_business ON coffee_extra_groups(business_id);

-- 4. coffee_extras
CREATE TABLE IF NOT EXISTS coffee_extras (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    extra_group_id UUID NOT NULL REFERENCES coffee_extra_groups(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    name_en TEXT,
    price_modifier DECIMAL(10,2) DEFAULT 0,
    image_url TEXT,
    calories INTEGER,
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_coffee_extras_business ON coffee_extras(business_id);
CREATE INDEX IF NOT EXISTS idx_coffee_extras_group ON coffee_extras(extra_group_id);

-- 5. coffee_products
CREATE TABLE IF NOT EXISTS coffee_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES coffee_categories(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    name_en TEXT,
    description TEXT,
    description_en TEXT,
    image_url TEXT,
    temperature TEXT DEFAULT 'hot',
    coffee_type TEXT DEFAULT 'espresso',
    caffeine_level TEXT DEFAULT 'medium',
    base_shots INTEGER DEFAULT 1,
    has_milk BOOLEAN DEFAULT false,
    base_price DECIMAL(10,2) NOT NULL,
    discount_price DECIMAL(10,2),
    discount_percent INTEGER,
    calories INTEGER,
    preparation_time INTEGER DEFAULT 5,
    is_featured BOOLEAN DEFAULT false,
    is_available BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_coffee_products_business ON coffee_products(business_id);
CREATE INDEX IF NOT EXISTS idx_coffee_products_category ON coffee_products(category_id);

-- 6. coffee_product_extras
CREATE TABLE IF NOT EXISTS coffee_product_extras (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES coffee_products(id) ON DELETE CASCADE,
    extra_group_id UUID NOT NULL REFERENCES coffee_extra_groups(id) ON DELETE CASCADE,
    sort_order INTEGER DEFAULT 0,
    UNIQUE(product_id, extra_group_id)
);

CREATE INDEX IF NOT EXISTS idx_coffee_product_extras_product ON coffee_product_extras(product_id);

-- 7. coffee_orders
CREATE TABLE IF NOT EXISTS coffee_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    order_number TEXT NOT NULL,
    customer_name TEXT,
    customer_phone TEXT,
    customer_email TEXT,
    order_type TEXT NOT NULL DEFAULT 'takeaway',
    order_source TEXT DEFAULT 'web',
    table_id TEXT,
    pickup_time TIMESTAMPTZ,
    subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,
    discount_amount DECIMAL(10,2) DEFAULT 0,
    tax_amount DECIMAL(10,2) DEFAULT 0,
    tip_amount DECIMAL(10,2) DEFAULT 0,
    delivery_fee DECIMAL(10,2) DEFAULT 0,
    total_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    coupon_code TEXT,
    coupon_discount DECIMAL(10,2) DEFAULT 0,
    loyalty_customer_id UUID,
    loyalty_points_earned INTEGER DEFAULT 0,
    loyalty_stamps_earned INTEGER DEFAULT 0,
    loyalty_tier TEXT,
    payment_method TEXT,
    payment_status TEXT DEFAULT 'pending',
    is_paid BOOLEAN DEFAULT false,
    status TEXT DEFAULT 'pending',
    ordered_at TIMESTAMPTZ DEFAULT NOW(),
    confirmed_at TIMESTAMPTZ,
    ready_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    customer_notes TEXT,
    internal_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_coffee_orders_business ON coffee_orders(business_id);
CREATE INDEX IF NOT EXISTS idx_coffee_orders_status ON coffee_orders(status);
CREATE INDEX IF NOT EXISTS idx_coffee_orders_date ON coffee_orders(created_at DESC);

-- 8. coffee_order_items
CREATE TABLE IF NOT EXISTS coffee_order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES coffee_orders(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES coffee_products(id),
    product_name TEXT NOT NULL,
    product_snapshot JSONB,
    size_id UUID REFERENCES coffee_sizes(id),
    size_name TEXT,
    size_price_modifier DECIMAL(10,2) DEFAULT 0,
    unit_price DECIMAL(10,2) NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    selected_extras JSONB,
    extras_total DECIMAL(10,2) DEFAULT 0,
    line_total DECIMAL(10,2) NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_coffee_order_items_order ON coffee_order_items(order_id);

-- 9. coffee_coupons
CREATE TABLE IF NOT EXISTS coffee_coupons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    code TEXT NOT NULL,
    name TEXT,
    description TEXT,
    discount_type TEXT NOT NULL,
    discount_value DECIMAL(10,2),
    max_discount_amount DECIMAL(10,2),
    min_order_amount DECIMAL(10,2) DEFAULT 0,
    max_uses_total INTEGER,
    max_uses_per_customer INTEGER,
    used_count INTEGER DEFAULT 0,
    valid_from TIMESTAMPTZ,
    valid_until TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(business_id, code)
);

CREATE INDEX IF NOT EXISTS idx_coffee_coupons_business ON coffee_coupons(business_id);
CREATE INDEX IF NOT EXISTS idx_coffee_coupons_code ON coffee_coupons(code);

-- 10. coffee_loyalty_customers
CREATE TABLE IF NOT EXISTS coffee_loyalty_customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    customer_phone TEXT NOT NULL,
    customer_name TEXT,
    customer_email TEXT,
    customer_device_id TEXT,
    stamps_earned INTEGER DEFAULT 0,
    stamps_redeemed INTEGER DEFAULT 0,
    stamps_total INTEGER DEFAULT 0,
    points_balance INTEGER DEFAULT 0,
    points_earned INTEGER DEFAULT 0,
    points_redeemed INTEGER DEFAULT 0,
    tier TEXT DEFAULT 'bronze',
    visits_count INTEGER DEFAULT 0,
    total_spent DECIMAL(10,2) DEFAULT 0,
    free_drinks_earned INTEGER DEFAULT 0,
    free_drinks_redeemed INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    last_visit_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(business_id, customer_phone)
);

CREATE INDEX IF NOT EXISTS idx_coffee_loyalty_business ON coffee_loyalty_customers(business_id);
CREATE INDEX IF NOT EXISTS idx_coffee_loyalty_phone ON coffee_loyalty_customers(customer_phone);

-- 11. coffee_loyalty_transactions
CREATE TABLE IF NOT EXISTS coffee_loyalty_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES coffee_loyalty_customers(id) ON DELETE CASCADE,
    order_id UUID REFERENCES coffee_orders(id),
    transaction_type TEXT NOT NULL,
    stamps_change INTEGER DEFAULT 0,
    points_change INTEGER DEFAULT 0,
    stamps_before INTEGER DEFAULT 0,
    stamps_after INTEGER DEFAULT 0,
    points_before INTEGER DEFAULT 0,
    points_after INTEGER DEFAULT 0,
    tier_before TEXT,
    tier_after TEXT,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_coffee_loyalty_tx_customer ON coffee_loyalty_transactions(customer_id);

-- 12. coffee_settings
CREATE TABLE IF NOT EXISTS coffee_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id TEXT NOT NULL UNIQUE REFERENCES businesses(id) ON DELETE CASCADE,
    wifi_name TEXT,
    wifi_password TEXT,
    loyalty_enabled BOOLEAN DEFAULT true,
    loyalty_type TEXT DEFAULT 'stamps',
    stamps_for_free_drink INTEGER DEFAULT 10,
    points_per_currency INTEGER DEFAULT 10,
    points_for_free_drink INTEGER DEFAULT 500,
    tier_enabled BOOLEAN DEFAULT true,
    tier_bronze_threshold INTEGER DEFAULT 0,
    tier_silver_threshold INTEGER DEFAULT 500,
    tier_gold_threshold INTEGER DEFAULT 2000,
    subscription_enabled BOOLEAN DEFAULT false,
    subscription_price DECIMAL(10,2) DEFAULT 299.00,
    tip_enabled BOOLEAN DEFAULT true,
    tip_percentages JSONB DEFAULT '[10, 15, 20]',
    auto_accept_orders BOOLEAN DEFAULT false,
    preparation_time_default INTEGER DEFAULT 5,
    pickup_enabled BOOLEAN DEFAULT true,
    pickup_min_hours INTEGER DEFAULT 0,
    pickup_max_hours INTEGER DEFAULT 168,
    payment_cash BOOLEAN DEFAULT true,
    payment_credit_card BOOLEAN DEFAULT true,
    payment_mobile BOOLEAN DEFAULT true,
    tax_rate DECIMAL(5,2) DEFAULT 10,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_coffee_settings_business ON coffee_settings(business_id);

-- 13. coffee_tables
CREATE TABLE IF NOT EXISTS coffee_tables (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    table_number TEXT NOT NULL,
    table_name TEXT,
    capacity INTEGER DEFAULT 4,
    qr_code TEXT UNIQUE,
    location TEXT,
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(business_id, table_number)
);

CREATE INDEX IF NOT EXISTS idx_coffee_tables_business ON coffee_tables(business_id);

-- 14. coffee_call_waiter
CREATE TABLE IF NOT EXISTS coffee_call_waiter (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    table_id UUID REFERENCES coffee_tables(id),
    table_number TEXT,
    status TEXT DEFAULT 'pending',
    called_at TIMESTAMPTZ DEFAULT NOW(),
    acknowledged_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_coffee_call_waiter_business ON coffee_call_waiter(business_id);
CREATE INDEX IF NOT EXISTS idx_coffee_call_waiter_status ON coffee_call_waiter(status);

-- DEFAULT DATA FUNCTION
CREATE OR REPLACE FUNCTION create_coffee_defaults(p_business_id TEXT)
RETURNS VOID AS $$
BEGIN
    INSERT INTO coffee_categories (business_id, name, slug, icon, sort_order) VALUES
        (p_business_id, 'Sıcak İçecekler', 'hot-drinks', 'coffee', 1),
        (p_business_id, 'Soğuk İçecekler', 'cold-drinks', 'glass-water', 2),
        (p_business_id, 'Yiyecekler', 'food', 'cake', 3),
        (p_business_id, 'Ürünler', 'merchandise', 'shopping-bag', 4);

    INSERT INTO coffee_sizes (business_id, name, volume_ml, price_modifier, sort_order) VALUES
        (p_business_id, 'Short', 240, -5, 1),
        (p_business_id, 'Tall', 360, 0, 2),
        (p_business_id, 'Grande', 480, 5, 3),
        (p_business_id, 'Venti', 600, 10, 4);

    INSERT INTO coffee_settings (business_id) VALUES (p_business_id);

    INSERT INTO coffee_extra_groups (business_id, name, slug, selection_type, is_required, sort_order) VALUES
        (p_business_id, 'Süt Seçimi', 'milk-type', 'single', true, 1),
        (p_business_id, 'Tatlandırıcı', 'sweetener', 'single', false, 2),
        (p_business_id, 'Şurup', 'syrup', 'multiple', false, 3),
        (p_business_id, 'Ekstralar', 'extras', 'multiple', false, 4),
        (p_business_id, 'Süsleme', 'toppings', 'multiple', false, 5);

    RAISE NOTICE 'Coffee defaults created for business %', p_business_id;
END;
$$ LANGUAGE plpgsql;

-- ENABLE RLS
ALTER TABLE coffee_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE coffee_sizes ENABLE ROW LEVEL SECURITY;
ALTER TABLE coffee_extra_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE coffee_extras ENABLE ROW LEVEL SECURITY;
ALTER TABLE coffee_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE coffee_product_extras ENABLE ROW LEVEL SECURITY;
ALTER TABLE coffee_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE coffee_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE coffee_coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE coffee_loyalty_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE coffee_loyalty_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE coffee_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE coffee_tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE coffee_call_waiter ENABLE ROW LEVEL SECURITY;
