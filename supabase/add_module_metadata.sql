-- Migration: Business tablosuna modül metadata ekle
-- Bu migration ile her işletmenin hangi modül kullandığı netleşecek

-- =====================================================
-- ADIM 1: Mevcut işletmeleri analiz et
-- =====================================================

-- Hangi işletmelerin ff_ tablolarında verisi var?
SELECT 
    b.id,
    b.name,
    b.industry_label,
    COUNT(p.id) as ff_product_count
FROM businesses b
LEFT JOIN ff_products p ON p.business_id = b.id
WHERE p.id IS NOT NULL
GROUP BY b.id, b.name, b.industry_label

UNION ALL

-- Hangi işletmelerin fb_ tablolarında verisi var?
SELECT 
    b.id,
    b.name,
    b.industry_label,
    COUNT(p.id) as fb_product_count
FROM businesses b
LEFT JOIN fb_products p ON p.business_id = b.id
WHERE p.id IS NOT NULL
GROUP BY b.id, b.name, b.industry_label;

-- =====================================================
-- ADIM 2: Business tablosuna active_module alanı ekle
-- =====================================================

ALTER TABLE businesses ADD COLUMN IF NOT EXISTS active_module text;
CREATE INDEX IF NOT EXISTS businesses_active_module_idx ON businesses (active_module);

-- =====================================================
-- ADIM 3: Mevcut veriye göre active_module ata
-- =====================================================

-- ff_products tablosunda veri olan işletmelere 'fastfood' ata
UPDATE businesses b
SET active_module = 'fastfood'
WHERE b.id IN (
    SELECT DISTINCT business_id FROM ff_products
)
AND (b.active_module IS NULL OR b.active_module = '');

-- fb_products tablosunda veri olan işletmelere 'restaurant' ata
UPDATE businesses b
SET active_module = 'restaurant'
WHERE b.id IN (
    SELECT DISTINCT business_id FROM fb_products
)
AND b.id NOT IN (
    SELECT DISTINCT business_id FROM ff_products
)
AND (b.active_module IS NULL OR b.active_module = '');

-- =====================================================
-- ADIM 4: Sonuç doğrulama
-- =====================================================

-- Her modülde kaç işletme var?
SELECT 
    active_module,
    COUNT(*) as isletme_sayisi
FROM businesses
WHERE active_module IS NOT NULL
GROUP BY active_module

UNION ALL

-- active_module atanmamış işletmeler
SELECT 
    'UNASSIGNED' as active_module,
    COUNT(*) as isletme_sayisi
FROM businesses
WHERE active_module IS NULL;

-- =====================================================
-- ADIM 5: İşletme detayları
-- =====================================================

-- Her işletmenin modülü ve veri sayısı
SELECT 
    b.id,
    b.name,
    b.industry_label,
    b.active_module,
    (SELECT COUNT(*) FROM ff_products WHERE business_id = b.id) as ff_products_count,
    (SELECT COUNT(*) FROM fb_products WHERE business_id = b.id) as fb_products_count,
    CASE 
        WHEN b.active_module = 'fastfood' THEN 'DOGRU'
        WHEN b.active_module = 'restaurant' THEN 'DOGRU'
        WHEN (SELECT COUNT(*) FROM ff_products WHERE business_id = b.id) > 0 
             AND (SELECT COUNT(*) FROM fb_products WHERE business_id = b.id) > 0 THEN 'BIRLESİK - DÜZELTİLMELİ'
        WHEN b.active_module IS NULL THEN 'ATANMAMIŞ - DÜZELTİLMELİ'
        ELSE 'BILINMIYOR'
    END as durum
FROM businesses b
ORDER BY b.created_at DESC;
