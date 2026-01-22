"use client";

import { useState, useEffect } from "react";
import {
    BarChart3,
    Sparkles,
    Clock,
    Users,
    TrendingUp,
    Loader2,
    CheckCircle2,
    Scissors,
    Heart
} from "lucide-react";
import { motion } from "framer-motion";
import { useTheme } from "@/components/panel/ThemeProvider";
import clsx from "clsx";

interface AnalyticsData {
    stats: {
        totalCategories: number;
        activeCategories: number;
        totalServices: number;
        activeServices: number;
        totalStaff: number;
        activeStaff: number;
    };
    priceStats: {
        avgPrice: number;
        minPrice: number;
        maxPrice: number;
        currency: string;
    };
    durationStats: {
        avgDuration: number;
    };
    servicesByCategory: {
        id: string;
        name: string;
        icon: string;
        count: number;
        isActive: boolean;
    }[];
    topServices: {
        id: string;
        name: string;
        price: number;
        currency: string;
        duration: number;
        categoryName: string;
    }[];
    recentServices: {
        id: string;
        name: string;
        price: number;
        currency: string;
        isActive: boolean;
        createdAt: string;
    }[];
}

function formatPrice(price: number, currency: string = 'TRY'): string {
    const symbols: Record<string, string> = { TRY: '₺', USD: '$', EUR: '€' };
    return `${symbols[currency] || '₺'}${price.toLocaleString('tr-TR')}`;
}

