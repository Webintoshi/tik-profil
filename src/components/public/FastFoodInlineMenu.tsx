"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    X, Plus, Minus, ShoppingBag,
    MapPin, Phone, User, Check, Loader2,
    CreditCard, Banknote, Truck, Store, Utensils, Star,
    ChevronRight, ArrowRight, Clock, AlertTriangle
} from "lucide-react";
import clsx from "clsx";
import { toR2ProxyUrl } from "@/lib/publicImage";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import { getCachedMenuData, prefetchMenuData } from "@/lib/menuCache";
import { ALLERGEN_OPTIONS, TAG_OPTIONS, type AllergenId, type TagId, type TaxRate, type SizeOption } from "@/types/fastfood";
import { useFastfoodMenuSubscription } from "@/hooks/useMenuRealtime";

// ============================================
// TYPES
// ============================================
interface Category {
    id: string;
    name: string;
    emoji?: string;
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
    imageUrl?: string;
    isActive: boolean;
    inStock: boolean;
    sortOrder?: number;
    extraGroupIds?: string[];
    // New fields
    sizes?: SizeOption[];
    prepTime?: number;
    taxRate?: TaxRate;
    allergens?: AllergenId[];
    discountPrice?: number;
    discountUntil?: string;
    tags?: TagId[];
    calories?: number;
    spicyLevel?: 1 | 2 | 3 | 4 | 5;
}

interface ExtraGroup {
    id: string;
    name: string;
    selectionType: 'single' | 'multiple';
    isRequired: boolean;
    maxSelections: number;
    extras: Extra[];
}

interface Extra {
    id: string;
    groupId: string;
    name: string;
    priceModifier: number;
    isDefault: boolean;
    imageUrl?: string;
}

interface CartItem {
    product: Product;
    quantity: number;
    selectedExtras: { groupId: string; extraId: string; name: string; price: number }[];
    totalPrice: number;
}

interface Campaign {
    id: string;
    title: string;
    description?: string;
    emoji?: string;
    isActive: boolean;
}

interface FastFoodInlineMenuProps {
    isOpen: boolean;
    businessSlug: string;
    businessName: string;
    businessId?: string;
    businessLogo?: string;
    businessPhone?: string;
    onClose: () => void;
}

