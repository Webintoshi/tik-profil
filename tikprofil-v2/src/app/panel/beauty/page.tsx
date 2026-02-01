"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Plus, Scissors, ListChecks, Users, ArrowRight, Loader2 } from "lucide-react";
import Link from "next/link";
import { useTheme } from "@/components/panel/ThemeProvider";
import clsx from "clsx";

interface Stats {
    categories: number;
    services: number;
    staff: number;
}

export default function BeautyDashboardPage() {
    const { isDark } = useTheme();
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState<Stats>({ categories: 0, services: 0, staff: 0 });

    useEffect(() => {
        const loadStats = async () => {
            try {
                const [catRes, svcRes, staffRes] = await Promise.all([
                    fetch('/api/beauty/categories'),
                    fetch('/api/beauty/services'),
                    fetch('/api/beauty/staff'),
                ]);

                const [catData, svcData, staffData] = await Promise.all([
                    catRes.json(),
                    svcRes.json(),
                    staffRes.json(),
                ]);

                setStats({
                    categories: catData.categories?.length || 0,
                    services: svcData.services?.length || 0,
                    staff: staffData.staff?.length || 0,
                });
            } catch (error) {
                console.error('Stats load error:', error);
            } finally {
                setLoading(false);
            }
        };

        loadStats();
    }, []);

    const cardBg = isDark ? "bg-gray-800" : "bg-white";
    const textPrimary = isDark ? "text-white" : "text-gray-900";
    const textSecondary = isDark ? "text-gray-400" : "text-gray-500";

    const statsCards = [
        { label: "Kategoriler", value: stats.categories, icon: ListChecks, color: "text-pink-500", bg: "bg-pink-500/10" },
        { label: "Hizmetler", value: stats.services, icon: Scissors, color: "text-purple-500", bg: "bg-purple-500/10" },
        { label: "Personel", value: stats.staff, icon: Users, color: "text-blue-500", bg: "bg-blue-500/10" },
    ];

    const quickActions = [
        { label: "Yeni Hizmet Ekle", href: "/panel/beauty/services", icon: Plus, color: "from-pink-500 to-rose-600" },
        { label: "Kategorileri Yönet", href: "/panel/beauty/categories", icon: ListChecks, color: "from-purple-500 to-violet-600" },
        { label: "Personel Ekle", href: "/panel/beauty/staff", icon: Users, color: "from-blue-500 to-indigo-600" },
    ];

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-pink-500" />
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className={clsx("text-2xl font-bold", textPrimary)}>
                        💅 Güzellik Merkezi
                    </h1>
                    <p className={clsx("text-sm mt-1", textSecondary)}>
                        Hizmetlerinizi ve randevularınızı yönetin
                    </p>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                                    <p className={clsx("text-3xl font-bold mt-1", textPrimary)}>
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

            {/* Quick Actions */}
            <div>
                <h2 className={clsx("text-lg font-semibold mb-4", textPrimary)}>
                    Hızlı İşlemler
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {quickActions.map((action, index) => {
                        const Icon = action.icon;
                        return (
                            <motion.div
                                key={action.label}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.3 + index * 0.1 }}
                            >
                                <Link
                                    href={action.href}
                                    className={clsx(
                                        "group flex items-center gap-4 p-5 rounded-2xl bg-gradient-to-r",
                                        action.color,
                                        "text-white hover:shadow-lg hover:-translate-y-0.5 transition-all"
                                    )}
                                >
                                    <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                                        <Icon className="w-5 h-5" />
                                    </div>
                                    <span className="font-medium flex-1">{action.label}</span>
                                    <ArrowRight className="w-5 h-5 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                                </Link>
                            </motion.div>
                        );
                    })}
                </div>
            </div>

            {/* Empty State */}
            {stats.services === 0 && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className={clsx("text-center py-12 rounded-2xl", isDark ? "bg-gray-800/50" : "bg-gray-50")}
                >
                    <div className="text-5xl mb-4">💆‍♀️</div>
                    <h3 className={clsx("text-lg font-semibold mb-2", textPrimary)}>
                        Hizmet eklemeye başlayın
                    </h3>
                    <p className={clsx("mb-4 max-w-md mx-auto", textSecondary)}>
                        Müşterilerinizin görebileceği hizmetleri ekleyerek başlayın.
                        Önce kategoriler, sonra hizmetler oluşturun.
                    </p>
                    <Link
                        href="/panel/beauty/categories"
                        className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-pink-500 to-rose-600 text-white font-medium rounded-xl hover:shadow-lg transition-all"
                    >
                        <Plus className="w-5 h-5" />
                        Kategori Oluştur
                    </Link>
                </motion.div>
            )}
        </div>
    );
}
