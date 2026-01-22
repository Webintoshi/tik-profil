"use client";

import { useState, useEffect } from "react";
import {
    Settings,
    Truck,
    MapPin,
    CreditCard,
    Banknote,
    Clock,
    Phone,
    Bell,
    Loader2,
    Check,
    MessageCircle,
    Store,
    Smartphone
} from "lucide-react";
import clsx from "clsx";
import { toast } from "sonner";
import { useTheme } from "@/components/panel/ThemeProvider";

interface SettingsData {
    deliveryEnabled: boolean;
    pickupEnabled: boolean;
    minOrderAmount: number;
    deliveryFee: number;
    freeDeliveryAbove: number;
    estimatedDeliveryTime: string;
    cashPayment: boolean;
    cardOnDelivery: boolean;
    onlinePayment: boolean;
    useBusinessHours: boolean;
    whatsappNumber: string;
    notifications: {
        orderReceived: boolean;
        preparing: boolean;
        onWay: boolean;
        delivered: boolean;
    };
}

export default function FastFoodSettingsPage() {
    const { isDark } = useTheme();
    const [settings, setSettings] = useState<SettingsData | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Theme Variables
    const pageBg = isDark ? "bg-black" : "bg-[#F5F5F7]";
    const cardBg = isDark ? "bg-[#1C1C1E] border border-white/10" : "bg-white border border-gray-100 shadow-sm";
    const textPrimary = isDark ? "text-white" : "text-[#1D1D1F]";
    const textSecondary = isDark ? "text-[#86868B]" : "text-[#86868B]";
    const inputBg = isDark ? "bg-[#2C2C2E]" : "bg-[#E5E5EA]";

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        try {
            const res = await fetch("/api/fastfood/settings");
            const data = await res.json();
            if (data.success) {
                setSettings(data.settings);
            }
        } catch (error) {
            console.error("Failed to load settings:", error);
            toast.error("Ayarlar yüklenemedi");
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!settings) return;

        setSaving(true);
        try {
            const res = await fetch("/api/fastfood/settings", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(settings),
            });

            const data = await res.json();
            if (data.success) {
                toast.success("Ayarlar kaydedildi");
            } else {
                toast.error(data.error || "Kaydetme başarısız");
            }
        } catch (error) {
            console.error("Save error:", error);
            toast.error("Bir hata oluştu");
        } finally {
            setSaving(false);
        }
    };

    const Toggle = ({ checked, onChange, label, icon: Icon, description }: { checked: boolean; onChange: (val: boolean) => void; label: string, icon?: any, description?: string }) => (
        <div className="flex items-center justify-between py-4">
            <div className="flex items-center gap-4">
                {Icon && (
                    <div className={clsx("p-2.5 rounded-full", isDark ? "bg-[#2C2C2E]" : "bg-gray-100")}>
                        <Icon className={clsx("w-5 h-5", checked ? "text-blue-500" : "text-gray-400")} />
                    </div>
                )}
                <div>
                    <span className={clsx("font-semibold text-lg block", textPrimary)}>{label}</span>
                    {description && <span className={clsx("text-sm", textSecondary)}>{description}</span>}
                </div>
            </div>
            <button
                type="button"
                onClick={() => onChange(!checked)}
                className={clsx(
                    "w-14 h-8 rounded-full transition-colors relative duration-300",
                    checked ? "bg-[#34C759]" : (isDark ? "bg-[#3A3A3C]" : "bg-[#E5E5EA]")
                )}
            >
                <span className={clsx(
                    "absolute top-0.5 w-7 h-7 bg-white rounded-full shadow-md transition-transform duration-300 ease-[cubic-bezier(0.175,0.885,0.32,1.275)]",
                    checked ? "translate-x-[1.6rem] left-0" : "translate-x-0.5 left-0"
                )} />
            </button>
        </div>
    );

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
            </div>
        );
    }

    if (!settings) return null;

    return (
        <div className={clsx("min-h-screen p-4 md:p-8 space-y-8 font-sans transition-colors duration-300", pageBg, textPrimary)}>

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 max-w-4xl mx-auto">
                <div>
                    <h1 className="text-4xl font-bold tracking-tight">Ayarlar</h1>
                    <p className={clsx("text-lg mt-2 font-medium", textSecondary)}>
                        Mağazanızı özelleştirin
                    </p>
                </div>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-2 px-8 py-3.5 bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white rounded-full font-bold shadow-lg shadow-blue-500/30 transition-all disabled:opacity-50"
                >
                    {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
                    Değişiklikleri Kaydet
                </button>
            </div>

            <div className="max-w-4xl mx-auto space-y-8">

                {/* Delivery Options Card */}
                <div className={clsx("rounded-[2rem] p-8", cardBg)}>
                    <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
                        <Truck className="w-7 h-7 text-blue-500" />
                        Teslimat Yöntemleri
                    </h2>

                    <div className="space-y-2 divide-y border-b mb-6" style={{ borderColor: isDark ? '#2C2C2E' : '#F2F2F7', borderBottomWidth: '1px' }}>
                        <Toggle
                            checked={settings.pickupEnabled}
                            onChange={(val) => setSettings({ ...settings, pickupEnabled: val })}
                            label="Gel Al"
                            icon={Store}
                            description="Müşteriler siparişlerini restorandan teslim alsın"
                        />
                        {/* Divider for cleaner look if needed */}
                        <div style={{ borderColor: isDark ? '#2C2C2E' : '#F2F2F7' }}></div>
                        <Toggle
                            checked={settings.deliveryEnabled}
                            onChange={(val) => setSettings({ ...settings, deliveryEnabled: val })}
                            label="Paket Servis"
                            icon={Truck}
                            description="Kurye ile adrese teslimat yapın"
                        />
                    </div>

                    {settings.deliveryEnabled && (
                        <div className="grid md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-top-4 duration-300">
                            <div>
                                <label className={clsx("block text-sm font-bold ml-1 mb-2", textSecondary)}>MİNİMUM SİPARİŞ TUTARI (₺)</label>
                                <input
                                    type="number"
                                    value={settings.minOrderAmount}
                                    onChange={(e) => setSettings({ ...settings, minOrderAmount: parseFloat(e.target.value) || 0 })}
                                    className={clsx(
                                        "w-full px-5 py-4 rounded-2xl text-lg font-semibold outline-none transition-all",
                                        inputBg, isDark ? "focus:bg-[#3A3A3C]" : "focus:bg-gray-50 focus:shadow-inner"
                                    )}
                                />
                            </div>
                            <div>
                                <label className={clsx("block text-sm font-bold ml-1 mb-2", textSecondary)}>TESLİMAT ÜCRETİ (₺)</label>
                                <input
                                    type="number"
                                    value={settings.deliveryFee}
                                    onChange={(e) => setSettings({ ...settings, deliveryFee: parseFloat(e.target.value) || 0 })}
                                    className={clsx(
                                        "w-full px-5 py-4 rounded-2xl text-lg font-semibold outline-none transition-all",
                                        inputBg, isDark ? "focus:bg-[#3A3A3C]" : "focus:bg-gray-50 focus:shadow-inner"
                                    )}
                                />
                            </div>
                            <div>
                                <label className={clsx("block text-sm font-bold ml-1 mb-2", textSecondary)}>ÜCRETSİZ TESLİMAT LİMİTİ (₺)</label>
                                <input
                                    type="number"
                                    value={settings.freeDeliveryAbove}
                                    onChange={(e) => setSettings({ ...settings, freeDeliveryAbove: parseFloat(e.target.value) || 0 })}
                                    className={clsx(
                                        "w-full px-5 py-4 rounded-2xl text-lg font-semibold outline-none transition-all",
                                        inputBg, isDark ? "focus:bg-[#3A3A3C]" : "focus:bg-gray-50 focus:shadow-inner"
                                    )}
                                />
                            </div>
                            <div>
                                <label className={clsx("block text-sm font-bold ml-1 mb-2", textSecondary)}>TAHMİNİ TESLİMAT SÜRESİ</label>
                                <input
                                    type="text"
                                    value={settings.estimatedDeliveryTime}
                                    onChange={(e) => setSettings({ ...settings, estimatedDeliveryTime: e.target.value })}
                                    placeholder="Örn: 30-45 dk"
                                    className={clsx(
                                        "w-full px-5 py-4 rounded-2xl text-lg font-semibold outline-none transition-all",
                                        inputBg, isDark ? "focus:bg-[#3A3A3C]" : "focus:bg-gray-50 focus:shadow-inner"
                                    )}
                                />
                            </div>
                        </div>
                    )}
                </div>

                {/* Payment Methods */}
                <div className={clsx("rounded-[2rem] p-8", cardBg)}>
                    <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
                        <CreditCard className="w-7 h-7 text-purple-500" />
                        Ödeme Seçenekleri
                    </h2>

                    <div className="space-y-2 divide-y" style={{ borderColor: isDark ? '#2C2C2E' : '#F2F2F7' }}>
                        <Toggle
                            checked={settings.cashPayment}
                            onChange={(val) => setSettings({ ...settings, cashPayment: val })}
                            label="Kapıda Nakit"
                            icon={Banknote}
                        />
                        <div style={{ borderColor: isDark ? '#2C2C2E' : '#F2F2F7' }}></div>
                        <Toggle
                            checked={settings.cardOnDelivery}
                            onChange={(val) => setSettings({ ...settings, cardOnDelivery: val })}
                            label="Kapıda Kredi Kartı"
                            icon={CreditCard}
                        />
                    </div>
                </div>

                {/* WhatsApp & Notifications */}
                <div className={clsx("rounded-[2rem] p-8", cardBg)}>
                    <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
                        <MessageCircle className="w-7 h-7 text-green-500" />
                        WhatsApp Bildirimleri
                    </h2>

                    <div className="mb-8">
                        <label className={clsx("block text-sm font-bold ml-1 mb-2", textSecondary)}>WHATSAPP NUMARASI</label>
                        <div className="relative">
                            <Phone className={clsx("absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5", textSecondary)} />
                            <input
                                type="tel"
                                value={settings.whatsappNumber}
                                onChange={(e) => setSettings({ ...settings, whatsappNumber: e.target.value })}
                                placeholder="905xxxxxxxxx"
                                className={clsx(
                                    "w-full pl-14 pr-5 py-4 rounded-2xl text-lg font-semibold outline-none transition-all",
                                    inputBg, isDark ? "focus:bg-[#3A3A3C]" : "focus:bg-gray-50 focus:shadow-inner"
                                )}
                            />
                        </div>
                        <p className={clsx("text-sm mt-3 ml-1", textSecondary)}>
                            Müşterilere sipariş durum güncellemeleri bu numara üzerinden otomatik mesaj olarak gönderilir.
                        </p>
                    </div>

                    <div className="space-y-1 divide-y" style={{ borderColor: isDark ? '#2C2C2E' : '#F2F2F7' }}>
                        <h3 className={clsx("font-bold text-sm uppercase tracking-wider mb-4", textSecondary)}>Otomatik Mesaj Gönderilecek Durumlar</h3>
                        <Toggle
                            checked={settings.notifications.orderReceived}
                            onChange={(val) => setSettings({
                                ...settings,
                                notifications: { ...settings.notifications, orderReceived: val }
                            })}
                            label="Sipariş Alındı"
                            description="Sipariş ilk geldiğinde"
                        />
                        <Toggle
                            checked={settings.notifications.preparing}
                            onChange={(val) => setSettings({
                                ...settings,
                                notifications: { ...settings.notifications, preparing: val }
                            })}
                            label="Hazırlanıyor"
                            description="Sipariş hazırlanmaya başlandığında"
                        />
                        <Toggle
                            checked={settings.notifications.onWay}
                            onChange={(val) => setSettings({
                                ...settings,
                                notifications: { ...settings.notifications, onWay: val }
                            })}
                            label="Yola Çıktı"
                            description="Kuryeye teslim edildiğinde"
                        />
                        <Toggle
                            checked={settings.notifications.delivered}
                            onChange={(val) => setSettings({
                                ...settings,
                                notifications: { ...settings.notifications, delivered: val }
                            })}
                            label="Teslim Edildi"
                            description="Sipariş tamamlandığında"
                        />
                    </div>
                </div>

            </div>
        </div>
    );
}
