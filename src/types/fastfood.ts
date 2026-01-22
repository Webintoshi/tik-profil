/**
 * FastFood Module Type Definitions
 * Extended product model with sizes, allergens, discounts, and nutritional info
 */

// ============================================
// SIZE OPTIONS
// ============================================

export interface SizeOption {
    id: string;
    name: string;           // "Küçük", "Orta", "Büyük"
    priceModifier: number;  // +₺0, +₺10, +₺20
    isDefault: boolean;
}

// ============================================
// ALLERGENS
// ============================================

export const ALLERGEN_OPTIONS = [
    { id: 'gluten', label: 'Gluten', icon: '🌾' },
    { id: 'milk', label: 'Süt', icon: '🥛' },
    { id: 'egg', label: 'Yumurta', icon: '🥚' },
    { id: 'peanut', label: 'Fıstık', icon: '🥜' },
    { id: 'treenut', label: 'Ağaç Fındığı', icon: '🌰' },
    { id: 'shellfish', label: 'Kabuklu Deniz Ürünü', icon: '🦐' },
    { id: 'fish', label: 'Balık', icon: '🐟' },
    { id: 'soy', label: 'Soya', icon: '🫘' },
    { id: 'sesame', label: 'Susam', icon: '🌱' },
] as const;

export type AllergenId = typeof ALLERGEN_OPTIONS[number]['id'];

// ============================================
// PRODUCT TAGS
// ============================================

export const TAG_OPTIONS = [
    { id: 'new', label: 'Yeni', color: 'green', icon: '✨' },
    { id: 'popular', label: 'Popüler', color: 'orange', icon: '🔥' },
    { id: 'chef', label: 'Şefin Seçimi', color: 'purple', icon: '👨‍🍳' },
    { id: 'vegan', label: 'Vegan', color: 'green', icon: '🌱' },
    { id: 'vegetarian', label: 'Vejetaryen', color: 'green', icon: '🥗' },
    { id: 'spicy', label: 'Acı', color: 'red', icon: '🌶️' },
    { id: 'glutenfree', label: 'Glutensiz', color: 'blue', icon: '🚫' },
] as const;

export type TagId = typeof TAG_OPTIONS[number]['id'];

// ============================================
// TAX RATES
// ============================================

export const TAX_RATES = [
    { value: 1, label: '%1 KDV' },
    { value: 10, label: '%10 KDV' },
    { value: 20, label: '%20 KDV' },
] as const;

export type TaxRate = 1 | 10 | 20;

// ============================================
// PRODUCT INTERFACE
// ============================================

export interface FFProduct {
    // === Existing Fields ===
    id: string;
    businessId: string;
    name: string;
    description: string;
    price: number;
    categoryId: string;
    imageUrl: string;
    isActive: boolean;
    inStock: boolean;
    sortOrder: number;
    extraGroupIds?: string[];

    // === 🔴 CRITICAL - New Fields ===
    sizes?: SizeOption[];
    prepTime?: number;           // Hazırlama süresi (dakika)
    taxRate?: TaxRate;           // KDV oranı
    allergens?: AllergenId[];    // Alerjen listesi

    // === 🟠 IMPORTANT - New Fields ===
    discountPrice?: number;      // İndirimli fiyat
    discountUntil?: string;      // İndirim bitiş tarihi (ISO)
    tags?: TagId[];              // Etiketler
    calories?: number;           // Kalori (kcal)
    spicyLevel?: 1 | 2 | 3 | 4 | 5;  // Acılık seviyesi

    // === 🟡 OPTIONAL - Future Fields ===
    dailyLimit?: number;         // Günlük limit
    availableFrom?: string;      // Başlangıç saati "09:00"
    availableTo?: string;        // Bitiş saati "22:00"
    posItemId?: string;          // POS kodu
}

// ============================================
// CATEGORY INTERFACE
// ============================================

export interface FFCategory {
    id: string;
    businessId: string;
    name: string;
    icon: string;
    sortOrder: number;
    isActive: boolean;
}

// ============================================
// EXTRA GROUP INTERFACE
// ============================================

export interface FFExtraGroup {
    id: string;
    businessId: string;
    name: string;
    selectionType: 'single' | 'multiple';
    isRequired: boolean;
    maxSelections?: number;
    sortOrder: number;
    isActive: boolean;
    extras?: FFExtra[];
}

export interface FFExtra {
    id: string;
    groupId: string;
    name: string;
    priceModifier: number;
    isDefault: boolean;
    isActive: boolean;
    sortOrder: number;
}

// ============================================
// ORDER INTERFACES
// ============================================

export interface FFOrderItem {
    productId: string;
    productName: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    selectedSize?: SizeOption;
    selectedExtras?: {
        id: string;
        name: string;
        priceModifier: number;
    }[];
    note?: string;
}

export interface FFOrder {
    id: string;
    businessId: string;
    orderNumber: string;
    customerName: string;
    customerPhone: string;
    customerAddress?: string;
    deliveryType: 'pickup' | 'delivery';
    paymentMethod: 'cash' | 'card' | 'online';
    items: FFOrderItem[];
    subtotal: number;
    deliveryFee: number;
    total: number;
    customerNote?: string;
    status: 'pending' | 'preparing' | 'on_way' | 'delivered' | 'cancelled';
    statusHistory: { status: string; timestamp: string }[];
    createdAt?: string;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Calculate effective price considering size and discount
 */
export function getEffectivePrice(
    product: FFProduct,
    selectedSize?: SizeOption
): { price: number; originalPrice?: number; hasDiscount: boolean } {
    const basePrice = product.price + (selectedSize?.priceModifier || 0);

    // Check if discount is active
    if (product.discountPrice && product.discountUntil) {
        const discountEnd = new Date(product.discountUntil);
        if (discountEnd > new Date()) {
            const discountedPrice = product.discountPrice + (selectedSize?.priceModifier || 0);
            return {
                price: discountedPrice,
                originalPrice: basePrice,
                hasDiscount: true
            };
        }
    }

    return { price: basePrice, hasDiscount: false };
}

/**
 * Format prep time as human readable string
 */
export function formatPrepTime(minutes: number): string {
    if (minutes < 60) {
        return `${minutes} dk`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours} sa ${mins} dk` : `${hours} saat`;
}

/**
 * Get allergen info by id
 */
export function getAllergenInfo(id: AllergenId) {
    return ALLERGEN_OPTIONS.find(a => a.id === id);
}

/**
 * Get tag info by id
 */
export function getTagInfo(id: TagId) {
    return TAG_OPTIONS.find(t => t.id === id);
}
