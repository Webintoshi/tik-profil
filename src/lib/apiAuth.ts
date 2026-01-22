/**
 * API Permission Helper
 * 
 * Standardized permission checking for all API routes
 * Usage: await requirePermission(request, "restaurant.menu")
 */

import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { hasPermission, StaffRole } from "./permissions";
import { getSessionSecretBytes } from "./env";

// ============================================
// TYPES
// ============================================

export interface SessionUser {
    businessId: string;
    businessName: string;
    businessSlug: string;
    email: string;
    isStaff: boolean;
    staffId?: string;
    role: StaffRole;
    permissions: string[];
    enabledModules: string[];
}

export interface PermissionCheckResult {
    authorized: boolean;
    user?: SessionUser;
    error?: string;
}

// ============================================
// SECRETS
// ============================================

// Staff JWT Secret (must match staff-login route - uses SESSION_SECRET)
const STAFF_JWT_SECRET = getSessionSecretBytes();

// Owner JWT Secret (must match env.ts fallback)
const OWNER_JWT_SECRET = getSessionSecretBytes();

/**
 * Get current session from Cookies (Supports both Owner and Staff)
 */
export async function getSession(): Promise<SessionUser | null> {
    try {
        const cookieStore = await cookies();

        // 1. Check for Owner Session
        const ownerToken = cookieStore.get("tikprofil_owner_session")?.value;
        if (ownerToken) {
            try {
                const { payload } = await jwtVerify(ownerToken, OWNER_JWT_SECRET);

                return {
                    businessId: payload.businessId as string,
                    businessName: payload.businessName as string,
                    businessSlug: payload.businessSlug as string,
                    email: payload.email as string,
                    isStaff: false,
                    role: "owner",
                    permissions: [], // Owner has implicit access to everything
                    enabledModules: (payload.enabledModules as string[]) || [],
                };
            } catch (err) {
                // Invalid owner token, fall through to check staff token
                console.warn("Invalid owner token:", err);
            }
        }

        // 2. Check for Staff Session
        const staffToken = cookieStore.get("tikprofil_staff_session")?.value;
        if (staffToken) {
            try {
                const { payload } = await jwtVerify(staffToken, STAFF_JWT_SECRET);

                return {
                    businessId: payload.businessId as string,
                    businessName: payload.businessName as string,
                    businessSlug: payload.businessSlug as string,
                    email: payload.email as string,
                    isStaff: payload.isStaff as boolean || false,
                    staffId: payload.staffId as string || undefined,
                    role: (payload.role as StaffRole) || "staff",
                    permissions: (payload.permissions as string[]) || [],
                    enabledModules: (payload.enabledModules as string[]) || [],
                };
            } catch (err) {
                console.warn("Invalid staff token:", err);
            }
        }

        return null;
    } catch (error) {
        console.error("Session verification failed:", error);
        return null;
    }
}

/**
 * Check if current user has a specific permission
 * Returns unauthorized response if not
 * 
 * Usage in API route:
 * ```
 * const check = await requirePermission("restaurant.menu");
 * if (!check.authorized) {
 *   return NextResponse.json({ error: check.error }, { status: 403 });
 * }
 * const user = check.user!;
 * ```
 */
export async function requirePermission(
    requiredPermission: string
): Promise<PermissionCheckResult> {
    const user = await getSession();

    if (!user) {
        return {
            authorized: false,
            error: "Oturum bulunamadı. Lütfen tekrar giriş yapın."
        };
    }

    // Owner has all permissions
    if (user.role === "owner") {
        return { authorized: true, user };
    }

    // Check permission
    if (!hasPermission(user.permissions, user.role, requiredPermission)) {
        return {
            authorized: false,
            user,
            error: "Bu işlem için yetkiniz bulunmuyor."
        };
    }

    return { authorized: true, user };
}

/**
 * Check if user is authenticated (any role)
 */
export async function requireAuth(): Promise<PermissionCheckResult> {
    const user = await getSession();

    if (!user) {
        return {
            authorized: false,
            error: "Oturum bulunamadı. Lütfen tekrar giriş yapın."
        };
    }

    return { authorized: true, user };
}

/**
 * Check if user has minimum role
 */
export async function requireRole(
    minRole: StaffRole
): Promise<PermissionCheckResult> {
    const user = await getSession();

    if (!user) {
        return {
            authorized: false,
            error: "Oturum bulunamadı. Lütfen tekrar giriş yapın."
        };
    }

    const roleHierarchy: Record<StaffRole, number> = {
        owner: 3,
        manager: 2,
        staff: 1,
    };

    if (roleHierarchy[user.role] < roleHierarchy[minRole]) {
        return {
            authorized: false,
            user,
            error: "Bu işlem için yetkiniz bulunmuyor."
        };
    }

    return { authorized: true, user };
}

/**
 * Check if user belongs to specific business
 */
export async function requireBusiness(
    businessId: string
): Promise<PermissionCheckResult> {
    const user = await getSession();

    if (!user) {
        return {
            authorized: false,
            error: "Oturum bulunamadı."
        };
    }

    if (user.businessId !== businessId) {
        console.warn(`Business mismatch: User ${user.businessId} tried to access ${businessId}`);
        return {
            authorized: false,
            user,
            error: "Bu işletmeye erişim yetkiniz yok."
        };
    }

    return { authorized: true, user };
}
