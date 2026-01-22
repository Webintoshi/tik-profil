// System Log Service - For activity tracking

const LOGS_COLLECTION = "system_logs";

export interface SystemLog {
    id: string;
    action: string;
    userId: string;
    username: string;
    ipAddress?: string;
    userAgent?: string;
    details: Record<string, any>;
    timestamp: Date;
    level: "info" | "warning" | "error";
}

export interface PaginatedLogsResult {
    logs: SystemLog[];
    lastDoc: string | null;
    hasMore: boolean;
}

// Create a new log entry
export async function createLog(
    action: string,
    userId: string,
    username: string,
    details: Record<string, any> = {},
    level: "info" | "warning" | "error" = "info"
): Promise<void> {
    try {
        const { createDocumentREST } = await import("@/lib/documentStore");
        await createDocumentREST(LOGS_COLLECTION, {
            action,
            userId,
            username,
            details,
            level,
            timestamp: new Date().toISOString(),
        });
    } catch (error) {
        console.error("Error creating log:", error);
        // Don't throw - logging should never break the app
    }
}

// Get paginated logs
export async function getPaginatedLogs(
    pageSize: number = 20,
    lastDoc?: string
): Promise<PaginatedLogsResult> {
    try {
        const { getCollectionREST } = await import("@/lib/documentStore");
        const docs = await getCollectionREST(LOGS_COLLECTION);

        const sorted = docs
            .sort((a, b) => new Date((b.timestamp as string) || (b.createdAt as string) || '').getTime()
                - new Date((a.timestamp as string) || (a.createdAt as string) || '').getTime());

        const startIndex = lastDoc ? sorted.findIndex(log => log.id === lastDoc) + 1 : 0;
        const page = sorted.slice(startIndex, startIndex + pageSize + 1);
        const logs = page.slice(0, pageSize).map(log => ({
            id: log.id as string,
            action: log.action as string,
            userId: log.userId as string,
            username: log.username as string,
            details: (log.details as Record<string, any>) || {},
            level: (log.level as SystemLog["level"]) || "info",
            timestamp: new Date((log.timestamp as string) || (log.createdAt as string) || new Date().toISOString()),
        }));

        return {
            logs,
            lastDoc: logs.length ? logs[logs.length - 1].id : null,
            hasMore: page.length > pageSize,
        };
    } catch (error) {
        console.error("Error fetching paginated logs:", error);
        return { logs: [], lastDoc: null, hasMore: false };
    }
}

// Subscribe to recent logs (real-time)
export function subscribeToLogs(
    callback: (logs: SystemLog[]) => void,
    limitCount: number = 50
): () => void {
    let isActive = true;

    const fetchLogs = async () => {
        if (!isActive) return;
        const result = await getPaginatedLogs(limitCount);
        if (isActive) callback(result.logs);
    };

    fetchLogs();
    const intervalId = setInterval(fetchLogs, 5000);

    return () => {
        isActive = false;
        clearInterval(intervalId);
    };
}
