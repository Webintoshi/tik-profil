"use client";

import { useState, useEffect } from "react";
import {
    BarChart3,
    Home,
    Building2,
    Trees,
    Users,
    TrendingUp,
    Loader2,
    CheckCircle2,
    XCircle,
    Clock
} from "lucide-react";
import { motion } from "framer-motion";
import { useTheme } from "@/components/panel/ThemeProvider";
import clsx from "clsx";
import { formatPrice } from "@/types/emlak";

interface AnalyticsData {
    totalListings: number;
    activeListings: number;
    soldListings: number;
    inactiveListings: number;
    totalConsultants: number;
    byPropertyType: {
        residential: number;
        commercial: number;
        land: number;
    };
    byListingType: {
        sale: number;
        rent: number;
    };
    averagePrice: {
        sale: number;
        rent: number;
    };
    recentListings: {
        id: string;
        title: string;
        price: number;
        currency: string;
        propertyType: string;
        listingType: string;
        status: string;
        createdAt: string;
    }[];
    topConsultants: {
        name: string;
        count: number;
    }[];
}

export default function EmlakAnalyticsPage() {
    const { isDark } = useTheme();
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<AnalyticsData | null>(null);

    useEffect(() => {
        loadAnalytics();
    }, []);

    const loadAnalytics = async () => {
        try {
            const res = await fetch('/api/emlak/analytics');
            const result = await res.json();
            if (result.success) {
                setData(result.analytics);
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
                <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
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

    const propertyTypeTotal = data.byPropertyType.residential + data.byPropertyType.commercial + data.byPropertyType.land;

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-violet-600 rounded-xl flex items-center justify-center">
                    <BarChart3 className="w-6 h-6 text-white" />
                </div>
                <div>
                    <h1 className={clsx("text-2xl font-bold", isDark ? "text-white" : "text-gray-900")}>
                        Emlak Analitiği
                    </h1>
                    <p className={clsx("text-sm", isDark ? "text-gray-400" : "text-gray-500")}>
                        İlan ve danışman istatistikleri
                    </p>
                </div>
            </div>

            {/* Main Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    title="Toplam İlan"
                    value={data.totalListings}
                    subtitle={`${data.byListingType.sale} Satılık, ${data.byListingType.rent} Kiralık`}
                    icon={Home}
                    color="bg-gradient-to-br from-blue-500 to-blue-600"
                />
                <StatCard
                    title="Aktif İlan"
                    value={data.activeListings}
                    subtitle={`${data.totalListings > 0 ? Math.round((data.activeListings / data.totalListings) * 100) : 0}% aktif`}
                    icon={CheckCircle2}
                    color="bg-gradient-to-br from-green-500 to-emerald-600"
                />
                <StatCard
                    title="Satılan İlan"
                    value={data.soldListings}
                    icon={TrendingUp}
                    color="bg-gradient-to-br from-orange-500 to-amber-600"
                />
                <StatCard
                    title="Danışman Sayısı"
                    value={data.totalConsultants}
                    icon={Users}
                    color="bg-gradient-to-br from-purple-500 to-violet-600"
                />
            </div>

            {/* Second Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Property Type Distribution */}
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
                        Emlak Türü Dağılımı
                    </h3>
                    <div className="space-y-4">
                        <div>
                            <div className="flex items-center justify-between mb-1">
                                <div className="flex items-center gap-2">
                                    <Home className="w-4 h-4 text-blue-500" />
                                    <span className={isDark ? "text-gray-300" : "text-gray-600"}>Konut</span>
                                </div>
                                <span className={clsx("font-medium", isDark ? "text-white" : "text-gray-900")}>
                                    {data.byPropertyType.residential}
                                </span>
                            </div>
                            <div className={clsx("h-2 rounded-full", isDark ? "bg-gray-700" : "bg-gray-100")}>
                                <div
                                    className="h-full bg-blue-500 rounded-full transition-all"
                                    style={{ width: `${propertyTypeTotal > 0 ? (data.byPropertyType.residential / propertyTypeTotal) * 100 : 0}%` }}
                                />
                            </div>
                        </div>
                        <div>
                            <div className="flex items-center justify-between mb-1">
                                <div className="flex items-center gap-2">
                                    <Building2 className="w-4 h-4 text-orange-500" />
                                    <span className={isDark ? "text-gray-300" : "text-gray-600"}>Ticari</span>
                                </div>
                                <span className={clsx("font-medium", isDark ? "text-white" : "text-gray-900")}>
                                    {data.byPropertyType.commercial}
                                </span>
                            </div>
                            <div className={clsx("h-2 rounded-full", isDark ? "bg-gray-700" : "bg-gray-100")}>
                                <div
                                    className="h-full bg-orange-500 rounded-full transition-all"
                                    style={{ width: `${propertyTypeTotal > 0 ? (data.byPropertyType.commercial / propertyTypeTotal) * 100 : 0}%` }}
                                />
                            </div>
                        </div>
                        <div>
                            <div className="flex items-center justify-between mb-1">
                                <div className="flex items-center gap-2">
                                    <Trees className="w-4 h-4 text-green-500" />
                                    <span className={isDark ? "text-gray-300" : "text-gray-600"}>Arsa</span>
                                </div>
                                <span className={clsx("font-medium", isDark ? "text-white" : "text-gray-900")}>
                                    {data.byPropertyType.land}
                                </span>
                            </div>
                            <div className={clsx("h-2 rounded-full", isDark ? "bg-gray-700" : "bg-gray-100")}>
                                <div
                                    className="h-full bg-green-500 rounded-full transition-all"
                                    style={{ width: `${propertyTypeTotal > 0 ? (data.byPropertyType.land / propertyTypeTotal) * 100 : 0}%` }}
                                />
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* Average Prices */}
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
                        Ortalama Fiyatlar
                    </h3>
                    <div className="space-y-4">
                        <div className={clsx("p-4 rounded-xl", isDark ? "bg-gray-700" : "bg-gray-50")}>
                            <p className={clsx("text-sm", isDark ? "text-gray-400" : "text-gray-500")}>
                                Satılık Ortalama
                            </p>
                            <p className={clsx("text-2xl font-bold mt-1", isDark ? "text-white" : "text-gray-900")}>
                                {formatPrice(data.averagePrice.sale, 'TRY')}
                            </p>
                        </div>
                        <div className={clsx("p-4 rounded-xl", isDark ? "bg-gray-700" : "bg-gray-50")}>
                            <p className={clsx("text-sm", isDark ? "text-gray-400" : "text-gray-500")}>
                                Kiralık Ortalama
                            </p>
                            <p className={clsx("text-2xl font-bold mt-1", isDark ? "text-white" : "text-gray-900")}>
                                {formatPrice(data.averagePrice.rent, 'TRY')}/ay
                            </p>
                        </div>
                    </div>
                </motion.div>
            </div>

            {/* Third Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Top Consultants */}
                {data.topConsultants.length > 0 && (
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
                        <h3 className={clsx("font-semibold mb-4", isDark ? "text-white" : "text-gray-900")}>
                            En Çok İlana Sahip Danışmanlar
                        </h3>
                        <div className="space-y-3">
                            {data.topConsultants.map((consultant, idx) => (
                                <div key={idx} className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className={clsx(
                                            "w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm",
                                            idx === 0 ? "bg-yellow-100 text-yellow-600" :
                                                idx === 1 ? "bg-gray-100 text-gray-600" :
                                                    idx === 2 ? "bg-orange-100 text-orange-600" :
                                                        isDark ? "bg-gray-700 text-gray-400" : "bg-gray-100 text-gray-500"
                                        )}>
                                            {idx + 1}
                                        </div>
                                        <span className={isDark ? "text-gray-300" : "text-gray-700"}>
                                            {consultant.name}
                                        </span>
                                    </div>
                                    <span className={clsx(
                                        "px-3 py-1 rounded-full text-sm font-medium",
                                        isDark ? "bg-purple-900/50 text-purple-300" : "bg-purple-100 text-purple-600"
                                    )}>
                                        {consultant.count} ilan
                                    </span>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                )}

                {/* Recent Listings */}
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
                        <Clock className="w-4 h-4 text-purple-500" />
                        Son 7 Günde Eklenenler
                    </h3>
                    {data.recentListings.length === 0 ? (
                        <p className={clsx("text-sm", isDark ? "text-gray-500" : "text-gray-400")}>
                            Son 7 günde eklenen ilan yok
                        </p>
                    ) : (
                        <div className="space-y-3">
                            {data.recentListings.map((listing) => (
                                <div
                                    key={listing.id}
                                    className={clsx(
                                        "p-3 rounded-xl flex items-center justify-between",
                                        isDark ? "bg-gray-700" : "bg-gray-50"
                                    )}
                                >
                                    <div>
                                        <p className={clsx("font-medium line-clamp-1", isDark ? "text-white" : "text-gray-900")}>
                                            {listing.title}
                                        </p>
                                        <p className={clsx("text-sm", isDark ? "text-gray-400" : "text-gray-500")}>
                                            {listing.listingType === 'sale' ? 'Satılık' : 'Kiralık'} •{' '}
                                            {listing.propertyType === 'residential' ? 'Konut' :
                                                listing.propertyType === 'commercial' ? 'Ticari' : 'Arsa'}
                                        </p>
                                    </div>
                                    <span className="text-purple-500 font-semibold whitespace-nowrap">
                                        {formatPrice(listing.price, listing.currency)}
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
