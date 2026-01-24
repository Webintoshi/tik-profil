"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Bell,
    Check,
    Loader2,
    Clock,
    CheckCircle,
    X,
    Filter,
} from "lucide-react";
import { toast } from "sonner";
import { useBusinessContext } from "@/components/panel/BusinessSessionContext";
import { getSupabaseClient } from "@/lib/supabase";

// Request interface
interface RoomRequest {
    id: string;
    roomNumber: string;
    requestType: string;
    requestLabel: string;
    message?: string;
    status: "pending" | "in_progress" | "completed" | "cancelled";
    createdAt: string;
    completedAt?: string;
}

// Request types config
const REQUEST_TYPES: Record<string, { label: string; icon: string }> = {
    towels: { label: "Temiz Havlu", icon: "🧺" },
    cleaning: { label: "Oda Temizliği", icon: "🧹" },
    toiletries: { label: "Banyo Malzemesi", icon: "🧴" },
    pillows: { label: "Ekstra Yastık", icon: "🛏️" },
    maintenance: { label: "Teknik Destek", icon: "🔧" },
    roomservice: { label: "Oda Servisi", icon: "🍽️" },
    other: { label: "Diğer", icon: "💬" },
};

// Status config
const STATUS_CONFIG = {
    pending: { label: "Bekliyor", color: "bg-yellow-500", textColor: "text-yellow-600" },
    in_progress: { label: "İşleniyor", color: "bg-blue-500", textColor: "text-blue-600" },
    completed: { label: "Tamamlandı", color: "bg-green-500", textColor: "text-green-600" },
    cancelled: { label: "İptal", color: "bg-gray-500", textColor: "text-gray-600" },
};

