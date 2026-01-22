"use client";

import Image from "next/image";
import { Package, Clock, CheckCircle, Truck, Calendar, Users, MapPin, Filter, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import type { KesfetOrder, KesfetReservation } from "@/types/kesfet";

type ViewMode = "orders" | "reservations";
type OrderStatus = "all" | "active" | "completed" | "cancelled";
type ReservationStatus = "all" | "upcoming" | "past" | "cancelled";

const ORDER_STATUS_TABS: { id: OrderStatus; label: string }[] = [
    { id: "all", label: "Tümü" },
    { id: "active", label: "Aktif" },
    { id: "completed", label: "Tamamlanan" },
    { id: "cancelled", label: "İptal" },
];

const RESERVATION_STATUS_TABS: { id: ReservationStatus; label: string }[] = [
    { id: "all", label: "Tümü" },
    { id: "upcoming", label: "Yaklaşan" },
    { id: "past", label: "Geçmiş" },
    { id: "cancelled", label: "İptal" },
];

function getOrderStatusColor(status: string) {
    switch (status) {
        case "pending":
        case "confirmed":
        case "preparing":
        case "ready":
        case "delivering":
            return "bg-blue-50 text-blue-600";
        case "delivered":
            return "bg-emerald-50 text-emerald-600";
        case "cancelled":
            return "bg-red-50 text-red-600";
        default:
            return "bg-gray-100 text-gray-600";
    }
}

function getReservationStatusColor(status: string) {
    switch (status) {
        case "pending":
        case "confirmed":
            return "bg-purple-50 text-purple-600";
        case "completed":
            return "bg-gray-100 text-gray-600";
        case "cancelled":
            return "bg-red-50 text-red-600";
        default:
            return "bg-gray-100 text-gray-600";
    }
}

function getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
        pending: "Beklemede",
        confirmed: "Onaylandı",
        preparing: "Hazırlanıyor",
        ready: "Hazır",
        delivering: "Yolda",
        delivered: "Teslim Edildi",
        cancelled: "İptal Edildi",
        completed: "Tamamlandı",
        no_show: "Gelmedi",
    };
    return labels[status] || status;
}

