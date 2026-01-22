"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
    Palette,
    Check,
    Bell,
    ShoppingBag,
    MessageCircle,
    User,
    Loader2,
    Eye
} from "lucide-react";
import { useTheme } from "@/components/panel/ThemeProvider";
import { useBusinessSession } from "@/hooks/useBusinessSession";
import clsx from "clsx";
import { toast } from "sonner";
import { getMenuSettings, saveMenuSettings } from "@/lib/services/foodService";
import { MENU_STYLES_ARRAY, COLOR_OPTIONS, MenuStyleId, ColorId, normalizeStyleId, normalizeColorId } from "@/lib/menuStyles";

// ============================================
// COMPONENT
// ============================================
export default function MenuSettingsPage() {
    const { isDark } = useTheme();
    const { session, isLoading: sessionLoading } = useBusinessSession();

    // Settings state
    const [selectedStyle, setSelectedStyle] = useState<MenuStyleId>("modern");
    const [selectedColor, setSelectedColor] = useState<ColorId>("emerald");
    const [showAvatar, setShowAvatar] = useState(true);
    const [waiterCallEnabled, setWaiterCallEnabled] = useState(true);
    const [cartEnabled, setCartEnabled] = useState(true);
    const [whatsappOrderEnabled, setWhatsappOrderEnabled] = useState(true);
    const [wifiPassword, setWifiPassword] = useState("");
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    // Theme colors
    const cardBg = isDark ? "bg-[#111]" : "bg-white";
    const borderColor = isDark ? "border-[#222]" : "border-gray-200";
    const textPrimary = isDark ? "text-white" : "text-gray-900";
    const textSecondary = isDark ? "text-gray-400" : "text-gray-600";

    // Load settings from document store
    useEffect(() => {
        if (!session?.businessId) return;

        const loadSettings = async () => {
            try {
                const settings = await getMenuSettings(session.businessId);
                if (settings) {
                    setSelectedStyle(normalizeStyleId(settings.style_id));
                    setSelectedColor(normalizeColorId(settings.accent_color_id));
                    setShowAvatar(settings.show_avatar);
                    setWaiterCallEnabled(settings.waiter_call_enabled);
                    setCartEnabled(settings.cart_enabled);
                    setWhatsappOrderEnabled(settings.whatsapp_order_enabled);
                    setWifiPassword(settings.wifi_password || "");
                }
            } catch (error) {
                console.error("Error loading settings:", error);
            } finally {
                setIsLoading(false);
            }
        };

        loadSettings();
    }, [session?.businessId]);

    // Toggle component
    const Toggle = ({ enabled, onChange, label, description, icon: Icon }: {
        enabled: boolean;
        onChange: (val: boolean) => void;
        label: string;
        description: string;
        icon: React.ElementType;
    }) => (
        <div className={clsx(
            "flex items-center justify-between p-4 rounded-xl border transition-colors",
            cardBg, borderColor
        )}>
            <div className="flex items-center gap-3">
                <div className={clsx(
                    "w-10 h-10 rounded-xl flex items-center justify-center",
                    enabled
                        ? "bg-emerald-500/10 text-emerald-500"
                        : isDark ? "bg-white/5 text-gray-500" : "bg-gray-100 text-gray-400"
                )}>
                    <Icon className="w-5 h-5" />
                </div>
                <div>
                    <p className={clsx("font-medium", textPrimary)}>{label}</p>
                    <p className={clsx("text-sm", textSecondary)}>{description}</p>
                </div>
            </div>
            <button
                onClick={() => onChange(!enabled)}
                className={clsx(
                    "relative w-14 h-8 rounded-full transition-colors",
                    enabled ? "bg-emerald-500" : isDark ? "bg-white/10" : "bg-gray-200"
                )}
            >
                <motion.div
                    animate={{ x: enabled ? 24 : 4 }}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    className="absolute top-1 w-6 h-6 bg-white rounded-full shadow-md"
                />
            </button>
        </div>
    );

    // Save settings to document store
    const handleSave = async () => {
        if (!session?.businessId) return;

        setIsSaving(true);
        try {
            await saveMenuSettings(session.businessId, {
                style_id: selectedStyle,
                accent_color_id: selectedColor,
                show_avatar: showAvatar,
                waiter_call_enabled: waiterCallEnabled,
                cart_enabled: cartEnabled,
                whatsapp_order_enabled: whatsappOrderEnabled,
                wifi_password: wifiPassword || undefined
            });
            toast.success("Menü ayarları kaydedildi! 🎉");
        } catch (error) {
            console.error("Error saving settings:", error);
            toast.error("Ayarlar kaydedilirken hata oluştu");
        } finally {
            setIsSaving(false);
        }
    };

    const activeStyle = MENU_STYLES_ARRAY.find(s => s.id === selectedStyle)!;
    const activeColor = COLOR_OPTIONS.find(c => c.id === selectedColor)!;

    // Loading state
    if (sessionLoading || isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
            </div>
        );
    }

    return (
        <div className="min-h-screen p-4 md:p-6">
            {/* Header */}
            <div className="mb-8">
                <h1 className={clsx("text-2xl md:text-3xl font-bold mb-2", textPrimary)}>
                    🎨 Menü Stili
                </h1>
                <p className={textSecondary}>
                    Dijital menünüzün görünümünü ve özelliklerini özelleştirin
                </p>
            </div>

            <div className="grid lg:grid-cols-5 gap-6">
                {/* Left Column - Settings (3/5) */}
                <div className="lg:col-span-3 space-y-6">
                    {/* Style Selection - Grid of Style Cards */}
                    <div className={clsx("rounded-2xl border p-5", cardBg, borderColor)}>
                        <h2 className={clsx("font-bold text-lg mb-4 flex items-center gap-2", textPrimary)}>
                            ✨ Menü Stili
                        </h2>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                            {MENU_STYLES_ARRAY.map((style) => {
                                const isSelected = selectedStyle === style.id;

                                return (
                                    <button
                                        key={style.id}
                                        onClick={() => setSelectedStyle(style.id)}
                                        className={clsx(
                                            "relative p-4 rounded-2xl border-2 text-left transition-all group",
                                            isSelected
                                                ? "border-emerald-500 bg-emerald-500/5"
                                                : isDark
                                                    ? "border-[#222] hover:border-[#333] hover:bg-white/5"
                                                    : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                                        )}
                                    >
                                        {/* Selection indicator */}
                                        {isSelected && (
                                            <div className="absolute top-2 right-2 w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center">
                                                <Check className="w-4 h-4 text-white" />
                                            </div>
                                        )}

                                        {/* Icon with style preview */}
                                        <div
                                            className="w-12 h-12 rounded-xl flex items-center justify-center mb-3 text-2xl"
                                            style={{
                                                backgroundColor: style.colors.cardBg,
                                                border: `1px solid ${style.colors.border}`
                                            }}
                                        >
                                            {style.emoji}
                                        </div>

                                        <p className={clsx("font-bold text-base", textPrimary)}>
                                            {style.name}
                                        </p>
                                        <p className={clsx("text-xs mt-1 line-clamp-2", textSecondary)}>
                                            {style.description}
                                        </p>

                                        {/* Layout indicator */}
                                        <div className={clsx(
                                            "mt-3 px-2 py-1 rounded-full text-[10px] font-medium inline-block",
                                            isDark ? "bg-white/10" : "bg-gray-100"
                                        )}>
                                            {style.layout === "hero" && "📐 Hero Kartları"}
                                            {style.layout === "grid" && "📊 Grid Düzeni"}
                                            {style.layout === "pill" && "💊 Pill Kartları"}
                                            {style.layout === "list" && "📝 Liste Görünümü"}
                                            {style.layout === "masonry" && "🧱 Masonry"}
                                            {style.layout === "compact-grid" && "📦 Kompakt Grid"}
                                            {style.layout === "photo-list" && "📷 Fotoğraflı Liste"}
                                            {style.layout === "category-cards" && "🗂️ Kategori Kartları"}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Color Selection */}
                    <div className={clsx("rounded-2xl border p-5", cardBg, borderColor)}>
                        <h2 className={clsx("font-bold text-lg mb-4 flex items-center gap-2", textPrimary)}>
                            <Palette className="w-5 h-5 text-pink-500" />
                            Vurgu Rengi
                        </h2>
                        <div className="grid grid-cols-6 gap-3">
                            {COLOR_OPTIONS.map((color) => {
                                const isSelected = selectedColor === color.id;

                                return (
                                    <button
                                        key={color.id}
                                        onClick={() => setSelectedColor(color.id)}
                                        className={clsx(
                                            "relative aspect-square rounded-xl transition-all flex items-center justify-center group",
                                            isSelected && "ring-4 ring-offset-2",
                                            isDark ? "ring-offset-[#111]" : "ring-offset-white"
                                        )}
                                        style={{
                                            backgroundColor: color.value,
                                            ...(isSelected && { boxShadow: `0 4px 20px ${color.value}60` })
                                        }}
                                        title={color.name}
                                    >
                                        {isSelected && (
                                            <Check className="w-5 h-5" style={{ color: color.textOnColor }} />
                                        )}
                                        {/* Tooltip on hover */}
                                        <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] font-medium opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                                            {color.name}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                        <p className={clsx("text-sm mt-4 text-center", textSecondary)}>
                            Seçili: <span className="font-semibold" style={{ color: activeColor.value }}>{activeColor.name}</span>
                        </p>
                    </div>

                    {/* Feature Toggles */}
                    <div className="space-y-3">
                        <h2 className={clsx("font-bold text-lg mb-4 flex items-center gap-2", textPrimary)}>
                            ⚙️ Özellikler
                        </h2>

                        <Toggle
                            enabled={showAvatar}
                            onChange={setShowAvatar}
                            label="Profil Avatarı"
                            description="Menüde işletme logonuzu gösterin"
                            icon={User}
                        />

                        <Toggle
                            enabled={waiterCallEnabled}
                            onChange={setWaiterCallEnabled}
                            label="Garson Çağır"
                            description="Müşteriler garson çağırabilsin"
                            icon={Bell}
                        />

                        <Toggle
                            enabled={cartEnabled}
                            onChange={setCartEnabled}
                            label="Sepete Ekle"
                            description="Ürünleri sepete ekleme özelliği"
                            icon={ShoppingBag}
                        />

                        <Toggle
                            enabled={whatsappOrderEnabled}
                            onChange={setWhatsappOrderEnabled}
                            label="WhatsApp Sipariş"
                            description="WhatsApp ile sipariş verme"
                            icon={MessageCircle}
                        />

                        {/* WiFi Password Input */}
                        <div
                            className={clsx(
                                "flex items-center gap-3 p-4 rounded-2xl border transition-all",
                                cardBg, borderColor
                            )}
                        >
                            <div
                                className={clsx(
                                    "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0",
                                    isDark ? "bg-white/5" : "bg-gray-100"
                                )}
                            >
                                <svg className={clsx("w-5 h-5", isDark ? "text-white" : "text-gray-700")} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
                                </svg>
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className={clsx("font-semibold", textPrimary)}>WiFi Şifresi</p>
                                <input
                                    type="text"
                                    value={wifiPassword}
                                    onChange={(e) => setWifiPassword(e.target.value)}
                                    placeholder="Şifreyi girin..."
                                    className={clsx(
                                        "w-full mt-1 px-3 py-2 rounded-lg text-sm border",
                                        isDark
                                            ? "bg-white/5 border-white/10 text-white placeholder:text-gray-500"
                                            : "bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400"
                                    )}
                                />
                                <p className={clsx("text-xs mt-1", textSecondary)}>
                                    Müşteriler menüden kopyalayabilir
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Save Button */}
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-500/50 text-white font-bold text-lg rounded-xl transition-colors shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2"
                    >
                        {isSaving ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                Kaydediliyor...
                            </>
                        ) : (
                            "💾 Değişiklikleri Kaydet"
                        )}
                    </button>
                </div>

                {/* Right Column - Preview (2/5) */}
                <div className="lg:col-span-2">
                    <div className={clsx("rounded-2xl border p-5 sticky top-6", cardBg, borderColor)}>
                        <h2 className={clsx("font-bold text-lg mb-4 flex items-center gap-2", textPrimary)}>
                            <Eye className="w-5 h-5 text-blue-500" />
                            Canlı Önizleme
                        </h2>

                        {/* Phone Mockup */}
                        <div className="flex justify-center">
                            <div
                                className="relative w-[280px] h-[580px] rounded-[40px] overflow-hidden shadow-2xl"
                                style={{
                                    backgroundColor: activeStyle.colors.background,
                                    border: "8px solid #1a1a1a"
                                }}
                            >
                                {/* Notch */}
                                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-black rounded-b-2xl z-10" />

                                {/* Status Bar */}
                                <div className="h-10 flex items-end justify-center pb-1">
                                    <div className="text-[10px] font-medium" style={{ color: activeStyle.colors.textSecondary }}>
                                        12:30
                                    </div>
                                </div>

                                {/* Sticky Header */}
                                <div
                                    className="p-3 flex items-center justify-between"
                                    style={{
                                        backgroundColor: activeStyle.colors.cardBg,
                                        borderBottom: `1px solid ${activeStyle.colors.border}`
                                    }}
                                >
                                    <div className="flex items-center gap-2">
                                        {showAvatar && (
                                            <div
                                                className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-xs font-bold"
                                                style={{ backgroundColor: activeColor.value }}
                                            >
                                                AR
                                            </div>
                                        )}
                                        <div>
                                            <p className="text-[10px]" style={{ color: activeStyle.colors.textSecondary }}>
                                                Alaz Restoran
                                            </p>
                                            <p className="text-xs font-bold" style={{ color: activeStyle.colors.text }}>
                                                Masa 3
                                            </p>
                                        </div>
                                    </div>
                                    {waiterCallEnabled && (
                                        <div
                                            className="px-3 py-1.5 rounded-full text-[10px] font-semibold flex items-center gap-1"
                                            style={{ backgroundColor: activeColor.value, color: activeColor.textOnColor }}
                                        >
                                            🔔 Garson
                                        </div>
                                    )}
                                </div>

                                {/* Category Tabs */}
                                <div className="px-3 py-2 flex gap-2 overflow-x-auto" style={{ backgroundColor: activeStyle.colors.cardBg }}>
                                    {["Ana Yemek", "Tatlılar", "İçecek"].map((cat, i) => (
                                        <div
                                            key={cat}
                                            className="px-3 py-1.5 rounded-full text-[10px] font-medium whitespace-nowrap"
                                            style={{
                                                backgroundColor: i === 0 ? activeColor.value : "transparent",
                                                color: i === 0 ? activeColor.textOnColor : activeStyle.colors.textSecondary,
                                                border: i !== 0 ? `1px solid ${activeStyle.colors.border}` : "none"
                                            }}
                                        >
                                            {cat}
                                        </div>
                                    ))}
                                </div>

                                {/* Product Cards - Based on Layout */}
                                <div className="p-3 space-y-2 overflow-y-auto" style={{ height: "calc(100% - 160px)" }}>
                                    {activeStyle.layout === "pill" ? (
                                        // Pill Layout Preview
                                        <>
                                            {[
                                                { name: "Izgara Köfte", desc: "200gr dana köfte", price: "₺180" },
                                                { name: "Tavuk Şiş", desc: "Marine edilmiş", price: "₺150" },
                                                { name: "Karışık Izgara", desc: "4 çeşit et", price: "₺280" },
                                            ].map((product) => (
                                                <div
                                                    key={product.name}
                                                    className="flex items-center gap-3 p-2"
                                                    style={{
                                                        backgroundColor: activeStyle.colors.cardBg,
                                                        borderRadius: activeStyle.cardStyle.borderRadius,
                                                        boxShadow: activeStyle.cardStyle.shadow
                                                    }}
                                                >
                                                    {/* Thumbnail */}
                                                    <div
                                                        className="w-14 h-14 rounded-xl flex-shrink-0"
                                                        style={{ backgroundColor: activeStyle.colors.border }}
                                                    />
                                                    {/* Info */}
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-xs font-semibold truncate" style={{ color: activeStyle.colors.text }}>
                                                            {product.name}
                                                        </p>
                                                        <p className="text-[10px] truncate" style={{ color: activeStyle.colors.textSecondary }}>
                                                            {product.desc}
                                                        </p>
                                                        <p className="text-xs font-bold mt-0.5" style={{ color: activeColor.value }}>
                                                            {product.price}
                                                        </p>
                                                    </div>
                                                    {/* Add Button */}
                                                    {cartEnabled && (
                                                        <div
                                                            className="px-3 py-1.5 rounded-full text-[10px] font-bold"
                                                            style={{ backgroundColor: activeColor.value, color: activeColor.textOnColor }}
                                                        >
                                                            Ekle
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </>
                                    ) : activeStyle.layout === "list" ? (
                                        // Minimal List Preview
                                        <>
                                            {[
                                                { name: "Izgara Köfte", price: "₺180" },
                                                { name: "Tavuk Şiş", price: "₺150" },
                                                { name: "Karışık Izgara", price: "₺280" },
                                                { name: "Adana Kebap", price: "₺200" },
                                            ].map((product, i) => (
                                                <div
                                                    key={product.name}
                                                    className="flex items-center justify-between py-3"
                                                    style={{
                                                        borderBottom: i < 3 ? `1px solid ${activeStyle.colors.border}` : "none"
                                                    }}
                                                >
                                                    <p className="text-sm font-medium" style={{ color: activeStyle.colors.text }}>
                                                        {product.name}
                                                    </p>
                                                    <p className="text-sm" style={{ color: activeStyle.colors.textSecondary }}>
                                                        {product.price}
                                                    </p>
                                                </div>
                                            ))}
                                        </>
                                    ) : activeStyle.layout === "compact-grid" ? (
                                        // Compact Grid Preview
                                        <div className="grid grid-cols-3 gap-2">
                                            {[
                                                { name: "Köfte", price: "₺180" },
                                                { name: "Şiş", price: "₺150" },
                                                { name: "Izgara", price: "₺280" },
                                                { name: "Kebap", price: "₺200" },
                                                { name: "Döner", price: "₺120" },
                                                { name: "Lahmacun", price: "₺80" },
                                            ].map((product) => (
                                                <div
                                                    key={product.name}
                                                    className="p-2 text-center"
                                                    style={{
                                                        backgroundColor: activeStyle.colors.cardBg,
                                                        borderRadius: activeStyle.cardStyle.borderRadius,
                                                        boxShadow: activeStyle.cardStyle.shadow
                                                    }}
                                                >
                                                    <div
                                                        className="w-full aspect-square rounded-lg mb-1"
                                                        style={{ backgroundColor: activeStyle.colors.border }}
                                                    />
                                                    <p className="text-[10px] font-semibold truncate" style={{ color: activeStyle.colors.text }}>
                                                        {product.name}
                                                    </p>
                                                    <p className="text-[10px] font-bold" style={{ color: activeColor.value }}>
                                                        {product.price}
                                                    </p>
                                                </div>
                                            ))}
                                        </div>
                                    ) : activeStyle.layout === "photo-list" ? (
                                        // Photo Right List Preview
                                        <div className="space-y-2">
                                            {[
                                                { name: "Cream of Mushroom Soup", desc: "Authentic spices, prepared with a combination of onion", price: "$10.00" },
                                                { name: "Tomato Soup", desc: "Soup flavored with fresh tomatoes", price: "$10.00" },
                                            ].map((product) => (
                                                <div
                                                    key={product.name}
                                                    className="flex items-center gap-3 p-2"
                                                    style={{
                                                        backgroundColor: activeStyle.colors.cardBg,
                                                        borderRadius: activeStyle.cardStyle.borderRadius,
                                                    }}
                                                >
                                                    {/* Info */}
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-xs font-semibold" style={{ color: activeStyle.colors.text }}>
                                                            {product.name}
                                                        </p>
                                                        <p className="text-[9px] line-clamp-2" style={{ color: activeStyle.colors.textSecondary }}>
                                                            {product.desc}
                                                        </p>
                                                        <p className="text-xs font-bold mt-1" style={{ color: activeColor.value }}>
                                                            {product.price}
                                                        </p>
                                                    </div>
                                                    {/* Thumbnail Right */}
                                                    <div
                                                        className="w-16 h-16 rounded-xl flex-shrink-0"
                                                        style={{ backgroundColor: activeStyle.colors.border }}
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    ) : activeStyle.layout === "category-cards" ? (
                                        // Category Cards Grid Preview
                                        <div className="grid grid-cols-2 gap-2">
                                            {[
                                                { name: "Soups", count: "4 ürün" },
                                                { name: "Breakfast", count: "8 ürün" },
                                                { name: "Salads", count: "6 ürün" },
                                                { name: "Pastas", count: "5 ürün" },
                                            ].map((cat) => (
                                                <div
                                                    key={cat.name}
                                                    className="relative aspect-[4/3] rounded-xl overflow-hidden"
                                                    style={{
                                                        backgroundColor: activeStyle.colors.border,
                                                    }}
                                                >
                                                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                                                    <div className="absolute bottom-0 left-0 right-0 p-2">
                                                        <p className="text-[10px] font-bold" style={{ color: "#fff" }}>
                                                            {cat.name}
                                                        </p>
                                                        <p className="text-[8px]" style={{ color: "rgba(255,255,255,0.7)" }}>
                                                            {cat.count}
                                                        </p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        // Default Grid/Hero Preview
                                        <div className={activeStyle.layout === "hero" ? "space-y-3" : "grid grid-cols-2 gap-2"}>
                                            {[
                                                { name: "Izgara Köfte", price: "₺180" },
                                                { name: "Tavuk Şiş", price: "₺150" },
                                            ].map((product) => (
                                                <div
                                                    key={product.name}
                                                    className="overflow-hidden"
                                                    style={{
                                                        backgroundColor: activeStyle.colors.cardBg,
                                                        borderRadius: activeStyle.cardStyle.borderRadius,
                                                        boxShadow: activeStyle.cardStyle.shadow
                                                    }}
                                                >
                                                    {/* Image placeholder */}
                                                    <div
                                                        className={activeStyle.layout === "hero" ? "w-full h-24" : "w-full h-16"}
                                                        style={{ backgroundColor: activeStyle.colors.border }}
                                                    />
                                                    {/* Content */}
                                                    <div className="p-2">
                                                        <p className="text-xs font-semibold" style={{ color: activeStyle.colors.text }}>
                                                            {product.name}
                                                        </p>
                                                        <div className="flex items-center justify-between mt-1">
                                                            <p className="text-xs font-bold" style={{ color: activeColor.value }}>
                                                                {product.price}
                                                            </p>
                                                            {cartEnabled && (
                                                                <div
                                                                    className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px]"
                                                                    style={{ backgroundColor: activeColor.value }}
                                                                >
                                                                    +
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Cart Bar */}
                                {cartEnabled && whatsappOrderEnabled && (
                                    <div className="absolute bottom-4 left-3 right-3">
                                        <div
                                            className="p-3 rounded-2xl flex items-center justify-between text-white"
                                            style={{ backgroundColor: activeColor.value }}
                                        >
                                            <div>
                                                <p className="text-[10px] opacity-80">Sepetim</p>
                                                <p className="text-xs font-bold">3 ürün</p>
                                            </div>
                                            <p className="font-bold text-sm">₺610</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Style Info */}
                        <div className={clsx("mt-4 p-3 rounded-xl text-center", isDark ? "bg-white/5" : "bg-gray-50")}>
                            <p className="text-2xl mb-1">{activeStyle.emoji}</p>
                            <p className={clsx("font-bold", textPrimary)}>{activeStyle.name}</p>
                            <p className={clsx("text-xs", textSecondary)}>{activeStyle.description}</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
