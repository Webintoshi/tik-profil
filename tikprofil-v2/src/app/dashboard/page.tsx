"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
    Building2, QrCode, LayoutGrid, Package,
    ArrowUpRight, Clock, Search,
    TrendingUp, Activity
} from "lucide-react";
import { IPMonitorWidget } from "@/components/dashboard";

interface DashboardStats {
    totalBusinesses: number;
    totalTables: number;
    totalCategories: number;
    totalProducts: number;
    totalQRScans: number;
    activeBusinesses: number;
    businessesToday: number;
    businessesWeek: number;
    businessesMonth: number;
    qrScansToday: number;
    qrScansWeek: number;
    qrScansMonth: number;
}

interface RecentBusiness {
    id: string;
    name: string;
    slug: string;
    owner: string;
    status: string;
    createdAt: string;
    plan_id?: string;
}

// Liquid Metal Card with Chrome Effect
const LiquidMetalCard = ({ children, className = "", delay = 0 }: {
    children: React.ReactNode,
    className?: string,
    delay?: number
}) => (
    <motion.div
        initial={{ opacity: 0, y: 30, rotateX: -10 }}
        animate={{ opacity: 1, y: 0, rotateX: 0 }}
        transition={{ duration: 0.7, delay, ease: [0.23, 1, 0.32, 1] }}
        className={`
            group relative overflow-hidden rounded-3xl
            bg-gradient-to-br from-[#1a1a2e] via-[#16162a] to-[#0f0f1a]
            border border-white/[0.1]
            ${className}
        `}
        style={{
            boxShadow: `
                0 0 0 1px rgba(255,255,255,0.05),
                0 20px 50px -10px rgba(0,0,0,0.5),
                inset 0 1px 1px rgba(255,255,255,0.1),
                inset 0 -1px 1px rgba(0,0,0,0.3)
            `
        }}
    >
        {/* Liquid Metal Reflection */}
        <div className="absolute inset-0 opacity-30">
            <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-transparent" />
        </div>

        {/* Flowing Chrome Shine */}
        <motion.div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.15] to-transparent -skew-x-12"
            initial={{ x: '-200%' }}
            animate={{ x: '200%' }}
            transition={{
                duration: 3,
                repeat: Infinity,
                repeatDelay: 5,
                ease: "easeInOut"
            }}
        />

        {/* Content */}
        <div className="relative z-10">{children}</div>
    </motion.div>
);

