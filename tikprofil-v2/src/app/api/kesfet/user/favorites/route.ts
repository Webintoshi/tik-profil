import { NextResponse } from "next/server";
import { createDocumentREST, deleteDocumentREST } from "@/lib/documentStore";
import { getSupabaseClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";

const COLLECTION = "kesfet_favorites";

// GET /api/kesfet/user/favorites - Get user's favorites
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const userId = request.headers.get("x-user-id");
        const type = searchParams.get("type"); // "business" or "product"

        if (!userId) {
            return NextResponse.json(
                { success: false, error: "Unauthorized" },
                { status: 401 }
            );
        }

        const supabase = getSupabaseClient();
        let queryBuilder = supabase
            .from("app_documents")
            .select("id,data")
            .eq("collection", COLLECTION)
            .eq("data->>userId", userId);

        if (type) {
            queryBuilder = queryBuilder.eq("data->>itemType", type);
        }

        const { data, error } = await queryBuilder.range(0, 999);
        if (error) throw error;

        const favorites = (data || []).map((row: any) => {
            const payload = row.data as Record<string, unknown>;
            return {
                id: row.id as string,
                userId: payload.userId as string,
                itemId: payload.itemId as string,
                itemType: payload.itemType as "business" | "product",
                createdAt: payload.createdAt as string,
            };
        });

        // Sort by date desc
        favorites.sort((a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );

        return NextResponse.json({
            success: true,
            data: favorites,
        });
    } catch (error) {
        console.error("[Favorites API] Error:", error);
        return NextResponse.json(
            { success: false, error: "Server error" },
            { status: 500 }
        );
    }
}

// POST /api/kesfet/user/favorites - Add to favorites
export async function POST(request: Request) {
    try {
        const userId = request.headers.get("x-user-id");

        if (!userId) {
            return NextResponse.json(
                { success: false, error: "Unauthorized" },
                { status: 401 }
            );
        }

        const body = await request.json();
        const { itemId, itemType } = body;

        if (!itemId || !itemType) {
            return NextResponse.json(
                { success: false, error: "Missing itemId or itemType" },
                { status: 400 }
            );
        }

        // Check if already favorited
        const supabase = getSupabaseClient();
        const { data: existingRows, error: existingError } = await supabase
            .from("app_documents")
            .select("id,data")
            .eq("collection", COLLECTION)
            .eq("data->>userId", userId)
            .eq("data->>itemId", itemId)
            .range(0, 0);
        if (existingError) throw existingError;

        const existingRow = existingRows?.[0] as { id: string; data: Record<string, unknown> } | undefined;
        const existing = existingRow ? ({ id: existingRow.id, ...(existingRow.data as Record<string, unknown>) } as Record<string, unknown>) : null;

        if (existing) {
            return NextResponse.json({
                success: true,
                data: existing,
                message: "Zaten favorilerde",
            });
        }

        const favoriteData = {
            userId,
            itemId,
            itemType,
            createdAt: new Date().toISOString(),
        };

        const favoriteId = await createDocumentREST(COLLECTION, favoriteData);

        return NextResponse.json({
            success: true,
            data: { id: favoriteId, ...favoriteData },
            message: "Favorilere eklendi",
        });
    } catch (error) {
        console.error("[Favorites API] Create error:", error);
        return NextResponse.json(
            { success: false, error: "Server error" },
            { status: 500 }
        );
    }
}

// DELETE /api/kesfet/user/favorites - Remove from favorites (by itemId in body)
export async function DELETE(request: Request) {
    try {
        const userId = request.headers.get("x-user-id");

        if (!userId) {
            return NextResponse.json(
                { success: false, error: "Unauthorized" },
                { status: 401 }
            );
        }

        const body = await request.json();
        const { itemId } = body;

        if (!itemId) {
            return NextResponse.json(
                { success: false, error: "Missing itemId" },
                { status: 400 }
            );
        }

        // Find the favorite
        const supabase = getSupabaseClient();
        const { data: favoriteRows, error: favoriteError } = await supabase
            .from("app_documents")
            .select("id,data")
            .eq("collection", COLLECTION)
            .eq("data->>userId", userId)
            .eq("data->>itemId", itemId)
            .range(0, 0);
        if (favoriteError) throw favoriteError;

        const favorite = favoriteRows?.[0] as { id: string; data: Record<string, unknown> } | undefined;

        if (!favorite) {
            return NextResponse.json(
                { success: false, error: "Favorite not found" },
                { status: 404 }
            );
        }

        await deleteDocumentREST(COLLECTION, favorite.id as string);

        return NextResponse.json({
            success: true,
            message: "Favorilerden kaldırıldı",
        });
    } catch (error) {
        console.error("[Favorites API] Delete error:", error);
        return NextResponse.json(
            { success: false, error: "Server error" },
            { status: 500 }
        );
    }
}
