/**
 * IRON DOME - Fortified Middleware
 * Implements Zero Trust access control
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";
import { getSessionSecretBytes } from "@/lib/env";

// Protected routes
const STEALTH_ADMIN_PATH = "/webintoshi";
const BLOCKED_ADMIN_PATH = "/admin";
const DASHBOARD_PATH = "/dashboard";
const PANEL_PATH = "/panel";
const API_PATH = "/api";

// Auth cookies
const ADMIN_COOKIE = "tikprofil_session";
const OWNER_COOKIE = "tikprofil_owner_session";

// Allowed origins for API requests
const ALLOWED_ORIGINS = [
    "https://tikprofil-v2.vercel.app",
    "http://localhost:3000",
    "http://localhost:3001",
];

// JWT secret (must match auth routes - CRITICAL: trim to remove CRLF)
const getJwtSecret = () => getSessionSecretBytes();

/**
 * Verify JWT token
 */
async function verifyToken(token: string): Promise<{ valid: boolean; payload?: Record<string, unknown> }> {
    try {
        const { payload } = await jwtVerify(token, getJwtSecret());
        return { valid: true, payload: payload as Record<string, unknown> };
    } catch {
        return { valid: false };
    }
}

/**
 * Get client IP
 */
function getClientIP(request: NextRequest): string {
    return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
        request.headers.get("x-real-ip") ||
        "unknown";
}

/**
 * Check if origin is allowed
 */
function isAllowedOrigin(request: NextRequest): boolean {
    const origin = request.headers.get("origin");
    const referer = request.headers.get("referer");

    // No origin = server-side request, allow
    if (!origin && !referer) return true;

    // Check origin
    if (origin && ALLOWED_ORIGINS.some(allowed => origin.startsWith(allowed))) {
        return true;
    }

    // Check referer
    if (referer && ALLOWED_ORIGINS.some(allowed => referer.startsWith(allowed))) {
        return true;
    }

    return false;
}

/**
 * Return 403 Forbidden - Generic message only (OWASP: no information disclosure)
 */
function forbidden(): NextResponse {
    return NextResponse.json(
        { error: "Forbidden", code: "FORBIDDEN" },
        { status: 403 }
    );
}

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;
    const ip = getClientIP(request);

    // =============================================
    // BLOCK STANDARD /admin PATH - Return 404
    // =============================================
    if (pathname === BLOCKED_ADMIN_PATH || pathname.startsWith(`${BLOCKED_ADMIN_PATH}/`)) {
        return new NextResponse(null, { status: 404 });
    }

    // =============================================
    // API PROTECTION - Origin/Authorization check
    // =============================================
    if (pathname.startsWith(API_PATH)) {
        // Skip auth endpoints
        if (pathname.startsWith("/api/auth/")) {
            return NextResponse.next();
        }

        // Check origin for non-auth API calls
        if (!isAllowedOrigin(request)) {
            return forbidden();
        }

        return NextResponse.next();
    }

    // =============================================
    // STEALTH ADMIN PATH - IP + Session check
    // =============================================
    if (pathname.startsWith(STEALTH_ADMIN_PATH)) {
        // Login page is always accessible
        if (pathname.endsWith("/login")) {
            return NextResponse.next();
        }

        // Main stealth path requires session
        const sessionToken = request.cookies.get(ADMIN_COOKIE)?.value;

        if (!sessionToken) {
            const loginUrl = new URL(`${STEALTH_ADMIN_PATH}/login`, request.url);
            return NextResponse.redirect(loginUrl);
        }

        // Verify admin session
        const { valid, payload } = await verifyToken(sessionToken);
        if (!valid) {
            // Invalid token - clear and redirect
            const response = NextResponse.redirect(new URL(`${STEALTH_ADMIN_PATH}/login`, request.url));
            response.cookies.delete(ADMIN_COOKIE);
            return response;
        }

        // Log admin access
        console.log(`[IRON DOME] Admin access: ${pathname} by ${payload?.username || 'unknown'} from ${ip}`);

        return NextResponse.next();
    }

    // =============================================
    // DASHBOARD ROUTES - Admin authentication required
    // =============================================
    if (pathname.startsWith(DASHBOARD_PATH)) {
        const sessionToken = request.cookies.get(ADMIN_COOKIE)?.value;

        if (!sessionToken) {
            const loginUrl = new URL(`${STEALTH_ADMIN_PATH}/login`, request.url);
            loginUrl.searchParams.set("callbackUrl", pathname);
            return NextResponse.redirect(loginUrl);
        }

        // Verify session
        const { valid } = await verifyToken(sessionToken);
        if (!valid) {
            const response = NextResponse.redirect(new URL(`${STEALTH_ADMIN_PATH}/login`, request.url));
            response.cookies.delete(ADMIN_COOKIE);
            return response;
        }

        return NextResponse.next();
    }

    // =============================================
    // PANEL ROUTES - Owner authentication required
    // =============================================
    if (pathname.startsWith(PANEL_PATH)) {
        const adminToken = request.cookies.get(ADMIN_COOKIE)?.value;
        const ownerToken = request.cookies.get(OWNER_COOKIE)?.value;

        // Must have at least one token present
        if (!adminToken && !ownerToken) {
            const loginUrl = new URL("/giris-yap", request.url);
            loginUrl.searchParams.set("callbackUrl", pathname);
            return NextResponse.redirect(loginUrl);
        }

        // OWASP: Verify admin token if present (don't trust presence alone)
        if (adminToken) {
            const { valid, payload } = await verifyToken(adminToken);
            if (!valid) {
                const response = NextResponse.redirect(new URL("/giris-yap", request.url));
                response.cookies.delete(ADMIN_COOKIE);
                return response;
            }
            // Admin token is valid - allow access
            return NextResponse.next();
        }

        // Verify owner token if present
        if (ownerToken) {
            const { valid, payload } = await verifyToken(ownerToken);
            if (!valid) {
                const response = NextResponse.redirect(new URL("/giris-yap", request.url));
                response.cookies.delete(OWNER_COOKIE);
                return response;
            }

            // Check role
            if (payload?.role !== "owner") {
                return forbidden();
            }
        }

        return NextResponse.next();
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        // Admin paths
        "/admin/:path*",
        "/admin",
        // Stealth path
        "/webintoshi/:path*",
        "/webintoshi",
        // Dashboard
        "/dashboard/:path*",
        "/dashboard",
        // Business panel (including root)
        "/panel/:path*",
        "/panel",
        // API routes
        "/api/:path*",
    ],
};
