"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { ArrowLeft, Loader2, Clock, CheckCircle, XCircle, Package, Phone, RefreshCw, ShoppingCart } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { toR2ProxyUrl } from "@/lib/publicImage";

interface OrderItem {
    productId: string;
    name: string;
    basePrice: number;
    quantity: number;
    selectedExtras: { id: string; name: string; price: number }[];
    selectedSize?: { id: string; name: string; priceModifier: number };
    note?: string;
}

interface Order {
    id: string;
    businessId: string;
    businessName: string;
    customer: {
        name: string;
        phone: string;
        email?: string;
    };
    items: OrderItem[];
    delivery: {
        type: "pickup" | "delivery" | "table";
        address?: string;
        tableNumber?: string;
    };
    payment: {
        method: "cash" | "credit_card" | "online";
    };
    coupon?: {
        id: string;
        code: string;
        discountType: string;
        discountValue: number;
    };
    orderNote?: string;
    pricing: {
        subtotal: number;
        discountAmount: number;
        deliveryFee: number;
        total: number;
    };
    status: "pending" | "confirmed" | "preparing" | "ready" | "delivered" | "cancelled";
    qrCode: string;
    createdAt: string;
    updatedAt?: string;
}

interface Business {
    id: string;
    slug: string;
    name: string;
    logo?: string;
    phone?: string;
    whatsapp?: string;
}

const STATUS_CONFIG = {
    pending: {
        label: "Beklemede",
        color: "text-yellow-600",
        bg: "bg-yellow-50",
        icon: Clock
    },
    confirmed: {
        label: "Onaylandı",
        color: "text-blue-600",
        bg: "bg-blue-50",
        icon: CheckCircle
    },
    preparing: {
        label: "Hazırlanıyor",
        color: "text-orange-600",
        bg: "bg-orange-50",
        icon: Package
    },
    ready: {
        label: "Hazır",
        color: "text-green-600",
        bg: "bg-green-50",
        icon: CheckCircle
    },
    delivered: {
        label: "Teslim Edildi",
        color: "text-gray-600",
        bg: "bg-gray-50",
        icon: CheckCircle
    },
    cancelled: {
        label: "İptal Edildi",
        color: "text-red-600",
        bg: "bg-red-50",
        icon: XCircle
    }
};

