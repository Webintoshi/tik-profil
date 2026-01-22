"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Activity,
    LogIn,
    QrCode,
    RefreshCw,
    Loader2,
    FileEdit,
    Clock,
    User,
    Globe,
} from "lucide-react";
import clsx from "clsx";
import {
    getActivityLogs,
    formatLogMessage,
    formatLogTime,
    ACTION_CONFIG,
    type AuditLogDocument,
    type LogFilter,
} from "@/lib/services/auditService";

// ============================================
// FILTER TABS
// ============================================
const FILTER_TABS: { id: LogFilter; label: string; icon: React.ReactNode }[] = [
    { id: "all", label: "Tümü", icon: <Activity className="h-4 w-4" /> },
    { id: "login", label: "Girişler", icon: <LogIn className="h-4 w-4" /> },
    { id: "qr", label: "QR İşlemleri", icon: <QrCode className="h-4 w-4" /> },
    { id: "update", label: "Güncellemeler", icon: <FileEdit className="h-4 w-4" /> },
];

// ============================================
// ACTION ICONS
// ============================================
function ActionIcon({ actionType }: { actionType: string }) {
    const config = ACTION_CONFIG[actionType as keyof typeof ACTION_CONFIG];

    if (!config) {
        return <Activity className="h-4 w-4 text-gray-400" />;
    }

    // Map action types to icons
    switch (actionType) {
        case "LOGIN":
        case "ADMIN_LOGIN":
            return <LogIn className={clsx("h-4 w-4", config.color)} />;
        case "QR_DOWNLOAD":
            return <QrCode className={clsx("h-4 w-4", config.color)} />;
        case "PROFILE_UPDATE":
        case "BUSINESS_UPDATE":
        case "SCHEDULE_CHANGE":
            return <FileEdit className={clsx("h-4 w-4", config.color)} />;
        case "MODULE_CHANGE":
            return <Clock className={clsx("h-4 w-4", config.color)} />;
        default:
            return <Activity className={clsx("h-4 w-4", config.color)} />;
    }
}

// ============================================
// LOG ITEM COMPONENT
// ============================================
function LogItem({ log, index }: { log: AuditLogDocument; index: number }) {
    const config = ACTION_CONFIG[log.action_type as keyof typeof ACTION_CONFIG];

    return (
        <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.03 }}
            className="flex items-start gap-4 p-4 rounded-xl bg-white/[0.02] hover:bg-white/[0.05] transition-colors border border-white/5"
        >
            {/* Icon */}
            <div className={clsx(
                "flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center",
                log.action_type === "LOGIN" && "bg-green-500/10",
                log.action_type === "QR_DOWNLOAD" && "bg-purple-500/10",
                log.action_type.includes("UPDATE") && "bg-blue-500/10",
                log.action_type === "SCHEDULE_CHANGE" && "bg-blue-500/10",
                log.action_type === "MODULE_CHANGE" && "bg-orange-500/10",
                log.action_type === "ADMIN_LOGIN" && "bg-gray-500/10",
            )}>
                <ActionIcon actionType={log.action_type} />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
                <p className="text-white/90 text-sm">
                    {formatLogMessage(log)}
                </p>
                <div className="flex items-center gap-3 mt-1.5">
                    <span className={clsx(
                        "text-xs px-2 py-0.5 rounded-full",
                        config?.color || "text-gray-400",
                        "bg-white/5"
                    )}>
                        {config?.label || log.action_type}
                    </span>
                    <span className="text-xs text-white/30 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatLogTime(log.timestamp)}
                    </span>
                    {log.ip_address && log.ip_address !== "unknown" && (
                        <span className="text-xs text-white/20 flex items-center gap-1">
                            <Globe className="h-3 w-3" />
                            {log.ip_address.split(",")[0]}
                        </span>
                    )}
                </div>
            </div>

            {/* Actor avatar */}
            <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center">
                <User className="h-4 w-4 text-white/30" />
            </div>
        </motion.div>
    );
}

// ============================================
// MAIN PAGE COMPONENT
// ============================================
export default function SystemLogsPage() {
    const [logs, setLogs] = useState<AuditLogDocument[]>([]);
    const [filter, setFilter] = useState<LogFilter>("all");
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);

    // Fetch logs
    const fetchLogs = async (showRefresh = false) => {
        if (showRefresh) setIsRefreshing(true);
        else setIsLoading(true);

        try {
            const data = await getActivityLogs(filter, 100);
            setLogs(data);
        } catch (error) {
            console.error("Error fetching logs:", error);
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    };

    // Initial load and filter change
    useEffect(() => {
        fetchLogs();
    }, [filter]);

    return (
        <div className="min-h-screen bg-[#0a0a0a] p-6">
            <div className="max-w-5xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-2xl font-bold text-white">Sistem Kayıtları</h1>
                        <p className="text-white/50 text-sm mt-1">
                            Tüm işletme aktivitelerini izleyin
                        </p>
                    </div>
                    <button
                        onClick={() => fetchLogs(true)}
                        disabled={isRefreshing}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 text-white/70 hover:bg-white/10 transition-colors disabled:opacity-50"
                    >
                        <RefreshCw className={clsx("h-4 w-4", isRefreshing && "animate-spin")} />
                        Yenile
                    </button>
                </div>

                {/* Filter Tabs */}
                <div className="flex items-center gap-2 mb-6 p-1 bg-white/[0.03] rounded-xl border border-white/5 w-fit">
                    {FILTER_TABS.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setFilter(tab.id)}
                            className={clsx(
                                "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
                                filter === tab.id
                                    ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20"
                                    : "text-white/50 hover:text-white/70 hover:bg-white/5"
                            )}
                        >
                            {tab.icon}
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Logs List */}
                <div className="space-y-3">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-20">
                            <Loader2 className="h-8 w-8 animate-spin text-white/30" />
                        </div>
                    ) : logs.length === 0 ? (
                        <div className="text-center py-20">
                            <Activity className="h-12 w-12 text-white/10 mx-auto mb-4" />
                            <p className="text-white/40">Henüz kayıt bulunmuyor</p>
                            <p className="text-white/20 text-sm mt-1">
                                İşletme aktiviteleri burada görünecek
                            </p>
                        </div>
                    ) : (
                        <AnimatePresence mode="popLayout">
                            {logs.map((log, index) => (
                                <LogItem key={log.id} log={log} index={index} />
                            ))}
                        </AnimatePresence>
                    )}
                </div>

                {/* Stats Footer */}
                {logs.length > 0 && (
                    <div className="mt-8 pt-6 border-t border-white/5">
                        <p className="text-center text-white/30 text-sm">
                            Toplam {logs.length} kayıt gösteriliyor
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
