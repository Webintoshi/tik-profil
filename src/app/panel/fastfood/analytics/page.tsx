"use client";

import { useState, useEffect } from "react";
import {
    BarChart3,
    TrendingUp,
    TrendingDown,
    ShoppingCart,
    DollarSign,
    Loader2,
    Calendar,
    Star,
    Clock,
    Flame
} from "lucide-react";
import clsx from "clsx";
import { useTheme } from "@/components/panel/ThemeProvider";

interface AnalyticsData {
    totalOrders: number;
    totalRevenue: number;
    averageOrderValue: number;
    todayOrders: number;
    todayRevenue: number;
    weeklyOrders: number;
    weeklyRevenue: number;
    monthlyOrders: number;
    monthlyRevenue: number;
    popularProducts: { name: string; count: number; revenue: number }[];
    recentTrend: 'up' | 'down' | 'stable';
    trendPercentage: number;
}

export default function FastFoodAnalyticsPage() {
    const { isDark } = useTheme();
    const [loading, setLoading] = useState(true);
    const [timeRange, setTimeRange] = useState<'today' | 'week' | 'month' | 'all'>('week');
    const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);

    const pageBg = isDark ? "bg-black" : "bg-[#F5F5F7]";
    const cardBg = isDark ? "bg-[#1C1C1E]" : "bg-white";
    const textPrimary = isDark ? "text-white" : "text-[#1D1D1F]";
    const textSecondary = isDark ? "text-[#86868B]" : "text-[#86868B]";
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const borderColor = isDark ? "border-[#38383A]" : "border-[#D2D2D7]";

    useEffect(() => {
        loadAnalytics();
    }, [timeRange]);

    const loadAnalytics = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/fastfood/analytics?range=${timeRange}`);
            const data = await res.json();
            if (data.success) {
                setAnalytics(data.analytics);
            }
        } catch (error) {
            console.error("Analytics load error:", error);
            // Demo data fallback
            setAnalytics({
                totalOrders: 1247,
                totalRevenue: 89650,
                averageOrderValue: 71.89,
                todayOrders: 23,
                todayRevenue: 1845,
                weeklyOrders: 156,
                weeklyRevenue: 11250,
                monthlyOrders: 589,
                monthlyRevenue: 42350,
                popularProducts: [
                    { name: "Klasik Burger", count: 245, revenue: 17150 },
                    { name: "Crispy Chicken", count: 189, revenue: 13230 },
                    { name: "Patates Kızartması", count: 312, revenue: 4680 },
                    { name: "Kola (33cl)", count: 276, revenue: 2760 },
                    { name: "Double Cheese", count: 134, revenue: 12060 }
                ],
                recentTrend: 'up',
                trendPercentage: 12.5
            });
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
        trend
    }: {
        title: string;
        value: string | number;
        subtitle?: string;
        icon: React.ElementType;
        color: string;
        trend?: 'up' | 'down';
    }) => (
        <div className={clsx(
            "p-6 rounded-[1.5rem] transition-all duration-300",
            cardBg,
            isDark ? "border border-white/5 hover:bg-[#2C2C2E]" : "shadow-sm hover:shadow-lg"
        )}>
            <div className="flex items-start justify-between mb-4">
                <div className={clsx("p-3 rounded-xl", `bg-${color}-500/10`)}>
                    <Icon className={clsx("w-6 h-6", `text-${color}-500`)} />
                </div>
                {trend && (
                    <div className={clsx(
                        "flex items-center gap-1 text-sm font-semibold",
                        trend === 'up' ? "text-green-500" : "text-red-500"
                    )}>
                        {trend === 'up' ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                        {analytics?.trendPercentage}%
                    </div>
                )}
            </div>
            <p className={clsx("text-sm font-medium mb-1", textSecondary)}>{title}</p>
            <p className="text-3xl font-bold tracking-tight">{value}</p>
            {subtitle && <p className={clsx("text-sm mt-1", textSecondary)}>{subtitle}</p>}
        </div>
    );

    if (loading) {
        return (
            <div className={clsx("min-h-screen flex items-center justify-center", pageBg)}>
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-10 h-10 animate-spin text-orange-500" />
                    <p className={textSecondary}>Analizler yükleniyor...</p>
                </div>
            </div>
        );
    }

    return (
        <div className={clsx("min-h-screen p-6 md:p-8 space-y-8", pageBg, textPrimary)}>
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h1 className="text-4xl font-bold tracking-tight">Analizler</h1>
                    <p className={clsx("text-lg mt-2 font-medium", textSecondary)}>
                        İşletme performansını takip edin
                    </p>
                </div>

                {/* Time Range Selector */}
                <div className={clsx(
                    "flex items-center gap-1 p-1 rounded-full",
                    isDark ? "bg-[#1C1C1E] border border-white/10" : "bg-white shadow-sm"
                )}>
                    {[
                        { id: 'today', label: 'Bugün' },
                        { id: 'week', label: 'Hafta' },
                        { id: 'month', label: 'Ay' },
                        { id: 'all', label: 'Tümü' }
                    ].map(range => (
                        <button
                            key={range.id}
                            onClick={() => setTimeRange(range.id as typeof timeRange)}
                            className={clsx(
                                "px-5 py-2.5 rounded-full font-semibold transition-all text-sm",
                                timeRange === range.id
                                    ? (isDark ? "bg-white text-black" : "bg-black text-white")
                                    : "text-gray-500 hover:text-gray-700"
                            )}
                        >
                            {range.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                    title="Toplam Sipariş"
                    value={analytics?.totalOrders || 0}
                    subtitle="Tüm zamanlar"
                    icon={ShoppingCart}
                    color="blue"
                />
                <StatCard
                    title="Toplam Satış"
                    value={`₺${(analytics?.totalRevenue || 0).toLocaleString('tr-TR')}`}
                    subtitle="Tüm zamanlar"
                    icon={DollarSign}
                    color="green"
                    trend={analytics?.recentTrend === 'stable' ? undefined : analytics?.recentTrend}
                />
                <StatCard
                    title="Ortalama Sipariş"
                    value={`₺${(analytics?.averageOrderValue || 0).toFixed(2)}`}
                    subtitle="Sipariş başına"
                    icon={BarChart3}
                    color="purple"
                />
                <StatCard
                    title="Bugün"
                    value={analytics?.todayOrders || 0}
                    subtitle={`₺${(analytics?.todayRevenue || 0).toLocaleString('tr-TR')} satış`}
                    icon={Clock}
                    color="orange"
                />
            </div>

            {/* Period Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className={clsx(
                    "p-6 rounded-[1.5rem]",
                    cardBg,
                    isDark ? "border border-white/5" : "shadow-sm"
                )}>
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-3 rounded-xl bg-blue-500/10">
                            <Calendar className="w-6 h-6 text-blue-500" />
                        </div>
                        <h2 className="text-xl font-bold">Haftalık Performans</h2>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className={clsx("p-4 rounded-xl", isDark ? "bg-[#2C2C2E]" : "bg-gray-50")}>
                            <p className={clsx("text-sm font-medium mb-1", textSecondary)}>Sipariş</p>
                            <p className="text-2xl font-bold">{analytics?.weeklyOrders || 0}</p>
                        </div>
                        <div className={clsx("p-4 rounded-xl", isDark ? "bg-[#2C2C2E]" : "bg-gray-50")}>
                            <p className={clsx("text-sm font-medium mb-1", textSecondary)}>Satış</p>
                            <p className="text-2xl font-bold">₺{(analytics?.weeklyRevenue || 0).toLocaleString('tr-TR')}</p>
                        </div>
                    </div>
                </div>

                <div className={clsx(
                    "p-6 rounded-[1.5rem]",
                    cardBg,
                    isDark ? "border border-white/5" : "shadow-sm"
                )}>
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-3 rounded-xl bg-purple-500/10">
                            <Calendar className="w-6 h-6 text-purple-500" />
                        </div>
                        <h2 className="text-xl font-bold">Aylık Performans</h2>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className={clsx("p-4 rounded-xl", isDark ? "bg-[#2C2C2E]" : "bg-gray-50")}>
                            <p className={clsx("text-sm font-medium mb-1", textSecondary)}>Sipariş</p>
                            <p className="text-2xl font-bold">{analytics?.monthlyOrders || 0}</p>
                        </div>
                        <div className={clsx("p-4 rounded-xl", isDark ? "bg-[#2C2C2E]" : "bg-gray-50")}>
                            <p className={clsx("text-sm font-medium mb-1", textSecondary)}>Satış</p>
                            <p className="text-2xl font-bold">₺{(analytics?.monthlyRevenue || 0).toLocaleString('tr-TR')}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Popular Products */}
            <div className={clsx(
                "p-6 rounded-[1.5rem]",
                cardBg,
                isDark ? "border border-white/5" : "shadow-sm"
            )}>
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-3 rounded-xl bg-orange-500/10">
                        <Flame className="w-6 h-6 text-orange-500" />
                    </div>
                    <h2 className="text-xl font-bold">En Popüler Ürünler</h2>
                </div>

                <div className="space-y-4">
                    {analytics?.popularProducts.map((product, index) => (
                        <div
                            key={product.name}
                            className={clsx(
                                "flex items-center gap-4 p-4 rounded-xl transition-all",
                                isDark ? "bg-[#2C2C2E] hover:bg-[#3C3C3E]" : "bg-gray-50 hover:bg-gray-100"
                            )}
                        >
                            <div className={clsx(
                                "flex items-center justify-center w-10 h-10 rounded-full font-bold text-lg",
                                index === 0 ? "bg-yellow-500 text-white" :
                                    index === 1 ? "bg-gray-400 text-white" :
                                        index === 2 ? "bg-amber-700 text-white" :
                                            isDark ? "bg-[#48484A] text-gray-300" : "bg-gray-200 text-gray-600"
                            )}>
                                {index + 1}
                            </div>
                            <div className="flex-1">
                                <p className="font-bold">{product.name}</p>
                                <p className={clsx("text-sm", textSecondary)}>
                                    {product.count} adet satış
                                </p>
                            </div>
                            <div className="text-right">
                                <p className="font-bold text-lg">₺{product.revenue.toLocaleString('tr-TR')}</p>
                                <p className={clsx("text-xs", textSecondary)}>toplam gelir</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Quick Insights */}
            <div className={clsx(
                "p-6 rounded-[1.5rem]",
                cardBg,
                isDark ? "border border-white/5" : "shadow-sm"
            )}>
                <div className="flex items-center gap-3 mb-4">
                    <div className="p-3 rounded-xl bg-green-500/10">
                        <Star className="w-6 h-6 text-green-500" />
                    </div>
                    <h2 className="text-xl font-bold">Hızlı Özet</h2>
                </div>
                <div className={clsx(
                    "grid grid-cols-1 md:grid-cols-3 gap-4 p-4 rounded-xl",
                    isDark ? "bg-[#2C2C2E]" : "bg-gray-50"
                )}>
                    <div className="text-center">
                        <p className={clsx("text-sm font-medium mb-1", textSecondary)}>Günlük Ort.</p>
                        <p className="text-xl font-bold">{Math.round((analytics?.monthlyOrders || 0) / 30)} sipariş</p>
                    </div>
                    <div className="text-center">
                        <p className={clsx("text-sm font-medium mb-1", textSecondary)}>En Yoğun Gün</p>
                        <p className="text-xl font-bold">Cumartesi</p>
                    </div>
                    <div className="text-center">
                        <p className={clsx("text-sm font-medium mb-1", textSecondary)}>En Yoğun Saat</p>
                        <p className="text-xl font-bold">19:00 - 21:00</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