// ============================================
// PRODUCT DETAIL MODAL WITH EXTRAS
// ============================================
function ProductDetailModal({
    product,
    isOpen,
    onClose,
    onAddToCart,
    extraGroups,
}: {
    product: Product | null;
    isOpen: boolean;
    onClose: () => void;
    onAddToCart: (product: Product, quantity: number, extras: CartItem['selectedExtras']) => void;
    extraGroups: ExtraGroup[];
}) {
    const [quantity, setQuantity] = useState(1);
    const [selectedExtras, setSelectedExtras] = useState<Record<string, string[]>>({});

    useEffect(() => {
        if (isOpen && product) {
            setQuantity(1);
            // Set default selections
            const defaults: Record<string, string[]> = {};
            extraGroups.forEach(group => {
                const defaultExtras = group.extras.filter(e => e.isDefault).map(e => e.id);
                if (defaultExtras.length > 0) {
                    defaults[group.id] = defaultExtras;
                }
            });
            setSelectedExtras(defaults);
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen, product, extraGroups]);

    if (!product) return null;

    const productImage = product.image || product.imageUrl;

    const formatPrice = (price: number) => {
        return new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(price);
    };

    const handleExtraSelect = (groupId: string, extraId: string, selectionType: 'single' | 'multiple') => {
        setSelectedExtras(prev => {
            const current = prev[groupId] || [];
            if (selectionType === 'single') {
                return { ...prev, [groupId]: [extraId] };
            } else {
                if (current.includes(extraId)) {
                    return { ...prev, [groupId]: current.filter(id => id !== extraId) };
                } else {
                    return { ...prev, [groupId]: [...current, extraId] };
                }
            }
        });
    };

    const getExtraPrice = () => {
        let total = 0;
        Object.entries(selectedExtras).forEach(([groupId, extraIds]) => {
            const group = extraGroups.find(g => g.id === groupId);
            if (group) {
                extraIds.forEach(extraId => {
                    const extra = group.extras.find(e => e.id === extraId);
                    if (extra) total += extra.priceModifier;
                });
            }
        });
        return total;
    };

    const totalPrice = (product.price + getExtraPrice()) * quantity;

    const handleAdd = () => {
        const extras: CartItem['selectedExtras'] = [];
        Object.entries(selectedExtras).forEach(([groupId, extraIds]) => {
            const group = extraGroups.find(g => g.id === groupId);
            if (group) {
                extraIds.forEach(extraId => {
                    const extra = group.extras.find(e => e.id === extraId);
                    if (extra) {
                        extras.push({
                            groupId,
                            extraId,
                            name: extra.name,
                            price: extra.priceModifier
                        });
                    }
                });
            }
        });
        onAddToCart(product, quantity, extras);
        onClose();
    };

    // Check if required groups are selected
    const requiredGroups = extraGroups.filter(g => g.isRequired);
    const isValid = requiredGroups.every(g => (selectedExtras[g.id]?.length || 0) > 0);

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 z-[100] bg-black/50"
                    />

                    <motion.div
                        initial={{ y: "100%" }}
                        animate={{ y: 0 }}
                        exit={{ y: "100%" }}
                        transition={{ type: "spring", damping: 30, stiffness: 350 }}
                        className="fixed inset-x-0 bottom-0 z-[100] max-h-[90vh]"
                    >
                        <div className="bg-white rounded-t-3xl shadow-2xl flex flex-col max-h-[90vh]">
                            {/* Product Image */}
                            {productImage ? (
                                <div className="relative w-full h-48 flex-shrink-0">
                                    <img src={productImage} alt={product.name} className="w-full h-full object-cover rounded-t-3xl" />
                                    <button
                                        onClick={onClose}
                                        className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center rounded-full bg-white shadow-md text-gray-600 hover:bg-gray-50 transition-all"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>
                            ) : (
                                <div className="relative p-4 flex justify-end flex-shrink-0">
                                    <button
                                        onClick={onClose}
                                        className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 transition-all"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>
                            )}

                            {/* Scrollable Content */}
                            <div className="flex-1 overflow-y-auto px-5 pb-4">
                                {/* Product Info */}
                                <div className="pt-4 pb-4 border-b border-gray-100">
                                    <h3 className="text-xl font-bold text-gray-900 leading-tight">{product.name}</h3>

                                    {/* Price Row */}
                                    <div className="flex items-center gap-2 mt-2">
                                        <span className="text-lg font-bold text-gray-900">
                                            {formatPrice(product.price)}
                                        </span>
                                        {product.discountPrice && product.discountUntil && new Date(product.discountUntil) > new Date() && (
                                            <>
                                                <span className="text-sm text-gray-400 line-through">
                                                    {formatPrice(product.price)}
                                                </span>
                                                <span className="text-xs font-semibold text-green-600 bg-green-50 px-2 py-0.5 rounded">
                                                    {Math.round((1 - product.discountPrice / product.price) * 100)}% indirim
                                                </span>
                                            </>
                                        )}
                                    </div>

                                    {/* Description */}
                                    {product.description && (
                                        <p className="text-sm text-gray-500 mt-3 leading-relaxed">{product.description}</p>
                                    )}
                                </div>

                                {/* Extra Groups - Required first, with purple background */}
                                {extraGroups.length > 0 && (
                                    <div className="divide-y divide-gray-100">
                                        {/* Sort: required first, then optional */}
                                        {[...extraGroups].sort((a, b) => (b.isRequired ? 1 : 0) - (a.isRequired ? 1 : 0)).map((group, index) => (
                                            <div
                                                key={group.id}
                                                className={clsx(
                                                    "py-4 px-1 -mx-1 rounded-xl",
                                                    group.isRequired && "bg-[#9333ea]/5"
                                                )}
                                            >
                                                {/* Group Header */}
                                                <div className="flex items-center justify-between mb-3">
                                                    <div>
                                                        <h4 className="font-semibold text-gray-900">
                                                            {index + 1}. {group.name}
                                                        </h4>
                                                        <span className="text-xs text-gray-400">
                                                            {group.selectionType === 'single' ? '1 Seçim' : `En fazla ${group.maxSelections} seçebilirsiniz`}
                                                        </span>
                                                    </div>
                                                    <span className={clsx(
                                                        "text-xs font-medium px-2.5 py-1 rounded border",
                                                        group.isRequired
                                                            ? "text-[#9333ea] border-[#9333ea]/30 bg-white"
                                                            : "text-green-600 border-green-200"
                                                    )}>
                                                        {group.isRequired ? "Zorunlu" : "İsteğe bağlı"}
                                                    </span>
                                                </div>

                                                {/* Options */}
                                                <div className="space-y-2">
                                                    {group.extras.map(extra => {
                                                        const isSelected = selectedExtras[group.id]?.includes(extra.id);
                                                        return (
                                                            <button
                                                                key={extra.id}
                                                                onClick={() => handleExtraSelect(group.id, extra.id, group.selectionType)}
                                                                className="w-full py-3 px-4 rounded-xl flex items-center justify-between hover:bg-gray-50 transition-colors bg-white"
                                                            >
                                                                <div className="flex items-center gap-3">
                                                                    {/* Radio/Checkbox */}
                                                                    <div className={clsx(
                                                                        "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all flex-shrink-0",
                                                                        isSelected
                                                                            ? "border-[#9333ea] bg-[#9333ea]"
                                                                            : "border-gray-300"
                                                                    )}>
                                                                        {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                                                                    </div>
                                                                    {/* Extra Image */}
                                                                    {extra.imageUrl && (
                                                                        <img
                                                                            src={toR2ProxyUrl(extra.imageUrl)}
                                                                            alt={extra.name}
                                                                            className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
                                                                        />
                                                                    )}
                                                                    <span className={clsx(
                                                                        "text-[15px]",
                                                                        isSelected ? "text-gray-900 font-medium" : "text-gray-600"
                                                                    )}>
                                                                        {extra.name}
                                                                    </span>
                                                                </div>
                                                                {extra.priceModifier > 0 && (
                                                                    <span className="text-sm text-[#9333ea] font-medium">
                                                                        +{formatPrice(extra.priceModifier)}
                                                                    </span>
                                                                )}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Bottom Bar */}
                            <div className="p-4 bg-white border-t border-gray-100 safe-bottom flex items-center gap-4">
                                {/* Quantity */}
                                <div className="flex items-center gap-2 bg-gray-100 rounded-xl p-1">
                                    <button
                                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                                        className="w-10 h-10 rounded-lg flex items-center justify-center text-gray-600 hover:bg-white transition-colors"
                                    >
                                        <Minus className="w-4 h-4" />
                                    </button>
                                    <span className="w-8 text-center font-bold text-gray-900">{quantity}</span>
                                    <button
                                        onClick={() => setQuantity(quantity + 1)}
                                        className="w-10 h-10 rounded-lg bg-[#9333ea] text-white flex items-center justify-center hover:bg-[#7c22ce] transition-colors"
                                    >
                                        <Plus className="w-4 h-4" />
                                    </button>
                                </div>

                                {/* Add Button */}
                                <button
                                    onClick={handleAdd}
                                    disabled={!isValid}
                                    className={clsx(
                                        "flex-1 py-4 rounded-xl font-semibold text-base flex items-center justify-center gap-2 transition-all",
                                        isValid
                                            ? "bg-[#9333ea] text-white shadow-lg"
                                            : "bg-gray-200 text-gray-400 cursor-not-allowed"
                                    )}
                                >
                                    Sepete Ekle
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </>
            )
            }
        </AnimatePresence >
    );
}

// ============================================
// CHECKOUT MODAL
// ============================================
function CheckoutModal({
    isOpen,
    onClose,
    cart,
    businessId,
    businessName,
    onOrderSuccess,
    pickupEnabled = true,
    deliveryEnabled = true,
    cashPayment = true,
    cardOnDelivery = true,
    deliveryFeeAmount = 0,
    freeDeliveryAbove = 0,
}: {
    isOpen: boolean;
    onClose: () => void;
    cart: CartItem[];
    businessId: string;
    businessName: string;
    onOrderSuccess: (orderNumber: string) => void;
    pickupEnabled?: boolean;
    deliveryEnabled?: boolean;
    cashPayment?: boolean;
    cardOnDelivery?: boolean;
    deliveryFeeAmount?: number;
    freeDeliveryAbove?: number;
}) {
    const [customerName, setCustomerName] = useState("");
    const [customerPhone, setCustomerPhone] = useState("");
    const [customerAddress, setCustomerAddress] = useState("");
    const [customerNote, setCustomerNote] = useState("");
    // Set default based on what's enabled
    const [deliveryType, setDeliveryType] = useState<"pickup" | "delivery">(pickupEnabled ? "pickup" : "delivery");
    const [paymentMethod, setPaymentMethod] = useState<"cash" | "card">(cashPayment ? "cash" : "card");
    const [isSubmitting, setIsSubmitting] = useState(false);
    // Coupon state
    const [couponCode, setCouponCode] = useState("");
    const [appliedCoupon, setAppliedCoupon] = useState<{ id: string; code: string; title: string; discountType: string } | null>(null);
    const [couponDiscount, setCouponDiscount] = useState(0);
    const [couponError, setCouponError] = useState("");
    const [validatingCoupon, setValidatingCoupon] = useState(false);

    const subtotal = cart.reduce((sum, item) => sum + item.totalPrice, 0);
    // Free delivery if above threshold, coupon free_delivery, or use settings fee
    const isFreeDeliveryFromCoupon = appliedCoupon?.discountType === 'free_delivery';
    const deliveryFee = deliveryType === "delivery"
        ? (isFreeDeliveryFromCoupon ? 0 : (freeDeliveryAbove > 0 && subtotal >= freeDeliveryAbove ? 0 : deliveryFeeAmount))
        : 0;
    const total = subtotal + deliveryFee - couponDiscount;

    const formatPrice = (price: number) => new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(price);

    // Validate coupon
    const validateCoupon = async () => {
        if (!couponCode.trim()) return;
        setValidatingCoupon(true);
        setCouponError("");
        try {
            const productIds = cart.map(item => item.product.id);
            const categoryIds = [...new Set(cart.map(item => item.product.categoryId))];
            const res = await fetch('/api/fastfood/validate-coupon', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    businessId,
                    code: couponCode.toUpperCase().trim(),
                    subtotal,
                    productIds,
                    categoryIds,
                    customerPhone: customerPhone.trim() || undefined,
                }),
            });
            const data = await res.json();
            if (data.valid && data.coupon) {
                setAppliedCoupon(data.coupon);
                setCouponDiscount(data.discount || 0);
                setCouponCode("");
            } else {
                setCouponError(data.message || "Geçersiz kupon");
            }
        } catch (error) {
            setCouponError("Kupon doğrulanamadı");
        }
        setValidatingCoupon(false);
    };

    const removeCoupon = () => {
        setAppliedCoupon(null);
        setCouponDiscount(0);
        setCouponError("");
    };

    const handleSubmit = async () => {
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
                businessId,
                customerName: customerName.trim(),
                customerPhone: customerPhone.trim(),
                customerAddress: customerAddress.trim(),
                deliveryType,
                paymentMethod,
                items: cart.map(item => ({
                    productId: item.product.id,
                    productName: item.product.name,
                    unitPrice: item.product.price,
                    quantity: item.quantity,
                    // Transform field names to match Zod validator: extraId→id, price→priceModifier
                    selectedExtras: item.selectedExtras.map(ext => ({
                        id: ext.extraId,
                        name: ext.name,
                        priceModifier: ext.price
                    })),
                    totalPrice: item.totalPrice
                })),
                subtotal,
                deliveryFee,
                total: Math.max(0, total),
                customerNote: customerNote.trim(),
                // Coupon data
                couponId: appliedCoupon?.id || null,
                couponCode: appliedCoupon?.code || null,
                couponDiscount: couponDiscount || 0,
            };

            const res = await fetch("/api/fastfood/orders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(orderData) });
            const data = await res.json();
            if (data.success) { onOrderSuccess(data.orderNumber); }
            else { alert(data.error || "Sipariş gönderilemedi."); }
        } catch (error) { console.error("Order error:", error); alert("Bir hata oluştu."); }
        setIsSubmitting(false);
    };

    useEffect(() => {
        document.body.style.overflow = isOpen ? 'hidden' : '';
        return () => { document.body.style.overflow = ''; };
    }, [isOpen]);

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 z-[100] bg-black/50" />
                    <motion.div
                        initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
                        transition={{ type: "spring", damping: 30, stiffness: 350 }}
                        className="fixed inset-x-0 bottom-0 z-[100] h-full max-h-[92vh]"
                    >
                        <div className="bg-white rounded-t-3xl shadow-2xl flex flex-col h-full overflow-hidden">
                            {/* Header */}
                            <div className="px-5 py-4 flex items-center justify-between flex-shrink-0 border-b border-gray-100">
                                <h2 className="text-lg font-semibold text-gray-900">Sipariş Tamamla</h2>
                                <button onClick={onClose} className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 transition-colors">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Scrollable Content */}
                            <div className="flex-1 overflow-y-auto">
                                {/* Cart Section */}
                                <div className="px-5 py-4 border-b border-gray-100">
                                    <div className="flex items-center gap-2 text-sm font-medium text-gray-500 mb-3">
                                        <ShoppingBag className="w-4 h-4" />
                                        <span>Sepetim</span>
                                    </div>
                                    <div className="space-y-3">
                                        {cart.map((item, i) => (
                                            <div key={i} className="flex items-start gap-3">
                                                <div className="w-12 h-12 rounded-lg bg-gray-100 flex-shrink-0 overflow-hidden">
                                                    {item.product.image || item.product.imageUrl ? (
                                                        <img src={toR2ProxyUrl(item.product.image || item.product.imageUrl)} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center">
                                                            <Utensils className="w-5 h-5 text-gray-300" />
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="font-medium text-gray-900 text-sm">{item.product.name}</div>
                                                    <div className="text-xs text-gray-400">{item.quantity} Adet</div>
                                                    {/* Selected Extras */}
                                                    {item.selectedExtras.length > 0 && (
                                                        <div className="mt-1 text-xs text-gray-500">
                                                            {item.selectedExtras.map((ext, idx) => (
                                                                <span key={ext.extraId}>
                                                                    {ext.name}
                                                                    {ext.price > 0 && (
                                                                        <span className="text-[#9333ea]"> (+{formatPrice(ext.price)})</span>
                                                                    )}
                                                                    {idx < item.selectedExtras.length - 1 && ', '}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="font-semibold text-gray-900 text-sm">{formatPrice(item.totalPrice)}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Delivery Type - Only show if at least one option available */}
                                {(pickupEnabled || deliveryEnabled) && (
                                    <div className="px-5 py-4 border-b border-gray-100">
                                        <div className="flex rounded-lg border border-gray-200 p-1">
                                            {pickupEnabled && (
                                                <button
                                                    onClick={() => setDeliveryType("pickup")}
                                                    className={clsx(
                                                        "flex-1 py-2.5 rounded-md text-sm font-medium flex items-center justify-center gap-2 transition-all",
                                                        deliveryType === "pickup"
                                                            ? "bg-gray-900 text-white"
                                                            : "text-gray-500 hover:text-gray-700"
                                                    )}
                                                >
                                                    <Store className="w-4 h-4" />
                                                    Mağazadan Teslim
                                                </button>
                                            )}
                                            {deliveryEnabled && (
                                                <button
                                                    onClick={() => setDeliveryType("delivery")}
                                                    className={clsx(
                                                        "flex-1 py-2.5 rounded-md text-sm font-medium flex items-center justify-center gap-2 transition-all",
                                                        deliveryType === "delivery"
                                                            ? "bg-gray-900 text-white"
                                                            : "text-gray-500 hover:text-gray-700"
                                                    )}
                                                >
                                                    <Truck className="w-4 h-4" />
                                                    Adrese Teslim
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Form Fields */}
                                <div className="px-5 py-4 space-y-4">
                                    {/* Name & Phone Row */}
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-xs font-medium text-gray-500 mb-1.5">İsim</label>
                                            <input
                                                type="text"
                                                value={customerName}
                                                onChange={(e) => setCustomerName(e.target.value)}
                                                placeholder="Adınız"
                                                className="w-full h-11 px-3 rounded-lg border border-gray-200 text-sm focus:border-[#9333ea] focus:ring-1 focus:ring-[#9333ea]/20 outline-none transition-colors"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-500 mb-1.5">Telefon</label>
                                            <input
                                                type="tel"
                                                value={customerPhone}
                                                onChange={(e) => setCustomerPhone(e.target.value)}
                                                placeholder="05XX XXX XX XX"
                                                className="w-full h-11 px-3 rounded-lg border border-gray-200 text-sm focus:border-[#9333ea] focus:ring-1 focus:ring-[#9333ea]/20 outline-none transition-colors"
                                            />
                                        </div>
                                    </div>

                                    {/* Address (only for delivery) */}
                                    {deliveryType === "delivery" && (
                                        <div>
                                            <label className="block text-xs font-medium text-gray-500 mb-1.5">Adres</label>
                                            <textarea
                                                value={customerAddress}
                                                onChange={(e) => setCustomerAddress(e.target.value)}
                                                rows={2}
                                                placeholder="Açık adresinizi yazın..."
                                                className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:border-[#9333ea] focus:ring-1 focus:ring-[#9333ea]/20 outline-none transition-colors resize-none"
                                            />
                                        </div>
                                    )}

                                    {/* Payment Method - Only show if at least one option available */}
                                    {(cashPayment || cardOnDelivery) && (
                                        <div>
                                            <label className="block text-xs font-medium text-gray-500 mb-2">Ödeme Yöntemi</label>
                                            <div className="flex gap-2">
                                                {cashPayment && (
                                                    <button
                                                        onClick={() => setPaymentMethod("cash")}
                                                        className={clsx(
                                                            "flex-1 h-11 rounded-lg border text-sm font-medium flex items-center justify-center gap-2 transition-all",
                                                            paymentMethod === "cash"
                                                                ? "border-[#9333ea] bg-[#9333ea]/5 text-[#9333ea]"
                                                                : "border-gray-200 text-gray-600 hover:border-gray-300"
                                                        )}
                                                    >
                                                        <Banknote className="w-4 h-4" />
                                                        Nakit
                                                    </button>
                                                )}
                                                {cardOnDelivery && (
                                                    <button
                                                        onClick={() => setPaymentMethod("card")}
                                                        className={clsx(
                                                            "flex-1 h-11 rounded-lg border text-sm font-medium flex items-center justify-center gap-2 transition-all",
                                                            paymentMethod === "card"
                                                                ? "border-[#9333ea] bg-[#9333ea]/5 text-[#9333ea]"
                                                                : "border-gray-200 text-gray-600 hover:border-gray-300"
                                                        )}
                                                    >
                                                        <CreditCard className="w-4 h-4" />
                                                        Kart
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Coupon Input Section */}
                            <div className="px-5 py-4 border-t border-gray-100">
                                <label className="block text-xs font-medium text-gray-500 mb-2">🏷️ Kupon Kodu</label>
                                {appliedCoupon ? (
                                    <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-xl px-4 py-3">
                                        <div className="flex items-center gap-2">
                                            <span className="text-green-600 font-medium">{appliedCoupon.code}</span>
                                            <span className="text-green-700 text-sm">
                                                {appliedCoupon.discountType === 'free_delivery' ? 'Ücretsiz teslimat' : `-${formatPrice(couponDiscount)}`}
                                            </span>
                                        </div>
                                        <button
                                            onClick={removeCoupon}
                                            className="text-red-500 text-sm font-medium hover:text-red-600"
                                        >
                                            Kaldır
                                        </button>
                                    </div>
                                ) : (
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            placeholder="Kupon kodunu girin"
                                            value={couponCode}
                                            onChange={(e) => { setCouponCode(e.target.value.toUpperCase()); setCouponError(""); }}
                                            className="flex-1 h-11 px-4 rounded-xl border border-gray-200 text-sm font-mono uppercase focus:border-[#9333ea] focus:ring-1 focus:ring-[#9333ea]/20 outline-none transition-colors"
                                        />
                                        <button
                                            onClick={validateCoupon}
                                            disabled={validatingCoupon || !couponCode.trim()}
                                            className="px-5 h-11 bg-gray-900 text-white rounded-xl text-sm font-medium disabled:opacity-50 transition-colors"
                                        >
                                            {validatingCoupon ? <Loader2 className="w-4 h-4 animate-spin" /> : "Uygula"}
                                        </button>
                                    </div>
                                )}
                                {couponError && (
                                    <p className="text-red-500 text-xs mt-2">{couponError}</p>
                                )}
                            </div>

                            {/* Footer */}
                            <div className="border-t border-gray-100 p-5 flex-shrink-0 bg-white safe-bottom">
                                <div className="space-y-1.5 mb-4">
                                    <div className="flex justify-between text-sm text-gray-500">
                                        <span>Ara Toplam</span>
                                        <span>{formatPrice(subtotal)}</span>
                                    </div>
                                    {deliveryType === "delivery" && (
                                        <div className="flex justify-between text-sm text-gray-500">
                                            <span>Teslimat Ücreti</span>
                                            <span className={isFreeDeliveryFromCoupon ? "text-green-600 line-through" : ""}>
                                                {isFreeDeliveryFromCoupon ? formatPrice(deliveryFeeAmount) : formatPrice(deliveryFee)}
                                            </span>
                                        </div>
                                    )}
                                    {(couponDiscount > 0 || appliedCoupon) && (
                                        <div className="flex justify-between text-sm text-green-600">
                                            <span>🎉 Kupon İndirimi</span>
                                            <span>
                                                {appliedCoupon?.discountType === 'free_delivery'
                                                    ? 'Ücretsiz Teslimat'
                                                    : `-${formatPrice(couponDiscount)}`}
                                            </span>
                                        </div>
                                    )}
                                    <div className="flex justify-between text-base font-semibold text-gray-900 pt-2 border-t border-gray-100">
                                        <span>Toplam</span>
                                        <span>{formatPrice(Math.max(0, total))}</span>
                                    </div>
                                </div>

                                <button
                                    onClick={handleSubmit}
                                    disabled={isSubmitting}
                                    className="w-full h-12 rounded-xl bg-[#9333ea] text-white font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-50 transition-all active:scale-[0.98]"
                                >
                                    {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : "Siparişi Onayla"}
                                    {!isSubmitting && <ArrowRight className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}

// ============================================
// SUCCESS MODAL
// ============================================
function SuccessModal({ isOpen, orderNumber, businessName, onClose }: { isOpen: boolean; orderNumber: string; businessName: string; onClose: () => void; }) {
    useEffect(() => { document.body.style.overflow = isOpen ? 'hidden' : ''; return () => { document.body.style.overflow = ''; }; }, [isOpen]);
    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-6">
                    <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white rounded-[2.5rem] shadow-2xl p-8 max-w-sm w-full text-center relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-orange-400 to-red-600" />
                        <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                            <Check className="w-12 h-12 text-green-600" />
                        </div>
                        <h1 className="text-3xl font-black text-gray-900 mb-2">Harika!</h1>
                        <p className="text-gray-500 font-medium mb-6">Siparişiniz başarıyla alındı ve restorana iletildi.</p>

                        <div className="bg-gray-50 rounded-2xl p-4 mb-8 border border-gray-100">
                            <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-1">Sipariş No</p>
                            <span className="text-3xl font-black text-gray-900 tracking-tight">{orderNumber}</span>
                        </div>

                        <button onClick={onClose} className="w-full py-4 rounded-2xl bg-gray-900 text-white font-bold hover:bg-black transition-colors shadow-lg active:scale-95">
                            Teşekkürler
                        </button>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

// ============================================
// MAIN COMPONENT
// ============================================
export function FastFoodInlineMenu({ isOpen, businessSlug, businessName, businessId, onClose }: FastFoodInlineMenuProps) {
    const [categories, setCategories] = useState<Category[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [campaigns, setCampaigns] = useState<Campaign[]>([]);
    const [extraGroups, setExtraGroups] = useState<ExtraGroup[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [cart, setCart] = useState<CartItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [mounted, setMounted] = useState(false);

    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [showProductDetail, setShowProductDetail] = useState(false);
    const [showCheckout, setShowCheckout] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [orderNumber, setOrderNumber] = useState("");
    const [fetchedBusinessId, setFetchedBusinessId] = useState<string>(businessId || "");
    const [minOrderAmount, setMinOrderAmount] = useState(0);
    const [menuDeliveryFee, setMenuDeliveryFee] = useState(0);
    const [freeDeliveryAbove, setFreeDeliveryAbove] = useState(0);
    const [pickupEnabled, setPickupEnabled] = useState(true);
    const [deliveryEnabled, setDeliveryEnabled] = useState(true);
    const [cashPayment, setCashPayment] = useState(true);
    const [cardOnDelivery, setCardOnDelivery] = useState(true);
    const [estimatedDeliveryTime, setEstimatedDeliveryTime] = useState('30-45 dk');
    const [coupons, setCoupons] = useState<{ id: string; code: string; title: string; description: string; emoji: string; discountType: string; discountValue: number; minOrderAmount: number; }[]>([]);
    const [showCartBar, setShowCartBar] = useState(false);
    const cartBarTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Working hours state
    const [workingHours, setWorkingHours] = useState<Record<string, { open: string; close: string; isOpen: boolean }> | null>(null);
    const [isBusinessOpen, setIsBusinessOpen] = useState(true);

    const categoryRefs = useRef<Record<string, HTMLDivElement | null>>({});
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => { setMounted(true); }, []);
    const refreshMenu = useCallback(async (useCache: boolean = true, showLoading: boolean = true) => {
        if (showLoading) setLoading(true);

        if (useCache) {
            const cached = getCachedMenuData(businessSlug);
            if (cached) {
                if (cached.businessId) setFetchedBusinessId(cached.businessId);
                const sortedCats = (cached.categories || []).sort((a: Category, b: Category) => (a.sortOrder || 0) - (b.sortOrder || 0));
                setCategories(sortedCats);
                setProducts(cached.products || []);
                setCampaigns(cached.campaigns || []);
                setExtraGroups(cached.extraGroups || []);
                setMinOrderAmount(cached.settings.minOrderAmount);
                setMenuDeliveryFee(cached.settings.deliveryFee);
                setFreeDeliveryAbove(cached.settings.freeDeliveryAbove);
                setPickupEnabled(cached.settings.pickupEnabled);
                setDeliveryEnabled(cached.settings.deliveryEnabled);
                setCashPayment(cached.settings.cashPayment);
                setCardOnDelivery(cached.settings.cardOnDelivery);
                setEstimatedDeliveryTime(cached.settings.estimatedDeliveryTime);
                if (sortedCats.length > 0) setSelectedCategory(sortedCats[0].id);
                setCoupons(cached.coupons || []);

                const useBusinessHours = cached.settings.useBusinessHours !== false;
                if (useBusinessHours && cached.settings.workingHours) {
                    setWorkingHours(cached.settings.workingHours);
                    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
                    const now = new Date();
                    const currentDay = days[now.getDay()];
                    const todayHours = cached.settings.workingHours[currentDay];
                    if (todayHours && todayHours.isOpen) {
                        const currentTime = now.getHours() * 60 + now.getMinutes();
                        const [openHour, openMin] = todayHours.open.split(':').map(Number);
                        const [closeHour, closeMin] = todayHours.close.split(':').map(Number);
                        setIsBusinessOpen(currentTime >= openHour * 60 + openMin && currentTime < closeHour * 60 + closeMin);
                    } else {
                        setIsBusinessOpen(false);
                    }
                } else {
                    setIsBusinessOpen(true);
                }

                if (showLoading) setLoading(false);
                return;
            }
        }

        try {
            const res = await fetch(`/api/fastfood/public-menu?businessSlug=${businessSlug}`);
            const data = await res.json();
            if (data.success && data.data) {
                const {
                    categories: cats, products: prods, businessId: fetchedId, campaigns: camps, extraGroups: extras,
                    minOrderAmount: minOrder, deliveryFee: delFee, freeDeliveryAbove: freeAbove,
                    pickupEnabled: pickup, deliveryEnabled: delivery, cashPayment: cash, cardOnDelivery: card,
                    estimatedDeliveryTime: estTime, workingHours: hours, useBusinessHours: useBizHours
                } = data.data;
                if (fetchedId) setFetchedBusinessId(fetchedId);
                const sortedCats = (cats || []).sort((a: Category, b: Category) => (a.sortOrder || 0) - (b.sortOrder || 0));
                setCategories(sortedCats);
                setProducts(prods || []);
                setCampaigns(camps || []);
                setExtraGroups(extras || []);
                setMinOrderAmount(Number(minOrder) || 0);
                setMenuDeliveryFee(Number(delFee) || 0);
                setFreeDeliveryAbove(Number(freeAbove) || 0);
                setPickupEnabled(pickup !== false);
                setDeliveryEnabled(delivery !== false);
                setCashPayment(cash !== false);
                setCardOnDelivery(card !== false);
                setEstimatedDeliveryTime(estTime || '30-45 dk');
                if (sortedCats.length > 0) setSelectedCategory(sortedCats[0].id);

                const shouldUseBusinessHours = useBizHours !== false;
                if (shouldUseBusinessHours && hours) {
                    setWorkingHours(hours);
                    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
                    const now = new Date();
                    const currentDay = days[now.getDay()];
                    const todayHours = hours[currentDay];
                    if (todayHours && todayHours.isOpen) {
                        const currentTime = now.getHours() * 60 + now.getMinutes();
                        const [openHour, openMin] = todayHours.open.split(':').map(Number);
                        const [closeHour, closeMin] = todayHours.close.split(':').map(Number);
                        setIsBusinessOpen(currentTime >= openHour * 60 + openMin && currentTime < closeHour * 60 + closeMin);
                    } else {
                        setIsBusinessOpen(false);
                    }
                } else {
                    setIsBusinessOpen(true);
                }
            }
        } catch (error) {
            console.error("Failed to fetch menu:", error);
        }

        if (showLoading) setLoading(false);
    }, [businessSlug]);

    useEffect(() => {
        if (categories.length > 0) return;
        refreshMenu(true, true);
    }, [categories.length, refreshMenu]);

    useFastfoodMenuSubscription(isOpen ? fetchedBusinessId : null, () => refreshMenu(false, false));

    // Cart functions
    const addToCart = (product: Product, quantity: number, extras: CartItem['selectedExtras']) => {
        const extraTotal = extras.reduce((sum, e) => sum + e.price, 0);
        const totalPrice = (product.price + extraTotal) * quantity;

        setCart(prev => {
            return [...prev, { product, quantity, selectedExtras: extras, totalPrice }];
        });

        // Show cart bar and set auto-hide timer
        setShowCartBar(true);
        if (cartBarTimeoutRef.current) {
            clearTimeout(cartBarTimeoutRef.current);
        }
        cartBarTimeoutRef.current = setTimeout(() => {
            setShowCartBar(false);
        }, 4000);
    };

    const removeCartItem = (index: number) => {
        setCart(prev => prev.filter((_, i) => i !== index));
    };

    const clearCart = () => setCart([]);

    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    const total = cart.reduce((sum, item) => sum + item.totalPrice, 0);

    const formatPrice = (price: number) => new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(price);

    const getProductsByCategory = (categoryId: string) => {
        return products.filter(p => p.categoryId === categoryId && p.isActive && p.inStock).sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
    };

    const openProductDetail = (product: Product) => {
        setSelectedProduct(product);
        setShowProductDetail(true);
    };

    const handleOrderSuccess = (orderNum: string) => {
        setOrderNumber(orderNum);
        setShowCheckout(false);
        setShowSuccess(true);
        clearCart();
    };

    const getProductExtraGroups = (product: Product) => {
        // Only show extra groups that are explicitly assigned to this product
        if (product.extraGroupIds && product.extraGroupIds.length > 0) {
            return extraGroups.filter(g => product.extraGroupIds?.includes(g.id));
        }
        // If no extraGroupIds assigned, show no extras
        return [];
    };

    const scrollToCategory = (catId: string) => {
        setSelectedCategory(catId);
        const element = categoryRefs.current[catId];
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.15, ease: "easeOut" }}
                    className="overflow-hidden w-full col-span-2 relative"
                    style={{ marginTop: '0.75rem' }}
                >
                    <div className="rounded-2xl overflow-hidden border border-gray-200 bg-white relative min-h-[600px]">

                        {/* Close Button */}
                        <button
                            onClick={onClose}
                            className="absolute top-3 right-3 z-20 w-9 h-9 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-700 transition-colors"
                        >
                            <X className="w-4 h-4" />
                        </button>

                        {/* Closed Business Overlay */}
                        {!isBusinessOpen && workingHours && (
                            <div className="absolute inset-0 z-30 bg-black/60 backdrop-blur-sm flex items-center justify-center">
                                <div className="bg-white rounded-2xl p-8 mx-4 text-center shadow-2xl max-w-sm">
                                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <Clock className="w-8 h-8 text-gray-500" />
                                    </div>
                                    <h3 className="text-xl font-bold text-gray-900 mb-2">Çalışma Saatleri Dışındayız</h3>
                                    <p className="text-gray-500 mb-4">
                                        Şu anda sipariş alamıyoruz. Lütfen çalışma saatlerimizde tekrar deneyin.
                                    </p>
                                    {(() => {
                                        const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
                                        const dayNames: Record<string, string> = { sunday: 'Pazar', monday: 'Pazartesi', tuesday: 'Salı', wednesday: 'Çarşamba', thursday: 'Perşembe', friday: 'Cuma', saturday: 'Cumartesi' };
                                        const now = new Date();
                                        const currentDay = days[now.getDay()];
                                        const todayHours = workingHours[currentDay];
                                        if (todayHours && todayHours.isOpen) {
                                            return (
                                                <div className="bg-gray-50 rounded-xl px-4 py-3">
                                                    <p className="text-sm text-gray-600">
                                                        <span className="font-semibold">{dayNames[currentDay]}:</span> {todayHours.open} - {todayHours.close}
                                                    </p>
                                                </div>
                                            );
                                        } else {
                                            return (
                                                <div className="bg-red-50 rounded-xl px-4 py-3">
                                                    <p className="text-sm text-red-600 font-medium">Bugün kapalıyız</p>
                                                </div>
                                            );
                                        }
                                    })()}
                                </div>
                            </div>
                        )}

                        <div className={clsx("h-full overflow-y-auto pb-24", !isBusinessOpen && "opacity-40 pointer-events-none")} style={{ maxHeight: '700px' }} ref={scrollContainerRef}>

                            {/* 1. CAMPAIGNS - Minimalist */}
                            {campaigns.length > 0 && campaigns.some(c => c.isActive) && (
                                <div className="px-5 pt-4 pb-2">
                                    <div className="flex gap-3 overflow-x-auto scrollbar-hide snap-x">
                                        {campaigns.filter(c => c.isActive).map(camp => (
                                            <div
                                                key={camp.id}
                                                className="flex-shrink-0 w-full sm:w-[280px] snap-center rounded-xl bg-[#9333ea] p-4 text-white"
                                            >
                                                <span className="inline-block px-2 py-0.5 rounded-full bg-white/20 text-xs font-medium mb-2">Kampanya</span>
                                                <h3 className="text-lg font-bold leading-tight">{camp.title}</h3>
                                                {camp.description && <p className="text-white/80 text-sm mt-1">{camp.description}</p>}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* 2. STICKY CATEGORY NAV - Purple Theme */}
                            <div className="sticky top-0 z-10 bg-white border-b border-gray-100">
                                <div className="flex gap-2 overflow-x-auto scrollbar-hide no-scrollbar px-5 py-3">
                                    {categories.filter(c => c.isActive).map((cat) => (
                                        <button
                                            key={cat.id}
                                            onClick={() => scrollToCategory(cat.id)}
                                            className={clsx(
                                                "px-6 py-3 rounded-full text-sm font-bold whitespace-nowrap transition-all",
                                                selectedCategory === cat.id
                                                    ? "bg-[#9333ea] text-white shadow-lg shadow-[#9333ea]/25"
                                                    : "bg-gray-100 text-gray-700 hover:bg-[#9333ea]/10 hover:text-[#9333ea]"
                                            )}
                                        >
                                            {cat.name}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* 2.5 DELIVERY INFO BAR */}
                            {(minOrderAmount > 0 || menuDeliveryFee === 0) && (
                                <div className="flex items-center justify-center gap-4 px-5 py-2 bg-gray-50 border-b border-gray-100">
                                    {menuDeliveryFee === 0 ? (
                                        <span className="text-xs font-medium text-green-600">✓ Ücretsiz Teslimat</span>
                                    ) : (
                                        <span className="text-xs font-medium text-gray-500">Teslimat: {formatPrice(menuDeliveryFee)}</span>
                                    )}
                                    {minOrderAmount > 0 && (
                                        <span className="text-xs font-medium text-gray-500">Min. Sepet: {formatPrice(minOrderAmount)}</span>
                                    )}
                                </div>
                            )}

                            {/* 2.6 COUPONS DISPLAY - Click to Copy */}
                            {coupons.length > 0 && (
                                <div className="px-5 py-3 border-b border-gray-100">
                                    <div className="flex gap-2 overflow-x-auto scrollbar-hide no-scrollbar pb-1">
                                        {coupons.map((coupon) => (
                                            <button
                                                key={coupon.id}
                                                onClick={() => {
                                                    navigator.clipboard.writeText(coupon.code);
                                                    toast.success(`Kopyalandı: ${coupon.code}`, { duration: 2000 });
                                                }}
                                                className="flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-xl border-2 border-dashed border-[#9333ea]/30 bg-[#9333ea]/5 hover:bg-[#9333ea]/10 hover:border-[#9333ea]/50 transition-all group"
                                            >
                                                <span className="text-lg">{coupon.emoji}</span>
                                                <div className="text-left">
                                                    <p className="text-xs font-bold text-[#9333ea]">{coupon.title}</p>
                                                    <p className="text-[10px] font-mono text-gray-500 group-hover:text-[#9333ea]">{coupon.code} • Kopyala</p>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                            {/* 3. PRODUCTS LIST - Minimalist */}
                            <div className="px-5 py-4">
                                {categories.filter(c => c.isActive).map((cat) => {
                                    const catProducts = getProductsByCategory(cat.id);
                                    if (catProducts.length === 0) return null;

                                    return (
                                        <div key={cat.id} ref={el => { categoryRefs.current[cat.id] = el; }} className="scroll-mt-16 mb-6">
                                            {/* Category Header */}
                                            <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wide mb-3">
                                                {cat.name}
                                            </h3>

                                            {/* Product Cards */}
                                            <div className="space-y-2">
                                                {catProducts.map((product) => {
                                                    const productImage = product.image || product.imageUrl;
                                                    const hasDiscount = product.discountPrice && product.discountUntil && new Date(product.discountUntil) > new Date();
                                                    const displayPrice = hasDiscount ? product.discountPrice : product.price;

                                                    return (
                                                        <div
                                                            key={product.id}
                                                            onClick={() => openProductDetail(product)}
                                                            className="flex items-center gap-3 p-3 rounded-2xl hover:bg-gray-50 cursor-pointer transition-colors -mx-1 border border-transparent hover:border-gray-100"
                                                        >
                                                            {/* Image - Larger */}
                                                            <div className="w-[88px] h-[88px] flex-shrink-0 rounded-xl overflow-hidden bg-gray-100">
                                                                {productImage ? (
                                                                    <img src={productImage} alt={product.name} className="w-full h-full object-cover" />
                                                                ) : (
                                                                    <div className="w-full h-full flex items-center justify-center">
                                                                        <Utensils className="w-8 h-8 text-gray-300" />
                                                                    </div>
                                                                )}
                                                            </div>

                                                            {/* Content */}
                                                            <div className="flex-1 min-w-0">
                                                                <h4 className="text-[15px] font-bold text-gray-900 line-clamp-1">{product.name}</h4>
                                                                <p className="text-xs text-gray-400 line-clamp-1 mt-0.5">{product.description}</p>
                                                                <div className="flex items-baseline gap-2 mt-1">
                                                                    <span className="text-[15px] font-bold text-[#9333ea]">
                                                                        {formatPrice(displayPrice!)}
                                                                    </span>
                                                                    {hasDiscount && (
                                                                        <span className="text-xs text-gray-400 line-through">
                                                                            {formatPrice(product.price)}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>

                                                            {/* Add Button - Smaller */}
                                                            <button className="w-8 h-8 rounded-full bg-[#9333ea] flex items-center justify-center text-white shadow-md shadow-[#9333ea]/20 hover:bg-[#7c22ce] transition-all flex-shrink-0">
                                                                <Plus className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Empty State */}
                            {products.length === 0 && !loading && (
                                <div className="flex flex-col items-center justify-center py-20 text-center px-5">
                                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                                        <Utensils className="w-8 h-8 text-gray-400" />
                                    </div>
                                    <h3 className="text-base font-medium text-gray-900">Menü Hazırlanıyor</h3>
                                    <p className="text-sm text-gray-500 mt-1">Lütfen daha sonra tekrar kontrol edin.</p>
                                </div>
                            )}
                        </div>

                        {/* 4. FLOATING CART BAR - Auto-hides after 4 seconds */}
                        <AnimatePresence>
                            {totalItems > 0 && showCartBar && !showCheckout && (
                                <motion.div
                                    initial={{ y: 100, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    exit={{ y: 100, opacity: 0 }}
                                    className="fixed bottom-0 left-0 right-0 p-4 pb-6 z-[200] bg-gradient-to-t from-white via-white to-transparent safe-bottom"
                                    onMouseEnter={() => {
                                        // Cancel timer when hovering
                                        if (cartBarTimeoutRef.current) {
                                            clearTimeout(cartBarTimeoutRef.current);
                                        }
                                    }}
                                    onMouseLeave={() => {
                                        // Restart timer when mouse leaves
                                        cartBarTimeoutRef.current = setTimeout(() => {
                                            setShowCartBar(false);
                                        }, 4000);
                                    }}
                                >
                                    <button
                                        onClick={() => setShowCheckout(true)}
                                        className="w-full h-14 bg-[#9333ea] text-white rounded-2xl flex items-center justify-between px-5 shadow-xl shadow-purple-500/30 active:scale-[0.98] transition-transform"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-7 h-7 bg-white/20 rounded-full flex items-center justify-center text-sm font-bold">
                                                {totalItems}
                                            </div>
                                            <span className="text-base font-semibold">Sepeti Gör</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-base font-bold">{formatPrice(total)}</span>
                                            <ArrowRight className="w-5 h-5" />
                                        </div>
                                    </button>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Modals */}
                    {mounted && showProductDetail && (
                        createPortal(
                            <ProductDetailModal
                                product={selectedProduct}
                                isOpen={showProductDetail}
                                onClose={() => { setShowProductDetail(false); setSelectedProduct(null); }}
                                onAddToCart={addToCart}
                                extraGroups={selectedProduct ? getProductExtraGroups(selectedProduct) : []}
                            />,
                            document.body
                        )
                    )}

                    {mounted && showCheckout && (
                        createPortal(
                            <CheckoutModal
                                isOpen={showCheckout}
                                onClose={() => setShowCheckout(false)}
                                cart={cart}
                                businessId={fetchedBusinessId}
                                businessName={businessName}
                                onOrderSuccess={handleOrderSuccess}
                                pickupEnabled={pickupEnabled}
                                deliveryEnabled={deliveryEnabled}
                                cashPayment={cashPayment}
                                cardOnDelivery={cardOnDelivery}
                                deliveryFeeAmount={menuDeliveryFee}
                                freeDeliveryAbove={freeDeliveryAbove}
                            />,
                            document.body
                        )
                    )}

                    {mounted && showSuccess && (
                        createPortal(
                            <SuccessModal
                                isOpen={showSuccess}
                                orderNumber={orderNumber}
                                businessName={businessName}
                                onClose={() => { setShowSuccess(false); setOrderNumber(""); }}
                            />,
                            document.body
                        )
                    )}

                    <style jsx global>{`
                        .scrollbar-hide::-webkit-scrollbar { display: none; }
                        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
                    `}</style>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

