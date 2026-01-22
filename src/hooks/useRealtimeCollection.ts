"use client";

import { useEffect, useState, useMemo, useRef } from "react";

interface UseRealtimeCollectionOptions {
    collectionName: string;
    constraints?: unknown[];
    pageSize?: number;
    enabled?: boolean;
}

interface UseRealtimeCollectionResult<T> {
    data: T[];
    loading: boolean;
    error: Error | null;
}

/**
 * Real-time collection hook
 * Automatically subscribes to collection changes and updates state
 * 
 * @example
 * const { data: orders, loading } = useRealtimeCollection<Order>({
 *   collectionName: 'fastfood-orders',
 *   constraints: [
 *     where('businessId', '==', businessId),
 *     orderBy('createdAt', 'desc'),
 *     limit(100),
 *   ],
 *   enabled: !!businessId,
 * });
 */
export function useRealtimeCollection<T extends { id: string } = { id: string }>({
    collectionName,
    constraints = [],
    pageSize,
    enabled = true,
}: UseRealtimeCollectionOptions): UseRealtimeCollectionResult<T> {
    const [data, setData] = useState<T[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    // Memoize constraints to prevent unnecessary re-subscriptions
    const constraintsKey = useMemo(
        () => JSON.stringify(constraints),
        [constraints]
    );

    useEffect(() => {
        // Don't subscribe if not enabled
        if (!enabled) {
            setLoading(false);
            setData([]);
            return;
        }

        setLoading(true);
        setError(null);

        let isActive = true;
        let intervalId: NodeJS.Timeout | null = null;

        const fetchCollection = async () => {
            try {
                const { getCollectionREST } = await import("@/lib/documentStore");
                const items = await getCollectionREST(collectionName);
                let next = items as T[];
                for (const c of constraints) {
                    if (typeof c === "function") {
                        next = (c as (input: T[]) => T[])(next);
                    }
                }
                if (typeof pageSize === "number" && pageSize > 0) {
                    next = next.slice(0, pageSize);
                }
                if (!isActive) return;
                setData(next);
                setLoading(false);
                setError(null);
            } catch (err) {
                console.error(`[useRealtimeCollection] Error for ${collectionName}:`, err);
                if (isActive) {
                    setError(err as Error);
                    setLoading(false);
                }
            }
        };

        fetchCollection();
        intervalId = setInterval(fetchCollection, 5000);

        return () => {
            isActive = false;
            if (intervalId) clearInterval(intervalId);
        };
    }, [collectionName, constraintsKey, enabled]);

    return { data, loading, error };
}

/**
 * Real-time hook with change detection
 * Useful for notifications when new items are added
 */
export function useRealtimeCollectionWithChanges<T extends { id: string } = { id: string }>({
    collectionName,
    constraints = [],
    pageSize,
    enabled = true,
    onItemAdded,
    onItemModified,
    onItemRemoved,
}: UseRealtimeCollectionOptions & {
    onItemAdded?: (item: T) => void;
    onItemModified?: (item: T) => void;
    onItemRemoved?: (id: string) => void;
}): UseRealtimeCollectionResult<T> {
    const [data, setData] = useState<T[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);
    const dataRef = useRef<T[]>([]);
    const isFirstLoadRef = useRef(true);

    const constraintsKey = useMemo(
        () => JSON.stringify(constraints),
        [constraints]
    );

    useEffect(() => {
        if (!enabled) {
            setLoading(false);
            setData([]);
            return;
        }

        setLoading(true);
        setError(null);
        isFirstLoadRef.current = true;

        let isActive = true;
        let intervalId: NodeJS.Timeout | null = null;

        const fetchCollection = async () => {
            try {
                const { getCollectionREST } = await import("@/lib/documentStore");
                const items = (await getCollectionREST(collectionName)) as T[];
                let next = items;
                for (const c of constraints) {
                    if (typeof c === "function") {
                        next = (c as (input: T[]) => T[])(next);
                    }
                }
                if (typeof pageSize === "number" && pageSize > 0) {
                    next = next.slice(0, pageSize);
                }
                if (!isActive) return;

                if (!isFirstLoadRef.current) {
                    const prevById = new Map(dataRef.current.map(item => [item.id, item]));
                    const nextById = new Map(next.map(item => [item.id, item]));

                    for (const item of next) {
                        const prev = prevById.get(item.id);
                        if (!prev) {
                            onItemAdded?.(item);
                        } else if (JSON.stringify(prev) !== JSON.stringify(item)) {
                            onItemModified?.(item);
                        }
                    }

                    for (const prev of dataRef.current) {
                        if (!nextById.has(prev.id)) {
                            onItemRemoved?.(prev.id);
                        }
                    }
                }

                setData(next);
                dataRef.current = next;
                setLoading(false);
                setError(null);
                isFirstLoadRef.current = false;
            } catch (err) {
                console.error(`[useRealtimeCollectionWithChanges] Error for ${collectionName}:`, err);
                if (isActive) {
                    setError(err as Error);
                    setLoading(false);
                }
            }
        };

        fetchCollection();
        intervalId = setInterval(fetchCollection, 5000);

        return () => {
            isActive = false;
            if (intervalId) clearInterval(intervalId);
        };
    }, [collectionName, constraintsKey, enabled]);

    return { data, loading, error };
}
