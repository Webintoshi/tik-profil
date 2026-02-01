/**
 * Debug endpoint to check what cookies the server receives
 */
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { getSessionSecretBytes } from "@/lib/env";

const getJwtSecret = () => getSessionSecretBytes();

async function isAdmin(): Promise<boolean> {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get("tikprofil_session")?.value;
        if (!token) return false;

        await jwtVerify(token, getJwtSecret());
        return true;
    } catch {
        return false;
    }
}

export async function GET() {
    if (!await isAdmin()) {
        return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    const cookieStore = await cookies();
    const allCookies = cookieStore.getAll();

    const ownerSession = cookieStore.get("tikprofil_owner_session");

    return NextResponse.json({
        totalCookies: allCookies.length,
        cookieNames: allCookies.map(c => c.name),
        hasOwnerSession: !!ownerSession,
        ownerSessionLength: ownerSession?.value?.length || 0,
    });
}
