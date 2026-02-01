"use client";

import { useState, useEffect } from "react";
import { useTheme } from "@/components/explore/ThemeProvider";
import { useLocation } from "@/components/explore/LocationProvider";
import Image from "next/image";
import Link from "next/link";
import { Star, MapPin, Filter, Grid3X3, List, Loader2, Search, SlidersHorizontal } from "lucide-react";

interface Business {
    id: string;
    slug: string;
    name: string;
    coverImage: string | null;
    logoUrl: string | null;
    category: string;
    district: string | null;
    city: string | null;
    rating: number | null;
    reviewCount: number | null;
    distance: number | null;
}

export default function ExplorePage() {
    const { theme } = useTheme();
    const { lat, lng } = useLocation();
    const [businesses, setBusinesses] = useState<Business[]>([]);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
    const [searchQuery, setSearchQuery] = useState("");
    const [sortBy, setSortBy] = useState<"distance" | "rating" | "name">("name");
    const isDark = theme === "dark";

    useEffect(() => {
        async function fetchBusinesses() {
            try {
                setLoading(true);
                const params = new URLSearchParams({ limit: "100" });
                if (lat && lng) {
                    params.set("lat", lat.toString());
                    params.set("lng", lng.toString());
                }

                const response = await fetch(`/api/kesfet?${params.toString()}`);
                const data = await response.json();

                if (data.success && data.businesses) {
                    setBusinesses(data.businesses);
                }
            } catch (err) {
                console.error("Fetch error:", err);
            } finally {
                setLoading(false);
            }
        }

        fetchBusinesses();
    }, [lat, lng]);

    // Filter and sort
    const filteredBusinesses = businesses
        .filter((b) =>
            searchQuery === "" ||
            b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            b.category?.toLowerCase().includes(searchQuery.toLowerCase())
        )
        .sort((a, b) => {
            if (sortBy === "distance") return (a.distance || 999999) - (b.distance || 999999);
            if (sortBy === "rating") return (b.rating || 0) - (a.rating || 0);
            return a.name.localeCompare(b.name);
        });

    return (
        <div className={`min-h-screen ${isDark ? "bg-gray-950" : "bg-gray-50"}`}>
            {/* Page Header */}
            <div className="px-4 py-6">
                <h1 className={`text-2xl font-bold mb-2 ${isDark ? "text-white" : "text-gray-900"}`}>
                    Tüm İşletmeler
                </h1>
                <p className={`text-sm ${isDark ? "text-white/60" : "text-gray-600"}`}>
                    {businesses.length} işletme bulundu
                </p>
            </div>

            {/* Search & Filters */}
            <div className="px-4 pb-4 space-y-3">
                {/* Search */}
                <div className={`flex items-center gap-3 px-4 py-3 rounded-xl
                               ${isDark ? "bg-white/5 border border-white/10" : "bg-white border border-gray-200"}`}>
                    <Search className={`w-5 h-5 ${isDark ? "text-white/40" : "text-gray-400"}`} />
                    <input
                        type="text"
                        placeholder="İşletme ara..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className={`flex-1 bg-transparent outline-none text-sm
                                  ${isDark ? "text-white placeholder:text-white/40" : "text-gray-900 placeholder:text-gray-400"}`}
                    />
                </div>

                {/* Filters Row */}
                <div className="flex items-center gap-2">
                    {/* Sort */}
                    <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                        className={`px-3 py-2 rounded-lg text-xs font-medium
                                  ${isDark
                                ? "bg-white/5 text-white border border-white/10"
                                : "bg-white text-gray-700 border border-gray-200"}`}
                    >
                        <option value="name">İsme Göre</option>
                        <option value="rating">Puana Göre</option>
                        <option value="distance">Mesafeye Göre</option>
                    </select>

                    {/* View Mode Toggle */}
                    <div className={`flex rounded-lg overflow-hidden ml-auto
                                   ${isDark ? "bg-white/5" : "bg-gray-100"}`}>
                        <button
                            onClick={() => setViewMode("grid")}
                            className={`p-2 ${viewMode === "grid"
                                ? isDark ? "bg-white/20 text-white" : "bg-white text-gray-900 shadow-sm"
                                : isDark ? "text-white/50" : "text-gray-500"}`}
                        >
                            <Grid3X3 className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => setViewMode("list")}
                            className={`p-2 ${viewMode === "list"
                                ? isDark ? "bg-white/20 text-white" : "bg-white text-gray-900 shadow-sm"
                                : isDark ? "text-white/50" : "text-gray-500"}`}
                        >
                            <List className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Results */}
            <div className="px-4 pb-24">
                {loading ? (
                    <div className="flex justify-center py-12">
                        <Loader2 className={`w-8 h-8 animate-spin ${isDark ? "text-white/50" : "text-gray-400"}`} />
                    </div>
                ) : filteredBusinesses.length === 0 ? (
                    <div className="text-center py-12">
                        <p className={isDark ? "text-white/50" : "text-gray-500"}>
                            İşletme bulunamadı
                        </p>
                    </div>
                ) : viewMode === "grid" ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {filteredBusinesses.map((business) => (
                            <Link
                                key={business.id}
                                href={`/${business.slug}`}
                                className={`group rounded-2xl overflow-hidden
                                          ${isDark
                                        ? "bg-white/5 border border-white/10 hover:border-white/20"
                                        : "bg-white border border-gray-100 hover:shadow-lg"}`}
                            >
                                <div className="relative aspect-square">
                                    <Image
                                        src={business.coverImage || business.logoUrl || "https://images.unsplash.com/photo-1514933651103-005eec06c04b?q=80&w=1200&auto=format&fit=crop"}
                                        alt={business.name}
                                        fill
                                        className="object-cover"
                                    />
                                </div>
                                <div className="p-3">
                                    <h3 className={`font-semibold text-sm truncate
                                                  ${isDark ? "text-white" : "text-gray-900"}`}>
                                        {business.name}
                                    </h3>
                                    <p className={`text-xs mt-1 ${isDark ? "text-white/50" : "text-gray-500"}`}>
                                        {business.category}
                                    </p>
                                    {business.rating && (
                                        <div className="flex items-center gap-1 mt-2">
                                            <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                                            <span className={`text-xs ${isDark ? "text-white/70" : "text-gray-600"}`}>
                                                {business.rating.toFixed(1)}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </Link>
                        ))}
                    </div>
                ) : (
                    <div className="space-y-3">
                        {filteredBusinesses.map((business) => (
                            <Link
                                key={business.id}
                                href={`/${business.slug}`}
                                className={`flex gap-4 p-3 rounded-xl
                                          ${isDark
                                        ? "bg-white/5 border border-white/10"
                                        : "bg-white border border-gray-100"}`}
                            >
                                <div className="relative w-20 h-20 rounded-xl overflow-hidden flex-shrink-0">
                                    <Image
                                        src={business.coverImage || business.logoUrl || "https://images.unsplash.com/photo-1514933651103-005eec06c04b?q=80&w=1200&auto=format&fit=crop"}
                                        alt={business.name}
                                        fill
                                        className="object-cover"
                                    />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className={`font-semibold truncate ${isDark ? "text-white" : "text-gray-900"}`}>
                                        {business.name}
                                    </h3>
                                    <p className={`text-sm mt-0.5 ${isDark ? "text-white/50" : "text-gray-500"}`}>
                                        {business.category}
                                    </p>
                                    <div className="flex items-center gap-3 mt-2">
                                        {business.rating && (
                                            <div className="flex items-center gap-1">
                                                <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                                                <span className={`text-xs ${isDark ? "text-white/70" : "text-gray-600"}`}>
                                                    {business.rating.toFixed(1)}
                                                </span>
                                            </div>
                                        )}
                                        {business.city && (
                                            <div className="flex items-center gap-1">
                                                <MapPin className={`w-3.5 h-3.5 ${isDark ? "text-white/40" : "text-gray-400"}`} />
                                                <span className={`text-xs ${isDark ? "text-white/50" : "text-gray-500"}`}>
                                                    {business.district || business.city}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
