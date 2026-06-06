import { type NextRequest, NextResponse } from "next/server";
import { buildLogtoEndSessionUrl, normalizeLogtoRedirectPath } from "@/server/auth/logto/helpers";
import { resolveLogtoConfig } from "@/server/auth/logto/config";
import { fetchLogtoOidcMetadata } from "@/server/auth/logto/oidc";
import { clearAllLocalSessionCookies, clearPendingLogtoAuthStateCookie } from "@/server/auth/logto/session";

export async function GET(request: NextRequest) {
    const config = resolveLogtoConfig(request.url);
    const baseUrl = config?.baseUrl ?? new URL(request.url).origin;
    const postLogoutRedirectPath = normalizeLogtoRedirectPath(
        request.nextUrl.searchParams.get("postLogoutRedirect"),
        "/giris-yap",
    );

    if (!config) {
        const response = NextResponse.redirect(new URL(postLogoutRedirectPath, `${baseUrl}/`));
        clearPendingLogtoAuthStateCookie(response);
        clearAllLocalSessionCookies(response);
        return response;
    }

    try {
        const metadata = await fetchLogtoOidcMetadata(config.endpoint);
        const redirectUrl = buildLogtoEndSessionUrl({
            appId: config.appId,
            endSessionEndpoint: metadata.end_session_endpoint,
            postLogoutRedirectUri: new URL(postLogoutRedirectPath, `${config.baseUrl}/`).toString(),
        });
        const response = NextResponse.redirect(redirectUrl);

        clearPendingLogtoAuthStateCookie(response);
        clearAllLocalSessionCookies(response);
        return response;
    } catch (error) {
        console.error("Logto sign-out redirect error:", error);
        const response = NextResponse.redirect(new URL(postLogoutRedirectPath, `${config.baseUrl}/`));
        clearPendingLogtoAuthStateCookie(response);
        clearAllLocalSessionCookies(response);
        return response;
    }
}
