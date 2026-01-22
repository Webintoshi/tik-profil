/**
 * IRON DOME + OWASP - Secure Registration Route
 * Uses bcrypt, Zod validation, rate limiting, and honeypot protection
 */

import { NextResponse } from "next/server";
import { cookies, headers } from "next/headers";
import { hashPassword } from "@/lib/password";
import { registerSchema, checkHoneypot } from "@/lib/validators";
import { getSessionSecret } from "@/lib/env";
import { checkRateLimit, recordSuccess } from "@/lib/rateLimit";
import { SignJWT } from "jose";

// Owner session cookie
const OWNER_COOKIE = "tikprofil_owner_session";
const SESSION_DURATION = 7 * 24 * 60 * 60; // 7 days in seconds

export async function POST(request: Request) {
    try {
        // Get client IP for rate limiting
        const headersList = await headers();
        const ip = headersList.get("x-forwarded-for")?.split(",")[0]?.trim() ||
            headersList.get("x-real-ip") ||
            "unknown";

        // OWASP: Rate limiting check
        const rateCheck = checkRateLimit(ip, "register");
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

        // OWASP: Honeypot check - bots fill hidden fields
        if (body.website && !checkHoneypot(body.website)) {
            console.warn(`[OWASP] Bot detected from IP: ${ip}`);
            // Return success to fool the bot, but don't actually register
            return NextResponse.json({
                success: true,
                message: "Hesap oluşturuldu",
                redirect: "/panel",
                businessId: undefined // Added for testing/frontend context (will be undefined here)
            });
        }

        // IRON DOME: Validate input with Zod
        const validation = registerSchema.safeParse(body);
        if (!validation.success) {
            const errors = validation.error.issues.map(e => e.message).join(', ');
            return NextResponse.json(
                { success: false, message: errors },
                { status: 400 }
            );
        }

        const {
            fullName,
            email,
            password,
            businessName,
            businessSlug,
            businessPhone,
            industryId,
            industryLabel,
            planId
        } = validation.data;

        // Import REST API functions
        const { getCollectionREST, createDocumentREST } = await import('@/lib/documentStore');

        // Check if email already exists
        const owners = await getCollectionREST("business_owners");
        const emailExists = owners.some(o => (o.email as string)?.toLowerCase() === email);
        if (emailExists) {
            return NextResponse.json(
                { success: false, message: "Bu e-posta zaten kayıtlı" },
                { status: 400 }
            );
        }

        // Check if slug already exists
        const businesses = await getCollectionREST("businesses");
        const slugExists = businesses.some(b => (b.slug as string)?.toLowerCase() === businessSlug);
        if (slugExists) {
            return NextResponse.json(
                { success: false, message: "Bu profil adresi zaten alınmış" },
                { status: 400 }
            );
        }

        // IRON DOME: Hash password with bcrypt (12 rounds)
        const passwordHash = await hashPassword(password);

        // Get modules from industry definition (Bug Fix: Use actual industry modules)
        let industryModules: string[] = [];
        if (industryId) {
            try {
                // Try to get the industry definition from document store
                const industryDefinitions = await getCollectionREST("industry_definitions");
                const industryDef = industryDefinitions.find(
                    (def) => def.slug === industryId || def.id === industryId
                );
                if (industryDef && Array.isArray(industryDef.modules) && industryDef.modules.length > 0) {
                    industryModules = industryDef.modules as string[];
                }
            } catch (error) {
                console.error("[Register] Failed to fetch industry modules:", error);
            }
        }

        // Fallback: if no modules found, don't assign any
        // (Let the business type define what modules are available)
        const finalModules = industryModules.length > 0 ? industryModules : [];

        // Create business document with FULL profile defaults
        const businessId = await createDocumentREST("businesses", {
            // Identity
            name: businessName,
            slug: businessSlug.toLowerCase(),
            email: email,
            phone: businessPhone || "",
            whatsapp: businessPhone || "",

            // Profile Defaults (for public profile rendering)
            logo: "",
            cover: "",
            slogan: "",
            about: "",
            address: "",
            mapsUrl: "",
            socialLinks: {},
            isVerified: true, // Default to verified so icon shows on public profile

            // Business Config
            industry_id: industryId || "default",
            industry_label: industryLabel || "İşletme",
            plan_id: planId || null,
            status: "active",
            modules: finalModules,
            package: "starter",
            owner: fullName,

            // Subscription
            subscriptionStatus: "trial",
            subscriptionStartDate: new Date().toISOString(),
            subscriptionEndDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        });

        // Create business owner document with bcrypt hash
        await createDocumentREST("business_owners", {
            business_id: businessId,
            full_name: fullName,
            email: email,
            password_hash: passwordHash, // bcrypt hash!
        });

        // Create JWT session token
        const secret = new TextEncoder().encode(getSessionSecret());
        const sessionToken = await new SignJWT({
            email: email,
            role: "owner",
            businessId: businessId,
            businessName: businessName,
            businessSlug: businessSlug.toLowerCase(),
        })
            .setProtectedHeader({ alg: "HS256" })
            .setIssuedAt()
            .setExpirationTime("7d")
            .sign(secret);

        // OWASP: Clear rate limit on successful registration
        recordSuccess(ip, "register");

        // Create the response with success data
        const response = NextResponse.json({
            success: true,
            message: "Hesap oluşturuldu",
            redirect: "/panel",
            businessId: businessId
        });

        // Set the session cookie on the RESPONSE (not using cookies() which reads from request)
        response.cookies.set(OWNER_COOKIE, sessionToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: SESSION_DURATION,
            path: "/",
        });

        return response;
    } catch (error: any) {
        console.error("Registration error:", error);
        return NextResponse.json(
            {
                success: false,
                message: "Kayıt sırasında bir hata oluştu",
                debug: error?.message || String(error)
            },
            { status: 500 }
        );
    }
}
