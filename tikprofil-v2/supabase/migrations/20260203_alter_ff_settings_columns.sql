-- ============================================
-- Add missing columns to ff_settings table
-- Run this if the table already exists
-- ============================================

-- Check and add columns individually (won't error if column exists)
ALTER TABLE ff_settings
    ADD COLUMN IF NOT EXISTS delivery_enabled BOOLEAN DEFAULT true,
    ADD COLUMN IF NOT EXISTS pickup_enabled BOOLEAN DEFAULT true,
    ADD COLUMN IF NOT EXISTS min_order_amount NUMERIC DEFAULT 0,
    ADD COLUMN IF NOT EXISTS delivery_fee NUMERIC DEFAULT 0,
    ADD COLUMN IF NOT EXISTS free_delivery_above NUMERIC DEFAULT 0,
    ADD COLUMN IF NOT EXISTS estimated_delivery_time TEXT DEFAULT '30-45 dk',
    ADD COLUMN IF NOT EXISTS cash_payment BOOLEAN DEFAULT true,
    ADD COLUMN IF NOT EXISTS card_on_delivery BOOLEAN DEFAULT true,
    ADD COLUMN IF NOT EXISTS online_payment BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS working_hours JSONB DEFAULT '{"monday":{"open":"09:00","close":"22:00","isOpen":true}}'::jsonb,
    ADD COLUMN IF NOT EXISTS use_business_hours BOOLEAN DEFAULT true,
    ADD COLUMN IF NOT EXISTS whatsapp_number TEXT,
    ADD COLUMN IF NOT EXISTS notifications JSONB DEFAULT '{"orderReceived":true,"preparing":true,"onWay":true,"delivered":true}'::jsonb,
    ADD COLUMN IF NOT EXISTS menu_theme TEXT DEFAULT 'modern',
    ADD COLUMN IF NOT EXISTS waiter_call_enabled BOOLEAN DEFAULT true,
    ADD COLUMN IF NOT EXISTS request_bill_enabled BOOLEAN DEFAULT true,
    ADD COLUMN IF NOT EXISTS cart_enabled BOOLEAN DEFAULT true,
    ADD COLUMN IF NOT EXISTS wifi_password TEXT DEFAULT '',
    ADD COLUMN IF NOT EXISTS business_logo_url TEXT DEFAULT '',
    ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Create unique index on business_id
CREATE UNIQUE INDEX IF NOT EXISTS ff_settings_business_id_idx ON ff_settings(business_id);

-- Drop old indexes if any conflicts
DROP INDEX IF EXISTS ff_settings_business_id_idx;

-- Create trigger for updated_at
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
