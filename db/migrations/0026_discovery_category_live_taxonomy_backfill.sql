-- Align the public discovery taxonomy with the live imported category keys used by
-- the mobile app. This keeps legacy Google/import categories searchable while the
-- admin panel moves to sellable parent/child category pages.

WITH child_seed(parent_slug, slug, label, sort_order, search_terms) AS (
    VALUES
        ('yeme-icme', 'firin-pastane-tatli', 'Fırın, Pastane & Tatlı', 70, ARRAY['fırın','pastane','tatlı','unlu mamul']::text[]),
        ('guzellik-bakim', 'guzellik-kuafor', 'Güzellik & Kuaför', 10, ARRAY['güzellik','kuaför','berber','salon']::text[]),
        ('alisveris-perakende', 'giyim-ayakkabi-butik', 'Giyim, Ayakkabı & Butik', 20, ARRAY['giyim','ayakkabı','butik']::text[]),
        ('alisveris-perakende', 'elektronik-telefon-bilgisayar', 'Elektronik, Telefon & Bilgisayar', 30, ARRAY['elektronik','telefon','bilgisayar']::text[]),
        ('alisveris-perakende', 'mobilya-ev-dekorasyonu', 'Mobilya & Ev Dekorasyonu', 40, ARRAY['mobilya','ev dekorasyonu']::text[]),
        ('alisveris-perakende', 'cicekci-hediyelik-kirtasiye', 'Çiçekçi, Hediyelik & Kırtasiye', 50, ARRAY['çiçekçi','hediyelik','kırtasiye']::text[]),
        ('otomotiv', 'oto-servis-bakim-lastik', 'Oto Servis, Bakım & Lastik', 20, ARRAY['oto servis','bakım','lastik']::text[]),
        ('otomotiv', 'oto-yikama-detayli-temizlik', 'Oto Yıkama & Detaylı Temizlik', 30, ARRAY['oto yıkama','detaylı temizlik']::text[]),
        ('ev-gayrimenkul', 'yapi-market-insaat-malzemeleri', 'Yapı Market & İnşaat Malzemeleri', 20, ARRAY['yapı market','inşaat malzemeleri']::text[]),
        ('konaklama-turizm', 'otel-konaklama', 'Otel & Konaklama', 10, ARRAY['otel','konaklama','pansiyon','apart']::text[]),
        ('egitim', 'egitim-kurs-surucu-kursu', 'Eğitim, Kurs & Sürücü Kursu', 10, ARRAY['eğitim','kurs','sürücü kursu']::text[]),
        ('profesyonel-hizmetler', 'avukat-muhasebe-danismanlik', 'Avukat, Muhasebe & Danışmanlık', 10, ARRAY['avukat','muhasebe','danışmanlık']::text[]),
        ('profesyonel-hizmetler', 'temizlik-camasirhane-kuru-temizleme', 'Temizlik, Çamaşırhane & Kuru Temizleme', 40, ARRAY['temizlik','çamaşırhane','kuru temizleme']::text[]),
        ('profesyonel-hizmetler', 'diger', 'Diğer', 999, ARRAY['diğer']::text[]),
        ('ulasim-lojistik', 'taksi-duraklari', 'Taksi Durakları', 10, ARRAY['taksi','taksi durağı']::text[]),
        ('ulasim-lojistik', 'kargo-kurye-lojistik', 'Kargo, Kurye & Lojistik', 20, ARRAY['kargo','kurye','lojistik','nakliye']::text[])
)
INSERT INTO discovery_categories (parent_id, slug, label, sort_order, search_terms)
SELECT parent.id, child.slug, child.label, child.sort_order, child.search_terms
FROM child_seed child
JOIN discovery_categories parent ON parent.slug = child.parent_slug
ON CONFLICT (slug) DO UPDATE SET
    parent_id = EXCLUDED.parent_id,
    label = EXCLUDED.label,
    sort_order = EXCLUDED.sort_order,
    search_terms = EXCLUDED.search_terms,
    updated_at = now();

