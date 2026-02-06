"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Wifi, Gift, CreditCard, Clock, Percent, Coffee } from "lucide-react";
import { LiquidMetalCard } from "@/components/cities/LiquidMetalCard";
import { useBusinessSession } from "@/hooks/useBusinessSession";

interface Settings {
    wifi_name: string;
    wifi_password: string;
    loyalty_enabled: boolean;
    loyalty_type: string;
    stamps_for_free_drink: number;
    points_per_currency: number;
    tier_enabled: boolean;
    subscription_enabled: boolean;
    subscription_price: number;
    tip_enabled: boolean;
    tip_percentages: number[];
    tax_rate: number;
    preparation_time_default: number;
    pickup_enabled: boolean;
    payment_cash: boolean;
    payment_credit_card: boolean;
    payment_mobile: boolean;
}

const defaultSettings: Settings = {
    wifi_name: "",
    wifi_password: "",
    loyalty_enabled: true,
    loyalty_type: "stamps",
    stamps_for_free_drink: 10,
    points_per_currency: 10,
    tier_enabled: true,
    subscription_enabled: false,
    subscription_price: 299,
    tip_enabled: true,
    tip_percentages: [10, 15, 20],
    tax_rate: 10,
    preparation_time_default: 5,
    pickup_enabled: true,
    payment_cash: true,
    payment_credit_card: true,
    payment_mobile: true
};

