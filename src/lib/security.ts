// Security & Audit Logging System

import { getCollectionREST, createDocumentREST } from "./documentStore";

// Collection names
const IP_REGISTRY_COLLECTION = "security_ip_registry";
const AUDIT_LOGS_COLLECTION = "admin_audit_logs";

// Types
export type IPStatus = "WHITE" | "BLACK";

export interface IPRegistryEntry {
    id: string;
    ip_address: string;
    status: IPStatus;
    added_at: Date;
    note: string;
}

export interface AuditLogEntry {
    id: string;
    ip_address: string;
    timestamp: Date;
    user_agent: string;
    status: "success" | "fail";
    geo_location: string;
    username_attempted?: string;
}

// Check IP status in registry
export async function checkIPStatus(ip: string): Promise<IPStatus | null> {
    try {
        const entries = await getCollectionREST(IP_REGISTRY_COLLECTION);
        const match = entries.find(entry => entry.ip_address === ip);

        if (!match) {
            return null; // IP not in registry - allow by default
        }

        return match.status as IPStatus;
    } catch (error) {
        console.error("Error checking IP status:", error);
        return null; // On error, allow access (fail-open)
    }
}

// Log authentication attempt
export async function logAuthAttempt(data: Omit<AuditLogEntry, "id" | "timestamp">): Promise<void> {
    try {
        await createDocumentREST(AUDIT_LOGS_COLLECTION, {
            ...data,
            timestamp: new Date().toISOString(),
        });
    } catch (error) {
        console.error("Error logging auth attempt:", error);
    }
}

// Get recent audit logs (client-safe)
export async function getRecentAuditLogs(limitCount: number = 10): Promise<AuditLogEntry[]> {
    // Check if we're on the client-side
    const isClient = typeof window !== 'undefined';

    if (isClient) {
        // Client-side: audit logs require server-side access
        // Return empty array to prevent errors
        return [];
    }

    try {
        const logs = await getCollectionREST(AUDIT_LOGS_COLLECTION);
        return logs
            .sort((a, b) => new Date((b.timestamp as string) || '').getTime() - new Date((a.timestamp as string) || '').getTime())
            .slice(0, limitCount)
            .map(log => ({
                id: log.id as string,
                ip_address: log.ip_address as string,
                timestamp: new Date((log.timestamp as string) || new Date().toISOString()),
                user_agent: log.user_agent as string,
                status: log.status as "success" | "fail",
                geo_location: log.geo_location as string,
                username_attempted: log.username_attempted as string | undefined,
            }));
    } catch (error) {
        console.error("Error getting audit logs:", error);
        return [];
    }
}

// Subscribe to audit logs (real-time)
export function subscribeToAuditLogs(
    callback: (logs: AuditLogEntry[]) => void,
    limitCount: number = 10
): () => void {
    let isActive = true;

    const fetchLogs = async () => {
        if (!isActive) return;
        const logs = await getRecentAuditLogs(limitCount);
        if (isActive) callback(logs);
    };

    fetchLogs();
    const intervalId = setInterval(fetchLogs, 5000);

    return () => {
        isActive = false;
        clearInterval(intervalId);
    };
}

// Get geo location from IP (using free API)
export async function getGeoLocation(ip: string): Promise<string> {
    try {
        // Skip for localhost
        if (ip === "127.0.0.1" || ip === "::1" || ip.startsWith("192.168.")) {
            return "Yerel Ağ";
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);

        const response = await fetch(`https://ip-api.com/json/${ip}?fields=country,city`, {
            signal: controller.signal,
        });

        clearTimeout(timeoutId);
        if (!response.ok) return "Bilinmiyor";

        const data = await response.json();
        return data.city ? `${data.city}, ${data.country}` : data.country || "Bilinmiyor";
    } catch {
        return "Bilinmiyor";
    }
}

// Get client IP from request headers
export function getClientIP(headers: Headers): string {
    // Check various headers (for proxies/CDNs)
    const forwardedFor = headers.get("x-forwarded-for");
    if (forwardedFor) {
        return forwardedFor.split(",")[0].trim();
    }

    const realIP = headers.get("x-real-ip");
    if (realIP) return realIP;

    const cfConnectingIP = headers.get("cf-connecting-ip");
    if (cfConnectingIP) return cfConnectingIP;

    return "127.0.0.1";
}
