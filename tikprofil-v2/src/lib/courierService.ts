// Courier Fleet Service
// Using Supabase-backed data layer

const COURIERS_COLLECTION = "couriers";

// Types
export type VehicleType = "motosiklet" | "bisiklet" | "ticari" | "yaya";
export type CourierStatus = "online" | "offline" | "busy";

export interface Courier {
    id: string;
    firstName: string;
    lastName: string;
    phone: string;
    tcKimlik?: string;
    vehicleType: VehicleType;
    region: string;
    status: CourierStatus;
    isActive: boolean;
    username: string;
    passwordHash: string;
    lastLocation?: {
        lat: number;
        lng: number;
        timestamp: Date;
    };
    batteryLevel: number;
    createdAt: Date;
}

// Vehicle type labels (Turkish)
export const VEHICLE_LABELS: Record<VehicleType, string> = {
    motosiklet: "Motosiklet",
    bisiklet: "Bisiklet",
    ticari: "Ticari Araç",
    yaya: "Yaya",
};

// Vehicle colors
export const VEHICLE_COLORS: Record<VehicleType, string> = {
    motosiklet: "#007AFF",
    bisiklet: "#34C759",
    ticari: "#FF9500",
    yaya: "#AF52DE",
};

// Status labels (Turkish)
export const STATUS_LABELS: Record<CourierStatus, string> = {
    online: "Çevrimiçi",
    offline: "Çevrimdışı",
    busy: "Meşgul",
};

// Status colors
export const STATUS_COLORS: Record<CourierStatus, string> = {
    online: "#34C759",
    offline: "#8E8E93",
    busy: "#FF9500",
};

// Get all couriers - REST API (client-safe)
export async function getCouriers(): Promise<Courier[]> {
    // Check if we're on the client-side
    const isClient = typeof window !== 'undefined';

    if (isClient) {
        // Client-side: courier data requires server-side access
        // Return empty array to prevent errors
        return [];
    }

    const { getCollectionREST } = await import('./documentStore');

    try {
        const docs = await getCollectionREST(COURIERS_COLLECTION);
        const couriers = docs.map(doc => ({
            ...doc,
            createdAt: doc.createdAt ? new Date(doc.createdAt as string) : new Date(),
            lastLocation: doc.lastLocation ? {
                ...(doc.lastLocation as object),
                timestamp: (doc.lastLocation as any).timestamp ? new Date((doc.lastLocation as any).timestamp as string) : new Date(),
            } : undefined,
        })) as Courier[];
        // Sort by createdAt desc
        couriers.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        return couriers;
    } catch (error) {
        console.error("REST API error:", error);
        return [];
    }
}

// Subscribe to couriers - REST API with polling
export function subscribeToCouriers(callback: (couriers: Courier[]) => void): () => void {
    let isActive = true;

    const fetchData = async () => {
        try {
            const couriers = await getCouriers();
            if (isActive) {
                callback(couriers);
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

// Create courier - REST API
export async function createCourier(data: Omit<Courier, "id" | "createdAt">): Promise<string> {
    const { createDocumentREST } = await import('./documentStore');

    try {
        const docId = await createDocumentREST(COURIERS_COLLECTION, data as Record<string, unknown>);
        return docId;
    } catch (error) {
        console.error("REST API error:", error);
        throw error;
    }
}

// Update courier - REST API
export async function updateCourier(id: string, data: Partial<Omit<Courier, "id" | "createdAt">>): Promise<void> {
    const { updateDocumentREST } = await import('./documentStore');

    try {
        await updateDocumentREST(COURIERS_COLLECTION, id, data as Record<string, unknown>);
    } catch (error) {
        console.error("REST API error:", error);
        throw error;
    }
}

// Delete courier - REST API
export async function deleteCourier(id: string): Promise<void> {
    const { deleteDocumentREST } = await import('./documentStore');

    try {
        await deleteDocumentREST(COURIERS_COLLECTION, id);
    } catch (error) {
        console.error("REST API error:", error);
        throw error;
    }
}

// Update courier status - REST API
export async function updateCourierStatus(id: string, status: CourierStatus): Promise<void> {
    await updateCourier(id, { status });
}

// Update courier location - REST API
export async function updateCourierLocation(id: string, lat: number, lng: number): Promise<void> {
    await updateCourier(id, {
        lastLocation: {
            lat,
            lng,
            timestamp: new Date(),
        },
    });
}
