// System Logs Service
// Global audit logging for all ecosystem activity
// Uses REST API (consistent with rest of the project)

const SYSTEM_LOGS_COLLECTION = "system_logs";

// Types
export type LogCategory = "info" | "warning" | "error" | "success";
export type LogAction =
    | "business_created"
    | "business_updated"
    | "business_deleted"
    | "business_frozen"
    | "business_unfrozen"
    | "admin_login"
    | "admin_logout"
    | "login_failed"
    | "user_login"
    | "user_logout"
    | "profile_updated"
    | "settings_updated"
    | "module_toggled"
    | "cache_purged"
    | "data_cleaned"
    | "industry_created"
    | "industry_updated"
    | "industry_deleted"
    | "plan_created"
    | "plan_updated"
    | "product_created"
    | "product_updated"
    | "product_deleted"
    | "category_created"
    | "category_deleted"
    | "table_created"
    | "table_deleted"
    | "subscription_extended"
    | "qr_scan";

export interface SystemLog {
    id: string;
    timestamp: Date;
    actor: string;
    action: LogAction;
    category: LogCategory;
    message: string;
    metadata?: Record<string, unknown>;
}

// Action labels (Turkish)
export const ACTION_LABELS: Record<LogAction, string> = {
    business_created: "İşletme Oluşturuldu",
    business_updated: "İşletme Güncellendi",
    business_deleted: "İşletme Silindi",
    business_frozen: "İşletme Donduruldu",
    business_unfrozen: "İşletme Aktifleştirildi",
    admin_login: "Admin Girişi",
    admin_logout: "Admin Çıkışı",
    login_failed: "Başarısız Giriş",
    user_login: "Kullanıcı Girişi",
    user_logout: "Kullanıcı Çıkışı",
    profile_updated: "Profil Güncellendi",
    settings_updated: "Ayarlar Güncellendi",
    module_toggled: "Modül Değiştirildi",
    cache_purged: "Önbellek Temizlendi",
    data_cleaned: "Veri Temizlendi",
    industry_created: "Sektör Oluşturuldu",
    industry_updated: "Sektör Güncellendi",
    industry_deleted: "Sektör Silindi",
    plan_created: "Paket Oluşturuldu",
    plan_updated: "Paket Güncellendi",
    product_created: "Ürün Eklendi",
    product_updated: "Ürün Güncellendi",
    product_deleted: "Ürün Silindi",
    category_created: "Kategori Oluşturuldu",
    category_deleted: "Kategori Silindi",
    table_created: "Masa Oluşturuldu",
    table_deleted: "Masa Silindi",
    subscription_extended: "Abonelik Uzatıldı",
    qr_scan: "QR Tarandı",
};

// Category colors
export const CATEGORY_COLORS: Record<LogCategory, string> = {
    info: "#007AFF",
    warning: "#FF9500",
    error: "#FF3B30",
    success: "#34C759",
};

// Write a log entry (REST API)
export async function writeLog(
    action: LogAction,
    actor: string,
    message: string,
    category: LogCategory = "info",
    metadata?: Record<string, unknown>
): Promise<void> {
    try {
        const { createDocumentREST } = await import('./documentStore');

        await createDocumentREST(SYSTEM_LOGS_COLLECTION, {
            actor,
            action,
            category,
            message,
            metadata: metadata || null,
        });
    } catch (error) {
        console.error("Error writing log:", error);
    }
}

// Get recent logs (REST API - optimized: max 20)
export async function getRecentLogs(limitCount: number = 20): Promise<SystemLog[]> {
    try {
        const { getCollectionREST } = await import('./documentStore');

        const docs = await getCollectionREST(SYSTEM_LOGS_COLLECTION);

        // Sort by createdAt DESC and limit
        const sorted = docs
            .sort((a, b) => {
                const dateA = new Date(a.createdAt as string).getTime();
                const dateB = new Date(b.createdAt as string).getTime();
                return dateB - dateA;
            })
            .slice(0, limitCount);

        return sorted.map(doc => ({
            id: doc.id as string,
            timestamp: new Date(doc.createdAt as string),
            actor: doc.actor as string || "system",
            action: doc.action as LogAction,
            category: (doc.category as LogCategory) || "info",
            message: doc.message as string,
            metadata: doc.metadata as Record<string, unknown> | undefined,
        }));
    } catch (error) {
        console.error("Error getting logs:", error);
        return [];
    }
}

