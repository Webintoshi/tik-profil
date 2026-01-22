/**
 * Event Service - Restaurant Events Management
 * Using REST API for document store operations
 */

// ============================================
// TYPES
// ============================================

export interface FBEvent {
    id: string;
    business_id: string;
    title: string;
    description?: string;
    image?: string;
    date: string; // ISO date string
    start_time: string; // "20:00"
    end_time?: string;  // "23:00"
    location?: string;
    is_active: boolean;
    created_at: Date;
}

// ============================================
// COLLECTION NAME
// ============================================
const EVENTS_COLLECTION = "fb_events";

// ============================================
// HELPER FUNCTIONS
// ============================================

function docToEvent(doc: Record<string, unknown>): FBEvent {
    return {
        id: (doc.id as string) || "",
        business_id: (doc.business_id as string) || "",
        title: (doc.title as string) || "",
        description: doc.description as string | undefined,
        image: doc.image as string | undefined,
        date: (doc.date as string) || "",
        start_time: (doc.start_time as string) || "",
        end_time: doc.end_time as string | undefined,
        location: doc.location as string | undefined,
        is_active: (doc.is_active as boolean) ?? true,
        created_at: doc.created_at ? new Date(doc.created_at as string) : new Date(),
    };
}

// ============================================
// CRUD OPERATIONS
// ============================================

export async function getEvents(businessId: string): Promise<FBEvent[]> {
    const { getCollectionREST } = await import('../documentStore');

    try {
        const docs = await getCollectionREST(EVENTS_COLLECTION);
        const events = docs
            .filter(d => d.business_id === businessId)
            .map(docToEvent);
        events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        return events;
    } catch (error) {
        console.error("REST API error:", error);
        return [];
    }
}

export async function getActiveEvents(businessId: string): Promise<FBEvent[]> {
    const { getCollectionREST } = await import('../documentStore');

    try {
        const docs = await getCollectionREST(EVENTS_COLLECTION);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const events = docs
            .filter(d => d.business_id === businessId)
            .map(docToEvent)
            .filter(e => e.is_active && new Date(e.date) >= today);

        events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        return events;
    } catch (error) {
        console.error("REST API error:", error);
        return [];
    }
}

export async function createEvent(data: Omit<FBEvent, 'id' | 'created_at'>): Promise<string> {
    const { createDocumentREST } = await import('../documentStore');

    const docId = await createDocumentREST(EVENTS_COLLECTION, data as Record<string, unknown>);
    return docId;
}

export async function updateEvent(eventId: string, data: Partial<Omit<FBEvent, 'id' | 'created_at'>>): Promise<void> {
    const { updateDocumentREST } = await import('../documentStore');
    await updateDocumentREST(EVENTS_COLLECTION, eventId, data as Record<string, unknown>);
}

export async function deleteEvent(eventId: string): Promise<void> {
    const { deleteDocumentREST } = await import('../documentStore');
    await deleteDocumentREST(EVENTS_COLLECTION, eventId);
}

export async function toggleEventStatus(eventId: string, isActive: boolean): Promise<void> {
    const { updateDocumentREST } = await import('../documentStore');
    await updateDocumentREST(EVENTS_COLLECTION, eventId, { is_active: isActive });
}
