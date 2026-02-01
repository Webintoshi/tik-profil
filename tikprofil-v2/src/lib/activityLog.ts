/**
 * Activity Log Service
 * Tracks user actions throughout the system
 * Optimized: Only fetches last 20 entries to minimize costs
 */

const ACTIVITY_LOG_COLLECTION = "activity_logs";

export type ActivityType =
    | "business_created"
    | "business_updated"
    | "business_deleted"
    | "business_frozen"
    | "business_unfrozen"
    | "user_login"
    | "user_logout"
    | "profile_updated"
    | "menu_updated"
    | "table_created"
    | "table_deleted"
    | "product_created"
    | "product_updated"
    | "product_deleted"
    | "category_created"
    | "category_deleted"
    | "plan_created"
    | "plan_updated"
    | "industry_created"
    | "qr_scan"
    | "settings_changed"
    | "subscription_extended"
    | "other";

export type ActivityLevel = "info" | "success" | "warning" | "error";

export interface ActivityLog {
    id: string;
    type: ActivityType;
    level: ActivityLevel;
    message: string;
    details?: Record<string, unknown>;
    actor: string; // Who performed the action (email, username, or "system")
    actorType: "admin" | "user" | "system";
    businessId?: string;
    businessName?: string;
    ipAddress?: string;
    createdAt: string; // ISO string
}

/**
 * Log an activity event
 */
export async function logActivity(
    type: ActivityType,
    message: string,
    options: {
        level?: ActivityLevel;
        details?: Record<string, unknown>;
        actor?: string;
        actorType?: "admin" | "user" | "system";
        businessId?: string;
        businessName?: string;
        ipAddress?: string;
    } = {}
): Promise<void> {
    try {
        const { createDocumentREST } = await import('./documentStore');

        await createDocumentREST(ACTIVITY_LOG_COLLECTION, {
            type,
            level: options.level || "info",
            message,
            details: options.details || null,
            actor: options.actor || "system",
            actorType: options.actorType || "system",
            businessId: options.businessId || null,
            businessName: options.businessName || null,
            ipAddress: options.ipAddress || null,
        });
    } catch (error) {
        // Don't throw - logging should never break the app
        console.error("Failed to log activity:", error);
    }
}

/**
 * Get recent activity logs (optimized: last 20 only)
 */
export async function getRecentActivityLogs(limit: number = 20): Promise<ActivityLog[]> {
    try {
        const { getCollectionREST } = await import('./documentStore');

        const docs = await getCollectionREST(ACTIVITY_LOG_COLLECTION);

        // Sort by createdAt DESC and limit
        const sorted = docs
            .sort((a, b) => {
                const dateA = new Date(a.createdAt as string).getTime();
                const dateB = new Date(b.createdAt as string).getTime();
                return dateB - dateA;
            })
            .slice(0, limit);

        return sorted.map(doc => ({
            id: doc.id as string,
            type: doc.type as ActivityType,
            level: (doc.level as ActivityLevel) || "info",
            message: doc.message as string,
            details: doc.details as Record<string, unknown> | undefined,
            actor: doc.actor as string,
            actorType: (doc.actorType as "admin" | "user" | "system") || "system",
            businessId: doc.businessId as string | undefined,
            businessName: doc.businessName as string | undefined,
            ipAddress: doc.ipAddress as string | undefined,
            createdAt: doc.createdAt as string,
        }));
    } catch (error) {
        console.error("Failed to get activity logs:", error);
        return [];
    }
}

/**
 * Get activity logs by type
 */
export async function getActivityLogsByType(
    type: ActivityType,
    limit: number = 20
): Promise<ActivityLog[]> {
    const allLogs = await getRecentActivityLogs(100); // Get more to filter
    return allLogs.filter(log => log.type === type).slice(0, limit);
}

/**
 * Get activity logs by level
 */
export async function getActivityLogsByLevel(
    level: ActivityLevel,
    limit: number = 20
): Promise<ActivityLog[]> {
    const allLogs = await getRecentActivityLogs(100);
    return allLogs.filter(log => log.level === level).slice(0, limit);
}

/**
 * Get activity logs for a specific business
 */
export async function getBusinessActivityLogs(
    businessId: string,
    limit: number = 20
): Promise<ActivityLog[]> {
    const allLogs = await getRecentActivityLogs(100);
    return allLogs.filter(log => log.businessId === businessId).slice(0, limit);
}

// Helper functions for common log types
export const ActivityLogger = {
    // Business actions
    businessCreated: (name: string, actor: string, businessId: string) =>
        logActivity("business_created", `"${name}" işletmesi oluşturuldu`, {
            level: "success",
            actor,
            actorType: "admin",
            businessId,
            businessName: name,
        }),

    businessUpdated: (name: string, actor: string, businessId: string, changes?: string[]) =>
        logActivity("business_updated", `"${name}" güncellendi${changes ? `: ${changes.join(", ")}` : ""}`, {
            level: "info",
            actor,
            actorType: "user",
            businessId,
            businessName: name,
            details: changes ? { fields: changes } : undefined,
        }),

    businessDeleted: (name: string, actor: string) =>
        logActivity("business_deleted", `"${name}" silindi`, {
            level: "warning",
            actor,
            actorType: "admin",
            businessName: name,
        }),

    businessFrozen: (name: string, actor: string, businessId: string) =>
        logActivity("business_frozen", `"${name}" donduruldu`, {
            level: "warning",
            actor,
            actorType: "admin",
            businessId,
            businessName: name,
        }),

    businessUnfrozen: (name: string, actor: string, businessId: string) =>
        logActivity("business_unfrozen", `"${name}" aktifleştirildi`, {
            level: "success",
            actor,
            actorType: "admin",
            businessId,
            businessName: name,
        }),

    // User actions
    userLogin: (email: string, isAdmin: boolean = false) =>
        logActivity("user_login", `${email} giriş yaptı`, {
            level: "info",
            actor: email,
            actorType: isAdmin ? "admin" : "user",
        }),

    userLogout: (email: string) =>
        logActivity("user_logout", `${email} çıkış yaptı`, {
            level: "info",
            actor: email,
            actorType: "user",
        }),

    // Profile actions
    profileUpdated: (businessName: string, actor: string, businessId: string) =>
        logActivity("profile_updated", `"${businessName}" profili güncellendi`, {
            level: "info",
            actor,
            actorType: "user",
            businessId,
            businessName,
        }),

    // Menu actions
    productCreated: (productName: string, businessName: string, businessId: string) =>
        logActivity("product_created", `"${productName}" ürünü eklendi (${businessName})`, {
            level: "info",
            actor: businessName,
            actorType: "user",
            businessId,
            businessName,
        }),

    productDeleted: (productName: string, businessName: string, businessId: string) =>
        logActivity("product_deleted", `"${productName}" ürünü silindi (${businessName})`, {
            level: "warning",
            actor: businessName,
            actorType: "user",
            businessId,
            businessName,
        }),

    // Subscription
    subscriptionExtended: (businessName: string, days: number, actor: string, businessId: string) =>
        logActivity("subscription_extended", `"${businessName}" aboneliği ${days} gün uzatıldı`, {
            level: "success",
            actor,
            actorType: "admin",
            businessId,
            businessName,
            details: { days },
        }),

    // QR Scan (already logged separately, but available if needed)
    qrScan: (businessSlug: string, businessId: string) =>
        logActivity("qr_scan", `QR tarandı: /${businessSlug}`, {
            level: "info",
            actor: "visitor",
            actorType: "system",
            businessId,
        }),
};
