"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    ShoppingCart,
    Loader2,
    Eye,
    X,
    Package,
    Truck,
    CheckCircle,
    XCircle,
    Clock,
    Search,
    Filter,
} from "lucide-react";
import { toast } from "sonner";
import clsx from "clsx";
import { useBusinessSession } from "@/hooks/useBusinessSession";
import { useTheme } from "@/components/panel/ThemeProvider";
import type { Order, OrderStatus } from "@/types/ecommerce";
import { ORDER_STATUS_LABELS, ORDER_STATUS_COLORS } from "@/types/ecommerce";

const STATUS_ICONS: Record<OrderStatus, React.ElementType> = {
    pending: Clock,
    confirmed: CheckCircle,
    processing: Package,
    shipped: Truck,
    delivered: CheckCircle,
    cancelled: XCircle,
    refunded: XCircle,
};

export default function EcommerceOrdersPage() {
    const { session } = useBusinessSession();
    const { isDark } = useTheme();
    const [isLoading, setIsLoading] = useState(true);
    const [orders, setOrders] = useState<Order[]>([]);
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [filterStatus, setFilterStatus] = useState<string>("");
    const [searchQuery, setSearchQuery] = useState("");
    const [stats, setStats] = useState({
        total: 0,
        pending: 0,
        processing: 0,
        shipped: 0,
        delivered: 0,
        cancelled: 0,
    });

    // Fetch orders
    useEffect(() => {
        async function fetchOrders() {
            if (!session?.businessId) return;

            try {
                const res = await fetch(`/api/ecommerce/orders?businessId=${session.businessId}`);
                if (res.ok) {
                    const data = await res.json();
                    setOrders(data.orders || []);
                    setStats(data.stats || {});
                }
            } catch (error) {
                console.error("Orders fetch error:", error);
                toast.error("Siparişler yüklenemedi");
            } finally {
                setIsLoading(false);
            }
        }

        fetchOrders();
    }, [session?.businessId]);

    // Filter orders
    const filteredOrders = orders.filter((order) => {
        const matchesStatus = !filterStatus || order.status === filterStatus;
        const matchesSearch = !searchQuery ||
            order.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
            order.customerInfo.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            order.customerInfo.phone.includes(searchQuery);
        return matchesStatus && matchesSearch;
    });

    // Update order status
    const handleStatusUpdate = async (orderId: string, newStatus: OrderStatus) => {
        if (!session?.businessId) return;

        try {
            const res = await fetch("/api/ecommerce/orders", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    businessId: session.businessId,
                    id: orderId,
                    status: newStatus,
                }),
            });

            if (res.ok) {
                setOrders(prev => prev.map(o =>
                    o.id === orderId ? { ...o, status: newStatus } : o
                ));
                if (selectedOrder?.id === orderId) {
                    setSelectedOrder(prev => prev ? { ...prev, status: newStatus } : null);
                }
                toast.success("Sipariş durumu güncellendi");
            } else {
                toast.error("Güncelleme başarısız");
            }
        } catch (error) {
            console.error("Update error:", error);
            toast.error("Bağlantı hatası");
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className={clsx("h-8 w-8 animate-spin", isDark ? "text-cyan-400" : "text-cyan-500")} />
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto p-4 sm:p-6">
            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
                <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-green-500 flex items-center justify-center">
                    <ShoppingCart className="h-6 w-6 text-white" />
                </div>
                <div>
                    <h1 className={clsx("text-xl font-bold", isDark ? "text-white" : "text-gray-900")}>Siparişler</h1>
                    <p className={clsx("text-sm", isDark ? "text-white/50" : "text-gray-500")}>{stats.total} sipariş</p>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                {[
                    { label: "Bekleyen", value: stats.pending, color: "yellow" },
                    { label: "Hazırlanan", value: stats.processing, color: "purple" },
                    { label: "Kargoda", value: stats.shipped, color: "blue" },
                    { label: "Teslim", value: stats.delivered, color: "green" },
                ].map((stat) => (
                    <div
                        key={stat.label}
                        className={clsx("rounded-xl border p-3", isDark ? "bg-white/[0.03] border-white/10" : "bg-white border-gray-100")}
                    >
                        <p className={clsx("text-2xl font-bold", isDark ? "text-white" : "text-gray-900")}>{stat.value}</p>
                        <p className={clsx("text-sm", isDark ? "text-white/50" : "text-gray-500")}>{stat.label}</p>
                    </div>
                ))}
            </div>

            {/* Search & Filter */}
            <div className="flex flex-col sm:flex-row gap-3 mb-6">
                <div className="relative flex-1">
                    <Search className={clsx("absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5", isDark ? "text-white/40" : "text-gray-400")} />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Sipariş no, müşteri adı veya telefon..."
                        className={clsx(
                            "w-full pl-10 pr-4 py-2.5 rounded-xl border outline-none",
                            isDark
                                ? "bg-white/5 border-white/10 text-white placeholder:text-white/40 focus:border-cyan-500/50"
                                : "bg-white border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20"
                        )}
                    />
                </div>
                <div className="relative">
                    <Filter className={clsx("absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5", isDark ? "text-white/40" : "text-gray-400")} />
                    <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        className={clsx(
                            "pl-10 pr-8 py-2.5 rounded-xl border outline-none appearance-none min-w-[160px]",
                            isDark
                                ? "bg-white/5 border-white/10 text-white focus:border-cyan-500/50"
                                : "bg-white border-gray-200 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20"
                        )}
                    >
                        <option value="">Tüm Durumlar</option>
                        {Object.entries(ORDER_STATUS_LABELS).map(([key, label]) => (
                            <option key={key} value={key}>{label}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Orders List */}
            {filteredOrders.length === 0 ? (
                <div className={clsx("text-center py-16 rounded-2xl", isDark ? "bg-white/5" : "bg-gray-50")}>
                    <ShoppingCart className={clsx("h-12 w-12 mx-auto mb-4", isDark ? "text-white/20" : "text-gray-300")} />
                    <h3 className={clsx("text-lg font-medium mb-2", isDark ? "text-white" : "text-gray-900")}>
                        {searchQuery || filterStatus ? "Sipariş bulunamadı" : "Henüz sipariş yok"}
                    </h3>
                    <p className={clsx(isDark ? "text-white/50" : "text-gray-500")}>
                        {searchQuery || filterStatus
                            ? "Arama kriterlerinizi değiştirmeyi deneyin"
                            : "Siparişler burada görünecek"}
                    </p>
                </div>
            ) : (
                <div className={clsx("rounded-2xl border divide-y", isDark ? "bg-white/[0.03] border-white/10 divide-white/10" : "bg-white border-gray-100 divide-gray-100")}>
                    {filteredOrders.map((order, index) => {
                        const StatusIcon = STATUS_ICONS[order.status];
                        return (
                            <motion.div
                                key={order.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.03 }}
                                className={clsx("p-4 transition-colors cursor-pointer", isDark ? "hover:bg-white/5" : "hover:bg-gray-50")}
                                onClick={() => setSelectedOrder(order)}
                            >
                                <div className="flex items-center gap-4">
                                    {/* Status Icon */}
                                    <div className={clsx(
                                        "h-10 w-10 rounded-xl flex items-center justify-center",
                                        ORDER_STATUS_COLORS[order.status]
                                    )}>
                                        <StatusIcon className="h-5 w-5" />
                                    </div>

                                    {/* Order Info */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className="font-medium text-gray-900">
                                                {order.orderNumber}
                                            </span>
                                            <span className={clsx(
                                                "px-2 py-0.5 text-xs font-medium rounded-full",
                                                ORDER_STATUS_COLORS[order.status]
                                            )}>
                                                {ORDER_STATUS_LABELS[order.status]}
                                            </span>
                                        </div>
                                        <p className="text-sm text-gray-500 truncate">
                                            {order.customerInfo.name} • {order.customerInfo.phone}
                                        </p>
                                    </div>

                                    {/* Price & Date */}
                                    <div className="text-right">
                                        <p className="font-bold text-gray-900">
                                            {order.total.toLocaleString("tr-TR")}₺
                                        </p>
                                        <p className="text-xs text-gray-400">
                                            {new Date(order.createdAt).toLocaleDateString("tr-TR")}
                                        </p>
                                    </div>

                                    {/* View Button */}
                                    <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
                                        <Eye className="h-5 w-5" />
                                    </button>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            )}

            {/* Order Detail Modal */}
            <AnimatePresence>
                {selectedOrder && (
                    <OrderDetailModal
                        order={selectedOrder}
                        onClose={() => setSelectedOrder(null)}
                        onStatusUpdate={handleStatusUpdate}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}

// Order Detail Modal
function OrderDetailModal({
    order,
    onClose,
    onStatusUpdate,
}: {
    order: Order;
    onClose: () => void;
    onStatusUpdate: (orderId: string, status: OrderStatus) => Promise<void>;
}) {
    const [isUpdating, setIsUpdating] = useState(false);

    const handleStatusChange = async (newStatus: OrderStatus) => {
        setIsUpdating(true);
        await onStatusUpdate(order.id, newStatus);
        setIsUpdating(false);
    };

    const StatusIcon = STATUS_ICONS[order.status];

    return (
        <>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="fixed inset-0 bg-black/50 z-50"
            />
            <motion.div
                initial={{ opacity: 0, x: "100%" }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: "100%" }}
                className="fixed right-0 top-0 bottom-0 w-full max-w-lg bg-white shadow-xl z-50 overflow-y-auto"
            >
                {/* Header */}
                <div className="sticky top-0 bg-white border-b border-gray-100 p-4 flex items-center justify-between">
                    <div>
                        <h3 className="font-semibold text-gray-900">{order.orderNumber}</h3>
                        <p className="text-sm text-gray-500">
                            {new Date(order.createdAt).toLocaleString("tr-TR")}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-gray-400 hover:text-gray-600 rounded-lg"
                    >
                        <X className="h-6 w-6" />
                    </button>
                </div>

                <div className="p-4 space-y-6">
                    {/* Status */}
                    <div>
                        <h4 className="text-sm font-medium text-gray-500 mb-2">Sipariş Durumu</h4>
                        <div className="flex items-center gap-2 mb-3">
                            <div className={clsx(
                                "h-10 w-10 rounded-xl flex items-center justify-center",
                                ORDER_STATUS_COLORS[order.status]
                            )}>
                                <StatusIcon className="h-5 w-5" />
                            </div>
                            <span className="font-medium text-gray-900">
                                {ORDER_STATUS_LABELS[order.status]}
                            </span>
                        </div>

                        {/* Status Actions */}
                        <div className="flex flex-wrap gap-2">
                            {order.status === 'pending' && (
                                <>
                                    <button
                                        onClick={() => handleStatusChange('confirmed')}
                                        disabled={isUpdating}
                                        className="px-3 py-1.5 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 disabled:opacity-50"
                                    >
                                        Onayla
                                    </button>
                                    <button
                                        onClick={() => handleStatusChange('cancelled')}
                                        disabled={isUpdating}
                                        className="px-3 py-1.5 text-sm bg-red-100 text-red-700 rounded-lg hover:bg-red-200 disabled:opacity-50"
                                    >
                                        İptal Et
                                    </button>
                                </>
                            )}
                            {order.status === 'confirmed' && (
                                <button
                                    onClick={() => handleStatusChange('processing')}
                                    disabled={isUpdating}
                                    className="px-3 py-1.5 text-sm bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 disabled:opacity-50"
                                >
                                    Hazırlanıyor
                                </button>
                            )}
                            {order.status === 'processing' && (
                                <button
                                    onClick={() => handleStatusChange('shipped')}
                                    disabled={isUpdating}
                                    className="px-3 py-1.5 text-sm bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 disabled:opacity-50"
                                >
                                    Kargoya Ver
                                </button>
                            )}
                            {order.status === 'shipped' && (
                                <button
                                    onClick={() => handleStatusChange('delivered')}
                                    disabled={isUpdating}
                                    className="px-3 py-1.5 text-sm bg-green-100 text-green-700 rounded-lg hover:bg-green-200 disabled:opacity-50"
                                >
                                    Teslim Edildi
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Customer Info */}
                    <div>
                        <h4 className="text-sm font-medium text-gray-500 mb-2">Müşteri Bilgileri</h4>
                        <div className="bg-gray-50 rounded-xl p-3 space-y-1">
                            <p className="font-medium text-gray-900">{order.customerInfo.name}</p>
                            <p className="text-sm text-gray-600">{order.customerInfo.phone}</p>
                            <p className="text-sm text-gray-600">{order.customerInfo.email}</p>
                            <p className="text-sm text-gray-600">
                                {order.customerInfo.address}, {order.customerInfo.district}/{order.customerInfo.city}
                            </p>
                        </div>
                    </div>

                    {/* Order Items */}
                    <div>
                        <h4 className="text-sm font-medium text-gray-500 mb-2">Ürünler</h4>
                        <div className="space-y-2">
                            {order.items.map((item, i) => (
                                <div key={i} className="flex items-center gap-3 bg-gray-50 rounded-xl p-3">
                                    {item.image && (
                                        <img
                                            src={item.image}
                                            alt={item.name}
                                            className="h-12 w-12 rounded-lg object-cover"
                                        />
                                    )}
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-gray-900 truncate">{item.name}</p>
                                        {item.variantName && (
                                            <p className="text-xs text-gray-500">{item.variantName}</p>
                                        )}
                                    </div>
                                    <div className="text-right">
                                        <p className="font-medium text-gray-900">
                                            {item.total.toLocaleString("tr-TR")}₺
                                        </p>
                                        <p className="text-xs text-gray-500">
                                            {item.quantity} x {item.price.toLocaleString("tr-TR")}₺
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Order Summary */}
                    <div>
                        <h4 className="text-sm font-medium text-gray-500 mb-2">Sipariş Özeti</h4>
                        <div className="bg-gray-50 rounded-xl p-3 space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-500">Ara Toplam</span>
                                <span>{order.subtotal.toLocaleString("tr-TR")}₺</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-500">Kargo</span>
                                <span>{order.shippingCost.toLocaleString("tr-TR")}₺</span>
                            </div>
                            {order.discount > 0 && (
                                <div className="flex justify-between text-sm text-green-600">
                                    <span>İndirim</span>
                                    <span>-{order.discount.toLocaleString("tr-TR")}₺</span>
                                </div>
                            )}
                            <div className="flex justify-between font-bold text-lg pt-2 border-t border-gray-200">
                                <span>Toplam</span>
                                <span>{order.total.toLocaleString("tr-TR")}₺</span>
                            </div>
                        </div>
                    </div>

                    {/* Notes */}
                    {order.notes && (
                        <div>
                            <h4 className="text-sm font-medium text-gray-500 mb-2">Notlar</h4>
                            <p className="text-sm text-gray-600 bg-gray-50 rounded-xl p-3">
                                {order.notes}
                            </p>
                        </div>
                    )}
                </div>
            </motion.div>
        </>
    );
}

