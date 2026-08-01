import { createHash, randomBytes } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { type JWTPayload } from "jose";
import { buildLogtoAuthorizationUrl, normalizeLogtoActorHint, normalizeLogtoRedirectPath, selectPreferredLogtoActor } from "./helpers";
import { createLogtoCustomerProvisioningService } from "./customerProvisioning";
import { createQueryBackedLogtoCustomerProvisioningRepository } from "./customerProvisioningRepository";
import { fetchLogtoOidcMetadata, exchangeLogtoAuthorizationCode, verifyLogtoIdToken } from "./oidc";
import { resolveLogtoIdentity } from "./repository";
import {
    clearAllLocalSessionCookies,
    clearPendingLogtoAuthStateCookie,
    createLogtoBusinessOnboardingToken,
    createLogtoBusinessSessionToken,
    createLogtoCustomerSessionToken,
    createLogtoPlatformAdminSessionToken,
    createPendingLogtoAuthStateToken,
    setBusinessOwnerSessionCookie,
    setBusinessOnboardingCookie,
    setBusinessStaffSessionCookie,
    setCustomerSessionCookie,
    setPendingLogtoAuthStateCookie,
    setPlatformAdminSessionCookie,
    verifyPendingLogtoAuthStateToken,
} from "./session";
import { isLogtoAuthEnabled, resolveLogtoConfig } from "./config";

function encodeBase64Url(buffer: Buffer): string {
    return buffer
        .toString("base64")
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/g, "");
}

function createRandomBase64Url(size = 32): string {
    return encodeBase64Url(randomBytes(size));
}

function createCodeChallenge(codeVerifier: string): string {
    return encodeBase64Url(createHash("sha256").update(codeVerifier).digest());
}

function createAbsoluteUrl(baseUrl: string, path: string): string {
    return new URL(path, `${baseUrl}/`).toString();
}

function getLoginPath(actorHint: "auto" | "platform_admin" | "business" | "customer"): string {
    return actorHint === "platform_admin" ? "/webintoshi" : "/giris-yap";
}

function getDefaultCallbackPath(actorHint: "auto" | "platform_admin" | "business" | "customer"): string {
    if (actorHint === "platform_admin") {
        return "/dashboard";
    }

    if (actorHint === "customer") {
        return "/kesfet";
    }

    return "/panel/profile";
}

function buildAuthErrorRedirect(baseUrl: string, loginPath: string, errorCode: string): NextResponse {
    const loginUrl = new URL(loginPath, `${baseUrl}/`);
    loginUrl.searchParams.set("authError", errorCode);
    return NextResponse.redirect(loginUrl);
}

function getStringClaim(payload: JWTPayload, key: string): string | null {
    const value = payload[key];
    return typeof value === "string" && value.trim() ? value.trim() : null;
}

function getStringArrayClaim(payload: JWTPayload, key: string): string[] {
    const value = payload[key];
    if (!Array.isArray(value)) {
        return [];
    }

    return value.filter((entry): entry is string => typeof entry === "string" && entry.trim().length > 0);
}

export async function beginLogtoSignIn(request: NextRequest): Promise<NextResponse> {
    const actorHint = normalizeLogtoActorHint(request.nextUrl.searchParams.get("actor"));
    const loginPath = getLoginPath(actorHint);
    const callbackUrl = normalizeLogtoRedirectPath(
        request.nextUrl.searchParams.get("callbackUrl"),
        getDefaultCallbackPath(actorHint),
    );

    if (!isLogtoAuthEnabled()) {
        return NextResponse.redirect(new URL(loginPath, request.url));
    }

    const config = resolveLogtoConfig(request.url);
    if (!config) {
        return buildAuthErrorRedirect(new URL(request.url).origin, loginPath, "logto_config_missing");
    }

    try {
        const redirectUri = createAbsoluteUrl(config.baseUrl, "/api/auth/logto/callback");
        const state = createRandomBase64Url(24);
        const nonce = createRandomBase64Url(24);
        const codeVerifier = createRandomBase64Url(48);
        const codeChallenge = createCodeChallenge(codeVerifier);
        const stateToken = await createPendingLogtoAuthStateToken(config.cookieSecret, {
            actorHint,
            callbackUrl,
            codeVerifier,
            nonce,
            returnToLoginPath: loginPath,
            state,
        });
        const metadata = await fetchLogtoOidcMetadata(config.endpoint);
        const redirectUrl = buildLogtoAuthorizationUrl({
            appId: config.appId,
            authorizationEndpoint: metadata.authorization_endpoint,
            codeChallenge,
            nonce,
            redirectUri,
            scopes: config.scopes,
            state,
        });
        const response = NextResponse.redirect(redirectUrl);

        setPendingLogtoAuthStateCookie(response, stateToken);
        return response;
    } catch (error) {
        console.error("Logto sign-in initialization error:", error);
        return buildAuthErrorRedirect(config.baseUrl, loginPath, "logto_discovery_failed");
    }
}

