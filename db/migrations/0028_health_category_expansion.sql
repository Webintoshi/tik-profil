-- Split the broad health inventory into useful medical subcategories while
-- keeping beauty-only salons outside the medical aesthetics directory.

WITH health_seed(parent_slug, slug, label, sort_order, search_terms) AS (
    VALUES
        ('saglik', 'hastane', 'Hastane', 10, ARRAY['hastane','hospital']::text[]),
        ('saglik', 'tip-merkezi-klinik', 'Tıp Merkezi & Klinik', 20, ARRAY['klinik','tıp merkezi','poliklinik','muayenehane']::text[]),
        ('saglik', 'aile-sagligi-merkezi', 'Aile Sağlığı Merkezi', 30, ARRAY['aile sağlığı merkezi','aile sağlık merkezi','sağlık ocağı','toplum sağlığı merkezi','asm']::text[]),
        ('saglik', 'estetik-medikal', 'Estetik & Medikal', 40, ARRAY['medikal estetik','estetik kliniği','plastik cerrahi','saç ekimi','dermatoloji','botoks','dolgu']::text[]),
        ('saglik', 'eczane', 'Eczane', 50, ARRAY['eczane','pharmacy']::text[]),
        ('saglik', 'dis-hekimi', 'Diş Hekimi', 60, ARRAY['diş hekimi','ağız ve diş','dental','ortodonti']::text[]),
        ('saglik', 'psikolog', 'Psikolog', 70, ARRAY['psikolog','psikoloji','psikolojik danışmanlık','psikoterapi']::text[]),
        ('saglik', 'diyetisyen', 'Diyetisyen', 80, ARRAY['diyetisyen','beslenme','diyet']::text[]),
        ('saglik', 'fizyoterapist', 'Fizyoterapi', 90, ARRAY['fizyoterapi','fizyoterapist','fizik tedavi','rehabilitasyon']::text[]),
        ('saglik', 'laboratuvar', 'Laboratuvar', 100, ARRAY['laboratuvar','tıbbi tahlil','tahlil']::text[]),
        ('saglik', 'optik', 'Optik', 110, ARRAY['optik','optisyen','gözlük']::text[])
)
INSERT INTO discovery_categories (parent_id, slug, label, sort_order, search_terms, status)
SELECT parent.id, child.slug, child.label, child.sort_order, child.search_terms, 'active'
FROM health_seed child
JOIN discovery_categories parent ON parent.slug = child.parent_slug
ON CONFLICT (slug) DO UPDATE SET
    parent_id = EXCLUDED.parent_id,
    label = EXCLUDED.label,
    sort_order = EXCLUDED.sort_order,
    search_terms = EXCLUDED.search_terms,
    status = 'active',
    updated_at = now();

WITH health_aliases(slug, provider, alias) AS (
    VALUES
        ('hastane', 'google_places', 'hospital'),
        ('aile-sagligi-merkezi', 'search', 'aile sağlık merkezi'),
        ('aile-sagligi-merkezi', 'search', 'sağlık ocağı'),
        ('aile-sagligi-merkezi', 'search', 'toplum sağlığı merkezi'),
        ('aile-sagligi-merkezi', 'google_places', 'family_health_center'),
        ('estetik-medikal', 'search', 'medikal estetik'),
        ('estetik-medikal', 'search', 'estetik kliniği'),
        ('estetik-medikal', 'search', 'plastik cerrahi'),
        ('estetik-medikal', 'search', 'saç ekimi'),
        ('estetik-medikal', 'search', 'dermatoloji'),
        ('eczane', 'google_places', 'pharmacy'),
        ('dis-hekimi', 'google_places', 'dentist'),
        ('dis-hekimi', 'search', 'ağız ve diş sağlığı'),
        ('psikolog', 'google_places', 'psychologist'),
        ('diyetisyen', 'google_places', 'nutritionist'),
        ('fizyoterapist', 'google_places', 'physiotherapist'),
        ('fizyoterapist', 'search', 'fizik tedavi ve rehabilitasyon'),
        ('laboratuvar', 'google_places', 'medical_laboratory'),
        ('optik', 'google_places', 'optician')
)
INSERT INTO discovery_category_aliases (category_id, provider, alias)
SELECT category.id, alias.provider, alias.alias
FROM health_aliases alias
JOIN discovery_categories category ON category.slug = alias.slug
ON CONFLICT (provider, locale, alias) DO UPDATE SET
    category_id = EXCLUDED.category_id;

DO $$
DECLARE
    health_business record;
    existing_target record;
