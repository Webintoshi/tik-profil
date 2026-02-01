"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
    ShoppingBag,
    Package,
    ShoppingCart,
    Users,
    TrendingUp,
    ArrowRight,
    Loader2,
    Clock,
    AlertCircle,
} from "lucide-react";
import Link from "next/link";
import { useBusinessSession } from "@/hooks/useBusinessSession";
import { useTheme } from "@/components/panel/ThemeProvider";
import clsx from "clsx";

// Stat Card Component
function StatCard({
    title,
    value,
    subtitle,
    icon: Icon,
    color,
    href,
}: {
    title: string;
    value: string | number;
    subtitle?: string;
    icon: React.ElementType;
    color: "cyan" | "emerald" | "purple" | "amber";
    href?: string;
}) {
    const colors = {
        cyan: "from-cyan-500 to-blue-500",
        emerald: "from-emerald-500 to-green-500",
        purple: "from-slate-700 to-slate-900",
        amber: "from-amber-500 to-orange-500",
    };

    const content = (
        <div className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between mb-4">
                <div
                    className={clsx(
                        "h-12 w-12 rounded-xl bg-gradient-to-br flex items-center justify-center",
                        colors[color]
                    )}
                >
                    <Icon className="h-6 w-6 text-white" />
                </div>
                {href && (
                    <ArrowRight className="h-5 w-5 text-gray-400" />
                )}
            </div>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
            <p className="text-sm text-gray-500 mt-1">{title}</p>
            {subtitle && (
                <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>
            )}
        </div>
    );

    if (href) {
        return <Link href={href}>{content}</Link>;
    }
    return content;
}

// Quick Action Button
function QuickAction({
    title,
    icon: Icon,
    href,
    color,
}: {
    title: string;
    icon: React.ElementType;
    href: string;
    color: string;
}) {
    return (
        <Link
            href={href}
            className={clsx(
                "flex items-center gap-3 p-4 rounded-xl border border-gray-100 hover:shadow-md transition-all",
                "bg-white hover:scale-[1.02]"
            )}
        >
            <div className={clsx("h-10 w-10 rounded-lg flex items-center justify-center", color)}>
                <Icon className="h-5 w-5 text-white" />
            </div>
            <span className="font-medium text-gray-700">{title}</span>
            <ArrowRight className="h-4 w-4 text-gray-400 ml-auto" />
        </Link>
    );
}

// Empty State Component
function EmptyState() {
    return (
        <div className="text-center py-12">
            <div className="h-16 w-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
                <ShoppingBag className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
                E-ticaret Mağazanıza Hoş Geldiniz!
            </h3>
            <p className="text-gray-500 mb-6 max-w-md mx-auto">
                Ürünlerinizi ekleyin, siparişlerinizi yönetin ve online satışa başlayın.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link
                    href="/panel/ecommerce/products"
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-cyan-500 text-white rounded-xl font-medium hover:bg-cyan-600"
                >
                    <Package className="h-4 w-4" />
                    Ürün Ekle
                </Link>
                <Link
                    href="/panel/ecommerce/settings"
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200"
                >
                    Mağaza Ayarları
                </Link>
            </div>
        </div>
    );
}

