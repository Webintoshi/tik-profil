// Supabase-backed document store layer
import { getSupabaseAdmin } from './supabase';

const DOCUMENTS_TABLE = 'app_documents';
const BUSINESSES_TABLE = 'businesses';
const PAGE_SIZE = 1000;

const DIRECT_BUSINESS_TABLES = new Set([
    'ff_products',
    'ff_categories',
    'ff_extra_groups',
    'ff_extras',
    'ff_orders',
    'ff_campaigns',
    'ff_settings',
    'fb_tables',
    'fb_products',
    'fb_categories',
    'fb_settings',
]);

function toArray(value: unknown): string[] {
    return Array.isArray(value) ? value.map(item => String(item)) : [];
}

function mapBusinessToRow(doc: Record<string, unknown>) {
    return {
        id: doc.id as string,
        name: (doc.name as string) || null,
        email: (doc.email as string) || null,
        slug: (doc.slug as string) || null,
        previous_slugs: toArray(doc.previousSlugs),
        phone: (doc.phone as string) || null,
        whatsapp: (doc.whatsapp as string) || (doc.phone as string) || null,
        status: (doc.status as string) || 'active',
        package: (doc.package as string) || 'starter',
        modules: Array.isArray(doc.modules) ? (doc.modules as string[]) : [],
        owner: (doc.owner as string) || null,
        industry_id: (doc.industry_id as string) || (doc.industryId as string) || null,
        industry_label: (doc.industry_label as string) || (doc.industryLabel as string) || null,
        plan_id: (doc.plan_id as string) || (doc.planId as string) || null,
        logo: (doc.logo as string) || null,
        cover: (doc.cover as string) || null,
        slogan: (doc.slogan as string) || null,
        about: (doc.about as string) || null,
        subscription_status: (doc.subscriptionStatus as string) || null,
        subscription_start_date: (doc.subscriptionStartDate as string) || null,
        subscription_end_date: (doc.subscriptionEndDate as string) || null,
        package_id: (doc.packageId as string) || null,
        is_frozen: (doc.isFrozen as boolean) || false,
        frozen_at: (doc.frozenAt as string) || null,
        frozen_remaining_days: (doc.frozenRemainingDays as number) || null,
        data: doc,
        created_at: (doc.createdAt as string) || null,
        updated_at: (doc.updatedAt as string) || (doc.createdAt as string) || null,
    };
}

function mapBusinessRowToDoc(row: Record<string, unknown>): Record<string, unknown> {
    const data = (row.data as Record<string, unknown>) || {};
    return {
        ...data,
        id: row.id as string,
        name: (row.name as string) || data.name || '',
        email: (row.email as string) || data.email || '',
        slug: (row.slug as string) || data.slug || '',
        previousSlugs: (row.previous_slugs as string[]) || data.previousSlugs || [],
        phone: (row.phone as string) || data.phone || '',
        whatsapp: (row.whatsapp as string) || data.whatsapp || data.phone || '',
        status: (row.status as string) || data.status || 'active',
        package: (row.package as string) || data.package || 'starter',
        modules: (row.modules as string[]) || data.modules || [],
        owner: (row.owner as string) || data.owner || '',
        industry_id: (row.industry_id as string) || data.industry_id || data.industryId || null,
        industry_label: (row.industry_label as string) || data.industry_label || data.industryLabel || null,
        plan_id: (row.plan_id as string) || data.plan_id || data.planId || null,
        logo: (row.logo as string) || data.logo || '',
        cover: (row.cover as string) || data.cover || '',
        slogan: (row.slogan as string) || data.slogan || '',
        about: (row.about as string) || data.about || '',
        subscriptionStatus: (row.subscription_status as string) || data.subscriptionStatus || null,
        subscriptionStartDate: (row.subscription_start_date as string) || data.subscriptionStartDate || null,
        subscriptionEndDate: (row.subscription_end_date as string) || data.subscriptionEndDate || null,
        packageId: (row.package_id as string) || data.packageId || null,
        isFrozen: (row.is_frozen as boolean) ?? data.isFrozen ?? false,
        frozenAt: (row.frozen_at as string) || data.frozenAt || null,
        frozenRemainingDays: (row.frozen_remaining_days as number) ?? data.frozenRemainingDays ?? null,
        createdAt: (row.created_at as string) || data.createdAt || null,
        updatedAt: (row.updated_at as string) || data.updatedAt || null,
    };
}

