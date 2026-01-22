/**
 * Staff Service
 * 
 * CRUD operations for business staff members
 * Activity logging
 * Authentication helpers
 */

import bcrypt from "bcryptjs";
import { StaffRole } from "../permissions";

// ============================================
// TYPES
// ============================================

export interface StaffMember {
    id: string;
    business_id: string;
    email: string;
    phone?: string;
    name: string;
    role: StaffRole;
    permissions: string[];          // Flat IDs: ["general.profile", "restaurant.menu"]
    is_active: boolean;
    created_at: Date;
    updated_at?: Date;
    last_login?: Date;
}

export interface CreateStaffInput {
    email: string;
    phone?: string;
    password: string;
    name: string;
    role: StaffRole;
    permissions: string[];
}

export interface UpdateStaffInput {
    email?: string;
    phone?: string;
    password?: string;
    name?: string;
    role?: StaffRole;
    permissions?: string[];
    is_active?: boolean;
}

export interface StaffActivityLog {
    id: string;
    business_id: string;
    staff_id: string;
    staff_email: string;
    staff_name: string;
    action: string;
    details?: Record<string, unknown>;
    ip_address?: string;
    user_agent?: string;
    created_at: Date;
}

// ============================================
// HELPER: Password hashing (same as existing auth)
// ============================================

const SALT_ROUNDS = 12;

export async function hashPassword(password: string): Promise<string> {
    const salt = await bcrypt.genSalt(SALT_ROUNDS);
    return bcrypt.hash(password, salt);
}

export async function verifyPassword(password: string, hash: string): Promise<{ verified: boolean; isLegacy: boolean }> {
    if (hash.startsWith("$2")) {
        const verified = await bcrypt.compare(password, hash);
        return { verified, isLegacy: false };
    }

    const legacyHashSecured = Buffer.from(password + "_secured").toString("base64");
    if (legacyHashSecured === hash) {
        return { verified: true, isLegacy: true };
    }
    const legacyHash = Buffer.from(password).toString("base64");
    return { verified: legacyHash === hash, isLegacy: true };
}

// ============================================
// CRUD OPERATIONS
// ============================================

/**
 * Get all staff members for a business
 */
export async function getStaffMembers(businessId: string): Promise<StaffMember[]> {
    try {
        // Use getCollectionREST from documentStore which is proven to work in production
        const { getCollectionREST } = await import('../documentStore');

        const allStaff = await getCollectionREST("business_staff");
        // Filter by businessId (checking both snake_case and camelCase field names)
        const filtered = allStaff.filter(staff => {
            const staffBizId = (staff.business_id as string) || (staff.businessId as string) || "";
            return staffBizId === businessId;
        });
        // Convert to StaffMember type
        return filtered.map(mapStaffDoc);
    } catch (error) {
        console.error("[getStaffMembers] Error:", error);
        return [];
    }
}

/**
 * Get a single staff member by ID
 */
export async function getStaffMemberById(staffId: string): Promise<StaffMember | null> {
    try {
        const { getDocumentREST } = await import('../documentStore');
        const doc = await getDocumentREST('business_staff', staffId);
        if (!doc) return null;
        return mapStaffDoc(doc);
    } catch (error) {
        console.error("Error fetching staff member:", error);
        return null;
    }
}

/**
 * Get staff member by email (for login)
 */
export async function getStaffByEmail(businessId: string, email: string): Promise<(StaffMember & { password_hash: string }) | null> {
    try {
        // Use getCollectionREST which is proven to work in production
        const { getCollectionREST } = await import('../documentStore');

        const allStaff = await getCollectionREST("business_staff");
        // Find staff member by email and businessId
        const emailLower = email.toLowerCase();
        const staffMember = allStaff.find(staff => {
            const staffEmail = ((staff.email as string) || "").toLowerCase();
            const staffBizId = (staff.business_id as string) || (staff.businessId as string) || "";
            return staffEmail === emailLower && staffBizId === businessId;
        });

        if (!staffMember) {
            return null;
        }
        // Convert to StaffMember type with password_hash
        return {
            id: (staffMember.id as string) || "",
            business_id: (staffMember.business_id as string) || (staffMember.businessId as string) || "",
            email: (staffMember.email as string) || "",
            phone: (staffMember.phone as string) || undefined,
            name: (staffMember.name as string) || "",
            role: ((staffMember.role as string) || "staff") as StaffRole,
            permissions: (staffMember.permissions as string[]) || [],
            is_active: (staffMember.is_active as boolean) ?? (staffMember.isActive as boolean) ?? true,
            created_at: staffMember.created_at ? new Date(staffMember.created_at as string) : (staffMember.createdAt ? new Date(staffMember.createdAt as string) : new Date()),
            updated_at: staffMember.updated_at ? new Date(staffMember.updated_at as string) : undefined,
            last_login: staffMember.last_login ? new Date(staffMember.last_login as string) : undefined,
            password_hash: (staffMember.password_hash as string) || (staffMember.passwordHash as string) || ""
        };
    } catch (error) {
        console.error("[getStaffByEmail] Error:", error);
        return null;
    }
}

/**
 * Create a new staff member
 */
