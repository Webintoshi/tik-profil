import { NextRequest, NextResponse } from "next/server";
import {
    getStaffMembers,
    createStaffMember,
    logStaffActivity
} from "@/lib/services/staffService";
import { requirePermission } from "@/lib/apiAuth";

/**
 * GET /api/panel/staff
 * List all staff members for a business
 */
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const businessId = searchParams.get("businessId");
        if (!businessId) {
            return NextResponse.json(
                { error: "Business ID gerekli" },
                { status: 400 }
            );
        }

        // Check permission - Owner always has access
        const check = await requirePermission("general.staff");
        if (!check.authorized) {
            return NextResponse.json(
                { error: check.error },
                { status: 403 }
            );
        }

        // Verify user belongs to this business
        if (check.user!.businessId !== businessId) {
            return NextResponse.json(
                { error: "Bu işletmeye erişim yetkiniz yok" },
                { status: 403 }
            );
        }
        const staff = await getStaffMembers(businessId);
        return NextResponse.json({ staff });
    } catch (error) {
        console.error("[Staff API GET] Error:", error);
        return NextResponse.json(
            { error: "Sunucu hatası" },
            { status: 500 }
        );
    }
}

/**
 * POST /api/panel/staff
 * Create a new staff member
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { businessId, name, email, phone, password, role, permissions } = body;
        if (!businessId || !name || !email || !password || !role) {
            return NextResponse.json(
                { error: "Eksik alanlar var" },
                { status: 400 }
            );
        }

        // Check permission
        const check = await requirePermission("general.staff");
        if (!check.authorized) {
            return NextResponse.json(
                { error: check.error },
                { status: 403 }
            );
        }

        // Verify user belongs to this business
        if (check.user!.businessId !== businessId) {
            return NextResponse.json(
                { error: "Bu işletmeye erişim yetkiniz yok" },
                { status: 403 }
            );
        }

        // Only managers and owners can create staff
        if (check.user!.role === "staff") {
            return NextResponse.json(
                { error: "Personel ekleme yetkiniz yok" },
                { status: 403 }
            );
        }

        // Create staff member
        const result = await createStaffMember(businessId, {
            name,
            email,
            phone,
            password,
            role,
            permissions: permissions || []
        });
        if (!result.success) {
            return NextResponse.json(
                { error: result.error },
                { status: 400 }
            );
        }

        // Log activity
        await logStaffActivity(
            businessId,
            check.user!.staffId || "owner",
            check.user!.email,
            "İşletme Sahibi",
            "staff_create",
            { newStaffEmail: email, newStaffRole: role }
        );

        return NextResponse.json({
            success: true,
            staffId: result.staffId
        });
    } catch (error) {
        console.error("[Staff API POST] Exception:", error);
        return NextResponse.json(
            { error: "Sunucu hatası" },
            { status: 500 }
        );
    }
}