// Create a document in a collection
export async function createDocumentREST(
    collection: string,
    data: Record<string, unknown>,
    documentId?: string
): Promise<string> {
    // Client-side guard: Throw error to prevent SUPABASE_SERVICE_ROLE_KEY errors
    if (typeof window !== 'undefined') {
        console.warn(`[createDocumentREST] Called on client-side for "${collection}". Throwing error.`);
        throw new Error('createDocumentREST can only be called server-side');
    }

    const supabase = getSupabaseAdmin();
    const now = new Date().toISOString();
    const dataWithTimestamp = {
        ...data,
        createdAt: now,
    };

    if (collection === BUSINESSES_TABLE) {
        const row = mapBusinessToRow({ ...dataWithTimestamp, id: documentId || (data.id as string) });
        const { data: result, error } = await supabase
            .from(BUSINESSES_TABLE)
            .upsert(row, { onConflict: 'id' })
            .select('id')
            .single();

        if (error) throw error;
        return result.id as string;
    }

    const insertRow = {
        collection,
        id: documentId || undefined,
        data: dataWithTimestamp,
        created_at: now,
        updated_at: now,
    };

    const { data: result, error } = await supabase
        .from(DOCUMENTS_TABLE)
        .upsert(insertRow, { onConflict: 'collection,id' })
        .select('id')
        .single();

    if (error) throw error;
    return result.id as string;
}

// Get a single document by ID
export async function getDocumentREST(
    collection: string,
    documentId: string
): Promise<Record<string, unknown> | null> {
    // Client-side guard: Return null to prevent SUPABASE_SERVICE_ROLE_KEY errors
    if (typeof window !== 'undefined') {
        console.warn(`[getDocumentREST] Called on client-side for "${collection}/${documentId}". Returning null.`);
        return null;
    }

    const supabase = getSupabaseAdmin();

    if (collection === BUSINESSES_TABLE) {
        const { data, error } = await supabase
            .from(BUSINESSES_TABLE)
            .select('*')
            .eq('id', documentId)
            .maybeSingle();

        if (error) throw error;
        if (!data) return null;
        return mapBusinessRowToDoc(data as Record<string, unknown>);
    }

    const { data, error } = await supabase
        .from(DOCUMENTS_TABLE)
        .select('id,data')
        .eq('collection', collection)
        .eq('id', documentId)
        .maybeSingle();

    if (error) throw error;
    if (!data) return null;
    return { id: data.id, ...(data.data as Record<string, unknown>) };
}

// Get all documents from a collection (with pagination support)
// NOTE: This function requires server-side environment. Returns empty array on client-side.
export async function getCollectionREST<T = Record<string, unknown>>(
    collection: string
): Promise<T[]> {
    // Client-side guard: Return empty array to prevent SUPABASE_SERVICE_ROLE_KEY errors
    if (typeof window !== 'undefined') {
        console.warn(`[getCollectionREST] Called on client-side for "${collection}". Returning empty array.`);
        return [];
    }

    const supabase = getSupabaseAdmin();
    const allDocuments: Record<string, unknown>[] = [];
    let offset = 0;

    if (collection === BUSINESSES_TABLE) {
        while (true) {
            const { data, error } = await supabase
                .from(BUSINESSES_TABLE)
                .select('*')
                .range(offset, offset + PAGE_SIZE - 1);

            if (error) throw error;
            if (!data || data.length === 0) break;

            allDocuments.push(...data.map(row => mapBusinessRowToDoc(row as Record<string, unknown>)));
            if (data.length < PAGE_SIZE) break;
            offset += PAGE_SIZE;
        }
        return allDocuments;
    }

    while (true) {
        const { data, error } = await supabase
            .from(DOCUMENTS_TABLE)
            .select('id,data')
            .eq('collection', collection)
            .range(offset, offset + PAGE_SIZE - 1);

        if (error) throw error;
        if (!data || data.length === 0) break;

        allDocuments.push(...data.map(row => ({ id: row.id, ...(row.data as Record<string, unknown>) })));
        if (data.length < PAGE_SIZE) break;
        offset += PAGE_SIZE;
    }

    return allDocuments as T[];
}

// Update a document (PARTIAL UPDATE - preserves other fields)
export async function updateDocumentREST(
    collection: string,
    documentId: string,
    data: Record<string, unknown>
): Promise<void> {
    // Client-side guard: Throw error to prevent SUPABASE_SERVICE_ROLE_KEY errors
    if (typeof window !== 'undefined') {
        console.warn(`[updateDocumentREST] Called on client-side for "${collection}". Throwing error.`);
        throw new Error('updateDocumentREST can only be called server-side');
    }

    const supabase = getSupabaseAdmin();
    const dataWithTimestamp = {
        ...data,
        updatedAt: new Date().toISOString(),
    };

    if (collection === BUSINESSES_TABLE) {
        const existing = await getDocumentREST(collection, documentId);
        if (!existing) {
            throw new Error(`Document not found: ${collection}/${documentId}`);
        }

        const merged = { ...existing, ...dataWithTimestamp, id: documentId };
        const row = mapBusinessToRow(merged);

        const { error } = await supabase
            .from(BUSINESSES_TABLE)
            .update(row)
            .eq('id', documentId);

        if (error) throw error;
        return;
    }

    const { data: existingRow, error: fetchError } = await supabase
        .from(DOCUMENTS_TABLE)
        .select('data')
        .eq('collection', collection)
        .eq('id', documentId)
        .maybeSingle();

    if (fetchError) throw fetchError;
    if (!existingRow) {
        throw new Error(`Document not found: ${collection}/${documentId}`);
    }

    const existingData = (existingRow.data as Record<string, unknown>) || {};
    const merged = { ...existingData, ...dataWithTimestamp };

    const { error } = await supabase
        .from(DOCUMENTS_TABLE)
        .update({ data: merged, updated_at: dataWithTimestamp.updatedAt })
        .eq('collection', collection)
        .eq('id', documentId);

    if (error) throw error;
}

