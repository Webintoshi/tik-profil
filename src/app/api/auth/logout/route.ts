import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getSession as getAdminSession } from "@/lib/auth";
import { getSession as getBusinessSession } from "@/lib/apiAuth";
import { getCustomerSession, CUSTOMER_SESSION_COOKIE } from "@/lib/customerAuth";
import { normalizeLogtoRedirectPath } from "@/server/auth/logto/helpers";

const SESSION_COOKIES = [
    "tikprofil_session",
    "tikprofil_owner_session",
    "tikprofil_staff_session",
    "tikprofil_impersonate",
    "tikprofil_logto_auth",
    CUSTOMER_SESSION_COOKIE,
];

async function parseBody(request: Request): Promise<{ postLogoutRedirect?: string } | null> {
    try {
        return await request.json() as { postLogoutRedirect?: string };
    } catch {
        return null;
    }
}

export async function POST(request: Request) {
    try {
        const [adminSession, businessSession, customerSession, body] = await Promise.all([
            getAdminSession(),
            getBusinessSession(),
            getCustomerSession(),
            parseBody(request),
        ]);
        const cookieStore = await cookies();
        const shouldLogOutFromLogto = adminSession?.authProvider === "logto"
            || businessSession?.authProvider === "logto"
            || customerSession?.authProvider === "logto";
        const postLogoutRedirect = normalizeLogtoRedirectPath(
            body?.postLogoutRedirect,
            adminSession?.authProvider === "logto"
                ? "/webintoshi"
                : customerSession?.authProvider === "logto"
                    ? "/kesfet"
                    : "/giris-yap",
        );

        for (const cookieName of SESSION_COOKIES) {
            cookieStore.delete(cookieName);
        }

        return NextResponse.json({
            message: "Cikis basarili",
            redirectUrl: shouldLogOutFromLogto
                ? `/api/auth/logto/sign-out?postLogoutRedirect=${encodeURIComponent(postLogoutRedirect)}`
                : null,
            success: true,
        });
    } catch (error) {
        console.error("Logout error:", error);
        return NextResponse.json(
            { error: "Cikis yapilamadi" },
            { status: 500 },
        );
    }
}