export default function OrdersPage() {
    const [viewMode, setViewMode] = useState<ViewMode>("orders");
    const [orderStatus, setOrderStatus] = useState<OrderStatus>("all");
    const [reservationStatus, setReservationStatus] = useState<ReservationStatus>("all");

    const [orders, setOrders] = useState<KesfetOrder[]>([]);
    const [reservations, setReservations] = useState<KesfetReservation[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (viewMode !== "orders") return;

        async function fetchOrders() {
            try {
                setLoading(true);
                const params = new URLSearchParams();
                if (orderStatus !== "all") params.set("status", orderStatus);

                const response = await fetch(`/api/kesfet/orders?${params.toString()}`);
                const data = await response.json();

                if (data.success) {
                    setOrders(data.data || []);
                } else {
                    setError(data.error || "Veriler yüklenemedi");
                }
            } catch (err) {
                setError("Bağlantı hatası");
                console.error(err);
            } finally {
                setLoading(false);
            }
        }

        fetchOrders();
    }, [viewMode, orderStatus]);

    useEffect(() => {
        if (viewMode !== "reservations") return;

        async function fetchReservations() {
            try {
                setLoading(true);
                const params = new URLSearchParams();
                if (reservationStatus !== "all") params.set("status", reservationStatus);

                const response = await fetch(`/api/kesfet/reservations?${params.toString()}`);
                const data = await response.json();

                if (data.success) {
                    setReservations(data.data || []);
                } else {
                    setError(data.error || "Veriler yüklenemedi");
                }
            } catch (err) {
                setError("Bağlantı hatası");
                console.error(err);
            } finally {
                setLoading(false);
            }
        }

        fetchReservations();
    }, [viewMode, reservationStatus]);

    return (
        <div className="min-h-screen bg-gray-50 pb-24">
            <header className="sticky top-0 z-40 px-4 py-4 bg-white/95 backdrop-blur-xl border-b border-gray-100">
                <div className="flex items-center justify-between mb-4">
                    <h1 className="text-xl font-bold text-gray-900">
                        {viewMode === "orders" ? "Siparişlerim" : "Rezervasyonlarım"}
                    </h1>
                    <button className="p-2.5 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors">
                        <Filter className="w-5 h-5 text-gray-600" />
                    </button>
                </div>

                <div className="flex p-1 rounded-xl mb-4 bg-gray-100">
                    <button
                        onClick={() => setViewMode("orders")}
                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all duration-300
                                   ${viewMode === "orders"
                                ? "bg-white text-gray-900 shadow-md"
                                : "text-gray-600"
                            }`}
                    >
                        <Package className="w-4 h-4" />
                        Siparişler
                    </button>
                    <button
                        onClick={() => setViewMode("reservations")}
                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all duration-300
                                   ${viewMode === "reservations"
                                ? "bg-white text-gray-900 shadow-md"
                                : "text-gray-600"
                            }`}
                    >
                        <Calendar className="w-4 h-4" />
                        Rezervasyonlar
                    </button>
                </div>

                <div className="flex gap-2 overflow-x-auto scrollbar-hide">
                    {viewMode === "orders" ? (
                        ORDER_STATUS_TABS.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setOrderStatus(tab.id)}
                                className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap
                                           transition-all duration-300
                                           ${orderStatus === tab.id
                                        ? "bg-emerald-500 text-white"
                                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                    }`}
                            >
                                {tab.label}
                            </button>
                        ))
                    ) : (
                        RESERVATION_STATUS_TABS.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setReservationStatus(tab.id)}
                                className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap
                                           transition-all duration-300
                                           ${reservationStatus === tab.id
                                        ? "bg-purple-500 text-white"
                                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                    }`}
                            >
                                {tab.label}
                            </button>
                        ))
                    )}
                </div>
            </header>

            <div className="px-4 py-4 space-y-3">
                {loading ? (
                    <div className="flex items-center justify-center py-16">
                        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
                    </div>
                ) : error ? (
                    <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                        <p className="text-lg font-medium">{error}</p>
                        <button onClick={() => window.location.reload()} className="mt-2 text-emerald-500">
                            Tekrar dene
                        </button>
                    </div>
                ) : viewMode === "orders" ? (
                    orders.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                            <Package className="w-16 h-16 mb-4 opacity-50" />
                            <p className="text-lg font-medium">Sipariş bulunamadı</p>
                        </div>
                    ) : (
                        orders.map((order) => (
                            <div
                                key={order.id}
                                className="rounded-2xl overflow-hidden transition-all duration-300 bg-white hover:shadow-lg border border-gray-100"
                            >
                                <div className="flex items-center justify-between p-4">
                                    <div className="flex items-center gap-3">
                                        <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-gray-200">
                                            {order.businessLogo && (
                                                <Image src={order.businessLogo} alt={order.businessName} fill className="object-cover" />
                                            )}
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-gray-900">
                                                {order.businessName}
                                            </h3>
                                            <p className="text-xs text-gray-400">
                                                {order.id}
                                            </p>
                                        </div>
                                    </div>
                                    <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium ${getOrderStatusColor(order.status)}`}>
                                        {order.status === "delivering" ? <Truck className="w-3.5 h-3.5" /> : <CheckCircle className="w-3.5 h-3.5" />}
                                        {getStatusLabel(order.status)}
                                    </div>
                                </div>
                                <div className="px-4 pb-4">
                                    <div className="text-sm mb-2 text-gray-600">
                                        {order.items.map(i => `${i.quantity}x ${i.name}`).join(", ")}
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-1 text-xs text-gray-400">
                                            <Clock className="w-3.5 h-3.5" />
                                            {new Date(order.createdAt).toLocaleDateString("tr-TR")}
                                        </div>
                                        <div className="text-lg font-bold text-gray-900">
                                            ₺{order.total.toFixed(2)}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))
                    )
                ) : (
                    reservations.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                            <Calendar className="w-16 h-16 mb-4 opacity-50" />
                            <p className="text-lg font-medium">Rezervasyon bulunamadı</p>
                        </div>
                    ) : (
                        reservations.map((res) => (
                            <div
                                key={res.id}
                                className="rounded-2xl overflow-hidden transition-all duration-300 bg-white hover:shadow-lg border border-gray-100"
                            >
                                <div className="flex items-center justify-between p-4">
                                    <div className="flex items-center gap-3">
                                        <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-gray-200">
                                            {res.businessLogo && (
                                                <Image src={res.businessLogo} alt={res.businessName} fill className="object-cover" />
                                            )}
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-gray-900">
                                                {res.businessName}
                                            </h3>
                                            <p className="text-xs text-gray-400">
                                                {res.type}
                                            </p>
                                        </div>
                                    </div>
                                    <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium ${getReservationStatusColor(res.status)}`}>
                                        <Calendar className="w-3.5 h-3.5" />
                                        {getStatusLabel(res.status)}
                                    </div>
                                </div>
                                <div className="px-4 pb-4">
                                    <div className="flex items-center gap-4 mb-2">
                                        <div className="flex items-center gap-1.5 text-sm text-gray-700">
                                            <Calendar className="w-4 h-4" />
                                            {new Date(res.date).toLocaleDateString("tr-TR")}
                                        </div>
                                        <div className="flex items-center gap-1.5 text-sm text-gray-700">
                                            <Clock className="w-4 h-4" />
                                            {res.time}
                                        </div>
                                        <div className="flex items-center gap-1.5 text-sm text-gray-700">
                                            <Users className="w-4 h-4" />
                                            {res.guestCount} kişi
                                        </div>
                                    </div>
                                    {res.businessAddress && (
                                        <div className="flex items-center gap-1 text-xs text-gray-400">
                                            <MapPin className="w-3.5 h-3.5" />
                                            {res.businessAddress}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))
                    )
                )}
            </div>
        </div>
    );
}
