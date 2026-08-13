import { query } from "../../../../../server/db/query.ts";
import { requireNativeCustomerPrincipal } from "../../../../../server/auth/native-auth/account.ts";
import { NativeAuthError } from "../../../../../server/auth/native-auth/service.ts";
import { authJson, nativeAuthErrorResponse } from "../_shared.ts";

export const runtime = "nodejs";

interface FavoriteRow {
    business_slug: string;
    created_at: Date | string;
    id: string;
}

function bearerToken(request: Request) {
    const authorization = request.headers.get("authorization") ?? "";
    return authorization.startsWith("Bearer ") ? authorization.slice(7).trim() : "";
}

function businessSlugFrom(value: unknown) {
    if (!value || typeof value !== "object" || !("businessSlug" in value)) return null;
    const slug = (value as { businessSlug?: unknown }).businessSlug;
    return typeof slug === "string" && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) ? slug : null;
}

function favoriteJson(row: FavoriteRow) {
    return {
        businessSlug: row.business_slug,
        createdAt: new Date(row.created_at).toISOString(),
        id: row.id,
    };
}

export async function GET(request: Request) {
    const accessToken = bearerToken(request);
    if (!accessToken) return authJson({ error: { code: "INVALID_ACCESS_TOKEN" } }, 401);
    try {
        const principal = await requireNativeCustomerPrincipal(accessToken);
        const result = await query<FavoriteRow>(
            `SELECT id, business_slug, created_at
             FROM customer_favorites
             WHERE app_user_id = $1
             ORDER BY created_at DESC
             LIMIT 100`,
            [principal.appUserId],
        );
        return authJson({ data: { favorites: result.rows.map(favoriteJson) } });
    } catch (error) {
        return nativeAuthErrorResponse(error);
    }
}

export async function POST(request: Request) {
    const accessToken = bearerToken(request);
    if (!accessToken) return authJson({ error: { code: "INVALID_ACCESS_TOKEN" } }, 401);
    try {
        const slug = businessSlugFrom(await request.json().catch(() => null));
        if (!slug) throw new NativeAuthError("INVALID_REQUEST", 400);
        const principal = await requireNativeCustomerPrincipal(accessToken);
        const result = await query<FavoriteRow>(
            `INSERT INTO customer_favorites (app_user_id, business_slug)
             VALUES ($1, $2)
             ON CONFLICT (app_user_id, business_slug)
             DO UPDATE SET business_slug = EXCLUDED.business_slug
             RETURNING id, business_slug, created_at`,
            [principal.appUserId, slug],
        );
        return authJson({ data: { favorite: favoriteJson(result.rows[0]!) } }, 201);
    } catch (error) {
        return nativeAuthErrorResponse(error);
    }
}

export async function DELETE(request: Request) {
    const accessToken = bearerToken(request);
    if (!accessToken) return authJson({ error: { code: "INVALID_ACCESS_TOKEN" } }, 401);
    try {
        const slug = new URL(request.url).searchParams.get("businessSlug")?.trim() ?? "";
        if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) throw new NativeAuthError("INVALID_REQUEST", 400);
        const principal = await requireNativeCustomerPrincipal(accessToken);
        await query(
            "DELETE FROM customer_favorites WHERE app_user_id = $1 AND business_slug = $2",
            [principal.appUserId, slug],
        );
        return authJson({ data: { deleted: true } });
    } catch (error) {
        return nativeAuthErrorResponse(error);
    }
}
