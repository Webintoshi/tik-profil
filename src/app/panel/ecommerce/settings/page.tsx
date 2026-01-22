"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Settings,
    Save,
    Loader2,
    Store,
    Truck,
    CreditCard,
    Bell,
    Package,
    FileCheck,
    Plus,
    Trash2,
    X,
    Check,
} from "lucide-react";
import { toast } from "sonner";
import clsx from "clsx";
import { useBusinessSession } from "@/hooks/useBusinessSession";
import { useTheme } from "@/components/panel/ThemeProvider";
import type { EcommerceSettings, ShippingOption } from "@/types/ecommerce";

// Tab types
type SettingsTab = "store" | "shipping" | "payment" | "notifications" | "stock" | "checkout";

const TABS: { id: SettingsTab; label: string; icon: React.ElementType }[] = [
    { id: "store", label: "Mağaza", icon: Store },
    { id: "shipping", label: "Kargo", icon: Truck },
    { id: "payment", label: "Ödeme", icon: CreditCard },
    { id: "notifications", label: "Bildirim", icon: Bell },
    { id: "stock", label: "Stok", icon: Package },
    { id: "checkout", label: "Ödeme Formu", icon: FileCheck },
];

// Simple toggle component
function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label?: string }) {
    return (
        <button
            type="button"
            onClick={() => onChange(!checked)}
            className={clsx(
                "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                checked ? "bg-emerald-500" : "bg-gray-300"
            )}
        >
            <span
                className={clsx(
                    "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                    checked ? "translate-x-6" : "translate-x-1"
                )}
            />
        </button>
    );
}

// Input component
function FormInput({
    label,
    value,
    onChange,
    type = "text",
    placeholder,
    suffix,
    min,
    step,
}: {
    label: string;
    value: string | number;
    onChange: (v: string) => void;
    type?: string;
    placeholder?: string;
    suffix?: string;
    min?: number;
    step?: number;
}) {
    return (
        <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
            <div className="relative">
                <input
                    type={type}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={placeholder}
                    min={min}
                    step={step}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
                />
                {suffix && (
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                        {suffix}
                    </span>
                )}
            </div>
        </div>
    );
}

