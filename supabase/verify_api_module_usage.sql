-- Verification Script: API Modül Kullanım Doğrulama
-- Bu script hangi API'nin hangi tabloları kullandığını gösterir

-- =====================================================
-- MEVCUT TABLO KULLANIMI ANALIZI
-- =====================================================

-- FastFood Modülü API'leri hangi tabloları kullanıyor?
-- API dosyaları:
--   - fastfood/public-menu/route.ts (ff_categories, ff_products, ff_settings, fb_tables)
--   - fastfood/orders/route.ts (ff_orders, ff_coupons)
--   - fastfood/categories/route.ts (ff_categories)
--   - fastfood/products/route.ts (ff_products)
--   - fastfood/coupons/route.ts (ff_coupons)

-- Restaurant Modülü API'leri hangi tabloları kullanıyor?
-- API dosyaları:
--   - restaurant/public-menu/route.ts (fb_categories, fb_products, fb_settings)
--   - restaurant/public-events/route.ts

-- =====================================================
-- ADIM 1: FastFood API'leri için tablo doğrulama
-- =====================================================

-- FastFood API'leri şu tabloları kullanmalı:
SELECT 
    'ff_categories' as tablo,
    'FastFood API' as kullanici_modul,
    'KATEGORILER' as tablo_turu
UNION ALL
SELECT 
    'ff_products' as tablo,
    'FastFood API' as kullanici_modul,
    'URUNLER' as tablo_turu
UNION ALL
SELECT 
    'ff_settings' as tablo,
    'FastFood API' as kullanici_modul,
    'AYARLAR' as tablo_turu
UNION ALL
SELECT 
    'ff_orders' as tablo,
    'FastFood API' as kullanici_modul,
    'SIPARISLER' as tablo_turu
UNION ALL
SELECT 
    'ff_coupons' as tablo,
    'FastFood API' as kullanici_modul,
    'KUPONLAR' as tablo_turu
UNION ALL
SELECT 
    'fb_tables' as tablo,
    'FastFood API' as kullanici_modul,
    'MASALAR (FastFood API kullanıyor ama RESTAURANT tablosu!)' as tablo_turu;

-- =====================================================
-- ADIM 2: Restaurant API'leri için tablo doğrulama
-- =====================================================

-- Restaurant API'leri şu tabloları kullanmalı:
SELECT 
    'fb_categories' as tablo,
    'Restaurant API' as kullanici_modul,
    'KATEGORILER' as tablo_turu
UNION ALL
SELECT 
    'fb_products' as tablo,
    'Restaurant API' as kullanici_modul,
    'URUNLER' as tablo_turu
UNION ALL
SELECT 
    'fb_settings' as tablo,
    'Restaurant API' as kullanici_modul,
    'AYARLAR' as tablo_turu;

-- =====================================================
-- ADIM 3: Sorunlu işletmeleri tespit et
-- =====================================================

-- Hem ff_ hem fb_ tablolarında verisi olan işletmeler (BIRLESIK KULLANIM!)
SELECT 
    b.id,
    b.name,
    b.industry_label,
    (SELECT COUNT(*) FROM ff_products WHERE business_id = b.id) as ff_products_count,
    (SELECT COUNT(*) FROM fb_products WHERE business_id = b.id) as fb_products_count,
    CASE 
        WHEN (SELECT COUNT(*) FROM ff_products WHERE business_id = b.id) > 0 
             AND (SELECT COUNT(*) FROM fb_products WHERE business_id = b.id) > 0 
        THEN 'BIRLESIK KULLANIM - DÜZELTILMELI!'
        WHEN (SELECT COUNT(*) FROM ff_products WHERE business_id = b.id) > 0 
        THEN 'FASTFOOD MODULU'
        WHEN (SELECT COUNT(*) FROM fb_products WHERE business_id = b.id) > 0 
        THEN 'RESTAURANT MODULU'
        ELSE 'VERI YOK'
    END as durum
FROM businesses b
WHERE (SELECT COUNT(*) FROM ff_products WHERE business_id = b.id) > 0
   OR (SELECT COUNT(*) FROM fb_products WHERE business_id = b.id) > 0
ORDER BY b.created_at DESC;

-- =====================================================
-- ADIM 4: Her modülde kaç işletme var?
-- =====================================================

SELECT 
    'FASTFOOD' as modul,
    COUNT(DISTINCT b.id) as isletme_sayisi
FROM businesses b
INNER JOIN ff_products p ON p.business_id = b.id

UNION ALL

SELECT 
    'RESTAURANT' as modul,
    COUNT(DISTINCT b.id) as isletme_sayisi
FROM businesses b
INNER JOIN fb_products p ON p.business_id = b.id

UNION ALL

SELECT 
    'BIRLESIK' as modul,
    COUNT(DISTINCT b.id) as isletme_sayisi
FROM businesses b
INNER JOIN ff_products p ON p.business_id = b.id
INNER JOIN fb_products p2 ON p2.business_id = b.id;

-- =====================================================
-- ADIM 5: fastfood/public-menu/route.ts'deki fb_tables kullanımı
-- =====================================================

-- Bu dosya FastFood API'si ama fb_tables kullanıyor!
-- fastfood/public-menu/route.ts satır 47-51
-- SORUN: FastFood API'si Restaurant tablosu kullanıyor!

-- fb_tables tablosunda hangi işletmelerin verisi var?
SELECT 
    b.id,
    b.name,
    b.industry_label,
    COUNT(t.id) as masa_sayisi,
    CASE 
        WHEN b.industry_label = 'Fast Food' THEN 'DOGRU'
        WHEN b.industry_label = 'Restoran' THEN 'DOGRU'
        ELSE 'INDUSTRY YANLIS?'
    END as durum
FROM businesses b
INNER JOIN fb_tables t ON t.business_id = b.id
GROUP BY b.id, b.name, b.industry_label
ORDER BY masa_sayisi DESC;
