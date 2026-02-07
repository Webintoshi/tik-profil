"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
    Coffee, ShoppingBag, Users, Gift, Settings,
    TrendingUp, DollarSign, Clock, Package,
    Plus, ArrowRight, Loader2
} from "lucide-react";
import Link from "next/link";
import { useBusinessSession } from "@/hooks/useBusinessSession";
import { useTheme } from "@/components/panel/ThemeProvider";
import clsx from "clsx";

interface DashboardStats {
    todayOrders: number;
    todayRevenue: number;
    avgOrderValue: number;
    totalProducts: number;
    pendingOrders: number;
    activeCustomers: number;
}

export default function CoffeeDashboardPage() {
    const router = useRouter();
    const { isDark } = useTheme();
    const { session, loading: sessionLoading } = useBusinessSession();
    const [stats, setStats] = useState<DashboardStats>({
        todayOrders: 0,
        todayRevenue: 0,
        avgOrderValue: 0,
        totalProducts: 0,
        pendingOrders: 0,
        activeCustomers: 0
    });
    const [recentOrders, setRecentOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!sessionLoading && !session) {
            router.push("/giris-yap");
            return;
        }

        if (session?.businessId) {
            fetchDashboardData();
        }
    }, [session, sessionLoading]);

    const fetchDashboardData = async () => {
        try {
            const res = await fetch(`/api/coffee/analytics/overview?business_id=${session?.businessId}`);
            if (res.ok) {
                const data = await res.json();
                setStats(data.data || stats);
            }

            const ordersRes = await fetch(`/api/coffee/orders?business_id=${session?.businessId}&limit=5`);
            if (ordersRes.ok) {
                const ordersData = await ordersRes.json();
                setRecentOrders(ordersData.data || []);
            }
        } catch (error) {
            console.error("Error fetching dashboard data:", error);
        } finally {
            setLoading(false);
        }
    };

    // Theme variables - matching other panel pages
    const cardBg = isDark ? "bg-gray-800" : "bg-white";
    const textPrimary = isDark ? "text-white" : "text-gray-900";
    const textSecondary = isDark ? "text-gray-400" : "text-gray-500";
    const textMuted = isDark ? "text-gray-500" : "text-gray-400";
    const borderColor = isDark ? "border-white/10" : "border-gray-200";

    const menuItems = [
        { icon: ShoppingBag, label: "Ürünler", href: "/panel/coffee/products", color: "text-blue-500", bg: "bg-blue-500/10" },
        { icon: Package, label: "Kategoriler", href: "/panel/coffee/categories", color: "text-purple-500", bg: "bg-purple-500/10" },
        { icon: Coffee, label: "Boyutlar", href: "/panel/coffee/sizes", color: "text-amber-500", bg: "bg-amber-500/10" },
        { icon: Plus, label: "Ekstralar", href: "/panel/coffee/extras", color: "text-pink-500", bg: "bg-pink-500/10" },
        { icon: Users, label: "Siparişler", href: "/panel/coffee/orders", color: "text-emerald-500", bg: "bg-emerald-500/10" },
        { icon: Gift, label: "Sadakat", href: "/panel/coffee/loyalty", color: "text-rose-500", bg: "bg-rose-500/10" },
        { icon: TrendingUp, label: "Kuponlar", href: "/panel/coffee/coupons", color: "text-cyan-500", bg: "bg-cyan-500/10" },
        { icon: Settings, label: "Ayarlar", href: "/panel/coffee/settings", color: "text-gray-500", bg: "bg-gray-500/10" },
    ];

    const statsCards = [
        { label: "Bugünkü Siparişler", value: stats.todayOrders, icon: ShoppingBag, color: "text-[#fe1e50]", bg: "bg-[#fe1e50]/10" },
        { label: "Bugünkü Gelir", value: `₺${stats.todayRevenue.toLocaleString()}`, icon: DollarSign, color: "text-emerald-500", bg: "bg-emerald-500/10" },
        { label: "Ort. Sipariş", value: `₺${stats.avgOrderValue}`, icon: TrendingUp, color: "text-blue-500", bg: "bg-blue-500/10" },
        { label: "Bekleyen", value: stats.pendingOrders, icon: Clock, color: "text-amber-500", bg: "bg-amber-500/10" },
    ];

    if (sessionLoading || loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className={clsx("w-8 h-8 animate-spin", isDark ? "text-gray-400" : "text-gray-500")} />
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className={clsx("text-2xl font-bold", textPrimary)}>
                        ☕ Kahve Dükkanı
                    </h1>
                    <p className={clsx("text-sm mt-1", textSecondary)}>
                        Menü, sipariş ve sadakat yönetimi
                    </p>
                </div>
                <Link
                    href="/panel/coffee/products/new"
                    className="flex items-center gap-2 px-5 py-2.5 bg-[#fe1e50] hover:bg-[#fe1e50]/90 text-white rounded-xl transition-all font-medium shadow-lg shadow-[#fe1e50]/20"
                >
                    <Plus className="w-5 h-5" />
                    Yeni Ürün
                </Link>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {statsCards.map((card, index) => {
                    const Icon = card.icon;
                    return (
                        <motion.div
                            key={card.label}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className={clsx("p-5 rounded-2xl", cardBg)}
                        >
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className={clsx("text-sm font-medium", textSecondary)}>
                                        {card.label}
                                    </p>
                                    <p className={clsx("text-2xl font-bold mt-1", textPrimary)}>
                                        {card.value}
                                    </p>
                                </div>
                                <div className={clsx("w-12 h-12 rounded-xl flex items-center justify-center", card.bg)}>
                                    <Icon className={clsx("w-6 h-6", card.color)} />
                                </div>
                            </div>
                        </motion.div>
                    );
                })}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Menu Navigation */}
                <div className="lg:col-span-2">
                    <div className={clsx("rounded-2xl p-6", cardBg)}>
                        <h2 className={clsx("text-lg font-semibold mb-4", textPrimary)}>
                            Yönetim Menüsü
                        </h2>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {menuItems.map((item, index) => {
                                const Icon = item.icon;
                                return (
                                    <motion.div
                                        key={item.href}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.3 + index * 0.05 }}
                                    >
                                        <Link
                                            href={item.href}
                                            className={clsx(
                                                "flex flex-col items-center p-5 rounded-xl transition-all group border",
                                                isDark 
                                                    ? "border-white/10 hover:border-white/20 bg-white/5 hover:bg-white/10" 
                                                    : "border-gray-200 hover:border-gray-300 bg-gray-50 hover:bg-gray-100"
                                            )}
                                        >
                                            <div className={clsx("w-12 h-12 rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform", item.bg)}>
                                                <Icon className={clsx("w-6 h-6", item.color)} />
                                            </div>
                                            <span className={clsx("font-medium text-sm", textPrimary)}>{item.label}</span>
                                            <ArrowRight className={clsx("w-4 h-4 mt-2 transition-colors", isDark ? "text-gray-600 group-hover:text-gray-400" : "text-gray-400 group-hover:text-gray-600")} />
                                        </Link>
                                    </motion.div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Recent Orders */}
                <div>
                    <div className={clsx("rounded-2xl p-6", cardBg)}>
                        <div className="flex items-center justify-between mb-4">
                            <h2 className={clsx("text-lg font-semibold", textPrimary)}>
                                Son Siparişler
                            </h2>
                            <Link href="/panel/coffee/orders" className="text-[#fe1e50] text-sm hover:underline">
                                Tümü
                            </Link>
                        </div>
                        <div className="space-y-3">
                            {recentOrders.length === 0 ? (
                                <p className={clsx("text-center py-8", textMuted)}>Henüz sipariş yok</p>
                            ) : (
                                recentOrders.map((order: any) => (
                                    <div
                                        key={order.id}
                                        className={clsx(
                                            "flex items-center justify-between p-4 rounded-xl",
                                            isDark ? "bg-white/5" : "bg-gray-50"
                                        )}
                                    >
                                        <div>
                                            <p className={clsx("font-medium", textPrimary)}>#{order.order_number}</p>
                                            <p className={clsx("text-sm", textMuted)}>{order.customer_name}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className={clsx("font-bold", textPrimary)}>₺{order.total_amount}</p>
                                            <span className={clsx("text-xs px-2 py-1 rounded-full",
                                                order.status === 'pending'
                                                    ? (isDark ? 'bg-amber-500/20 text-amber-400' : 'bg-amber-100 text-amber-700')
                                                    : order.status === 'ready'
                                                        ? (isDark ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-700')
                                                        : (isDark ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-700')
                                            )}>
                                                {order.status === 'pending' ? 'Bekliyor' : order.status === 'ready' ? 'Hazır' : 'Tamamlandı'}
                                            </span>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
