-- ============================================
-- FastFood Menu System Tables
-- ============================================

-- Garson çağrıları tablosu
CREATE TABLE IF NOT EXISTS ff_waiter_calls (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    table_id TEXT NOT NULL,
    message TEXT,
    status TEXT DEFAULT 'pending', -- pending, acknowledged, completed
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index'ler
CREATE INDEX IF NOT EXISTS ff_waiter_calls_business_id_idx ON ff_waiter_calls(business_id);
CREATE INDEX IF NOT EXISTS ff_waiter_calls_table_id_idx ON ff_waiter_calls(table_id);
CREATE INDEX IF NOT EXISTS ff_waiter_calls_status_idx ON ff_waiter_calls(status);

-- Masa scan count artırma fonksiyonu
CREATE OR REPLACE FUNCTION increment_table_scan(p_table_id TEXT)
RETURNS VOID AS $$
BEGIN
    UPDATE fb_tables
    SET scan_count = COALESCE(scan_count, 0) + 1,
        updated_at = NOW()
    WHERE id = p_table_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS Policies
ALTER TABLE ff_waiter_calls ENABLE ROW LEVEL SECURITY;

-- Business sahipleri kendi garson çağrılarını görebilir
CREATE POLICY "Business owners can view their waiter calls"
ON ff_waiter_calls FOR SELECT
USING (business_id IN (
    SELECT id FROM businesses WHERE owner = auth.uid()
));

-- Public insert (müşteriler garson çağırabilir)
CREATE POLICY "Anyone can create waiter calls"
ON ff_waiter_calls FOR INSERT
WITH CHECK (true);

-- Business sahipleri güncelleyebilir
CREATE POLICY "Business owners can update their waiter calls"
ON ff_waiter_calls FOR UPDATE
USING (business_id IN (
    SELECT id FROM businesses WHERE owner = auth.uid()
));

-- Yorumlar
COMMENT ON TABLE ff_waiter_calls IS 'FastFood garson çağrıları';
COMMENT ON FUNCTION increment_table_scan IS 'Masa scan countunu artırır';
