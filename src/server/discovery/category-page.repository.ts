import type { QueryResultRow } from "pg";

// Category artwork is a fallback asset, not an owned business photo. Keep the
// public API independent from the newer mobile source tree used by the shared
// iOS/Android repository.
const CATEGORY_ARTWORK_PATTERN = "/assets/(categories|events)/";

import type {
    CategoryBusinessCard,
    CategoryBusinessesPage,
    CategoryPageBootstrap,
    DiscoveryCategorySummary,
    FeaturedBusinessCard,
    FeaturedSlotAssignment,
    FeaturedSlotInput,
} from "./category-page.types.ts";
import {
    buildFiveSlotInventory,
    decodeCategoryCursor,
    encodeCategoryCursor,
    validateFeaturedSlotInput,
} from "./featured-slot-model.ts";

interface QueryResultLike<TRow> {
    rows: TRow[];
}

export type DiscoveryQuery = <TRow extends QueryResultRow = QueryResultRow>(
    text: string,
    values?: readonly unknown[],
) => Promise<QueryResultLike<TRow>>;

interface CategoryRow extends QueryResultRow {
    id: string;
    slug: string;
    label: string;
    image_url: string | null;
    business_count?: string | number | null;
}

interface BusinessRow extends QueryResultRow {
    id: string;
    slug: string;
    name: string;
    cover: string | null;
    logo: string | null;
    industry_id: string | null;
    industry_label: string | null;
    district: string | null;
    city: string | null;
    rating: string | number | null;
    review_count: number | null;
    sort_score?: string | number | null;
    total_count?: string | number | null;
}

interface FeaturedRow extends BusinessRow {
    position: number;
}

interface FeaturedSlotRow extends QueryResultRow {
    id: string;
    city: string;
    child_category_id: string;
    position: number;
    business_id: string;
    business_name: string;
    business_slug: string;
    starts_at: Date | string;
    ends_at: Date | string;
    status: FeaturedSlotAssignment["status"];
    created_by: string | null;
}

interface CategoryPageRepositoryDependencies {
    query: DiscoveryQuery;
}

interface BootstrapInput {
    city: string;
    parentSlug: string;
    childSlug?: string | null;
    cursor?: string | null;
    limit: number;
    now?: Date;
}

interface BusinessesPageInput {
    city: string;
    childSlug: string;
    cursor?: string | null;
    limit: number;
    excludeBusinessIds?: readonly string[];
}

const ACTIVE_BUSINESS_SQL = `(
    b.status IS NULL
    OR btrim(b.status) = ''
    OR lower(btrim(b.status)) = 'active'
)`;

// Include photo priority in the cursor score as well as ORDER BY, before pagination.
const OWN_PHOTO_SQL = `(
    (NULLIF(btrim(b.cover), '') IS NOT NULL AND b.cover !~* '${CATEGORY_ARTWORK_PATTERN}')
    OR (NULLIF(btrim(b.logo), '') IS NOT NULL AND b.logo !~* '${CATEGORY_ARTWORK_PATTERN}')
)`;
const SORT_SCORE_SQL = `((CASE WHEN ${OWN_PHOTO_SQL} THEN 1000000000 ELSE 0 END)
    + LEAST(GREATEST(COALESCE(b.rating, 0), 0), 5) * 1000000
    + LEAST(GREATEST(COALESCE(b.review_count, 0), 0), 999999))`;

function asNumber(value: unknown, fallback = 0): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
}

