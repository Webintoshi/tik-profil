"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
    X, Plus, Minus, ShoppingBag, ChevronRight,
    MapPin, Phone, User, FileText, Check, Loader2,
    Clock, CreditCard, Banknote, Truck, Store
} from "lucide-react";
import clsx from "clsx";
import { toR2ProxyUrl } from "@/lib/publicImage";
import { useFastfoodMenuSubscription } from "@/hooks/useMenuRealtime";

// ============================================
// TYPES
// ============================================
interface Category {
    id: string;
    name: string;
    emoji: string;
    isActive: boolean;
    sortOrder?: number;
}

interface Product {
    id: string;
    name: string;
    description: string;
    price: number;
    categoryId: string;
    image?: string;
    isActive: boolean;
    inStock: boolean;
    sortOrder?: number;
}

interface CartItem {
    product: Product;
    quantity: number;
}

interface FastFoodMenuProps {
    businessId: string;
    businessName: string;
    businessSlug: string;
    businessPhone?: string;
    businessLogo?: string;
    primaryColor?: string;
}

// ============================================
// MAIN COMPONENT
// ============================================
export function FastFoodMenu({
    businessId,
    businessName,
    businessSlug,
    businessPhone,
    businessLogo,
    primaryColor = "#7C3AED"
}: FastFoodMenuProps) {
    // State
    const [categories, setCategories] = useState<Category[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [cart, setCart] = useState<CartItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [isCheckout, setIsCheckout] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [orderSuccess, setOrderSuccess] = useState<{ orderNumber: string } | null>(null);

    // Customer info
    const [customerName, setCustomerName] = useState("");
    const [customerPhone, setCustomerPhone] = useState("");
    const [customerAddress, setCustomerAddress] = useState("");
    const [customerNote, setCustomerNote] = useState("");
    const [deliveryType, setDeliveryType] = useState<"pickup" | "delivery">("pickup");
    const [paymentMethod, setPaymentMethod] = useState<"cash" | "card">("cash");

    // Refs
    const categoryRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    // Store fetched businessId for order submission
    const [fetchedBusinessId, setFetchedBusinessId] = useState<string>(businessId);

    // ============================================
    // DATA FETCHING
    // ============================================
    const refreshMenu = useCallback(async (showLoading: boolean = false) => {
        if (showLoading) setLoading(true);
        try {
            const res = await fetch(`/api/fastfood/public-menu?businessSlug=${businessSlug}`);
            const data = await res.json();

            if (data.success && data.data) {
                const { categories: cats, products: prods, businessId: fetchedId } = data.data;

                if (fetchedId) {
                    setFetchedBusinessId(fetchedId);
                }

                const sortedCats = (cats || []).sort((a: Category, b: Category) =>
                    (a.sortOrder || 0) - (b.sortOrder || 0)
                );
                setCategories(sortedCats);
                setProducts(prods || []);

                if (sortedCats.length > 0) {
                    setSelectedCategory(sortedCats[0].id);
                }
            }
        } catch (error) {
            console.error("Failed to fetch menu:", error);
        }
        if (showLoading) setLoading(false);
    }, [businessSlug]);

    useEffect(() => {
        refreshMenu(true);
    }, [refreshMenu]);

    useFastfoodMenuSubscription(fetchedBusinessId, () => refreshMenu(false));

    // ============================================
    // CART FUNCTIONS
    // ============================================
    const addToCart = (product: Product) => {
        setCart(prev => {
            const existing = prev.find(item => item.product.id === product.id);
            if (existing) {
                return prev.map(item =>
                    item.product.id === product.id
                        ? { ...item, quantity: item.quantity + 1 }
                        : item
                );
            }
            return [...prev, { product, quantity: 1 }];
        });
    };

    const removeFromCart = (productId: string) => {
        setCart(prev => {
            const existing = prev.find(item => item.product.id === productId);
            if (existing && existing.quantity > 1) {
                return prev.map(item =>
                    item.product.id === productId
                        ? { ...item, quantity: item.quantity - 1 }
                        : item
                );
            }
            return prev.filter(item => item.product.id !== productId);
        });
    };

    const getCartItemQuantity = (productId: string) => {
        return cart.find(item => item.product.id === productId)?.quantity || 0;
    };

    const clearCart = () => setCart([]);

    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    const subtotal = cart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
    const deliveryFee = deliveryType === "delivery" ? 15 : 0;
    const total = subtotal + deliveryFee;

    // ============================================
    // ORDER SUBMISSION
    // ============================================
    const handleSubmitOrder = async () => {
        if (!customerName.trim() || !customerPhone.trim()) {
            alert("Lütfen ad soyad ve telefon bilgilerinizi girin.");
            return;
        }

        if (deliveryType === "delivery" && !customerAddress.trim()) {
            alert("Lütfen teslimat adresinizi girin.");
            return;
        }

        setIsSubmitting(true);

        try {
            const orderData = {
                businessId: fetchedBusinessId,
                customerName: customerName.trim(),
                customerPhone: customerPhone.trim(),
                customerAddress: customerAddress.trim(),
                deliveryType,
                paymentMethod,
                items: cart.map(item => ({
                    productId: item.product.id,
                    name: item.product.name,
                    price: item.product.price,
                    quantity: item.quantity
                })),
                subtotal,
                deliveryFee,
                total,
                customerNote: customerNote.trim()
            };

            const res = await fetch("/api/fastfood/orders", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(orderData)
            });

            const data = await res.json();

            if (data.success) {
                setOrderSuccess({ orderNumber: data.orderNumber });
                clearCart();
            } else {
                alert(data.error || "Sipariş gönderilemedi. Lütfen tekrar deneyin.");
            }
        } catch (error) {
            console.error("Order submission error:", error);
            alert("Bir hata oluştu. Lütfen tekrar deneyin.");
        }

        setIsSubmitting(false);
    };

    // ============================================
    // HELPERS
    // ============================================
    const formatPrice = (price: number) => {
        return new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(price);
    };

    const scrollToCategory = (categoryId: string) => {
        setSelectedCategory(categoryId);
        const element = categoryRefs.current[categoryId];
        if (element && scrollContainerRef.current) {
            const container = scrollContainerRef.current;
            const elementTop = element.offsetTop - container.offsetTop;
            container.scrollTo({ top: elementTop - 60, behavior: "smooth" });
        }
    };

    const getProductsByCategory = (categoryId: string) => {
        return products
            .filter(p => p.categoryId === categoryId && p.isActive && p.inStock)
            .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
    };

    // ============================================
    // RENDER
    // ============================================
    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
            </div>
        );
    }

    // Order Success View
    if (orderSuccess) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
                <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full text-center">
                    <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Check className="w-10 h-10 text-white" />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">Siparişiniz Alındı!</h1>
                    <p className="text-gray-600 mb-4">Sipariş numaranız:</p>
                    <div className="bg-gray-100 rounded-xl py-3 px-6 inline-block mb-6">
                        <span className="text-2xl font-bold text-purple-600">{orderSuccess.orderNumber}</span>
                    </div>
                    <p className="text-sm text-gray-500 mb-6">
                        Siparişiniz {businessName} tarafından en kısa sürede hazırlanacaktır.
                    </p>
                    <button
                        onClick={() => {
                            setOrderSuccess(null);
                            setIsCheckout(false);
                            setIsCartOpen(false);
                            setCustomerName("");
                            setCustomerPhone("");
                            setCustomerAddress("");
                            setCustomerNote("");
                        }}
                        className="w-full py-3 rounded-xl bg-purple-600 text-white font-bold hover:bg-purple-700 transition-colors"
                    >
                        Yeni Sipariş Ver
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            {/* Header */}
            <header className="sticky top-0 z-40 bg-white shadow-sm">
                <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        {businessLogo ? (
                            <img src={businessLogo} alt="" className="w-10 h-10 rounded-full object-cover" />
                        ) : (
                            <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                                <Store className="w-5 h-5 text-purple-600" />
                            </div>
                        )}
                        <div>
                            <h1 className="font-bold text-gray-900">{businessName}</h1>
                            <div className="flex items-center gap-1 text-xs text-green-600">
                                <Clock className="w-3 h-3" />
                                <span>Açık</span>
                            </div>
                        </div>
                    </div>

                    {/* Cart Button */}
                    <button
                        onClick={() => setIsCartOpen(true)}
                        className="relative flex items-center gap-2 px-4 py-2.5 rounded-full bg-purple-600 text-white font-medium hover:bg-purple-700 transition-all shadow-lg shadow-purple-200"
                    >
                        <ShoppingBag className="w-5 h-5" />
                        <span className="hidden sm:inline">Sepet</span>
                        {totalItems > 0 && (
                            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-xs flex items-center justify-center font-bold">
                                {totalItems}
                            </span>
                        )}
                    </button>
                </div>

                {/* Category Navigation */}
                {categories.length > 0 && (
                    <div className="border-t border-gray-100 bg-white">
                        <div className="max-w-3xl mx-auto px-4 py-2 overflow-x-auto scrollbar-hide">
                            <div className="flex gap-2">
                                {categories.filter(c => c.isActive).map(cat => (
                                    <button
                                        key={cat.id}
                                        onClick={() => scrollToCategory(cat.id)}
                                        className={clsx(
                                            "px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all",
                                            selectedCategory === cat.id
                                                ? "bg-purple-600 text-white shadow-md"
                                                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                                        )}
                                    >
                                        {cat.emoji} {cat.name}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </header>

            {/* Products */}
            <main
                ref={scrollContainerRef}
                className="flex-1 overflow-y-auto"
            >
                <div className="max-w-3xl mx-auto px-4 py-6">
                    {categories.filter(c => c.isActive).map(category => {
                        const categoryProducts = getProductsByCategory(category.id);
                        if (categoryProducts.length === 0) return null;

                        return (
                            <div
                                key={category.id}
                                ref={el => { categoryRefs.current[category.id] = el; }}
                                className="mb-8"
                            >
                                <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                                    <span className="text-2xl">{category.emoji}</span>
                                    {category.name}
                                    <span className="text-sm font-normal text-gray-400">
                                        ({categoryProducts.length})
                                    </span>
                                </h2>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {categoryProducts.map(product => {
                                        const qty = getCartItemQuantity(product.id);
                                        return (
                                            <div
                                                key={product.id}
                                                className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow"
                                            >
                                                <div className="flex">
                                                    {/* Product Info */}
                                                    <div className="flex-1 p-4 flex flex-col">
                                                        <h3 className="font-semibold text-gray-900 mb-1">
                                                            {product.name}
                                                        </h3>
                                                        {product.description && (
                                                            <p className="text-sm text-gray-500 mb-2 line-clamp-2">
                                                                {product.description}
                                                            </p>
                                                        )}
                                                        <div className="mt-auto flex items-center justify-between">
                                                            <span className="text-lg font-bold text-purple-600">
                                                                {formatPrice(product.price)}
                                                            </span>

                                                            {qty > 0 ? (
                                                                <div className="flex items-center gap-2">
                                                                    <button
                                                                        onClick={() => removeFromCart(product.id)}
                                                                        className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
                                                                    >
                                                                        <Minus className="w-4 h-4" />
                                                                    </button>
                                                                    <span className="w-6 text-center font-bold">{qty}</span>
                                                                    <button
                                                                        onClick={() => addToCart(product)}
                                                                        className="w-8 h-8 rounded-full bg-purple-600 text-white flex items-center justify-center hover:bg-purple-700 transition-colors"
                                                                    >
                                                                        <Plus className="w-4 h-4" />
                                                                    </button>
                                                                </div>
                                                            ) : (
                                                                <button
                                                                    onClick={() => addToCart(product)}
                                                                    className="px-4 py-2 rounded-full bg-purple-100 text-purple-700 text-sm font-medium hover:bg-purple-200 transition-colors"
                                                                >
                                                                    Ekle
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Product Image */}
                                                    {product.image && (
                                                        <div className="w-28 h-28 flex-shrink-0">
                                                            <img
                                                                src={toR2ProxyUrl(product.image)}
                                                                alt={product.name}
                                                                className="w-full h-full object-cover"
                                                            />
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}

                    {products.length === 0 && (
                        <div className="text-center py-12">
                            <p className="text-gray-500">Henüz menüye ürün eklenmemiş.</p>
                        </div>
                    )}
                </div>
            </main>

            {/* Floating Cart Button (Mobile) */}
            {totalItems > 0 && !isCartOpen && (
                <div className="fixed bottom-4 left-4 right-4 z-30 sm:hidden">
                    <button
                        onClick={() => setIsCartOpen(true)}
                        className="w-full py-4 rounded-2xl bg-purple-600 text-white font-bold flex items-center justify-center gap-3 shadow-2xl shadow-purple-500/30"
                    >
                        <ShoppingBag className="w-5 h-5" />
                        <span>Sepeti Görüntüle ({totalItems})</span>
                        <span className="bg-white/20 px-3 py-1 rounded-full">{formatPrice(total)}</span>
                    </button>
                </div>
            )}

            {/* Cart Drawer */}
            {isCartOpen && (
                <div className="fixed inset-0 z-50">
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                        onClick={() => !isCheckout && setIsCartOpen(false)}
                    />

                    {/* Drawer */}
                    <div className="absolute right-0 top-0 bottom-0 w-full max-w-md bg-white shadow-2xl flex flex-col animate-slide-in-right">
                        {/* Header */}
                        <div className="flex-shrink-0 p-4 border-b border-gray-100 flex items-center justify-between">
                            <h2 className="text-lg font-bold text-gray-900">
                                {isCheckout ? "Sipariş Bilgileri" : "Sepetim"}
                            </h2>
                            <button
                                onClick={() => {
                                    if (isCheckout) {
                                        setIsCheckout(false);
                                    } else {
                                        setIsCartOpen(false);
                                    }
                                }}
                                className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                            >
                                <X className="w-5 h-5 text-gray-500" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-4">
                            {!isCheckout ? (
                                <>
                                    {/* Cart Items */}
                                    {cart.length === 0 ? (
                                        <div className="text-center py-12">
                                            <ShoppingBag className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                                            <p className="text-gray-500">Sepetiniz boş</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            {cart.map(item => (
                                                <div
                                                    key={item.product.id}
                                                    className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl"
                                                >
                                                    {item.product.image && (
                                                        <img
                                                            src={item.product.image}
                                                            alt=""
                                                            className="w-16 h-16 rounded-lg object-cover"
                                                        />
                                                    )}
                                                    <div className="flex-1 min-w-0">
                                                        <h4 className="font-medium text-gray-900 truncate">
                                                            {item.product.name}
                                                        </h4>
                                                        <p className="text-purple-600 font-bold">
                                                            {formatPrice(item.product.price * item.quantity)}
                                                        </p>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            onClick={() => removeFromCart(item.product.id)}
                                                            className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center hover:bg-gray-300"
                                                        >
                                                            <Minus className="w-4 h-4" />
                                                        </button>
                                                        <span className="w-6 text-center font-bold">{item.quantity}</span>
                                                        <button
                                                            onClick={() => addToCart(item.product)}
                                                            className="w-8 h-8 rounded-full bg-purple-600 text-white flex items-center justify-center hover:bg-purple-700"
                                                        >
                                                            <Plus className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </>
                            ) : (
                                <>
                                    {/* Checkout Form */}
                                    <div className="space-y-4">
                                        {/* Delivery Type */}
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Teslimat Türü
                                            </label>
                                            <div className="grid grid-cols-2 gap-3">
                                                <button
                                                    type="button"
                                                    onClick={() => setDeliveryType("pickup")}
                                                    className={clsx(
                                                        "p-3 rounded-xl border-2 flex items-center gap-2 transition-all",
                                                        deliveryType === "pickup"
                                                            ? "border-purple-600 bg-purple-50"
                                                            : "border-gray-200 hover:border-gray-300"
                                                    )}
                                                >
                                                    <Store className="w-5 h-5" />
                                                    <span className="font-medium">Gel Al</span>
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setDeliveryType("delivery")}
                                                    className={clsx(
                                                        "p-3 rounded-xl border-2 flex items-center gap-2 transition-all",
                                                        deliveryType === "delivery"
                                                            ? "border-purple-600 bg-purple-50"
                                                            : "border-gray-200 hover:border-gray-300"
                                                    )}
                                                >
                                                    <Truck className="w-5 h-5" />
                                                    <span className="font-medium">Kurye</span>
                                                </button>
                                            </div>
                                        </div>

                                        {/* Customer Name */}
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                                <User className="w-4 h-4 inline mr-1" />
                                                Ad Soyad <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                value={customerName}
                                                onChange={(e) => setCustomerName(e.target.value)}
                                                placeholder="Örn: Ahmet Yılmaz"
                                                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-100 outline-none transition-all"
                                            />
                                        </div>

                                        {/* Phone */}
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                                <Phone className="w-4 h-4 inline mr-1" />
                                                Telefon <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                type="tel"
                                                value={customerPhone}
                                                onChange={(e) => setCustomerPhone(e.target.value)}
                                                placeholder="05XX XXX XX XX"
                                                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-100 outline-none transition-all"
                                            />
                                        </div>

                                        {/* Address (only for delivery) */}
                                        {deliveryType === "delivery" && (
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                                    <MapPin className="w-4 h-4 inline mr-1" />
                                                    Adres <span className="text-red-500">*</span>
                                                </label>
                                                <textarea
                                                    value={customerAddress}
                                                    onChange={(e) => setCustomerAddress(e.target.value)}
                                                    placeholder="Teslimat adresiniz..."
                                                    rows={2}
                                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-100 outline-none resize-none transition-all"
                                                />
                                            </div>
                                        )}

                                        {/* Payment Method */}
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Ödeme Yöntemi
                                            </label>
                                            <div className="grid grid-cols-2 gap-3">
                                                <button
                                                    type="button"
                                                    onClick={() => setPaymentMethod("cash")}
                                                    className={clsx(
                                                        "p-3 rounded-xl border-2 flex items-center gap-2 transition-all",
                                                        paymentMethod === "cash"
                                                            ? "border-purple-600 bg-purple-50"
                                                            : "border-gray-200 hover:border-gray-300"
                                                    )}
                                                >
                                                    <Banknote className="w-5 h-5" />
                                                    <span className="font-medium">Nakit</span>
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setPaymentMethod("card")}
                                                    className={clsx(
                                                        "p-3 rounded-xl border-2 flex items-center gap-2 transition-all",
                                                        paymentMethod === "card"
                                                            ? "border-purple-600 bg-purple-50"
                                                            : "border-gray-200 hover:border-gray-300"
                                                    )}
                                                >
                                                    <CreditCard className="w-5 h-5" />
                                                    <span className="font-medium">Kart</span>
                                                </button>
                                            </div>
                                        </div>

                                        {/* Note */}
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                                <FileText className="w-4 h-4 inline mr-1" />
                                                Sipariş Notu
                                            </label>
                                            <textarea
                                                value={customerNote}
                                                onChange={(e) => setCustomerNote(e.target.value)}
                                                placeholder="Özel istekleriniz..."
                                                rows={2}
                                                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-100 outline-none resize-none transition-all"
                                            />
                                        </div>

                                        {/* Order Summary */}
                                        <div className="bg-gray-50 rounded-xl p-4 mt-4">
                                            <h4 className="font-bold text-gray-900 mb-3">Sipariş Özeti</h4>
                                            <div className="space-y-2 text-sm">
                                                {cart.map(item => (
                                                    <div key={item.product.id} className="flex justify-between">
                                                        <span>{item.quantity}x {item.product.name}</span>
                                                        <span className="font-medium">
                                                            {formatPrice(item.product.price * item.quantity)}
                                                        </span>
                                                    </div>
                                                ))}
                                                <div className="border-t border-gray-200 pt-2 mt-2">
                                                    <div className="flex justify-between">
                                                        <span>Ara Toplam</span>
                                                        <span>{formatPrice(subtotal)}</span>
                                                    </div>
                                                    {deliveryType === "delivery" && (
                                                        <div className="flex justify-between text-gray-500">
                                                            <span>Teslimat</span>
                                                            <span>{formatPrice(deliveryFee)}</span>
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex justify-between font-bold text-lg pt-2 border-t border-gray-200">
                                                    <span>Toplam</span>
                                                    <span className="text-purple-600">{formatPrice(total)}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Footer */}
                        {cart.length > 0 && (
                            <div className="flex-shrink-0 p-4 border-t border-gray-100 bg-white">
                                {!isCheckout ? (
                                    <>
                                        <div className="flex justify-between items-center mb-3">
                                            <span className="text-gray-600">Toplam</span>
                                            <span className="text-xl font-bold text-purple-600">{formatPrice(total)}</span>
                                        </div>
                                        <button
                                            onClick={() => setIsCheckout(true)}
                                            className="w-full py-4 rounded-xl bg-purple-600 text-white font-bold flex items-center justify-center gap-2 hover:bg-purple-700 transition-colors shadow-lg shadow-purple-200"
                                        >
                                            <ChevronRight className="w-5 h-5" />
                                            Siparişi Tamamla
                                        </button>
                                    </>
                                ) : (
                                    <button
                                        onClick={handleSubmitOrder}
                                        disabled={isSubmitting}
                                        className="w-full py-4 rounded-xl bg-green-500 text-white font-bold flex items-center justify-center gap-2 hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg shadow-green-200"
                                    >
                                        {isSubmitting ? (
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                        ) : (
                                            <Check className="w-5 h-5" />
                                        )}
                                        {isSubmitting ? "Gönderiliyor..." : "Siparişi Onayla"}
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* CSS Animations */}
            <style jsx global>{`
                @keyframes slide-in-right {
                    from { transform: translateX(100%); }
                    to { transform: translateX(0); }
                }
                .animate-slide-in-right {
                    animation: slide-in-right 0.3s ease-out;
                }
                .scrollbar-hide::-webkit-scrollbar {
                    display: none;
                }
                .scrollbar-hide {
                    -ms-overflow-style: none;
                    scrollbar-width: none;
                }
            `}</style>
        </div>
    );
}