// Delete a document
export async function deleteDocumentREST(
    collection: string,
    documentId: string
): Promise<void> {
    // Client-side guard: Throw error to prevent SUPABASE_SERVICE_ROLE_KEY errors
    if (typeof window !== 'undefined') {
        console.warn(`[deleteDocumentREST] Called on client-side for "${collection}". Throwing error.`);
        throw new Error('deleteDocumentREST can only be called server-side');
    }

    const supabase = getSupabaseAdmin();

    if (collection === BUSINESSES_TABLE) {
        const { error } = await supabase
            .from(BUSINESSES_TABLE)
            .delete()
            .eq('id', documentId);

        if (error) throw error;
        return;
    }

    const { error } = await supabase
        .from(DOCUMENTS_TABLE)
        .delete()
        .eq('collection', collection)
        .eq('id', documentId);

    if (error) throw error;
}

// Delete all documents in a collection where a field matches a value
// Returns the number of documents deleted
export async function deleteByFieldREST(
    collection: string,
    fieldName: string,
    fieldValue: string
): Promise<number> {
    try {
        const documents = await getCollectionREST(collection);
        const matching = documents.filter(doc => doc[fieldName] === fieldValue);
        for (const doc of matching) {
            const docId = doc.id as string;
            if (docId) {
                await deleteDocumentREST(collection, docId);
            }
        }
        return matching.length;
    } catch (error) {
        console.error("REST API Batch Delete Error:", error);
        throw error;
    }
}

// Delete all documents in a collection by businessId (supports both field name variants)
export async function deleteByBusinessIdREST(
    collection: string,
    businessId: string
): Promise<number> {
    try {
        const supabase = getSupabaseAdmin();

        if (DIRECT_BUSINESS_TABLES.has(collection)) {
            const { count, error } = await supabase
                .from(collection)
                .delete({ count: 'exact' })
                .eq('business_id', businessId);

            if (error) throw error;
            return count || 0;
        }

        const documents = await getCollectionREST(collection);
        const matching = documents.filter(doc =>
            doc.businessId === businessId ||
            doc.business_id === businessId
        );
        for (const doc of matching) {
            const docId = doc.id as string;
            if (docId) {
                await deleteDocumentREST(collection, docId);
            }
        }
        return matching.length;
    } catch (error) {
        console.error("REST API Batch Delete Error:", error);
        return 0;
    }
}

// Complete list of all collections that may contain business-related data
const BUSINESS_DATA_COLLECTIONS = [
    // FastFood Module
    'ff_products',
    'ff_categories',
    'ff_extra_groups',
    'ff_extras',
    'ff_orders',
    'ff_campaigns',
    'ff_settings',

    // Beauty Module
    'beauty_services',
    'beauty_categories',
    'beauty_staff',
    'beauty_appointments',

    // Food & Beverage
    'fb_tables',
    'fb_products',
    'fb_categories',
    'fb_orders',

    // Real Estate (Emlak Module)
    'em_listings',
    'em_consultants',

    // Fitness/Gym
    'gym_members',
    'gym_classes',
    'gym_trainers',

    // Clinic
    'clinic_patients',
    'clinic_appointments',
    'clinic_doctors',

    // Common/Shared
    'active_modules',
    'business_staff',
    'staff_permissions',
    'qr_scans',
    'activity_logs',
    'password_reset_tokens',
];

// Cascade delete all data associated with a business
export async function cascadeDeleteBusinessData(businessId: string): Promise<Record<string, number>> {
    const results: Record<string, number> = {};

    for (const collection of BUSINESS_DATA_COLLECTIONS) {
        try {
            results[collection] = await deleteByBusinessIdREST(collection, businessId);
        } catch (error) {
            console.error(`Error deleting from ${collection}:`, error);
            results[collection] = 0;
        }
    }
    return results;
}


