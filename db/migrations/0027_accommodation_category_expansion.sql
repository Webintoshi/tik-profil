-- Split the former broad accommodation bucket into customer-facing lodging types.

WITH accommodation_seed(parent_slug, slug, label, sort_order, search_terms) AS (
    VALUES
        ('konaklama-turizm', 'otel', 'Otel', 10, ARRAY['otel','hotel','konaklama','apart otel','hostel']::text[]),
        ('konaklama-turizm', 'pansiyon', 'Pansiyon', 20, ARRAY['pansiyon','aile pansiyonu','guesthouse']::text[]),
        ('konaklama-turizm', 'bungalov', 'Bungalov', 30, ARRAY['bungalov','bungalow','bungalov evi','bungalov evleri']::text[])
)
INSERT INTO discovery_categories (parent_id, slug, label, sort_order, search_terms, status)
SELECT parent.id, child.slug, child.label, child.sort_order, child.search_terms, 'active'
FROM accommodation_seed child
JOIN discovery_categories parent ON parent.slug = child.parent_slug
ON CONFLICT (slug) DO UPDATE SET
    parent_id = EXCLUDED.parent_id,
    label = EXCLUDED.label,
    sort_order = EXCLUDED.sort_order,
    search_terms = EXCLUDED.search_terms,
    status = 'active',
    updated_at = now();

WITH accommodation_aliases(slug, provider, alias) AS (
    VALUES
        ('otel', 'manual', 'otel_konaklama'),
        ('otel', 'manual', 'otel & konaklama'),
        ('otel', 'search', 'hotel'),
        ('pansiyon', 'search', 'aile pansiyonu'),
        ('pansiyon', 'search', 'guesthouse'),
        ('bungalov', 'search', 'bungalow'),
        ('bungalov', 'search', 'bungalov evleri')
)
INSERT INTO discovery_category_aliases (category_id, provider, alias)
SELECT category.id, alias.provider, alias.alias
FROM accommodation_aliases alias
JOIN discovery_categories category ON category.slug = alias.slug
ON CONFLICT (provider, locale, alias) DO UPDATE SET
    category_id = EXCLUDED.category_id;

DO $$
DECLARE
    lodging record;
    existing_target record;
BEGIN
    FOR lodging IN
        WITH legacy_category AS (
            SELECT id
            FROM discovery_categories
            WHERE slug = 'otel-konaklama'
        ), classified AS (
            SELECT
                assignment.business_id,
                assignment.category_id AS legacy_category_id,
                assignment.is_primary,
                CASE
                    WHEN normalized.search_text LIKE '%bungalov%'
                      OR normalized.search_text LIKE '%bungalow%' THEN 'bungalov'
                    WHEN normalized.search_text LIKE '%pansiyon%'
                      OR normalized.search_text LIKE '%guesthouse%' THEN 'pansiyon'
                    ELSE 'otel'
                END AS target_slug
            FROM business_discovery_categories assignment
            JOIN legacy_category ON legacy_category.id = assignment.category_id
            JOIN businesses business ON business.id = assignment.business_id
            CROSS JOIN LATERAL (
                SELECT regexp_replace(
                    translate(lower(concat_ws(' ', business.name, business.industry_id, business.industry_label)), 'çğıöşü', 'cgiosu'),
                    '[^a-z0-9]+', ' ', 'g'
                ) AS search_text
            ) normalized
        )
        SELECT classified.*, target.id AS target_category_id
        FROM classified
        JOIN discovery_categories target ON target.slug = classified.target_slug
    LOOP
        SELECT is_primary INTO existing_target
        FROM business_discovery_categories
        WHERE business_id = lodging.business_id
          AND category_id = lodging.target_category_id;

        IF FOUND THEN
            IF lodging.is_primary AND NOT existing_target.is_primary THEN
                UPDATE business_discovery_categories
                SET is_primary = false, updated_at = now()
                WHERE business_id = lodging.business_id
                  AND category_id = lodging.legacy_category_id;

                UPDATE business_discovery_categories
                SET is_primary = true, updated_at = now()
                WHERE business_id = lodging.business_id
                  AND category_id = lodging.target_category_id;
            END IF;

            DELETE FROM business_discovery_categories
            WHERE business_id = lodging.business_id
              AND category_id = lodging.legacy_category_id;
        ELSE
            UPDATE business_discovery_categories
            SET category_id = lodging.target_category_id,
                review_status = 'verified',
                updated_at = now()
            WHERE business_id = lodging.business_id
              AND category_id = lodging.legacy_category_id;
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
WHERE assignment.business_id = business.id
  AND category.slug IN ('otel', 'pansiyon', 'bungalov')
  AND assignment.is_primary = true;

UPDATE discovery_categories
SET status = 'inactive', updated_at = now()
WHERE slug = 'otel-konaklama';
