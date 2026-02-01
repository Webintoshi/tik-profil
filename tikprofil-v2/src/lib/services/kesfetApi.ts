// Keşfet API Service Layer

import type {
    KesfetUser,
    KesfetOrder,
    KesfetReservation,
    KesfetFavorite,
    DiscoveryBusiness,
    WalletTransaction,
    ApiResponse,
    PaginatedResponse,
    UserAddress,
} from "@/types/kesfet";

const API_BASE = "/api/kesfet";

// Discovery API
export interface DiscoveryParams {
    lat?: number;
    lng?: number;
    city?: string;
    category?: string;
    search?: string;
    page?: number;
    limit?: number;
}

export async function getDiscoveryBusinesses(
    params: DiscoveryParams = {}
): Promise<PaginatedResponse<DiscoveryBusiness>> {
    const searchParams = new URLSearchParams();
    if (params.lat) searchParams.set("lat", params.lat.toString());
    if (params.lng) searchParams.set("lng", params.lng.toString());
    if (params.city) searchParams.set("city", params.city);
    if (params.category) searchParams.set("category", params.category);
    if (params.search) searchParams.set("q", params.search);
    if (params.page) searchParams.set("page", params.page.toString());
    if (params.limit) searchParams.set("limit", params.limit.toString());

    const response = await fetch(`${API_BASE}?${searchParams.toString()}`);
    return response.json();
}

export async function getBusinessDetails(
    slug: string
): Promise<ApiResponse<DiscoveryBusiness>> {
    const response = await fetch(`${API_BASE}/business/${slug}`);
    return response.json();
}

// User API
export async function getCurrentUser(): Promise<ApiResponse<KesfetUser>> {
    const response = await fetch(`${API_BASE}/user/profile`);
    return response.json();
}

export async function updateUserProfile(
    data: Partial<KesfetUser>
): Promise<ApiResponse<KesfetUser>> {
    const response = await fetch(`${API_BASE}/user/profile`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    });
    return response.json();
}

export async function addUserAddress(
    address: Omit<UserAddress, "id">
): Promise<ApiResponse<UserAddress>> {
    const response = await fetch(`${API_BASE}/user/addresses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(address),
    });
    return response.json();
}

// Orders API
export interface CreateOrderData {
    businessId: string;
    items: {
        productId: string;
        quantity: number;
        options?: { name: string; value: string; price: number }[];
        notes?: string;
    }[];
    deliveryAddressId: string;
    paymentMethod: string;
    notes?: string;
}

export async function getOrders(
    status?: string,
    page = 1,
    limit = 20
): Promise<PaginatedResponse<KesfetOrder>> {
    const params = new URLSearchParams({ page: page.toString(), limit: limit.toString() });
    if (status) params.set("status", status);
    const response = await fetch(`${API_BASE}/orders?${params.toString()}`);
    return response.json();
}

export async function getOrderById(orderId: string): Promise<ApiResponse<KesfetOrder>> {
    const response = await fetch(`${API_BASE}/orders/${orderId}`);
    return response.json();
}

export async function createOrder(data: CreateOrderData): Promise<ApiResponse<KesfetOrder>> {
    const response = await fetch(`${API_BASE}/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    });
    return response.json();
}

// Reservations API
export interface CreateReservationData {
    businessId: string;
    type: string;
    date: string;
    time: string;
    guestCount: number;
    notes?: string;
    service?: string;
    roomType?: string;
}

export async function getReservations(
    status?: string,
    page = 1,
    limit = 20
): Promise<PaginatedResponse<KesfetReservation>> {
    const params = new URLSearchParams({ page: page.toString(), limit: limit.toString() });
    if (status) params.set("status", status);
    const response = await fetch(`${API_BASE}/reservations?${params.toString()}`);
    return response.json();
}

export async function createReservation(
    data: CreateReservationData
): Promise<ApiResponse<KesfetReservation>> {
    const response = await fetch(`${API_BASE}/reservations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    });
    return response.json();
}

// Favorites API
export async function getFavorites(
    type?: "business" | "product"
): Promise<ApiResponse<KesfetFavorite[]>> {
    const params = type ? `?type=${type}` : "";
    const response = await fetch(`${API_BASE}/user/favorites${params}`);
    return response.json();
}

export async function addFavorite(
    itemId: string,
    itemType: "business" | "product"
): Promise<ApiResponse<KesfetFavorite>> {
    const response = await fetch(`${API_BASE}/user/favorites`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId, itemType }),
    });
    return response.json();
}

export async function removeFavorite(itemId: string): Promise<ApiResponse<void>> {
    const response = await fetch(`${API_BASE}/user/favorites/${itemId}`, {
        method: "DELETE",
    });
    return response.json();
}

// Wallet API
export async function getWalletBalance(): Promise<ApiResponse<{ balance: number; points: number }>> {
    const response = await fetch(`${API_BASE}/wallet`);
    return response.json();
}

export async function getWalletTransactions(
    page = 1,
    limit = 20
): Promise<PaginatedResponse<WalletTransaction>> {
    const params = new URLSearchParams({ page: page.toString(), limit: limit.toString() });
    const response = await fetch(`${API_BASE}/wallet/transactions?${params.toString()}`);
    return response.json();
}

// Search API
export async function searchAll(query: string): Promise<ApiResponse<{
    businesses: DiscoveryBusiness[];
}>> {
    const response = await fetch(`${API_BASE}/search?q=${encodeURIComponent(query)}`);
    return response.json();
}

export async function getTrendingSearches(): Promise<ApiResponse<string[]>> {
    const response = await fetch(`${API_BASE}/search/trending`);
    return response.json();
}
