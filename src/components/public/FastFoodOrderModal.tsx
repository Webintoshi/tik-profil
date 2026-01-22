"use client";

import { useState, useEffect, useCallback } from "react";
import { X, Plus, Minus, ShoppingCart, MessageCircle, Loader2 } from "lucide-react";
import { toR2ProxyUrl } from "@/lib/publicImage";
import { useFastfoodMenuSubscription } from "@/hooks/useMenuRealtime";

interface Category {
    id: string;
    name: string;
    emoji: string;
    isActive: boolean;
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
}

interface CartItem {
    product: Product;
    quantity: number;
}

interface FastFoodOrderModalProps {
    isOpen: boolean;
    onClose: () => void;
    businessName: string;
    businessSlug: string;
    whatsappNumber?: string;
}

export function FastFoodOrderModal({ isOpen, onClose, businessName, businessSlug, whatsappNumber }: FastFoodOrderModalProps) {
    const [categories, setCategories] = useState<Category[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [businessId, setBusinessId] = useState<string | null>(null);
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [cart, setCart] = useState<CartItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [customerName, setCustomerName] = useState("");
    const [customerPhone, setCustomerPhone] = useState("");
    const [notes, setNotes] = useState("");
    const [step, setStep] = useState(1); // 1: Menu, 2: Customer Info

    // Fetch categories and products from public API
    const refreshMenu = useCallback(async (showLoading: boolean = false) => {
        if (!isOpen) return;
        if (showLoading) setLoading(true);
        try {
            const res = await fetch(`/api/fastfood/public-menu?businessSlug=${businessSlug}`);
            const data = await res.json();

            if (data.success && data.data) {
                const { categories, products, businessId: fetchedId } = data.data;
                setCategories(categories || []);
                setProducts(products || []);
                setBusinessId((fetchedId as string) || null);

                if (categories && categories.length > 0) {
                    setSelectedCategory(categories[0].id);
                }
            }
        } catch (error) {
            console.error("Failed to fetch menu:", error);
        }
        if (showLoading) setLoading(false);
    }, [businessSlug, isOpen]);

    useEffect(() => {
        refreshMenu(true);
    }, [refreshMenu]);

    useFastfoodMenuSubscription(isOpen ? businessId : null, () => refreshMenu(false));

    // Reset on close
    useEffect(() => {
        if (!isOpen) {
            setCart([]);
            setStep(1);
            setCustomerName("");
            setCustomerPhone("");
            setNotes("");
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const filteredProducts = selectedCategory
        ? products.filter(p => p.categoryId === selectedCategory)
        : products;

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

    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    const totalPrice = cart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);

    const formatPrice = (price: number) => {
        return new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(price);
    };

    const formatWhatsAppMessage = () => {
        const orderLines = cart.map(item =>
            `• ${item.quantity}x ${item.product.name} - ${formatPrice(item.product.price * item.quantity)}`
        ).join("\n");

        const message = `🍔 *SİPARİŞ*

📍 *İşletme:* ${businessName}

👤 *Müşteri:* ${customerName}
📱 *Telefon:* ${customerPhone}

📦 *Sipariş Detayı:*
${orderLines}

💰 *Toplam:* ${formatPrice(totalPrice)}
${notes ? `\n📝 *Not:* ${notes}` : ""}

_Tık Profil üzerinden gönderilmiştir_\nhttps://tikprofil.com`;

        return encodeURIComponent(message);
    };

    const handleSubmit = () => {
        if (!whatsappNumber) {
            alert("İşletmenin WhatsApp numarası tanımlı değil.");
            return;
        }

        const cleanNumber = whatsappNumber.replace(/[\s\-\(\)]/g, "");
        const whatsappUrl = `https://wa.me/${cleanNumber}?text=${formatWhatsAppMessage()}`;

        window.open(whatsappUrl, "_blank");
        onClose();
    };

    const isFormValid = customerName.trim().length > 0 && customerPhone.trim().length >= 10;

    return (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

            {/* Modal */}
            <div className="relative w-full max-w-lg bg-white rounded-t-3xl md:rounded-3xl shadow-2xl max-h-[90vh] flex flex-col overflow-hidden animate-slide-up">
                {/* Header */}
                <div className="flex-shrink-0 bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between z-10">
                    <div>
                        <h2 className="text-lg font-bold text-gray-900">
                            {step === 1 ? "Menü" : "Sipariş Bilgileri"}
                        </h2>
                        <p className="text-xs text-gray-500">{businessName}</p>
                    </div>
                    <button onClick={onClose} className="p-2 -mr-2 rounded-full hover:bg-gray-100 transition-colors">
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                {step === 1 ? (
                    <>
                        {/* Categories */}
                        {categories.length > 0 && (
                            <div className="flex-shrink-0 px-4 py-2 bg-gray-50 border-b border-gray-100 overflow-x-auto">
                                <div className="flex gap-2">
                                    {categories.map(cat => (
                                        <button
                                            key={cat.id}
                                            onClick={() => setSelectedCategory(cat.id)}
                                            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${selectedCategory === cat.id
                                                ? "bg-purple-600 text-white"
                                                : "bg-white text-gray-700 border border-gray-200 hover:border-purple-300"
                                                }`}
                                        >
                                            {cat.emoji} {cat.name}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Products */}
                        <div className="flex-1 overflow-y-auto p-4">
                            {loading ? (
                                <div className="flex items-center justify-center py-12">
                                    <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
                                </div>
                            ) : filteredProducts.length === 0 ? (
                                <div className="text-center py-12 text-gray-500">
                                    <p>Henüz ürün eklenmemiş</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {filteredProducts.map(product => {
                                        const qty = getCartItemQuantity(product.id);
                                        return (
                                            <div key={product.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-2xl">
                                                {product.image && (
                                                    <img src={toR2ProxyUrl(product.image)} alt="" className="w-16 h-16 rounded-xl object-cover" />
                                                )}
                                                <div className="flex-1 min-w-0">
                                                    <h3 className="font-semibold text-gray-900 truncate">{product.name}</h3>
                                                    {product.description && (
                                                        <p className="text-xs text-gray-500 truncate">{product.description}</p>
                                                    )}
                                                    <p className="text-sm font-bold text-purple-600 mt-1">
                                                        {formatPrice(product.price)}
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    {qty > 0 ? (
                                                        <>
                                                            <button
                                                                onClick={() => removeFromCart(product.id)}
                                                                className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center hover:bg-gray-300"
                                                            >
                                                                <Minus className="w-4 h-4" />
                                                            </button>
                                                            <span className="w-6 text-center font-bold">{qty}</span>
                                                            <button
                                                                onClick={() => addToCart(product)}
                                                                className="w-8 h-8 rounded-full bg-purple-600 text-white flex items-center justify-center hover:bg-purple-700"
                                                            >
                                                                <Plus className="w-4 h-4" />
                                                            </button>
                                                        </>
                                                    ) : (
                                                        <button
                                                            onClick={() => addToCart(product)}
                                                            className="px-4 py-2 rounded-full bg-purple-600 text-white text-sm font-medium hover:bg-purple-700"
                                                        >
                                                            Ekle
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Cart Summary & Continue */}
                        {totalItems > 0 && (
                            <div className="flex-shrink-0 bg-white border-t border-gray-100 px-4 py-3">
                                <button
                                    onClick={() => setStep(2)}
                                    className="w-full py-3.5 rounded-xl bg-purple-600 text-white font-bold flex items-center justify-center gap-3 hover:bg-purple-700 active:scale-95 transition-all shadow-lg shadow-purple-200"
                                >
                                    <ShoppingCart className="w-5 h-5" />
                                    <span>Sepeti Onayla ({totalItems} ürün)</span>
                                    <span className="bg-white/20 px-2 py-0.5 rounded-full text-sm">{formatPrice(totalPrice)}</span>
                                </button>
                            </div>
                        )}
                    </>
                ) : (
                    <>
                        {/* Customer Info Form */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-4">
                            {/* Order Summary */}
                            <div className="bg-purple-50 rounded-2xl p-4 border border-purple-100">
                                <h3 className="font-bold text-purple-900 mb-2">Sipariş Özeti</h3>
                                <div className="space-y-1 text-sm">
                                    {cart.map(item => (
                                        <div key={item.product.id} className="flex justify-between">
                                            <span>{item.quantity}x {item.product.name}</span>
                                            <span className="font-semibold">{formatPrice(item.product.price * item.quantity)}</span>
                                        </div>
                                    ))}
                                    <div className="border-t border-purple-200 pt-2 mt-2 flex justify-between font-bold">
                                        <span>Toplam</span>
                                        <span>{formatPrice(totalPrice)}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Customer Info */}
                            <div>
                                <label className="block text-sm font-medium text-gray-900 mb-1.5">
                                    Ad Soyad <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={customerName}
                                    onChange={(e) => setCustomerName(e.target.value)}
                                    placeholder="Örn: Ahmet Yılmaz"
                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-purple-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-900 mb-1.5">
                                    Telefon <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="tel"
                                    value={customerPhone}
                                    onChange={(e) => setCustomerPhone(e.target.value)}
                                    placeholder="05XX XXX XX XX"
                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-purple-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-900 mb-1.5">Not (Opsiyonel)</label>
                                <textarea
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    placeholder="Özel istekleriniz..."
                                    rows={2}
                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-purple-500 outline-none resize-none"
                                />
                            </div>
                        </div>

                        {/* Footer Buttons */}
                        <div className="flex-shrink-0 bg-white border-t border-gray-100 px-4 py-3 flex gap-3">
                            <button
                                onClick={() => setStep(1)}
                                className="flex-1 py-3.5 rounded-xl bg-gray-100 text-gray-700 font-bold hover:bg-gray-200"
                            >
                                Geri
                            </button>
                            <button
                                onClick={handleSubmit}
                                disabled={!isFormValid}
                                className="flex-1 py-3.5 rounded-xl bg-green-500 text-white font-bold flex items-center justify-center gap-2 hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-green-200"
                            >
                                <MessageCircle className="w-5 h-5" />
                                WhatsApp ile Gönder
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

