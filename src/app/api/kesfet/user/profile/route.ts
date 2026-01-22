import { NextResponse } from "next/server";
import { getDocumentREST, updateDocumentREST, createDocumentREST } from "@/lib/documentStore";

export const dynamic = "force-dynamic";

const COLLECTION = "kesfet_users";

// GET /api/kesfet/user/profile - Get current user profile
export async function GET(request: Request) {
    try {
        const userId = request.headers.get("x-user-id");

        if (!userId) {
            return NextResponse.json(
                { success: false, error: "Unauthorized" },
                { status: 401 }
            );
        }

        const user = await getDocumentREST(COLLECTION, userId);

        if (!user) {
            // Create default profile for new user
            const defaultProfile = {
                uid: userId,
                displayName: "Kullanıcı",
                email: "",
                phone: "",
                photoURL: "",
                addresses: [],
                preferences: {
                    theme: "system",
                    notifications: {
                        orders: true,
                        promotions: true,
                        reservations: true,
                    },
                    language: "tr",
                },
                wallet: {
                    balance: 0,
                    points: 0,
                    lastUpdated: new Date().toISOString(),
                },
                isPrime: false,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            };

            await createDocumentREST(COLLECTION, defaultProfile);

            return NextResponse.json({
                success: true,
                data: defaultProfile,
            });
        }

        return NextResponse.json({
            success: true,
            data: {
                uid: user.uid || userId,
                displayName: user.displayName || "Kullanıcı",
                email: user.email || "",
                phone: user.phone || "",
                photoURL: user.photoURL || "",
                addresses: user.addresses || [],
                preferences: user.preferences || {},
                wallet: user.wallet || { balance: 0, points: 0 },
                isPrime: user.isPrime || false,
                createdAt: user.createdAt,
                updatedAt: user.updatedAt,
            },
        });
    } catch (error) {
        console.error("[User Profile API] Error:", error);
        return NextResponse.json(
            { success: false, error: "Server error" },
            { status: 500 }
        );
    }
}

// PUT /api/kesfet/user/profile - Update user profile
export async function PUT(request: Request) {
    try {
        const userId = request.headers.get("x-user-id");

        if (!userId) {
            return NextResponse.json(
                { success: false, error: "Unauthorized" },
                { status: 401 }
            );
        }

        const body = await request.json();
        const { displayName, email, phone, photoURL, preferences } = body;

        const updateData: Record<string, unknown> = {
            updatedAt: new Date().toISOString(),
        };

        if (displayName !== undefined) updateData.displayName = displayName;
        if (email !== undefined) updateData.email = email;
        if (phone !== undefined) updateData.phone = phone;
        if (photoURL !== undefined) updateData.photoURL = photoURL;
        if (preferences !== undefined) updateData.preferences = preferences;

        await updateDocumentREST(COLLECTION, userId, updateData);

        return NextResponse.json({
            success: true,
            message: "Profil güncellendi",
        });
    } catch (error) {
        console.error("[User Profile API] Update error:", error);
        return NextResponse.json(
            { success: false, error: "Server error" },
            { status: 500 }
        );
    }
}
