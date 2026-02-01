import { NextRequest, NextResponse } from "next/server";
import {
    getStaffMemberById,
    updateStaffMember,
    deleteStaffMember,
    logStaffActivity
} from "@/lib/services/staffService";
import { requirePermission } from "@/lib/apiAuth";

interface RouteParams {
    params: Promise<{ staffId: string }>;
}

/**
 * GET /api/panel/staff/[staffId]
 * Get a single staff member
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
    try {
        const { staffId } = await params;

        // Check permission
        const check = await requirePermission("general.staff");
        if (!check.authorized) {
            return NextResponse.json(
                { error: check.error },
                { status: 403 }
            );
        }

        const staff = await getStaffMemberById(staffId);

        if (!staff) {
            return NextResponse.json(
                { error: "Personel bulunamadı" },
                { status: 404 }
            );
        }

        // Verify user belongs to same business
        if (check.user!.businessId !== staff.business_id) {
            return NextResponse.json(
                { error: "Bu personele erişim yetkiniz yok" },
                { status: 403 }
            );
        }

        return NextResponse.json({ staff });
    } catch (error) {
        console.error("Error fetching staff:", error);
        return NextResponse.json(
            { error: "Sunucu hatası" },
            { status: 500 }
        );
    }
}

/**
 * PUT /api/panel/staff/[staffId]
 * Update a staff member
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
    try {
        const { staffId } = await params;
        const body = await request.json();
        const { businessId, name, email, phone, password, role, permissions, is_active } = body;

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

        // Only managers and owners can update staff
        if (check.user!.role === "staff") {
            return NextResponse.json(
                { error: "Personel düzenleme yetkiniz yok" },
                { status: 403 }
            );
        }

        // Get existing staff to check ownership
        const existingStaff = await getStaffMemberById(staffId);
        if (!existingStaff || existingStaff.business_id !== businessId) {
            return NextResponse.json(
                { error: "Personel bulunamadı" },
                { status: 404 }
            );
        }

        // Prevent modifying owner
        if (existingStaff.role === "owner" && check.user!.role !== "owner") {
            return NextResponse.json(
                { error: "İşletme sahibini düzenleyemezsiniz" },
                { status: 403 }
            );
        }

        // Update staff member
        const result = await updateStaffMember(staffId, {
            name,
            email,
            phone,
            password: password || undefined,
            role,
            permissions,
            is_active
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
            "staff_update",
            { updatedStaffId: staffId }
        );

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error updating staff:", error);
        return NextResponse.json(
            { error: "Sunucu hatası" },
            { status: 500 }
        );
    }
}

/**
 * DELETE /api/panel/staff/[staffId]
 * Delete a staff member
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
    try {
        const { staffId } = await params;
        const body = await request.json();
        const { businessId } = body;

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

        // Only managers and owners can delete staff
        if (check.user!.role === "staff") {
            return NextResponse.json(
                { error: "Personel silme yetkiniz yok" },
                { status: 403 }
            );
        }

        // Get existing staff to check ownership
        const existingStaff = await getStaffMemberById(staffId);
        if (!existingStaff || existingStaff.business_id !== businessId) {
            return NextResponse.json(
                { error: "Personel bulunamadı" },
                { status: 404 }
            );
        }

        // Prevent deleting owner
        if (existingStaff.role === "owner") {
            return NextResponse.json(
                { error: "İşletme sahibini silemezsiniz" },
                { status: 403 }
            );
        }

        // Delete staff member
        const result = await deleteStaffMember(staffId);

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
            "staff_delete",
            { deletedStaffEmail: existingStaff.email }
        );

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error deleting staff:", error);
        return NextResponse.json(
            { error: "Sunucu hatası" },
            { status: 500 }
        );
    }
}
