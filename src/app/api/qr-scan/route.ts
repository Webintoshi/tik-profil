/**
 * QR Scan Logging API Route
 * POST /api/qr-scan - Logs a QR scan event
 */

import { NextResponse } from "next/server";
import { headers } from "next/headers";

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { businessId, businessSlug } = body;

        if (!businessId || !businessSlug) {
            return NextResponse.json(
                { success: false, message: "Missing required fields" },
                { status: 400 }
            );
        }

        // Get headers for logging
        const headersList = await headers();
        const userAgent = headersList.get("user-agent") || undefined;
        const ip = headersList.get("x-forwarded-for")?.split(",")[0]?.trim() ||
            headersList.get("x-real-ip") ||
            "unknown";

        // Simple hash for privacy
        const ipHash = simpleHash(ip);

        // Import REST API
        const { createDocumentREST } = await import("@/lib/documentStore");

        // Log the scan
        await createDocumentREST("qr_scans", {
            business_id: businessId,
            business_slug: businessSlug,
            user_agent: userAgent ? userAgent.substring(0, 100) : undefined,
            ip_hash: ipHash,
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("QR scan logging error:", error);
        // Don't fail the request - logging is not critical
        return NextResponse.json({ success: true });
    }
}

function simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return Math.abs(hash).toString(16);
}
