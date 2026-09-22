CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE TABLE IF NOT EXISTS discovery_categories (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_id uuid REFERENCES discovery_categories(id) ON DELETE RESTRICT,
    slug text NOT NULL UNIQUE,
    label text NOT NULL,
    description text,
    icon_name text,
    image_url text,
    search_terms text[] NOT NULL DEFAULT '{}'::text[],
    sort_order integer NOT NULL DEFAULT 0,
    status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
    CHECK (parent_id IS NULL OR parent_id <> id)
);

CREATE INDEX IF NOT EXISTS idx_discovery_categories_parent_sort
    ON discovery_categories (parent_id, sort_order, label)
    WHERE status = 'active';

CREATE OR REPLACE FUNCTION assert_discovery_category_depth()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    parent_parent_id uuid;
BEGIN
    IF NEW.parent_id IS NULL THEN
        RETURN NEW;
    END IF;

    SELECT parent_id INTO parent_parent_id
    FROM discovery_categories
    WHERE id = NEW.parent_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Discovery category parent does not exist';
    END IF;

    IF parent_parent_id IS NOT NULL THEN
        RAISE EXCEPTION 'Discovery taxonomy supports exactly two levels';
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_discovery_category_depth ON discovery_categories;
CREATE TRIGGER trg_discovery_category_depth
    BEFORE INSERT OR UPDATE OF parent_id ON discovery_categories
    FOR EACH ROW EXECUTE FUNCTION assert_discovery_category_depth();

CREATE TABLE IF NOT EXISTS business_discovery_categories (
    business_id text NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    category_id uuid NOT NULL REFERENCES discovery_categories(id) ON DELETE RESTRICT,
    is_primary boolean NOT NULL DEFAULT false,
    source text NOT NULL DEFAULT 'legacy' CHECK (source IN ('legacy', 'google_places', 'admin', 'business')),
    confidence numeric(4, 3) NOT NULL DEFAULT 1 CHECK (confidence BETWEEN 0 AND 1),
    review_status text NOT NULL DEFAULT 'auto' CHECK (review_status IN ('auto', 'needs_review', 'verified')),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (business_id, category_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_business_discovery_categories_one_primary
    ON business_discovery_categories (business_id)
    WHERE is_primary = true;

CREATE INDEX IF NOT EXISTS idx_business_discovery_categories_category_business
    ON business_discovery_categories (category_id, business_id);

CREATE INDEX IF NOT EXISTS idx_business_discovery_categories_review
    ON business_discovery_categories (review_status, category_id)
    WHERE review_status = 'needs_review';

CREATE OR REPLACE FUNCTION assert_business_discovery_category_leaf()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    category_parent_id uuid;
    category_status text;
BEGIN
    SELECT parent_id, status INTO category_parent_id, category_status
    FROM discovery_categories
    WHERE id = NEW.category_id;

    IF category_parent_id IS NULL THEN
        RAISE EXCEPTION 'Businesses can only be assigned to child discovery categories';
    END IF;

    IF category_status <> 'active' THEN
        RAISE EXCEPTION 'Businesses cannot be assigned to inactive discovery categories';
    END IF;

    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION assert_business_discovery_category_limit()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    assigned_count integer;
BEGIN
    IF TG_OP = 'INSERT' THEN
        SELECT count(*) INTO assigned_count
        FROM business_discovery_categories
        WHERE business_id = NEW.business_id;
    ELSE
        SELECT count(*) INTO assigned_count
        FROM business_discovery_categories
        WHERE business_id = NEW.business_id
          AND NOT (business_id = OLD.business_id AND category_id = OLD.category_id);
    END IF;

    IF assigned_count >= 4 THEN
        RAISE EXCEPTION 'A business can have one primary and at most three secondary discovery categories';
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_business_discovery_category_leaf ON business_discovery_categories;
CREATE TRIGGER trg_business_discovery_category_leaf
    BEFORE INSERT OR UPDATE OF category_id ON business_discovery_categories
    FOR EACH ROW EXECUTE FUNCTION assert_business_discovery_category_leaf();

DROP TRIGGER IF EXISTS trg_business_discovery_category_limit ON business_discovery_categories;
CREATE TRIGGER trg_business_discovery_category_limit
    BEFORE INSERT OR UPDATE OF business_id, category_id ON business_discovery_categories
    FOR EACH ROW EXECUTE FUNCTION assert_business_discovery_category_limit();

CREATE TABLE IF NOT EXISTS discovery_category_aliases (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id uuid NOT NULL REFERENCES discovery_categories(id) ON DELETE CASCADE,
    provider text NOT NULL CHECK (provider IN ('google_places', 'manual', 'search')),
    alias text NOT NULL,
    locale text NOT NULL DEFAULT 'tr-TR',
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (provider, locale, alias)
);

CREATE INDEX IF NOT EXISTS idx_discovery_category_aliases_category
    ON discovery_category_aliases (category_id);

CREATE TABLE IF NOT EXISTS category_featured_slots (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    city text NOT NULL,
    child_category_id uuid NOT NULL REFERENCES discovery_categories(id) ON DELETE RESTRICT,
    position smallint NOT NULL CHECK (position BETWEEN 1 AND 5),
    business_id text NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    starts_at timestamptz NOT NULL,
    ends_at timestamptz NOT NULL,
    status text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'active', 'paused', 'cancelled')),
    created_by text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CHECK (ends_at > starts_at)
);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'category_featured_slots_no_position_overlap'
    ) THEN
        ALTER TABLE category_featured_slots
            ADD CONSTRAINT category_featured_slots_no_position_overlap
            EXCLUDE USING gist (
                city WITH =,
                child_category_id WITH =,
                position WITH =,
                tstzrange(starts_at, ends_at, '[)') WITH &&
            ) WHERE (status IN ('scheduled', 'active'));
    END IF;
