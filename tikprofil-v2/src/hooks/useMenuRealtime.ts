"use client";

import { useEffect, useRef } from "react";
import { getSupabaseClient } from "@/lib/supabase";

type RefreshFn = () => void;

export function useFastfoodMenuSubscription(
    businessId: string | null | undefined,
    onRefresh: RefreshFn
) {
    const refreshRef = useRef(onRefresh);
    const debounceRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        refreshRef.current = onRefresh;
    }, [onRefresh]);

    useEffect(() => {
        if (!businessId) return;

        const supabase = getSupabaseClient();
        const scheduleRefresh = () => {
            if (debounceRef.current) return;
            debounceRef.current = setTimeout(() => {
                debounceRef.current = null;
                refreshRef.current();
            }, 300);
        };

        const channel = supabase
            .channel(`ff-menu-${businessId}`)
            .on(
                "postgres_changes",
                { event: "*", schema: "public", table: "ff_categories", filter: `business_id=eq.${businessId}` },
                scheduleRefresh
            )
            .on(
                "postgres_changes",
                { event: "*", schema: "public", table: "ff_products", filter: `business_id=eq.${businessId}` },
                scheduleRefresh
            )
            .on(
                "postgres_changes",
                { event: "*", schema: "public", table: "ff_extra_groups", filter: `business_id=eq.${businessId}` },
                scheduleRefresh
            )
            .on(
                "postgres_changes",
                { event: "*", schema: "public", table: "ff_campaigns", filter: `business_id=eq.${businessId}` },
                scheduleRefresh
            )
            .on(
                "postgres_changes",
                { event: "*", schema: "public", table: "ff_settings", filter: `business_id=eq.${businessId}` },
                scheduleRefresh
            )
            .on(
                "postgres_changes",
                { event: "*", schema: "public", table: "ff_extras", filter: `business_id=eq.${businessId}` },
                scheduleRefresh
            )
            .subscribe();

        return () => {
            if (debounceRef.current) {
                clearTimeout(debounceRef.current);
                debounceRef.current = null;
            }
            supabase.removeChannel(channel);
        };
    }, [businessId]);
}

export function useRestaurantMenuSubscription(
    businessId: string | null | undefined,
    onRefresh: RefreshFn
) {
    const refreshRef = useRef(onRefresh);
    const debounceRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        refreshRef.current = onRefresh;
    }, [onRefresh]);

    useEffect(() => {
        if (!businessId) return;

        const supabase = getSupabaseClient();
        const scheduleRefresh = () => {
            if (debounceRef.current) return;
            debounceRef.current = setTimeout(() => {
                debounceRef.current = null;
                refreshRef.current();
            }, 300);
        };

        const channel = supabase
            .channel(`fb-menu-${businessId}`)
            .on(
                "postgres_changes",
                { event: "*", schema: "public", table: "fb_categories", filter: `business_id=eq.${businessId}` },
                scheduleRefresh
            )
            .on(
                "postgres_changes",
                { event: "*", schema: "public", table: "fb_products", filter: `business_id=eq.${businessId}` },
                scheduleRefresh
            )
            .on(
                "postgres_changes",
                { event: "*", schema: "public", table: "fb_settings", filter: `business_id=eq.${businessId}` },
                scheduleRefresh
            )
            .subscribe();

        return () => {
            if (debounceRef.current) {
                clearTimeout(debounceRef.current);
                debounceRef.current = null;
            }
            supabase.removeChannel(channel);
        };
    }, [businessId]);
}
