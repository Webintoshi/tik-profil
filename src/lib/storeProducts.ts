// Store Products Service
// Using Supabase-backed data layer

const STORE_PRODUCTS_COLLECTION = "store_products";

export interface StoreProduct {
    id: string;
    name: string;
    slug: string;
    description: string;
    price: number;
    stock: number;
    imageUrl: string;
    category: "nfc" | "stand" | "accessory";
    status: "active" | "out_of_stock" | "passive";
    createdAt: Date;
}

// Get all products - REST API
export async function getStoreProducts(): Promise<StoreProduct[]> {
    const { getCollectionREST } = await import('./documentStore');

    try {
        const docs = await getCollectionREST(STORE_PRODUCTS_COLLECTION);
        const products = docs.map(doc => ({
            ...doc,
            createdAt: doc.createdAt ? new Date(doc.createdAt as string) : new Date(),
        })) as StoreProduct[];
        // Sort by createdAt desc
        products.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        return products;
    } catch (error) {
        console.error("REST API error:", error);
        return [];
    }
}

// Subscribe to products - REST API with polling
export function subscribeToProducts(callback: (products: StoreProduct[]) => void): () => void {
    let isActive = true;

    const fetchData = async () => {
        try {
            const products = await getStoreProducts();
            if (isActive) {
                callback(products);
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

// Create product - REST API
export async function createProduct(data: Omit<StoreProduct, "id" | "createdAt">): Promise<string> {
    const { createDocumentREST } = await import('./documentStore');

    try {
        const docId = await createDocumentREST(STORE_PRODUCTS_COLLECTION, data as Record<string, unknown>);
        return docId;
    } catch (error) {
        console.error("REST API error:", error);
        throw error;
    }
}

// Update product - REST API
export async function updateProduct(id: string, data: Partial<Omit<StoreProduct, "id" | "createdAt">>): Promise<void> {
    const { updateDocumentREST } = await import('./documentStore');

    try {
        await updateDocumentREST(STORE_PRODUCTS_COLLECTION, id, data as Record<string, unknown>);
    } catch (error) {
        console.error("REST API error:", error);
        throw error;
    }
}

// Delete product - REST API
export async function deleteProduct(id: string): Promise<void> {
    const { deleteDocumentREST } = await import('./documentStore');

    try {
        await deleteDocumentREST(STORE_PRODUCTS_COLLECTION, id);
    } catch (error) {
        console.error("REST API error:", error);
        throw error;
    }
}

// Category labels
export const CATEGORY_LABELS: Record<StoreProduct["category"], string> = {
    nfc: "NFC Kart",
    stand: "Stand",
    accessory: "Aksesuar",
};
