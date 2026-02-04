-- ============================================
-- Cities Tablosu Oluşturma
-- ============================================

CREATE TABLE IF NOT EXISTS cities (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    plate TEXT NOT NULL,
    description TEXT,

    -- SEO & Content
    cover_image TEXT,
    cover_image_alt TEXT,
    tagline TEXT,
    short_description TEXT,
    content TEXT DEFAULT '',
    seo_title TEXT,
    seo_description TEXT,
    canonical_url TEXT,
    slug TEXT UNIQUE,

    -- JSONB fields
    tags JSONB DEFAULT '[]'::jsonb,
    gallery JSONB DEFAULT '[]'::jsonb,
    places JSONB DEFAULT '[]'::jsonb,

    -- Status
    status TEXT DEFAULT 'draft',

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS cities_slug_idx ON cities(slug);
CREATE INDEX IF NOT EXISTS cities_status_idx ON cities(status);
CREATE INDEX IF NOT EXISTS cities_name_idx ON cities(name);

-- Trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_cities_updated_at
    BEFORE UPDATE ON cities
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- Türkiye'nin Tüm 81 İlini Ekle
-- ============================================

INSERT INTO cities (id, name, plate, description) VALUES
('adana', 'Adana', '01', NULL),
('adiyaman', 'Adıyaman', '02', NULL),
('afyonkarahisar', 'Afyonkarahisar', '03', NULL),
('agri', 'Ağrı', '04', NULL),
('amasya', 'Amasya', '05', NULL),
('ankara', 'Ankara', '06', NULL),
('antalya', 'Antalya', '07', NULL),
('artvin', 'Artvin', '08', NULL),
('aydin', 'Aydın', '09', NULL),
('balikesir', 'Balıkesir', '10', NULL),
('bilecik', 'Bilecik', '11', NULL),
('bingol', 'Bingöl', '12', NULL),
('bitlis', 'Bitlis', '13', NULL),
('bolu', 'Bolu', '14', NULL),
('burdur', 'Burdur', '15', NULL),
('bursa', 'Bursa', '16', NULL),
('canakkale', 'Çanakkale', '17', NULL),
('cankiri', 'Çankırı', '18', NULL),
('corum', 'Çorum', '19', NULL),
('denizli', 'Denizli', '20', NULL),
('diyarbakir', 'Diyarbakır', '21', NULL),
('edirne', 'Edirne', '22', NULL),
('elazig', 'Elazığ', '23', NULL),
('erzincan', 'Erzincan', '24', NULL),
('erzurum', 'Erzurum', '25', NULL),
('eskisehir', 'Eskişehir', '26', NULL),
('gaziantep', 'Gaziantep', '27', NULL),
('giresun', 'Giresun', '28', NULL),
('gumushane', 'Gümüşhane', '29', NULL),
('hakkari', 'Hakkari', '30', NULL),
('hatay', 'Hatay', '31', NULL),
('isparta', 'Isparta', '32', NULL),
('mersin', 'Mersin', '33', NULL),
('istanbul', 'İstanbul', '34', NULL),
('izmir', 'İzmir', '35', NULL),
('kars', 'Kars', '36', NULL),
('kastamonu', 'Kastamonu', '37', NULL),
('kayseri', 'Kayseri', '38', NULL),
('kirklareli', 'Kırklareli', '39', NULL),
('kirsehir', 'Kırşehir', '40', NULL),
('kocaeli', 'Kocaeli', '41', NULL),
('konya', 'Konya', '42', NULL),
('kutahya', 'Kütahya', '43', NULL),
('malatya', 'Malatya', '44', NULL),
('manisa', 'Manisa', '45', NULL),
('kahramanmaras', 'Kahramanmaraş', '46', NULL),
('mardin', 'Mardin', '47', NULL),
('mugla', 'Muğla', '48', NULL),
('mus', 'Muş', '49', NULL),
('nevsehir', 'Nevşehir', '50', NULL),
('nigde', 'Niğde', '51', NULL),
('ordu', 'Ordu', '52', NULL),
('rize', 'Rize', '53', NULL),
('sakarya', 'Sakarya', '54', NULL),
('samsun', 'Samsun', '55', NULL),
('siirt', 'Siirt', '56', NULL),
('sinop', 'Sinop', '57', NULL),
('sivas', 'Sivas', '58', NULL),
('tekirdag', 'Tekirdağ', '59', NULL),
('tokat', 'Tokat', '60', NULL),
('trabzon', 'Trabzon', '61', NULL),
('tunceli', 'Tunceli', '62', NULL),
('sanliurfa', 'Şanlıurfa', '63', NULL),
('usak', 'Uşak', '64', NULL),
('van', 'Van', '65', NULL),
('yozgat', 'Yozgat', '66', NULL),
('zonguldak', 'Zonguldak', '67', NULL),
('aksaray', 'Aksaray', '68', NULL),
('bayburt', 'Bayburt', '69', NULL),
('karaman', 'Karaman', '70', NULL),
('kirikkale', 'Kırıkkale', '71', NULL),
('batman', 'Batman', '72', NULL),
('sirnak', 'Şırnak', '73', NULL),
('bartin', 'Bartın', '74', NULL),
('ardahan', 'Ardahan', '75', NULL),
('igdir', 'Iğdır', '76', NULL),
('yalova', 'Yalova', '77', NULL),
('karabuk', 'Karabük', '78', NULL),
('kilis', 'Kilis', '79', NULL),
('osmaniye', 'Osmaniye', '80', NULL),
('duzce', 'Düzce', '81', NULL)
ON CONFLICT (id) DO NOTHING;

-- Verify count
SELECT COUNT(*) as total_cities FROM cities;
