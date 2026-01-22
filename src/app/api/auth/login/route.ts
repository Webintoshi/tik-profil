import { NextRequest, NextResponse } from "next/server";
import {
    validateCredentials,
    createSession,
    setSessionCookie
} from "@/lib/auth";
import {
    logAuthAttempt,
    getGeoLocation,
    getClientIP
} from "@/lib/security";
import { logAdminLogin } from "@/lib/systemLogs";

export async function POST(request: NextRequest) {
    try {
        const { username, password } = await request.json();

        // Get client info
        const ip = getClientIP(request.headers);
        const userAgent = request.headers.get("user-agent") || "Bilinmiyor";

        // Validate credentials
        const isValid = await validateCredentials(username, password);

        // Get geo location (async, don't block)
        const geoLocation = await getGeoLocation(ip);

        // Log attempt (don't await, fire and forget)
        logAuthAttempt({
            ip_address: ip,
            user_agent: userAgent,
            status: isValid ? "success" : "fail",
            geo_location: geoLocation,
            username_attempted: username,
        });

        // Log to system logs (fire and forget)
        logAdminLogin(ip, isValid);

        if (!isValid) {
            return NextResponse.json(
                { error: "Kullanıcı adı veya şifre hatalı" },
                { status: 401 }
            );
        }

        // Create session
        const token = await createSession({ username, ip });

        // Set cookie
        await setSessionCookie(token);

        return NextResponse.json({
            success: true,
            message: "Giriş başarılı"
        });
    } catch (error) {
        console.error("Login error:", error);
        return NextResponse.json(
            { error: "Sunucu hatası" },
            { status: 500 }
        );
    }
}