export async function completeLogtoSignIn(request: NextRequest): Promise<NextResponse> {
    const config = resolveLogtoConfig(request.url);
    const fallbackBaseUrl = new URL(request.url).origin;

    if (!config) {
        return buildAuthErrorRedirect(fallbackBaseUrl, "/giris-yap", "logto_config_missing");
    }

    const pendingState = await verifyPendingLogtoAuthStateToken(
        config.cookieSecret,
        request.cookies.get("tikprofil_logto_auth")?.value,
    );

    if (!pendingState) {
        return buildAuthErrorRedirect(config.baseUrl, "/giris-yap", "logto_state_missing");
    }

    const errorCode = request.nextUrl.searchParams.get("error");
    if (errorCode) {
        const response = buildAuthErrorRedirect(config.baseUrl, pendingState.returnToLoginPath, `logto_${errorCode}`);
        clearPendingLogtoAuthStateCookie(response);
        return response;
    }

    const code = request.nextUrl.searchParams.get("code");
    const state = request.nextUrl.searchParams.get("state");

    if (!code || !state || state !== pendingState.state) {
        const response = buildAuthErrorRedirect(config.baseUrl, pendingState.returnToLoginPath, "logto_state_invalid");
        clearPendingLogtoAuthStateCookie(response);
        return response;
    }

    try {
        const redirectUri = createAbsoluteUrl(config.baseUrl, "/api/auth/logto/callback");
        const tokenSet = await exchangeLogtoAuthorizationCode(config, {
            code,
            codeVerifier: pendingState.codeVerifier,
            redirectUri,
        });
        const claims = await verifyLogtoIdToken(config, tokenSet.id_token);

        if (getStringClaim(claims, "nonce") !== pendingState.nonce) {
            throw new Error("Logto nonce mismatch");
        }

        const logtoSub = getStringClaim(claims, "sub");
        if (!logtoSub) {
            throw new Error("Logto subject is missing");
        }

        const email = getStringClaim(claims, "email");
        const name = getStringClaim(claims, "name");
        const username = getStringClaim(claims, "username") ?? getStringClaim(claims, "preferred_username");
        const logtoRoles = getStringArrayClaim(claims, "roles");

        if (pendingState.actorHint === "customer") {
            const customerProvisioningService = createLogtoCustomerProvisioningService({
                repository: createQueryBackedLogtoCustomerProvisioningRepository(),
            });
            const customerIdentity = await customerProvisioningService.provision({
                email,
                logtoSub,
                name,
                username,
            });
            const redirectTarget = createAbsoluteUrl(
                config.baseUrl,
                normalizeLogtoRedirectPath(
                    pendingState.callbackUrl,
                    getDefaultCallbackPath(pendingState.actorHint),
                ),
            );
            const response = NextResponse.redirect(redirectTarget);

            clearPendingLogtoAuthStateCookie(response);
            clearAllLocalSessionCookies(response);

            const customerToken = await createLogtoCustomerSessionToken({
                appUserId: customerIdentity.appUser.id,
                authProvider: "logto",
                displayName: customerIdentity.displayName ?? undefined,
                email: customerIdentity.email ?? undefined,
                logtoRoles,
                logtoSub,
                role: "customer",
            });

            setCustomerSessionCookie(response, customerToken);
            return response;
        }

        let resolvedIdentity = await resolveLogtoIdentity({
            email,
            logtoRoles,
            logtoSub,
            name,
            username,
        });

        if (!resolvedIdentity && pendingState.actorHint === "business") {
            const provisioningService = createLogtoCustomerProvisioningService({
                repository: createQueryBackedLogtoCustomerProvisioningRepository(),
            });
            await provisioningService.provision({
                email,
                logtoSub,
                name,
                provisioningSource: "logto_business_self_registration",
                username,
            });
            resolvedIdentity = await resolveLogtoIdentity({
                email,
                logtoRoles,
                logtoSub,
                name,
                username,
            });
        }

        if (!resolvedIdentity) {
            const response = buildAuthErrorRedirect(config.baseUrl, pendingState.returnToLoginPath, "logto_mapping_not_found");
            clearPendingLogtoAuthStateCookie(response);
            return response;
        }

        if (
            pendingState.actorHint === "business"
            && resolvedIdentity.memberships.length === 0
            && !resolvedIdentity.platformAdmin
        ) {
            const response = NextResponse.redirect(createAbsoluteUrl(config.baseUrl, "/isletme-kaydi"));
            const onboardingToken = await createLogtoBusinessOnboardingToken({
                appUserId: resolvedIdentity.appUserId,
                displayName: resolvedIdentity.displayName ?? name ?? undefined,
                email: resolvedIdentity.email ?? email ?? undefined,
                logtoSub,
            });

            clearPendingLogtoAuthStateCookie(response);
            clearAllLocalSessionCookies(response);
            setBusinessOnboardingCookie(response, onboardingToken);
            return response;
        }

        const selectedActor = selectPreferredLogtoActor({
            customer: resolvedIdentity
                ? {
                    appUserId: resolvedIdentity.appUserId,
                }
                : null,
            memberships: resolvedIdentity.memberships,
            platformAdmin: resolvedIdentity.platformAdmin
                ? { username: resolvedIdentity.platformAdmin.username }
                : null,
        }, pendingState.actorHint);

        if (!selectedActor) {
            const response = buildAuthErrorRedirect(config.baseUrl, pendingState.returnToLoginPath, "logto_access_denied");
            clearPendingLogtoAuthStateCookie(response);
            return response;
        }

        const redirectTarget = createAbsoluteUrl(
            config.baseUrl,
            normalizeLogtoRedirectPath(
                pendingState.callbackUrl,
                getDefaultCallbackPath(pendingState.actorHint),
            ),
        );
        const response = NextResponse.redirect(redirectTarget);

        clearPendingLogtoAuthStateCookie(response);
        clearAllLocalSessionCookies(response);

        if (selectedActor.kind === "platform_admin" && resolvedIdentity.platformAdmin) {
            const adminToken = await createLogtoPlatformAdminSessionToken({
                appUserId: resolvedIdentity.platformAdmin.appUserId,
                authProvider: "logto",
                displayName: resolvedIdentity.platformAdmin.displayName ?? undefined,
                email: resolvedIdentity.platformAdmin.email ?? undefined,
                logtoRoles,
                logtoSub,
                username: resolvedIdentity.platformAdmin.username,
            });

            setPlatformAdminSessionCookie(response, adminToken);
            return response;
        }

        if (selectedActor.kind === "business") {
            const membership = resolvedIdentity.memberships.find(
                (item) => item.businessId === selectedActor.value.businessId && item.role === selectedActor.value.role,
            );

            if (!membership) {
                const deniedResponse = buildAuthErrorRedirect(config.baseUrl, pendingState.returnToLoginPath, "logto_access_denied");
                clearPendingLogtoAuthStateCookie(deniedResponse);
                clearAllLocalSessionCookies(deniedResponse);
                return deniedResponse;
            }

            const businessToken = await createLogtoBusinessSessionToken({
                appUserId: membership.appUserId,
                authProvider: "logto",
                businessId: membership.businessId,
                businessName: membership.businessName,
                businessSlug: membership.businessSlug,
                email: membership.email ?? resolvedIdentity.email ?? undefined,
                enabledModules: membership.enabledModules,
                isStaff: membership.role !== "owner",
                logtoRoles,
                logtoSub,
                permissions: membership.permissions,
                role: membership.role,
                staffId: membership.staffId,
            });

            if (membership.role === "owner") {
                setBusinessOwnerSessionCookie(response, businessToken);
            } else {
                setBusinessStaffSessionCookie(response, businessToken);
            }

            return response;
        }

        const deniedResponse = buildAuthErrorRedirect(config.baseUrl, pendingState.returnToLoginPath, "logto_access_denied");
        clearPendingLogtoAuthStateCookie(deniedResponse);
        clearAllLocalSessionCookies(deniedResponse);
        return deniedResponse;
    } catch (error) {
        console.error("Logto callback error:", error);
        const response = buildAuthErrorRedirect(config.baseUrl, pendingState.returnToLoginPath, "logto_callback_failed");
        clearPendingLogtoAuthStateCookie(response);
        clearAllLocalSessionCookies(response);
        return response;
    }
}
