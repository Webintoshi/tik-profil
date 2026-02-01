"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    X,
    ShoppingCart,
    Plus,
    Minus,
    ChevronLeft,
    ChevronRight,
    Loader2,
    Check,
    Tag,
    Truck,
    CreditCard,
    MapPin,
    Phone,
    User,
    Mail,
    Image as ImageIcon,
    Wallet,
    Building,
    Banknote,
} from "lucide-react";
import clsx from "clsx";
import type { Product, Category, CartItem, EcommerceSettings, ShippingOption } from "@/types/ecommerce";
import { toR2ProxyUrl } from "@/lib/publicImage";

interface EcommerceSheetProps {
    businessId: string;
    businessName: string;
    isOpen: boolean;
    onClose: () => void;
}

type CheckoutStep = 'cart' | 'info' | 'confirm' | 'success';

export default function EcommerceSheet({
    businessId,
    businessName,
    isOpen,
    onClose,
}: EcommerceSheetProps) {
    const [isLoading, setIsLoading] = useState(true);
    const [categories, setCategories] = useState<Category[]>([]);
    const [products, setProducts] = useState<(Product & { categoryName: string })[]>([]);
    const [activeCategory, setActiveCategory] = useState<string>("");
    const [cart, setCart] = useState<CartItem[]>([]);
    const [step, setStep] = useState<CheckoutStep>('cart');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [orderNumber, setOrderNumber] = useState("");

    // Customer info
    const [customerName, setCustomerName] = useState("");
    const [customerPhone, setCustomerPhone] = useState("");
    const [customerEmail, setCustomerEmail] = useState("");
    const [customerAddress, setCustomerAddress] = useState("");
    const [customerCity, setCustomerCity] = useState("");
    const [customerDistrict, setCustomerDistrict] = useState("");
    const [customerNotes, setCustomerNotes] = useState("");
    const [couponCode, setCouponCode] = useState("");
    const [appliedDiscount, setAppliedDiscount] = useState(0);

    // Settings and selections
    const [settings, setSettings] = useState<EcommerceSettings | null>(null);
    const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'cash' | 'card' | 'transfer'>('cash');
    const [selectedShippingOption, setSelectedShippingOption] = useState<ShippingOption | null>(null);

    // Fetch products
    useEffect(() => {
        if (!isOpen || !businessId) return;

        async function fetchProducts() {
            setIsLoading(true);
            try {
                const res = await fetch(`/api/public/products?businessId=${businessId}`);
                if (res.ok) {
                    const data = await res.json();
                    setCategories(data.categories || []);
                    setProducts(data.products || []);
                }
            } catch (error) {
                console.error("Products fetch error:", error);
            } finally {
                setIsLoading(false);
            }
        }

        fetchProducts();
    }, [businessId, isOpen]);

    // Fetch settings
    useEffect(() => {
        if (!isOpen || !businessId) return;

        async function fetchSettings() {
            try {
                const res = await fetch(`/api/ecommerce/settings?businessId=${businessId}`);
                if (res.ok) {
                    const data = await res.json();
                    setSettings(data);
                    // Set default shipping option
                    if (data.shippingOptions?.length > 0) {
                        const activeOption = data.shippingOptions.find((o: ShippingOption) => o.isActive);
                        if (activeOption) setSelectedShippingOption(activeOption);
                    }
                }
            } catch (error) {
                console.error("Settings fetch error:", error);
            }
        }

        fetchSettings();
    }, [businessId, isOpen]);

    // Filter products by category
    const filteredProducts = activeCategory
        ? products.filter(p => p.categoryId === activeCategory)
        : products;

    // Cart operations
    const addToCart = useCallback((product: Product) => {
        setCart(prev => {
            const existing = prev.find(item => item.productId === product.id);
            if (existing) {
                return prev.map(item =>
                    item.productId === product.id
                        ? { ...item, quantity: item.quantity + 1 }
                        : item
                );
            }
            return [...prev, {
                id: `cart-${Date.now()}`,
                productId: product.id,
                name: product.name,
                price: product.price,
                quantity: 1,
                image: product.images?.[0],
                maxStock: product.stock ?? product.stockQuantity,
            }];
        });
    }, []);

    const updateQuantity = useCallback((productId: string, delta: number) => {
        setCart(prev => prev.map(item => {
            if (item.productId === productId) {
                const newQty = Math.max(0, item.quantity + delta);
                if (newQty === 0) return item;
                if (item.maxStock && newQty > item.maxStock) return item;
                return { ...item, quantity: newQty };
            }
            return item;
        }).filter(item => item.quantity > 0));
    }, []);

    const removeFromCart = useCallback((productId: string) => {
        setCart(prev => prev.filter(item => item.productId !== productId));
    }, []);

    // Calculate totals
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const freeThreshold = settings?.freeShippingThreshold || 500;
    const baseShipping = selectedShippingOption?.price ?? 49.90;
    const shippingCost = subtotal >= freeThreshold ? 0 : baseShipping;
    const total = subtotal + shippingCost - appliedDiscount;
    const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

    // Available payment methods from settings
    const availablePayments = settings?.paymentMethods || { cash: true, card: false, transfer: false, online: false };

    // Submit order
    const submitOrder = async () => {
        if (!customerName || !customerPhone || !customerAddress || !customerCity) {
            return;
        }

        setIsSubmitting(true);
        try {
            const res = await fetch("/api/public/checkout", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    businessId,
                    items: cart.map(item => ({
                        productId: item.productId,
                        variantId: item.variantId,
                        quantity: item.quantity,
                    })),
                    customerInfo: {
                        name: customerName,
                        phone: customerPhone,
                        email: customerEmail,
                        address: customerAddress,
                        city: customerCity,
                        district: customerDistrict,
                        notes: customerNotes,
                    },
                    paymentMethod: 'cash',
                    shippingCost,
                    couponCode: couponCode || undefined,
                }),
            });

            if (res.ok) {
                const data = await res.json();
                setOrderNumber(data.orderNumber);
                setStep('success');
                setCart([]);
            } else {
                const error = await res.json();
                alert(error.error || "Sipariş oluşturulamadı");
            }
        } catch (error) {
            console.error("Checkout error:", error);
            alert("Bağlantı hatası");
        } finally {
            setIsSubmitting(false);
        }
    };

    // Reset on close
    const handleClose = () => {
        if (step === 'success') {
            setStep('cart');
            setOrderNumber("");
        }
        onClose();
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
                    className="overflow-hidden w-full col-span-2"
                    style={{ marginTop: '1rem' }}
                >
                    {/* Inline Container */}
                    <div className="relative rounded-2xl overflow-hidden border border-gray-200/60 bg-white shadow-lg">
                        {/* Background */}
                        <div className="absolute inset-0 bg-gradient-to-br from-gray-50 via-white to-gray-100" />

                        {/* Header */}
                        <div className="relative px-6 py-5 flex items-center justify-between border-b border-gray-100">
                            <div className="flex items-center gap-3">
                                {step !== 'cart' && step !== 'success' && (
                                    <button
                                        onClick={() => setStep(step === 'confirm' ? 'info' : 'cart')}
                                        className="p-2 -ml-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                                    >
                                        <ChevronLeft className="h-5 w-5" />
                                    </button>
                                )}
                                <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-600">
                                    <ShoppingCart className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-900">
                                        {step === 'cart' && 'Ürünler'}
                                        {step === 'info' && 'Teslimat Bilgileri'}
                                        {step === 'confirm' && 'Sipariş Özeti'}
                                        {step === 'success' && 'Sipariş Tamamlandı'}
                                    </h3>
                                    <p className="text-xs text-gray-500 font-medium">{products.length} ürün listeleniyor</p>
                                </div>
                            </div>
                            <button
                                onClick={handleClose}
                                className="w-9 h-9 flex items-center justify-center rounded-full bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-gray-600 transition-all"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="relative p-6 max-h-[500px] overflow-y-auto">
                            {isLoading ? (
                                <div className="flex items-center justify-center h-64">
                                    <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
                                </div>
                            ) : step === 'cart' ? (
                                <>
                                    {/* Categories */}
                                    {categories.length > 0 && (
                                        <div className="relative group mb-4">
                                            {/* Sol Scroll Oku */}
                                            <button className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-2 z-10 bg-white shadow-lg rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity md:hidden">
                                                <ChevronLeft className="w-4 h-4" />
                                            </button>

                                            {/* Kategori Butonları */}
                                            <div className="flex gap-2 overflow-x-auto scrollbar-hide px-2 snap-x snap-mandatory">
                                                <button
                                                    onClick={() => setActiveCategory("")}
                                                    className={clsx(
                                                        "px-4 py-2.5 rounded-2xl text-sm font-semibold whitespace-nowrap transition-all snap-start",
                                                        !activeCategory
                                                            ? "bg-purple-600 text-white border-2 border-purple-600 shadow-lg shadow-purple-500/30"
                                                            : "bg-gray-50 text-gray-700 border-2 border-transparent hover:bg-gray-100 hover:border-gray-300"
                                                    )}
                                                >
                                                    Tümü
                                                </button>
                                                {categories.map(cat => (
                                                    <button
                                                        key={cat.id}
                                                        onClick={() => setActiveCategory(cat.id)}
                                                        className={clsx(
                                                            "px-4 py-2.5 rounded-2xl text-sm font-semibold whitespace-nowrap transition-all snap-start",
                                                            activeCategory === cat.id
                                                                ? "bg-purple-600 text-white border-2 border-purple-600 shadow-lg shadow-purple-500/30"
                                                                : "bg-gray-50 text-gray-700 border-2 border-transparent hover:bg-gray-100 hover:border-gray-300"
                                                        )}
                                                    >
                                                        {cat.name}
                                                    </button>
                                                ))}
                                            </div>

                                            {/* Sağ Scroll Oku */}
                                            <button className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-2 z-10 bg-white shadow-lg rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity md:hidden">
                                                <ChevronRight className="w-4 h-4" />
                                            </button>
                                        </div>
                                    )}

                                    {/* Products Grid */}
                                    {filteredProducts.length === 0 ? (
                                        <div className="text-center py-16">
                                            <ShoppingCart className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                                            <p className="text-gray-500">Henüz ürün yok</p>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-2 sm:grid-cols-2 gap-3">
                                            {filteredProducts.map(product => {
                                                const inCart = cart.find(c => c.productId === product.id);
                                                return (
                                                    <motion.div
                                                        key={product.id}
                                                        initial={{ opacity: 0, scale: 0.95 }}
                                                        animate={{ opacity: 1, scale: 1 }}
                                                        className="bg-white rounded-2xl border border-gray-100 overflow-hidden"
                                                    >
                                                        <div className="aspect-square bg-gray-100 relative">
                                                            {product.images?.[0] ? (
                                                                <img
                                                                    src={toR2ProxyUrl(product.images[0])}
                                                                    alt={product.name}
                                                                    className="h-full w-full object-cover"
                                                                />
                                                            ) : (
                                                                <div className="h-full w-full flex items-center justify-center">
                                                                    <ImageIcon className="h-8 w-8 text-gray-300" />
                                                                </div>
                                                            )}
                                                            {product.compareAtPrice && product.compareAtPrice > product.price && (
                                                                <span className="absolute top-2 left-2 px-2 py-0.5 bg-red-500 text-white text-xs font-medium rounded-full">
                                                                    İndirim
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="p-3">
                                                            <p className="text-xs text-gray-400 mb-1">{product.categoryName}</p>
                                                            <h3 className="font-medium text-gray-900 text-sm line-clamp-2 mb-2">
                                                                {product.name}
                                                            </h3>
                                                            <div className="flex items-center justify-between">
                                                                <div>
                                                                    {product.compareAtPrice && product.compareAtPrice > product.price ? (
                                                                        <div>
                                                                            <span className="font-bold text-emerald-600">
                                                                                {product.price.toLocaleString("tr-TR")}₺
                                                                            </span>
                                                                            <span className="text-xs text-gray-400 line-through ml-1">
                                                                                {product.compareAtPrice.toLocaleString("tr-TR")}₺
                                                                            </span>
                                                                        </div>
                                                                    ) : (
                                                                        <span className="font-bold text-gray-900">
                                                                            {product.price.toLocaleString("tr-TR")}₺
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                {inCart ? (
                                                                    <div className="flex items-center gap-1 bg-gray-100 rounded-lg">
                                                                        <button
                                                                            onClick={() => updateQuantity(product.id, -1)}
                                                                            className="p-1.5 text-gray-600 hover:text-gray-900"
                                                                        >
                                                                            <Minus className="h-4 w-4" />
                                                                        </button>
                                                                        <span className="w-6 text-center font-medium text-sm">
                                                                            {inCart.quantity}
                                                                        </span>
                                                                        <button
                                                                            onClick={() => updateQuantity(product.id, 1)}
                                                                            className="p-1.5 text-gray-600 hover:text-gray-900"
                                                                        >
                                                                            <Plus className="h-4 w-4" />
                                                                        </button>
                                                                    </div>
                                                                ) : (
                                                                    <button
                                                                        onClick={() => addToCart(product)}
                                                                        className="p-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600"
                                                                    >
                                                                        <Plus className="h-4 w-4" />
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </motion.div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </>
                            ) : step === 'info' ? (
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                            Ad Soyad *
                                        </label>
                                        <div className="relative">
                                            <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                                            <input
                                                type="text"
                                                value={customerName}
                                                onChange={(e) => setCustomerName(e.target.value)}
                                                placeholder="Adınız Soyadınız"
                                                className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none text-gray-900 placeholder:text-gray-400"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                            Telefon *
                                        </label>
                                        <div className="relative">
                                            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                                            <input
                                                type="tel"
                                                value={customerPhone}
                                                onChange={(e) => setCustomerPhone(e.target.value)}
                                                placeholder="05XX XXX XX XX"
                                                className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none text-gray-900 placeholder:text-gray-400"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                            E-posta
                                        </label>
                                        <div className="relative">
                                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                                            <input
                                                type="email"
                                                value={customerEmail}
                                                onChange={(e) => setCustomerEmail(e.target.value)}
                                                placeholder="ornek@email.com"
                                                className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none text-gray-900 placeholder:text-gray-400"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                            Adres *
                                        </label>
                                        <div className="relative">
                                            <MapPin className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                                            <textarea
                                                value={customerAddress}
                                                onChange={(e) => setCustomerAddress(e.target.value)}
                                                placeholder="Mahalle, sokak, bina no, daire..."
                                                rows={2}
                                                className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none resize-none text-gray-900 placeholder:text-gray-400"
                                            />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                                İl *
                                            </label>
                                            <input
                                                type="text"
                                                value={customerCity}
                                                onChange={(e) => setCustomerCity(e.target.value)}
                                                placeholder="İstanbul"
                                                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none text-gray-900 placeholder:text-gray-400"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                                İlçe
                                            </label>
                                            <input
                                                type="text"
                                                value={customerDistrict}
                                                onChange={(e) => setCustomerDistrict(e.target.value)}
                                                placeholder="Kadıköy"
                                                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none text-gray-900 placeholder:text-gray-400"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                            Sipariş Notu
                                        </label>
                                        <textarea
                                            value={customerNotes}
                                            onChange={(e) => setCustomerNotes(e.target.value)}
                                            placeholder="Varsa özel notlarınız..."
                                            rows={2}
                                            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none resize-none text-gray-900 placeholder:text-gray-400"
                                        />
                                    </div>
                                </div>
                            ) : step === 'confirm' ? (
                                <div className="space-y-4">
                                    {/* Cart Summary */}
                                    <div className="space-y-2">
                                        {cart.map(item => (
                                            <div key={item.id} className="flex items-center gap-3 bg-gray-50 rounded-xl p-3">
                                                {item.image && (
                                                    <img src={item.image ? toR2ProxyUrl(item.image) : ""} alt="" className="h-12 w-12 rounded-lg object-cover" />
                                                )}
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-medium text-gray-900 truncate">{item.name}</p>
                                                    <p className="text-sm text-gray-500">{item.quantity} x {item.price.toLocaleString("tr-TR")}₺</p>
                                                </div>
                                                <span className="font-bold text-gray-900">
                                                    {(item.price * item.quantity).toLocaleString("tr-TR")}₺
                                                </span>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Coupon */}
                                    <div className="flex gap-2">
                                        <div className="relative flex-1">
                                            <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                                            <input
                                                type="text"
                                                value={couponCode}
                                                onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                                                placeholder="Kupon kodu"
                                                className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:border-emerald-500 outline-none font-mono uppercase text-gray-900 placeholder:text-gray-400"
                                            />
                                        </div>
                                        <button className="px-4 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200">
                                            Uygula
                                        </button>
                                    </div>

                                    {/* Delivery Info */}
                                    <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                                        <div className="flex items-center gap-2 text-sm">
                                            <User className="h-4 w-4 text-gray-400" />
                                            <span>{customerName}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-sm">
                                            <Phone className="h-4 w-4 text-gray-400" />
                                            <span>{customerPhone}</span>
                                        </div>
                                        <div className="flex items-start gap-2 text-sm">
                                            <MapPin className="h-4 w-4 text-gray-400 mt-0.5" />
                                            <span>{customerAddress}, {customerDistrict} {customerCity}</span>
                                        </div>
                                    </div>

                                    {/* Payment Method */}
                                    <div className="bg-gray-50 rounded-xl p-4">
                                        <div className="flex items-center gap-3">
                                            <div className="h-10 w-10 bg-emerald-100 rounded-xl flex items-center justify-center">
                                                <CreditCard className="h-5 w-5 text-emerald-600" />
                                            </div>
                                            <div>
                                                <p className="font-medium text-gray-900">Kapıda Ödeme</p>
                                                <p className="text-sm text-gray-500">Nakit veya kart</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="p-8 text-center">
                                    <div className="h-20 w-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <Check className="h-10 w-10 text-emerald-600" />
                                    </div>
                                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                                        Siparişiniz Alındı!
                                    </h3>
                                    <p className="text-gray-500 mb-4">
                                        Sipariş numaranız: <span className="font-mono font-bold">{orderNumber}</span>
                                    </p>
                                    <p className="text-sm text-gray-400">
                                        Siparişiniz en kısa sürede hazırlanacak ve size ulaştırılacak.
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        {step !== 'success' && cart.length > 0 && (
                            <div className="relative border-t border-gray-100 p-4 bg-white">
                                {/* Totals */}
                                {step !== 'cart' && (
                                    <div className="space-y-2 mb-4">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-500">Ara Toplam</span>
                                            <span>{subtotal.toLocaleString("tr-TR")}₺</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-500 flex items-center gap-1">
                                                <Truck className="h-4 w-4" /> Kargo
                                            </span>
                                            <span>{shippingCost === 0 ? "Ücretsiz" : `${shippingCost.toLocaleString("tr-TR")}₺`}</span>
                                        </div>
                                        {appliedDiscount > 0 && (
                                            <div className="flex justify-between text-sm text-emerald-600">
                                                <span>İndirim</span>
                                                <span>-{appliedDiscount.toLocaleString("tr-TR")}₺</span>
                                            </div>
                                        )}
                                        <div className="flex justify-between font-bold text-lg pt-2 border-t border-gray-100">
                                            <span>Toplam</span>
                                            <span>{total.toLocaleString("tr-TR")}₺</span>
                                        </div>
                                    </div>
                                )}

                                {/* Action Button */}
                                <button
                                    onClick={() => {
                                        if (step === 'cart') setStep('info');
                                        else if (step === 'info') setStep('confirm');
                                        else if (step === 'confirm') submitOrder();
                                    }}
                                    disabled={
                                        isSubmitting ||
                                        (step === 'info' && (!customerName || !customerPhone || !customerAddress || !customerCity))
                                    }
                                    className="w-full py-4 bg-emerald-500 text-white rounded-2xl font-semibold hover:bg-emerald-600 disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {isSubmitting ? (
                                        <Loader2 className="h-5 w-5 animate-spin" />
                                    ) : step === 'cart' ? (
                                        <>
                                            <ShoppingCart className="h-5 w-5" />
                                            Sepete Git ({cartCount} ürün • {subtotal.toLocaleString("tr-TR")}₺)
                                        </>
                                    ) : step === 'info' ? (
                                        <>
                                            Devam Et
                                            <ChevronRight className="h-5 w-5" />
                                        </>
                                    ) : (
                                        <>
                                            <Check className="h-5 w-5" />
                                            Siparişi Tamamla
                                        </>
                                    )}
                                </button>

                                {step === 'cart' && subtotal > 0 && subtotal < 500 && (
                                    <p className="text-center text-sm text-gray-500 mt-2">
                                        {(500 - subtotal).toLocaleString("tr-TR")}₺ daha ekle, kargo ücretsiz!
                                    </p>
                                )}
                            </div>
                        )}
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