export async function createStaffMember(
    businessId: string,
    input: CreateStaffInput
): Promise<{ success: boolean; staffId?: string; error?: string }> {
    try {
        // Check if email already exists
        const existing = await getStaffByEmail(businessId, input.email);
        if (existing) {
            return { success: false, error: "Bu email adresi zaten kullanılıyor" };
        }

        const staffId = `staff_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        // Use createDocumentREST like other services for consistency
        const { createDocumentREST } = await import('../documentStore');

        const staffData = {
            business_id: businessId,
            email: input.email.toLowerCase(),
            phone: input.phone || "",
            password_hash: await hashPassword(input.password),
            name: input.name,
            role: input.role,
            permissions: input.permissions || [],
            is_active: true,
            updated_at: new Date().toISOString()
        };
        await createDocumentREST("business_staff", staffData, staffId);
        return { success: true, staffId };
    } catch (error) {
        console.error("[Staff Create] Exception:", error);
        return { success: false, error: "Kullanıcı oluşturulamadı" };
    }
}

/**
 * Update a staff member
 */
export async function updateStaffMember(
    staffId: string,
    input: UpdateStaffInput
): Promise<{ success: boolean; error?: string }> {
    try {
        const existing = await getStaffMemberById(staffId);
        if (!existing) {
            return { success: false, error: "Kullanıcı bulunamadı" };
        }
        const { updateDocumentREST } = await import('../documentStore');

        const updates: Record<string, unknown> = {
            updated_at: new Date().toISOString(),
        };

        if (input.email !== undefined) updates.email = input.email.toLowerCase();
        if (input.phone !== undefined) updates.phone = input.phone;
        if (input.password !== undefined) updates.password_hash = await hashPassword(input.password);
        if (input.name !== undefined) updates.name = input.name;
        if (input.role !== undefined) updates.role = input.role;
        if (input.permissions !== undefined) updates.permissions = input.permissions;
        if (input.is_active !== undefined) updates.is_active = input.is_active;

        await updateDocumentREST('business_staff', staffId, updates);
        return { success: true };
    } catch (error) {
        console.error("Error updating staff member:", error);
        return { success: false, error: "Bir hata oluştu" };
    }
}

/**
 * Delete a staff member
 */
export async function deleteStaffMember(staffId: string): Promise<{ success: boolean; error?: string }> {
    try {
        const { deleteDocumentREST } = await import('../documentStore');
        await deleteDocumentREST('business_staff', staffId);
        return { success: true };
    } catch (error) {
        console.error("Error deleting staff member:", error);
        return { success: false, error: "Bir hata oluştu" };
    }
}

/**
 * Get staff count for a business
 */
export async function getStaffCount(businessId: string): Promise<number> {
    const staff = await getStaffMembers(businessId);
    return staff.length;
}

// ============================================
// ACTIVITY LOGGING
// ============================================

/**
 * Log staff activity
 */
export async function logStaffActivity(
    businessId: string,
    staffId: string,
    staffEmail: string,
    staffName: string,
    action: string,
    details?: Record<string, unknown>,
    ipAddress?: string,
    userAgent?: string
): Promise<void> {
    try {
        const logId = `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const now = new Date().toISOString();
        const { createDocumentREST } = await import('../documentStore');

        await createDocumentREST("staff_activity_logs", {
            business_id: businessId,
            staff_id: staffId,
            staff_email: staffEmail,
            staff_name: staffName,
            action,
            details: details || null,
            ip_address: ipAddress || null,
            user_agent: userAgent || null,
            created_at: now,
        }, logId);
    } catch (error) {
        console.error("Error logging activity:", error);
        // Don't throw - logging should not break the app
    }
}

/**
 * Get activity logs for a business
 */
export async function getActivityLogs(
    businessId: string,
    limit: number = 50
): Promise<StaffActivityLog[]> {
    try {
        const { getCollectionREST } = await import('../documentStore');
        const logs = await getCollectionREST("staff_activity_logs");

        return logs
            .filter(log => log.business_id === businessId || log.businessId === businessId)
            .sort((a, b) => new Date((b.created_at as string) || (b.createdAt as string) || '').getTime()
                - new Date((a.created_at as string) || (a.createdAt as string) || '').getTime())
            .slice(0, limit)
            .map(log => ({
                id: log.id as string,
                business_id: (log.business_id as string) || (log.businessId as string) || "",
                staff_id: (log.staff_id as string) || "",
                staff_email: (log.staff_email as string) || "",
                staff_name: (log.staff_name as string) || "",
                action: (log.action as string) || "",
                details: (log.details as Record<string, unknown>) || undefined,
                ip_address: (log.ip_address as string) || undefined,
                user_agent: (log.user_agent as string) || undefined,
                created_at: new Date((log.created_at as string) || (log.createdAt as string) || ""),
            }));
    } catch (error) {
        console.error("Error fetching activity logs:", error);
        return [];
    }
}

function mapStaffDoc(staff: Record<string, unknown>): StaffMember {
    return {
        id: (staff.id as string) || "",
        business_id: (staff.business_id as string) || (staff.businessId as string) || "",
        email: (staff.email as string) || "",
        phone: (staff.phone as string) || undefined,
        name: (staff.name as string) || "",
        role: ((staff.role as string) || "staff") as StaffRole,
        permissions: (staff.permissions as string[]) || [],
        is_active: (staff.is_active as boolean) ?? (staff.isActive as boolean) ?? true,
        created_at: staff.created_at ? new Date(staff.created_at as string) : (staff.createdAt ? new Date(staff.createdAt as string) : new Date()),
        updated_at: staff.updated_at ? new Date(staff.updated_at as string) : (staff.updatedAt ? new Date(staff.updatedAt as string) : undefined),
        last_login: staff.last_login ? new Date(staff.last_login as string) : undefined,
    };
}