function formatDuration(minutes: number): string {
    if (minutes < 60) return `${minutes} dk`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours} sa ${mins} dk` : `${hours} saat`;
}

export default function BeautyAnalyticsPage() {
    const { isDark } = useTheme();
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<AnalyticsData | null>(null);

    useEffect(() => {
        loadAnalytics();
    }, []);

    const loadAnalytics = async () => {
        try {
            const res = await fetch('/api/beauty/analytics');
            const result = await res.json();
            if (result.success) {
                setData(result.data);
            }
        } catch (error) {
            console.error('Analytics load error:', error);
        } finally {
            setLoading(false);
        }
    };

    const StatCard = ({
        title,
        value,
        subtitle,
        icon: Icon,
        color,
    }: {
        title: string;
        value: string | number;
        subtitle?: string;
        icon: React.ElementType;
        color: string;
    }) => (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={clsx(
                "p-6 rounded-2xl",
                isDark ? "bg-gray-800" : "bg-white",
                "shadow-sm"
            )}
        >
            <div className="flex items-start justify-between">
                <div>
                    <p className={clsx("text-sm", isDark ? "text-gray-400" : "text-gray-500")}>
                        {title}
                    </p>
                    <p className={clsx("text-3xl font-bold mt-1", isDark ? "text-white" : "text-gray-900")}>
                        {value}
                    </p>
                    {subtitle && (
                        <p className={clsx("text-xs mt-1", isDark ? "text-gray-500" : "text-gray-400")}>
                            {subtitle}
                        </p>
                    )}
                </div>
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
                    <Icon className="w-6 h-6 text-white" />
                </div>
            </div>
        </motion.div>
    );

    if (loading) {
        return (
            <div className="min-h-[400px] flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-rose-500" />
            </div>
        );
    }

    if (!data) {
        return (
            <div className="p-6 text-center">
                <p className={isDark ? "text-gray-400" : "text-gray-500"}>
                    Veriler yüklenemedi
                </p>
            </div>
        );
    }

    const categoryTotal = data.servicesByCategory.reduce((sum, cat) => sum + cat.count, 0);

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-rose-500 to-pink-600 rounded-xl flex items-center justify-center">
                    <BarChart3 className="w-6 h-6 text-white" />
                </div>
                <div>
                    <h1 className={clsx("text-2xl font-bold", isDark ? "text-white" : "text-gray-900")}>
                        Güzellik Analitiği
                    </h1>
                    <p className={clsx("text-sm", isDark ? "text-gray-400" : "text-gray-500")}>
                        Hizmet ve kategori istatistikleri
                    </p>
                </div>
            </div>

            {/* Main Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    title="Toplam Hizmet"
                    value={data.stats.totalServices}
                    subtitle={`${data.stats.activeServices} aktif`}
                    icon={Sparkles}
                    color="bg-gradient-to-br from-rose-500 to-pink-600"
                />
                <StatCard
                    title="Kategori"
                    value={data.stats.totalCategories}
                    subtitle={`${data.stats.activeCategories} aktif`}
                    icon={Heart}
                    color="bg-gradient-to-br from-pink-500 to-fuchsia-600"
                />
                <StatCard
                    title="Personel"
                    value={data.stats.totalStaff}
                    subtitle={`${data.stats.activeStaff} aktif`}
                    icon={Users}
                    color="bg-gradient-to-br from-purple-500 to-violet-600"
                />
                <StatCard
                    title="Ortalama Süre"
                    value={formatDuration(data.durationStats.avgDuration)}
                    icon={Clock}
                    color="bg-gradient-to-br from-amber-500 to-orange-600"
                />
            </div>

            {/* Second Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Services by Category */}
                {data.servicesByCategory.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className={clsx(
                            "p-6 rounded-2xl",
                            isDark ? "bg-gray-800" : "bg-white",
                            "shadow-sm"
                        )}
                    >
                        <h3 className={clsx("font-semibold mb-4", isDark ? "text-white" : "text-gray-900")}>
                            Kategoriye Göre Hizmetler
                        </h3>
                        <div className="space-y-4">
                            {data.servicesByCategory.slice(0, 5).map((cat, idx) => (
                                <div key={cat.id}>
                                    <div className="flex items-center justify-between mb-1">
                                        <div className="flex items-center gap-2">
                                            <span className="text-lg">{cat.icon}</span>
                                            <span className={isDark ? "text-gray-300" : "text-gray-600"}>
                                                {cat.name}
                                            </span>
                                        </div>
                                        <span className={clsx("font-medium", isDark ? "text-white" : "text-gray-900")}>
                                            {cat.count}
                                        </span>
                                    </div>
                                    <div className={clsx("h-2 rounded-full", isDark ? "bg-gray-700" : "bg-gray-100")}>
                                        <div
                                            className="h-full bg-gradient-to-r from-rose-500 to-pink-500 rounded-full transition-all"
                                            style={{ width: `${categoryTotal > 0 ? (cat.count / categoryTotal) * 100 : 0}%` }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                )}

                {/* Price Statistics */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className={clsx(
                        "p-6 rounded-2xl",
                        isDark ? "bg-gray-800" : "bg-white",
                        "shadow-sm"
                    )}
                >
                    <h3 className={clsx("font-semibold mb-4", isDark ? "text-white" : "text-gray-900")}>
                        Fiyat İstatistikleri
                    </h3>
                    <div className="space-y-4">
                        <div className={clsx("p-4 rounded-xl", isDark ? "bg-gray-700" : "bg-rose-50")}>
                            <p className={clsx("text-sm", isDark ? "text-gray-400" : "text-rose-500")}>
                                Ortalama Fiyat
                            </p>
                            <p className={clsx("text-2xl font-bold mt-1", isDark ? "text-white" : "text-rose-600")}>
                                {formatPrice(data.priceStats.avgPrice, data.priceStats.currency)}
                            </p>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className={clsx("p-3 rounded-xl", isDark ? "bg-gray-700" : "bg-gray-50")}>
                                <p className={clsx("text-xs", isDark ? "text-gray-400" : "text-gray-500")}>
                                    En Düşük
                                </p>
                                <p className={clsx("text-lg font-bold", isDark ? "text-white" : "text-gray-900")}>
                                    {formatPrice(data.priceStats.minPrice, data.priceStats.currency)}
                                </p>
                            </div>
                            <div className={clsx("p-3 rounded-xl", isDark ? "bg-gray-700" : "bg-gray-50")}>
                                <p className={clsx("text-xs", isDark ? "text-gray-400" : "text-gray-500")}>
                                    En Yüksek
                                </p>
                                <p className={clsx("text-lg font-bold", isDark ? "text-white" : "text-gray-900")}>
                                    {formatPrice(data.priceStats.maxPrice, data.priceStats.currency)}
                                </p>
                            </div>
                        </div>
                    </div>
                </motion.div>
            </div>

            {/* Third Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Top Services by Price */}
                {data.topServices.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className={clsx(
                            "p-6 rounded-2xl",
                            isDark ? "bg-gray-800" : "bg-white",
                            "shadow-sm"
                        )}
                    >
                        <h3 className={clsx("font-semibold mb-4 flex items-center gap-2", isDark ? "text-white" : "text-gray-900")}>
                            <TrendingUp className="w-4 h-4 text-rose-500" />
                            En Yüksek Fiyatlı Hizmetler
                        </h3>
                        <div className="space-y-3">
                            {data.topServices.map((service, idx) => (
                                <div key={service.id} className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className={clsx(
                                            "w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm",
                                            idx === 0 ? "bg-rose-100 text-rose-600" :
                                                idx === 1 ? "bg-pink-100 text-pink-600" :
                                                    idx === 2 ? "bg-fuchsia-100 text-fuchsia-600" :
                                                        isDark ? "bg-gray-700 text-gray-400" : "bg-gray-100 text-gray-500"
                                        )}>
                                            {idx + 1}
                                        </div>
                                        <div>
                                            <p className={clsx("font-medium text-sm", isDark ? "text-white" : "text-gray-900")}>
                                                {service.name}
                                            </p>
                                            <p className={clsx("text-xs", isDark ? "text-gray-500" : "text-gray-400")}>
                                                {service.categoryName} • {formatDuration(service.duration)}
                                            </p>
                                        </div>
                                    </div>
                                    <span className="text-rose-500 font-semibold">
                                        {formatPrice(service.price, service.currency)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                )}

                {/* Recent Services */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className={clsx(
                        "p-6 rounded-2xl",
                        isDark ? "bg-gray-800" : "bg-white",
                        "shadow-sm"
                    )}
                >
                    <h3 className={clsx("font-semibold mb-4 flex items-center gap-2", isDark ? "text-white" : "text-gray-900")}>
                        <Scissors className="w-4 h-4 text-rose-500" />
                        Son Eklenen Hizmetler
                    </h3>
                    {data.recentServices.length === 0 ? (
                        <p className={clsx("text-sm", isDark ? "text-gray-500" : "text-gray-400")}>
                            Henüz hizmet eklenmemiş
                        </p>
                    ) : (
                        <div className="space-y-3">
                            {data.recentServices.map((service) => (
                                <div
                                    key={service.id}
                                    className={clsx(
                                        "p-3 rounded-xl flex items-center justify-between",
                                        isDark ? "bg-gray-700" : "bg-gray-50"
                                    )}
                                >
                                    <div className="flex items-center gap-2">
                                        <div className={clsx(
                                            "w-2 h-2 rounded-full",
                                            service.isActive ? "bg-green-500" : "bg-gray-400"
                                        )} />
                                        <p className={clsx("font-medium line-clamp-1 text-sm", isDark ? "text-white" : "text-gray-900")}>
                                            {service.name}
                                        </p>
                                    </div>
                                    <span className="text-rose-500 font-semibold text-sm whitespace-nowrap">
                                        {formatPrice(service.price, service.currency)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </motion.div>
            </div>
        </div>
    );
}
