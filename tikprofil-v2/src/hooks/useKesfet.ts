// Keşfet React Hooks for Data Fetching
// Uses SWR for caching and revalidation

import useSWR from "swr";
import useSWRMutation from "swr/mutation";
import * as api from "@/lib/services/kesfetApi";
import type {
    KesfetOrder,
    KesfetReservation,
    KesfetFavorite,
    KesfetUser,
    DiscoveryBusiness,
} from "@/types/kesfet";

// ============================================
// Discovery Hooks
// ============================================

export function useDiscoveryBusinesses(params?: api.DiscoveryParams) {
    const key = params
        ? ["discovery", JSON.stringify(params)]
        : ["discovery"];

    return useSWR(key, () => api.getDiscoveryBusinesses(params || {}), {
        revalidateOnFocus: false,
        dedupingInterval: 60000, // 1 minute
    });
}

export function useBusinessDetails(slug: string | null) {
    return useSWR(
        slug ? ["business", slug] : null,
        () => slug ? api.getBusinessDetails(slug) : null,
        { revalidateOnFocus: false }
    );
}

// ============================================
// User Hooks
// ============================================

export function useCurrentUser() {
    return useSWR<{ success: boolean; data?: KesfetUser }>(
        "currentUser",
        () => api.getCurrentUser(),
        { revalidateOnFocus: false }
    );
}

// ============================================
// Orders Hooks
// ============================================

export function useOrders(status?: string) {
    return useSWR(
        ["orders", status || "all"],
        () => api.getOrders(status),
        { refreshInterval: 30000 } // Refresh every 30s for active orders
    );
}

export function useOrder(orderId: string | null) {
    return useSWR(
        orderId ? ["order", orderId] : null,
        () => orderId ? api.getOrderById(orderId) : null
    );
}

export function useCreateOrder() {
    return useSWRMutation(
        "orders",
        (_, { arg }: { arg: api.CreateOrderData }) => api.createOrder(arg)
    );
}

// ============================================
// Reservations Hooks
// ============================================

export function useReservations(status?: string) {
    return useSWR(
        ["reservations", status || "all"],
        () => api.getReservations(status)
    );
}

export function useCreateReservation() {
    return useSWRMutation(
        "reservations",
        (_, { arg }: { arg: api.CreateReservationData }) => api.createReservation(arg)
    );
}

// ============================================
// Favorites Hooks
// ============================================

export function useFavorites(type?: "business" | "product") {
    return useSWR(
        ["favorites", type || "all"],
        () => api.getFavorites(type)
    );
}

export function useToggleFavorite() {
    return useSWRMutation(
        "favorites",
        async (_, { arg }: { arg: { itemId: string; itemType: "business" | "product"; isAdding: boolean } }) => {
            if (arg.isAdding) {
                return api.addFavorite(arg.itemId, arg.itemType);
            } else {
                return api.removeFavorite(arg.itemId);
            }
        }
    );
}

// ============================================
// Wallet Hooks
// ============================================

export function useWalletBalance() {
    return useSWR("walletBalance", () => api.getWalletBalance());
}

export function useWalletTransactions() {
    return useSWR("walletTransactions", () => api.getWalletTransactions());
}

// ============================================
// Search Hooks
// ============================================

export function useSearch(query: string) {
    return useSWR(
        query.length >= 2 ? ["search", query] : null,
        () => api.searchAll(query),
        { dedupingInterval: 1000 }
    );
}

export function useTrendingSearches() {
    return useSWR("trendingSearches", () => api.getTrendingSearches(), {
        revalidateOnFocus: false,
        dedupingInterval: 300000, // 5 minutes
    });
}