BEGIN
    FOR health_business IN
        WITH normalized_candidates AS (
            SELECT
                assignment.business_id,
                assignment.category_id AS current_category_id,
                assignment.is_primary,
                current_category.slug AS current_slug,
                regexp_replace(
                    translate(lower(concat_ws(' ',
                        business.name,
                        business.slug,
                        business.industry_id,
                        business.industry_label,
                        business.slogan,
                        business.about,
                        coalesce(business.legacy_source::text, '')
                    )), 'çğıöşü', 'cgiosu'),
                    '[^a-z0-9]+', ' ', 'g'
                ) AS search_text
            FROM business_discovery_categories assignment
            JOIN discovery_categories current_category ON current_category.id = assignment.category_id
            LEFT JOIN discovery_categories current_parent ON current_parent.id = current_category.parent_id
            JOIN businesses business ON business.id = assignment.business_id
            WHERE current_parent.slug = 'saglik'
               OR (
                    current_category.slug IN ('guzellik-salonu', 'guzellik-kuafor')
                    AND regexp_replace(
                        translate(lower(concat_ws(' ', business.name, business.slug, business.slogan, business.about, coalesce(business.legacy_source::text, ''))), 'çğıöşü', 'cgiosu'),
                        '[^a-z0-9]+', ' ', 'g'
                    ) ~ '(medikal estetik|estetik klinik|plastik cerrahi|kozmetik cerrahi|genital estetik|burun estetigi|sac ekim|dermatolog|cildiye)'
               )
        ), classified AS (
            SELECT
                candidate.*,
                CASE
                    WHEN search_text ~ '(eczane|pharmacy|drugstore)' THEN 'eczane'
                    WHEN search_text ~ '(hastane|hospital)' THEN 'hastane'
                    WHEN search_text ~ '(aile sagligi merkezi|aile saglik merkezi|saglik ocagi|toplum sagligi merkezi|family health center|(^| )asm( |$))' THEN 'aile-sagligi-merkezi'
                    WHEN search_text ~ '(dis hekimi|agiz ve dis|dental|dentist|ortodont|periodont|implantoloji|(^| )dt( |$))' THEN 'dis-hekimi'
                    WHEN search_text ~ '(psikolog|psikoloji|psikolojik danisman|psikoterapi|psikiyatri|(^| )psk( |$))' THEN 'psikolog'
                    WHEN search_text ~ '(diyetisyen|beslenme ve diyet|nutrisyon)' THEN 'diyetisyen'
                    WHEN search_text ~ '(fizyoterap|fizik tedavi|rehabilitasyon|fizyo)' THEN 'fizyoterapist'
                    WHEN search_text ~ '(laboratuvar|laboratory|tibbi tahlil|kan tahlili)' THEN 'laboratuvar'
                    WHEN search_text ~ '(optik|optisyen|gozluk|optician)' THEN 'optik'
                    WHEN search_text ~ '(medikal estetik|estetik klinik|plastik cerrahi|kozmetik cerrahi|genital estetik|burun estetigi|sac ekim|botoks|dolgu|dermatolog|cildiye)' THEN 'estetik-medikal'
                    ELSE 'tip-merkezi-klinik'
                END AS target_slug
            FROM normalized_candidates candidate
        )
        SELECT
            classified.*,
            target.id AS target_category_id,
            CASE WHEN classified.target_slug = 'tip-merkezi-klinik' THEN 'needs_review' ELSE 'verified' END AS next_review_status
        FROM classified
        JOIN discovery_categories target ON target.slug = classified.target_slug
        WHERE classified.current_category_id <> target.id
    LOOP
        SELECT is_primary INTO existing_target
        FROM business_discovery_categories
        WHERE business_id = health_business.business_id
          AND category_id = health_business.target_category_id;

        IF FOUND THEN
            IF health_business.is_primary AND NOT existing_target.is_primary THEN
                UPDATE business_discovery_categories
                SET is_primary = false, updated_at = now()
                WHERE business_id = health_business.business_id
                  AND category_id = health_business.current_category_id;

                UPDATE business_discovery_categories
                SET
                    is_primary = true,
                    source = 'taxonomy',
                    confidence = CASE WHEN health_business.next_review_status = 'verified' THEN 0.95 ELSE 0.65 END,
                    review_status = health_business.next_review_status,
                    updated_at = now()
                WHERE business_id = health_business.business_id
                  AND category_id = health_business.target_category_id;
            END IF;

            DELETE FROM business_discovery_categories
            WHERE business_id = health_business.business_id
              AND category_id = health_business.current_category_id;
        ELSE
            UPDATE business_discovery_categories
            SET
                category_id = health_business.target_category_id,
                source = 'taxonomy',
                confidence = CASE WHEN health_business.next_review_status = 'verified' THEN 0.95 ELSE 0.65 END,
                review_status = health_business.next_review_status,
                updated_at = now()
            WHERE business_id = health_business.business_id
              AND category_id = health_business.current_category_id;
        END IF;
    END LOOP;
END;
$$;

UPDATE businesses business
SET
    industry_id = category.slug,
    industry_label = category.label,
    updated_at = now()
FROM business_discovery_categories assignment
JOIN discovery_categories category ON category.id = assignment.category_id
JOIN discovery_categories parent ON parent.id = category.parent_id
WHERE assignment.business_id = business.id
  AND assignment.is_primary = true
  AND parent.slug = 'saglik';