export default function RequestsPage() {
    const session = useBusinessContext();
    const [requests, setRequests] = useState<RoomRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<"all" | "pending" | "completed">("pending");
    const [updatingId, setUpdatingId] = useState<string | null>(null);
    const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        if (!session?.businessId) {
            setLoading(false);
            return;
        }

        let isActive = true;

        const fetchRequests = async () => {
            try {
                const res = await fetch(`/api/hotel/requests?businessId=${session.businessId}`);
                const data = await res.json();

                if (!isActive) return;

                if (data.success) {
                    setRequests(data.requests || []);
                } else {
                    toast.error(data.error || 'Talep güncellemeleri alınamadı');
                }
                setLoading(false);
            } catch (error) {
                console.error('Hotel requests fetch error:', error);
                if (isActive) {
                    setLoading(false);
                    toast.error('Talep güncellemeleri alınamadı');
                }
            }
        };

        const scheduleRefresh = () => {
            if (refreshTimeoutRef.current) return;
            refreshTimeoutRef.current = setTimeout(() => {
                refreshTimeoutRef.current = null;
                fetchRequests();
            }, 300);
        };

        fetchRequests();

        const supabase = getSupabaseClient();
        const channel = supabase
            .channel(`hotel-requests-${session.businessId}`)
            .on(
                "postgres_changes",
                { event: "*", schema: "public", table: "hotel_requests", filter: `business_id=eq.${session.businessId}` },
                () => {
                    scheduleRefresh();
                }
            )
            .subscribe();

        return () => {
            isActive = false;
            if (refreshTimeoutRef.current) {
                clearTimeout(refreshTimeoutRef.current);
                refreshTimeoutRef.current = null;
            }
            supabase.removeChannel(channel);
        };
    }, [session?.businessId]);

    const handleComplete = async (request: RoomRequest) => {
        setUpdatingId(request.id);
        try {
            const res = await fetch(`/api/hotel/requests/${request.id}/complete`, {
                method: "PATCH",
            });

            const data = await res.json();

            if (data.success) {
                toast.success(`Oda ${request.roomNumber} talebi tamamlandı`);
                setRequests(prev => prev.map(r => r.id === request.id ? { ...r, status: 'completed' as const, completedAt: new Date().toISOString() } : r));
            } else {
                toast.error(data.error || "Hata oluştu");
            }
        } catch (error) {
            console.error("Complete error:", error);
            toast.error("İşlem hatası");
        } finally {
            setUpdatingId(null);
        }
    };

    const handleCancel = async (request: RoomRequest) => {
        if (!confirm("Bu talebi iptal etmek istediğinize emin misiniz?")) return;

        setUpdatingId(request.id);
        try {
            const res = await fetch(`/api/hotel/requests/${request.id}/cancel`, {
                method: "PATCH",
            });

            const data = await res.json();

            if (data.success) {
                toast.success("Talep iptal edildi");
                setRequests(prev => prev.map(r => r.id === request.id ? { ...r, status: 'cancelled' as const } : r));
            } else {
                toast.error(data.error || "Hata oluştu");
            }
        } catch (error) {
            console.error("Cancel error:", error);
            toast.error("İptal hatası");
        } finally {
            setUpdatingId(null);
        }
    };

    // Filter requests
    const filteredRequests = requests.filter(r => {
        if (filter === "pending") return r.status === "pending" || r.status === "in_progress";
        if (filter === "completed") return r.status === "completed" || r.status === "cancelled";
        return true;
    });

    // Sort by date (newest first for pending, oldest first for completed)
    const sortedRequests = [...filteredRequests].sort((a, b) => {
        if (filter === "pending") {
            return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        }
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    // Count pending
    const pendingCount = requests.filter(r => r.status === "pending" || r.status === "in_progress").length;

    const formatTime = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);

        if (diffMins < 1) return "Az önce";
        if (diffMins < 60) return `${diffMins} dk önce`;
        if (diffMins < 1440) return `${Math.floor(diffMins / 60)} saat önce`;
        return date.toLocaleDateString("tr-TR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                        Oda Talepleri
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">
                        Misafirlerden gelen talepleri yönetin
                    </p>
                </div>
                {pendingCount > 0 && (
                    <div className="flex items-center gap-2 px-4 py-2 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 rounded-xl">
                        <Bell className="w-5 h-5" />
                        <span className="font-semibold">{pendingCount} bekleyen talep</span>
                    </div>
                )}
            </div>

            {/* Filters */}
            <div className="flex items-center gap-2">
                <Filter className="w-5 h-5 text-gray-400" />
                {(["pending", "completed", "all"] as const).map((f) => (
                    <button
                        key={f}
                        onClick={() => setFilter(f)}
                        className={`px-4 py-2 rounded-xl font-medium transition-colors ${filter === f
                            ? "bg-blue-500 text-white"
                            : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
                            }`}
                    >
                        {f === "pending" ? "Bekleyenler" : f === "completed" ? "Tamamlananlar" : "Tümü"}
                    </button>
                ))}
            </div>

            {/* Requests List */}
            {sortedRequests.length === 0 ? (
                <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-12 text-center">
                    <Bell className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                        {filter === "pending" ? "Bekleyen talep yok" : "Talep bulunamadı"}
                    </h3>
                    <p className="text-gray-500 dark:text-gray-400">
                        {filter === "pending"
                            ? "Misafirler odadaki QR kodu okuyarak talep gönderebilir."
                            : "Seçilen filtreye uygun talep bulunmuyor."}
                    </p>
                </div>
            ) : (
                <div className="space-y-3">
                    <AnimatePresence mode="popLayout">
                        {sortedRequests.map((request) => {
                            const typeConfig = REQUEST_TYPES[request.requestType] || REQUEST_TYPES.other;
                            const statusConfig = STATUS_CONFIG[request.status];
                            const isUpdating = updatingId === request.id;

                            return (
                                <motion.div
                                    key={request.id}
                                    layout
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, x: -100 }}
                                    className={`bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5 ${request.status === "pending" ? "border-l-4 border-l-yellow-500" : ""
                                        }`}
                                >
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex items-start gap-4">
                                            {/* Icon */}
                                            <div className="text-3xl">{typeConfig.icon}</div>

                                            {/* Info */}
                                            <div>
                                                <div className="flex items-center gap-3 mb-1">
                                                    <span className="font-bold text-gray-900 dark:text-white text-lg">
                                                        Oda {request.roomNumber}
                                                    </span>
                                                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusConfig.color}/20 ${statusConfig.textColor}`}>
                                                        {statusConfig.label}
                                                    </span>
                                                </div>
                                                <p className="text-gray-700 dark:text-gray-300 font-medium">
                                                    {typeConfig.label}
                                                </p>
                                                {request.message && (
                                                    <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
                                                        "{request.message}"
                                                    </p>
                                                )}
                                                <div className="flex items-center gap-1 mt-2 text-gray-400 text-sm">
                                                    <Clock className="w-4 h-4" />
                                                    {formatTime(request.createdAt)}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Actions */}
                                        {(request.status === "pending" || request.status === "in_progress") && (
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => handleCancel(request)}
                                                    disabled={isUpdating}
                                                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors disabled:opacity-50"
                                                    title="İptal Et"
                                                >
                                                    <X className="w-5 h-5" />
                                                </button>
                                                <button
                                                    onClick={() => handleComplete(request)}
                                                    disabled={isUpdating}
                                                    className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-xl hover:bg-green-600 transition-colors font-medium disabled:opacity-50"
                                                >
                                                    {isUpdating ? (
                                                        <Loader2 className="w-4 h-4 animate-spin" />
                                                    ) : (
                                                        <Check className="w-4 h-4" />
                                                    )}
                                                    Tamamla
                                                </button>
                                            </div>
                                        )}

                                        {request.status === "completed" && (
                                            <CheckCircle className="w-6 h-6 text-green-500" />
                                        )}
                                    </div>
                                </motion.div>
                            );
                        })}
                    </AnimatePresence>
                </div>
            )}
        </div>
    );
}
