/**
 * Calculate distance between two coordinates using Haversine formula
 */
export function calculateDistance(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number
): number {
    const R = 6371; // Earth's radius in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

/**
 * Format distance for display
 */
export function formatDistance(km: number): string {
    if (km < 1) {
        return `${Math.round(km * 1000)} m`;
    }
    return `${km.toFixed(1)} km`;
}

/**
 * Sort items by distance
 */
export function sortByDistance<T extends { lat?: number; lng?: number }>(
    items: T[],
    userLat: number,
    userLng: number
): T[] {
    return [...items].sort((a, b) => {
        const distA = a.lat && a.lng ? calculateDistance(userLat, userLng, a.lat, a.lng) : 999999;
        const distB = b.lat && b.lng ? calculateDistance(userLat, userLng, b.lat, b.lng) : 999999;
        return distA - distB;
    });
}
