"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import { Shield, ShieldAlert, Clock, MapPin, Monitor } from "lucide-react";
import { subscribeToAuditLogs, type AuditLogEntry } from "@/lib/security";

// Demo data for when Supabase is not configured
const demoLogs: AuditLogEntry[] = [
    { id: "1", ip_address: "192.168.1.1", timestamp: new Date(), user_agent: "Chrome/120", status: "success", geo_location: "İstanbul, Türkiye" },
    { id: "2", ip_address: "10.0.0.55", timestamp: new Date(Date.now() - 300000), user_agent: "Safari/17", status: "fail", geo_location: "Ankara, Türkiye" },
    { id: "3", ip_address: "172.16.0.12", timestamp: new Date(Date.now() - 600000), user_agent: "Firefox/121", status: "success", geo_location: "İzmir, Türkiye" },
];

export function IPMonitorWidget() {
    const [logs, setLogs] = useState<AuditLogEntry[]>(demoLogs);
    const [isLive, setIsLive] = useState(false);

    useEffect(() => {
        const isSupabaseConfigured = Boolean(
            process.env.NEXT_PUBLIC_SUPABASE_URL &&
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
        );

        if (isSupabaseConfigured) {
            setIsLive(true);
            const unsubscribe = subscribeToAuditLogs((data) => {
                setLogs(data.length > 0 ? data : demoLogs);
            });
            return () => unsubscribe();
        }
    }, []);

    const formatTime = (date: Date) => {
        return new Intl.DateTimeFormat("tr-TR", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
        }).format(date);
    };

    return (
        <div className="overflow-hidden">
            {/* Header with Chrome Effect */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <div
                        className="p-1.5 rounded-lg"
                        style={{
                            background: 'linear-gradient(135deg, rgba(59,130,246,0.3) 0%, rgba(139,92,246,0.3) 100%)',
                            boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.1)'
                        }}
                    >
                        <Shield className="h-4 w-4 text-blue-400" />
                    </div>
                    <span
                        className="font-semibold text-sm"
                        style={{
                            background: 'linear-gradient(180deg, #ffffff 0%, #a0a0a0 100%)',
                            backgroundClip: 'text',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                        }}
                    >
                        Güvenlik Monitörü
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    <motion.span
                        className={`h-2 w-2 rounded-full ${isLive ? "bg-emerald-400" : "bg-gray-500"}`}
                        animate={isLive ? { opacity: [1, 0.4, 1], scale: [1, 0.9, 1] } : {}}
                        transition={{ duration: 2, repeat: Infinity }}
                    />
                    <span className="text-xs text-gray-500 font-medium">{isLive ? "Canlı" : "Demo"}</span>
                </div>
            </div>

            {/* Logs Table with Liquid Metal Styling */}
            <div className="overflow-x-auto -mx-5">
                <table className="w-full min-w-[400px]">
                    <thead>
                        <tr className="border-b border-white/[0.06]">
                            <th className="text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider px-5 py-2">Durum</th>
                            <th className="text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider px-5 py-2">IP Adresi</th>
                            <th className="text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider px-5 py-2 hidden sm:table-cell">Konum</th>
                            <th className="text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider px-5 py-2">Tarayıcı</th>
                        </tr>
                    </thead>
                    <tbody>
                        <AnimatePresence mode="popLayout">
                            {logs.slice(0, 5).map((log, index) => (
                                <motion.tr
                                    key={log.id}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, height: 0 }}
                                    transition={{
                                        type: "spring",
                                        stiffness: 400,
                                        damping: 30,
                                        delay: index * 0.05
                                    }}
                                    className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors"
                                >
                                    <td className="px-5 py-3">
                                        {log.status === "success" ? (
                                            <span
                                                className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-semibold text-emerald-400"
                                                style={{
                                                    background: 'linear-gradient(135deg, rgba(16,185,129,0.2) 0%, rgba(34,197,94,0.1) 100%)',
                                                    boxShadow: 'inset 0 0 0 1px rgba(16,185,129,0.3), 0 2px 4px rgba(0,0,0,0.2)'
                                                }}
                                            >
                                                <motion.span
                                                    className="w-1.5 h-1.5 rounded-full bg-emerald-400"
                                                    animate={{ opacity: [1, 0.4, 1] }}
                                                    transition={{ duration: 2, repeat: Infinity }}
                                                />
                                                Güvenli
                                            </span>
                                        ) : (
                                            <span
                                                className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-semibold text-rose-400"
                                                style={{
                                                    background: 'linear-gradient(135deg, rgba(244,63,94,0.2) 0%, rgba(239,68,68,0.1) 100%)',
                                                    boxShadow: 'inset 0 0 0 1px rgba(244,63,94,0.3), 0 2px 4px rgba(0,0,0,0.2)'
                                                }}
                                            >
                                                <ShieldAlert className="h-3 w-3" />
                                                Engellendi
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-5 py-3">
                                        <span
                                            className="font-mono text-xs"
                                            style={{
                                                background: 'linear-gradient(180deg, #e0e0e0 0%, #808080 100%)',
                                                backgroundClip: 'text',
                                                WebkitBackgroundClip: 'text',
                                                WebkitTextFillColor: 'transparent',
                                            }}
                                        >
                                            {log.ip_address}
                                        </span>
                                    </td>
                                    <td className="px-5 py-3 hidden sm:table-cell">
                                        <span className="flex items-center gap-1 text-[11px] text-gray-500">
                                            <MapPin className="h-3 w-3" />
                                            {log.geo_location?.split(',')[0]}
                                        </span>
                                    </td>
                                    <td className="px-5 py-3">
                                        <span className="flex items-center gap-1 text-[11px] text-gray-500">
                                            <Monitor className="h-3 w-3" />
                                            {log.user_agent.split("/")[0]}
                                        </span>
                                    </td>
                                </motion.tr>
                            ))}
                        </AnimatePresence>
                    </tbody>
                </table>
            </div>

            {logs.length === 0 && (
                <div className="py-8 text-center text-gray-500 text-sm">
                    Henüz kayıt bulunmuyor
                </div>
            )}
        </div>
    );
}