function asIso(value: Date | string): string {
    return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function mapCategory(row: CategoryRow): DiscoveryCategorySummary {
    return {
        id: row.id,
        slug: row.slug,
        label: row.label,
        imageUrl: row.image_url,
        count: asNumber(row.business_count),
    };
}

function mapBusiness(row: BusinessRow): CategoryBusinessCard {
    return {
        id: row.id,
        slug: row.slug,
        name: row.name,
        coverImage: row.cover,
        logoUrl: row.logo,
        categoryId: row.industry_id,
        categoryLabel: row.industry_label,
        district: row.district,
        city: row.city,
        rating: row.rating === null ? null : asNumber(row.rating),
        reviewCount: asNumber(row.review_count),
    };
}

function mapFeatured(row: FeaturedRow): FeaturedBusinessCard {
    return {
        ...mapBusiness(row),
        position: row.position as FeaturedBusinessCard["position"],
    };
}

async function defaultQuery<TRow extends QueryResultRow>(text: string, values?: readonly unknown[]) {
    const database = await import("../db/query.ts");
    return database.query<TRow>(text, values);
}

export function createCategoryPageRepository(
    dependencies: CategoryPageRepositoryDependencies = { query: defaultQuery },
) {
    const { query } = dependencies;

    async function getOrganicPage(input: BusinessesPageInput): Promise<CategoryBusinessesPage> {
        const cursor = decodeCategoryCursor(input.cursor);
        if (input.cursor && !cursor) {
            throw new Error("Kategori sayfalama anahtarı geçersizdir.");
        }

        const result = await query<BusinessRow>(`
            SELECT
                b.id,
                b.slug,
                b.name,
                b.cover,
                b.logo,
                b.industry_id,
                b.industry_label,
                b.district,
                b.city,
                b.rating,
                b.review_count,
                ${SORT_SCORE_SQL} AS sort_score,
                count(*) OVER() AS total_count
            FROM businesses b
            JOIN business_discovery_categories assignment ON assignment.business_id = b.id
            JOIN discovery_categories child ON child.id = assignment.category_id
            WHERE lower(b.city) = lower($1)
              AND child.slug = $2
              AND child.status = 'active'
              AND ${ACTIVE_BUSINESS_SQL}
              AND (
                  $3::numeric IS NULL
                  OR ${SORT_SCORE_SQL} < $3
                  OR (${SORT_SCORE_SQL} = $3 AND b.id > $4)
              )
              AND NOT (b.id = ANY($6::text[]))
            ORDER BY sort_score DESC, b.id ASC
            LIMIT $5
        `, [
            input.city,
            input.childSlug,
            cursor?.score ?? null,
            cursor?.id ?? null,
            input.limit + 1,
            [...(input.excludeBusinessIds ?? [])],
        ]);

        const hasMore = result.rows.length > input.limit;
        const pageRows = result.rows.slice(0, input.limit);
        const last = pageRows.at(-1);

        return {
            businesses: pageRows.map(mapBusiness),
            total: asNumber(result.rows[0]?.total_count),
            hasMore,
            nextCursor: hasMore && last
                ? encodeCategoryCursor({ id: last.id, score: asNumber(last.sort_score) })
                : null,
        };
    }

    return {
        async getCategoryPageBootstrap(input: BootstrapInput): Promise<CategoryPageBootstrap> {
            const now = input.now ?? new Date();
            const parentResult = await query<CategoryRow>(`
                SELECT id, slug, label, image_url
                FROM discovery_categories
                WHERE slug = $1 AND parent_id IS NULL AND status = 'active'
                LIMIT 1
            `, [input.parentSlug]);
            const parentRow = parentResult.rows[0];
            if (!parentRow) {
                throw new Error("Üst kategori bulunamadı.");
            }

            const childrenResult = await query<CategoryRow>(`
                SELECT
                    child.id,
                    child.slug,
                    child.label,
                    child.image_url,
                    count(DISTINCT assignment.business_id) FILTER (
                        WHERE lower(b.city) = lower($2) AND ${ACTIVE_BUSINESS_SQL}
                    ) AS business_count
                FROM discovery_categories child
                LEFT JOIN business_discovery_categories assignment ON assignment.category_id = child.id
                LEFT JOIN businesses b ON b.id = assignment.business_id
                WHERE child.parent_id = $1 AND child.status = 'active'
                GROUP BY child.id
                ORDER BY child.sort_order, child.label
            `, [parentRow.id, input.city]);
            const children = childrenResult.rows.map(mapCategory);
            const selectedChild = children.find((child) => child.slug === input.childSlug)
                ?? children.find((child) => child.count > 0)
                ?? children[0];
            if (!selectedChild) {
                throw new Error("Alt kategori bulunamadı.");
            }

            const featuredResult = await query<FeaturedRow>(`
                SELECT
                    slot.position,
                    b.id,
                    b.slug,
                    b.name,
                    b.cover,
                    b.logo,
                    b.industry_id,
                    b.industry_label,
                    b.district,
                    b.city,
                    b.rating,
                    b.review_count
                FROM category_featured_slots slot
                JOIN businesses b ON b.id = slot.business_id
                JOIN business_discovery_categories assignment
                    ON assignment.business_id = b.id
                   AND assignment.category_id = slot.child_category_id
                WHERE lower(slot.city) = lower($1)
                  AND slot.child_category_id = $2
                  AND slot.status IN ('scheduled', 'active')
                  AND slot.starts_at <= $3
                  AND slot.ends_at > $3
                  AND ${ACTIVE_BUSINESS_SQL}
                ORDER BY slot.position
            `, [input.city, selectedChild.id, now.toISOString()]);
            const featured = featuredResult.rows
                .map(mapFeatured)
                .sort((first, second) => first.position - second.position)
                .slice(0, 5);
            const organic = await getOrganicPage({
                city: input.city,
                childSlug: selectedChild.slug,
                cursor: input.cursor,
                limit: input.limit,
                excludeBusinessIds: featured.map((business) => business.id),
            });

            return {
                parent: { ...mapCategory(parentRow), count: children.reduce((sum, child) => sum + child.count, 0) },
                children,
                selectedChild,
                featured,
                ...organic,
            };
        },

        getCategoryBusinessesPage(input: BusinessesPageInput) {
            return getOrganicPage(input);
        },

        async listFeaturedSlots(input: { city: string; childCategoryId: string; at?: Date }) {
            const at = input.at ?? new Date();
            const result = await query<FeaturedSlotRow>(`
                SELECT
                    slot.id,
                    slot.city,
                    slot.child_category_id,
                    slot.position,
                    slot.business_id,
                    b.name AS business_name,
                    b.slug AS business_slug,
                    slot.starts_at,
                    slot.ends_at,
                    slot.status,
                    slot.created_by
                FROM category_featured_slots slot
                JOIN businesses b ON b.id = slot.business_id
                WHERE lower(slot.city) = lower($1)
                  AND slot.child_category_id = $2
                  AND slot.status <> 'cancelled'
                  AND slot.ends_at > $3
                ORDER BY slot.position, slot.starts_at
            `, [input.city, input.childCategoryId, at.toISOString()]);
            const assignments: FeaturedSlotAssignment[] = result.rows.map((row) => ({
                id: row.id,
                city: row.city,
                childCategoryId: row.child_category_id,
                position: row.position as FeaturedSlotAssignment["position"],
                businessId: row.business_id,
                businessName: row.business_name,
                businessSlug: row.business_slug,
                startsAt: asIso(row.starts_at),
                endsAt: asIso(row.ends_at),
                status: row.status,
                createdBy: row.created_by,
            }));
            return buildFiveSlotInventory(assignments);
        },

        async upsertFeaturedSlot(rawInput: FeaturedSlotInput) {
            const input = validateFeaturedSlotInput(rawInput);
            const result = await query<FeaturedSlotRow>(`
                WITH eligible AS (
                    SELECT b.id, b.name, b.slug
                    FROM businesses b
                    JOIN business_discovery_categories assignment
                      ON assignment.business_id = b.id
                     AND assignment.category_id = $3
                    WHERE b.id = $5
                      AND ${ACTIVE_BUSINESS_SQL}
                    LIMIT 1
                ), upserted AS (
                    INSERT INTO category_featured_slots (
                        id, city, child_category_id, position, business_id,
                        starts_at, ends_at, status, created_by, updated_at
                    )
                    SELECT
                        COALESCE($1::uuid, gen_random_uuid()), $2, $3, $4, eligible.id,
                        $6, $7, $8, $9, now()
                    FROM eligible
                    ON CONFLICT (id) DO UPDATE SET
                        city = EXCLUDED.city,
                        child_category_id = EXCLUDED.child_category_id,
                        position = EXCLUDED.position,
                        business_id = EXCLUDED.business_id,
                        starts_at = EXCLUDED.starts_at,
                        ends_at = EXCLUDED.ends_at,
                        status = EXCLUDED.status,
                        updated_at = now()
                    RETURNING *
                )
                SELECT
                    upserted.id,
                    upserted.city,
                    upserted.child_category_id,
                    upserted.position,
                    upserted.business_id,
                    eligible.name AS business_name,
                    eligible.slug AS business_slug,
                    upserted.starts_at,
                    upserted.ends_at,
                    upserted.status,
                    upserted.created_by
                FROM upserted
                JOIN eligible ON eligible.id = upserted.business_id
            `, [
                input.id ?? null,
                input.city,
                input.childCategoryId,
                input.position,
                input.businessId,
                input.startsAt,
                input.endsAt,
                input.status,
                input.createdBy ?? null,
            ]);
            const saved = result.rows[0];
            if (!saved) {
                throw new Error("Seçilen işletme bu alt kategoriyle eşleşmiyor.");
            }
            return saved;
        },
    };
}

export const categoryPageRepository = createCategoryPageRepository();
