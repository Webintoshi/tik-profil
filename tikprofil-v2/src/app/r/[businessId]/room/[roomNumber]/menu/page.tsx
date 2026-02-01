"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    ArrowLeft,
    Loader2,
    ShoppingCart,
    Plus,
    Minus,
    CheckCircle,
    X,
    Globe,
} from "lucide-react";
import Link from "next/link";

// Types
interface MenuItem {
    id: string;
    name: string;
    description?: string;
    price: number;
    image?: string;
    categoryId: string;
}

interface Category {
    id: string;
    name: string;
}

interface CartItem extends MenuItem {
    quantity: number;
}

// Language support
type Language = "tr" | "en" | "de" | "ru";

const LANGUAGES = [
    { code: "tr" as Language, label: "Türkçe", flag: "🇹🇷" },
    { code: "en" as Language, label: "English", flag: "🇬🇧" },
    { code: "de" as Language, label: "Deutsch", flag: "🇩🇪" },
    { code: "ru" as Language, label: "Русский", flag: "🇷🇺" },
];

const TRANSLATIONS: Record<Language, {
    pageTitle: string;
    roomLabel: string;
    emptyMenu: string;
    cart: string;
    orderNow: string;
    total: string;
    confirmOrder: string;
    orderSuccess: string;
    orderMessage: string;
    newOrder: string;
    addNote: string;
}> = {
    tr: {
        pageTitle: "Oda Servisi Menüsü",
        roomLabel: "Oda",
        emptyMenu: "Menü henüz eklenmemiş",
        cart: "Sepet",
        orderNow: "Sipariş Ver",
        total: "Toplam",
        confirmOrder: "Siparişi Onayla",
        orderSuccess: "Siparişiniz Alındı!",
        orderMessage: "Siparişiniz en kısa sürede odanıza teslim edilecektir.",
        newOrder: "Yeni Sipariş",
        addNote: "Sipariş notu (opsiyonel)",
    },
    en: {
        pageTitle: "Room Service Menu",
        roomLabel: "Room",
        emptyMenu: "Menu not available",
        cart: "Cart",
        orderNow: "Order Now",
        total: "Total",
        confirmOrder: "Confirm Order",
        orderSuccess: "Order Received!",
        orderMessage: "Your order will be delivered to your room shortly.",
        newOrder: "New Order",
        addNote: "Order note (optional)",
    },
    de: {
        pageTitle: "Zimmerservice-Menü",
        roomLabel: "Zimmer",
        emptyMenu: "Menü nicht verfügbar",
        cart: "Warenkorb",
        orderNow: "Jetzt bestellen",
        total: "Gesamt",
        confirmOrder: "Bestellung bestätigen",
        orderSuccess: "Bestellung erhalten!",
        orderMessage: "Ihre Bestellung wird in Kürze geliefert.",
        newOrder: "Neue Bestellung",
        addNote: "Bestellhinweis (optional)",
    },
    ru: {
        pageTitle: "Меню обслуживания номеров",
        roomLabel: "Номер",
        emptyMenu: "Меню недоступно",
        cart: "Корзина",
        orderNow: "Заказать",
        total: "Итого",
        confirmOrder: "Подтвердить заказ",
        orderSuccess: "Заказ принят!",
        orderMessage: "Ваш заказ будет доставлен в номер в ближайшее время.",
        newOrder: "Новый заказ",
        addNote: "Примечание к заказу (необязательно)",
    },
};

interface Props {
    params: Promise<{ businessId: string; roomNumber: string }>;
}