END;
$$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_category_featured_slots_business_period
    ON category_featured_slots (lower(city), child_category_id, business_id, starts_at, ends_at)
    WHERE status IN ('scheduled', 'active');

CREATE INDEX IF NOT EXISTS idx_category_featured_slots_public_lookup
    ON category_featured_slots (lower(city), child_category_id, position, starts_at, ends_at)
    WHERE status IN ('scheduled', 'active');

CREATE TABLE IF NOT EXISTS category_featured_slot_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    slot_id uuid REFERENCES category_featured_slots(id) ON DELETE SET NULL,
    action text NOT NULL CHECK (action IN ('created', 'updated', 'paused', 'cancelled', 'deleted')),
    actor_id text,
    before_state jsonb,
    after_state jsonb,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_category_featured_slot_events_slot_created
    ON category_featured_slot_events (slot_id, created_at DESC);

INSERT INTO discovery_categories (slug, label, sort_order, search_terms)
VALUES
    ('yeme-icme', 'Yeme & İçme', 10, ARRAY['yemek', 'içecek']),
    ('saglik', 'Sağlık', 20, ARRAY['sağlık']),
    ('guzellik-bakim', 'Güzellik & Bakım', 30, ARRAY['güzellik', 'bakım']),
    ('evcil-hayvanlar', 'Evcil Hayvanlar', 40, ARRAY['pet', 'hayvan']),
    ('alisveris-perakende', 'Alışveriş & Perakende', 50, ARRAY['alışveriş', 'mağaza']),
    ('otomotiv', 'Otomotiv', 60, ARRAY['oto', 'araç']),
    ('ev-gayrimenkul', 'Ev & Gayrimenkul', 70, ARRAY['ev', 'emlak']),
    ('konaklama-turizm', 'Konaklama & Turizm', 80, ARRAY['otel', 'tatil']),
    ('egitim', 'Eğitim', 90, ARRAY['okul', 'kurs']),
    ('profesyonel-hizmetler', 'Profesyonel Hizmetler', 100, ARRAY['hizmet']),
    ('ulasim-lojistik', 'Ulaşım & Lojistik', 110, ARRAY['ulaşım', 'kargo']),
    ('spor-eglence', 'Spor & Eğlence', 120, ARRAY['spor', 'eğlence'])
