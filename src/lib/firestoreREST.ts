interface FirestoreResponse<T> {
    documents?: T[];
    error?: string;
}

interface DocumentData {
    [key: string]: any;
}

const FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'tikprofil-v2';

async function firestoreRequest(
    collection: string,
    method: string,
    documentId?: string,
    body?: any
): Promise<any> {
    const url = documentId
        ? `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/${collection}/${documentId}`
        : `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/${collection}`;

    const options: RequestInit = {
        method,
        headers: {
            'Content-Type': 'application/json',
        },
    };

    if (body) {
        options.body = JSON.stringify(body);
    }

    try {
        const response = await fetch(url, options);

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error?.message || `HTTP ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Firestore REST error:', error);
        throw error;
    }
}

export async function getCollectionREST<T>(collection: string): Promise<T[]> {
    try {
        const result = await firestoreRequest(collection, 'GET');

        if (!result.documents || !Array.isArray(result.documents)) {
            return [];
        }

        return result.documents.map((doc: any) => ({
            id: doc.name.split('/').pop(),
            ...doc.fields,
        })) as T[];
    } catch (error) {
        console.error(`Error getting collection ${collection}:`, error);
        return [];
    }
}

export async function getDocumentREST<T>(collection: string, documentId: string): Promise<T | null> {
    try {
        const result = await firestoreRequest(collection, 'GET', documentId);

        if (!result.fields) {
            return null;
        }

        return {
            id: documentId,
            ...result.fields,
        } as T;
    } catch (error) {
        console.error(`Error getting document ${collection}/${documentId}:`, error);
        return null;
    }
}

export async function createDocumentREST<T>(
    collection: string,
    data: T,
    documentId?: string
): Promise<{ id: string; data: T }> {
    try {
        const url = documentId
            ? `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/${collection}/${documentId}`
            : `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/${collection}?documentId=${documentId || ''}`;

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ fields: data }),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error?.message || `HTTP ${response.status}`);
        }

        const result = await response.json();
        const id = result.name.split('/').pop() || documentId || '';

        return { id, data };
    } catch (error) {
        console.error(`Error creating document in ${collection}:`, error);
        throw error;
    }
}

export async function updateDocumentREST<T>(
    collection: string,
    documentId: string,
    data: Partial<T>
): Promise<{ id: string; data: Partial<T> }> {
    try {
        const result = await firestoreRequest(
            collection,
            'PATCH',
            documentId,
            { fields: data }
        );

        return {
            id: documentId,
            data,
        };
    } catch (error) {
        console.error(`Error updating document ${collection}/${documentId}:`, error);
        throw error;
    }
}

export async function deleteDocumentREST(
    collection: string,
    documentId: string
): Promise<void> {
    try {
        await firestoreRequest(collection, 'DELETE', documentId);
    } catch (error) {
        console.error(`Error deleting document ${collection}/${documentId}:`, error);
        throw error;
    }
}
