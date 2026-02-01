/**
 * IRON DOME + OWASP - Unified Login Route
 * Supports both Owner and Staff login from the same form
 * Uses bcrypt, Zod validation, and rate limiting
 */

import { NextResponse } from "next/server";
import { cookies, headers } from "next/headers";
import { logActivity } from "@/lib/services/auditService";
import { verifyPassword, isLegacyHash } from "@/lib/password";
import { loginSchema } from "@/lib/validators";
import { getSessionSecret } from "@/lib/env";
import { checkRateLimit, recordSuccess } from "@/lib/rateLimit";
import { logUserLogin } from "@/lib/systemLogs";
import { SignJWT } from "jose";
import { verifyPassword as verifyStaffPassword, hashPassword as hashStaffPassword } from "@/lib/services/staffService";

// Session cookies
const OWNER_COOKIE = "tikprofil_owner_session";
const STAFF_COOKIE = "tikprofil_staff_session";
const SESSION_DURATION = 7 * 24 * 60 * 60; // 7 days in seconds

export async function POST(request: Request) {
    try {
        // Get client IP for rate limiting and logging
        const headersList = await headers();
        const ip = headersList.get("x-forwarded-for")?.split(",")[0]?.trim() ||
            headersList.get("x-real-ip") ||
            "unknown";

        // OWASP: Rate limiting check
        const rateCheck = checkRateLimit(ip, "login");
        if (!rateCheck.allowed) {
            return NextResponse.json(
                { success: false, message: rateCheck.message },
                {
                    status: 429,
                    headers: {
                        'Retry-After': String(rateCheck.retryAfter || 3600),
                        'X-RateLimit-Remaining': '0'
                    }
                }
            );
        }

        const body = await request.json();

        // IRON DOME: Validate input with Zod
        const validation = loginSchema.safeParse(body);
        if (!validation.success) {
            return NextResponse.json(
                { success: false, message: "E-posta ve şifre gerekli" },
                { status: 400 }
            );
        }

        const { email, password } = validation.data;

        // Import REST API functions
        const { getCollectionREST, getDocumentREST } = await import('@/lib/documentStore');

        // ==========================================
        // STEP 1: Try Owner Login First
        // ==========================================
        const owners = await getCollectionREST("business_owners");
        const ownerData = owners.find(o => (o.email as string)?.toLowerCase() === email);

        if (ownerData) {
            const storedHash = ownerData.password_hash as string;

            // IRON DOME: Check if using legacy Base64 password
            if (isLegacyHash(storedHash)) {
                const { verified } = await verifyPassword(password, storedHash);
                if (verified) {
                    return NextResponse.json({
                        success: false,
                        message: "Güvenlik güncellemesi nedeniyle şifrenizi sıfırlamanız gerekiyor",
                        requiresReset: true,
                        email: email
                    }, { status: 403 });
                }
            } else {
                // IRON DOME: Verify with bcrypt
                const { verified } = await verifyPassword(password, storedHash);
                if (verified) {
                    // Owner login successful!
                    let businessName = ownerData.full_name as string || "İşletmem";
                    let businessSlug = "";
                    let enabledModules: string[] = ["restaurant"];

                    try {
                        const businessDoc = await getDocumentREST("businesses", ownerData.business_id as string);
                        if (businessDoc) {
                            businessName = (businessDoc.name as string) || businessName;
                            businessSlug = (businessDoc.slug as string) || "";
                            enabledModules = (businessDoc.modules as string[]) || [];
                        }
                    } catch (e) {
                        console.error("Error fetching business:", e);
                    }

                    // Create JWT session token for OWNER
                    const secret = new TextEncoder().encode(getSessionSecret());
                    const sessionToken = await new SignJWT({
                        email: email,
                        role: "owner",
                        businessId: ownerData.business_id as string,
                        businessName: businessName,
                        businessSlug: businessSlug,
                        enabledModules: enabledModules,
                        isStaff: false,
                    })
                        .setProtectedHeader({ alg: "HS256" })
                        .setIssuedAt()
                        .setExpirationTime("7d")
                        .sign(secret);

                    // Clear rate limit on successful login
                    recordSuccess(ip, "login");

                    // Log successful login
                    logActivity({
                        actor_id: ownerData.business_id as string,
                        actor_name: businessName,
                        action_type: "LOGIN",
                        metadata: { email: email, type: "owner" },
                        ip_address: ip,
                    }).catch(err => console.error("Audit log failed:", err));

                    logUserLogin(email, businessName);

                    const response = NextResponse.json({
                        success: true,
                        message: "Giriş başarılı",
                        redirect: "/panel",
                        userType: "owner",
                    });

                    response.cookies.set(OWNER_COOKIE, sessionToken, {
                        httpOnly: true,
                        secure: process.env.NODE_ENV === "production",
                        sameSite: "lax",
                        maxAge: SESSION_DURATION,
                        path: "/",
                    });

                    return response;
                }
            }
        }

        // ==========================================
        // STEP 2: Try Staff Login (single pass)
        // ==========================================

        const allStaff = await getCollectionREST("business_staff");
        const emailLower = email.toLowerCase();
        const staffCandidate = allStaff.find(staff => ((staff.email as string) || "").toLowerCase() === emailLower);

        if (staffCandidate) {
            const staffMember = {
                id: (staffCandidate.id as string) || "",
                business_id: (staffCandidate.business_id as string) || (staffCandidate.businessId as string) || "",
                email: (staffCandidate.email as string) || "",
                phone: (staffCandidate.phone as string) || "",
                name: (staffCandidate.name as string) || "",
                role: (staffCandidate.role as string) || "staff",
                permissions: (staffCandidate.permissions as string[]) || [],
                is_active: (staffCandidate.is_active as boolean) ?? (staffCandidate.isActive as boolean) ?? true,
                password_hash: (staffCandidate.password_hash as string) || (staffCandidate.passwordHash as string) || "",
            };

            if (staffMember.is_active) {
                const staffPasswordCheck = await verifyStaffPassword(password, staffMember.password_hash);
                if (staffPasswordCheck.verified) {
                    if (staffPasswordCheck.isLegacy) {
                        try {
                            const newHash = await hashStaffPassword(password);
                            await (await import("@/lib/documentStore")).updateDocumentREST("business_staff", staffMember.id, {
                                password_hash: newHash,
                                updated_at: new Date().toISOString(),
                            });
                        } catch (error) {
                            console.warn("Staff password migration failed:", error);
                        }
                    }

                    const businessId = staffMember.business_id;
                    let businessName = "İşletme";
                    let businessSlug = "";
                    let enabledModules: string[] = [];

                    try {
                        const business = await getDocumentREST("businesses", businessId);
                        if (business) {
                            businessName = (business.name as string) || businessName;
                            businessSlug = (business.slug as string) || "";
                            enabledModules = (business.modules as string[]) || [];
                        }
                    } catch (e) {
                        console.error("Error fetching business:", e);
                    }

                    const secret = new TextEncoder().encode(getSessionSecret());
                    const sessionToken = await new SignJWT({
                        staffId: staffMember.id,
                        email: staffMember.email,
                        role: staffMember.role,
                        permissions: staffMember.permissions,
                        businessId: businessId,
                        businessName: businessName,
                        businessSlug: businessSlug,
                        enabledModules: enabledModules,
                        isStaff: true,
                    })
                        .setProtectedHeader({ alg: "HS256" })
                        .setIssuedAt()
                        .setExpirationTime("7d")
                        .sign(secret);

                    recordSuccess(ip, "login");

                    logActivity({
                        actor_id: staffMember.id,
                        actor_name: staffMember.name,
                        action_type: "STAFF_LOGIN",
                        metadata: { email: email, businessId, role: staffMember.role },
                        ip_address: ip,
                    }).catch(err => console.error("Audit log failed:", err));

                    logUserLogin(email, `${businessName} (Staff)`);

                    const response = NextResponse.json({
                        success: true,
                        message: "Giriş başarılı",
                        redirect: "/panel",
                        userType: "staff",
                    });

                    response.cookies.set(STAFF_COOKIE, sessionToken, {
                        httpOnly: true,
                        secure: process.env.NODE_ENV === "production",
                        sameSite: "lax",
                        maxAge: SESSION_DURATION,
                        path: "/",
                    });

                    return response;
                }
            }
        }

        // ==========================================
        // STEP 3: No match - return error
        // ==========================================
        return NextResponse.json(
            { success: false, message: "E-posta veya şifre hatalı" },
            { status: 401 }
        );
    } catch (error) {
        console.error("Login error:", error);
        return NextResponse.json(
            { success: false, message: "Bir hata oluştu" },
            { status: 500 }
        );
    }
}
