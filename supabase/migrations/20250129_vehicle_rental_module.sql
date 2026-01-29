-- Araç Kiralama Modülü - Temiz SQL Yapısı
-- Tarih: 2025-01-29

-- 1. Kategoriler (Basit gruplama)
CREATE TABLE IF NOT EXISTS vehicle_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    name VARCHAR(50) NOT NULL,
    icon VARCHAR(50) DEFAULT 'Car',
    color VARCHAR(20) DEFAULT 'blue',
    sort_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Araçlar (Ana tablo - minimal alanlar)
CREATE TABLE IF NOT EXISTS vehicles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    category_id UUID REFERENCES vehicle_categories(id) ON DELETE SET NULL,
    
    -- Temel Bilgiler
    brand VARCHAR(50) NOT NULL,
    model VARCHAR(50) NOT NULL,
    year INT NOT NULL,
    plate VARCHAR(20) NOT NULL,
    
    -- Özellikler
    fuel_type VARCHAR(20) DEFAULT 'benzin',
    transmission VARCHAR(20) DEFAULT 'otomatik',
    seats INT DEFAULT 5,
    color VARCHAR(30),
    
    -- Fiyatlandırma
    daily_price DECIMAL(10,2) NOT NULL DEFAULT 0,
    deposit_amount DECIMAL(10,2) DEFAULT 0,
    
    -- Durum
    status VARCHAR(20) DEFAULT 'available', -- available/rented/maintenance
    description TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Araç Fotoğrafları (R2 entegrasyonu)
CREATE TABLE IF NOT EXISTS vehicle_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    r2_key TEXT NOT NULL,
    is_primary BOOLEAN DEFAULT false,
    sort_order INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Rezervasyonlar (Sade & Anlaşılır)
CREATE TABLE IF NOT EXISTS vehicle_reservations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    vehicle_id UUID NOT NULL REFERENCES vehicles(id),
    
    -- Müşteri Bilgileri
    customer_name VARCHAR(100) NOT NULL,
    customer_phone VARCHAR(20) NOT NULL,
    customer_email VARCHAR(100),
    customer_id_number VARCHAR(20),
    
    -- Tarihler
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    start_time TIME DEFAULT '09:00',
    end_time TIME DEFAULT '09:00',
    
    -- Konumlar
    pickup_location VARCHAR(200),
    return_location VARCHAR(200),
    
    -- Ödeme
    total_days INT NOT NULL,
    daily_price DECIMAL(10,2) NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    deposit_amount DECIMAL(10,2) DEFAULT 0,
    
    -- Durum (Basit 4 durum)
    status VARCHAR(20) DEFAULT 'pending', -- pending/confirmed/completed/cancelled
    notes TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexler (Performans)
CREATE INDEX IF NOT EXISTS idx_vehicles_business ON vehicles(business_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_status ON vehicles(status);
CREATE INDEX IF NOT EXISTS idx_vehicle_images_vehicle ON vehicle_images(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_reservations_business ON vehicle_reservations(business_id);
CREATE INDEX IF NOT EXISTS idx_reservations_vehicle ON vehicle_reservations(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_reservations_dates ON vehicle_reservations(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_reservations_status ON vehicle_reservations(status);

-- Modül kaydı için hazırlık (Sadece development)
-- Not: Gerçek modül kaydı MODULE_REGISTRY üzerinden yapılacak

COMMENT ON TABLE vehicles IS 'Kiralık araçlar';
COMMENT ON TABLE vehicle_reservations IS 'Araç rezervasyonları';
COMMENT ON COLUMN vehicles.status IS 'available: Müsait, rented: Kirada, maintenance: Bakımda';
COMMENT ON COLUMN vehicle_reservations.status IS 'pending: Bekliyor, confirmed: Onaylandı, completed: Tamamlandı, cancelled: İptal';
