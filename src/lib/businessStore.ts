// Business data service layer
// Uses Supabase-backed document store

import type { Business } from "@/types";

const BUSINESSES_COLLECTION = "businesses";

// Convert REST API doc to Business type
function docToBusiness(doc: Record<string, unknown>): Business {
    return {
        id: (doc.id as string) || "",
        name: (doc.name as string) || "İsimsiz İşletme",
        email: (doc.email as string) || "",
        slug: (doc.slug as string) || "",
        status: (doc.status as "active" | "pending" | "inactive" | "expired" | "frozen") || "active",
        package: (doc.package as "starter" | "pro" | "ultimate") || "starter",
        modules: (doc.modules as string[]) || [],
        createdAt: doc.createdAt ? new Date(doc.createdAt as string) : new Date(),
        owner: (doc.owner as string) || "",
        // Profile fields
        logo: (doc.logo as string) || "",
        cover: (doc.cover as string) || "",
        slogan: (doc.slogan as string) || "",
        about: (doc.about as string) || "",
        // Subscription fields
        subscriptionStatus: (doc.subscriptionStatus as "active" | "expired" | "trial" | "free") || "active",
        subscriptionEndDate: doc.subscriptionEndDate ? new Date(doc.subscriptionEndDate as string) : null,
        subscriptionStartDate: doc.subscriptionStartDate ? new Date(doc.subscriptionStartDate as string) : null,
        packageId: (doc.packageId as string) || null,
        // Freeze functionality
        isFrozen: (doc.isFrozen as boolean) || false,
        frozenAt: doc.frozenAt ? new Date(doc.frozenAt as string) : null,
        frozenRemainingDays: (doc.frozenRemainingDays as number) || null,
    };
}

// Get all businesses (client-safe)
export async function getBusinesses(): Promise<Business[]> {
    // Check if we're on the client-side
    const isClient = typeof window !== 'undefined';

    if (isClient) {
        // Client-side: Use API endpoint
        try {
            const response = await fetch('/api/admin/businesses', {
                credentials: 'include'
            });
            if (!response.ok) {
                console.error('[getBusinesses] API error:', response.status);
                return [];
            }
            const data = await response.json();
            if (data.success && Array.isArray(data.businesses)) {
                return data.businesses.map((b: Record<string, unknown>) => docToBusiness(b));
            }
            return [];
        } catch (error) {
            console.error('[getBusinesses] Fetch error:', error);
            return [];
        }
    }

    // Server-side: Use direct Supabase access
    const { getCollectionREST } = await import('./documentStore');

    try {
        const docs = await getCollectionREST(BUSINESSES_COLLECTION);
        const businesses = docs.map(docToBusiness);
        // Sort by createdAt desc
        businesses.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        return businesses;
    } catch (error) {
        console.error("REST API error:", error);
        throw error;
    }
}

// Get single business by ID
export async function getBusiness(id: string): Promise<Business | null> {
    const { getDocumentREST } = await import('./documentStore');

    try {
        const doc = await getDocumentREST(BUSINESSES_COLLECTION, id);
        if (!doc) return null;
        return docToBusiness(doc);
    } catch (error) {
        console.error("REST API error:", error);
        throw error;
    }
}

// Create new business
export async function createBusiness(business: Omit<Business, "id" | "createdAt">): Promise<string> {
    const { createDocumentREST } = await import('./documentStore');

    try {
        const id = await createDocumentREST(BUSINESSES_COLLECTION, business as Record<string, unknown>);
        return id;
    } catch (error) {
        console.error("REST API error:", error);
        throw error;
    }
}

// Update business
export async function updateBusiness(id: string, data: Partial<Business>): Promise<void> {
    const { updateDocumentREST } = await import('./documentStore');

    try {
        await updateDocumentREST(BUSINESSES_COLLECTION, id, data as Record<string, unknown>);
    } catch (error) {
        console.error("REST API error:", error);
        throw error;
    }
}

// Delete business (client-safe)
export async function deleteBusiness(id: string): Promise<void> {
    // Check if we're on the client-side
    const isClient = typeof window !== 'undefined';

    if (isClient) {
        // Client-side: Use API endpoint
        const response = await fetch(`/api/admin/businesses?id=${id}`, {
            method: 'DELETE',
            credentials: 'include'
        });
        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.error || 'Delete failed');
        }
        return;
    }

    // Server-side: Use direct Supabase access
    const { deleteDocumentREST } = await import('./documentStore');

    try {
        await deleteDocumentREST(BUSINESSES_COLLECTION, id);
    } catch (error) {
        console.error("REST API error:", error);
        throw error;
    }
}

// Subscribe to businesses (polling-based for near real-time updates)
export function subscribeToBusinesses(callback: (businesses: Business[]) => void): () => void {
    let isActive = true;

    const fetchData = async () => {
        try {
            const businesses = await getBusinesses();
            if (isActive) {
                callback(businesses);
            }
        } catch (error) {
            console.error("Polling fetch error:", error);
            if (isActive) {
                callback([]);
            }
        }
    };

    // Initial fetch
    fetchData();

    // Poll every 5 seconds
    const intervalId = setInterval(() => {
        if (isActive) {
            fetchData();
        }
    }, 5000);

    return () => {
        isActive = false;
        clearInterval(intervalId);
    };
}

// Check if slug is available
export async function isSlugAvailable(slug: string): Promise<boolean> {
    try {
        const businesses = await getBusinesses();
        return !businesses.some(b => b.slug === slug);
    } catch (error) {
        console.error("REST API error:", error);
        throw error;
    }
}
