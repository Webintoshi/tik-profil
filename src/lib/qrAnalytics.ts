/**
 * QR Scan Analytics Service
 * Logs QR scans for dashboard analytics
 */

const QR_SCANS_COLLECTION = "qr_scans";

export interface QRScanEvent {
    id: string;
    business_id: string;
    business_slug: string;
    createdAt: string; // ISO string
    user_agent?: string;
    ip_hash?: string; // Hashed for privacy
}

// Simple hash function for privacy
function simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return Math.abs(hash).toString(16);
}

// Log a QR scan event
export async function logQRScan(
    businessId: string,
    businessSlug: string,
    userAgent?: string,
    clientIp?: string
): Promise<void> {
    try {
        const { createDocumentREST } = await import('./documentStore');

        await createDocumentREST(QR_SCANS_COLLECTION, {
            business_id: businessId,
            business_slug: businessSlug,
            user_agent: userAgent ? userAgent.substring(0, 100) : undefined,
            ip_hash: clientIp ? simpleHash(clientIp) : undefined,
        });
    } catch (error) {
        console.error("Failed to log QR scan:", error);
        // Don't throw - logging should not break the user experience
    }
}

// Get total QR scan count
export async function getTotalQRScans(): Promise<number> {
    try {
        const { getCollectionREST } = await import('./documentStore');
        const scans = await getCollectionREST(QR_SCANS_COLLECTION);
        return scans.length;
    } catch (error) {
        console.error("Failed to get QR scans:", error);
        return 0;
    }
}

// Get QR scans for a specific business
export async function getBusinessQRScans(businessId: string): Promise<number> {
    try {
        const { getCollectionREST } = await import('./documentStore');
        const scans = await getCollectionREST(QR_SCANS_COLLECTION);
        return scans.filter(s => s.business_id === businessId).length;
    } catch (error) {
        console.error("Failed to get business QR scans:", error);
        return 0;
    }
}

// Get QR scans within a date range
export async function getQRScansInRange(startDate: Date, endDate: Date): Promise<number> {
    try {
        const { getCollectionREST } = await import('./documentStore');
        const scans = await getCollectionREST(QR_SCANS_COLLECTION);

        const startISO = startDate.toISOString();
        const endISO = endDate.toISOString();

        return scans.filter(s => {
            const createdAt = s.createdAt as string;
            return createdAt >= startISO && createdAt <= endISO;
        }).length;
    } catch (error) {
        console.error("Failed to get QR scans in range:", error);
        return 0;
    }
}

// Get top businesses by QR scans
export async function getTopBusinessesByScans(limit: number = 10): Promise<{ businessId: string; businessSlug: string; count: number }[]> {
    try {
        const { getCollectionREST } = await import('./documentStore');
        const scans = await getCollectionREST(QR_SCANS_COLLECTION);

        // Count scans per business
        const countMap: Record<string, { businessId: string; businessSlug: string; count: number }> = {};

        for (const scan of scans) {
            const id = scan.business_id as string;
            if (!countMap[id]) {
                countMap[id] = {
                    businessId: id,
                    businessSlug: scan.business_slug as string,
                    count: 0
                };
            }
            countMap[id].count++;
        }

        // Sort by count descending
        return Object.values(countMap)
            .sort((a, b) => b.count - a.count)
            .slice(0, limit);
    } catch (error) {
        console.error("Failed to get top businesses:", error);
        return [];
    }
}
