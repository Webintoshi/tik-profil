// Industry Definitions Service
// Using Supabase-backed data layer

// Collection name
const INDUSTRY_DEFINITIONS_COLLECTION = "industry_definitions";

// Types
export type IndustryCategory = "yeme_icme" | "saglik" | "hizmet" | "perakende" | "konaklama" | "ulasim" | "egitim" | "eglence";

export interface IndustryDefinition {
    id: string;
    label: string;
    slug: string;
    category: IndustryCategory;
    icon: string;
    iconUrl?: string;
    color: string;
    description: string;
    status: "active" | "passive";
    isActive?: boolean;
    createdAt: Date;
    order: number;
    modules?: string[]; // Assigned module IDs from MODULE_REGISTRY
}

// Category labels (Turkish)
export const CATEGORY_LABELS: Record<IndustryCategory, string> = {
    yeme_icme: "Yeme & İçme",
    saglik: "Sağlık & Bakım",
    hizmet: "Hizmet Sektörü",
    perakende: "Perakende & Ticaret",
    konaklama: "Konaklama & Turizm",
    ulasim: "Ulaşım & Lojistik",
    egitim: "Eğitim & Gelişim",
    eglence: "Eğlence & Medya",
};

// Generate slug from label
export function generateSlug(label: string): string {
    return label
        .toLowerCase()
        .replace(/[ğ]/g, "g")
        .replace(/[ü]/g, "u")
        .replace(/[ş]/g, "s")
        .replace(/[ı]/g, "i")
        .replace(/[ö]/g, "o")
        .replace(/[ç]/g, "c")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");
}

// Convert REST doc to IndustryDefinition
function docToIndustry(doc: Record<string, unknown>): IndustryDefinition {
    return {
        id: (doc.id as string) || "",
        label: (doc.label as string) || "",
        slug: (doc.slug as string) || "",
        category: (doc.category as IndustryCategory) || "yeme_icme",
        icon: (doc.icon as string) || "Utensils",
        iconUrl: doc.iconUrl as string | undefined,
        color: (doc.color as string) || "#FF9500",
        description: (doc.description as string) || "",
        status: (doc.status as "active" | "passive") || "active",
        isActive: doc.isActive as boolean | undefined,
        createdAt: doc.createdAt ? new Date(doc.createdAt as string) : new Date(),
        order: (doc.order as number) || 0,
        modules: (doc.modules as string[]) || [],
    };
}

// Get all industry definitions (via API for client compatibility)
export async function getIndustryDefinitions(): Promise<IndustryDefinition[]> {
    try {
        // Check if we're on the server-side
        const isServer = typeof window === 'undefined';

        if (isServer) {
            // Server-side: Use direct Supabase access
            const { getCollectionREST } = await import('./documentStore');
            const docs = await getCollectionREST(INDUSTRY_DEFINITIONS_COLLECTION);
            const definitions = docs.map(docToIndustry);
            definitions.sort((a, b) => (a.order || 0) - (b.order || 0));
            return definitions;
        } else {
            // Client-side: Use API endpoint
            const response = await fetch('/api/industries');
            if (!response.ok) {
                console.error('[getIndustryDefinitions] API error:', response.status);
                return [];
            }
            const data = await response.json();
            if (data.success && Array.isArray(data.industries)) {
                return data.industries.map(docToIndustry);
            }
            return [];
        }
    } catch (error) {
        console.error("Industry fetch error:", error);
        return [];
    }
}

// Get active industry definitions only (REST API)
export async function getActiveIndustryDefinitions(): Promise<IndustryDefinition[]> {
    try {
        const allDefinitions = await getIndustryDefinitions();
        return allDefinitions.filter(d => d.status === "active");
    } catch (error) {
        console.error("REST API error:", error);
        return [];
    }
}

// Subscribe to industry definitions - Using REST API with polling
export function subscribeToIndustryDefinitions(
    callback: (definitions: IndustryDefinition[]) => void
): () => void {
    let isActive = true;

    const fetchData = async () => {
        try {
            const definitions = await getIndustryDefinitions();
            if (isActive) {
                callback(definitions);
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

    // Poll every 5 seconds for "real-time" updates
    const intervalId = setInterval(() => {
        if (isActive) {
            fetchData();
        }
    }, 5000);

    // Return unsubscribe function
    return () => {
        isActive = false;
        clearInterval(intervalId);
    };
}

// Create industry definition (REST API)
export async function createIndustryDefinition(
    data: Omit<IndustryDefinition, "id" | "createdAt">
): Promise<string> {
    const isServer = typeof window === 'undefined';

    if (isServer) {
        const { createDocumentREST } = await import('./documentStore');
        try {
            const docId = await createDocumentREST(INDUSTRY_DEFINITIONS_COLLECTION, data as Record<string, unknown>);
            return docId;
        } catch (error) {
            console.error("REST API error:", error);
            throw error;
        }
    } else {
        const response = await fetch('/api/admin/industries', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });

        const result = await response.json();

        if (!result.success) {
            throw new Error(result.error || 'Failed to create industry definition');
        }

        return result.industry.id;
    }
}

// Update industry definition (REST API)
export async function updateIndustryDefinition(
    id: string,
    data: Partial<Omit<IndustryDefinition, "id" | "createdAt">>
): Promise<void> {
    const isServer = typeof window === 'undefined';

    if (isServer) {
        const { updateDocumentREST } = await import('./documentStore');
        try {
            await updateDocumentREST(INDUSTRY_DEFINITIONS_COLLECTION, id, data as Record<string, unknown>);
        } catch (error) {
            console.error("REST API error:", error);
            throw error;
        }
    } else {
        const response = await fetch('/api/admin/industries', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, ...data }),
        });

        const result = await response.json();

        if (!result.success) {
            throw new Error(result.error || 'Failed to update industry definition');
        }
    }
}

