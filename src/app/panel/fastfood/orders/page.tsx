"use client";

import { useState, useEffect, useRef } from "react";
import {
    Clock,
    CheckCircle,
    XCircle,
    Truck,
    Phone,
    Loader2,
    ChefHat,
    MapPin,
    Volume2,
    VolumeX,
    Bell,
    Printer,
} from "lucide-react";
import clsx from "clsx";
import { toast } from "sonner";
import { useTheme } from "@/components/panel/ThemeProvider";
import { useBusinessContext } from "@/components/panel/BusinessSessionContext";
import {
    playNotificationSound,
    requestNotificationPermission,
    showBrowserNotification,
    updatePageTitle,
    flashTab,
    isSoundEnabled,
    setSoundEnabled,
    initAudioContext,
    vibrateDevice,
    stopRingtone
} from "@/lib/notification-sounds";

interface OrderItem {
    productName: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    selectedExtras?: { id: string; name: string; priceModifier: number }[];
    note?: string;
}

interface Order {
    id: string;
    orderNumber: string;
    customerName: string;
    customerPhone: string;
    customerAddress: string;
    deliveryType: 'pickup' | 'delivery';
    paymentMethod: 'cash' | 'card_on_delivery' | 'online';
    status: 'pending' | 'preparing' | 'on_way' | 'delivered' | 'cancelled';
    items: OrderItem[];
    subtotal: number;
    deliveryFee: number;
    total: number;
    customerNote: string;
    createdAt: string;
}