export default function CoffeeSettingsPage() {
    const router = useRouter();
    const { session, loading: sessionLoading } = useBusinessSession();
    const [settings, setSettings] = useState<Settings>(defaultSettings);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [activeTab, setActiveTab] = useState<"general" | "loyalty" | "payment">("general");

    useEffect(() => {
        if (!sessionLoading && !session) {
            router.push("/giris-yap");
            return;
        }
        if (session?.businessId) {
            fetchSettings();
        }
    }, [session, sessionLoading]);

    const fetchSettings = async () => {
        try {
            const res = await fetch(`/api/coffee/settings?business_id=${session?.businessId}`);
            if (res.ok) {
                const data = await res.json();
                if (data.data) {
                    setSettings({ ...defaultSettings, ...data.data });
                }
            }
        } catch (error) {
            console.error("Error fetching settings:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await fetch("/api/coffee/settings", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ...settings, business_id: session?.businessId })
            });
        } catch (error) {
            console.error("Error saving settings:", error);
        } finally {
            setSaving(false);
        }
    };

    const updateSetting = <K extends keyof Settings>(key: K, value: Settings[K]) => {
        setSettings(prev => ({ ...prev, [key]: value }));
    };

    if (sessionLoading || loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="w-12 h-12 border-4 border-white/10 border-t-[#fe1e50] rounded-full animate-spin" />
            </div>
        );
    }

    const tabs = [
        { id: "general" as const, label: "Genel", icon: Coffee },
        { id: "loyalty" as const, label: "Sadakat", icon: Gift },
        { id: "payment" as const, label: "Ödeme", icon: CreditCard }
    ];

    return (
        <div className="p-6 max-w-4xl mx-auto">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-white">İşletme Ayarları</h1>
                <p className="text-white/50 mt-1">Kahve dükkanınızın ayarlarını yönetin</p>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 mb-6 overflow-x-auto scrollbar-hide">
                {tabs.map(tab => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium transition-all whitespace-nowrap ${
                                isActive 
                                    ? "bg-[#fe1e50] text-white shadow-lg shadow-[#fe1e50]/25" 
                                    : "bg-white/[0.05] text-white/60 hover:bg-white/[0.1]"
                            }`}
                        >
                            <Icon className="w-4 h-4" />
                            {tab.label}
                        </button>
                    );
                })}
            </div>

            {/* General Tab */}
            {activeTab === "general" && (
                <div className="space-y-6">
                    <LiquidMetalCard>
                        <div className="p-6">
                            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                                <Wifi className="w-5 h-5 text-[#fe1e50]" />
                                WiFi Bilgileri
                            </h3>
                            <div className="grid md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm text-white/60 mb-2">WiFi Adı</label>
                                    <input
                                        type="text"
                                        value={settings.wifi_name}
                                        onChange={(e) => updateSetting("wifi_name", e.target.value)}
                                        className="w-full px-4 py-3 bg-white/[0.05] border border-white/[0.1] rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-[#fe1e50]/50"
                                        placeholder="KahveDükkanı-WiFi"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm text-white/60 mb-2">WiFi Şifresi</label>
                                    <input
                                        type="text"
                                        value={settings.wifi_password}
                                        onChange={(e) => updateSetting("wifi_password", e.target.value)}
                                        className="w-full px-4 py-3 bg-white/[0.05] border border-white/[0.1] rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-[#fe1e50]/50"
                                        placeholder="••••••••"
                                    />
                                </div>
                            </div>
                        </div>
                    </LiquidMetalCard>

                    <LiquidMetalCard>
                        <div className="p-6">
                            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                                <Clock className="w-5 h-5 text-[#fe1e50]" />
                                Sipariş Ayarları
                            </h3>
                            <div className="grid md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm text-white/60 mb-2">Varsayılan Hazırlık Süresi (dakika)</label>
                                    <input
                                        type="number"
                                        value={settings.preparation_time_default}
                                        onChange={(e) => updateSetting("preparation_time_default", parseInt(e.target.value))}
                                        className="w-full px-4 py-3 bg-white/[0.05] border border-white/[0.1] rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-[#fe1e50]/50"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm text-white/60 mb-2">KDV Oranı (%)</label>
                                    <input
                                        type="number"
                                        value={settings.tax_rate}
                                        onChange={(e) => updateSetting("tax_rate", parseFloat(e.target.value))}
                                        className="w-full px-4 py-3 bg-white/[0.05] border border-white/[0.1] rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-[#fe1e50]/50"
                                    />
                                </div>
                            </div>
                            <div className="mt-4 flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="pickup_enabled"
                                    checked={settings.pickup_enabled}
                                    onChange={(e) => updateSetting("pickup_enabled", e.target.checked)}
                                    className="rounded bg-white/[0.05] border-white/[0.1]"
                                />
                                <label htmlFor="pickup_enabled" className="text-white/60">Önden sipariş (Pickup) aktif</label>
                            </div>
                        </div>
                    </LiquidMetalCard>
                </div>
            )}

            {/* Loyalty Tab */}
            {activeTab === "loyalty" && (
                <div className="space-y-6">
                    <LiquidMetalCard>
                        <div className="p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                    <Gift className="w-5 h-5 text-[#fe1e50]" />
                                    Sadakat Sistemi
                                </h3>
                                <button
                                    onClick={() => updateSetting("loyalty_enabled", !settings.loyalty_enabled)}
                                    className={`relative w-12 h-6 rounded-full transition-colors ${settings.loyalty_enabled ? "bg-[#fe1e50]" : "bg-white/20"}`}
                                >
                                    <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${settings.loyalty_enabled ? "translate-x-7" : "translate-x-1"}`} />
                                </button>
                            </div>

                            {settings.loyalty_enabled && (
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm text-white/60 mb-2">Sistem Tipi</label>
                                        <select
                                            value={settings.loyalty_type}
                                            onChange={(e) => updateSetting("loyalty_type", e.target.value)}
                                            className="w-full px-4 py-3 bg-white/[0.05] border border-white/[0.1] rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-[#fe1e50]/50"
                                        >
                                            <option value="stamps" className="bg-[#1a1a2e]">Damga Sistemi (10 al 1 bedava)</option>
                                            <option value="points" className="bg-[#1a1a2e]">Puan Sistemi</option>
                                        </select>
                                    </div>
                                    <div className="grid md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm text-white/60 mb-2">Bedava İçecek İçin Damga</label>
                                            <input
                                                type="number"
                                                value={settings.stamps_for_free_drink}
                                                onChange={(e) => updateSetting("stamps_for_free_drink", parseInt(e.target.value))}
                                                className="w-full px-4 py-3 bg-white/[0.05] border border-white/[0.1] rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-[#fe1e50]/50"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm text-white/60 mb-2">Her 1 ₺ için Kazanılan Puan</label>
                                            <input
                                                type="number"
                                                value={settings.points_per_currency}
                                                onChange={(e) => updateSetting("points_per_currency", parseInt(e.target.value))}
                                                className="w-full px-4 py-3 bg-white/[0.05] border border-white/[0.1] rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-[#fe1e50]/50"
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </LiquidMetalCard>
                </div>
            )}

            {/* Payment Tab */}
            {activeTab === "payment" && (
                <LiquidMetalCard>
                    <div className="p-6">
                        <h3 className="text-lg font-bold text-white mb-4">Kabul Edilen Ödeme Yöntemleri</h3>
                        <div className="space-y-3">
                            {[
                                { key: "payment_cash", label: "Nakit", desc: "Kasa ile ödeme" },
                                { key: "payment_credit_card", label: "Kredi Kartı", desc: "POS ile ödeme" },
                                { key: "payment_mobile", label: "Mobil Ödeme", desc: "QR, uygulama içi ödeme" }
                            ].map(({ key, label, desc }) => (
                                <label
                                    key={key}
                                    className={`flex items-center justify-between p-4 rounded-xl cursor-pointer transition ${
                                        settings[key as keyof Settings] 
                                            ? "bg-[#fe1e50]/10 border border-[#fe1e50]/30" 
                                            : "bg-white/[0.03] border border-white/[0.08]"
                                    }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <input
                                            type="checkbox"
                                            checked={settings[key as keyof Settings] as boolean}
                                            onChange={(e) => updateSetting(key as keyof Settings, e.target.checked as any)}
                                            className="rounded bg-white/[0.05] border-white/[0.1]"
                                        />
                                        <div>
                                            <p className="text-white font-medium">{label}</p>
                                            <p className="text-white/40 text-sm">{desc}</p>
                                        </div>
                                    </div>
                                </label>
                            ))}
                        </div>
                    </div>
                </LiquidMetalCard>
            )}

            {/* Save Button */}
            <div className="mt-8 flex justify-end gap-3">
                <button
                    onClick={fetchSettings}
                    className="px-6 py-3 bg-white/[0.05] text-white rounded-xl hover:bg-white/[0.1] transition"
                >
                    Sıfırla
                </button>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="px-6 py-3 bg-[#fe1e50] text-white rounded-xl hover:bg-[#fe1e50]/90 transition disabled:opacity-50"
                >
                    {saving ? "Kaydediliyor..." : "Değişiklikleri Kaydet"}
                </button>
            </div>
        </div>
    );
}
