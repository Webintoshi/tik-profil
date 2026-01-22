"use client";

import { useState, useEffect } from "react";
import {
    Plus,
    Edit3,
    Trash2,
    Loader2,
    Check,
    X,
    Tag,
    Sparkles,
    Calendar
} from "lucide-react";
import clsx from "clsx";
import { toast } from "sonner";
import { useTheme } from "@/components/panel/ThemeProvider";

interface Campaign {
    id: string;
    title: string;
    description: string;
    emoji: string;
    isActive: boolean;
    validUntil: string | null;
}

const EMOJI_OPTIONS = ['🔥', '⭐', '🎉', '💥', '🎁', '💰', '🍔', '🍕', '🍟', '🥤', '❤️', '✨'];

export default function FastFoodCampaignsPage() {
    const { isDark } = useTheme();
    const [campaigns, setCampaigns] = useState<Campaign[]>([]);
    const [loading, setLoading] = useState(true);

    // Modal States
    const [showModal, setShowModal] = useState(false);
    const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
    const [formData, setFormData] = useState({
        title: "",
        description: "",
        emoji: "🔥",
        isActive: true,
        validUntil: ""
    });
    const [saving, setSaving] = useState(false);

    // Theme Variables
    const pageBg = isDark ? "bg-black" : "bg-[#F5F5F7]";
    const cardBg = isDark ? "bg-[#1C1C1E]" : "bg-white";
    const textPrimary = isDark ? "text-white" : "text-[#1D1D1F]";
    const textSecondary = isDark ? "text-[#86868B]" : "text-[#86868B]";
    const borderColor = isDark ? "border-[#38383A]" : "border-[#D2D2D7]";
    const inputBg = isDark ? "bg-[#2C2C2E]" : "bg-[#E5E5EA]";

    useEffect(() => {
        loadCampaigns();
    }, []);

    const loadCampaigns = async () => {
        try {
            const res = await fetch("/api/fastfood/campaigns");
            const data = await res.json();
            if (data.success) {
                setCampaigns(data.campaigns || []);
            }
        } catch (error) {
            console.error("Failed to load campaigns:", error);
            toast.error("Kampanyalar yüklenemedi");
        } finally {
            setLoading(false);
        }
    };

    const openModal = (campaign?: Campaign) => {
        if (campaign) {
            setEditingCampaign(campaign);
            setFormData({
                title: campaign.title,
                description: campaign.description,
                emoji: campaign.emoji,
                isActive: campaign.isActive,
                validUntil: campaign.validUntil || ""
            });
        } else {
            setEditingCampaign(null);
            setFormData({
                title: "",
                description: "",
                emoji: "🔥",
                isActive: true,
                validUntil: ""
            });
        }
        setShowModal(true);
    };

    const handleSubmit = async () => {
        if (!formData.title.trim()) {
            toast.error("Kampanya başlığı gerekli");
            return;
        }

        setSaving(true);
        try {
            const url = "/api/fastfood/campaigns";
            const method = editingCampaign ? "PUT" : "POST";
            const body = editingCampaign
                ? { id: editingCampaign.id, ...formData }
                : formData;

            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });

            const data = await res.json();
            if (data.success) {
                toast.success(editingCampaign ? "Kampanya güncellendi" : "Kampanya oluşturuldu");
                setShowModal(false);
                loadCampaigns();
            } else {
                toast.error(data.error || "İşlem başarısız");
            }
        } catch (error) {
            console.error("Save error:", error);
            toast.error("Bir hata oluştu");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Bu kampanyayı silmek istediğinize emin misiniz?")) return;

        try {
            const res = await fetch(`/api/fastfood/campaigns?id=${id}`, { method: "DELETE" });
            const data = await res.json();
            if (data.success) {
                toast.success("Kampanya silindi");
                setCampaigns(prev => prev.filter(c => c.id !== id));
            } else {
                toast.error(data.error || "Silme başarısız");
            }
        } catch (error) {
            console.error("Delete error:", error);
            toast.error("Bir hata oluştu");
        }
    };

    const toggleActive = async (campaign: Campaign) => {
        const newStatus = !campaign.isActive;
        setCampaigns(prev => prev.map(c => c.id === campaign.id ? { ...c, isActive: newStatus } : c));

        try {
            await fetch("/api/fastfood/campaigns", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id: campaign.id, isActive: newStatus }),
            });
            toast.success(newStatus ? "Kampanya aktifleştirildi" : "Kampanya devre dışı bırakıldı");
        } catch (error) {
            console.error("Toggle error:", error);
            setCampaigns(prev => prev.map(c => c.id === campaign.id ? { ...c, isActive: !newStatus } : c));
            toast.error("Güncelleme başarısız");
        }
    };

    return (
        <div className={clsx("min-h-screen p-4 md:p-8 space-y-8 font-sans transition-colors duration-300", pageBg, textPrimary)}>

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h1 className="text-4xl font-bold tracking-tight">Kampanyalar</h1>
                    <p className={clsx("text-lg mt-2 font-medium", textSecondary)}>
                        Müşterilerinize özel fırsatlar sunun
                    </p>
                </div>
                <button
                    onClick={() => openModal()}
                    className="group flex items-center gap-3 px-6 py-3.5 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white rounded-full font-semibold shadow-lg shadow-orange-500/30 transition-all active:scale-95"
                >
                    <Plus className="w-6 h-6" />
                    <span className="text-base">Yeni Kampanya</span>
                </button>
            </div>

            {/* Content */}
            {loading ? (
                <div className="flex flex-col items-center justify-center py-32">
                    <Loader2 className="w-10 h-10 animate-spin text-orange-500 mb-4" />
                    <p className={textSecondary}>Kampanyalar yükleniyor...</p>
                </div>
            ) : campaigns.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-32 text-center">
                    <div className={clsx("w-32 h-32 rounded-full flex items-center justify-center mb-6", isDark ? "bg-[#1C1C1E]" : "bg-white shadow-sm")}>
                        <Tag className={clsx("w-12 h-12 opacity-50", textSecondary)} />
                    </div>
                    <h3 className="text-2xl font-bold mb-3">Henüz kampanya yok</h3>
                    <p className={clsx("max-w-md text-lg mb-6", textSecondary)}>
                        İlk kampanyanızı oluşturun ve müşterilerinizi etkilemeye başlayın!
                    </p>
                    <button
                        onClick={() => openModal()}
                        className="text-orange-500 font-bold hover:underline"
                    >
                        İlk kampanyayı oluştur
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {campaigns.map((campaign) => (
                        <div
                            key={campaign.id}
                            className={clsx(
                                "rounded-3xl overflow-hidden transition-all duration-300 group",
                                cardBg,
                                isDark ? "border border-white/5" : "shadow-lg shadow-black/5",
                                !campaign.isActive && "opacity-60"
                            )}
                        >
                            {/* Campaign Header */}
                            <div className="p-6 bg-gradient-to-r from-orange-500 to-red-500 text-white">
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-3">
                                        <span className="text-4xl">{campaign.emoji}</span>
                                        <div>
                                            <h3 className="text-xl font-bold">{campaign.title}</h3>
                                            {campaign.validUntil && (
                                                <div className="flex items-center gap-1 text-white/80 text-sm mt-1">
                                                    <Calendar className="w-3 h-3" />
                                                    <span>{new Date(campaign.validUntil).toLocaleDateString('tr-TR')}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className={clsx(
                                        "px-2 py-1 rounded-full text-xs font-bold",
                                        campaign.isActive ? "bg-white/20" : "bg-black/20"
                                    )}>
                                        {campaign.isActive ? "Aktif" : "Pasif"}
                                    </div>
                                </div>
                            </div>

                            {/* Campaign Body */}
                            <div className="p-6">
                                {campaign.description && (
                                    <p className={clsx("text-sm mb-4", textSecondary)}>
                                        {campaign.description}
                                    </p>
                                )}

                                {/* Actions */}
                                <div className="flex items-center justify-between pt-4 border-t" style={{ borderColor: isDark ? '#38383A' : '#E5E5EA' }}>
                                    <button
                                        onClick={() => toggleActive(campaign)}
                                        className={clsx(
                                            "w-12 h-7 rounded-full transition-colors relative",
                                            campaign.isActive ? "bg-green-500" : (isDark ? "bg-[#3A3A3C]" : "bg-gray-300")
                                        )}
                                    >
                                        <span className={clsx(
                                            "absolute top-1 w-5 h-5 bg-white rounded-full shadow transition-transform",
                                            campaign.isActive ? "left-6" : "left-1"
                                        )} />
                                    </button>

                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => openModal(campaign)}
                                            className={clsx(
                                                "p-2.5 rounded-xl transition-colors",
                                                isDark ? "hover:bg-blue-500/10 text-blue-400" : "hover:bg-blue-50 text-blue-600"
                                            )}
                                        >
                                            <Edit3 className="w-5 h-5" />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(campaign.id)}
                                            className={clsx(
                                                "p-2.5 rounded-xl transition-colors",
                                                isDark ? "hover:bg-red-500/10 text-red-400" : "hover:bg-red-50 text-red-600"
                                            )}
                                        >
                                            <Trash2 className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div
                        className="absolute inset-0 bg-black/40 backdrop-blur-md"
                        onClick={() => setShowModal(false)}
                    />
                    <div
                        className={clsx(
                            "relative w-full max-w-lg rounded-[2.5rem] overflow-hidden shadow-2xl",
                            isDark ? "bg-[#1C1C1E] border border-white/10" : "bg-white"
                        )}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="p-8 pb-4 flex items-center justify-between">
                            <h2 className="text-2xl font-bold tracking-tight">
                                {editingCampaign ? "Kampanyayı Düzenle" : "Yeni Kampanya"}
                            </h2>
                            <button
                                onClick={() => setShowModal(false)}
                                className={clsx(
                                    "p-2.5 rounded-full transition-colors",
                                    isDark ? "bg-[#2C2C2E] hover:bg-[#3A3A3C]" : "bg-gray-100 hover:bg-gray-200"
                                )}
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Form */}
                        <div className="p-8 pt-2 space-y-6">
                            {/* Emoji Selection */}
                            <div>
                                <label className={clsx("block text-sm font-bold ml-1 mb-2", textSecondary)}>EMOJİ</label>
                                <div className="flex flex-wrap gap-2">
                                    {EMOJI_OPTIONS.map(emoji => (
                                        <button
                                            key={emoji}
                                            type="button"
                                            onClick={() => setFormData({ ...formData, emoji })}
                                            className={clsx(
                                                "w-12 h-12 rounded-xl text-2xl flex items-center justify-center transition-all",
                                                formData.emoji === emoji
                                                    ? "bg-orange-500 scale-110 shadow-lg"
                                                    : (isDark ? "bg-[#2C2C2E] hover:bg-[#3A3A3C]" : "bg-gray-100 hover:bg-gray-200")
                                            )}
                                        >
                                            {emoji}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Title */}
                            <div>
                                <label className={clsx("block text-sm font-bold ml-1 mb-2", textSecondary)}>BAŞLIK</label>
                                <input
                                    type="text"
                                    placeholder="Örn: 2. Burger Hediye!"
                                    value={formData.title}
                                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                                    className={clsx(
                                        "w-full px-5 py-4 rounded-2xl text-lg font-semibold outline-none border focus:border-orange-500 transition-all",
                                        inputBg, isDark ? "border-transparent" : "border-transparent focus:shadow-md"
                                    )}
                                    autoFocus
                                />
                            </div>

                            {/* Description */}
                            <div>
                                <label className={clsx("block text-sm font-bold ml-1 mb-2", textSecondary)}>AÇIKLAMA (Opsiyonel)</label>
                                <textarea
                                    rows={2}
                                    placeholder="Kampanya detayları..."
                                    value={formData.description}
                                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                                    className={clsx(
                                        "w-full px-5 py-4 rounded-2xl text-base font-medium outline-none border focus:border-orange-500 transition-all resize-none",
                                        inputBg, isDark ? "border-transparent" : "border-transparent focus:shadow-md"
                                    )}
                                />
                            </div>

                            {/* Valid Until */}
                            <div>
                                <label className={clsx("block text-sm font-bold ml-1 mb-2", textSecondary)}>GEÇERLİLİK TARİHİ (Opsiyonel)</label>
                                <input
                                    type="date"
                                    value={formData.validUntil}
                                    onChange={e => setFormData({ ...formData, validUntil: e.target.value })}
                                    className={clsx(
                                        "w-full px-5 py-4 rounded-2xl text-lg font-semibold outline-none border focus:border-orange-500 transition-all",
                                        inputBg, isDark ? "border-transparent" : "border-transparent focus:shadow-md"
                                    )}
                                />
                            </div>

                            {/* Active Toggle */}
                            <div className="flex items-center justify-between p-4 rounded-2xl bg-opacity-50 border border-dashed" style={{ borderColor: isDark ? '#38383A' : '#E5E5EA' }}>
                                <div>
                                    <span className="font-semibold">Aktif</span>
                                    <p className={clsx("text-xs", textSecondary)}>Kampanya menüde gösterilsin</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setFormData({ ...formData, isActive: !formData.isActive })}
                                    className={clsx(
                                        "w-12 h-7 rounded-full transition-colors relative",
                                        formData.isActive ? "bg-green-500" : (isDark ? "bg-[#3A3A3C]" : "bg-gray-300")
                                    )}
                                >
                                    <span className={clsx(
                                        "absolute top-1 w-5 h-5 bg-white rounded-full shadow transition-transform",
                                        formData.isActive ? "left-6" : "left-1"
                                    )} />
                                </button>
                            </div>

                            {/* Submit */}
                            <button
                                onClick={handleSubmit}
                                disabled={saving || !formData.title.trim()}
                                className="w-full py-4 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 disabled:opacity-50 text-white rounded-2xl font-bold text-xl shadow-xl shadow-orange-500/20 transition-all flex items-center justify-center gap-3 active:scale-[0.98]"
                            >
                                {saving ? <Loader2 className="w-6 h-6 animate-spin" /> : <Sparkles className="w-6 h-6" />}
                                {editingCampaign ? "Güncelle" : "Kampanya Oluştur"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