ON CONFLICT (slug) DO UPDATE SET
    label = EXCLUDED.label,
    sort_order = EXCLUDED.sort_order,
    search_terms = EXCLUDED.search_terms,
    updated_at = now();

WITH child_seed(parent_slug, slug, label, sort_order, search_terms) AS (
    VALUES
        ('yeme-icme', 'restoran', 'Restoran', 10, ARRAY['restoran']::text[]),
        ('yeme-icme', 'kafe-kahve', 'Kafe & Kahve', 20, ARRAY['kafe','cafe','kahve','coffee']::text[]),
        ('yeme-icme', 'fast-food', 'Fast Food', 30, ARRAY['fast food']::text[]),
        ('yeme-icme', 'burger', 'Burger', 40, ARRAY['hamburger']::text[]),
        ('yeme-icme', 'pizza', 'Pizza', 50, ARRAY['pizzacı']::text[]),
        ('yeme-icme', 'doner', 'Döner', 60, ARRAY['dönerci']::text[]),
        ('yeme-icme', 'firin', 'Fırın', 70, ARRAY['ekmek','unlu mamul']::text[]),
        ('yeme-icme', 'pastane', 'Pastane', 80, ARRAY['pasta']::text[]),
        ('yeme-icme', 'tatlici', 'Tatlıcı', 90, ARRAY['tatlı']::text[]),
        ('yeme-icme', 'dondurmaci', 'Dondurmacı', 100, ARRAY['dondurma']::text[]),
        ('yeme-icme', 'catering', 'Catering', 110, ARRAY['toplu yemek']::text[]),
        ('yeme-icme', 'bar-pub', 'Bar & Pub', 120, ARRAY['bar','pub']::text[]),
        ('yeme-icme', 'food-truck', 'Food Truck', 130, ARRAY['mobil yemek']::text[]),
        ('saglik', 'hastane', 'Hastane', 10, ARRAY['hastane']::text[]),
        ('saglik', 'tip-merkezi-klinik', 'Tıp Merkezi & Klinik', 20, ARRAY['klinik','tıp merkezi']::text[]),
        ('saglik', 'aile-sagligi-merkezi', 'Aile Sağlığı Merkezi', 30, ARRAY['asm','sağlık ocağı']::text[]),
        ('saglik', 'dis-hekimi', 'Diş Hekimi', 40, ARRAY['dişçi','dentist']::text[]),
        ('saglik', 'psikolog', 'Psikolog', 50, ARRAY['psikoloji']::text[]),
        ('saglik', 'diyetisyen', 'Diyetisyen', 60, ARRAY['beslenme']::text[]),
        ('saglik', 'fizyoterapist', 'Fizyoterapist', 70, ARRAY['fizik tedavi']::text[]),
        ('saglik', 'laboratuvar', 'Laboratuvar', 80, ARRAY['tahlil']::text[]),
        ('saglik', 'eczane', 'Eczane', 90, ARRAY['pharmacy']::text[]),
        ('saglik', 'optik', 'Optik', 100, ARRAY['gözlük']::text[]),
        ('guzellik-bakim', 'kadin-kuaforu', 'Kadın Kuaförü', 10, ARRAY['kuaför']::text[]),
        ('guzellik-bakim', 'erkek-kuaforu-berber', 'Erkek Kuaförü & Berber', 20, ARRAY['berber']::text[]),
        ('guzellik-bakim', 'guzellik-salonu', 'Güzellik Salonu', 30, ARRAY['güzellik']::text[]),
        ('guzellik-bakim', 'spa-masaj', 'Spa & Masaj', 40, ARRAY['spa','masaj']::text[]),
        ('guzellik-bakim', 'tirnak-bakimi', 'Tırnak Bakımı', 50, ARRAY['nail art','manikür']::text[]),
        ('guzellik-bakim', 'dovme-piercing', 'Dövme & Piercing', 60, ARRAY['tattoo']::text[]),
        ('evcil-hayvanlar', 'veteriner', 'Veteriner', 10, ARRAY['veteriner']::text[]),
        ('evcil-hayvanlar', 'petshop', 'Petshop', 20, ARRAY['pet shop']::text[]),
        ('evcil-hayvanlar', 'pet-kuaforu', 'Pet Kuaförü', 30, ARRAY['hayvan kuaförü']::text[]),
        ('evcil-hayvanlar', 'pet-oteli', 'Pet Oteli', 40, ARRAY['hayvan oteli']::text[]),
        ('alisveris-perakende', 'market-bakkal', 'Market & Bakkal', 10, ARRAY['market','bakkal']::text[]),
        ('alisveris-perakende', 'giyim-butik', 'Giyim & Butik', 20, ARRAY['giyim','butik']::text[]),
        ('alisveris-perakende', 'ayakkabi', 'Ayakkabı', 30, ARRAY['ayakkabıcı']::text[]),
        ('alisveris-perakende', 'elektronik', 'Elektronik', 40, ARRAY['elektronik']::text[]),
        ('alisveris-perakende', 'telefon', 'Telefon', 50, ARRAY['cep telefonu']::text[]),
        ('alisveris-perakende', 'bilgisayar', 'Bilgisayar', 60, ARRAY['computer']::text[]),
        ('alisveris-perakende', 'mobilya', 'Mobilya', 70, ARRAY['mobilyacı']::text[]),
        ('alisveris-perakende', 'ev-dekorasyonu', 'Ev Dekorasyonu', 80, ARRAY['dekorasyon']::text[]),
        ('alisveris-perakende', 'cicekci', 'Çiçekçi', 90, ARRAY['çiçek']::text[]),
        ('alisveris-perakende', 'kirtasiye-kitapci', 'Kırtasiye & Kitapçı', 100, ARRAY['kırtasiye','kitapçı']::text[]),
        ('alisveris-perakende', 'hediyelik-esya', 'Hediyelik Eşya', 110, ARRAY['hediye']::text[]),
        ('alisveris-perakende', 'kuyumcu-saatci', 'Kuyumcu & Saatçi', 120, ARRAY['kuyumcu','saatçi']::text[]),
        ('alisveris-perakende', 'yapi-market', 'Yapı Market', 130, ARRAY['inşaat malzemesi']::text[]),
        ('alisveris-perakende', 'e-ticaret', 'E-Ticaret', 140, ARRAY['online mağaza']::text[]),
        ('otomotiv', 'oto-galeri', 'Oto Galeri', 10, ARRAY['otomobil galerisi']::text[]),
        ('otomotiv', 'oto-servis', 'Oto Servis', 20, ARRAY['servis']::text[]),
        ('otomotiv', 'oto-bakim', 'Oto Bakım', 30, ARRAY['bakım']::text[]),
        ('otomotiv', 'lastikci', 'Lastikçi', 40, ARRAY['lastik']::text[]),
        ('otomotiv', 'oto-yikama', 'Oto Yıkama', 50, ARRAY['araç yıkama']::text[]),
        ('otomotiv', 'detayli-temizlik', 'Detaylı Temizlik', 60, ARRAY['detailing']::text[]),
        ('otomotiv', 'arac-kiralama', 'Araç Kiralama', 70, ARRAY['rent a car']::text[]),
        ('otomotiv', 'akaryakit-istasyonu', 'Akaryakıt İstasyonu', 80, ARRAY['benzinlik']::text[]),
        ('otomotiv', 'otopark', 'Otopark', 90, ARRAY['parking']::text[]),
        ('ev-gayrimenkul', 'emlak-ofisi', 'Emlak Ofisi', 10, ARRAY['emlak']::text[]),
        ('ev-gayrimenkul', 'insaat-firmasi', 'İnşaat Firması', 20, ARRAY['inşaat']::text[]),
        ('ev-gayrimenkul', 'mimar', 'Mimar', 30, ARRAY['mimarlık']::text[]),
        ('ev-gayrimenkul', 'ic-mimar', 'İç Mimar', 40, ARRAY['iç mimarlık']::text[]),
        ('ev-gayrimenkul', 'tadilat-dekorasyon', 'Tadilat & Dekorasyon', 50, ARRAY['tadilat']::text[]),
        ('konaklama-turizm', 'otel', 'Otel', 10, ARRAY['hotel']::text[]),
        ('konaklama-turizm', 'pansiyon', 'Pansiyon', 20, ARRAY['pansiyon']::text[]),
        ('konaklama-turizm', 'hostel', 'Hostel', 30, ARRAY['hostel']::text[]),
        ('konaklama-turizm', 'apart-otel', 'Apart Otel', 40, ARRAY['apart']::text[]),
        ('konaklama-turizm', 'villa-kiralama', 'Villa Kiralama', 50, ARRAY['villa']::text[]),
        ('konaklama-turizm', 'kamp-alani', 'Kamp Alanı', 60, ARRAY['kamp']::text[]),
        ('konaklama-turizm', 'tatil-koyu', 'Tatil Köyü', 70, ARRAY['resort']::text[]),
        ('konaklama-turizm', 'seyahat-acentasi', 'Seyahat Acentası', 80, ARRAY['tur','seyahat']::text[]),
        ('egitim', 'ozel-okul', 'Özel Okul', 10, ARRAY['okul']::text[]),
        ('egitim', 'kres-anaokulu', 'Kreş & Anaokulu', 20, ARRAY['kreş','anaokulu']::text[]),
        ('egitim', 'ozel-ders', 'Özel Ders', 30, ARRAY['özel ders']::text[]),
        ('egitim', 'dil-kursu', 'Dil Kursu', 40, ARRAY['yabancı dil']::text[]),
        ('egitim', 'surucu-kursu', 'Sürücü Kursu', 50, ARRAY['ehliyet']::text[]),
        ('egitim', 'meslek-kursu', 'Meslek Kursu', 60, ARRAY['kurs']::text[]),
        ('egitim', 'etut-merkezi', 'Etüt Merkezi', 70, ARRAY['etüt']::text[]),
        ('profesyonel-hizmetler', 'avukat', 'Avukat', 10, ARRAY['hukuk']::text[]),
        ('profesyonel-hizmetler', 'muhasebeci', 'Muhasebeci', 20, ARRAY['mali müşavir']::text[]),
        ('profesyonel-hizmetler', 'danismanlik', 'Danışmanlık', 30, ARRAY['danışman']::text[]),
        ('profesyonel-hizmetler', 'fotografci-produksiyon', 'Fotoğrafçı & Prodüksiyon', 40, ARRAY['fotoğraf']::text[]),
        ('profesyonel-hizmetler', 'dugun-salonu', 'Düğün Salonu', 50, ARRAY['düğün salonu']::text[]),
        ('profesyonel-hizmetler', 'dugun-organizasyon', 'Düğün & Organizasyon', 60, ARRAY['organizasyon']::text[]),
        ('profesyonel-hizmetler', 'temizlik-hizmeti', 'Temizlik Hizmeti', 70, ARRAY['temizlik']::text[]),
        ('profesyonel-hizmetler', 'camasirhane', 'Çamaşırhane', 80, ARRAY['çamaşır']::text[]),
        ('profesyonel-hizmetler', 'kuru-temizleme', 'Kuru Temizleme', 90, ARRAY['kuru temizleme']::text[]),
        ('profesyonel-hizmetler', 'teknik-servis', 'Teknik Servis', 100, ARRAY['tamir']::text[]),
        ('profesyonel-hizmetler', 'terzi', 'Terzi', 110, ARRAY['terzi']::text[]),
        ('ulasim-lojistik', 'taksi-duragi', 'Taksi Durağı', 10, ARRAY['taksi']::text[]),
        ('ulasim-lojistik', 'kargo', 'Kargo', 20, ARRAY['kargo']::text[]),
        ('ulasim-lojistik', 'kurye', 'Kurye', 30, ARRAY['kurye']::text[]),
        ('ulasim-lojistik', 'lojistik', 'Lojistik', 40, ARRAY['nakliye']::text[]),
        ('spor-eglence', 'spor-salonu-fitness', 'Spor Salonu & Fitness', 10, ARRAY['fitness','spor salonu']::text[]),
        ('spor-eglence', 'pilates-yoga', 'Pilates & Yoga', 20, ARRAY['pilates','yoga']::text[]),
        ('spor-eglence', 'sinema', 'Sinema', 30, ARRAY['sinema']::text[]),
        ('spor-eglence', 'oyun-salonu', 'Oyun Salonu', 40, ARRAY['oyun']::text[]),
        ('spor-eglence', 'bowling', 'Bowling', 50, ARRAY['bowling']::text[]),
        ('spor-eglence', 'konser-etkinlik', 'Konser & Etkinlik', 60, ARRAY['konser','etkinlik']::text[]),
        ('spor-eglence', 'kacis-odasi', 'Kaçış Odası', 70, ARRAY['escape room']::text[])
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

WITH alias_seed(child_slug, provider, alias) AS (
    VALUES
        ('kafe-kahve', 'google_places', 'cafe'),
        ('kafe-kahve', 'google_places', 'coffee_shop'),
        ('kafe-kahve', 'search', 'kahve'),
        ('kafe-kahve', 'search', 'kafe'),
        ('dis-hekimi', 'google_places', 'dentist'),
        ('psikolog', 'google_places', 'psychologist'),
        ('diyetisyen', 'google_places', 'nutritionist'),
        ('eczane', 'google_places', 'pharmacy'),
        ('veteriner', 'google_places', 'veterinary_care'),
        ('burger', 'search', 'hamburger'),
        ('arac-kiralama', 'google_places', 'car_rental'),
        ('oto-galeri', 'google_places', 'car_dealer')
)
INSERT INTO discovery_category_aliases (category_id, provider, alias)
SELECT category.id, seed.provider, seed.alias
FROM alias_seed seed
JOIN discovery_categories category ON category.slug = seed.child_slug
ON CONFLICT (provider, locale, alias) DO NOTHING;

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
        ('eczane', 'eczane', 'verified'),
        ('pharmacy', 'eczane', 'verified'),
        ('hastane', 'hastane', 'verified'),
        ('hospital', 'hastane', 'verified'),
        ('veteriner', 'veteriner', 'verified'),
        ('petshop', 'petshop', 'verified'),
        ('oto_galeri', 'oto-galeri', 'verified'),
        ('arac_kiralama', 'arac-kiralama', 'verified'),
        ('rental', 'arac-kiralama', 'verified'),
        ('taksi_duraklari', 'taksi-duragi', 'verified'),
        ('taxi', 'taksi-duragi', 'verified'),
        ('spor_salonu_fitness', 'spor-salonu-fitness', 'verified'),
        ('fotografci_produksiyon', 'fotografci-produksiyon', 'verified'),
        ('klinik_saglik', 'tip-merkezi-klinik', 'needs_review'),
        ('otel_konaklama', 'otel', 'needs_review'),
        ('emlak_gayrimenkul', 'emlak-ofisi', 'needs_review'),
        ('guzellik_kuafor', 'guzellik-salonu', 'needs_review'),
        ('elektronik_telefon_bilgisayar', 'elektronik', 'needs_review')
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
    ORDER BY business.id, mapping.review_status DESC
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
    business_id,
    category_id,
    true,
    'legacy',
    CASE WHEN review_status = 'verified' THEN 1 ELSE 0.6 END,
    review_status
FROM ranked_matches
ON CONFLICT (business_id, category_id) DO NOTHING;

COMMENT ON TABLE discovery_categories IS
    'Two-level user-facing discovery taxonomy, separate from operational modules and packages.';

COMMENT ON TABLE category_featured_slots IS
    'Time-bounded sellable positions 1-5 for one city and child discovery category.';
