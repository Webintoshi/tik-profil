"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
    BarChart3,
    Loader2,
    TrendingUp,
    ShoppingCart,
    Users,
    Package,
    AlertCircle,
    DollarSign,
} from "lucide-react";
import { toast } from "sonner";
import clsx from "clsx";
import { useBusinessSession } from "@/hooks/useBusinessSession";
import { useTheme } from "@/components/panel/ThemeProvider";

interface AnalyticsData {
    overview: {
        totalRevenue: number;
        totalOrders: number;
        avgOrderValue: number;
        totalCustomers: number;
        newCustomers: number;
    };
    statusDistribution: Record<string, number>;
    dailyRevenue: { date: string; revenue: number; orders: number }[];
    topProducts: { id: string; name: string; quantity: number; revenue: number }[];
    lowStockProducts: { id: string; name: string; stock: number; image?: string }[];
    topCustomers: { id: string; name: string; totalSpent: number; totalOrders: number }[];
}

export default function EcommerceAnalyticsPage() {
    const { session } = useBusinessSession();
    const { isDark } = useTheme();
    const [isLoading, setIsLoading] = useState(true);
    const [data, setData] = useState<AnalyticsData | null>(null);
    const [period, setPeriod] = useState("30");

    // Fetch analytics
    useEffect(() => {
        async function fetchAnalytics() {
            if (!session?.businessId) return;

            setIsLoading(true);
            try {
                const res = await fetch(
                    `/api/ecommerce/analytics?businessId=${session.businessId}&period=${period}`
                );
                if (res.ok) {
                    const result = await res.json();
                    setData(result);
                }
            } catch (error) {
                console.error("Analytics fetch error:", error);
                toast.error("Veriler yüklenemedi");
            } finally {
                setIsLoading(false);
            }
        }

        fetchAnalytics();
    }, [session?.businessId, period]);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className={clsx("h-8 w-8 animate-spin", isDark ? "text-cyan-400" : "text-cyan-500")} />
            </div>
        );
    }

    if (!data) {
        return (
            <div className="text-center py-16">
                <BarChart3 className={clsx("h-12 w-12 mx-auto mb-4", isDark ? "text-white/20" : "text-gray-300")} />
                <p className={clsx(isDark ? "text-white/50" : "text-gray-500")}>Veri bulunamadı</p>
            </div>
        );
    }

    const maxRevenue = Math.max(...data.dailyRevenue.map(d => d.revenue), 1);

    return (
        <div className="max-w-6xl mx-auto p-4 sm:p-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center">
                        <BarChart3 className="h-6 w-6 text-white" />
                    </div>
                    <div>
                        <h1 className={clsx("text-xl font-bold", isDark ? "text-white" : "text-gray-900")}>Analitik</h1>
                        <p className={clsx("text-sm", isDark ? "text-white/50" : "text-gray-500")}>Satış ve performans verileri</p>
                    </div>
                </div>

                <select
                    value={period}
                    onChange={(e) => setPeriod(e.target.value)}
                    className={clsx(
                        "px-4 py-2.5 rounded-xl border outline-none",
                        isDark
                            ? "bg-white/5 border-white/10 text-white focus:border-cyan-500/50"
                            : "bg-white border-gray-200 focus:border-cyan-500"
                    )}
                >
                    <option value="7">Son 7 gün</option>
                    <option value="30">Son 30 gün</option>
                    <option value="90">Son 90 gün</option>
                </select>
            </div>

            {/* Overview Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <StatCard
                    icon={DollarSign}
                    label="Toplam Gelir"
                    value={`${data.overview.totalRevenue.toLocaleString("tr-TR")}₺`}
                    color="emerald"
                />
                <StatCard
                    icon={ShoppingCart}
                    label="Toplam Sipariş"
                    value={data.overview.totalOrders.toString()}
                    color="blue"
                />
                <StatCard
                    icon={TrendingUp}
                    label="Ort. Sipariş"
                    value={`${data.overview.avgOrderValue.toLocaleString("tr-TR", { maximumFractionDigits: 0 })}₺`}
                    color="purple"
                />
                <StatCard
                    icon={Users}
                    label="Toplam Müşteri"
                    value={data.overview.totalCustomers.toString()}
                    subvalue={`+${data.overview.newCustomers} yeni`}
                    color="pink"
                />
            </div>

            <div className="grid lg:grid-cols-2 gap-6 mb-6">
                {/* Daily Revenue Chart */}
                <div className={clsx("rounded-2xl border p-4", isDark ? "bg-white/[0.03] border-white/10" : "bg-white border-gray-100")}>
                    <h3 className={clsx("font-semibold mb-4", isDark ? "text-white" : "text-gray-900")}>Günlük Gelir</h3>
                    <div className="flex items-end gap-2 h-40">
                        {data.dailyRevenue.map((day, i) => (
                            <div key={day.date} className="flex-1 flex flex-col items-center gap-1">
                                <div
                                    className="w-full bg-gradient-to-t from-emerald-500 to-emerald-400 rounded-t-lg transition-all hover:opacity-80"
                                    style={{ height: `${(day.revenue / maxRevenue) * 100}%`, minHeight: day.revenue > 0 ? 8 : 0 }}
                                    title={`${day.revenue.toLocaleString("tr-TR")}₺`}
                                />
                                <span className={clsx("text-xs", isDark ? "text-white/40" : "text-gray-400")}>
                                    {new Date(day.date).toLocaleDateString("tr-TR", { weekday: 'short' })}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Order Status */}
                <div className={clsx("rounded-2xl border p-4", isDark ? "bg-white/[0.03] border-white/10" : "bg-white border-gray-100")}>
                    <h3 className={clsx("font-semibold mb-4", isDark ? "text-white" : "text-gray-900")}>Sipariş Durumları</h3>
                    <div className="space-y-3">
                        {[
                            { key: 'pending', label: 'Bekleyen', color: 'yellow' },
                            { key: 'processing', label: 'Hazırlanan', color: 'purple' },
                            { key: 'shipped', label: 'Kargoda', color: 'blue' },
                            { key: 'delivered', label: 'Teslim', color: 'green' },
                            { key: 'cancelled', label: 'İptal', color: 'red' },
                        ].map(status => {
                            const count = data.statusDistribution[status.key] || 0;
                            const total = Object.values(data.statusDistribution).reduce((a, b) => a + b, 0);
                            const percent = total > 0 ? (count / total) * 100 : 0;

                            return (
                                <div key={status.key} className="flex items-center gap-3">
                                    <span className={clsx("text-sm w-20", isDark ? "text-white/60" : "text-gray-600")}>{status.label}</span>
                                    <div className={clsx("flex-1 h-2 rounded-full overflow-hidden", isDark ? "bg-white/10" : "bg-gray-100")}>
                                        <div
                                            className={clsx(
                                                "h-full rounded-full",
                                                status.color === 'yellow' && "bg-yellow-400",
                                                status.color === 'purple' && "bg-purple-400",
                                                status.color === 'blue' && "bg-blue-400",
                                                status.color === 'green' && "bg-green-400",
                                                status.color === 'red' && "bg-red-400",
                                            )}
                                            style={{ width: `${percent}%` }}
                                        />
                                    </div>
                                    <span className={clsx("text-sm font-medium w-8 text-right", isDark ? "text-white" : "text-gray-900")}>{count}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            <div className="grid lg:grid-cols-3 gap-6">
                {/* Top Products */}
                <div className="bg-white rounded-2xl border border-gray-100 p-4">
                    <h3 className="font-semibold text-gray-900 mb-4">En Çok Satan Ürünler</h3>
                    {data.topProducts.length === 0 ? (
                        <p className="text-sm text-gray-500 text-center py-4">Henüz satış yok</p>
                    ) : (
                        <div className="space-y-3">
                            {data.topProducts.map((product, i) => (
                                <div key={product.id} className="flex items-center gap-3">
                                    <span className="text-sm font-medium text-gray-400 w-5">{i + 1}</span>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-gray-900 truncate">{product.name}</p>
                                        <p className="text-xs text-gray-500">{product.quantity} adet</p>
                                    </div>
                                    <span className="text-sm font-bold text-emerald-600">
                                        {product.revenue.toLocaleString("tr-TR")}₺
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Top Customers */}
                <div className="bg-white rounded-2xl border border-gray-100 p-4">
                    <h3 className="font-semibold text-gray-900 mb-4">En İyi Müşteriler</h3>
                    {data.topCustomers.length === 0 ? (
                        <p className="text-sm text-gray-500 text-center py-4">Henüz müşteri yok</p>
                    ) : (
                        <div className="space-y-3">
                            {data.topCustomers.map((customer, i) => (
                                <div key={customer.id} className="flex items-center gap-3">
                                    <div className="h-8 w-8 rounded-full bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center text-white text-xs font-bold">
                                        {customer.name.charAt(0)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-gray-900 truncate">{customer.name}</p>
                                        <p className="text-xs text-gray-500">{customer.totalOrders} sipariş</p>
                                    </div>
                                    <span className="text-sm font-bold text-emerald-600">
                                        {customer.totalSpent.toLocaleString("tr-TR")}₺
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Low Stock */}
                <div className="bg-white rounded-2xl border border-gray-100 p-4">
                    <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-amber-500" />
                        Düşük Stok
                    </h3>
                    {data.lowStockProducts.length === 0 ? (
                        <p className="text-sm text-gray-500 text-center py-4">Stok sorunu yok</p>
                    ) : (
                        <div className="space-y-3">
                            {data.lowStockProducts.map((product) => (
                                <div key={product.id} className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-lg bg-gray-100 flex items-center justify-center overflow-hidden">
                                        {product.image ? (
                                            <img src={product.image} alt="" className="h-full w-full object-cover" />
                                        ) : (
                                            <Package className="h-5 w-5 text-gray-400" />
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-gray-900 truncate">{product.name}</p>
                                    </div>
                                    <span className={clsx(
                                        "px-2 py-0.5 text-xs font-medium rounded-full",
                                        product.stock === 0
                                            ? "bg-red-100 text-red-700"
                                            : "bg-amber-100 text-amber-700"
                                    )}>
                                        {product.stock === 0 ? "Tükendi" : `${product.stock} kaldı`}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// Stat Card Component
function StatCard({
    icon: Icon,
    label,
    value,
    subvalue,
    color,
}: {
    icon: React.ElementType;
    label: string;
    value: string;
    subvalue?: string;
    color: 'emerald' | 'blue' | 'purple' | 'pink';
}) {
    const gradients = {
        emerald: "from-emerald-500 to-green-500",
        blue: "from-blue-500 to-cyan-500",
        purple: "from-purple-500 to-indigo-500",
        pink: "from-pink-500 to-rose-500",
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl border border-gray-100 p-4"
        >
            <div className={clsx(
                "h-10 w-10 rounded-xl bg-gradient-to-br flex items-center justify-center mb-3",
                gradients[color]
            )}>
                <Icon className="h-5 w-5 text-white" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
            <p className="text-sm text-gray-500">{label}</p>
            {subvalue && <p className="text-xs text-emerald-500 mt-1">{subvalue}</p>}
        </motion.div>
    );
}

