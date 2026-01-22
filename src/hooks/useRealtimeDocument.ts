"use client";

import { useEffect, useState } from "react";

interface UseRealtimeDocumentOptions {
    collectionName: string;
    documentId: string | undefined;
    enabled?: boolean;
}

interface UseRealtimeDocumentResult<T> {
    data: T | null;
    loading: boolean;
    error: Error | null;
}

/**
 * Real-time document hook
 * Automatically subscribes to document changes and updates state
 * 
 * @example
 * const { data: business, loading } = useRealtimeDocument<Business>({
 *   collectionName: 'businesses',
 *   documentId: businessId,
 *   enabled: !!businessId,
 * });
 */
export function useRealtimeDocument<T extends { id: string } = { id: string }>({
    collectionName,
    documentId,
    enabled = true,
}: UseRealtimeDocumentOptions): UseRealtimeDocumentResult<T> {
    const [data, setData] = useState<T | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        // Don't subscribe if not enabled or no documentId
        if (!enabled || !documentId) {
            setLoading(false);
            setData(null);
            return;
        }

        setLoading(true);
        setError(null);

        let isActive = true;
        let intervalId: NodeJS.Timeout | null = null;

        const fetchDoc = async () => {
            try {
                const { getDocumentREST } = await import("@/lib/documentStore");
                const doc = await getDocumentREST(collectionName, documentId);
                if (!isActive) return;
                setData(doc ? ({ ...doc, id: doc.id as string } as T) : null);
                setError(null);
                setLoading(false);
            } catch (err) {
                console.error(`[useRealtimeDocument] Error for ${collectionName}/${documentId}:`, err);
                if (isActive) {
                    setError(err as Error);
                    setLoading(false);
                }
            }
        };

        fetchDoc();
        intervalId = setInterval(fetchDoc, 5000);

        return () => {
            isActive = false;
            if (intervalId) clearInterval(intervalId);
        };
    }, [collectionName, documentId, enabled]);

    return { data, loading, error };
}
