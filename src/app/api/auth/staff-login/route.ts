/**
 * Staff Login API Route
 * 
 * Handles staff member authentication for business panel access
 * Sets JWT session cookie for subsequent requests
 */

import { NextResponse } from "next/server";
import { cookies, headers } from "next/headers";
import { SignJWT } from "jose";
import { getStaffByEmail, verifyPassword, logStaffActivity, hashPassword } from "@/lib/services/staffService";
import { getDocumentREST, updateDocumentREST } from "@/lib/documentStore";
import { getSessionSecretBytes } from "@/lib/env";

// Staff session cookie
const STAFF_COOKIE = "tikprofil_staff_session";
const SESSION_DURATION = 7 * 24 * 60 * 60; // 7 days in seconds

// JWT secret - must match apiAuth.ts
const getJwtSecret = () => getSessionSecretBytes();

export async function POST(request: Request) {
    try {
        // Get client IP for logging
        const headersList = await headers();
        const ip = headersList.get("x-forwarded-for")?.split(",")[0]?.trim() ||
            headersList.get("x-real-ip") ||
            "unknown";
        const userAgent = headersList.get("user-agent") || "unknown";

        // Parse request body
        const body = await request.json();
        const { email, password, businessId } = body;

        // Validate required fields
        if (!email || !password || !businessId) {
            return NextResponse.json(
                { success: false, message: "Email, şifre ve işletme ID gerekli" },
                { status: 400 }
            );
        }

        // Find staff member by email and businessId
        const staff = await getStaffByEmail(businessId, email.toLowerCase().trim());

        if (!staff) {
            return NextResponse.json(
                { success: false, message: "Email veya şifre hatalı" },
                { status: 401 }
            );
        }

        // Check if staff is active
        if (!staff.is_active) {
            return NextResponse.json(
                { success: false, message: "Hesabınız pasif durumda. Yöneticinizle iletişime geçin." },
                { status: 403 }
            );
        }

        // Verify password
        const passwordCheck = await verifyPassword(password, staff.password_hash);
        if (!passwordCheck.verified) {
            return NextResponse.json(
                { success: false, message: "Email veya şifre hatalı" },
                { status: 401 }
            );
        }

        if (passwordCheck.isLegacy) {
            try {
                const newHash = await hashPassword(password);
                await updateDocumentREST("business_staff", staff.id, {
                    password_hash: newHash,
                    updated_at: new Date().toISOString(),
                });
            } catch (error) {
                console.warn("Staff password migration failed:", error);
            }
        }

        // Get business info for session
        let businessName = "İşletme";
        let businessSlug = "";
        let enabledModules: string[] = ["restaurant"];

        try {
            const business = await getDocumentREST("businesses", businessId);
            if (business) {
                businessName = (business.name as string) || businessName;
                businessSlug = (business.slug as string) || "";
                enabledModules = (business.modules as string[]) || [];
            }
        } catch (e) {
            console.warn("Could not fetch business info:", e);
        }

        // Create JWT session token
        const sessionToken = await new SignJWT({
            staffId: staff.id,
            email: staff.email,
            role: staff.role,
            permissions: staff.permissions,
            businessId: businessId,
            businessName: businessName,
            businessSlug: businessSlug,
            enabledModules: enabledModules,
            isStaff: true,
        })
            .setProtectedHeader({ alg: "HS256" })
            .setIssuedAt()
            .setExpirationTime("7d")
            .sign(getJwtSecret());

        // Log successful login
        await logStaffActivity(
            businessId,
            staff.id,
            staff.email,
            staff.name,
            "login",
            { success: true },
            ip,
            userAgent
        );

        // Create response
        const response = NextResponse.json({
            success: true,
            message: "Giriş başarılı",
            redirect: "/panel",
        });

        // Set the session cookie
        response.cookies.set(STAFF_COOKIE, sessionToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: SESSION_DURATION,
            path: "/",
        });

        return response;
    } catch (error) {
        console.error("Staff login error:", error);
        return NextResponse.json(
            { success: false, message: "Bir hata oluştu" },
            { status: 500 }
        );
    }
}
