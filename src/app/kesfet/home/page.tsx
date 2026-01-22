"use client";

import { useTheme } from "@/components/explore/ThemeProvider";
import Image from "next/image";
import Link from "next/link";
import { Wallet, TrendingUp, Clock, Package, Star, ChevronRight, Gift, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";

interface WalletData {
    balance: number;
    points: number;
}

interface RecentOrder {
    id: string;
    businessName: string;
    businessLogo?: string;
    items: { name: string; quantity: number }[];
    createdAt: string;
    status: string;
}

export default function HomePage() {
    const { theme } = useTheme();
    const isDark = theme === "dark";

    const [wallet, setWallet] = useState<WalletData>({ balance: 0, points: 0 });
    const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchData() {
            try {
                setLoading(true);

                // Fetch wallet balance
                const walletRes = await fetch("/api/kesfet/wallet");
                const walletData = await walletRes.json();
                if (walletData.success && walletData.data) {
                    setWallet(walletData.data);
                }

                // Fetch recent orders
                const ordersRes = await fetch("/api/kesfet/orders?limit=3");
                const ordersData = await ordersRes.json();
                if (ordersData.success && ordersData.data) {
                    setRecentOrders(ordersData.data);
                }
            } catch (err) {
                console.error("Fetch error:", err);
            } finally {
                setLoading(false);
            }
        }

        fetchData();
    }, []);

    const stats = [
        { icon: Package, label: "Siparişler", value: recentOrders.length.toString(), color: "text-blue-500" },
        { icon: Star, label: "Puanlar", value: wallet.points.toString(), color: "text-amber-500" },
        { icon: TrendingUp, label: "Tasarruf", value: "₺0", color: "text-emerald-500" },
    ];

    return (
        <div className={`min-h-screen pb-6 ${isDark ? "bg-gray-950" : "bg-gray-50"} transition-colors duration-300`}>
            {/* Header */}
            <header className={`sticky top-0 z-40 px-4 py-4
                              ${isDark ? "bg-gray-950/90" : "bg-white/90"}
                              backdrop-blur-xl border-b
                              ${isDark ? "border-white/5" : "border-gray-100"}`}>
                <div className="flex items-center justify-between">
                    <div>
                        <p className={`text-sm ${isDark ? "text-white/50" : "text-gray-500"}`}>
                            Hoş geldin 👋
                        </p>
                        <h1 className={`text-xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}>
                            Kullanıcı
                        </h1>
                    </div>
                    <Link
                        href="/kesfet/profile"
                        className="relative w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white font-bold"
                    >
                        K
                    </Link>
                </div>
            </header>

            {/* Wallet Card */}
            <section className="px-4 py-4">
                <div className="relative overflow-hidden rounded-2xl p-5
                              bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-600
                              shadow-xl shadow-emerald-500/20">
                    <div className="relative z-10">
                        <div className="flex items-center gap-2 mb-4">
                            <Wallet className="w-5 h-5 text-white/80" />
                            <span className="text-white/80 text-sm font-medium">TikCüzdan</span>
                        </div>
                        {loading ? (
                            <Loader2 className="w-6 h-6 animate-spin text-white" />
                        ) : (
                            <>
                                <div className="text-3xl font-bold text-white mb-1">
                                    ₺{wallet.balance.toLocaleString("tr-TR", { minimumFractionDigits: 2 })}
                                </div>
                                <div className="text-sm text-white/70">
                                    {wallet.points} puan kazanıldı
                                </div>
                            </>
                        )}
                        <button className="mt-4 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-full
                                         text-white text-sm font-medium transition-colors">
                            Bakiye Yükle
                        </button>
                    </div>
                    {/* Decorative elements */}
                    <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-white/10" />
                    <div className="absolute -right-4 -bottom-4 w-24 h-24 rounded-full bg-white/5" />
                </div>
            </section>

            {/* Quick Stats */}
            <section className="px-4 py-2">
                <div className="grid grid-cols-3 gap-3">
                    {stats.map((stat) => (
                        <div
                            key={stat.label}
                            className={`p-4 rounded-2xl text-center transition-all duration-300
                                       ${isDark
                                    ? "bg-white/5 border border-white/5"
                                    : "bg-white border border-gray-100 shadow-sm"}`}
                        >
                            <stat.icon className={`w-6 h-6 mx-auto mb-2 ${stat.color}`} />
                            <div className={`text-lg font-bold ${isDark ? "text-white" : "text-gray-900"}`}>
                                {stat.value}
                            </div>
                            <div className={`text-xs ${isDark ? "text-white/50" : "text-gray-500"}`}>
                                {stat.label}
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* Promotions Banner */}
            <section className="px-4 py-4">
                <div className={`p-4 rounded-2xl flex items-center gap-4
                               ${isDark
                        ? "bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/20"
                        : "bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-100"}`}>
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 
                                  flex items-center justify-center">
                        <Gift className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                        <h3 className={`font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>
                            Hoşgeldin Kampanyası
                        </h3>
                        <p className={`text-sm ${isDark ? "text-white/60" : "text-gray-600"}`}>
                            İlk siparişinize %20 indirim!
                        </p>
                    </div>
                    <ChevronRight className={`w-5 h-5 ${isDark ? "text-white/40" : "text-gray-400"}`} />
                </div>
            </section>

            {/* Recent Orders */}
            <section className="px-4 py-4">
                <div className="flex items-center justify-between mb-4">
                    <h2 className={`text-lg font-bold ${isDark ? "text-white" : "text-gray-900"}`}>
                        Son Siparişler
                    </h2>
                    <Link
                        href="/kesfet/orders"
                        className={`text-sm font-medium ${isDark ? "text-emerald-400" : "text-emerald-600"}`}
                    >
                        Tümü
                    </Link>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center py-8">
                        <Loader2 className={`w-6 h-6 animate-spin ${isDark ? "text-white/50" : "text-gray-400"}`} />
                    </div>
                ) : recentOrders.length === 0 ? (
                    <div className={`text-center py-8 rounded-2xl
                                   ${isDark ? "bg-white/5" : "bg-white"}`}>
                        <Package className={`w-12 h-12 mx-auto mb-3 ${isDark ? "text-white/30" : "text-gray-300"}`} />
                        <p className={`text-sm ${isDark ? "text-white/50" : "text-gray-500"}`}>
                            Henüz sipariş yok
                        </p>
                        <Link
                            href="/kesfet"
                            className="inline-block mt-3 px-4 py-2 bg-emerald-500 text-white rounded-full text-sm font-medium"
                        >
                            Keşfet
                        </Link>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {recentOrders.map((order) => (
                            <Link
                                key={order.id}
                                href={`/kesfet/orders/${order.id}`}
                                className={`flex items-center gap-3 p-3 rounded-xl transition-all
                                           ${isDark
                                        ? "bg-white/5 hover:bg-white/10"
                                        : "bg-white hover:shadow-md"}`}
                            >
                                <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-gray-200 flex-shrink-0">
                                    {order.businessLogo && (
                                        <Image src={order.businessLogo} alt={order.businessName} fill className="object-cover" />
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className={`font-medium truncate ${isDark ? "text-white" : "text-gray-900"}`}>
                                        {order.businessName}
                                    </h3>
                                    <p className={`text-xs truncate ${isDark ? "text-white/50" : "text-gray-500"}`}>
                                        {order.items.map(i => `${i.quantity}x ${i.name}`).join(", ")}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <p className={`text-xs ${isDark ? "text-white/40" : "text-gray-400"}`}>
                                        {new Date(order.createdAt).toLocaleDateString("tr-TR")}
                                    </p>
                                    <span className={`text-xs px-2 py-0.5 rounded-full
                                                    ${order.status === "delivered"
                                            ? "bg-emerald-500/20 text-emerald-500"
                                            : "bg-blue-500/20 text-blue-500"}`}>
                                        {order.status === "delivered" ? "Teslim Edildi" : "Devam Ediyor"}
                                    </span>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </section>
        </div>
    );
}
