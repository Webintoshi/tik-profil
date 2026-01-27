-- Migration Script: ALAZ RESTORAN ff_ → fb_ tablolarına taşıma
-- Business ID: 23ZU6GH1B3XZrLxA8V6p

-- =====================================================
-- ADIM 1: Mevcut verileri kontrol et
-- =====================================================

-- ff_products tablosunda ALAZ RESTORAN verileri
SELECT 
    'ff_products' as tablo,
    COUNT(*) as kayit_sayisi
FROM ff_products 
WHERE business_id = '23ZU6GH1B3XZrLxA8V6p'

UNION ALL

-- ff_categories tablosunda ALAZ RESTORAN verileri
SELECT 
    'ff_categories' as tablo,
    COUNT(*) as kayit_sayisi
FROM ff_categories 
WHERE business_id = '23ZU6GH1B3XZrLxA8V6p'

UNION ALL

-- ff_settings tablosunda ALAZ RESTORAN verileri
SELECT 
    'ff_settings' as tablo,
    COUNT(*) as kayit_sayisi
FROM ff_settings 
WHERE business_id = '23ZU6GH1B3XZrLxA8V6p';

-- =====================================================
-- ADIM 2: Categories'leri fb_categories tablosuna taşı
-- =====================================================

INSERT INTO fb_categories (
    id,
    business_id,
    name,
    name_en,
    icon,
    image,
    sort_order,
    created_at,
    updated_at
)
SELECT 
    id,
    business_id,
    name,
    COALESCE(name_en, name) as name_en,
    icon,
    image_url as image,
    sort_order,
    created_at,
    updated_at
FROM ff_categories 
WHERE business_id = '23ZU6GH1B3XZrLxA8V6p'
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- ADIM 3: Products'leri fb_products tablosuna taşı
-- =====================================================

INSERT INTO fb_products (
    id,
    business_id,
    category_id,
    name,
    name_en,
    description,
    description_en,
    price,
    image,
    in_stock,
    sort_order,
    created_at,
    updated_at
)
SELECT 
    id,
    business_id,
    category_id,
    name,
    COALESCE(name_en, name) as name_en,
    description,
    COALESCE(description_en, description) as description_en,
    price,
    image_url as image,
    in_stock,
    sort_order,
    created_at,
    updated_at
FROM ff_products 
WHERE business_id = '23ZU6GH1B3XZrLxA8V6p'
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- ADIM 4: Settings'leri fb_settings tablosuna taşı
-- =====================================================

INSERT INTO fb_settings (
    business_id,
    cart_enabled,
    whatsapp_order_enabled,
    call_waiter_enabled,
    style_id,
    accent_color_id,
    show_avatar,
    waiter_call_enabled,
    wifi_password,
    created_at,
    updated_at
)
SELECT 
    business_id,
    cart_enabled,
    whatsapp_order_enabled,
    call_waiter_enabled,
    style_id,
    accent_color_id,
    show_avatar,
    waiter_call_enabled,
    wifi_password,
    created_at,
    updated_at
FROM ff_settings 
WHERE business_id = '23ZU6GH1B3XZrLxA8V6p'
ON CONFLICT (business_id) DO NOTHING;

-- =====================================================
-- ADım 5: Taşıma sonrası doğrulama
-- =====================================================

-- fb_products tablosunda ALAZ RESTORAN verileri (kopyalanmış mı?)
SELECT 
    'fb_products' as tablo,
    COUNT(*) as kayit_sayisi
FROM fb_products 
WHERE business_id = '23ZU6GH1B3XZrLxA8V6p'

UNION ALL

-- fb_categories tablosunda ALAZ RESTORAN verileri (kopyalanmış mı?)
SELECT 
    'fb_categories' as tablo,
    COUNT(*) as kayit_sayisi
FROM fb_categories 
WHERE business_id = '23ZU6GH1B3XZrLxA8V6p'

UNION ALL

-- fb_settings tablosunda ALAZ RESTORAN verileri (kopyalanmış mı?)
SELECT 
    'fb_settings' as tablo,
    COUNT(*) as kayit_sayisi
FROM fb_settings 
WHERE business_id = '23ZU6GH1B3XZrLxA8V6p';

-- =====================================================
-- ADIM 6: ff_ tablolarından ALAZ RESTORAN verilerini temizle
-- (ÖNCE ADIM 5 DOĞRULAMASINI YAPIN!)
-- =====================================================

-- ADIM 6.1: ff_products tablosundan temizle
-- DELETE FROM ff_products 
-- WHERE business_id = '23ZU6GH1B3XZrLxA8V6p';

-- ADIM 6.2: ff_categories tablosundan temizle
-- DELETE FROM ff_categories 
-- WHERE business_id = '23ZU6GH1B3XZrLxA8V6p';

-- ADIM 6.3: ff_settings tablosundan temizle
-- DELETE FROM ff_settings 
-- WHERE business_id = '23ZU6GH1B3XZrLxA8V6p';

-- =====================================================
-- ADIM 7: Final doğrulama (temizlik sonrası)
-- =====================================================

-- ff_products tablosunda kalan ALAZ RESTORAN verileri (temizlendi mi?)
SELECT 
    'ff_products' as tablo,
    COUNT(*) as kalan_kayit
FROM ff_products 
WHERE business_id = '23ZU6GH1B3XZrLxA8V6p'

UNION ALL

-- ff_categories tablosunda kalan ALAZ RESTORAN verileri (temizlendi mi?)
SELECT 
    'ff_categories' as tablo,
    COUNT(*) as kalan_kayit
FROM ff_categories 
WHERE business_id = '23ZU6GH1B3XZrLxA8V6p'

UNION ALL

-- ff_settings tablosunda kalan ALAZ RESTORAN verileri (temizlendi mi?)
SELECT 
    'ff_settings' as tablo,
    COUNT(*) as kalan_kayit
FROM ff_settings 
WHERE business_id = '23ZU6GH1B3XZrLxA8V6p';
