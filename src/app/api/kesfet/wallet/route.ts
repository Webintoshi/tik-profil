import { NextResponse } from "next/server";
import { getDocumentREST, getCollectionREST } from "@/lib/documentStore";

export const dynamic = "force-dynamic";

// GET /api/kesfet/wallet - Get wallet balance
export async function GET(request: Request) {
    try {
        const userId = request.headers.get("x-user-id");

        if (!userId) {
            return NextResponse.json(
                { success: false, error: "Unauthorized" },
                { status: 401 }
            );
        }

        const user = await getDocumentREST("kesfet_users", userId);

        if (!user) {
            return NextResponse.json({
                success: true,
                data: {
                    balance: 0,
                    points: 0,
                },
            });
        }

        const wallet = user.wallet as { balance: number; points: number } | undefined;

        return NextResponse.json({
            success: true,
            data: {
                balance: wallet?.balance || 0,
                points: wallet?.points || 0,
            },
        });
    } catch (error) {
        console.error("[Wallet API] Error:", error);
        return NextResponse.json(
            { success: false, error: "Server error" },
            { status: 500 }
        );
    }
}
