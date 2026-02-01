/**
 * Audit Service - Activity Logging
 * Using Supabase-backed data layer
 */

// ============================================
// TYPES
// ============================================
export type ActionType =
    | "LOGIN"
    | "LOGOUT"
    | "STAFF_LOGIN"
    | "QR_DOWNLOAD"
    | "PROFILE_UPDATE"
    | "SCHEDULE_CHANGE"
    | "MODULE_CHANGE"
    | "ADMIN_LOGIN"
    | "BUSINESS_CREATE"
    | "BUSINESS_UPDATE"
    | "BUSINESS_DELETE"
    | "SUBSCRIPTION_EXTEND";

export interface AuditLogEntry {
    actor_id: string;
    actor_name: string;
    action_type: ActionType;
    metadata?: Record<string, unknown>;
    timestamp?: Date;
    ip_address?: string;
}

export interface AuditLogDocument extends AuditLogEntry {
    id: string;
    timestamp: Date;
}

export type LogFilter = "all" | "login" | "qr" | "update";

// ============================================
// CONSTANTS
// ============================================
const COLLECTION_NAME = "audit_logs";

// Action type icons and colors for UI
export const ACTION_CONFIG: Record<ActionType, { icon: string; color: string; label: string }> = {
    LOGIN: { icon: "🟢", color: "text-green-500", label: "Giriş" },
    LOGOUT: { icon: "🔴", color: "text-red-500", label: "Çıkış" },
    STAFF_LOGIN: { icon: "🟡", color: "text-yellow-500", label: "Personel Giriş" },
    QR_DOWNLOAD: { icon: "🟣", color: "text-purple-500", label: "QR İndirme" },
    PROFILE_UPDATE: { icon: "🔵", color: "text-blue-500", label: "Profil Güncelleme" },
    SCHEDULE_CHANGE: { icon: "🔵", color: "text-blue-500", label: "Saat Güncelleme" },
    MODULE_CHANGE: { icon: "🟠", color: "text-orange-500", label: "Modül Değişikliği" },
    ADMIN_LOGIN: { icon: "⚫", color: "text-gray-500", label: "Admin Giriş" },
    BUSINESS_CREATE: { icon: "🟢", color: "text-green-500", label: "İşletme Oluşturma" },
    BUSINESS_UPDATE: { icon: "🔵", color: "text-blue-500", label: "İşletme Güncelleme" },
    BUSINESS_DELETE: { icon: "🔴", color: "text-red-500", label: "İşletme Silme" },
    SUBSCRIPTION_EXTEND: { icon: "⏱️", color: "text-emerald-500", label: "Süre Uzatma" },
};

// ============================================
// LOG ACTIVITY - Main logging function (REST API)
// ============================================
export async function logActivity(entry: AuditLogEntry): Promise<string | null> {
    try {
        const { createDocumentREST } = await import('../documentStore');

        const docId = await createDocumentREST(COLLECTION_NAME, {
            ...entry,
            timestamp: new Date().toISOString(),
        });
        return docId;
    } catch (error) {
        console.error("[AUDIT ERROR]", error);
        // Don't throw - logging should never break the main operation
        return null;
    }
}

// ============================================
// GET ACTIVITY LOGS - Retrieve with filters (REST API)
// ============================================
export async function getActivityLogs(
    filter: LogFilter = "all",
    limitCount: number = 50
): Promise<AuditLogDocument[]> {
    try {
        const { getCollectionREST } = await import('../documentStore');

        const docs = await getCollectionREST(COLLECTION_NAME);

        let logs = docs.map(doc => ({
            ...doc,
            id: doc.id as string,
            timestamp: doc.timestamp ? new Date(doc.timestamp as string) : new Date(),
        })) as AuditLogDocument[];

        // Apply filter client-side
        if (filter === "login") {
            logs = logs.filter(l => ["LOGIN", "LOGOUT", "ADMIN_LOGIN"].includes(l.action_type));
        } else if (filter === "qr") {
            logs = logs.filter(l => l.action_type === "QR_DOWNLOAD");
        } else if (filter === "update") {
            logs = logs.filter(l => ["PROFILE_UPDATE", "SCHEDULE_CHANGE", "MODULE_CHANGE", "BUSINESS_UPDATE"].includes(l.action_type));
        }

        // Sort by timestamp desc
        logs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

        // Apply limit
        return logs.slice(0, limitCount);
    } catch (error) {
        console.error("[AUDIT FETCH ERROR]", error);
        return [];
    }
}

// ============================================
// HELPER: GET LOGS BY ACTOR
// ============================================
export async function getLogsByActor(
    actorId: string,
    limitCount: number = 20
): Promise<AuditLogDocument[]> {
    try {
        const allLogs = await getActivityLogs("all", 200);
        return allLogs.filter(l => l.actor_id === actorId).slice(0, limitCount);
    } catch (error) {
        console.error("[AUDIT FETCH ERROR]", error);
        return [];
    }
}

// ============================================
// FORMAT LOG MESSAGE - Human readable
// ============================================
export function formatLogMessage(log: AuditLogDocument): string {
    const { actor_name, action_type, metadata } = log;

    switch (action_type) {
        case "LOGIN":
            return `${actor_name} sisteme giriş yaptı.`;
        case "LOGOUT":
            return `${actor_name} sistemden çıkış yaptı.`;
        case "QR_DOWNLOAD":
            const format = (metadata?.format as string)?.toUpperCase() || "QR";
            return `${actor_name}, QR kodunu (${format}) indirdi.`;
        case "PROFILE_UPDATE":
            return `${actor_name}, profil bilgilerini güncelledi.`;
        case "SCHEDULE_CHANGE":
            return `${actor_name}, çalışma saatlerini güncelledi.`;
        case "MODULE_CHANGE":
            const moduleName = (metadata?.module as string) || "modül";
            const action = metadata?.enabled ? "aktifleştirdi" : "deaktif etti";
            return `${actor_name}, ${moduleName} modülünü ${action}.`;
        case "ADMIN_LOGIN":
            return `Admin (${actor_name}) sisteme giriş yaptı.`;
        case "BUSINESS_CREATE":
            return `${actor_name} işletmesi oluşturuldu.`;
        case "BUSINESS_UPDATE":
            return `${actor_name}, işletme bilgilerini güncelledi.`;
        case "BUSINESS_DELETE":
            return `${actor_name} işletmesi silindi.`;
        case "SUBSCRIPTION_EXTEND":
            const businessName = (metadata?.businessName as string) || "İşletme";
            const daysAdded = (metadata?.daysAdded as number) || 0;
            const newDate = metadata?.newEndDate ? new Date(metadata.newEndDate as string).toLocaleDateString("tr-TR") : "";
            return `${actor_name}, ${businessName}'in süresini ${daysAdded} gün uzattı. Yeni tarih: ${newDate}`;
        default:
            return `${actor_name} bir işlem gerçekleştirdi.`;
    }
}

// ============================================
// FORMAT TIMESTAMP - Turkish locale
// ============================================
export function formatLogTime(timestamp: Date): string {
    if (!timestamp) return "";

    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Az önce";
    if (diffMins < 60) return `${diffMins} dakika önce`;
    if (diffHours < 24) return `${diffHours} saat önce`;
    if (diffDays < 7) return `${diffDays} gün önce`;

    return date.toLocaleDateString("tr-TR", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
    });
}
