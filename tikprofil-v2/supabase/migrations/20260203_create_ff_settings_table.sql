-- ============================================
-- FastFood Settings Table
-- ============================================

CREATE TABLE IF NOT EXISTS ff_settings (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    business_id TEXT NOT NULL UNIQUE REFERENCES businesses(id) ON DELETE CASCADE,

    -- Delivery options
    delivery_enabled BOOLEAN DEFAULT true,
    pickup_enabled BOOLEAN DEFAULT true,
    min_order_amount NUMERIC DEFAULT 0,
    delivery_fee NUMERIC DEFAULT 0,
    free_delivery_above NUMERIC DEFAULT 0,
    estimated_delivery_time TEXT DEFAULT '30-45 dk',

    -- Payment options
    cash_payment BOOLEAN DEFAULT true,
    card_on_delivery BOOLEAN DEFAULT true,
    online_payment BOOLEAN DEFAULT false,

    -- Working hours
    working_hours JSONB DEFAULT '{"monday":{"open":"09:00","close":"22:00","isOpen":true},"tuesday":{"open":"09:00","close":"22:00","isOpen":true},"wednesday":{"open":"09:00","close":"22:00","isOpen":true},"thursday":{"open":"09:00","close":"22:00","isOpen":true},"friday":{"open":"09:00","close":"23:00","isOpen":true},"saturday":{"open":"10:00","close":"23:00","isOpen":true},"sunday":{"open":"10:00","close":"22:00","isOpen":true}}'::jsonb,
    use_business_hours BOOLEAN DEFAULT true,

    -- WhatsApp & Notifications
    whatsapp_number TEXT,
    notifications JSONB DEFAULT '{"orderReceived":true,"preparing":true,"onWay":true,"delivered":true}'::jsonb,

    -- Menu options
    menu_theme TEXT DEFAULT 'modern',
    waiter_call_enabled BOOLEAN DEFAULT true,
    request_bill_enabled BOOLEAN DEFAULT true,
    cart_enabled BOOLEAN DEFAULT true,
    wifi_password TEXT DEFAULT '',

    -- Branding
    business_logo_url TEXT DEFAULT '',

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true
);

-- Index'ler
CREATE UNIQUE INDEX IF NOT EXISTS ff_settings_business_id_idx ON ff_settings(business_id);
CREATE INDEX IF NOT EXISTS ff_settings_created_at_idx ON ff_settings(created_at);

-- Updated at trigger
CREATE OR REPLACE FUNCTION update_ff_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_ff_settings_update ON ff_settings;
CREATE TRIGGER on_ff_settings_update
    BEFORE UPDATE ON ff_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_ff_settings_updated_at();

-- RLS
ALTER TABLE ff_settings ENABLE ROW LEVEL SECURITY;

-- Business sahipleri kendi ayarlarını görebilir
CREATE POLICY "Business owners can view their settings"
ON ff_settings FOR SELECT
USING (business_id IN (
    SELECT id FROM businesses WHERE owner = auth.uid()
));

-- Service role (API) can manage settings
CREATE POLICY "Service role can manage settings"
ON ff_settings FOR ALL
USING (auth.role() = 'service_role');

-- Comment
COMMENT ON TABLE ff_settings IS 'FastFood işletme ayarları';
COMMENT ON COLUMN ff_settings.delivery_enabled IS 'Paket servisin açık/kapalı';
COMMENT ON COLUMN ff_settings.pickup_enabled IS 'Gel al seçeneğinin açık/kapalı';
COMMENT ON COLUMN ff_settings.cart_enabled IS 'Sepet ve sipariş verme özelliğinin açık/kapalı';
COMMENT ON COLUMN ff_settings.waiter_call_enabled IS 'Garson çağırma özelliğinin açık/kapalı';
COMMENT ON COLUMN ff_settings.wifi_password IS 'Müşteriler için WiFi şifresi';
