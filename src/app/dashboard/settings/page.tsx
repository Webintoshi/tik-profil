"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PageHeader, GlassCard } from "@/components/ui";
import {
    Trash2, RefreshCw, HardDrive, Check, Loader2,
    AlertCircle, Info, AlertTriangle, CheckCircle,
    Filter, Terminal
} from "lucide-react";
import { purgeCache, scanOrphanData, cleanOrphanData } from "@/app/actions/maintenance";
import {
    subscribeToLogs,
    type SystemLog,
    type LogCategory,
    ACTION_LABELS,
    CATEGORY_COLORS,
    logCachePurge,
    logDataCleanup
} from "@/lib/systemLogs";
import clsx from "clsx";



export default function SettingsPage() {
    const [activeTab, setActiveTab] = useState<"maintenance" | "logs">("maintenance");

    return (
        <div className="space-y-6">
            <PageHeader
                title="Sistem Ayarları"
                description="Bakım araçları ve sistem logları"
            />

            {/* Tabs */}
            <div className="flex gap-2">
                <button
                    onClick={() => setActiveTab("maintenance")}
                    className={clsx(
                        "px-4 py-2 rounded-xl text-sm font-medium transition-all",
                        activeTab === "maintenance"
                            ? "bg-accent-blue text-white"
                            : "bg-dark-800 text-dark-400 hover:text-dark-200"
                    )}
                >
                    Sistem Bakımı
                </button>
                <button
                    onClick={() => setActiveTab("logs")}
                    className={clsx(
                        "px-4 py-2 rounded-xl text-sm font-medium transition-all",
                        activeTab === "logs"
                            ? "bg-accent-blue text-white"
                            : "bg-dark-800 text-dark-400 hover:text-dark-200"
                    )}
                >
                    Sistem Logları
                </button>
            </div>

            {/* Content */}
            <AnimatePresence mode="wait">
                {activeTab === "maintenance" ? (
                    <motion.div
                        key="maintenance"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                    >
                        <MaintenanceSuite />
                    </motion.div>
                ) : (
                    <motion.div
                        key="logs"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                    >
                        <LogViewer />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// Maintenance Suite Component
function MaintenanceSuite() {
    const [cacheStatus, setCacheStatus] = useState<"idle" | "running" | "done">("idle");
    const [cacheDuration, setCacheDuration] = useState(0);
    const [orphanStatus, setOrphanStatus] = useState<"idle" | "scanning" | "scanned" | "cleaning" | "done">("idle");
    const [orphanData, setOrphanData] = useState<{ count: number; sizeBytes: number; files: string[] } | null>(null);

    const handleCachePurge = async () => {
        setCacheStatus("running");
        const result = await purgeCache();

        if (result.success) {
            setCacheDuration(result.duration);
            await logCachePurge("webintosh");
        }

        setCacheStatus("done");
        setTimeout(() => setCacheStatus("idle"), 3000);
    };

    const handleOrphanScan = async () => {
        setOrphanStatus("scanning");
        const result = await scanOrphanData();

        if (result.success) {
            setOrphanData(result);
            setOrphanStatus("scanned");
        }
    };

    const handleOrphanClean = async () => {
        if (!orphanData) return;

        setOrphanStatus("cleaning");
        const result = await cleanOrphanData(orphanData.files);

        if (result.success) {
            await logDataCleanup("webintosh", result.cleaned, orphanData.sizeBytes);
            setOrphanStatus("done");
            setTimeout(() => {
                setOrphanStatus("idle");
                setOrphanData(null);
            }, 3000);
        }
    };

    const formatSize = (bytes: number) => {
        const mb = bytes / (1024 * 1024);
        return `${mb.toFixed(1)} MB`;
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Cache Purge Card */}
            <GlassCard className="relative overflow-hidden">
                <div className="flex items-start gap-4">
                    <div className="h-14 w-14 rounded-2xl bg-accent-blue/15 flex items-center justify-center flex-shrink-0">
                        <RefreshCw className={clsx(
                            "h-7 w-7 text-accent-blue",
                            cacheStatus === "running" && "animate-spin"
                        )} />
                    </div>
                    <div className="flex-1">
                        <h3 className="text-lg font-semibold text-dark-100 mb-1">Önbelleği Temizle</h3>
                        <p className="text-sm text-dark-400 mb-4">
                            Tüm önbelleği temizleyerek sistemi yeniler
                        </p>

                        <button
                            onClick={handleCachePurge}
                            disabled={cacheStatus !== "idle"}
                            className={clsx(
                                "flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all",
                                cacheStatus === "done"
                                    ? "bg-accent-green/15 text-accent-green"
                                    : "bg-accent-blue text-white hover:bg-accent-blue/90",
                                cacheStatus === "running" && "opacity-70"
                            )}
                        >
                            {cacheStatus === "running" ? (
                                <><Loader2 className="h-4 w-4 animate-spin" /> Taranıyor...</>
                            ) : cacheStatus === "done" ? (
                                <><Check className="h-4 w-4" /> Temizlendi ({cacheDuration}ms)</>
                            ) : (
                                <><RefreshCw className="h-4 w-4" /> Temizle</>
                            )}
                        </button>
                    </div>
                </div>
            </GlassCard>

            {/* Orphan Data Card */}
            <GlassCard className="relative overflow-hidden">
                <div className="flex items-start gap-4">
                    <div className="h-14 w-14 rounded-2xl bg-accent-orange/15 flex items-center justify-center flex-shrink-0">
                        <HardDrive className="h-7 w-7 text-accent-orange" />
                    </div>
                    <div className="flex-1">
                        <h3 className="text-lg font-semibold text-dark-100 mb-1">Yetim Verileri Temizle</h3>
                        <p className="text-sm text-dark-400 mb-4">
                            Bağlantısız dosyaları tarar ve temizler
                        </p>

                        {orphanStatus === "scanned" && orphanData && (
                            <div className="mb-4 px-3 py-2 rounded-lg bg-accent-orange/10 border border-accent-orange/20">
                                <p className="text-sm text-accent-orange">
                                    {orphanData.count} yetim dosya bulundu ({formatSize(orphanData.sizeBytes)})
                                </p>
                            </div>
                        )}

                        <div className="flex gap-2">
                            {orphanStatus === "scanned" && orphanData ? (
                                <button
                                    onClick={handleOrphanClean}
                                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium bg-accent-orange text-white hover:bg-accent-orange/90 transition-all"
                                >
                                    <Trash2 className="h-4 w-4" /> Temizle
                                </button>
                            ) : (
                                <button
                                    onClick={handleOrphanScan}
                                    disabled={orphanStatus !== "idle"}
                                    className={clsx(
                                        "flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all",
                                        orphanStatus === "done"
                                            ? "bg-accent-green/15 text-accent-green"
                                            : "bg-dark-700 text-dark-200 hover:bg-dark-600",
                                        orphanStatus === "scanning" && "opacity-70"
                                    )}
                                >
                                    {orphanStatus === "scanning" ? (
                                        <><Loader2 className="h-4 w-4 animate-spin" /> Taranıyor...</>
                                    ) : orphanStatus === "cleaning" ? (
                                        <><Loader2 className="h-4 w-4 animate-spin" /> Temizleniyor...</>
                                    ) : orphanStatus === "done" ? (
                                        <><Check className="h-4 w-4" /> Temizlendi</>
                                    ) : (
                                        <><HardDrive className="h-4 w-4" /> Tara</>
                                    )}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </GlassCard>
        </div>
    );
}

// Log Viewer Component
function LogViewer() {
    const [logs, setLogs] = useState<SystemLog[]>([]);
    const [filter, setFilter] = useState<"all" | LogCategory>("all");

    useEffect(() => {
        const isSupabaseConfigured = Boolean(
            process.env.NEXT_PUBLIC_SUPABASE_URL &&
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
        );

        if (isSupabaseConfigured) {
            const unsubscribe = subscribeToLogs((data) => {
                setLogs(data);
            });
            return () => unsubscribe();
        }
    }, []);

    const filteredLogs = filter === "all"
        ? logs
        : logs.filter(log => log.category === filter);

    const formatTime = (date: Date) => {
        return new Intl.DateTimeFormat("tr-TR", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
        }).format(date);
    };

    const getCategoryIcon = (category: LogCategory) => {
        switch (category) {
            case "success": return CheckCircle;
            case "error": return AlertCircle;
            case "warning": return AlertTriangle;
            default: return Info;
        }
    };

    return (
        <div className="space-y-4">
            {/* Filter Bar */}
            <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-dark-500" />
                <div className="flex gap-1">
                    {(["all", "success", "info", "warning", "error"] as const).map((f) => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={clsx(
                                "px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                                filter === f
                                    ? f === "all"
                                        ? "bg-dark-700 text-dark-100"
                                        : `text-white`
                                    : "bg-dark-800 text-dark-400 hover:text-dark-200"
                            )}
                            style={filter === f && f !== "all" ? { backgroundColor: CATEGORY_COLORS[f] } : {}}
                        >
                            {f === "all" ? "Tümü" : f === "success" ? "Başarılı" : f === "error" ? "Hata" : f === "warning" ? "Uyarı" : "Bilgi"}
                        </button>
                    ))}
                </div>
            </div>

            {/* Log List */}
            <GlassCard padding="none" className="overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-3 border-b border-dark-700/50">
                    <Terminal className="h-4 w-4 text-dark-500" />
                    <span className="text-sm font-medium text-dark-300">Sistem Konsolu</span>
                    <span className="text-xs text-dark-500">({filteredLogs.length} kayıt)</span>
                </div>

                <div className="max-h-[500px] overflow-y-auto font-mono text-sm">
                    <AnimatePresence mode="popLayout">
                        {filteredLogs.map((log, index) => {
                            const Icon = getCategoryIcon(log.category);
                            return (
                                <motion.div
                                    key={log.id}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, height: 0 }}
                                    transition={{ delay: index * 0.02 }}
                                    className="flex items-start gap-3 px-4 py-3 border-b border-dark-700/20 hover:bg-dark-800/30"
                                >
                                    <div
                                        className="h-2 w-2 rounded-full mt-1.5 flex-shrink-0"
                                        style={{ backgroundColor: CATEGORY_COLORS[log.category] }}
                                    />
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-dark-500">{formatTime(log.timestamp)}</span>
                                            <span className="text-dark-400">[{log.actor}]</span>
                                            <span
                                                className="text-xs px-1.5 py-0.5 rounded"
                                                style={{
                                                    backgroundColor: `${CATEGORY_COLORS[log.category]}20`,
                                                    color: CATEGORY_COLORS[log.category]
                                                }}
                                            >
                                                {ACTION_LABELS[log.action]}
                                            </span>
                                        </div>
                                        <p className="text-dark-200 truncate">{log.message}</p>
                                    </div>
                                    <Icon
                                        className="h-4 w-4 flex-shrink-0 mt-1"
                                        style={{ color: CATEGORY_COLORS[log.category] }}
                                    />
                                </motion.div>
                            );
                        })}
                    </AnimatePresence>
                </div>

                {filteredLogs.length === 0 && (
                    <div className="text-center py-12 text-dark-500">
                        Kayıt bulunamadı
                    </div>
                )}
            </GlassCard>
        </div>
    );
}
