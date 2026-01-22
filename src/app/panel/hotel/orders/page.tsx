"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Loader2,
    Clock,
    CheckCircle,
    X,
    Filter,
    UtensilsCrossed,
    ChefHat,
    Truck,
} from "lucide-react";
import { toast } from "sonner";
import { useBusinessContext } from "@/components/panel/BusinessSessionContext";
import { getSupabaseClient } from "@/lib/supabase";

// Order interface
interface RoomServiceOrder {
    id: string;
    roomNumber: string;
    items: { id: string; name: string; price: number; quantity: number }[];
    total: number;
    note?: string;
    status: "pending" | "preparing" | "delivered" | "cancelled";
    createdAt: string;
    deliveredAt?: string;
}

// Status config
const STATUS_CONFIG = {
    pending: { label: "Bekliyor", color: "bg-yellow-500", textColor: "text-yellow-600", icon: Clock },
    preparing: { label: "Hazırlanıyor", color: "bg-blue-500", textColor: "text-blue-600", icon: ChefHat },
    delivered: { label: "Teslim Edildi", color: "bg-green-500", textColor: "text-green-600", icon: CheckCircle },
    cancelled: { label: "İptal", color: "bg-gray-500", textColor: "text-gray-600", icon: X },
};

export default function RoomServiceOrdersPage() {
    const session = useBusinessContext();
    const [orders, setOrders] = useState<RoomServiceOrder[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<"all" | "active" | "completed">("active");
    const [updatingId, setUpdatingId] = useState<string | null>(null);
    const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        if (!session?.businessId) {
            setLoading(false);
            return;
        }

        let isActive = true;

        const fetchOrders = async () => {
            try {
                const res = await fetch(`/api/hotel/room-service-orders?businessId=${session.businessId}`);
                const data = await res.json();

                if (!isActive) return;

                if (data.success) {
                    setOrders(data.orders || []);
                } else {
                    toast.error(data.error || 'Sipariş güncellemeleri alınamadı');
                }
                setLoading(false);
            } catch (error) {
                console.error('Room service orders fetch error:', error);
                if (isActive) {
                    setLoading(false);
                    toast.error('Sipariş güncellemeleri alınamadı');
                }
            }
        };

        const scheduleRefresh = () => {
            if (refreshTimeoutRef.current) return;
            refreshTimeoutRef.current = setTimeout(() => {
                refreshTimeoutRef.current = null;
                fetchOrders();
            }, 300);
        };

        fetchOrders();

        const supabase = getSupabaseClient();
        const channel = supabase
            .channel(`room-service-${session.businessId}`)
            .on(
                "postgres_changes",
                { event: "*", schema: "public", table: "app_documents", filter: "collection=eq.room_service_orders" },
                (payload) => {
                    const doc: any = (payload as any).new || (payload as any).old;
                    const businessId = doc?.data?.businessId || doc?.data?.business_id;
                    if (businessId && businessId !== session.businessId) return;
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

    const handleStatusChange = async (order: RoomServiceOrder, newStatus: string) => {
        setUpdatingId(order.id);
        try {
            const res = await fetch(`/api/hotel/room-service-orders/${order.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: newStatus }),
            });

            const data = await res.json();

            if (data.success) {
                toast.success(`Sipariş durumu güncellendi`);
                // Real-time listener will update automatically
            } else {
                toast.error(data.error || "Hata oluştu");
            }
        } catch (error) {
            console.error("Status change error:", error);
            toast.error("İşlem hatası");
        } finally {
            setUpdatingId(null);
        }
    };

    // Filter orders
    const filteredOrders = orders.filter(o => {
        if (filter === "active") return o.status === "pending" || o.status === "preparing";
        if (filter === "completed") return o.status === "delivered" || o.status === "cancelled";
        return true;
    });

    // Count active
    const activeCount = orders.filter(o => o.status === "pending" || o.status === "preparing").length;

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
                        Oda Servisi Siparişleri
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">
                        Misafirlerden gelen yiyecek-içecek siparişleri
                    </p>
                </div>
                {activeCount > 0 && (
                    <div className="flex items-center gap-2 px-4 py-2 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 rounded-xl">
                        <UtensilsCrossed className="w-5 h-5" />
                        <span className="font-semibold">{activeCount} aktif sipariş</span>
                    </div>
                )}
            </div>

            {/* Filters */}
            <div className="flex items-center gap-2">
                <Filter className="w-5 h-5 text-gray-400" />
                {(["active", "completed", "all"] as const).map((f) => (
                    <button
                        key={f}
                        onClick={() => setFilter(f)}
                        className={`px-4 py-2 rounded-xl font-medium transition-colors ${filter === f
                            ? "bg-blue-500 text-white"
                            : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
                            }`}
                    >
                        {f === "active" ? "Aktif" : f === "completed" ? "Tamamlanan" : "Tümü"}
                    </button>
                ))}
            </div>

            {/* Orders List */}
            {filteredOrders.length === 0 ? (
                <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-12 text-center">
                    <UtensilsCrossed className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                        {filter === "active" ? "Aktif sipariş yok" : "Sipariş bulunamadı"}
                    </h3>
                    <p className="text-gray-500 dark:text-gray-400">
                        {filter === "active"
                            ? "Misafirler oda servisi menüsünden sipariş verebilir."
                            : "Seçilen filtreye uygun sipariş bulunmuyor."}
                    </p>
                </div>
            ) : (
                <div className="space-y-4">
                    <AnimatePresence mode="popLayout">
                        {filteredOrders.map((order) => {
                            const statusConfig = STATUS_CONFIG[order.status];
                            const StatusIcon = statusConfig.icon;
                            const isUpdating = updatingId === order.id;

                            return (
                                <motion.div
                                    key={order.id}
                                    layout
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, x: -100 }}
                                    className={`bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden ${order.status === "pending" ? "border-l-4 border-l-yellow-500" :
                                        order.status === "preparing" ? "border-l-4 border-l-blue-500" : ""
                                        }`}
                                >
                                    {/* Header */}
                                    <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className={`p-2 rounded-lg ${statusConfig.color}/20`}>
                                                <StatusIcon className={`w-5 h-5 ${statusConfig.textColor}`} />
                                            </div>
                                            <div>
                                                <span className="font-bold text-gray-900 dark:text-white text-lg">
                                                    Oda {order.roomNumber}
                                                </span>
                                                <div className="flex items-center gap-2 text-sm text-gray-500">
                                                    <Clock className="w-4 h-4" />
                                                    {formatTime(order.createdAt)}
                                                </div>
                                            </div>
                                        </div>
                                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusConfig.color}/20 ${statusConfig.textColor}`}>
                                            {statusConfig.label}
                                        </span>
                                    </div>

                                    {/* Items */}
                                    <div className="p-4 space-y-2">
                                        {order.items.map((item, idx) => (
                                            <div key={idx} className="flex items-center justify-between text-sm">
                                                <span className="text-gray-700 dark:text-gray-300">
                                                    {item.quantity}x {item.name}
                                                </span>
                                                <span className="text-gray-500">
                                                    ₺{(item.price * item.quantity).toFixed(2)}
                                                </span>
                                            </div>
                                        ))}
                                        {order.note && (
                                            <p className="text-sm text-gray-500 italic mt-2 pt-2 border-t border-gray-100 dark:border-gray-800">
                                                Not: {order.note}
                                            </p>
                                        )}
                                        <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-800">
                                            <span className="font-medium text-gray-600 dark:text-gray-400">Toplam</span>
                                            <span className="font-bold text-lg text-gray-900 dark:text-white">
                                                ₺{order.total.toFixed(2)}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    {(order.status === "pending" || order.status === "preparing") && (
                                        <div className="p-4 bg-gray-50 dark:bg-gray-800/50 flex items-center gap-2">
                                            {order.status === "pending" && (
                                                <>
                                                    <button
                                                        onClick={() => handleStatusChange(order, "cancelled")}
                                                        disabled={isUpdating}
                                                        className="flex-1 py-2 px-4 text-gray-600 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors font-medium disabled:opacity-50"
                                                    >
                                                        İptal Et
                                                    </button>
                                                    <button
                                                        onClick={() => handleStatusChange(order, "preparing")}
                                                        disabled={isUpdating}
                                                        className="flex-1 py-2 px-4 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                                                    >
                                                        {isUpdating ? <Loader2 className="w-4 h-4 animate-spin" /> : <ChefHat className="w-4 h-4" />}
                                                        Hazırlanıyor
                                                    </button>
                                                </>
                                            )}
                                            {order.status === "preparing" && (
                                                <button
                                                    onClick={() => handleStatusChange(order, "delivered")}
                                                    disabled={isUpdating}
                                                    className="w-full py-2 px-4 bg-green-500 text-white rounded-xl hover:bg-green-600 transition-colors font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                                                >
                                                    {isUpdating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Truck className="w-4 h-4" />}
                                                    Teslim Edildi
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </motion.div>
                            );
                        })}
                    </AnimatePresence>
                </div>
            )}
        </div>
    );
}