export default function RoomServiceMenuPage({ params }: Props) {
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);
    const [businessId, setBusinessId] = useState("");
    const [roomNumber, setRoomNumber] = useState("");
    const [categories, setCategories] = useState<Category[]>([]);
    const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
    const [activeCategory, setActiveCategory] = useState<string | null>(null);
    const [cart, setCart] = useState<CartItem[]>([]);
    const [showCart, setShowCart] = useState(false);
    const [orderNote, setOrderNote] = useState("");
    const [lang, setLang] = useState<Language>("tr");
    const [showLangMenu, setShowLangMenu] = useState(false);

    const t = TRANSLATIONS[lang];

    // Load params and menu
    useEffect(() => {
        params.then(async (p) => {
            setBusinessId(p.businessId);
            setRoomNumber(p.roomNumber);

            // Detect browser language
            const browserLang = navigator.language.split("-")[0] as Language;
            if (LANGUAGES.some(l => l.code === browserLang)) {
                setLang(browserLang);
            }

            // Load menu
            try {
                const [catRes, itemRes] = await Promise.all([
                    fetch(`/api/menu/categories?businessId=${p.businessId}`),
                    fetch(`/api/menu/items?businessId=${p.businessId}`),
                ]);

                const catData = await catRes.json();
                const itemData = await itemRes.json();

                if (catData.success && catData.categories?.length > 0) {
                    setCategories(catData.categories);
                    setActiveCategory(catData.categories[0].id);
                }

                if (itemData.success) {
                    setMenuItems(itemData.items || []);
                }
            } catch (error) {
                console.error("Error loading menu:", error);
            } finally {
                setLoading(false);
            }
        });
    }, [params]);

    const addToCart = (item: MenuItem) => {
        setCart(prev => {
            const existing = prev.find(i => i.id === item.id);
            if (existing) {
                return prev.map(i =>
                    i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
                );
            }
            return [...prev, { ...item, quantity: 1 }];
        });
    };

    const removeFromCart = (itemId: string) => {
        setCart(prev => {
            const existing = prev.find(i => i.id === itemId);
            if (existing && existing.quantity > 1) {
                return prev.map(i =>
                    i.id === itemId ? { ...i, quantity: i.quantity - 1 } : i
                );
            }
            return prev.filter(i => i.id !== itemId);
        });
    };

    const cartTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

    const handleSubmitOrder = async () => {
        if (cart.length === 0) return;

        setSubmitting(true);
        try {
            const res = await fetch("/api/hotel/room-service-orders", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    businessId,
                    roomNumber,
                    items: cart.map(item => ({
                        id: item.id,
                        name: item.name,
                        price: item.price,
                        quantity: item.quantity,
                    })),
                    total: cartTotal,
                    note: orderNote.trim() || null,
                    language: lang,
                }),
            });

            const data = await res.json();

            if (data.success) {
                setSuccess(true);
                setCart([]);
                setOrderNote("");
                setShowCart(false);
            }
        } catch (error) {
            console.error("Order error:", error);
        } finally {
            setSubmitting(false);
        }
    };

    const filteredItems = activeCategory
        ? menuItems.filter(item => item.categoryId === activeCategory)
        : menuItems;

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
        );
    }

    if (success) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="bg-white rounded-3xl p-8 text-center max-w-sm w-full shadow-xl"
                >
                    <div className="w-20 h-20 mx-auto bg-green-100 rounded-full flex items-center justify-center mb-6">
                        <CheckCircle className="w-10 h-10 text-green-500" />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">
                        {t.orderSuccess}
                    </h1>
                    <p className="text-gray-500 mb-6">
                        {t.orderMessage}
                    </p>
                    <button
                        onClick={() => setSuccess(false)}
                        className="w-full py-3 bg-blue-500 text-white rounded-xl font-semibold hover:bg-blue-600 transition-colors"
                    >
                        {t.newOrder}
                    </button>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 pb-24">
            {/* Header */}
            <div className="bg-white border-b border-gray-200 px-4 py-4 sticky top-0 z-10">
                <div className="max-w-lg mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Link href={`/r/${businessId}/room/${roomNumber}`} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                            <ArrowLeft className="w-5 h-5 text-gray-600" />
                        </Link>
                        <div>
                            <h1 className="font-semibold text-gray-900">{t.pageTitle}</h1>
                            <p className="text-sm text-gray-500">{t.roomLabel} {roomNumber}</p>
                        </div>
                    </div>

                    {/* Language Selector */}
                    <div className="relative">
                        <button
                            onClick={() => setShowLangMenu(!showLangMenu)}
                            className="flex items-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
                        >
                            <Globe className="w-4 h-4 text-gray-600" />
                            <span className="text-lg">{LANGUAGES.find(l => l.code === lang)?.flag}</span>
                        </button>

                        <AnimatePresence>
                            {showLangMenu && (
                                <motion.div
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    className="absolute right-0 top-full mt-2 bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden z-20"
                                >
                                    {LANGUAGES.map((language) => (
                                        <button
                                            key={language.code}
                                            onClick={() => {
                                                setLang(language.code);
                                                setShowLangMenu(false);
                                            }}
                                            className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors ${lang === language.code ? "bg-blue-50" : ""
                                                }`}
                                        >
                                            <span className="text-xl">{language.flag}</span>
                                            <span className="text-gray-900">{language.label}</span>
                                        </button>
                                    ))}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </div>

            {/* Categories */}
            {categories.length > 0 && (
                <div className="bg-white border-b border-gray-200 px-4 py-3 sticky top-[65px] z-10">
                    <div className="max-w-lg mx-auto flex gap-2 overflow-x-auto pb-1">
                        {categories.map((cat) => (
                            <button
                                key={cat.id}
                                onClick={() => setActiveCategory(cat.id)}
                                className={`px-4 py-2 rounded-full whitespace-nowrap font-medium text-sm transition-colors ${activeCategory === cat.id
                                        ? "bg-blue-500 text-white"
                                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                    }`}
                            >
                                {cat.name}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Menu Items */}
            <div className="max-w-lg mx-auto p-4 space-y-3">
                {filteredItems.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                        {t.emptyMenu}
                    </div>
                ) : (
                    filteredItems.map((item) => {
                        const cartItem = cart.find(i => i.id === item.id);
                        return (
                            <div
                                key={item.id}
                                className="bg-white rounded-2xl p-4 border border-gray-200 flex gap-4"
                            >
                                {item.image && (
                                    <img
                                        src={item.image}
                                        alt={item.name}
                                        className="w-20 h-20 rounded-xl object-cover"
                                    />
                                )}
                                <div className="flex-1">
                                    <h3 className="font-semibold text-gray-900">{item.name}</h3>
                                    {item.description && (
                                        <p className="text-sm text-gray-500 line-clamp-2">{item.description}</p>
                                    )}
                                    <p className="font-bold text-blue-500 mt-1">₺{item.price}</p>
                                </div>
                                <div className="flex items-center">
                                    {cartItem ? (
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => removeFromCart(item.id)}
                                                className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
                                            >
                                                <Minus className="w-4 h-4 text-gray-600" />
                                            </button>
                                            <span className="font-semibold text-gray-900 w-6 text-center">
                                                {cartItem.quantity}
                                            </span>
                                            <button
                                                onClick={() => addToCart(item)}
                                                className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center hover:bg-blue-600 transition-colors"
                                            >
                                                <Plus className="w-4 h-4 text-white" />
                                            </button>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => addToCart(item)}
                                            className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center hover:bg-blue-600 transition-colors"
                                        >
                                            <Plus className="w-5 h-5 text-white" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* Cart Button */}
            {cartCount > 0 && (
                <motion.div
                    initial={{ y: 100 }}
                    animate={{ y: 0 }}
                    className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-200"
                >
                    <button
                        onClick={() => setShowCart(true)}
                        className="w-full max-w-lg mx-auto flex items-center justify-between px-6 py-4 bg-blue-500 text-white rounded-2xl font-semibold hover:bg-blue-600 transition-colors"
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                                <ShoppingCart className="w-5 h-5" />
                            </div>
                            <span>{t.cart} ({cartCount})</span>
                        </div>
                        <span>₺{cartTotal.toFixed(2)}</span>
                    </button>
                </motion.div>
            )}

            {/* Cart Modal */}
            <AnimatePresence>
                {showCart && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end justify-center"
                        onClick={() => setShowCart(false)}
                    >
                        <motion.div
                            initial={{ y: "100%" }}
                            animate={{ y: 0 }}
                            exit={{ y: "100%" }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-white rounded-t-3xl w-full max-w-lg max-h-[80vh] overflow-y-auto"
                        >
                            {/* Header */}
                            <div className="flex items-center justify-between p-4 border-b border-gray-200">
                                <h2 className="text-xl font-bold text-gray-900">{t.cart}</h2>
                                <button
                                    onClick={() => setShowCart(false)}
                                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                                >
                                    <X className="w-5 h-5 text-gray-500" />
                                </button>
                            </div>

                            {/* Items */}
                            <div className="p-4 space-y-3">
                                {cart.map((item) => (
                                    <div key={item.id} className="flex items-center gap-4">
                                        <div className="flex-1">
                                            <p className="font-medium text-gray-900">{item.name}</p>
                                            <p className="text-sm text-gray-500">₺{item.price} x {item.quantity}</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => removeFromCart(item.id)}
                                                className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
                                            >
                                                <Minus className="w-4 h-4 text-gray-600" />
                                            </button>
                                            <span className="font-semibold text-gray-900 w-6 text-center">
                                                {item.quantity}
                                            </span>
                                            <button
                                                onClick={() => addToCart(item)}
                                                className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center hover:bg-blue-600 transition-colors"
                                            >
                                                <Plus className="w-4 h-4 text-white" />
                                            </button>
                                        </div>
                                        <p className="font-bold text-gray-900 w-16 text-right">
                                            ₺{(item.price * item.quantity).toFixed(2)}
                                        </p>
                                    </div>
                                ))}
                            </div>

                            {/* Note */}
                            <div className="p-4 border-t border-gray-100">
                                <textarea
                                    value={orderNote}
                                    onChange={(e) => setOrderNote(e.target.value)}
                                    placeholder={t.addNote}
                                    rows={2}
                                    className="w-full p-3 rounded-xl border border-gray-200 bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none text-gray-900 placeholder-gray-400"
                                />
                            </div>

                            {/* Total & Submit */}
                            <div className="p-4 border-t border-gray-200 space-y-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-lg font-medium text-gray-600">{t.total}</span>
                                    <span className="text-2xl font-bold text-gray-900">₺{cartTotal.toFixed(2)}</span>
                                </div>
                                <button
                                    onClick={handleSubmitOrder}
                                    disabled={submitting}
                                    className="w-full py-4 bg-blue-500 text-white rounded-2xl font-semibold hover:bg-blue-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {submitting ? (
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                    ) : (
                                        t.confirmOrder
                                    )}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
