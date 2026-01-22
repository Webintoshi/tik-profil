// Subscription Plans Service
// Using Supabase-backed data layer

const SUBSCRIPTION_PLANS_COLLECTION = "subscription_plans";

export interface SubscriptionPlan {
    id: string;
    name: string;
    slug: string;
    description: string;
    monthlyPrice: number;
    yearlyPrice: number;
    features: string[];
    modules: string[]; // Module IDs from ModuleRegistry
    maxProducts: number;
    isBestSeller: boolean;
    status: "active" | "passive";
    order: number;
    createdAt: Date;
}

// Get all plans - REST API (client-safe)
export async function getSubscriptionPlans(): Promise<SubscriptionPlan[]> {
    // Check if we're on the client-side
    const isClient = typeof window !== 'undefined';

    if (isClient) {
        // Client-side: subscription plans are not needed for registration
        // Return empty array to prevent server-only env var errors
        return [];
    }

    const { getCollectionREST } = await import('./documentStore');

    try {
        const docs = await getCollectionREST(SUBSCRIPTION_PLANS_COLLECTION);
        const plans = docs.map(doc => ({
            ...doc,
            createdAt: doc.createdAt ? new Date(doc.createdAt as string) : new Date(),
        })) as SubscriptionPlan[];
        // Sort by order asc
        plans.sort((a, b) => (a.order || 0) - (b.order || 0));
        return plans;
    } catch (error) {
        console.error("REST API error:", error);
        return [];
    }
}

// Get active plans only - REST API
export async function getActivePlans(): Promise<SubscriptionPlan[]> {
    try {
        const allPlans = await getSubscriptionPlans();
        return allPlans.filter(p => p.status === "active");
    } catch (error) {
        console.error("REST API error:", error);
        return [];
    }
}

// Subscribe to plans - REST API with polling
export function subscribeToPlans(callback: (plans: SubscriptionPlan[]) => void): () => void {
    let isActive = true;

    const fetchData = async () => {
        try {
            const plans = await getSubscriptionPlans();
            if (isActive) {
                callback(plans);
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

// Create plan - REST API
export async function createPlan(data: Omit<SubscriptionPlan, "id" | "createdAt">): Promise<string> {
    const { createDocumentREST } = await import('./documentStore');

    try {
        const docId = await createDocumentREST(SUBSCRIPTION_PLANS_COLLECTION, data as Record<string, unknown>);
        return docId;
    } catch (error) {
        console.error("REST API error:", error);
        throw error;
    }
}

// Update plan - REST API
export async function updatePlan(id: string, data: Partial<Omit<SubscriptionPlan, "id" | "createdAt">>): Promise<void> {
    const { updateDocumentREST } = await import('./documentStore');

    try {
        await updateDocumentREST(SUBSCRIPTION_PLANS_COLLECTION, id, data as Record<string, unknown>);
    } catch (error) {
        console.error("REST API error:", error);
        throw error;
    }
}

// Delete plan - REST API
export async function deletePlan(id: string): Promise<void> {
    const { deleteDocumentREST } = await import('./documentStore');

    try {
        await deleteDocumentREST(SUBSCRIPTION_PLANS_COLLECTION, id);
    } catch (error) {
        console.error("REST API error:", error);
        throw error;
    }
}
