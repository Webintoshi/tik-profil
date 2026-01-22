"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
    BarChart3,
    TrendingUp,
    Clock,
    Award,
    Eye,
    Loader2
} from "lucide-react";
import { useTheme } from "@/components/panel/ThemeProvider";
import { useBusinessSession } from "@/hooks/useBusinessSession";
import clsx from "clsx";
import { FBTable, getTables } from "@/lib/services/foodService";

// Peak hours simulation (will be replaced with real data later)
const PEAK_HOURS = [
    { hour: "12:00", count: 45 },
    { hour: "13:00", count: 78 },
    { hour: "14:00", count: 56 },
    { hour: "18:00", count: 89 },
    { hour: "19:00", count: 145 },
    { hour: "20:00", count: 167 },
    { hour: "21:00", count: 134 },
    { hour: "22:00", count: 67 },
];

export default function AnalyticsPage() {
    const { isDark } = useTheme();
    const { session, isLoading: sessionLoading } = useBusinessSession();

    const [tables, setTables] = useState<FBTable[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Theme colors
    const cardBg = isDark ? "bg-[#111]" : "bg-white";
    const borderColor = isDark ? "border-[#222]" : "border-gray-200";
    const textPrimary = isDark ? "text-white" : "text-gray-900";
    const textSecondary = isDark ? "text-gray-400" : "text-gray-600";

    // Load tables data
    useEffect(() => {
        if (!session?.businessId) return;

        const loadData = async () => {
            try {
                const data = await getTables(session.businessId);
                setTables(data);
            } catch (error) {
                console.error("Error loading tables:", error);
            } finally {
                setIsLoading(false);
            }
        };

        loadData();
    }, [session?.businessId]);

    // Get color based on scan count
    const getHeatColor = (count: number) => {
        if (count < 10) return { bg: "bg-blue-500", text: "text-blue-500", label: "Düşük" };
        if (count < 100) return { bg: "bg-emerald-500", text: "text-emerald-500", label: "Normal" };
        return { bg: "bg-red-500", text: "text-red-500", label: "Yoğun" };
    };

    // Stats
    const totalScans = tables.reduce((sum, t) => sum + t.scan_count, 0);
    const topTable = tables.length > 0
        ? tables.reduce((max, t) => t.scan_count > max.scan_count ? t : max, tables[0])
        : null;
    const peakHour = PEAK_HOURS.reduce((max, h) => h.count > max.count ? h : max, PEAK_HOURS[0]);
    const avgScans = tables.length > 0 ? Math.round(totalScans / tables.length) : 0;

    // Loading state
    if (sessionLoading || isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
            </div>
        );
    }

    return (
        <div className="min-h-screen p-6">
            {/* Header */}
            <div className="mb-8">
                <h1 className={clsx("text-2xl font-bold mb-2", textPrimary)}>
                    📈 Masa Analizi
                </h1>
                <p className={textSecondary}>
                    QR tarama verileri
                </p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={clsx("rounded-2xl border p-5", cardBg, borderColor)}
                >
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                            <Eye className="w-5 h-5 text-emerald-500" />
                        </div>
                    </div>
                    <p className={clsx("text-2xl font-bold", textPrimary)}>{totalScans}</p>
                    <p className={textSecondary}>Toplam Tarama</p>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className={clsx("rounded-2xl border p-5", cardBg, borderColor)}
                >
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center">
                            <Award className="w-5 h-5 text-orange-500" />
                        </div>
                    </div>
                    <p className={clsx("text-2xl font-bold", textPrimary)}>{topTable?.name || "-"}</p>
                    <p className={textSecondary}>En Popüler Masa</p>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className={clsx("rounded-2xl border p-5", cardBg, borderColor)}
                >
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
                            <Clock className="w-5 h-5 text-purple-500" />
                        </div>
                    </div>
                    <p className={clsx("text-2xl font-bold", textPrimary)}>{peakHour.hour}</p>
                    <p className={textSecondary}>En Yoğun Saat</p>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className={clsx("rounded-2xl border p-5", cardBg, borderColor)}
                >
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                            <TrendingUp className="w-5 h-5 text-blue-500" />
                        </div>
                    </div>
                    <p className={clsx("text-2xl font-bold", textPrimary)}>{avgScans}</p>
                    <p className={textSecondary}>Ortalama Tarama</p>
                </motion.div>
            </div>

            {/* Heatmap Grid */}
            {tables.length > 0 ? (
                <div className={clsx("rounded-2xl border p-6 mb-8", cardBg, borderColor)}>
                    <div className="flex items-center justify-between mb-6">
                        <h2 className={clsx("font-bold text-lg", textPrimary)}>Masa Isı Haritası</h2>
                        <div className="flex items-center gap-4 text-sm">
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-blue-500" />
                                <span className={textSecondary}>Düşük</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-emerald-500" />
                                <span className={textSecondary}>Normal</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-red-500" />
                                <span className={textSecondary}>Yoğun</span>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3">
                        {tables.map((table, index) => {
                            const heat = getHeatColor(table.scan_count);
                            return (
                                <motion.div
                                    key={table.id}
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: index * 0.05 }}
                                    className={clsx(
                                        "relative rounded-xl p-4 text-center transition-all hover:scale-105 cursor-pointer border-2",
                                        isDark
                                            ? "bg-white/5 border-white/10 hover:border-white/20"
                                            : "bg-white border-gray-200 hover:border-gray-300 shadow-md hover:shadow-lg"
                                    )}
                                >
                                    {/* Heat indicator */}
                                    <div className={clsx(
                                        "absolute top-2 right-2 w-3 h-3 rounded-full ring-2",
                                        heat.bg,
                                        isDark ? "ring-black/50" : "ring-white"
                                    )} />

                                    <p className={clsx("font-semibold text-sm mb-1", textPrimary)}>
                                        {table.name}
                                    </p>
                                    <p className={clsx("text-2xl font-bold", heat.text)}>
                                        {table.scan_count}
                                    </p>
                                    <p className={clsx("text-xs", textSecondary)}>
                                        tarama
                                    </p>
                                </motion.div>
                            );
                        })}
                    </div>
                </div>
            ) : (
                <div className={clsx("text-center py-16 rounded-2xl border mb-8", cardBg, borderColor)}>
                    <BarChart3 className={clsx("w-12 h-12 mx-auto mb-4", textSecondary)} />
                    <p className={textSecondary}>Henüz masa eklenmemiş</p>
                    <p className={clsx("text-sm mt-1", textSecondary)}>
                        Önce &quot;Masa Düzeni&quot; sayfasından masalarınızı ekleyin
                    </p>
                </div>
            )}

            {/* Peak Hours Chart */}
            <div className={clsx("rounded-2xl border p-6", cardBg, borderColor)}>
                <h2 className={clsx("font-bold text-lg mb-6", textPrimary)}>Saatlik Dağılım</h2>

                <div className="flex items-end gap-2 h-48">
                    {PEAK_HOURS.map((hour, index) => {
                        const maxCount = Math.max(...PEAK_HOURS.map(h => h.count));
                        const height = (hour.count / maxCount) * 100;

                        return (
                            <motion.div
                                key={hour.hour}
                                initial={{ height: 0 }}
                                animate={{ height: `${height}%` }}
                                transition={{ delay: index * 0.1, duration: 0.5 }}
                                className="flex-1 flex flex-col items-center"
                            >
                                <div
                                    className={clsx(
                                        "w-full rounded-t-lg transition-colors",
                                        height > 80 ? "bg-red-500" : height > 50 ? "bg-emerald-500" : "bg-blue-500"
                                    )}
                                    style={{ height: '100%', minHeight: '20px' }}
                                />
                                <p className={clsx("text-xs mt-2 font-medium", textSecondary)}>
                                    {hour.hour}
                                </p>
                            </motion.div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
