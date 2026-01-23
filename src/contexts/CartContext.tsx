"use client";

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";

// Types
export interface CartExtra {
    id: string;
    name: string;
    price: number;
}

export interface CartItem {
    id: string; // Unique cart item ID
    productId: string;
    name: string;
    basePrice: number;
    quantity: number;
    selectedExtras: CartExtra[];
    selectedSize?: {
        id: string;
        name: string;
        priceModifier: number;
    };
    note?: string;
    image?: string;
}

interface CartContextType {
    items: CartItem[];
    addItem: (item: Omit<CartItem, "id">) => void;
    removeItem: (id: string) => void;
    updateQuantity: (id: string, quantity: number) => void;
    updateItemNote: (id: string, note: string) => void;
    clearCart: () => void;
    total: number;
    itemCount: number;
    orderNote: string;
    setOrderNote: (note: string) => void;
    businessSlug: string;
    setBusinessSlug: (slug: string) => void;
    businessName: string;
    setBusinessName: (name: string) => void;
    whatsappNumber: string;
    setWhatsappNumber: (number: string) => void;
    tableId: string;
    setTableId: (id: string) => void;
}

const CartContext = createContext<CartContextType | null>(null);

// Calculate item total price (base + size + extras) * quantity
const calculateItemTotal = (item: CartItem): number => {
    const basePrice = item.basePrice;
    const sizeModifier = item.selectedSize?.priceModifier || 0;
    const extrasTotal = item.selectedExtras.reduce((sum, extra) => sum + extra.price, 0);
    return (basePrice + sizeModifier + extrasTotal) * item.quantity;
};

// Generate unique ID
const generateId = () => `cart_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

// Local storage key
const CART_STORAGE_KEY = "tikprofil_fastfood_cart";

export function CartProvider({ children }: { children: ReactNode }) {
    const [items, setItems] = useState<CartItem[]>([]);
    const [orderNote, setOrderNote] = useState("");
    const [businessSlug, setBusinessSlug] = useState("");
    const [businessName, setBusinessName] = useState("");
    const [whatsappNumber, setWhatsappNumber] = useState("");
    const [tableId, setTableId] = useState("");
    const [isHydrated, setIsHydrated] = useState(false);

    // Load cart from localStorage on mount
    useEffect(() => {
        try {
            const stored = localStorage.getItem(CART_STORAGE_KEY);
            if (stored) {
                const parsed = JSON.parse(stored);
                setItems(parsed.items || []);
                setOrderNote(parsed.orderNote || "");
                setBusinessSlug(parsed.businessSlug || "");
                setBusinessName(parsed.businessName || "");
                setWhatsappNumber(parsed.whatsappNumber || "");
                setTableId(parsed.tableId || "");
            }
        } catch (e) {
            console.error("Failed to load cart from localStorage:", e);
        }
        setIsHydrated(true);
    }, []);

    // Save cart to localStorage on changes
    useEffect(() => {
        if (!isHydrated) return;
        try {
            localStorage.setItem(CART_STORAGE_KEY, JSON.stringify({
                items,
                orderNote,
                businessSlug,
                businessName,
                whatsappNumber,
                tableId
            }));
        } catch (e) {
            console.error("Failed to save cart to localStorage:", e);
        }
    }, [items, orderNote, businessSlug, businessName, whatsappNumber, tableId, isHydrated]);

    const addItem = useCallback((item: Omit<CartItem, "id">) => {
        setItems(prev => [...prev, { ...item, id: generateId() }]);
    }, []);

    const removeItem = useCallback((id: string) => {
        setItems(prev => prev.filter(item => item.id !== id));
    }, []);

    const updateQuantity = useCallback((id: string, quantity: number) => {
        if (quantity < 1) {
            removeItem(id);
            return;
        }
        setItems(prev => prev.map(item =>
            item.id === id ? { ...item, quantity } : item
        ));
    }, [removeItem]);

    const updateItemNote = useCallback((id: string, note: string) => {
        setItems(prev => prev.map(item =>
            item.id === id ? { ...item, note } : item
        ));
    }, []);

    const clearCart = useCallback(() => {
        setItems([]);
        setOrderNote("");
    }, []);

    // Computed values
    const total = items.reduce((sum, item) => sum + calculateItemTotal(item), 0);
    const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

    return (
        <CartContext.Provider value={{
            items,
            addItem,
            removeItem,
            updateQuantity,
            updateItemNote,
            clearCart,
            total,
            itemCount,
            orderNote,
            setOrderNote,
            businessSlug,
            setBusinessSlug,
            businessName,
            setBusinessName,
            whatsappNumber,
            setWhatsappNumber,
            tableId,
            setTableId
        }}>
            {children}
        </CartContext.Provider>
    );
}

export function useCart() {
    const context = useContext(CartContext);
    if (!context) {
        throw new Error("useCart must be used within a CartProvider");
    }
    return context;
}

// Helper to format WhatsApp message
export function formatWhatsAppOrder(cart: CartContextType): string {
    const lines: string[] = [];

    lines.push(`🍔 *${cart.businessName} Siparişi*`);
    if (cart.tableId) {
        lines.push(`📌 *Masa No: ${cart.tableId}*`);
    }
    lines.push("");
    lines.push("─────────────────");

    cart.items.forEach((item, index) => {
        const itemTotal = calculateItemTotal(item);
        lines.push(`${index + 1}. *${item.name}* x${item.quantity}`);

        if (item.selectedSize) {
            lines.push(`   📏 ${item.selectedSize.name}`);
        }

        if (item.selectedExtras.length > 0) {
            lines.push(`   ➕ ${item.selectedExtras.map(e => e.name).join(", ")}`);
        }

        if (item.note) {
            lines.push(`   📝 Not: ${item.note}`);
        }

        lines.push(`   💰 ₺${itemTotal.toFixed(2)}`);
        lines.push("");
    });

    lines.push("─────────────────");
    lines.push(`*TOPLAM: ₺${cart.total.toFixed(2)}*`);

    if (cart.orderNote) {
        lines.push("");
        lines.push(`📝 *Sipariş Notu:* ${cart.orderNote}`);
    }

    lines.push("");
    lines.push("_Tık Profil üzerinden gönderilmiştir_");
    lines.push("https://tikprofil.com");

    return lines.join("\n");
}

// Export item total calculator for use in components
export { calculateItemTotal };
