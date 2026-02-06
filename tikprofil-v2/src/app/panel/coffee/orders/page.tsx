"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Clock, CheckCircle, ChefHat, Package, Eye, X, Filter } from "lucide-react";
import { LiquidMetalCard } from "@/components/cities/LiquidMetalCard";
import { useBusinessSession } from "@/hooks/useBusinessSession";

interface Order {
    id: string;
    order_number: string;
    customer_name: string;
    customer_phone: string;
    order_type: string;
    status: string;
    total_amount: number;
    tip_amount: number;
    created_at: string;
}

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
    pending: { label: "Beklemede", color: "bg-amber-500/20 text-amber-400", icon: Clock },
    confirmed: { label: "Onaylandı", color: "bg-blue-500/20 text-blue-400", icon: CheckCircle },
    preparing: { label: "Hazırlanıyor", color: "bg-orange-500/20 text-orange-400", icon: ChefHat },
    ready: { label: "Hazır", color: "bg-emerald-500/20 text-emerald-400", icon: Package },
    completed: { label: "Tamamlandı", color: "bg-gray-500/20 text-gray-400", icon: CheckCircle },
    cancelled: { label: "İptal", color: "bg-red-500/20 text-red-400", icon: X }
};

export default function CoffeeOrdersPage() {
    const router = useRouter();
    const { session, loading: sessionLoading } = useBusinessSession();
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState("");

    useEffect(() => {
        if (!sessionLoading && !session) {
            router.push("/giris-yap");
            return;
        }
        if (session?.businessId) {
            fetchOrders();
            const interval = setInterval(fetchOrders, 30000);
            return () => clearInterval(interval);
        }
    }, [session, sessionLoading, statusFilter]);

    const fetchOrders = async () => {
        try {
            const url = `/api/coffee/orders?business_id=${session?.businessId}${statusFilter ? `&status=${statusFilter}` : ""}`;
            const res = await fetch(url);
            if (res.ok) {
                const data = await res.json();
                setOrders(data.data || []);
            }
        } catch (error) {
            console.error("Error fetching orders:", error);
        } finally {
            setLoading(false);
        }
    };

    const updateStatus = async (orderId: string, status: string) => {
        try {
            await fetch(`/api/coffee/orders`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id: orderId, status })
            });
            fetchOrders();
        } catch (error) {
            console.error("Error updating order:", error);
        }
    };

    const pendingCount = orders.filter(o => o.status === "pending").length;
    const preparingCount = orders.filter(o => o.status === "preparing").length;
    const readyCount = orders.filter(o => o.status === "ready").length;

    if (sessionLoading || loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="w-12 h-12 border-4 border-white/10 border-t-[#fe1e50] rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-white">Siparişler</h1>
                    <p className="text-white/50 mt-1">
                        {pendingCount > 0 && <span className="text-amber-400">{pendingCount} bekleyen</span>}
                        {preparingCount > 0 && <span className="mx-2 text-white/30">•</span>}
                        {preparingCount > 0 && <span className="text-orange-400">{preparingCount} hazırlanıyor</span>}
                        {readyCount > 0 && <span className="mx-2 text-white/30">•</span>}
                        {readyCount > 0 && <span className="text-emerald-400">{readyCount} hazır</span>}
                    </p>
                </div>
                <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-4 py-2.5 bg-white/[0.05] border border-white/[0.1] rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-[#fe1e50]/50"
                >
                    <option value="" className="bg-[#1a1a2e]">Tümü</option>
                    <option value="pending" className="bg-[#1a1a2e]">Beklemede</option>
                    <option value="confirmed" className="bg-[#1a1a2e]">Onaylandı</option>
                    <option value="preparing" className="bg-[#1a1a2e]">Hazırlanıyor</option>
                    <option value="ready" className="bg-[#1a1a2e]">Hazır</option>
                    <option value="completed" className="bg-[#1a1a2e]">Tamamlandı</option>
                </select>
            </div>

            <LiquidMetalCard>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="border-b border-white/[0.08]">
                            <tr>
                                <th className="px-6 py-4 text-left text-sm font-medium text-white/50">Sipariş No</th>
                                <th className="px-6 py-4 text-left text-sm font-medium text-white/50">Müşteri</th>
                                <th className="px-6 py-4 text-left text-sm font-medium text-white/50">Tutar</th>
                                <th className="px-6 py-4 text-left text-sm font-medium text-white/50">Durum</th>
                                <th className="px-6 py-4 text-left text-sm font-medium text-white/50">Zaman</th>
                                <th className="px-6 py-4 text-right text-sm font-medium text-white/50">İşlemler</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/[0.05]">
                            {orders.map((order) => {
                                const config = statusConfig[order.status] || statusConfig.pending;
                                const Icon = config.icon;
                                
                                return (
                                    <tr key={order.id} className="hover:bg-white/[0.02]">
                                        <td className="px-6 py-4">
                                            <span className="font-mono font-bold text-white">#{order.order_number}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className="text-white">{order.customer_name || "-"}</p>
                                            <p className="text-white/40 text-sm">{order.customer_phone || ""}</p>
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className="text-white font-bold">₺{order.total_amount}</p>
                                            {order.tip_amount > 0 && (
                                                <p className="text-emerald-400 text-xs">+₺{order.tip_amount} bahşiş</p>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-full ${config.color}`}>
                                                <Icon className="w-3.5 h-3.5" />
                                                {config.label}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-white/40 text-sm">
                                            {new Date(order.created_at).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                {order.status === "pending" && (
                                                    <button
                                                        onClick={() => updateStatus(order.id, "confirmed")}
                                                        className="px-3 py-1.5 text-sm font-medium bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30"
                                                    >
                                                        Onayla
                                                    </button>
                                                )}
                                                {order.status === "confirmed" && (
                                                    <button
                                                        onClick={() => updateStatus(order.id, "preparing")}
                                                        className="px-3 py-1.5 text-sm font-medium bg-orange-500/20 text-orange-400 rounded-lg hover:bg-orange-500/30"
                                                    >
                                                        Hazırla
                                                    </button>
                                                )}
                                                {order.status === "preparing" && (
                                                    <button
                                                        onClick={() => updateStatus(order.id, "ready")}
                                                        className="px-3 py-1.5 text-sm font-medium bg-emerald-500/20 text-emerald-400 rounded-lg hover:bg-emerald-500/30"
                                                    >
                                                        Hazır
                                                    </button>
                                                )}
                                                {order.status === "ready" && (
                                                    <button
                                                        onClick={() => updateStatus(order.id, "completed")}
                                                        className="px-3 py-1.5 text-sm font-medium bg-gray-500/20 text-gray-400 rounded-lg hover:bg-gray-500/30"
                                                    >
                                                        Teslim
                                                    </button>
                                                )}
                                                {order.status !== "cancelled" && order.status !== "completed" && (
                                                    <button
                                                        onClick={() => { if (confirm("İptal etmek istediğinize emin misiniz?")) updateStatus(order.id, "cancelled"); }}
                                                        className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg"
                                                    >
                                                        <X className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </LiquidMetalCard>
        </div>
    );
}
