"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useTheme } from "./ThemeProvider";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { Star, MapPin, Clock, Heart, Bookmark, TrendingUp, Loader2, Search } from "lucide-react";
import { useInView } from "framer-motion";
import { toR2ProxyUrl } from "@/lib/publicImage";

interface DiscoveryBusiness {
    id: string;
    name: string;
    slug: string;
    logoUrl?: string;
    coverImage?: string;
    category: string;
    categoryLabel?: string;
    rating?: number;
    reviewCount?: number;
    distance?: number;
    deliveryTime?: string;
    city?: string;
    district?: string;
    tags?: string[];
    isFeatured?: boolean;
    isPromoted?: boolean;
    isTrending?: boolean;
}

interface DiscoveryFeedProps {
    category?: string;
    searchQuery?: string;
    userLat?: number;
    userLng?: number;
    viewMode: "feed" | "grid";
}

interface BusinessCardProps {
    business: DiscoveryBusiness;
    index: number;
    viewMode: "feed" | "grid";
}

function BusinessCard({ business, index, viewMode }: BusinessCardProps) {
    const { theme } = useTheme();
    const isDark = theme === "dark";
    const [isLiked, setIsLiked] = useState(false);
    const [isSaved, setIsSaved] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    const isInView = useInView(ref, { once: true, margin: "-100px" });

    const imageUrl =
        business.coverImage ||
        business.logoUrl ||
        "https://images.unsplash.com/photo-1514933651103-005eec06c04b?q=80&w=1200&auto=format&fit=crop";
    const isFeatured = business.isFeatured || index < 2;

    return (
        <motion.div
            ref={ref}
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
            transition={{ delay: index * 0.05, duration: 0.4, ease: "easeOut" }}
            className={`relative rounded-2xl overflow-hidden
                       transition-all duration-500 ease-out group
                       ${isDark
                    ? "bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20"
                    : "bg-white hover:bg-gray-50 border border-gray-100 hover:border-gray-200 shadow-sm hover:shadow-xl"}
                       ${viewMode === "feed" ? "mb-4" : ""}`}
        >
            <Link href={`/${business.slug}`} className="block">
                <div className={`relative overflow-hidden ${isFeatured ? "aspect-[4/3]" : "aspect-square"}`}>
                    <Image
                        src={toR2ProxyUrl(imageUrl)}
                        alt={business.name}
                        fill
                        className="object-cover transition-transform duration-700 group-hover:scale-110"
                    />

                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent 
                                   opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                    {business.isTrending && (
                        <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2 py-1 rounded-full
                                       bg-gradient-to-r from-emerald-500 to-teal-600 text-white backdrop-blur-md">
                            <TrendingUp className="w-3 h-3" />
                            <span className="text-[10px] font-bold uppercase tracking-wider">Trending</span>
                        </div>
                    )}

                    {business.tags && business.tags.length > 0 && (
                        <div className="absolute top-3 right-3 flex gap-1.5">
                            {business.tags.slice(0, 2).map((tag) => (
                                <span
                                    key={tag}
                                    className={`px-2 py-1 rounded-md text-[10px] font-semibold uppercase tracking-wide
                                               backdrop-blur-md
                                               ${isDark
                                                ? "bg-black/40 text-white/90"
                                                : "bg-white/80 text-gray-700"}`}
                                >
                                    {tag}
                                </span>
                            ))}
                        </div>
                    )}

                    <div className="absolute bottom-3 right-3 flex gap-2 
                                   opacity-0 group-hover:opacity-100 
                                   translate-y-2 group-hover:translate-y-0
                                   transition-all duration-300">
                        <button
                            onClick={(e) => { e.preventDefault(); setIsLiked(!isLiked); }}
                            className={`p-2 rounded-full backdrop-blur-md transition-all duration-200
                                       ${isLiked
                                    ? "bg-red-500 text-white"
                                    : "bg-white/20 text-white hover:bg-white/30"}`}
                        >
                            <Heart className={`w-4 h-4 ${isLiked ? "fill-current" : ""}`} />
                        </button>
                        <button
                            onClick={(e) => { e.preventDefault(); setIsSaved(!isSaved); }}
                            className={`p-2 rounded-full backdrop-blur-md transition-all duration-200
                                       ${isSaved
                                    ? "bg-blue-500 text-white"
                                    : "bg-white/20 text-white hover:bg-white/30"}`}
                        >
                            <Bookmark className={`w-4 h-4 ${isSaved ? "fill-current" : ""}`} />
                        </button>
                    </div>
                </div>

                <div className="p-4">
                    <p className={`text-xs font-medium mb-1 
                                  ${isDark ? "text-white/50" : "text-gray-500"}`}>
                        {business.categoryLabel || business.category}
                    </p>
                    <h3 className={`text-base font-bold mb-2 
                                   ${isDark ? "text-white" : "text-gray-900"}`}>
                        {business.name}
                    </h3>

                    {business.rating && (
                        <div className="flex items-center gap-2 mb-3">
                            <div className="flex items-center gap-1">
                                <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                                <span className={`text-sm font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>
                                    {business.rating.toFixed(1)}
                                </span>
                            </div>
                            {business.reviewCount && (
                                <span className={`text-xs ${isDark ? "text-white/40" : "text-gray-400"}`}>
                                    ({business.reviewCount} değerlendirme)
                                </span>
                            )}
                        </div>
                    )}

                    <div className={`flex items-center gap-3 text-xs 
                                    ${isDark ? "text-white/60" : "text-gray-600"}`}>
                        {business.distance && (
                            <div className="flex items-center gap-1">
                                <MapPin className="w-3.5 h-3.5" />
                                {business.distance.toFixed(1)} km
                            </div>
                        )}
                        {business.deliveryTime && (
                            <div className="flex items-center gap-1">
                                <Clock className="w-3.5 h-3.5" />
                                {business.deliveryTime}
                            </div>
                        )}
                        {business.city && !business.distance && (
                            <div className="flex items-center gap-1">
                                <MapPin className="w-3.5 h-3.5" />
                                {business.district || business.city}
                            </div>
                        )}
                    </div>
                </div>
            </Link>
        </motion.div>
    );
}

function BusinessCardSkeleton({ viewMode }: { viewMode: "feed" | "grid" }) {
    const { theme } = useTheme();
    const isDark = theme === "dark";

    return (
        <div className={`rounded-2xl overflow-hidden animate-pulse
                        ${isDark ? "bg-white/5" : "bg-gray-100"}
                        ${viewMode === "feed" ? "mb-4" : ""}`}>
            <div className="aspect-square bg-gradient-to-br from-white/10 to-white/5" />
            <div className="p-4 space-y-3">
                <div className={`h-3 w-20 rounded ${isDark ? "bg-white/10" : "bg-gray-200"}`} />
                <div className={`h-5 w-40 rounded ${isDark ? "bg-white/10" : "bg-gray-200"}`} />
                <div className={`h-3 w-28 rounded ${isDark ? "bg-white/10" : "bg-gray-200"}`} />
            </div>
        </div>
    );
}

export default function DiscoveryFeed({ category, searchQuery, userLat, userLng, viewMode }: DiscoveryFeedProps) {
    const { theme } = useTheme();
    const isDark = theme === "dark";
    const [businesses, setBusinesses] = useState<DiscoveryBusiness[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [isLoadingMore, setIsLoadingMore] = useState(false);

    const fetchBusinesses = useCallback(async (pageNum = 1, append = false) => {
        try {
            if (pageNum === 1) setLoading(true);
            else setIsLoadingMore(true);

            const normalizedCategory = category && category !== "all" ? category : undefined;
            const normalizedQuery = searchQuery?.trim() ? searchQuery.trim() : undefined;

            if (normalizedQuery) {
                const params = new URLSearchParams({ q: normalizedQuery });
                if (userLat && userLng) {
                    params.set("lat", userLat.toString());
                    params.set("lng", userLng.toString());
                }

                const response = await fetch(`/api/kesfet/search?${params.toString()}`);
                const data = await response.json();

                if (data.success && data.businesses) {
                    let newBusinesses = data.businesses as DiscoveryBusiness[];
                    if (normalizedCategory) {
                        const catLower = normalizedCategory.toLowerCase();
                        newBusinesses = newBusinesses.filter((b) => (b.category || "").toLowerCase().includes(catLower));
                    }
                    setBusinesses(newBusinesses);
                    setHasMore(false);
                } else {
                    setError("Veriler yüklenemedi");
                }
            } else {
                const params = new URLSearchParams({ page: pageNum.toString(), limit: "12" });

                if (normalizedCategory) {
                    params.set("category", normalizedCategory);
                }

                if (userLat && userLng) {
                    params.set("lat", userLat.toString());
                    params.set("lng", userLng.toString());
                }

                const response = await fetch(`/api/kesfet?${params.toString()}`);
                const data = await response.json();

                if (data.success && data.businesses) {
                    const newBusinesses = data.businesses as DiscoveryBusiness[];
                    if (append) setBusinesses((prev) => [...prev, ...newBusinesses]);
                    else setBusinesses(newBusinesses);
                    setHasMore(newBusinesses.length === 12);
                } else {
                    setError("Veriler yüklenemedi");
                }
            }
        } catch (err) {
            setError("Bağlantı hatası");
            console.error(err);
        } finally {
            setLoading(false);
            setIsLoadingMore(false);
        }
    }, [category, searchQuery, userLat, userLng]);

    useEffect(() => {
        setPage(1);
        setBusinesses([]);
        setError(null);
        setHasMore(true);
        fetchBusinesses(1, false);
    }, [category, searchQuery, userLat, userLng, fetchBusinesses]);

    const loadMore = () => {
        if (!isLoadingMore && hasMore) {
            const nextPage = page + 1;
            setPage(nextPage);
            fetchBusinesses(nextPage, true);
        }
    };

    return (
        <div className="px-4 py-6">
            {loading ? (
                <div className={`grid ${viewMode === "feed" ? "grid-cols-1" : "grid-cols-2 md:grid-cols-3 lg:grid-cols-4"} gap-3 md:gap-4`}>
                    {Array.from({ length: 6 }).map((_, i) => (
                        <BusinessCardSkeleton key={i} viewMode={viewMode} />
                    ))}
                </div>
            ) : error ? (
                <div className={`text-center py-12 rounded-2xl
                                ${isDark ? "bg-white/5" : "bg-white"}`}>
                    <p className={`text-sm mb-3 ${isDark ? "text-white/50" : "text-gray-500"}`}>
                        {error}
                    </p>
                    <button
                        onClick={() => fetchBusinesses()}
                        className="px-6 py-2.5 bg-emerald-500 text-white rounded-full text-sm font-semibold
                                       hover:bg-emerald-600 transition-colors"
                    >
                        Tekrar Dene
                    </button>
                </div>
            ) : businesses.length === 0 ? (
                <div className={`text-center py-16 rounded-2xl
                                ${isDark ? "bg-white/5" : "bg-white"}`}>
                    <div className={`w-20 h-20 mx-auto mb-4 rounded-2xl flex items-center justify-center
                                       ${isDark ? "bg-white/10" : "bg-gray-100"}`}>
                        <Search className={`w-10 h-10 ${isDark ? "text-white/30" : "text-gray-300"}`} />
                    </div>
                    <h3 className={`text-lg font-semibold mb-2 ${isDark ? "text-white" : "text-gray-900"}`}>
                        Sonuç Bulunamadı
                    </h3>
                    <p className={`text-sm mb-4 ${isDark ? "text-white/50" : "text-gray-500"}`}>
                        Farklı bir arama terimi deneyin veya filtreleri değiştirin
                    </p>
                    <button
                        onClick={() => window.location.reload()}
                        className="px-6 py-2.5 bg-emerald-500 text-white rounded-full text-sm font-semibold
                                       hover:bg-emerald-600 transition-colors"
                    >
                        Sayfayı Yenile
                    </button>
                </div>
            ) : (
                <>
                    <div className={`grid ${viewMode === "feed" ? "grid-cols-1" : "grid-cols-2 md:grid-cols-3 lg:grid-cols-4"} gap-3 md:gap-4`}>
                        {businesses.map((business, index) => (
                            <BusinessCard
                                key={business.id}
                                business={business}
                                index={index}
                                viewMode={viewMode}
                            />
                        ))}
                    </div>

                    {hasMore && (
                        <div className="mt-8 text-center">
                            <button
                                onClick={loadMore}
                                disabled={isLoadingMore}
                                className={`px-8 py-3 rounded-2xl font-semibold transition-all duration-300
                                               ${isDark
                                                    ? "bg-white/10 hover:bg-white/20 text-white disabled:opacity-50"
                                                    : "bg-gray-100 hover:bg-gray-200 text-gray-900 disabled:opacity-50"
                                               }`}
                            >
                                {isLoadingMore ? (
                                    <span className="flex items-center gap-2">
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        Yükleniyor...
                                    </span>
                                ) : (
                                    "Daha Fazla Yükle"
                                )}
                            </button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