export default function CustomerOrdersPage() {
    const params = useParams();
    const slug = params.slug as string;

    const [customerPhone, setCustomerPhone] = useState("");
    const [business, setBusiness] = useState<Business | null>(null);
    const [orders, setOrders] = useState<{
        active: Order[];
        completed: Order[];
        all: Order[];
    }>({ active: [], completed: [], all: [] });
    const [loading, setLoading] = useState(false);
    const [tab, setTab] = useState<"active" | "completed">("active");

    const fetchBusiness = async () => {
        try {
            const res = await fetch(`/api/fastfood/public-menu?businessSlug=${slug}`);
            const data = await res.json();
            if (data.success && data.data) {
                setBusiness({
                    id: data.data.businessId,
                    slug,
                    name: data.data.businessName || "İşletme",
                    whatsapp: data.data.whatsapp
                });
            }
        } catch (error) {
            console.error("Business fetch error:", error);
        }
    };

    const fetchOrders = async () => {
        if (!customerPhone || customerPhone.length < 10) return;

        setLoading(true);
        try {
            const res = await fetch(
                `/api/fastfood/customer-orders?businessSlug=${slug}&customerPhone=${customerPhone}`
            );
            const data = await res.json();

            if (data.success) {
                setOrders(data.orders);
            } else {
                toast.error(data.error || "Siparişler yüklenemedi");
            }
        } catch (error) {
            console.error("Orders fetch error:", error);
            toast.error("Bir hata oluştu");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchBusiness();

        const savedPhone = localStorage.getItem("ff_customer_phone");
        if (savedPhone) {
            setCustomerPhone(savedPhone);
        }
    }, [slug]);

    useEffect(() => {
        if (customerPhone && customerPhone.length >= 10) {
            fetchOrders();
        }
    }, [customerPhone, slug]);

    const formatOrderDate = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diff = now.getTime() - date.getTime();

        if (diff < 60000) return "Az önce";
        if (diff < 3600000) return `${Math.floor(diff / 60000)} dakika önce`;
        if (diff < 86400000) return `${Math.floor(diff / 3600000)} saat önce`;
        return date.toLocaleDateString("tr-TR", {
            day: "numeric",
            month: "long",
            year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined
        });
    };

    const OrderCard = ({ order }: { order: Order }) => {
        const statusConfig = STATUS_CONFIG[order.status];
        const StatusIcon = statusConfig.icon;

        return (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
                <div className="flex items-start justify-between mb-3">
                    <div>
                        <p className="text-sm text-gray-500 mb-1">
                            {formatOrderDate(order.createdAt)}
                        </p>
                        <p className="text-xs text-gray-400">
                            #{order.qrCode.split("-")[1] || order.id.substring(0, 8)}
                        </p>
                    </div>
                    <div className={`px-3 py-1.5 rounded-full ${statusConfig.bg}`}>
                        <div className="flex items-center gap-1.5">
                            <StatusIcon className={`w-4 h-4 ${statusConfig.color}`} />
                            <span className={`text-xs font-semibold ${statusConfig.color}`}>
                                {statusConfig.label}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="space-y-2 mb-3">
                    {order.items.map((item, index) => (
                        <div key={`${item.productId}-${index}`} className="flex justify-between text-sm">
                            <div className="flex-1 min-w-0">
                                <p className="font-medium text-gray-900 truncate">
                                    {item.quantity}x {item.name}
                                </p>
                                {item.selectedSize && (
                                    <p className="text-xs text-gray-500">{item.selectedSize.name}</p>
                                )}
                                {item.selectedExtras.length > 0 && (
                                    <p className="text-xs text-gray-500">
                                        + {item.selectedExtras.map(e => e.name).join(", ")}
                                    </p>
                                )}
                            </div>
                            <p className="font-semibold text-gray-900 ml-2">
                                ₺{((item.basePrice +
                                    (item.selectedSize?.priceModifier || 0) +
                                    item.selectedExtras.reduce((sum, e) => sum + e.price, 0)) *
                                    item.quantity).toFixed(2)}
                            </p>
                        </div>
                    ))}
                </div>

                {order.orderNote && (
                    <div className="bg-gray-50 rounded-lg p-2 mb-3">
                        <p className="text-xs text-gray-600">{order.orderNote}</p>
                    </div>
                )}

                <div className="border-t border-gray-100 pt-3 flex justify-between items-center">
                    <span className="text-sm text-gray-600">Toplam</span>
                    <span className="text-lg font-bold text-gray-900">
                        ₺{order.pricing.total.toFixed(2)}
                    </span>
                </div>
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
                <div className="max-w-2xl mx-auto px-4 py-4">
                    <div className="flex items-center gap-4">
                        <Link
                            href={`/${slug}/menu`}
                            className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5 text-gray-600" />
                        </Link>
                        <div className="flex items-center gap-3">
                            {business?.logo ? (
                                <img
                                    src={toR2ProxyUrl(business.logo)}
                                    alt={business.name}
                                    className="w-10 h-10 rounded-full object-cover"
                                />
                            ) : (
                                <div className="w-10 h-10 rounded-full bg-orange-500 flex items-center justify-center text-white font-bold">
                                    {business?.name?.substring(0, 2).toUpperCase() || "İŞ"}
                                </div>
                            )}
                            <div>
                                <h1 className="font-semibold text-gray-900">{business?.name || "İşletme"}</h1>
                                <p className="text-sm text-gray-500">Siparişlerim</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-2xl mx-auto px-4 py-6">
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Siparişlerinizi görmek için telefon numaranızı girin
                    </label>
                    <div className="flex gap-2">
                        <input
                            type="tel"
                            placeholder="05XX XXX XX XX"
                            value={customerPhone}
                            onChange={e => setCustomerPhone(e.target.value)}
                            className="flex-1 px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500"
                        />
                        <button
                            onClick={fetchOrders}
                            disabled={loading || customerPhone.length < 10}
                            className="px-4 py-3 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-xl transition-colors"
                        >
                            {loading ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <RefreshCw className="w-5 h-5" />
                            )}
                        </button>
                    </div>
                </div>

                {orders.active.length > 0 || orders.completed.length > 0 ? (
                    <>
                        <div className="flex gap-2 mb-4">
                            <button
                                onClick={() => setTab("active")}
                                className={`flex-1 py-2.5 rounded-xl font-medium transition-all ${
                                    tab === "active"
                                        ? "bg-orange-500 text-white"
                                        : "bg-white text-gray-600 hover:bg-gray-50"
                                }`}
                            >
                                Aktif Siparişler ({orders.active.length})
                            </button>
                            <button
                                onClick={() => setTab("completed")}
                                className={`flex-1 py-2.5 rounded-xl font-medium transition-all ${
                                    tab === "completed"
                                        ? "bg-orange-500 text-white"
                                        : "bg-white text-gray-600 hover:bg-gray-50"
                                }`}
                            >
                                Tamamlanan ({orders.completed.length})
                            </button>
                        </div>

                        <div className="space-y-3">
                            {tab === "active" && orders.active.length > 0 ? (
                                orders.active.map(order => <OrderCard key={order.id} order={order} />)
                            ) : tab === "completed" && orders.completed.length > 0 ? (
                                orders.completed.map(order => <OrderCard key={order.id} order={order} />)
                            ) : (
                                <div className="text-center py-12">
                                    <Package className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                                    <h2 className="text-lg font-medium text-gray-700">
                                        {tab === "active" ? "Aktif siparişiniz yok" : "Tamamlanan siparişiniz yok"}
                                    </h2>
                                    <p className="text-gray-500 mt-1">
                                        {tab === "active"
                                            ? "Menüden sipariş vererek başlayın"
                                            : "İlk siparişinizi tamamlayın"}
                                    </p>
                                </div>
                            )}
                        </div>
                    </>
                ) : (
                    <div className="text-center py-12">
                        <ShoppingCart className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                        <h2 className="text-lg font-medium text-gray-700">Henüz siparişiniz yok</h2>
                        <p className="text-gray-500 mt-1">
                            Menüden sipariş vererek başlayın
                        </p>
                        <Link
                            href={`/${slug}/menu`}
                            className="inline-block mt-4 px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl transition-colors"
                        >
                            Menüye Git
                        </Link>
                    </div>
                )}
            </div>
        </div>
    );
}