// Get logs by category (REST API)
export async function getLogsByCategory(
    category: LogCategory,
    limitCount: number = 20
): Promise<SystemLog[]> {
    const allLogs = await getRecentLogs(100);
    return allLogs.filter(log => log.category === category).slice(0, limitCount);
}

// Subscribe to logs (REST API with polling - optimized)
export function subscribeToLogs(
    callback: (logs: SystemLog[]) => void,
    limitCount: number = 20
): () => void {
    let isActive = true;

    const fetchLogs = async () => {
        if (!isActive) return;
        const logs = await getRecentLogs(limitCount);
        if (isActive) callback(logs);
    };

    // Initial fetch
    fetchLogs();

    // Poll every 10 seconds (optimized for cost)
    const intervalId = setInterval(fetchLogs, 10000);

    return () => {
        isActive = false;
        clearInterval(intervalId);
    };
}

// =============================================
// HELPER FUNCTIONS FOR COMMON LOG TYPES
// =============================================

// Business actions
export async function logBusinessCreation(businessName: string, actor: string): Promise<void> {
    await writeLog(
        "business_created",
        actor,
        `"${businessName}" işletmesi oluşturuldu`,
        "success",
        { businessName }
    );
}

export async function logBusinessUpdate(businessName: string, actor: string, changes?: string[]): Promise<void> {
    await writeLog(
        "business_updated",
        actor,
        `"${businessName}" güncellendi${changes ? `: ${changes.join(", ")}` : ""}`,
        "info",
        { businessName, changes }
    );
}

export async function logBusinessDeletion(businessName: string, actor: string): Promise<void> {
    await writeLog(
        "business_deleted",
        actor,
        `"${businessName}" silindi`,
        "warning",
        { businessName }
    );
}

// Admin actions
export async function logAdminLogin(ip: string, success: boolean): Promise<void> {
    await writeLog(
        success ? "admin_login" : "login_failed",
        "webintosh",
        success ? `Admin girişi yapıldı (${ip})` : `Başarısız giriş denemesi (${ip})`,
        success ? "success" : "error",
        { ip }
    );
}

// User actions
export async function logUserLogin(email: string, businessName: string): Promise<void> {
    await writeLog(
        "user_login",
        email,
        `${email} giriş yaptı (${businessName})`,
        "info",
        { email, businessName }
    );
}

export async function logProfileUpdate(businessName: string, actor: string): Promise<void> {
    await writeLog(
        "profile_updated",
        actor,
        `"${businessName}" profili güncellendi`,
        "info",
        { businessName }
    );
}

// Cache actions
export async function logCachePurge(actor: string): Promise<void> {
    await writeLog(
        "cache_purged",
        actor,
        "Sistem önbelleği temizlendi",
        "info"
    );
}

// Data cleanup
export async function logDataCleanup(actor: string, count: number, sizeBytes: number): Promise<void> {
    const sizeMB = (sizeBytes / (1024 * 1024)).toFixed(2);
    await writeLog(
        "data_cleaned",
        actor,
        `${count} yetim dosya temizlendi (${sizeMB} MB)`,
        "success",
        { count, sizeBytes }
    );
}

// Subscription
export async function logSubscriptionExtended(businessName: string, days: number, actor: string): Promise<void> {
    await writeLog(
        "subscription_extended",
        actor,
        `"${businessName}" aboneliği ${days} gün uzatıldı`,
        "success",
        { businessName, days }
    );
}

// Product actions
export async function logProductCreated(productName: string, businessName: string): Promise<void> {
    await writeLog(
        "product_created",
        businessName,
        `"${productName}" ürünü eklendi`,
        "info",
        { productName, businessName }
    );
}

export async function logProductDeleted(productName: string, businessName: string): Promise<void> {
    await writeLog(
        "product_deleted",
        businessName,
        `"${productName}" ürünü silindi`,
        "warning",
        { productName, businessName }
    );
}
