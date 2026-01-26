"use client";

import { useTheme } from "@/components/explore/ThemeProvider";
import Image from "next/image";
import Link from "next/link";
import { Heart, Star, MapPin, Clock, Trash2, ShoppingCart, Store, Package, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";

type TabType = "stores" | "products";

interface FavoriteItem {
    id: string;
    itemId: string;
    itemType: "business" | "product";
    name: string;
    image?: string;
    rating?: number;
    reviewCount?: number;
    distance?: string;
    deliveryTime?: string;
    category?: string;
    price?: number;
    originalPrice?: number;
    storeName?: string;
}

export default function FavoritesPage() {
    const { theme } = useTheme();
    const isDark = theme === "dark";
    const [activeTab, setActiveTab] = useState<TabType>("stores");
    const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function fetchFavorites() {
            try {
                setLoading(true);
                const type = activeTab === "stores" ? "business" : "product";
                const response = await fetch(`/api/kesfet/user/favorites?type=${type}`);
                const data = await response.json();

                if (data.success) {
                    // Transform data - in real implementation, you'd also fetch business/product details
                    setFavorites(data.data || []);
                } else {
                    setError(data.error || "Veriler yüklenemedi");
                }
            } catch (err) {
                setError("Bağlantı hatası");
                console.error(err);
            } finally {
                setLoading(false);
            }
        }

        fetchFavorites();
    }, [activeTab]);

    const removeFavorite = async (itemId: string) => {
        try {
            await fetch(`/api/kesfet/user/favorites`, {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ itemId }),
            });
            setFavorites(prev => prev.filter(f => f.itemId !== itemId));
        } catch (err) {
            console.error("Remove favorite error:", err);
        }
    };

    return (
        <div className={`min-h-screen pb-6 ${isDark ? "bg-gray-950" : "bg-gray-50"} transition-colors duration-300`}>
            {/* Header */}
            <header className={`sticky top-0 z-40 px-4 py-4
                              ${isDark ? "bg-gray-950/90" : "bg-white/90"}
                              backdrop-blur-xl border-b
                              ${isDark ? "border-white/5" : "border-gray-100"}`}>
                <h1 className={`text-xl font-bold mb-4 ${isDark ? "text-white" : "text-gray-900"}`}>
                    Favorilerim
                </h1>

                {/* Tabs */}
                <div className={`flex p-1 rounded-xl ${isDark ? "bg-white/5" : "bg-gray-100"}`}>
                    <button
                        onClick={() => setActiveTab("stores")}
                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all duration-300
                                   ${activeTab === "stores"
                                ? isDark
                                    ? "bg-white text-gray-900 shadow-lg"
                                    : "bg-white text-gray-900 shadow-md"
                                : isDark
                                    ? "text-white/60"
                                    : "text-gray-600"
                            }`}
                    >
                        <Store className="w-4 h-4" />
                        Mekanlar
                    </button>
                    <button
                        onClick={() => setActiveTab("products")}
                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all duration-300
                                   ${activeTab === "products"
                                ? isDark
                                    ? "bg-white text-gray-900 shadow-lg"
                                    : "bg-white text-gray-900 shadow-md"
                                : isDark
                                    ? "text-white/60"
                                    : "text-gray-600"
                            }`}
                    >
                        <Package className="w-4 h-4" />
                        Ürünler
                    </button>
                </div>
            </header>

            {/* Content */}
            <div className="px-4 py-4">
                {loading ? (
                    <div className="flex items-center justify-center py-16">
                        <Loader2 className={`w-8 h-8 animate-spin ${isDark ? "text-white/50" : "text-gray-400"}`} />
                    </div>
                ) : error ? (
                    <div className={`flex flex-col items-center justify-center py-16
                                    ${isDark ? "text-white/40" : "text-gray-400"}`}>
                        <p className="text-lg font-medium">{error}</p>
                    </div>
                ) : favorites.length === 0 ? (
                    <div className={`flex flex-col items-center justify-center py-16
                                    ${isDark ? "text-white/40" : "text-gray-400"}`}>
                        <Heart className="w-16 h-16 mb-4 opacity-50" />
                        <p className="text-lg font-medium">
                            {activeTab === "stores" ? "Henüz favori mekan yok" : "Henüz favori ürün yok"}
                        </p>
                        <Link
                            href="/kesfet"
                            className="mt-4 px-6 py-2 bg-emerald-500 text-white rounded-full text-sm font-semibold"
                        >
                            Keşfet
                        </Link>
                    </div>
                ) : activeTab === "stores" ? (
                    <div className="space-y-3">
                        {favorites.map((item) => (
                            <div
                                key={item.id}
                                className={`flex items-center gap-4 p-4 rounded-2xl transition-all duration-300
                                           ${isDark
                                        ? "bg-white/5 hover:bg-white/10 border border-white/5"
                                        : "bg-white hover:shadow-lg border border-gray-100"}`}
                            >
                                <div className="relative w-20 h-20 rounded-xl overflow-hidden bg-gray-200 flex-shrink-0">
                                    {item.image && (
                                        <Image src={item.image} alt={item.name} fill className="object-cover" />
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className={`font-semibold truncate ${isDark ? "text-white" : "text-gray-900"}`}>
                                        {item.name}
                                    </h3>
                                    <p className={`text-xs mb-1 ${isDark ? "text-white/40" : "text-gray-400"}`}>
                                        {item.category}
                                    </p>
                                    {item.rating && (
                                        <div className="flex items-center gap-1 mb-1">
                                            <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                                            <span className={`text-sm font-medium ${isDark ? "text-white" : "text-gray-900"}`}>
                                                {item.rating}
                                            </span>
                                            {item.reviewCount && (
                                                <span className={`text-xs ${isDark ? "text-white/40" : "text-gray-400"}`}>
                                                    ({item.reviewCount})
                                                </span>
                                            )}
                                        </div>
                                    )}
                                    <div className={`flex items-center gap-3 text-xs ${isDark ? "text-white/50" : "text-gray-500"}`}>
                                        {item.distance && (
                                            <span className="flex items-center gap-1">
                                                <MapPin className="w-3 h-3" />
                                                {item.distance}
                                            </span>
                                        )}
                                        {item.deliveryTime && (
                                            <span className="flex items-center gap-1">
                                                <Clock className="w-3 h-3" />
                                                {item.deliveryTime}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <button
                                    onClick={() => removeFavorite(item.itemId)}
                                    className={`p-2 rounded-full transition-colors
                                              ${isDark ? "text-red-400 hover:bg-red-500/20" : "text-red-500 hover:bg-red-50"}`}
                                >
                                    <Trash2 className="w-5 h-5" />
                                </button>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="grid grid-cols-2 gap-3">
                        {favorites.map((item) => (
                            <div
                                key={item.id}
                                className={`rounded-2xl overflow-hidden transition-all duration-300
                                           ${isDark
                                        ? "bg-white/5 hover:bg-white/10 border border-white/5"
                                        : "bg-white hover:shadow-lg border border-gray-100"}`}
                            >
                                <div className="relative aspect-square bg-gray-200">
                                    {item.image && (
                                        <Image src={item.image} alt={item.name} fill className="object-cover" />
                                    )}
                                    <button
                                        onClick={() => removeFavorite(item.itemId)}
                                        className="absolute top-2 right-2 p-1.5 rounded-full bg-red-500 text-white"
                                    >
                                        <Heart className="w-4 h-4 fill-current" />
                                    </button>
                                </div>
                                <div className="p-3">
                                    <h3 className={`font-medium text-sm truncate ${isDark ? "text-white" : "text-gray-900"}`}>
                                        {item.name}
                                    </h3>
                                    {item.storeName && (
                                        <p className={`text-xs truncate ${isDark ? "text-white/40" : "text-gray-400"}`}>
                                            {item.storeName}
                                        </p>
                                    )}
                                    <div className="flex items-center justify-between mt-2">
                                        <div className="flex items-center gap-1.5">
                                            {item.price && (
                                                <span className={`font-bold text-sm ${isDark ? "text-white" : "text-gray-900"}`}>
                                                    ₺{item.price}
                                                </span>
                                            )}
                                            {item.originalPrice && (
                                                <span className="text-xs text-gray-400 line-through">
                                                    ₺{item.originalPrice}
                                                </span>
                                            )}
                                        </div>
                                        <button className="p-1.5 rounded-full bg-emerald-500 text-white">
                                            <ShoppingCart className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