export default function EcommerceDashboardPage() {
    const { session } = useBusinessSession();
    const [isLoading, setIsLoading] = useState(true);
    const [stats, setStats] = useState({
        totalProducts: 0,
        totalOrders: 0,
        totalCustomers: 0,
        todaySales: 0,
        pendingOrders: 0,
        lowStockProducts: 0,
    });

    // Fetch dashboard stats
    useEffect(() => {
        async function fetchStats() {
            if (!session?.businessId) return;

            try {
                const res = await fetch(`/api/ecommerce/dashboard?businessId=${session.businessId}`);
                const data = await res.json();

                if (data.success) {
                    setStats(data.stats);
                } else {
                    console.error("Stats fetch error:", data.error);
                    setStats({
                        totalProducts: 0,
                        totalOrders: 0,
                        totalCustomers: 0,
                        todaySales: 0,
                        pendingOrders: 0,
                        lowStockProducts: 0,
                    });
                }
            } catch (error) {
                console.error("Stats fetch error:", error);
                setStats({
                    totalProducts: 0,
                    totalOrders: 0,
                    totalCustomers: 0,
                    todaySales: 0,
                    pendingOrders: 0,
                    lowStockProducts: 0,
                });
            } finally {
                setIsLoading(false);
            }
        }

        fetchStats();
    }, [session?.businessId]);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="h-8 w-8 animate-spin text-cyan-500" />
            </div>
        );
    }

    const hasData = stats.totalProducts > 0 || stats.totalOrders > 0;

    return (
        <div className="max-w-6xl mx-auto p-4 sm:p-6">
            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
                <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
                    <ShoppingBag className="h-6 w-6 text-white" />
                </div>
                <div>
                    <h1 className="text-xl font-bold text-gray-900">E-ticaret Dashboard</h1>
                    <p className="text-sm text-gray-500">Online mağazanızı yönetin</p>
                </div>
            </div>

            {!hasData ? (
                <EmptyState />
            ) : (
                <>
                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0 }}
                        >
                            <StatCard
                                title="Toplam Ürün"
                                value={stats.totalProducts}
                                icon={Package}
                                color="cyan"
                                href="/panel/ecommerce/products"
                            />
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                        >
                            <StatCard
                                title="Toplam Sipariş"
                                value={stats.totalOrders}
                                icon={ShoppingCart}
                                color="emerald"
                                href="/panel/ecommerce/orders"
                            />
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                        >
                            <StatCard
                                title="Müşteriler"
                                value={stats.totalCustomers}
                                icon={Users}
                                color="purple"
                                href="/panel/ecommerce/customers"
                            />
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                        >
                            <StatCard
                                title="Bugünkü Satış"
                                value={`${stats.todaySales.toLocaleString("tr-TR")}₺`}
                                icon={TrendingUp}
                                color="amber"
                            />
                        </motion.div>
                    </div>

                    {/* Alerts */}
                    {(stats.pendingOrders > 0 || stats.lowStockProducts > 0) && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                            {stats.pendingOrders > 0 && (
                                <Link
                                    href="/panel/ecommerce/orders"
                                    className="flex items-center gap-4 p-4 bg-amber-50 border border-amber-100 rounded-xl"
                                >
                                    <Clock className="h-6 w-6 text-amber-500" />
                                    <div>
                                        <p className="font-medium text-amber-800">
                                            {stats.pendingOrders} bekleyen sipariş
                                        </p>
                                        <p className="text-sm text-amber-600">
                                            İşlem bekliyor
                                        </p>
                                    </div>
                                    <ArrowRight className="h-5 w-5 text-amber-400 ml-auto" />
                                </Link>
                            )}

                            {stats.lowStockProducts > 0 && (
                                <Link
                                    href="/panel/ecommerce/products"
                                    className="flex items-center gap-4 p-4 bg-red-50 border border-red-100 rounded-xl"
                                >
                                    <AlertCircle className="h-6 w-6 text-red-500" />
                                    <div>
                                        <p className="font-medium text-red-800">
                                            {stats.lowStockProducts} düşük stoklu ürün
                                        </p>
                                        <p className="text-sm text-red-600">
                                            Stok kontrolü gerekiyor
                                        </p>
                                    </div>
                                    <ArrowRight className="h-5 w-5 text-red-400 ml-auto" />
                                </Link>
                            )}
                        </div>
                    )}
                </>
            )}

            {/* Quick Actions */}
            <div className="mt-8">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Hızlı İşlemler</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <QuickAction
                        title="Ürün Ekle"
                        icon={Package}
                        href="/panel/ecommerce/products"
                        color="bg-cyan-500"
                    />
                    <QuickAction
                        title="Siparişleri Gör"
                        icon={ShoppingCart}
                        href="/panel/ecommerce/orders"
                        color="bg-emerald-500"
                    />
                    <QuickAction
                        title="Kategori Yönetimi"
                        icon={Package}
                        href="/panel/ecommerce/categories"
                        color="bg-purple-500"
                    />
                    <QuickAction
                        title="Müşteriler"
                        icon={Users}
                        href="/panel/ecommerce/customers"
                        color="bg-pink-500"
                    />
                    <QuickAction
                        title="Kuponlar"
                        icon={Package}
                        href="/panel/ecommerce/coupons"
                        color="bg-amber-500"
                    />
                    <QuickAction
                        title="Ayarlar"
                        icon={Package}
                        href="/panel/ecommerce/settings"
                        color="bg-gray-500"
                    />
                </div>
            </div>
        </div>
    );
}