export default function EcommerceSettingsPage() {
    const { session } = useBusinessSession();
    const { isDark } = useTheme();
    const [activeTab, setActiveTab] = useState<SettingsTab>("store");
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [settings, setSettings] = useState<EcommerceSettings | null>(null);
    const [showShippingModal, setShowShippingModal] = useState(false);
    const [editingShipping, setEditingShipping] = useState<ShippingOption | null>(null);

    // Fetch settings
    useEffect(() => {
        async function fetchSettings() {
            if (!session?.businessId) return;

            try {
                const res = await fetch(`/api/ecommerce/settings?businessId=${session.businessId}`);
                if (res.ok) {
                    const data = await res.json();
                    setSettings(data);
                }
            } catch (error) {
                console.error("Settings fetch error:", error);
                toast.error("Ayarlar yüklenemedi");
            } finally {
                setIsLoading(false);
            }
        }

        fetchSettings();
    }, [session?.businessId]);

    // Save settings
    const handleSave = async () => {
        if (!settings || !session?.businessId) return;

        setIsSaving(true);
        try {
            const res = await fetch("/api/ecommerce/settings", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ businessId: session.businessId, ...settings }),
            });

            if (res.ok) {
                toast.success("Ayarlar kaydedildi");
            } else {
                const data = await res.json();
                toast.error(data.error || "Kaydetme hatası");
            }
        } catch (error) {
            console.error("Save error:", error);
            toast.error("Bağlantı hatası");
        } finally {
            setIsSaving(false);
        }
    };

    // Update helper
    const updateSettings = (updates: Partial<EcommerceSettings>) => {
        setSettings((prev) => (prev ? { ...prev, ...updates } : prev));
    };

    // Add/Edit shipping option
    const handleSaveShipping = (option: ShippingOption) => {
        if (!settings) return;

        const exists = settings.shippingOptions.find((o) => o.id === option.id);
        const updated = exists
            ? settings.shippingOptions.map((o) => (o.id === option.id ? option : o))
            : [...settings.shippingOptions, option];

        updateSettings({ shippingOptions: updated });
        setShowShippingModal(false);
        setEditingShipping(null);
    };

    // Delete shipping option
    const handleDeleteShipping = (id: string) => {
        if (!settings) return;
        updateSettings({
            shippingOptions: settings.shippingOptions.filter((o) => o.id !== id),
        });
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
            </div>
        );
    }

    if (!settings) {
        return (
            <div className="text-center py-12 text-gray-500">
                Ayarlar yüklenemedi
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto p-4 sm:p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
                        <Settings className="h-6 w-6 text-white" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-gray-900">Mağaza Ayarları</h1>
                        <p className="text-sm text-gray-500">E-ticaret ayarlarınızı yönetin</p>
                    </div>
                </div>

                <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-medium transition-colors disabled:opacity-50"
                >
                    {isSaving ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                        <Save className="h-4 w-4" />
                    )}
                    Kaydet
                </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 p-1 bg-gray-100 rounded-xl mb-6 overflow-x-auto">
                {TABS.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={clsx(
                            "flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition-all",
                            activeTab === tab.id
                                ? "bg-white text-gray-900 shadow-sm"
                                : "text-gray-500 hover:text-gray-700"
                        )}
                    >
                        <tab.icon className="h-4 w-4" />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Content */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
                <AnimatePresence mode="wait">
                    {activeTab === "store" && (
                        <motion.div
                            key="store"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="space-y-6"
                        >
                            <FormInput
                                label="Mağaza Adı"
                                value={settings.storeName}
                                onChange={(v) => updateSettings({ storeName: v })}
                                placeholder="Mağazam"
                            />

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                    Mağaza Açıklaması
                                </label>
                                <textarea
                                    value={settings.storeDescription || ""}
                                    onChange={(e) => updateSettings({ storeDescription: e.target.value })}
                                    placeholder="Mağazanızı kısaca tanıtın..."
                                    rows={3}
                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all resize-none"
                                />
                            </div>

                            <FormInput
                                label="Minimum Sipariş Tutarı"
                                type="number"
                                value={settings.minOrderAmount || 0}
                                onChange={(v) => updateSettings({ minOrderAmount: parseFloat(v) || 0 })}
                                suffix="₺"
                                min={0}
                            />

                            <FormInput
                                label="Ücretsiz Kargo Limiti"
                                type="number"
                                value={settings.freeShippingThreshold || ""}
                                onChange={(v) => updateSettings({ freeShippingThreshold: parseFloat(v) || undefined })}
                                placeholder="Boş bırakın: yok"
                                suffix="₺"
                                min={0}
                            />

                            <FormInput
                                label="KDV Oranı"
                                type="number"
                                value={settings.taxRate || 0}
                                onChange={(v) => updateSettings({ taxRate: parseFloat(v) || 0 })}
                                suffix="%"
                                min={0}
                                step={1}
                            />
                        </motion.div>
                    )}

                    {activeTab === "shipping" && (
                        <motion.div
                            key="shipping"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="space-y-4"
                        >
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="font-semibold text-gray-900">Kargo Seçenekleri</h3>
                                <button
                                    onClick={() => {
                                        setEditingShipping(null);
                                        setShowShippingModal(true);
                                    }}
                                    className="flex items-center gap-2 px-3 py-2 bg-emerald-50 text-emerald-600 rounded-lg text-sm font-medium hover:bg-emerald-100"
                                >
                                    <Plus className="h-4 w-4" />
                                    Seçenek Ekle
                                </button>
                            </div>

                            {settings.shippingOptions.length === 0 ? (
                                <p className="text-gray-500 text-center py-8">
                                    Henüz kargo seçeneği eklenmemiş
                                </p>
                            ) : (
                                <div className="space-y-3">
                                    {settings.shippingOptions.map((option) => (
                                        <div
                                            key={option.id}
                                            className="flex items-center justify-between p-4 bg-gray-50 rounded-xl"
                                        >
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-medium text-gray-900">
                                                        {option.name}
                                                    </span>
                                                    {!option.isActive && (
                                                        <span className="px-1.5 py-0.5 text-xs bg-gray-200 text-gray-600 rounded">
                                                            Pasif
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-sm text-gray-500">
                                                    {option.price === 0 ? "Ücretsiz" : `${option.price}₺`}
                                                    {option.freeAbove && ` (${option.freeAbove}₺ üzeri ücretsiz)`}
                                                    {option.estimatedDays && ` • ${option.estimatedDays}`}
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => {
                                                        setEditingShipping(option);
                                                        setShowShippingModal(true);
                                                    }}
                                                    className="p-2 text-gray-400 hover:text-gray-600"
                                                >
                                                    <Settings className="h-4 w-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteShipping(option.id)}
                                                    className="p-2 text-gray-400 hover:text-red-500"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </motion.div>
                    )}

                    {activeTab === "payment" && (
                        <motion.div
                            key="payment"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="space-y-4"
                        >
                            <h3 className="font-semibold text-gray-900 mb-4">Ödeme Yöntemleri</h3>

                            {[
                                { key: "cash", label: "Kapıda Nakit Ödeme" },
                                { key: "card", label: "Kapıda Kart ile Ödeme" },
                                { key: "transfer", label: "Havale/EFT" },
                                { key: "online", label: "Online Ödeme" },
                            ].map(({ key, label }) => (
                                <div
                                    key={key}
                                    className="flex items-center justify-between p-4 bg-gray-50 rounded-xl"
                                >
                                    <span className="font-medium text-gray-700">{label}</span>
                                    <Toggle
                                        checked={settings.paymentMethods[key as keyof typeof settings.paymentMethods]}
                                        onChange={(v) =>
                                            updateSettings({
                                                paymentMethods: {
                                                    ...settings.paymentMethods,
                                                    [key]: v,
                                                },
                                            })
                                        }
                                    />
                                </div>
                            ))}
                        </motion.div>
                    )}

                    {activeTab === "notifications" && (
                        <motion.div
                            key="notifications"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="space-y-4"
                        >
                            <h3 className="font-semibold text-gray-900 mb-4">Sipariş Bildirimleri</h3>

                            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                                <div>
                                    <span className="font-medium text-gray-700">WhatsApp Bildirimi</span>
                                    <p className="text-sm text-gray-500">
                                        Yeni siparişlerde WhatsApp mesajı al
                                    </p>
                                </div>
                                <Toggle
                                    checked={settings.orderNotifications.whatsapp}
                                    onChange={(v) =>
                                        updateSettings({
                                            orderNotifications: {
                                                ...settings.orderNotifications,
                                                whatsapp: v,
                                            },
                                        })
                                    }
                                />
                            </div>

                            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                                <div>
                                    <span className="font-medium text-gray-700">E-posta Bildirimi</span>
                                    <p className="text-sm text-gray-500">
                                        Yeni siparişlerde e-posta al
                                    </p>
                                </div>
                                <Toggle
                                    checked={settings.orderNotifications.email}
                                    onChange={(v) =>
                                        updateSettings({
                                            orderNotifications: {
                                                ...settings.orderNotifications,
                                                email: v,
                                            },
                                        })
                                    }
                                />
                            </div>
                        </motion.div>
                    )}

                    {activeTab === "stock" && (
                        <motion.div
                            key="stock"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="space-y-4"
                        >
                            <h3 className="font-semibold text-gray-900 mb-4">Stok Ayarları</h3>

                            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                                <div>
                                    <span className="font-medium text-gray-700">Stok Takibi</span>
                                    <p className="text-sm text-gray-500">
                                        Ürün stok miktarlarını takip et
                                    </p>
                                </div>
                                <Toggle
                                    checked={settings.stockSettings.trackStock}
                                    onChange={(v) =>
                                        updateSettings({
                                            stockSettings: {
                                                ...settings.stockSettings,
                                                trackStock: v,
                                            },
                                        })
                                    }
                                />
                            </div>

                            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                                <div>
                                    <span className="font-medium text-gray-700">Stoksuz Satış</span>
                                    <p className="text-sm text-gray-500">
                                        Stok bittiğinde de sipariş alınabilsin
                                    </p>
                                </div>
                                <Toggle
                                    checked={settings.stockSettings.allowBackorder}
                                    onChange={(v) =>
                                        updateSettings({
                                            stockSettings: {
                                                ...settings.stockSettings,
                                                allowBackorder: v,
                                            },
                                        })
                                    }
                                />
                            </div>

                            <FormInput
                                label="Düşük Stok Uyarısı"
                                type="number"
                                value={settings.stockSettings.lowStockThreshold}
                                onChange={(v) =>
                                    updateSettings({
                                        stockSettings: {
                                            ...settings.stockSettings,
                                            lowStockThreshold: parseInt(v) || 0,
                                        },
                                    })
                                }
                                suffix="adet"
                                min={0}
                            />
                        </motion.div>
                    )}

                    {activeTab === "checkout" && (
                        <motion.div
                            key="checkout"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="space-y-4"
                        >
                            <h3 className="font-semibold text-gray-900 mb-4">Ödeme Formu Ayarları</h3>

                            {[
                                { key: "requirePhone", label: "Telefon Zorunlu" },
                                { key: "requireEmail", label: "E-posta Zorunlu" },
                                { key: "requireAddress", label: "Adres Zorunlu" },
                                { key: "allowNotes", label: "Sipariş Notu Aktif" },
                            ].map(({ key, label }) => (
                                <div
                                    key={key}
                                    className="flex items-center justify-between p-4 bg-gray-50 rounded-xl"
                                >
                                    <span className="font-medium text-gray-700">{label}</span>
                                    <Toggle
                                        checked={settings.checkoutSettings[key as keyof typeof settings.checkoutSettings]}
                                        onChange={(v) =>
                                            updateSettings({
                                                checkoutSettings: {
                                                    ...settings.checkoutSettings,
                                                    [key]: v,
                                                },
                                            })
                                        }
                                    />
                                </div>
                            ))}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Shipping Modal */}
            <AnimatePresence>
                {showShippingModal && (
                    <ShippingModal
                        shipping={editingShipping}
                        onSave={handleSaveShipping}
                        onClose={() => {
                            setShowShippingModal(false);
                            setEditingShipping(null);
                        }}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}

// Shipping Modal Component
function ShippingModal({
    shipping,
    onSave,
    onClose,
}: {
    shipping: ShippingOption | null;
    onSave: (option: ShippingOption) => void;
    onClose: () => void;
}) {
    const [name, setName] = useState(shipping?.name || "");
    const [price, setPrice] = useState(String(shipping?.price || 0));
    const [freeAbove, setFreeAbove] = useState(String(shipping?.freeAbove || ""));
    const [estimatedDays, setEstimatedDays] = useState(shipping?.estimatedDays || "");
    const [isActive, setIsActive] = useState(shipping?.isActive ?? true);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) {
            toast.error("Seçenek adı zorunlu");
            return;
        }

        onSave({
            id: shipping?.id || `shipping_${Date.now()}`,
            name: name.trim(),
            price: parseFloat(price) || 0,
            freeAbove: freeAbove ? parseFloat(freeAbove) : undefined,
            estimatedDays: estimatedDays || undefined,
            isActive,
        });
    };

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
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="fixed inset-0 z-50 flex items-center justify-center p-4"
            >
                <div
                    onClick={(e) => e.stopPropagation()}
                    className="bg-white rounded-2xl shadow-xl w-full max-w-md"
                >
                    <div className="flex items-center justify-between p-4 border-b border-gray-100">
                        <h3 className="font-semibold text-gray-900">
                            {shipping ? "Kargo Seçeneği Düzenle" : "Yeni Kargo Seçeneği"}
                        </h3>
                        <button
                            onClick={onClose}
                            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="p-4 space-y-4">
                        <FormInput
                            label="Seçenek Adı"
                            value={name}
                            onChange={setName}
                            placeholder="Standart Kargo"
                        />

                        <FormInput
                            label="Kargo Ücreti"
                            type="number"
                            value={price}
                            onChange={setPrice}
                            suffix="₺"
                            min={0}
                        />

                        <FormInput
                            label="Ücretsiz Kargo Limiti"
                            type="number"
                            value={freeAbove}
                            onChange={setFreeAbove}
                            placeholder="Boş bırakın: yok"
                            suffix="₺"
                            min={0}
                        />

                        <FormInput
                            label="Tahmini Teslimat"
                            value={estimatedDays}
                            onChange={setEstimatedDays}
                            placeholder="2-4 iş günü"
                        />

                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                            <span className="font-medium text-gray-700">Aktif</span>
                            <Toggle checked={isActive} onChange={setIsActive} />
                        </div>

                        <div className="flex gap-3 pt-2">
                            <button
                                type="button"
                                onClick={onClose}
                                className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-50"
                            >
                                İptal
                            </button>
                            <button
                                type="submit"
                                className="flex-1 px-4 py-2.5 bg-emerald-500 text-white rounded-xl font-medium hover:bg-emerald-600 flex items-center justify-center gap-2"
                            >
                                <Check className="h-4 w-4" />
                                Kaydet
                            </button>
                        </div>
                    </form>
                </div>
            </motion.div>
        </>
    );
}

