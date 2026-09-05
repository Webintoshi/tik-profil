import { NativeAuthError } from "../auth/native-auth/service.ts";
import { query } from "../db/query.ts";

export interface NativeFavorite {
    businessSlug: string;
    createdAt: string;
    id: string;
}

type FavoriteQuery = (text: string, values?: readonly unknown[]) => Promise<{
    rows: Record<string, unknown>[];
    rowCount: number | null;
}>;

function favorite(row: Record<string, unknown>): NativeFavorite {
    return {
        businessSlug: String(row.business_slug),
        createdAt: new Date(row.created_at as Date | string).toISOString(),
        id: String(row.id),
    };
}

export function createFavoriteRepository(execute: FavoriteQuery) {
    return {
        async listFavorites(appUserId: string): Promise<NativeFavorite[]> {
            const result = await execute(
                `SELECT id, business_slug, created_at FROM customer_favorites
                 WHERE app_user_id = $1 ORDER BY created_at DESC LIMIT 100`,
                [appUserId],
            );
            return result.rows.map(favorite);
        },

        async addFavoriteIfMissing(appUserId: string, businessSlug: string) {
            const inserted = await execute(
                `INSERT INTO customer_favorites (app_user_id, business_slug)
                 VALUES ($1, $2)
                 ON CONFLICT (app_user_id, business_slug) DO NOTHING
                 RETURNING id, business_slug, created_at`,
                [appUserId, businessSlug],
            );
            if (inserted.rows[0]) return { created: true, favorite: favorite(inserted.rows[0]) };

            const existing = await execute(
                `SELECT id, business_slug, created_at FROM customer_favorites
                 WHERE app_user_id = $1 AND business_slug = $2 LIMIT 1`,
                [appUserId, businessSlug],
            );
            if (!existing.rows[0]) throw new NativeAuthError("FAVORITE_CONFLICT", 409);
            return { created: false, favorite: favorite(existing.rows[0]) };
        },

        async findFavoriteBusinessId(businessSlug: string): Promise<string | null> {
            const result = await execute(
                `SELECT id FROM businesses WHERE lower(slug) = lower($1) LIMIT 1`,
                [businessSlug],
            );
            return result.rows[0] ? String(result.rows[0].id) : null;
        },

        async deleteFavorite(appUserId: string, businessSlug: string): Promise<void> {
            await execute("DELETE FROM customer_favorites WHERE app_user_id = $1 AND business_slug = $2", [appUserId, businessSlug]);
        },
    };
}

export const favoriteRepository = createFavoriteRepository(query);
export type NativeFavoriteRepository = ReturnType<typeof createFavoriteRepository>;
