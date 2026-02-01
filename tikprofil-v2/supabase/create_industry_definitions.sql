-- Industry Definitions Table
-- Bu SQL'i Supabase SQL Editor'de calistirin

-- Tablo olustur
CREATE TABLE IF NOT EXISTS public.industry_definitions (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    label TEXT NOT NULL,
    slug TEXT NOT NULL,
    category TEXT DEFAULT 'hizmet',
    icon TEXT DEFAULT 'Building',
    icon_url TEXT,
    color TEXT DEFAULT '#0071e3',
    description TEXT,
    status TEXT DEFAULT 'active',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    "order" INTEGER DEFAULT 0,
    modules TEXT[]
);

-- Varsayilan sektorleri ekle
INSERT INTO public.industry_definitions (id, label, slug, category, icon, color, description, status, "order", modules) VALUES
('fast-food', 'Fast Food & Restoran', 'fast-food', 'yeme_icme', 'Utensils', '#FF9500', 'Restoranlar, kafeler ve yeme-icme isletmeleri', 'active', 1, ARRAY['fastfood']),
('hotel', 'Otel & Konaklama', 'hotel', 'konaklama', 'Building', '#007AFF', 'Oteller, pansiyonlar ve konaklama tesisleri', 'active', 2, ARRAY['hotel']),
('beauty', 'Guzellik & Kuafor', 'beauty', 'saglik', 'Scissors', '#AF52DE', 'Kuaforler, guzellik salonlari ve spa merkezleri', 'active', 3, ARRAY['appointment']),
('ecommerce', 'E-Ticaret', 'ecommerce', 'perakende', 'ShoppingBag', '#34C759', 'Online magazalar ve e-ticaret siteleri', 'active', 4, ARRAY['ecommerce']),
('emlak', 'Emlak & Gayrimenkul', 'emlak', 'hizmet', 'Home', '#FF3B30', 'Emlak ofisleri ve gayrimenkul danismanligi', 'active', 5, ARRAY['emlak']),
('clinic', 'Klinik & Saglik', 'clinic', 'saglik', 'Stethoscope', '#5856D6', 'Klinikler, hastaneler ve saglik merkezleri', 'active', 6, ARRAY['appointment'])
ON CONFLICT (id) DO NOTHING;