// Metallic Stat Box with Liquid Chrome Effect
const MetallicStatBox = ({ label, value, subtext, icon: Icon, metalColor, delay }: {
    label: string;
    value: string | number;
    subtext?: string;
    icon: React.ElementType;
    metalColor: string;
    delay: number;
}) => (
    <LiquidMetalCard delay={delay} className="p-6 hover:scale-[1.02] transition-transform duration-500 cursor-pointer">
        {/* Metallic Orb with Chrome Effect */}
        <motion.div
            className={`absolute -top-16 -right-16 w-40 h-40 rounded-full blur-3xl opacity-40 ${metalColor}`}
            animate={{
                scale: [1, 1.2, 1],
                opacity: [0.3, 0.5, 0.3],
            }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        />

        <div className="relative z-10">
            <div className="flex justify-between items-start mb-6">
                {/* Icon with Liquid Metal Effect */}
                <div className="relative">
                    <div className={`absolute inset-0 rounded-2xl ${metalColor} blur-lg opacity-50`} />
                    <div
                        className="relative p-4 rounded-2xl overflow-hidden"
                        style={{
                            background: `linear-gradient(135deg, 
                                rgba(255,255,255,0.2) 0%, 
                                rgba(255,255,255,0.05) 50%, 
                                rgba(0,0,0,0.1) 100%)`,
                            boxShadow: `
                                inset 0 1px 2px rgba(255,255,255,0.3),
                                inset 0 -1px 2px rgba(0,0,0,0.2),
                                0 4px 12px rgba(0,0,0,0.3)
                            `
                        }}
                    >
                        <Icon className="w-6 h-6 text-white" />
                    </div>
                </div>
                <ArrowUpRight className="w-5 h-5 text-white/20 group-hover:text-white/60 group-hover:translate-x-1 group-hover:-translate-y-1 transition-all duration-300" />
            </div>

            {/* Value with Chrome Text Effect */}
            <div>
                <h3
                    className="text-4xl font-black mb-2 tracking-tight"
                    style={{
                        background: 'linear-gradient(180deg, #ffffff 0%, #a0a0a0 50%, #ffffff 100%)',
                        backgroundClip: 'text',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        textShadow: '0 2px 10px rgba(255,255,255,0.1)'
                    }}
                >
                    {value}
                </h3>
                <p className="text-sm text-gray-400 font-medium">{label}</p>
                {subtext && <p className="text-xs text-gray-500 mt-2">{subtext}</p>}
            </div>
        </div>
    </LiquidMetalCard>
);

export default function DashboardPage() {
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [recentBusinesses, setRecentBusinesses] = useState<RecentBusiness[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const { getSupabaseClient } = await import("@/lib/supabase");
                const { getCollectionREST } = await import("@/lib/documentStore");

                const supabase = getSupabaseClient();

                const [businessesResult, tablesResult, categoriesResult, productsResult, qrScans] = await Promise.all([
                    supabase.from("businesses").select('*'),
                    supabase.from("fb_tables").select('*'),
                    supabase.from("fb_categories").select('*'),
                    supabase.from("fb_products").select('*'),
                    getCollectionREST("qr_scans").catch(() => []),
                ]);

                if (businessesResult.error || tablesResult.error || categoriesResult.error || productsResult.error) {
                    throw businessesResult.error || tablesResult.error || categoriesResult.error || productsResult.error;
                }

                const businesses = businessesResult.data || [];
                const tables = tablesResult.data || [];
                const categories = categoriesResult.data || [];
                const products = productsResult.data || [];

                const now = new Date();
                const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
                const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
                const monthStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

                const getCreatedAt = (business: Record<string, unknown>) =>
                    (business.createdAt as string) || (business.created_at as string) || '';

                setStats({
                    totalBusinesses: businesses.length,
                    totalTables: tables.length,
                    totalCategories: categories.length,
                    totalProducts: products.length,
                    totalQRScans: qrScans.length,
                    activeBusinesses: businesses.filter(b => b.status === "active").length,
                    businessesToday: businesses.filter(b => getCreatedAt(b) >= todayStart).length,
                    businessesWeek: businesses.filter(b => getCreatedAt(b) >= weekStart).length,
                    businessesMonth: businesses.filter(b => getCreatedAt(b) >= monthStart).length,
                    qrScansToday: qrScans.filter(s => (s.createdAt as string) >= todayStart).length,
                    qrScansWeek: qrScans.filter(s => (s.createdAt as string) >= weekStart).length,
                    qrScansMonth: qrScans.filter(s => (s.createdAt as string) >= monthStart).length,
                });

                setRecentBusinesses([...businesses]
                    .sort((a, b) => new Date(getCreatedAt(b)).getTime() - new Date(getCreatedAt(a)).getTime())
                    .slice(0, 5)
                    .map(b => ({
                        id: b.id as string,
                        name: b.name as string,
                        slug: b.slug as string,
                        owner: b.owner as string || "Bilinmiyor",
                        status: b.status as string,
                        createdAt: getCreatedAt(b),
                    }))
                );
            } catch (error) {
                console.error("Dashboard fetch error:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchStats();
        const interval = setInterval(fetchStats, 30000);
        return () => clearInterval(interval);
    }, []);

    const getTimeGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return "Günaydın";
        if (hour < 18) return "İyi Günler";
        return "İyi Akşamlar";
    };

    return (
        <div className="space-y-8">
            {/* Header with Chrome Text */}
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
                <motion.div
                    initial={{ opacity: 0, x: -40 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.8, ease: [0.23, 1, 0.32, 1] }}
                    className="space-y-2"
                >
                    <motion.p
                        className="font-bold tracking-[0.3em] text-xs uppercase"
                        style={{
                            background: 'linear-gradient(90deg, #3b82f6, #8b5cf6, #ec4899, #3b82f6)',
                            backgroundSize: '300% 100%',
                            backgroundClip: 'text',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                        }}
                        animate={{ backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'] }}
                        transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
                    >

                        Kontrol Merkezi
                    </motion.p>
                    <h1
                        className="text-4xl lg:text-5xl font-black tracking-tight"
                        style={{
                            background: 'linear-gradient(180deg, #ffffff 0%, #c0c0c0 40%, #ffffff 60%, #a0a0a0 100%)',
                            backgroundClip: 'text',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                        }}
                    >
                        {getTimeGreeting()}, <span className="opacity-60">Admin</span>
                    </h1>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, x: 40 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.8, ease: [0.23, 1, 0.32, 1] }}
                >
                    {/* Metallic Search Box */}
                    <div className="relative group">
                        <div className="absolute -inset-1 bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-pink-500/20 rounded-2xl blur-lg opacity-0 group-focus-within:opacity-100 transition-opacity duration-500" />
                        <div
                            className="relative flex items-center"
                            style={{
                                background: 'linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 100%)',
                                borderRadius: '1rem',
                                boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.1), 0 4px 20px rgba(0,0,0,0.3)'
                            }}
                        >
                            <Search className="absolute left-4 w-4 h-4 text-gray-500 group-focus-within:text-cyan-400 transition-colors" />
                            <input
                                type="text"
                                placeholder="İşletme veya özellik ara..."
                                className="bg-transparent py-3.5 pl-11 pr-6 w-full md:w-96 text-sm focus:outline-none placeholder:text-gray-600 text-gray-200"
                            />
                        </div>
                    </div>
                </motion.div>
            </header>

            {/* Main Stats - Metallic Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                <MetallicStatBox
                    label="Toplam İşletme"
                    value={isLoading ? "—" : stats?.totalBusinesses ?? 0}
                    subtext={`${stats?.businessesMonth ?? 0} yeni (30 gün)`}
                    icon={Building2}
                    metalColor="bg-blue-500"
                    delay={0.1}
                />
                <MetallicStatBox
                    label="QR Taramaları"
                    value={isLoading ? "—" : stats?.totalQRScans ?? 0}
                    subtext={`${stats?.qrScansToday ?? 0} bugün`}
                    icon={QrCode}
                    metalColor="bg-orange-500"
                    delay={0.2}
                />
                <MetallicStatBox
                    label="Toplam Ürün"
                    value={isLoading ? "—" : stats?.totalProducts ?? 0}
                    subtext={`${stats?.totalCategories ?? 0} kategoride`}
                    icon={Package}
                    metalColor="bg-purple-500"
                    delay={0.3}
                />
                <MetallicStatBox
                    label="Aktif Masalar"
                    value={isLoading ? "—" : stats?.totalTables ?? 0}
                    subtext="Canlı masa durumu"
                    icon={LayoutGrid}
                    metalColor="bg-emerald-500"
                    delay={0.4}
                />
            </div>

            {/* Secondary Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Recent Registrations - Liquid Metal Table */}
                <LiquidMetalCard className="lg:col-span-2 min-h-[420px]" delay={0.5}>
                    <div className="p-6 border-b border-white/[0.06] flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <div
                                className="p-2.5 rounded-xl"
                                style={{
                                    background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                                    boxShadow: '0 4px 15px rgba(99,102,241,0.4), inset 0 1px 1px rgba(255,255,255,0.2)'
                                }}
                            >
                                <Clock className="w-5 h-5 text-white" />
                            </div>
                            <h3
                                className="text-lg font-bold"
                                style={{
                                    background: 'linear-gradient(180deg, #ffffff 0%, #a0a0a0 100%)',
                                    backgroundClip: 'text',
                                    WebkitBackgroundClip: 'text',
                                    WebkitTextFillColor: 'transparent',
                                }}
                            >
                                Son Kayıtlar
                            </h3>
                        </div>
                        <button className="text-xs font-medium text-cyan-400 hover:text-cyan-300 transition-colors px-3 py-1.5 rounded-lg hover:bg-cyan-500/10">
                            Tümünü Gör
                        </button>
                    </div>

                    <div className="p-2">
                        {isLoading ? (
                            <div className="flex items-center justify-center h-64">
                                <motion.div
                                    className="w-10 h-10 rounded-full border-2 border-cyan-500 border-t-transparent"
                                    animate={{ rotate: 360 }}
                                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                />
                            </div>
                        ) : recentBusinesses.length === 0 ? (
                            <div className="flex items-center justify-center h-64 text-gray-500">Henüz kayıt yok</div>
                        ) : (
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="text-xs text-gray-500 font-medium border-b border-white/[0.04]">
                                        <th className="px-6 py-4 font-medium uppercase tracking-wider">İşletme</th>
                                        <th className="px-6 py-4 font-medium uppercase tracking-wider">Plan</th>
                                        <th className="px-6 py-4 font-medium uppercase tracking-wider">Durum</th>
                                        <th className="px-6 py-4 font-medium uppercase tracking-wider text-right">Tarih</th>
                                    </tr>
                                </thead>
                                <tbody className="text-sm">
                                    {recentBusinesses.map((business) => (
                                        <tr key={business.id} className="group hover:bg-white/[0.03] transition-colors border-b border-white/[0.04] last:border-0">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div
                                                        className="w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold text-white"
                                                        style={{
                                                            background: 'linear-gradient(135deg, #374151 0%, #1f2937 100%)',
                                                            boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.1), 0 2px 8px rgba(0,0,0,0.3)'
                                                        }}
                                                    >
                                                        {business.name.substring(0, 2).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <p className="font-semibold text-gray-200 group-hover:text-white transition-colors">
                                                            {business.name}
                                                        </p>
                                                        <p className="text-xs text-gray-500">/{business.slug}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span
                                                    className="inline-flex items-center px-3 py-1 rounded-lg text-xs font-medium text-cyan-300"
                                                    style={{
                                                        background: 'linear-gradient(135deg, rgba(34,211,238,0.15) 0%, rgba(59,130,246,0.15) 100%)',
                                                        boxShadow: 'inset 0 0 0 1px rgba(34,211,238,0.2)'
                                                    }}
                                                >
                                                    Premium
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-lg text-xs font-medium ${business.status === 'active'
                                                    ? 'text-emerald-400'
                                                    : 'text-red-400'
                                                    }`}
                                                    style={{
                                                        background: business.status === 'active'
                                                            ? 'linear-gradient(135deg, rgba(16,185,129,0.15) 0%, rgba(34,197,94,0.15) 100%)'
                                                            : 'linear-gradient(135deg, rgba(239,68,68,0.15) 0%, rgba(220,38,38,0.15) 100%)',
                                                        boxShadow: `inset 0 0 0 1px ${business.status === 'active' ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}`
                                                    }}>
                                                    <motion.span
                                                        className={`w-1.5 h-1.5 rounded-full ${business.status === 'active' ? 'bg-emerald-400' : 'bg-red-400'}`}
                                                        animate={business.status === 'active' ? { opacity: [1, 0.4, 1] } : {}}
                                                        transition={{ duration: 2, repeat: Infinity }}
                                                    />
                                                    {business.status === 'active' ? 'Aktif' : 'Pasif'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right text-gray-500 font-mono text-xs">
                                                {new Date(business.createdAt).toLocaleDateString('tr-TR')}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </LiquidMetalCard>

                {/* Side Widgets */}
                <div className="space-y-6">
                    {/* Live Activity */}
                    <LiquidMetalCard delay={0.6}>
                        <div className="p-5 border-b border-white/[0.06] flex items-center gap-3">
                            <div
                                className="p-2 rounded-xl"
                                style={{
                                    background: 'linear-gradient(135deg, #ec4899 0%, #f43f5e 100%)',
                                    boxShadow: '0 4px 15px rgba(236,72,153,0.4), inset 0 1px 1px rgba(255,255,255,0.2)'
                                }}
                            >
                                <Activity className="w-4 h-4 text-white" />
                            </div>
                            <h3 className="font-semibold text-white">Canlı Aktivite</h3>
                        </div>
                        <div className="p-5">
                            <IPMonitorWidget />
                        </div>
                    </LiquidMetalCard>

                    {/* Growth Report - Full Liquid Metal */}
                    <LiquidMetalCard delay={0.7}>
                        <div className="relative p-6 overflow-hidden">
                            {/* Animated Liquid Metal Background */}
                            <motion.div
                                className="absolute inset-0"
                                style={{
                                    background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 50%, #ec4899 100%)',
                                }}
                            />

                            {/* Flowing Chrome Reflection */}
                            <motion.div
                                className="absolute inset-0"
                                style={{
                                    background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.3) 50%, transparent 100%)',
                                }}
                                animate={{ x: ['-100%', '200%'] }}
                                transition={{ duration: 2, repeat: Infinity, repeatDelay: 3, ease: "easeInOut" }}
                            />

                            {/* Content */}
                            <div className="relative z-10">
                                <div className="absolute top-0 right-0 opacity-20">
                                    <TrendingUp className="w-24 h-24 text-white" />
                                </div>
                                <h3
                                    className="text-xl font-black text-white mb-2"
                                    style={{ textShadow: '0 2px 10px rgba(0,0,0,0.3)' }}
                                >
                                    Büyüme Raporu
                                </h3>
                                <p className="text-white/80 text-sm mb-6 max-w-[85%]">
                                    Bu ay toplam {stats?.businessesMonth ?? 0} yeni işletme platforma katıldı.
                                </p>
                                <button
                                    className="px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:scale-105"
                                    style={{
                                        background: 'linear-gradient(135deg, rgba(255,255,255,0.25) 0%, rgba(255,255,255,0.1) 100%)',
                                        boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.3), 0 4px 15px rgba(0,0,0,0.2)',
                                        backdropFilter: 'blur(10px)'
                                    }}
                                >
                                    Detaylı Analiz
                                </button>
                            </div>
                        </div>
                    </LiquidMetalCard>
                </div>
            </div>
        </div>
    );
}

