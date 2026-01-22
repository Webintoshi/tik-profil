/**
 * Subscription Service - MISSION 17: Time Lord
 * Using Supabase-backed data layer
 */

// ============================================
// DATE UTILITIES
// ============================================

/**
 * Add days to a date
 */
export function addDaysToDate(date: Date, days: number): Date {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
}

/**
 * Add months to a date
 */
export function addMonthsToDate(date: Date, months: number): Date {
    const result = new Date(date);
    result.setMonth(result.getMonth() + months);
    return result;
}

/**
 * Add years to a date
 */
export function addYearsToDate(date: Date, years: number): Date {
    const result = new Date(date);
    result.setFullYear(result.getFullYear() + years);
    return result;
}

// ============================================
// SUBSCRIPTION STATUS UTILITIES
// ============================================

export interface SubscriptionInfo {
    status: "active" | "expired" | "trial" | "free";
    daysRemaining: number;
    endDate: Date | null;
    statusColor: "green" | "orange" | "red" | "gray";
    statusLabel: string;
}

/**
 * Calculate subscription status and remaining days
 */
export function getSubscriptionInfo(endDate: Date | null | undefined, status?: string): SubscriptionInfo {
    if (!endDate || status === "free") {
        return {
            status: "free",
            daysRemaining: Infinity,
            endDate: null,
            statusColor: "gray",
            statusLabel: "Ücretsiz Plan"
        };
    }

    const now = new Date();
    const end = new Date(endDate);
    const diffTime = end.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
        return {
            status: "expired",
            daysRemaining: diffDays,
            endDate: end,
            statusColor: "red",
            statusLabel: "Süresi Doldu"
        };
    }

    if (diffDays <= 7) {
        return {
            status: "active",
            daysRemaining: diffDays,
            endDate: end,
            statusColor: "orange",
            statusLabel: `${diffDays} Gün Kaldı`
        };
    }

    return {
        status: "active",
        daysRemaining: diffDays,
        endDate: end,
        statusColor: "green",
        statusLabel: `${diffDays} Gün Kaldı`
    };
}

/**
 * Check if subscription is expired
 */
export function isSubscriptionExpired(endDate: Date | null): boolean {
    if (!endDate) return false;
    return new Date(endDate) < new Date();
}

// ============================================
// EXTENSION TYPES
// ============================================

export type ExtensionType =
    | { type: "days"; amount: 7 }
    | { type: "months"; amount: 1 | 3 }
    | { type: "years"; amount: 1 }
    | { type: "custom"; date: Date };

export const EXTENSION_PRESETS = [
    { label: "+7 Gün", subtitle: "Hediye/Telafi", extension: { type: "days", amount: 7 } as ExtensionType },
    { label: "+1 Ay", subtitle: "Standart", extension: { type: "months", amount: 1 } as ExtensionType },
    { label: "+3 Ay", subtitle: "Mevsimlik", extension: { type: "months", amount: 3 } as ExtensionType },
    { label: "+1 Yıl", subtitle: "Yıllık Ödeme", extension: { type: "years", amount: 1 } as ExtensionType },
];

// ============================================
// EXTENSION LOGIC
// ============================================

/**
 * Calculate new end date based on extension type
 * Stacking Logic:
 * - If Active: Add to existing end date
 * - If Expired: Start from TODAY
 */
export function calculateNewEndDate(
    currentEndDate: Date | null | undefined,
    extension: ExtensionType
): Date {
    // Determine base date
    let baseDate: Date;

    if (currentEndDate && !isSubscriptionExpired(currentEndDate)) {
        // Active: Stack on existing date
        baseDate = new Date(currentEndDate);
    } else {
        // Expired or null: Start from today
        baseDate = new Date();
    }

    // Apply extension
    switch (extension.type) {
        case "days":
            return addDaysToDate(baseDate, extension.amount);
        case "months":
            return addMonthsToDate(baseDate, extension.amount);
        case "years":
            return addYearsToDate(baseDate, extension.amount);
        case "custom":
            return extension.date;
    }
}

/**
 * Extend business subscription - REST API
 */
export async function extendSubscription(
    businessId: string,
    businessName: string,
    extension: ExtensionType,
    adminName: string = "Admin"
): Promise<{ success: boolean; newEndDate: Date; error?: string }> {
    try {
        // Get current business data via REST API
        const { getDocumentREST, updateDocumentREST } = await import('../documentStore');

        const businessData = await getDocumentREST("businesses", businessId);

        if (!businessData) {
            return { success: false, newEndDate: new Date(), error: "İşletme bulunamadı" };
        }

        // Get current end date
        const currentEndDate = businessData.subscriptionEndDate
            ? new Date(businessData.subscriptionEndDate as string)
            : null;

        // Calculate new end date
        const newEndDate = calculateNewEndDate(currentEndDate, extension);

        // Update via REST API
        await updateDocumentREST("businesses", businessId, {
            subscriptionEndDate: newEndDate.toISOString(),
            subscriptionStatus: "active",
            status: "active"
        });

        // Calculate days added for logging
        const daysAdded = extension.type === "custom"
            ? Math.ceil((newEndDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
            : extension.type === "days"
                ? extension.amount
                : extension.type === "months"
                    ? extension.amount * 30
                    : 365;

        // Log the action (if auditService is available)
        try {
            const { logActivity } = await import('./auditService');
            await logActivity({
                actor_id: "admin",
                actor_name: adminName,
                action_type: "SUBSCRIPTION_EXTEND",
                metadata: {
                    businessId,
                    businessName,
                    extensionType: extension.type,
                    daysAdded,
                    oldEndDate: currentEndDate?.toISOString() || null,
                    newEndDate: newEndDate.toISOString()
                }
            });
        } catch (logError) {
        }
        return { success: true, newEndDate };

    } catch (error) {
        console.error("REST API error:", error);
        return { success: false, newEndDate: new Date(), error: String(error) };
    }
}

/**
 * Format date for display (Turkish locale)
 */
export function formatDateTR(date: Date | null): string {
    if (!date) return "Belirsiz";
    return new Date(date).toLocaleDateString("tr-TR", {
        day: "numeric",
        month: "long",
        year: "numeric"
    });
}
