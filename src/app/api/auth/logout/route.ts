import { NextResponse } from "next/server";
import { cookies } from "next/headers";

// All session cookie names to clear
const SESSION_COOKIES = [
    "tikprofil_session",       // Admin session
    "tikprofil_owner_session", // Owner session  
    "tikprofil_staff_session", // Staff session
    "tikprofil_impersonate",   // Impersonation
];

export async function POST() {
    try {
        const cookieStore = await cookies();

        // Clear all session cookies
        for (const cookieName of SESSION_COOKIES) {
            cookieStore.delete(cookieName);
        }

        return NextResponse.json({
            success: true,
            message: "Çıkış başarılı"
        });
    } catch (error) {
        console.error("Logout error:", error);
        return NextResponse.json(
            { error: "Çıkış yapılamadı" },
            { status: 500 }
        );
    }
}
