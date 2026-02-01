"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
    Home,
    Users,
    Plus,
    TrendingUp,
    Building2,
    Loader2
} from "lucide-react";
import Link from "next/link";
import { useTheme } from "@/components/panel/ThemeProvider";

interface Stats {
    totalListings: number;
    activeListings: number;
    soldListings: number;
    consultants: number;
}

export default function EmlakDashboardPage() {
    const { isDark } = useTheme();
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState<Stats>({
        totalListings: 0,
        activeListings: 0,
        soldListings: 0,
        consultants: 0,
    });

    useEffect(() => {
        loadStats();
    }, []);

    const loadStats = async () => {
        try {
            setLoading(true);

            // Fetch listings
            const listingsRes = await fetch('/api/emlak/listings');
            const listingsData = await listingsRes.json();

            // Fetch consultants
            const consultantsRes = await fetch('/api/emlak/consultants');
            const consultantsData = await consultantsRes.json();

            if (listingsData.success && consultantsData.success) {
                const listings = listingsData.listings || [];
                setStats({
                    totalListings: listings.length,
                    activeListings: listings.filter((l: { status: string }) => l.status === 'active').length,
                    soldListings: listings.filter((l: { status: string }) => l.status === 'sold').length,
                    consultants: (consultantsData.consultants || []).length,
                });
            }
        } catch (error) {
            console.error('Stats loading error:', error);
        } finally {
            setLoading(false);
        }
    };

    const statCards = [
        {
            label: "Toplam İlan",
            value: stats.totalListings,
            icon: Building2,
            color: "from-violet-500 to-purple-600",
            href: "/panel/emlak/listings",
        },
        {
            label: "Aktif İlan",
            value: stats.activeListings,
            icon: TrendingUp,
            color: "from-emerald-500 to-teal-600",
            href: "/panel/emlak/listings?status=active",
        },
        {
            label: "Satılan",
            value: stats.soldListings,
            icon: Home,
            color: "from-rose-500 to-pink-600",
            href: "/panel/emlak/listings?status=sold",
        },
        {
            label: "Danışmanlar",
            value: stats.consultants,
            icon: Users,
            color: "from-blue-500 to-indigo-600",
            href: "/panel/emlak/consultants",
        },
    ];

    const quickActions = [
        {
            label: "Yeni İlan Ekle",
            icon: Plus,
            href: "/panel/emlak/listings/new",
            color: "bg-gradient-to-r from-violet-500 to-purple-600",
        },
        {
            label: "İlanları Yönet",
            icon: Building2,
            href: "/panel/emlak/listings",
            color: isDark ? "bg-gray-700" : "bg-gray-100",
            textColor: isDark ? "text-white" : "text-gray-700",
        },
        {
            label: "Danışman Ekle",
            icon: Users,
            href: "/panel/emlak/consultants",
            color: isDark ? "bg-gray-700" : "bg-gray-100",
            textColor: isDark ? "text-white" : "text-gray-700",
        },
    ];

    return (
        <div className="p-6 space-y-8">
            {/* Header */}
            <div>
                <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    🏠 Emlak Modülü
                </h1>
                <p className={`mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    İlanlarınızı ve danışmanlarınızı buradan yönetin
                </p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {statCards.map((stat, index) => (
                    <motion.div
                        key={stat.label}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                    >
                        <Link href={stat.href}>
                            <div className={`p-5 rounded-2xl ${isDark ? 'bg-gray-800' : 'bg-white'} shadow-sm hover:shadow-lg transition-all group`}>
                                <div className={`w-10 h-10 rounded-xl bg-gradient-to-r ${stat.color} flex items-center justify-center mb-3`}>
                                    <stat.icon className="w-5 h-5 text-white" />
                                </div>
                                {loading ? (
                                    <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                                ) : (
                                    <div className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                        {stat.value}
                                    </div>
                                )}
                                <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                    {stat.label}
                                </div>
                            </div>
                        </Link>
                    </motion.div>
                ))}
            </div>

            {/* Quick Actions */}
            <div>
                <h2 className={`text-lg font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    Hızlı İşlemler
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {quickActions.map((action, index) => (
                        <motion.div
                            key={action.label}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 + index * 0.1 }}
                        >
                            <Link href={action.href}>
                                <div className={`p-4 rounded-xl ${action.color} ${action.textColor || 'text-white'} flex items-center gap-3 hover:scale-[1.02] transition-transform cursor-pointer`}>
                                    <action.icon className="w-5 h-5" />
                                    <span className="font-medium">{action.label}</span>
                                </div>
                            </Link>
                        </motion.div>
                    ))}
                </div>
            </div>

            {/* Empty State */}
            {!loading && stats.totalListings === 0 && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className={`text-center py-12 rounded-2xl ${isDark ? 'bg-gray-800' : 'bg-gray-50'}`}
                >
                    <div className="text-5xl mb-4">🏠</div>
                    <h3 className={`text-lg font-semibold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        Henüz ilan eklenmemiş
                    </h3>
                    <p className={`mb-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                        İlk ilanınızı ekleyerek başlayın
                    </p>
                    <Link
                        href="/panel/emlak/listings/new"
                        className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-violet-500 to-purple-600 text-white font-medium rounded-xl hover:shadow-lg transition-all"
                    >
                        <Plus className="w-5 h-5" />
                        İlan Ekle
                    </Link>
                </motion.div>
            )}
        </div>
    );
}
