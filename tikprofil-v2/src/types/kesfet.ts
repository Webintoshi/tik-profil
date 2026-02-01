// Keşfet PWA Type Definitions

// ============================================
// User Types
// ============================================

export interface KesfetUser {
    uid: string;
    displayName: string;
    email: string;
    phone?: string;
    photoURL?: string;
    addresses: UserAddress[];
    preferences: UserPreferences;
    wallet: UserWallet;
    isPrime: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export interface UserAddress {
    id: string;
    label: string; // "Ev", "İş", vb.
    fullAddress: string;
    district: string;
    city: string;
    lat?: number;
    lng?: number;
    isDefault: boolean;
}

export interface UserPreferences {
    theme: "dark" | "light" | "system";
    notifications: {
        orders: boolean;
        promotions: boolean;
        reservations: boolean;
    };
    language: "tr" | "en";
}

export interface UserWallet {
    balance: number;
    points: number;
    lastUpdated: Date;
}

// ============================================
// Order Types
// ============================================

export type OrderStatus =
    | "pending"      // Onay bekliyor
    | "confirmed"    // Onaylandı
    | "preparing"    // Hazırlanıyor
    | "ready"        // Hazır
    | "delivering"   // Yolda
    | "delivered"    // Teslim edildi
    | "cancelled";   // İptal edildi

export interface KesfetOrder {
    id: string;
    userId: string;
    businessId: string;
    businessName: string;
    businessLogo?: string;
    items: OrderItem[];
    subtotal: number;
    deliveryFee: number;
    discount: number;
    total: number;
    status: OrderStatus;
    paymentMethod: PaymentMethod;
    paymentStatus: "pending" | "paid" | "refunded";
    deliveryAddress: UserAddress;
    notes?: string;
    estimatedDelivery?: Date;
    actualDelivery?: Date;
    createdAt: Date;
    updatedAt: Date;
}

export interface OrderItem {
    productId: string;
    name: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    options?: OrderItemOption[];
    notes?: string;
}

export interface OrderItemOption {
    name: string;
    value: string;
    price: number;
}

export type PaymentMethod =
    | "cash"           // Kapıda nakit
    | "card_on_door"   // Kapıda kart
    | "online_card"    // Online kart
    | "wallet";        // TikCüzdan

// ============================================
// Reservation Types
// ============================================

export type ReservationType =
    | "restaurant"   // Restoran
    | "hotel"        // Otel
    | "beauty"       // Güzellik salonu
    | "event";       // Etkinlik

export type ReservationStatus =
    | "pending"      // Onay bekliyor
    | "confirmed"    // Onaylandı
    | "cancelled"    // İptal edildi
    | "completed"    // Tamamlandı
    | "no_show";     // Gelmedi

export interface KesfetReservation {
    id: string;
    userId: string;
    businessId: string;
    businessName: string;
    businessLogo?: string;
    businessAddress?: string;
    type: ReservationType;
    date: Date;
    time: string;
    guestCount: number;
    status: ReservationStatus;
    notes?: string;
    createdAt: Date;
    updatedAt: Date;
    // Type-specific fields
    service?: string;           // Beauty: hizmet adı
    roomType?: string;          // Hotel: oda tipi
    checkOutDate?: Date;        // Hotel: çıkış tarihi
    tablePreference?: string;   // Restaurant: masa tercihi
}

// ============================================
// Favorite Types
// ============================================

export type FavoriteType = "business" | "product";

export interface KesfetFavorite {
    id: string;
    userId: string;
    itemId: string;
    itemType: FavoriteType;
    createdAt: Date;
}

// ============================================
// Review Types
// ============================================

export interface KesfetReview {
    id: string;
    userId: string;
    userName: string;
    userPhoto?: string;
    businessId: string;
    orderId?: string;
    reservationId?: string;
    rating: number; // 1-5
    comment: string;
    images?: string[];
    reply?: {
        text: string;
        createdAt: Date;
    };
    isVerified: boolean; // Gerçek sipariş/rezervasyondan mı
    createdAt: Date;
}

// ============================================
// Wallet Transaction Types
// ============================================

export type TransactionType =
    | "deposit"      // Para yükleme
    | "payment"      // Ödeme
    | "refund"       // İade
    | "bonus"        // Bonus
    | "points_earn"  // Puan kazanma
    | "points_spend"; // Puan harcama

export interface WalletTransaction {
    id: string;
    userId: string;
    type: TransactionType;
    amount: number;
    balanceAfter: number;
    description: string;
    orderId?: string;
    createdAt: Date;
}

// ============================================
// Discovery/Listing Types
// ============================================

export interface DiscoveryBusiness {
    id: string;
    slug: string;
    name: string;
    coverImage?: string;
    logoUrl?: string;
    category: string;
    categoryLabel: string;
    district?: string;
    city?: string;
    lat?: number;
    lng?: number;
    rating?: number;
    reviewCount?: number;
    distance?: number;
    priceLevel?: 1 | 2 | 3; // ₺, ₺₺, ₺₺₺
    isOpen?: boolean;
    deliveryTime?: string;
    minOrder?: number;
    isFeatured?: boolean;
    tags?: string[];
}

export interface DiscoveryProduct {
    id: string;
    businessId: string;
    businessName: string;
    name: string;
    description?: string;
    image?: string;
    price: number;
    originalPrice?: number;
    category: string;
    isAvailable: boolean;
}

// ============================================
// API Response Types
// ============================================

export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
}

export interface PaginatedResponse<T> {
    success: boolean;
    data: T[];
    total: number;
    page: number;
    limit: number;
    hasMore: boolean;
}

// ============================================
// Category Types
// ============================================

export interface KesfetCategory {
    id: string;
    name: string;
    icon: string;
    slug: string;
    order: number;
    isActive: boolean;
}

export const KESFET_CATEGORIES: KesfetCategory[] = [
    { id: "all", name: "Tümü", icon: "✨", slug: "all", order: 0, isActive: true },
    { id: "food", name: "Yemek", icon: "🍔", slug: "yemek", order: 1, isActive: true },
    { id: "coffee", name: "Kahve", icon: "☕", slug: "kahve", order: 2, isActive: true },
    { id: "market", name: "Market", icon: "🛒", slug: "market", order: 3, isActive: true },
    { id: "beauty", name: "Güzellik", icon: "💅", slug: "guzellik", order: 4, isActive: true },
    { id: "hotel", name: "Otel", icon: "🏨", slug: "otel", order: 5, isActive: true },
    { id: "event", name: "Etkinlik", icon: "🎉", slug: "etkinlik", order: 6, isActive: true },
];
