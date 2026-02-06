"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
    Coffee, ShoppingBag, Users, Gift, Settings,
    TrendingUp, DollarSign, Clock, Package,
    Plus, ArrowRight
} from "lucide-react";
import Link from "next/link";
import { LiquidMetalCard } from "@/components/cities/LiquidMetalCard";
import { useBusinessSession } from "@/hooks/useBusinessSession";

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
            // Fetch stats
            const res = await fetch(`/api/coffee/analytics/overview?business_id=${session?.businessId}`);
            if (res.ok) {
                const data = await res.json();
                setStats(data.data || stats);
            }

            // Fetch recent orders
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

    if (sessionLoading || loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="w-12 h-12 border-4 border-white/10 border-t-[#fe1e50] rounded-full animate-spin" />
            </div>
        );
    }

    const menuItems = [
        { icon: ShoppingBag, label: "Ürünler", href: "/panel/coffee/products", color: "bg-blue-500/20 text-blue-400" },
        { icon: Package, label: "Kategoriler", href: "/panel/coffee/categories", color: "bg-purple-500/20 text-purple-400" },
        { icon: Coffee, label: "Boyutlar", href: "/panel/coffee/sizes", color: "bg-amber-500/20 text-amber-400" },
        { icon: Plus, label: "Ekstralar", href: "/panel/coffee/extras", color: "bg-pink-500/20 text-pink-400" },
        { icon: Users, label: "Siparişler", href: "/panel/coffee/orders", color: "bg-emerald-500/20 text-emerald-400" },
        { icon: Gift, label: "Sadakat", href: "/panel/coffee/loyalty", color: "bg-rose-500/20 text-rose-400" },
        { icon: TrendingUp, label: "Kuponlar", href: "/panel/coffee/coupons", color: "bg-cyan-500/20 text-cyan-400" },
        { icon: Settings, label: "Ayarlar", href: "/panel/coffee/settings", color: "bg-gray-500/20 text-gray-400" },
    ];

    return (
        <div className="p-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-white">Kahve Dükkanı Paneli</h1>
                    <p className="text-white/50 mt-1">Menü, sipariş ve sadakat yönetimi</p>
                </div>
                <Link
                    href="/panel/coffee/products/new"
                    className="flex items-center gap-2 px-5 py-2.5 bg-[#fe1e50] hover:bg-[#fe1e50]/90 text-white rounded-xl transition-all font-bold shadow-lg shadow-[#fe1e50]/20"
                >
                    <Plus className="w-5 h-5" />
                    Yeni Ürün
                </Link>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <LiquidMetalCard>
                    <div className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-white/50 text-sm">Bugünkü Siparişler</p>
                                <p className="text-3xl font-bold text-white mt-1">{stats.todayOrders}</p>
                            </div>
                            <div className="w-12 h-12 rounded-xl bg-[#fe1e50]/10 flex items-center justify-center">
                                <ShoppingBag className="w-6 h-6 text-[#fe1e50]" />
                            </div>
                        </div>
                    </div>
                </LiquidMetalCard>

                <LiquidMetalCard delay={0.1}>
                    <div className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-white/50 text-sm">Bugünkü Gelir</p>
                                <p className="text-3xl font-bold text-white mt-1">₺{stats.todayRevenue.toLocaleString()}</p>
                            </div>
                            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                                <DollarSign className="w-6 h-6 text-emerald-400" />
                            </div>
                        </div>
                    </div>
                </LiquidMetalCard>

                <LiquidMetalCard delay={0.2}>
                    <div className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-white/50 text-sm">Ort. Sipariş</p>
                                <p className="text-3xl font-bold text-white mt-1">₺{stats.avgOrderValue}</p>
                            </div>
                            <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center">
                                <TrendingUp className="w-6 h-6 text-blue-400" />
                            </div>
                        </div>
                    </div>
                </LiquidMetalCard>

                <LiquidMetalCard delay={0.3}>
                    <div className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-white/50 text-sm">Bekleyen</p>
                                <p className="text-3xl font-bold text-white mt-1">{stats.pendingOrders}</p>
                            </div>
                            <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center">
                                <Clock className="w-6 h-6 text-amber-400" />
                            </div>
                        </div>
                    </div>
                </LiquidMetalCard>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Menu Navigation */}
                <div className="lg:col-span-2">
                    <LiquidMetalCard>
                        <div className="p-6">
                            <h2 className="text-xl font-bold text-white mb-6">Yönetim Menüsü</h2>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {menuItems.map((item, index) => (
                                    <motion.div
                                        key={item.href}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: index * 0.05 }}
                                    >
                                        <Link
                                            href={item.href}
                                            className="flex flex-col items-center p-6 bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.08] rounded-2xl transition-all group"
                                        >
                                            <div className={`w-14 h-14 rounded-2xl ${item.color} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
                                                <item.icon className="w-7 h-7" />
                                            </div>
                                            <span className="text-white font-medium">{item.label}</span>
                                            <ArrowRight className="w-4 h-4 text-white/30 mt-2 group-hover:text-white/60 transition-colors" />
                                        </Link>
                                    </motion.div>
                                ))}
                            </div>
                        </div>
                    </LiquidMetalCard>
                </div>

                {/* Recent Orders */}
                <div>
                    <LiquidMetalCard delay={0.2}>
                        <div className="p-6">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-xl font-bold text-white">Son Siparişler</h2>
                                <Link href="/panel/coffee/orders" className="text-[#fe1e50] text-sm hover:underline">
                                    Tümü
                                </Link>
                            </div>
                            <div className="space-y-3">
                                {recentOrders.length === 0 ? (
                                    <p className="text-white/40 text-center py-8">Henüz sipariş yok</p>
                                ) : (
                                    recentOrders.map((order: any) => (
                                        <div
                                            key={order.id}
                                            className="flex items-center justify-between p-4 bg-white/[0.03] rounded-xl"
                                        >
                                            <div>
                                                <p className="text-white font-medium">#{order.order_number}</p>
                                                <p className="text-white/40 text-sm">{order.customer_name}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-white font-bold">₺{order.total_amount}</p>
                                                <span className={`text-xs px-2 py-1 rounded-full ${
                                                    order.status === 'pending' ? 'bg-amber-500/20 text-amber-400' :
                                                    order.status === 'ready' ? 'bg-emerald-500/20 text-emerald-400' :
                                                    'bg-blue-500/20 text-blue-400'
                                                }`}>
                                                    {order.status}
                                                </span>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </LiquidMetalCard>
                </div>
            </div>
        </div>
    );
}
