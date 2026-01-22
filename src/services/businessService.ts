// Business Service - Enterprise-grade with Pagination & Search
// Supabase-backed via documentStore
import type { Business } from "@/types";

const BUSINESSES_COLLECTION = "businesses";

// Paginated read result
export interface PaginatedBusinessesResult {
    businesses: Business[];
    lastDoc: string | null;
    hasMore: boolean;
}

// Get businesses with pagination
export async function getPaginatedBusinesses(
    pageSize: number = 20,
    lastDoc?: string
): Promise<PaginatedBusinessesResult> {
    try {
        const { getCollectionREST } = await import("@/lib/documentStore");
        const docs = await getCollectionREST(BUSINESSES_COLLECTION);

        const sorted = docs.sort((a, b) => {
            const aDate = new Date((a.createdAt as string) || (a.created_at as string) || '').getTime();
            const bDate = new Date((b.createdAt as string) || (b.created_at as string) || '').getTime();
            return bDate - aDate;
        });

        const startIndex = lastDoc ? sorted.findIndex(doc => doc.id === lastDoc) + 1 : 0;
        const page = sorted.slice(startIndex, startIndex + pageSize + 1);
        const businesses = page.slice(0, pageSize) as unknown as Business[];

        return {
            businesses,
            lastDoc: businesses.length ? (businesses[businesses.length - 1].id as string) : null,
            hasMore: page.length > pageSize,
        };
    } catch (error) {
        console.error("Error fetching paginated businesses:", error);
        return { businesses: [], lastDoc: null, hasMore: false };
    }
}

// Real-time subscription with limit
export function subscribeToBusinesses(
    callback: (businesses: Business[]) => void,
    limitCount: number = 50
): () => void {
    let isActive = true;

    const fetchBusinesses = async () => {
        if (!isActive) return;
        const result = await getPaginatedBusinesses(limitCount);
        const filtered = result.businesses.filter(b => b.status !== "deleted");
        if (isActive) callback(filtered);
    };

    fetchBusinesses();
    const intervalId = setInterval(fetchBusinesses, 5000);

    return () => {
        isActive = false;
        clearInterval(intervalId);
    };
}

// Search businesses by name or slug
export async function searchBusinesses(
    searchQuery: string,
    limitCount: number = 20
): Promise<Business[]> {
    try {
        const searchLower = searchQuery.toLowerCase();
        const { getCollectionREST } = await import("@/lib/documentStore");
        const businesses = await getCollectionREST(BUSINESSES_COLLECTION);

        return businesses
            .filter(b => b.status !== "deleted")
            .filter(b =>
                (b.name as string)?.toLowerCase().includes(searchLower) ||
                (b.slug as string)?.toLowerCase().includes(searchLower)
            )
            .slice(0, limitCount) as unknown as Business[];
    } catch (error) {
        console.error("Error searching businesses:", error);
        return [];
    }
}

// Create new business
export async function createBusiness(
    data: Omit<Business, "id" | "createdAt">
): Promise<string> {
    try {
        const { createDocumentREST } = await import("@/lib/documentStore");
        return await createDocumentREST(BUSINESSES_COLLECTION, {
            ...data,
            status: data.status || "pending",
            createdAt: new Date().toISOString(),
        });
    } catch (error) {
        console.error("Error creating business:", error);
        throw new Error("İşletme oluşturulamadı");
    }
}

// Update business
export async function updateBusiness(
    id: string,
    data: Partial<Omit<Business, "id" | "createdAt">>
): Promise<void> {
    try {
        const { updateDocumentREST } = await import("@/lib/documentStore");
        await updateDocumentREST(BUSINESSES_COLLECTION, id, {
            ...data,
            updatedAt: new Date().toISOString(),
        });
    } catch (error) {
        console.error("Error updating business:", error);
        throw new Error("İşletme güncellenemedi");
    }
}

