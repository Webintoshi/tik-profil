// Admin Management Service
// Using Supabase-backed data layer

import bcrypt from "bcryptjs";

const ADMINS_COLLECTION = "admins";

export type AdminRole = "super_admin" | "admin" | "moderator";

// Permission types for admin roles
export type AdminPermission =
    | "manage_admins"
    | "manage_businesses"
    | "manage_packages"
    | "manage_couriers"
    | "manage_products"
    | "view_logs"
    | "view_security"
    | "full_access";

export interface Admin {
    id: string;
    username: string;
    passwordHash: string;
    displayName: string;
    email?: string;
    role: AdminRole;
    permissions: AdminPermission[];
    isActive: boolean;
    lastLogin?: Date;
    createdAt: Date;
    createdBy: string;
}

const SALT_ROUNDS = 12;

// Role labels (Turkish)
export const ROLE_LABELS: Record<AdminRole, string> = {
    super_admin: "Süper Yönetici",
    admin: "Yönetici",
    moderator: "Moderatör",
};

// Role colors
export const ROLE_COLORS: Record<AdminRole, string> = {
    super_admin: "#FF9500",
    admin: "#007AFF",
    moderator: "#34C759",
};

// Default permissions by role
export const ROLE_PERMISSIONS: Record<AdminRole, AdminPermission[]> = {
    super_admin: ["full_access", "manage_admins", "manage_businesses", "manage_packages", "manage_couriers", "manage_products", "view_logs", "view_security"],
    admin: ["manage_businesses", "manage_couriers", "view_logs"],
    moderator: ["view_logs"],
};

// Permission labels (Turkish)
export const PERMISSION_LABELS: Record<AdminPermission, string> = {
    manage_admins: "Yönetici Yönetimi",
    manage_businesses: "İşletme Yönetimi",
    manage_packages: "Paket Yönetimi",
    manage_couriers: "Kurye Yönetimi",
    manage_products: "Ürün Yönetimi",
    view_logs: "Log Görüntüleme",
    view_security: "Güvenlik Görüntüleme",
    full_access: "Tam Erişim",
};

// Check if current user can manage admins (only webintosh)
export function canManageAdmins(currentUsername: string): boolean {
    return currentUsername === "webintosh";
}

// Check if admin has permission
export function hasPermission(admin: Admin, permission: AdminPermission): boolean {
    if (admin.permissions.includes("full_access")) return true;
    return admin.permissions.includes(permission);
}

// Get all admins - REST API
export async function getAdmins(): Promise<Admin[]> {
    const { getCollectionREST } = await import('./documentStore');

    try {
        const docs = await getCollectionREST(ADMINS_COLLECTION);
        const admins = docs.map(doc => ({
            ...doc,
            createdAt: doc.createdAt ? new Date(doc.createdAt as string) : new Date(),
            lastLogin: doc.lastLogin ? new Date(doc.lastLogin as string) : undefined,
            permissions: (doc.permissions as AdminPermission[]) || ROLE_PERMISSIONS[doc.role as AdminRole] || [],
        })) as Admin[];
        // Sort by createdAt desc
        admins.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        return admins;
    } catch (error) {
        console.error("REST API error:", error);
        return [];
    }
}

// Subscribe to admins - REST API with polling
export function subscribeToAdmins(callback: (admins: Admin[]) => void): () => void {
    let isActive = true;

    const fetchData = async () => {
        try {
            const admins = await getAdmins();
            if (isActive) {
                callback(admins);
            }
        } catch (error) {
            console.error("Polling fetch error:", error);
            if (isActive) {
                callback([]);
            }
        }
    };

    fetchData();
    const intervalId = setInterval(() => {
        if (isActive) fetchData();
    }, 5000);

    return () => {
        isActive = false;
        clearInterval(intervalId);
    };
}

// Create admin - REST API
export async function createAdmin(
    data: Omit<Admin, "id" | "createdAt">,
    creatorUsername: string
): Promise<string> {
    if (!canManageAdmins(creatorUsername)) {
        throw new Error("Sadece webintosh yönetici ekleyebilir");
    }

    const { createDocumentREST } = await import('./documentStore');

    // Clean up undefined values to prevent document store errors
    const cleanData: Record<string, unknown> = {
        username: data.username,
        passwordHash: data.passwordHash,
        displayName: data.displayName,
        role: data.role,
        permissions: data.permissions || ROLE_PERMISSIONS[data.role],
        isActive: data.isActive,
        createdBy: creatorUsername,
    };

    if (data.email) cleanData.email = data.email;
    // Don't include lastLogin if undefined

    try {
        const docId = await createDocumentREST(ADMINS_COLLECTION, cleanData);
        return docId;
    } catch (error) {
        console.error("REST API error:", error);
        throw error;
    }
}

// Update admin - REST API
export async function updateAdmin(
    id: string,
    data: Partial<Omit<Admin, "id" | "createdAt">>,
    updaterUsername: string
): Promise<void> {
    if (!canManageAdmins(updaterUsername)) {
        throw new Error("Sadece webintosh yönetici güncelleyebilir");
    }

    const { updateDocumentREST } = await import('./documentStore');

    // Clean up undefined values
    const cleanData: Record<string, unknown> = {};
    Object.entries(data).forEach(([key, value]) => {
        if (value !== undefined) {
            cleanData[key] = value;
        }
    });

    try {
        await updateDocumentREST(ADMINS_COLLECTION, id, cleanData);
    } catch (error) {
        console.error("REST API error:", error);
        throw error;
    }
}

// Delete admin - REST API
export async function deleteAdmin(id: string, deleterUsername: string): Promise<void> {
    if (!canManageAdmins(deleterUsername)) {
        throw new Error("Sadece webintosh yönetici silebilir");
    }

    const { deleteDocumentREST } = await import('./documentStore');

    try {
        await deleteDocumentREST(ADMINS_COLLECTION, id);
    } catch (error) {
        console.error("REST API error:", error);
        throw error;
    }
}

// Hash password
export async function hashPassword(password: string): Promise<string> {
    const salt = await bcrypt.genSalt(SALT_ROUNDS);
    return bcrypt.hash(password, salt);
}

// Verify password
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
    if (hash.startsWith("$2")) {
        return bcrypt.compare(password, hash);
    }
    const legacyHashSecured = btoa(password + "_secured");
    if (legacyHashSecured === hash) return true;
    const legacyHash = btoa(password);
    return legacyHash === hash;
}