const STATUS_TABS = [
    { id: 'pending', label: 'Yeni', icon: Clock, color: 'text-amber-500', bg: 'bg-amber-500' },
    { id: 'preparing', label: 'Hazırlanıyor', icon: ChefHat, color: 'text-blue-500', bg: 'bg-blue-500' },
    { id: 'on_way', label: 'Yolda', icon: Truck, color: 'text-purple-500', bg: 'bg-purple-500' },
    { id: 'delivered', label: 'Geçmiş', icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-500' },
];

const STATUS_ACTIONS: Record<string, { next: string; label: string; color: string; icon: React.ComponentType<{ className?: string }> }[]> = {
    pending: [
        { next: 'cancelled', label: 'Reddet', color: 'bg-red-500 hover:bg-red-600', icon: XCircle },
        { next: 'preparing', label: 'Hazırla', color: 'bg-blue-600 hover:bg-blue-700', icon: ChefHat },
    ],
    preparing: [
        { next: 'on_way', label: 'Yola Çıkar / Teslime Hazır', color: 'bg-purple-600 hover:bg-purple-700', icon: Truck }
    ],
    on_way: [
        { next: 'delivered', label: 'Teslim Edildi', color: 'bg-green-600 hover:bg-green-700', icon: CheckCircle }
    ],
};

export default function FastFoodOrdersPage() {
    const { isDark } = useTheme();
    const session = useBusinessContext();
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('pending');
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [updatingStatus, setUpdatingStatus] = useState(false);
    const [soundEnabled, setSoundEnabledState] = useState(true);
    const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [showNewOrderFlash, setShowNewOrderFlash] = useState(false);

    // Track known order IDs to detect new orders
    const knownOrderIds = useRef<Set<string>>(new Set());
    const isFirstLoad = useRef(true);
    const printRef = useRef<HTMLDivElement>(null);

    // Theme Variables
    const pageBg = isDark ? "bg-black" : "bg-[#F5F5F7]";
    const cardBg = isDark ? "bg-[#1C1C1E]" : "bg-white";
    const textPrimary = isDark ? "text-white" : "text-[#1D1D1F]";
    const textSecondary = isDark ? "text-[#86868B]" : "text-[#86868B]";
    const borderColor = isDark ? "border-[#38383A]" : "border-[#D2D2D7]";

    // Initialize audio and check notification permission
    useEffect(() => {
        setSoundEnabledState(isSoundEnabled());

        // Check notification permission
        if (typeof window !== 'undefined' && 'Notification' in window) {
            setNotificationPermission(Notification.permission);
        }

        // Initialize audio context on first user interaction
        const handleInteraction = () => {
            initAudioContext();
            document.removeEventListener('click', handleInteraction);
        };
        document.addEventListener('click', handleInteraction);

        return () => {
            document.removeEventListener('click', handleInteraction);
            flashTab(false);
            updatePageTitle(0);
        };
    }, []);

    // Handle new order arrival
    const handleNewOrderArrival = (count: number) => {
        // Play sound if enabled
        if (soundEnabled) {
            playNotificationSound('newOrder');
            vibrateDevice([200, 100, 200, 100, 200]);
        }

        // Show browser notification
        showBrowserNotification(
            `🍔 ${count} Yeni Sipariş!`,
            'Bekleyen siparişleriniz var. Hemen kontrol edin!',
            { tag: 'new-order' }
        );

        // Flash the tab
        flashTab(true);
        setTimeout(() => flashTab(false), 5000);

        // Visual flash effect
        setShowNewOrderFlash(true);
        setTimeout(() => setShowNewOrderFlash(false), 2000);

        // Toast notification
        toast.success(`🔔 ${count} yeni sipariş geldi!`, {
            duration: 5000,
        });
    };

    useEffect(() => {
        if (!session?.businessId) {
            setLoading(false);
            return;
        }

        const statusList = activeTab === 'delivered'
            ? ['delivered', 'cancelled']
            : [activeTab];

        let isMounted = true;
        isFirstLoad.current = true;

        const fetchOrders = async (isInitial = false) => {
            if (!isMounted) return;
            if (!isInitial) setIsRefreshing(true);

            try {
                const res = await fetch(`/api/fastfood/orders?status=${statusList.join(',')}`);
                const data = await res.json();

                if (!data.success) {
                    toast.error(data.error || 'Siparişler yüklenemedi');
                    return;
                }

                const newOrders = (data.orders || []) as Order[];

                if (activeTab === 'pending' && !isFirstLoad.current) {
                    const newOrderCount = newOrders.filter(order => !knownOrderIds.current.has(order.id)).length;
                    if (newOrderCount > 0) {
                        handleNewOrderArrival(newOrderCount);
                    }
                }

                knownOrderIds.current = new Set(newOrders.map(order => order.id));
                isFirstLoad.current = false;

                setOrders(newOrders);
                setLoading(false);

                if (activeTab === 'pending') {
                    updatePageTitle(newOrders.length);
                }
            } catch (error) {
                console.error('Orders polling error:', error);
                toast.error('Sipariş güncellemeleri alınamadı');
            } finally {
                if (isMounted) setIsRefreshing(false);
            }
        };

        fetchOrders(true);
        const intervalId = window.setInterval(() => fetchOrders(false), 5000);

        return () => {
            isMounted = false;
            window.clearInterval(intervalId);
            isFirstLoad.current = true;
            knownOrderIds.current.clear();
        };
    }, [session?.businessId, activeTab, soundEnabled]);

    // Toggle sound
    const toggleSound = () => {
        const newValue = !soundEnabled;
        setSoundEnabledState(newValue);

        if (newValue) {
            playNotificationSound('statusChange');
            toast.success('Ses bildirimleri açıldı');
        } else {
            toast.info('Ses bildirimleri kapatıldı');
        }
    };

    // Request notification permission
    const handleRequestPermission = async () => {
        const granted = await requestNotificationPermission();
        setNotificationPermission(granted ? 'granted' : 'denied');

        if (granted) {
            toast.success('Bildirim izni verildi!');
        } else {
            toast.error('Bildirim izni reddedildi');
        }
    };

    const updateStatus = async (orderId: string, newStatus: string) => {
        setUpdatingStatus(true);
        // Stop the notification ringtone when any action is taken
        stopRingtone();
        try {
            const res = await fetch("/api/fastfood/orders", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id: orderId, status: newStatus }),
            });
            const data = await res.json();
            if (data.success) {
                if (soundEnabled) playNotificationSound('statusChange');
                toast.success("Sipariş durumu güncellendi");
                // Real-time listener will update automatically
                setSelectedOrder(null);
            } else {
                toast.error(data.error || "Güncelleme başarısız");
            }
        } catch (error) {
            console.error("Update error:", error);
            toast.error("Bir hata oluştu");
        } finally {
            setUpdatingStatus(false);
        }
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
    };

    // Print receipt
    const handlePrint = () => {
        if (!selectedOrder) return;

        const printWindow = window.open('', '_blank', 'width=400,height=600');
        if (!printWindow) return;

        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Sipariş #${selectedOrder.orderNumber}</title>
                <style>
                    * { margin: 0; padding: 0; box-sizing: border-box; }
                    body { 
                        font-family: 'Courier New', monospace; 
                        padding: 10mm; 
                        width: 80mm;
                        font-size: 12px;
                    }
                    .header { text-align: center; margin-bottom: 10px; border-bottom: 2px solid #000; padding-bottom: 10px; }
                    .order-number { font-size: 28px; font-weight: bold; }
                    .section { margin: 10px 0; }
                    .row { display: flex; justify-content: space-between; margin: 3px 0; }
                    .items { border-top: 2px solid #000; border-bottom: 2px solid #000; padding: 10px 0; margin: 10px 0; }
                    .item { margin: 8px 0; padding-bottom: 8px; border-bottom: 1px dashed #ccc; }
                    .item:last-child { border-bottom: none; }
                    .item-name { font-weight: bold; font-size: 14px; }
                    .extras { margin: 4px 0 4px 15px; font-size: 11px; }
                    .extras .extra { margin: 2px 0; }
                    .item-note { margin-top: 4px; font-style: italic; background: #f5f5f5; padding: 3px 5px; font-size: 11px; }
                    .total { font-size: 18px; font-weight: bold; margin-top: 10px; border-top: 2px solid #000; padding-top: 5px; }
                    .footer { text-align: center; margin-top: 15px; font-size: 10px; }
                    .customer-note { background: #fff3cd; padding: 8px; margin-top: 10px; border: 1px solid #ffc107; }
                    @media print {
                        body { width: 80mm; }
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <div class="order-number">${selectedOrder.orderNumber}</div>
                    <div style="font-size: 14px; margin-top: 5px;">${new Date(selectedOrder.createdAt).toLocaleString('tr-TR')}</div>
                    <div style="font-size: 16px; margin-top: 5px; font-weight: bold;">${selectedOrder.deliveryType === 'delivery' ? '🚗 PAKET SERVİS' : '🏃 GEL AL'}</div>
                </div>
                
                <div class="section">
                    <div style="font-size: 14px;"><strong>${selectedOrder.customerName}</strong></div>
                    <div>${selectedOrder.customerPhone}</div>
                    ${selectedOrder.customerAddress ? `<div style="margin-top: 3px;">${selectedOrder.customerAddress}</div>` : ''}
                </div>
                
                <div class="items">
                    <div style="text-align: center; font-weight: bold; margin-bottom: 8px;">═══ SİPARİŞ DETAYI ═══</div>
                    ${selectedOrder.items.map(item => `
                        <div class="item">
                            <div class="row">
                                <span class="item-name">${item.quantity}x ${item.productName}</span>
                                <span style="font-weight: bold;">₺${item.totalPrice}</span>
                            </div>
                            ${item.selectedExtras && item.selectedExtras.length > 0 ? `
                                <div class="extras">
                                    ${item.selectedExtras.map(ext => `
                                        <div class="extra">+ ${ext.name}${ext.priceModifier > 0 ? ` (+₺${ext.priceModifier})` : ''}</div>
                                    `).join('')}
                                </div>
                            ` : ''}
                            ${item.note ? `<div class="item-note">📝 ${item.note}</div>` : ''}
                        </div>
                    `).join('')}
                </div>
                
                <div class="section">
                    <div class="row"><span>Ara Toplam:</span><span>₺${selectedOrder.subtotal}</span></div>
                    ${selectedOrder.deliveryFee > 0 ? `<div class="row"><span>Teslimat:</span><span>₺${selectedOrder.deliveryFee}</span></div>` : ''}
                    <div class="row total"><span>TOPLAM:</span><span>₺${selectedOrder.total}</span></div>
                    <div class="row" style="margin-top: 5px;"><span>Ödeme:</span><span style="font-weight: bold;">${selectedOrder.paymentMethod === 'cash' ? '💵 NAKİT' : '💳 KART'}</span></div>
                </div>
                
                ${selectedOrder.customerNote ? `
                    <div class="customer-note">
                        <strong>📋 MÜŞTERİ NOTU:</strong><br/>
                        ${selectedOrder.customerNote}
                    </div>
                ` : ''}
                
                <div class="footer">
                    <p>════════════════════</p>
                    <p>TikProfil Fast Food Sistemi</p>
                    <p>Afiyet olsun! 🍔</p>
                </div>
            </body>
            </html>
        `);

        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
            printWindow.print();
            printWindow.close();
        }, 250);
    };

    return (
        <div className={clsx(
            "min-h-screen p-4 md:p-8 space-y-8 font-sans transition-colors duration-300",
            pageBg,
            textPrimary,
            showNewOrderFlash && "animate-pulse"
        )}>
            {/* New Order Flash Overlay */}
            {showNewOrderFlash && (
                <div className="fixed inset-0 bg-green-500/20 pointer-events-none z-40 animate-pulse" />
            )}

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h1 className="text-4xl font-bold tracking-tight">Siparişler</h1>
                    <p className={clsx("text-lg mt-2 font-medium", textSecondary)}>
                        Operasyon durumunu takip edin
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    {/* Sound Toggle */}
                    <button
                        onClick={toggleSound}
                        className={clsx(
                            "p-3 rounded-xl transition-all",
                            soundEnabled
                                ? "bg-green-500/10 text-green-500"
                                : "bg-gray-500/10 text-gray-500"
                        )}
                        title={soundEnabled ? "Ses açık" : "Ses kapalı"}
                    >
                        {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
                    </button>

                    {/* Notification Permission */}
                    {notificationPermission !== 'granted' && (
                        <button
                            onClick={handleRequestPermission}
                            className="p-3 rounded-xl bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 transition-all"
                            title="Bildirim izni ver"
                        >
                            <Bell className="w-5 h-5" />
                        </button>
                    )}

                    {/* Status Tabs */}
                    <div className={clsx("flex items-center gap-2 p-1 rounded-full border", isDark ? "bg-[#1C1C1E] border-white/10" : "bg-white border-gray-200")}>
                        {STATUS_TABS.map(tab => {
                            const Icon = tab.icon;
                            const isActive = activeTab === tab.id;
                            const pendingCount = tab.id === 'pending' ? orders.filter(o => o.status === 'pending').length : 0;

                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={clsx(
                                        "flex items-center gap-2 px-5 py-2.5 rounded-full font-semibold transition-all duration-300",
                                        isActive
                                            ? (isDark ? "bg-white text-black shadow-lg" : "bg-black text-white shadow-lg")
                                            : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                                    )}
                                >
                                    <Icon className={clsx("w-4 h-4", isActive ? "" : tab.color)} />
                                    <span className={isActive ? "block" : "hidden md:block"}>{tab.label}</span>
                                    {isActive && orders.length > 0 && (
                                        <span className={clsx(
                                            "ml-1 px-1.5 py-0.5 rounded-full text-white text-[10px]",
                                            tab.id === 'pending' && orders.length > 0 ? "bg-red-500 animate-pulse" : "bg-orange-500"
                                        )}>
                                            {orders.length}
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Orders Grid */}
            {loading ? (
                <div className="flex flex-col items-center justify-center py-32">
                    <Loader2 className="w-10 h-10 animate-spin text-blue-500 mb-4" />
                    <p className={textSecondary}>Siparişler yükleniyor...</p>
                </div>
            ) : orders.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-32 text-center">
                    <div className={clsx("w-32 h-32 rounded-full flex items-center justify-center mb-6", isDark ? "bg-[#1C1C1E]" : "bg-white shadow-sm")}>
                        <CheckCircle className={clsx("w-12 h-12 opacity-50", textSecondary)} />
                    </div>
                    <h3 className="text-2xl font-bold mb-3">Tüm siparişler tamam</h3>
                    <p className={clsx("max-w-md text-lg", textSecondary)}>
                        Şu anda bu kategoride bekleyen siparişiniz bulunmuyor.
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {orders.map((order) => (
                        <div
                            key={order.id}
                            onClick={() => setSelectedOrder(order)}
                            className={clsx(
                                "group cursor-pointer rounded-[2rem] p-6 transition-all duration-300 relative overflow-hidden",
                                cardBg,
                                isDark ? "hover:bg-[#2C2C2E] border border-white/5" : "hover:shadow-xl hover:shadow-black/5 shadow-sm border border-gray-100"
                            )}
                        >
                            {/* Status Indicator Strip */}
                            <div className={clsx("absolute top-0 left-0 w-full h-1.5",
                                order.status === 'pending' ? 'bg-amber-500' :
                                    order.status === 'preparing' ? 'bg-blue-500' :
                                        order.status === 'on_way' ? 'bg-purple-500' : 'bg-green-500'
                            )} />

                            {/* Header */}
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h3 className="text-2xl font-bold font-mono tracking-tight">{order.orderNumber}</h3>
                                    <span className={clsx("text-sm font-medium flex items-center gap-1 mt-1", textSecondary)}>
                                        <Clock className="w-3.5 h-3.5" /> {formatDate(order.createdAt)}
                                    </span>
                                </div>
                                <div className={clsx("p-2.5 rounded-full", isDark ? "bg-[#2C2C2E]" : "bg-gray-100")}>
                                    {order.deliveryType === 'delivery' ? <Truck className="w-5 h-5 text-purple-500" /> : <MapPin className="w-5 h-5 text-blue-500" />}
                                </div>
                            </div>

                            {/* Customer */}
                            <div className="mb-6 flex items-center gap-3">
                                <div className={clsx("w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg", isDark ? "bg-[#3A3A3C] text-gray-300" : "bg-gray-200 text-gray-600")}>
                                    {order.customerName.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <p className="font-bold leading-tight">{order.customerName}</p>
                                    <p className={clsx("text-sm", textSecondary)}>{order.customerPhone}</p>
                                </div>
                            </div>

                            {/* Order Summary */}
                            <div className={clsx("p-4 rounded-2xl mb-4 space-y-2", isDark ? "bg-[#2C2C2E]" : "bg-gray-50")}>
                                {order.items.slice(0, 2).map((item, i) => (
                                    <div key={i} className="flex justify-between text-sm font-medium">
                                        <span><span className="text-orange-500 font-bold">{item.quantity}x</span> {item.productName}</span>
                                    </div>
                                ))}
                                {order.items.length > 2 && (
                                    <p className="text-xs text-gray-400 font-medium pl-1">+{order.items.length - 2} ürün daha...</p>
                                )}
                            </div>

                            {/* Footer */}
                            <div className="flex items-center justify-between pt-2">
                                <div className="flex items-center gap-2">
                                    <span className={clsx("px-2.5 py-1 rounded-lg text-xs font-bold uppercase",
                                        order.paymentMethod === 'cash' ? "bg-green-500/10 text-green-500" : "bg-blue-500/10 text-blue-500"
                                    )}>
                                        {order.paymentMethod === 'cash' ? "Nakit" : "Kart"}
                                    </span>
                                </div>
                                <span className="text-xl font-bold">₺{order.total}</span>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Detail Modal */}
            {selectedOrder && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6">
                    <div
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        onClick={() => setSelectedOrder(null)}
                    />
                    <div
                        className={clsx(
                            "relative w-full max-w-lg rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col max-h-[90vh]",
                            isDark ? "bg-[#1C1C1E] border border-white/10" : "bg-white"
                        )}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Modal Header */}
                        <div className="p-8 pb-4 border-b border-dashed" style={{ borderColor: isDark ? '#38383A' : '#E5E5EA' }}>
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className={clsx("text-sm font-bold uppercase tracking-wider mb-1", textSecondary)}>Sipariş Detayı</p>
                                    <h2 className="text-4xl font-bold tracking-tighter text-orange-500">{selectedOrder.orderNumber}</h2>
                                </div>
                                <div className="flex items-center gap-2">
                                    {/* Print Button */}
                                    <button
                                        onClick={handlePrint}
                                        className={clsx(
                                            "p-2.5 rounded-xl transition-all",
                                            isDark ? "bg-white/5 hover:bg-white/10" : "bg-gray-100 hover:bg-gray-200"
                                        )}
                                        title="Yazdır"
                                    >
                                        <Printer className="w-5 h-5" />
                                    </button>
                                    <div className={clsx("px-4 py-2 rounded-xl text-sm font-bold",
                                        selectedOrder.deliveryType === 'delivery' ? "bg-purple-500/10 text-purple-500" : "bg-blue-500/10 text-blue-500"
                                    )}>
                                        {selectedOrder.deliveryType === 'delivery' ? 'Paket Servis' : 'Gel Al'}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-8 pt-6 custom-scrollbar">
                            {/* Customer Info Card */}
                            <div className={clsx("p-5 rounded-2xl mb-6 flex items-start gap-4", isDark ? "bg-[#2C2C2E]" : "bg-gray-50")}>
                                <div className="p-3 bg-white/10 rounded-full">
                                    <Phone className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg">{selectedOrder.customerName}</h3>
                                    <p className="text-lg font-mono mb-1">{selectedOrder.customerPhone}</p>
                                    {selectedOrder.customerAddress && (
                                        <p className={clsx("text-sm leading-relaxed", textSecondary)}>
                                            {selectedOrder.customerAddress}
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* Items List */}
                            <div className="space-y-4 mb-6">
                                <h3 className={clsx("text-sm font-bold uppercase tracking-wider", textSecondary)}>Sepet İçeriği</h3>
                                {selectedOrder.items.map((item, i) => (
                                    <div key={i} className="pb-4 border-b border-dashed last:border-0" style={{ borderColor: isDark ? '#38383A' : '#E5E5EA' }}>
                                        <div className="flex items-start justify-between">
                                            <div className="flex items-start gap-3">
                                                <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-orange-500 text-white font-bold text-sm mt-0.5">
                                                    {item.quantity}x
                                                </span>
                                                <div className="flex-1">
                                                    <span className="font-semibold text-lg block">{item.productName}</span>
                                                    {/* Show extras */}
                                                    {item.selectedExtras && item.selectedExtras.length > 0 && (
                                                        <div className="mt-1 space-y-0.5">
                                                            {item.selectedExtras.map((ext, idx) => (
                                                                <div key={idx} className={clsx("text-sm flex items-center gap-1", textSecondary)}>
                                                                    <span className="text-green-500">+</span>
                                                                    <span>{ext.name}</span>
                                                                    {ext.priceModifier > 0 && (
                                                                        <span className="text-orange-500 font-medium">(+₺{ext.priceModifier})</span>
                                                                    )}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                    {/* Show item note */}
                                                    {item.note && (
                                                        <p className="mt-1 text-sm text-amber-500 italic">📝 {item.note}</p>
                                                    )}
                                                </div>
                                            </div>
                                            <span className="font-bold text-lg">₺{item.totalPrice}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Note */}
                            {selectedOrder.customerNote && (
                                <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500 mb-6">
                                    <p className="text-xs font-bold uppercase mb-1 opacity-70">Müşteri Notu</p>
                                    <p className="font-medium italic">"{selectedOrder.customerNote}"</p>
                                </div>
                            )}

                            {/* Summary */}
                            <div className="space-y-2 pt-4 border-t" style={{ borderColor: isDark ? '#38383A' : '#E5E5EA' }}>
                                <div className="flex justify-between text-gray-500">
                                    <span>Ara Toplam</span>
                                    <span>₺{selectedOrder.subtotal}</span>
                                </div>
                                {selectedOrder.deliveryFee > 0 && (
                                    <div className="flex justify-between text-gray-500">
                                        <span>Teslimat Ücreti</span>
                                        <span>₺{selectedOrder.deliveryFee}</span>
                                    </div>
                                )}
                                <div className="flex justify-between text-2xl font-bold mt-2">
                                    <span>Toplam Tutar</span>
                                    <span>₺{selectedOrder.total}</span>
                                </div>
                            </div>
                        </div>

                        {/* Actions Footer */}
                        <div className={clsx("p-6 border-t", borderColor)}>
                            {STATUS_ACTIONS[selectedOrder.status] ? (
                                <div className="flex gap-4">
                                    {STATUS_ACTIONS[selectedOrder.status].map((action) => {
                                        const Icon = action.icon;
                                        return (
                                            <button
                                                key={action.next}
                                                onClick={() => updateStatus(selectedOrder.id, action.next)}
                                                disabled={updatingStatus}
                                                className={clsx(
                                                    "flex-1 py-4 px-6 rounded-2xl text-white font-bold text-lg shadow-lg transition-all active:scale-[0.98] flex items-center justify-center gap-2",
                                                    action.color
                                                )}
                                            >
                                                {updatingStatus ? <Loader2 className="w-6 h-6 animate-spin" /> : <Icon className="w-6 h-6" />}
                                                {action.label}
                                            </button>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="text-center text-gray-500 font-medium py-2">
                                    Bu sipariş tamamlandı veya iptal edildi.
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
