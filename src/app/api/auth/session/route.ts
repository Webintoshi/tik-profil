import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/apiAuth";

export async function GET() {
    const auth = await requireAuth();
    if (!auth.authorized) {
        return NextResponse.json({ success: false, error: auth.error }, { status: 401 });
    }
    return NextResponse.json({ success: true });
}

