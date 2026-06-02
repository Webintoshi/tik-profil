import { NextRequest, NextResponse } from "next/server";
import {
    validateCredentials,
    createSession,
    setSessionCookie,
} from "@/lib/auth";
import {
    logAuthAttempt,
    getGeoLocation,
    getClientIP,
} from "@/lib/security";
import { checkRateLimit, recordSuccess } from "@/lib/rateLimit";
import { logAdminLogin } from "@/lib/systemLogs";

export async function POST(request: NextRequest) {
    try {
        const { username, password } = await request.json();

        const ip = getClientIP(request.headers);
        const userAgent = request.headers.get("user-agent") || "Bilinmiyor";

        const rateCheck = checkRateLimit(ip, "admin-login");
        if (!rateCheck.allowed) {
            return NextResponse.json(
                { error: rateCheck.message || "Cok fazla deneme" },
                {
                    status: 429,
                    headers: {
                        "Retry-After": String(rateCheck.retryAfter || 3600),
                        "X-RateLimit-Remaining": "0",
                    },
                }
            );
        }

        const isValid = await validateCredentials(username, password);
        const geoLocation = await getGeoLocation(ip);

        logAuthAttempt({
            ip_address: ip,
            user_agent: userAgent,
            status: isValid ? "success" : "fail",
            geo_location: geoLocation,
            username_attempted: username,
        });

        logAdminLogin(ip, isValid);

        if (!isValid) {
            return NextResponse.json(
                { error: "Kullanici adi veya sifre hatali" },
                { status: 401 }
            );
        }

        recordSuccess(ip, "admin-login");

        const token = await createSession({ username, ip });
        await setSessionCookie(token);

        return NextResponse.json({
            success: true,
            message: "Giris basarili",
        });
    } catch (error) {
        console.error("Login error:", error);
        return NextResponse.json(
            { error: "Sunucu hatasi" },
            { status: 500 }
        );
    }
}