// Delete industry definition (REST API)
export async function deleteIndustryDefinition(id: string): Promise<void> {
    const isServer = typeof window === 'undefined';

    if (isServer) {
        const { deleteDocumentREST } = await import('./documentStore');
        try {
            await deleteDocumentREST(INDUSTRY_DEFINITIONS_COLLECTION, id);
        } catch (error) {
            console.error("REST API error:", error);
            throw error;
        }
    } else {
        const response = await fetch(`/api/admin/industries?id=${id}`, {
            method: 'DELETE',
        });

        const result = await response.json();

        if (!result.success) {
            throw new Error(result.error || 'Failed to delete industry definition');
        }
    }
}

// Toggle industry status
export async function toggleIndustryStatus(
    id: string,
    currentStatus: "active" | "passive"
): Promise<void> {
    const newStatus = currentStatus === "active" ? "passive" : "active";
    await updateIndustryDefinition(id, { status: newStatus });
}

// Default icon options
export const ICON_OPTIONS = [
    { id: "utensils", label: "Restoran", icon: "Utensils" },
    { id: "coffee", label: "Kafe", icon: "Coffee" },
    { id: "wine", label: "Bar", icon: "Wine" },
    { id: "stethoscope", label: "Klinik", icon: "Stethoscope" },
    { id: "scissors", label: "Kuaför", icon: "Scissors" },
    { id: "dumbbell", label: "Spor", icon: "Dumbbell" },
    { id: "wrench", label: "Tamir", icon: "Wrench" },
    { id: "car", label: "Araç", icon: "Car" },
    { id: "building", label: "Otel", icon: "Building" },
    { id: "truck", label: "Lojistik", icon: "Truck" },
    { id: "shopping-bag", label: "Mağaza", icon: "ShoppingBag" },
    { id: "dog", label: "Pet", icon: "Dog" },
    { id: "book", label: "Eğitim", icon: "Book" },
    { id: "camera", label: "Fotoğraf", icon: "Camera" },
    { id: "music", label: "Eğlence", icon: "Music" },
    { id: "heart", label: "Sağlık", icon: "Heart" },
];

// Color options
export const COLOR_OPTIONS = [
    "#FF9500", "#FF3B30", "#007AFF", "#5856D6", "#34C759",
    "#AF52DE", "#FF2D55", "#00CED1", "#FFD700", "#8B4513",
];

// Get modules for a given industry ID (sync - for backward compatibility)
export function getModulesForIndustry(industryId: string | null): string[] {
    const industryModules: Record<string, string[]> = {
        // Yeme & İçme
        "restaurant": ["restaurant"],
        "restoran": ["restaurant"],
        // Coffee Shop / Kahve Dükkanı - TÜM VARYASYONLAR
        "coffee": ["coffee"],
        "kahve": ["coffee"],
        "cafe": ["coffee"],
        "kafe": ["coffee"],
        "coffeeshop": ["coffee"],
        "coffee-shop": ["coffee"],
        "kahvedukkani": ["coffee"],
        "kahve-dukkani": ["coffee"],
        "kahvedükkanı": ["coffee"],
        "kahve-dukkani": ["coffee"],
        "kafeterya": ["coffee"],
        "cafeteria": ["coffee"],
        // Fast Food
        "fastfood": ["fastfood"],
        "fast-food": ["fastfood"],
        "bakery": ["restaurant"],
        "catering": ["restaurant"],
        // Konaklama
        "hotel": ["hotel"],
        "otel": ["hotel"],
        "hostel": ["hotel"],
        "boutique": ["hotel"],
        "aparthotel": ["hotel"],
        "villa": ["hotel"],
        // Sağlık
        "health": ["appointment"],
        "clinic": ["appointment"],
        "dentist": ["appointment"],
        "veteriner": ["appointment"],
        // Güzellik & Hizmet
        "beauty": ["appointment"],
        "salon": ["appointment"],
        "barber": ["appointment"],
        "spa": ["appointment"],
        // E-ticaret
        "e-commerce": ["ecommerce"],
        "ecommerce": ["ecommerce"],
        "retail": ["ecommerce"],
        "market": ["ecommerce"],
    };
    // Return empty array if not found (no hardcoded fallback)
    return industryModules[industryId?.toLowerCase() || ""] || [];
}

// Get modules for a given industry ID - ASYNC version that fetches from document store
export async function getModulesForIndustryAsync(industryId: string | null): Promise<string[]> {
    if (!industryId) return [];

    try {
        const { getCollectionREST } = await import('./documentStore');
        const definitions = await getCollectionREST(INDUSTRY_DEFINITIONS_COLLECTION);

        // Find by ID or slug match
        const industry = definitions.find(
            (def) =>
                def.id === industryId ||
                def.slug === industryId ||
                (def.slug as string)?.toLowerCase() === industryId.toLowerCase() ||
                (def.id as string)?.toLowerCase() === industryId.toLowerCase()
        );

        if (industry && Array.isArray(industry.modules) && industry.modules.length > 0) {
            return industry.modules as string[];
        }

        // Fallback to sync version if no remote modules found
        return getModulesForIndustry(industryId);
    } catch (error) {
        console.error('[getModulesForIndustryAsync] Error:', error);
        return getModulesForIndustry(industryId);
    }
}

// Alias for backward compatibility
export const subscribeToIndustries = subscribeToIndustryDefinitions;