WITH legacy_mapping(legacy_key, child_slug, review_status) AS (
    VALUES
        ('restoran', 'restoran', 'verified'),
        ('kafe_kahve', 'kafe-kahve', 'verified'),
        ('cafe', 'kafe-kahve', 'verified'),
        ('kahve_shop', 'kafe-kahve', 'verified'),
        ('fast_food', 'fast-food', 'verified'),
        ('fastfood', 'fast-food', 'verified'),
        ('burger', 'burger', 'verified'),
        ('pizza', 'pizza', 'verified'),
        ('doner', 'doner', 'verified'),
        ('firin_pastane_tatli', 'firin-pastane-tatli', 'verified'),
        ('eczane', 'eczane', 'verified'),
        ('pharmacy', 'eczane', 'verified'),
        ('klinik_saglik', 'tip-merkezi-klinik', 'needs_review'),
        ('hastane', 'hastane', 'verified'),
        ('hospital', 'hastane', 'verified'),
        ('veteriner', 'veteriner', 'verified'),
        ('petshop', 'petshop', 'verified'),
        ('guzellik_kuafor', 'guzellik-kuafor', 'needs_review'),
        ('market_bakkal', 'market-bakkal', 'verified'),
        ('giyim_ayakkabi_butik', 'giyim-ayakkabi-butik', 'needs_review'),
        ('elektronik_telefon_bilgisayar', 'elektronik-telefon-bilgisayar', 'needs_review'),
        ('mobilya_ev_dekorasyonu', 'mobilya-ev-dekorasyonu', 'needs_review'),
        ('cicekci_hediyelik_kirtasiye', 'cicekci-hediyelik-kirtasiye', 'needs_review'),
        ('kuyumcu_saatci', 'kuyumcu-saatci', 'needs_review'),
        ('e_ticaret', 'e-ticaret', 'verified'),
        ('oto_galeri', 'oto-galeri', 'verified'),
        ('oto_servis_bakim_lastik', 'oto-servis-bakim-lastik', 'needs_review'),
        ('oto_yikama_detayli_temizlik', 'oto-yikama-detayli-temizlik', 'needs_review'),
        ('arac_kiralama', 'arac-kiralama', 'verified'),
        ('rental', 'arac-kiralama', 'verified'),
        ('akaryakit_istasyonu', 'akaryakit-istasyonu', 'verified'),
        ('emlak_gayrimenkul', 'emlak-ofisi', 'verified'),
        ('emlak_ofisi', 'emlak-ofisi', 'verified'),
        ('yapi_market_insaat_malzemeleri', 'yapi-market-insaat-malzemeleri', 'needs_review'),
        ('otel_konaklama', 'otel-konaklama', 'verified'),
        ('egitim_kurs_surucu_kursu', 'egitim-kurs-surucu-kursu', 'needs_review'),
        ('avukat_muhasebe_danismanlik', 'avukat-muhasebe-danismanlik', 'needs_review'),
        ('fotografci_produksiyon', 'fotografci-produksiyon', 'verified'),
        ('dugun_salonu_organizasyon', 'dugun-organizasyon', 'needs_review'),
        ('temizlik_camasirhane_kuru_temizleme', 'temizlik-camasirhane-kuru-temizleme', 'needs_review'),
        ('taksi_duraklari', 'taksi-duraklari', 'verified'),
        ('taxi', 'taksi-duraklari', 'verified'),
        ('kargo_kurye_lojistik', 'kargo-kurye-lojistik', 'needs_review'),
        ('spor_salonu_fitness', 'spor-salonu-fitness', 'verified'),
        ('other', 'diger', 'needs_review'),
        ('diger', 'diger', 'needs_review')
), normalized_businesses AS (
    SELECT
        id,
        regexp_replace(
            translate(lower(coalesce(industry_id, industry_label, '')), 'çğıöşü', 'cgiosu'),
            '[^a-z0-9]+', '_', 'g'
        ) AS legacy_key
    FROM businesses
), ranked_matches AS (
    SELECT DISTINCT ON (business.id)
        business.id AS business_id,
        category.id AS category_id,
        mapping.review_status
    FROM normalized_businesses business
    JOIN legacy_mapping mapping ON mapping.legacy_key = trim(both '_' from business.legacy_key)
    JOIN discovery_categories category ON category.slug = mapping.child_slug
    ORDER BY business.id, CASE mapping.review_status WHEN 'verified' THEN 2 ELSE 1 END DESC
), removed_duplicate_targets AS (
    DELETE FROM business_discovery_categories assignment
    USING ranked_matches ranked
    WHERE assignment.business_id = ranked.business_id
      AND assignment.category_id = ranked.category_id
      AND assignment.is_primary = false
    RETURNING assignment.business_id
), updated_primary AS (
    UPDATE business_discovery_categories assignment
    SET
        category_id = ranked.category_id,
        source = 'legacy',
        confidence = CASE WHEN ranked.review_status = 'verified' THEN 1 ELSE 0.65 END,
        review_status = ranked.review_status,
        updated_at = now()
    FROM ranked_matches ranked
    WHERE assignment.business_id = ranked.business_id
      AND assignment.is_primary = true
    RETURNING assignment.business_id
)
INSERT INTO business_discovery_categories (
    business_id,
    category_id,
    is_primary,
    source,
    confidence,
    review_status
)
SELECT
    ranked.business_id,
    ranked.category_id,
    true,
    'legacy',
    CASE WHEN ranked.review_status = 'verified' THEN 1 ELSE 0.65 END,
    ranked.review_status
FROM ranked_matches ranked
WHERE NOT EXISTS (
    SELECT 1
    FROM updated_primary updated
    WHERE updated.business_id = ranked.business_id
)
ON CONFLICT (business_id, category_id) DO UPDATE SET
    is_primary = true,
    source = EXCLUDED.source,
    confidence = EXCLUDED.confidence,
    review_status = EXCLUDED.review_status,
    updated_at = now();