// Delete business (soft delete by default)
export async function deleteBusiness(
    id: string,
    soft: boolean = true
): Promise<void> {
    try {
        const { updateDocumentREST, deleteDocumentREST } = await import("@/lib/documentStore");

        if (soft) {
            await updateDocumentREST(BUSINESSES_COLLECTION, id, {
                status: "deleted",
                deletedAt: new Date().toISOString(),
            });
        } else {
            await deleteDocumentREST(BUSINESSES_COLLECTION, id);
        }
    } catch (error) {
        console.error("Error deleting business:", error);
        throw new Error("İşletme silinemedi");
    }
}

// Toggle business status
export async function toggleBusinessStatus(id: string): Promise<void> {
    try {
        const { getDocumentREST, updateDocumentREST } = await import("@/lib/documentStore");
        const business = await getDocumentREST(BUSINESSES_COLLECTION, id);

        if (!business) {
            throw new Error("İşletme bulunamadı");
        }

        const currentStatus = business.status as string;
        const newStatus = currentStatus === "active" ? "inactive" : "active";

        await updateDocumentREST(BUSINESSES_COLLECTION, id, {
            status: newStatus,
            updatedAt: new Date().toISOString(),
        });
    } catch (error) {
        console.error("Error toggling business status:", error);
        throw new Error("Durum değiştirilemedi");
    }
}

// Get business statistics
export async function getBusinessStats(): Promise<{
    total: number;
    active: number;
    pending: number;
    inactive: number;
}> {
    try {
        const { getCollectionREST } = await import("@/lib/documentStore");
        const businesses = await getCollectionREST(BUSINESSES_COLLECTION);
        const activeBusinesses = businesses.filter(b => b.status !== "deleted");

        return {
            total: activeBusinesses.length,
            active: activeBusinesses.filter(b => b.status === "active").length,
            pending: activeBusinesses.filter(b => b.status === "pending").length,
            inactive: activeBusinesses.filter(b => b.status === "inactive").length,
        };
    } catch (error) {
        console.error("Error getting business stats:", error);
        return { total: 0, active: 0, pending: 0, inactive: 0 };
    }
}

// Get single business by ID
export async function getBusinessById(id: string): Promise<Business | null> {
    try {
        const { getDocumentREST } = await import("@/lib/documentStore");
        const business = await getDocumentREST(BUSINESSES_COLLECTION, id);
        if (!business) return null;
        const createdAtRaw = (business.createdAt as string) || (business.created_at as string) || '';
        return {
            ...(business as unknown as Omit<Business, "createdAt">),
            createdAt: createdAtRaw ? new Date(createdAtRaw) : new Date(),
        } as Business;
    } catch (error) {
        console.error("Error getting business by ID:", error);
        return null;
    }
}

// Get business by slug (for public profiles)
export async function getBusinessBySlug(slug: string): Promise<Business | null> {
    try {
        const { getSupabaseClient } = await import("@/lib/supabase");
        const supabase = getSupabaseClient();
        const { data, error } = await supabase
            .from("businesses")
            .select("id,slug,name,email,status,package,modules,owner,logo,cover,slogan,about,industry_id,industry_label,plan_id,created_at,data")
            .eq("status", "active")
            .ilike("slug", slug)
            .range(0, 0);
        if (error) throw error;
        const row = data?.[0] as any;
        if (!row) return null;

        const payload = (row.data || {}) as Record<string, unknown>;
        const createdAtRaw = (payload.createdAt as string) || (row.created_at as string) || '';

        return {
            id: row.id,
            name: row.name || payload.name,
            email: row.email || payload.email,
            slug: row.slug || payload.slug,
            previousSlugs: payload.previousSlugs as string[] | undefined,
            status: row.status,
            package: row.package || payload.package,
            modules: (row.modules || payload.modules || []) as string[],
            owner: row.owner || payload.owner,
            industry_id: row.industry_id || payload.industry_id,
            industry_label: row.industry_label || payload.industry_label,
            plan_id: row.plan_id || payload.plan_id,
            logo: row.logo || payload.logo,
            cover: row.cover || payload.cover,
            slogan: payload.slogan as string | undefined,
            about: payload.about as string | undefined,
            createdAt: createdAtRaw ? new Date(createdAtRaw) : new Date(),
        } as Business;
    } catch (error) {
        console.error("Error getting business by slug:", error);
        return null;
    }
}
