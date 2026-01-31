-- Araç Kiralama Modülü - DÜZELTİLMİŞ SQL
-- business_id TEXT olarak ayarlandı ve foreign key eklendi

-- 1. Kategoriler
CREATE TABLE IF NOT EXISTS vehicle_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    name VARCHAR(50) NOT NULL,
    icon VARCHAR(50) DEFAULT 'Car',
    color VARCHAR(20) DEFAULT 'blue',
    sort_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Araçlar
CREATE TABLE IF NOT EXISTS vehicles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    category_id UUID REFERENCES vehicle_categories(id) ON DELETE SET NULL,
    brand VARCHAR(50) NOT NULL,
    model VARCHAR(50) NOT NULL,
    year INT NOT NULL,
    plate VARCHAR(20) NOT NULL,
    fuel_type VARCHAR(20) DEFAULT 'benzin',
    transmission VARCHAR(20) DEFAULT 'otomatik',
    seats INT DEFAULT 5,
    color VARCHAR(30),
    daily_price DECIMAL(10,2) NOT NULL DEFAULT 0,
    deposit_amount DECIMAL(10,2) DEFAULT 0,
    status VARCHAR(20) DEFAULT 'available',
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Araç Fotoğrafları
CREATE TABLE IF NOT EXISTS vehicle_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    r2_key TEXT NOT NULL,
    is_primary BOOLEAN DEFAULT false,
    sort_order INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Rezervasyonlar
CREATE TABLE IF NOT EXISTS vehicle_reservations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    vehicle_id UUID NOT NULL REFERENCES vehicles(id),
    customer_name VARCHAR(100) NOT NULL,
    customer_phone VARCHAR(20) NOT NULL,
    customer_email VARCHAR(100),
    customer_id_number VARCHAR(20),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    start_time TIME DEFAULT '09:00',
    end_time TIME DEFAULT '09:00',
    pickup_location VARCHAR(200),
    return_location VARCHAR(200),
    total_days INT NOT NULL,
    daily_price DECIMAL(10,2) NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    deposit_amount DECIMAL(10,2) DEFAULT 0,
    status VARCHAR(20) DEFAULT 'pending',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexler (Duplicates kaldırıldı)
CREATE INDEX IF NOT EXISTS idx_vehicles_business ON vehicles(business_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_category ON vehicles(category_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_status ON vehicles(status);
CREATE INDEX IF NOT EXISTS idx_vehicle_images_vehicle ON vehicle_images(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_categories_business ON vehicle_categories(business_id);
CREATE INDEX IF NOT EXISTS idx_reservations_business ON vehicle_reservations(business_id);
CREATE INDEX IF NOT EXISTS idx_reservations_vehicle ON vehicle_reservations(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_reservations_dates ON vehicle_reservations(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_reservations_status ON vehicle_reservations(status);

-- RLS (Row Level Security) Policies
ALTER TABLE vehicle_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicle_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicle_reservations ENABLE ROW LEVEL SECURITY;

-- Policy: Businesses can only see their own data
CREATE POLICY vehicle_categories_business_policy ON vehicle_categories
    FOR ALL USING (business_id = (SELECT id FROM businesses WHERE id = business_id));

CREATE POLICY vehicles_business_policy ON vehicles
    FOR ALL USING (business_id = (SELECT id FROM businesses WHERE id = business_id));

CREATE POLICY vehicle_images_business_policy ON vehicle_images
    FOR ALL USING (
        vehicle_id IN (
            SELECT v.id FROM vehicles v 
            WHERE v.business_id = (SELECT id FROM businesses WHERE id = business_id)
        )
    );

CREATE POLICY vehicle_reservations_business_policy ON vehicle_reservations
    FOR ALL USING (business_id = (SELECT id FROM businesses WHERE id = business_id));
