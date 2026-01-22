"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Plus,
    Pencil,
    Trash2,
    Loader2,
    Check,
    ChevronDown,
    ChevronRight,
    CircleDot,
    CheckSquare,
    Layers,
    X,
    Settings2,
    ImagePlus
} from "lucide-react";
import clsx from "clsx";
import { toast } from "sonner";
import { useTheme } from "@/components/panel/ThemeProvider";
import { toR2ProxyUrl } from "@/lib/publicImage";
import { uploadImageWithFallback } from "@/lib/clientUpload";

interface Extra {
    id: string;
    groupId: string;
    name: string;
    priceModifier: number;
    isDefault: boolean;
    isActive: boolean;
    imageUrl?: string;
}

interface ExtraGroup {
    id: string;
    name: string;
    selectionType: 'single' | 'multiple';
    isRequired: boolean;
    maxSelections: number;
    isActive: boolean;
    extras: Extra[];
}

export default function FastFoodExtrasPage() {
    const { isDark } = useTheme();
    const [groups, setGroups] = useState<ExtraGroup[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedGroups, setExpandedGroups] = useState<string[]>([]);

    // Custom delete confirmation state
    const [deleteConfirm, setDeleteConfirm] = useState<{
        id: string;
        type: 'group' | 'extra';
        name: string;
    } | null>(null);

    // Modal states
    const [showGroupModal, setShowGroupModal] = useState(false);
    const [showExtraModal, setShowExtraModal] = useState(false);
    const [editingGroup, setEditingGroup] = useState<ExtraGroup | null>(null);
    const [editingExtra, setEditingExtra] = useState<Extra | null>(null);
    const [selectedGroupId, setSelectedGroupId] = useState<string>("");

    // Form states
    const [groupForm, setGroupForm] = useState({
        name: "",
        selectionType: "single" as 'single' | 'multiple',
        isRequired: false,
        maxSelections: 3,
    });
    const [extraForm, setExtraForm] = useState({
        name: "",
        priceModifier: "",
        isDefault: false,
        imageUrl: "",
    });
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);

    // Theme Variables
    const pageBg = isDark ? "bg-black" : "bg-[#F5F5F7]";
    const cardBg = isDark ? "bg-[#1C1C1E]" : "bg-white";
    const textPrimary = isDark ? "text-white" : "text-[#1D1D1F]";
    const textSecondary = isDark ? "text-[#86868B]" : "text-[#86868B]";
    const borderColor = isDark ? "border-[#38383A]" : "border-[#D2D2D7]";
    const inputBg = isDark ? "bg-[#2C2C2E]" : "bg-[#E5E5EA]";

    useEffect(() => {
        loadGroups();
    }, []);

    const loadGroups = async () => {
        try {
            const res = await fetch("/api/fastfood/extras");
            const data = await res.json();
            if (data.success) {
                setGroups(data.groups);
                // Groups start collapsed by default (empty array)
            }
        } catch (error) {
            console.error("Failed to load extras:", error);
            toast.error("Ekstralar yüklenemedi");
        } finally {
            setLoading(false);
        }
    };

    const toggleGroup = (groupId: string) => {
        setExpandedGroups(prev =>
            prev.includes(groupId)
                ? prev.filter(id => id !== groupId)
                : [...prev, groupId]
        );
    };

    // Group Modal
    const openGroupModal = (group?: ExtraGroup) => {
        if (group) {
            setEditingGroup(group);
            setGroupForm({
                name: group.name,
                selectionType: group.selectionType,
                isRequired: group.isRequired,
                maxSelections: group.maxSelections,
            });
        } else {
            setEditingGroup(null);
            setGroupForm({
                name: "",
                selectionType: "single",
                isRequired: false,
                maxSelections: 3,
            });
        }
        setShowGroupModal(true);
    };

    const handleGroupSubmit = async () => {
        if (!groupForm.name.trim()) {
            toast.error("Grup adı gerekli");
            return;
        }

        setSaving(true);
        try {
            const url = "/api/fastfood/extras";
            const method = editingGroup ? "PUT" : "POST";
            const body = editingGroup
                ? { type: 'group', id: editingGroup.id, ...groupForm }
                : { type: 'group', ...groupForm };

            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });

            const data = await res.json();
            if (data.success) {
                toast.success(editingGroup ? "Grup güncellendi" : "Grup eklendi");
                setShowGroupModal(false);
                loadGroups();
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

    const handleGroupDelete = async (groupId: string) => {
        try {
            const res = await fetch(`/api/fastfood/extras?type=group&id=${groupId}`, { method: "DELETE" });
            const data = await res.json();
            if (data.success) {
                toast.success("Grup silindi");
                loadGroups();
            } else {
                toast.error(data.error || "Silme başarısız");
            }
        } catch (error) {
            console.error("Delete error:", error);
            toast.error("Bir hata oluştu");
        }
    };

    const handleExtraDelete = async (extraId: string) => {
        try {
            const res = await fetch(`/api/fastfood/extras?type=extra&id=${extraId}`, { method: "DELETE" });
            const data = await res.json();
            if (data.success) {
                toast.success("Ekstra silindi");
                loadGroups();
            } else {
                toast.error(data.error || "Silme başarısız");
            }
        } catch (error) {
            console.error("Delete error:", error);
            toast.error("Bir hata oluştu");
        }
    };

    // Extra Modal
    const openExtraModal = (groupId: string, extra?: Extra) => {
        setSelectedGroupId(groupId);
        if (extra) {
            setEditingExtra(extra);
            setExtraForm({
                name: extra.name,
                priceModifier: extra.priceModifier.toString(),
                isDefault: extra.isDefault,
                imageUrl: extra.imageUrl || "",
            });
        } else {
            setEditingExtra(null);
            setExtraForm({
                name: "",
                priceModifier: "",
                isDefault: false,
                imageUrl: "",
            });
        }
        setShowExtraModal(true);
    };

    // Image upload for extras
    const handleExtraImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 5 * 1024 * 1024) {
            toast.error("Dosya boyutu 5MB'dan k??????k olmal??");
            return;
        }

        setUploading(true);

        const reader = new FileReader();
        reader.onload = (e) => {
            if (e.target?.result) {
                setExtraForm(prev => ({ ...prev, imageUrl: e.target!.result as string }));
            }
        };
        reader.readAsDataURL(file);

        try {
            const { url } = await uploadImageWithFallback({
                file,
                moduleName: "fastfood",
                fallbackEndpoint: "/api/fastfood/upload",
            });

            if (url) {
                setExtraForm(prev => ({ ...prev, imageUrl: url }));
                toast.success("Foto?Yraf y??klendi");
            } else {
                toast.error("Foto?Yraf y??klenemedi");
            }
        } catch (error) {
            console.error("Upload error:", error);
            toast.error("Foto?Yraf y??kleme hatas??");
        } finally {
            setUploading(false);
        }
    };

    const handleExtraSubmit = async () => {
        if (!extraForm.name.trim()) {
            toast.error("Ekstra adı gerekli");
            return;
        }

        if (extraForm.imageUrl?.startsWith("data:image/")) {
            toast.error("Görsel yükleme tamamlanmadan kaydedilemez");
            return;
        }

        setSaving(true);
        try {
            const url = "/api/fastfood/extras";
            const method = editingExtra ? "PUT" : "POST";
            const body = editingExtra
                ? { type: 'extra', id: editingExtra.id, ...extraForm, priceModifier: parseFloat(extraForm.priceModifier) || 0, imageUrl: extraForm.imageUrl || null }
                : { type: 'extra', groupId: selectedGroupId, ...extraForm, priceModifier: parseFloat(extraForm.priceModifier) || 0, imageUrl: extraForm.imageUrl || null };

            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });

            const data = await res.json();
            if (data.success) {
                toast.success(editingExtra ? "Ekstra güncellendi" : "Ekstra eklendi");
                setShowExtraModal(false);
                loadGroups();
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



    return (
        <div className={clsx("min-h-screen p-4 md:p-8 space-y-8 font-sans transition-colors duration-300", pageBg, textPrimary)}>

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h1 className="text-4xl font-bold tracking-tight">Ekstralar</h1>
                    <p className={clsx("text-lg mt-2 font-medium", textSecondary)}>
                        Soslar, eklentiler ve seçenekler
                    </p>
                </div>
                <button
                    onClick={() => openGroupModal()}
                    className="group flex items-center gap-3 px-6 py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-full font-semibold shadow-lg shadow-blue-500/30 transition-all active:scale-95"
                >
                    <Plus className="w-6 h-6" />
                    <span className="text-base">Yeni Grup Oluştur</span>
                </button>
            </div>

            {/* Groups Grid */}
            {loading ? (
                <div className="flex flex-col items-center justify-center py-32">
                    <Loader2 className="w-10 h-10 animate-spin text-blue-500 mb-4" />
                    <p className={textSecondary}>Ekstralar yükleniyor...</p>
                </div>
            ) : groups.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-32 text-center">
                    <div className={clsx("w-32 h-32 rounded-full flex items-center justify-center mb-6", isDark ? "bg-[#1C1C1E]" : "bg-white shadow-sm")}>
                        <Layers className={clsx("w-12 h-12 opacity-50", textSecondary)} />
                    </div>
                    <h3 className="text-2xl font-bold mb-3">Hiç ekstra grubu yok</h3>
                    <p className={clsx("max-w-md text-lg", textSecondary)}>
                        Ürünlerinize eklenebilecek seçenekler oluşturun (Örn: Soslar, İçecek Seçimi).
                    </p>
                </div>
            ) : (
                <div className="space-y-6">
                    {groups.map((group) => (
                        <div
                            key={group.id}
                            className={clsx(
                                "rounded-3xl overflow-hidden transition-all",
                                cardBg,
                                isDark ? "border border-white/5" : "shadow-lg shadow-black/5"
                            )}
                        >
                            {/* Group Header - Collapsible */}
                            <button
                                onClick={() => toggleGroup(group.id)}
                                className={clsx(
                                    "w-full px-6 py-5 flex items-center justify-between transition-colors",
                                    isDark ? "hover:bg-white/5" : "hover:bg-gray-50"
                                )}
                            >
                                <div className="flex items-center gap-4">
                                    {expandedGroups.includes(group.id) ? (
                                        <ChevronDown className="w-5 h-5 text-gray-500" />
                                    ) : (
                                        <ChevronRight className="w-5 h-5 text-gray-500" />
                                    )}
                                    <div className={clsx(
                                        "p-2.5 rounded-xl",
                                        isDark ? "bg-[#2C2C2E]" : "bg-gray-100"
                                    )}>
                                        {group.selectionType === 'single' ? (
                                            <CircleDot className="w-5 h-5 text-blue-500" />
                                        ) : (
                                            <CheckSquare className="w-5 h-5 text-purple-500" />
                                        )}
                                    </div>
                                    <div className="text-left">
                                        <h3 className="text-lg font-bold">{group.name}</h3>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            <span className={clsx(
                                                "px-2 py-0.5 rounded-full text-xs font-semibold",
                                                group.selectionType === 'single'
                                                    ? "bg-blue-500/10 text-blue-500"
                                                    : "bg-purple-500/10 text-purple-500"
                                            )}>
                                                {group.selectionType === 'single' ? "Tekli" : "Çoklu"}
                                            </span>
                                            {group.isRequired && (
                                                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-red-500/10 text-red-500">
                                                    Zorunlu
                                                </span>
                                            )}
                                            <span className={clsx("text-sm", textSecondary)}>
                                                ({group.extras.length} seçenek)
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                    <button
                                        onClick={() => openGroupModal(group)}
                                        className={clsx(
                                            "p-2.5 rounded-xl transition-colors",
                                            isDark ? "hover:bg-[#3A3A3C]" : "hover:bg-gray-200"
                                        )}
                                    >
                                        <Pencil className="w-4 h-4 text-gray-500" />
                                    </button>
                                    <button
                                        onClick={() => handleGroupDelete(group.id)}
                                        className="p-2.5 rounded-xl transition-colors hover:bg-red-500/10"
                                    >
                                        <Trash2 className="w-4 h-4 text-red-400" />
                                    </button>
                                </div>
                            </button>

                            {/* Extras List - Collapsible */}
                            {expandedGroups.includes(group.id) && (
                                <div className="border-t" style={{ borderColor: isDark ? '#38383A' : '#E5E5EA' }}>
                                    <div className="divide-y" style={{ borderColor: isDark ? '#38383A' : '#E5E5EA' }}>
                                        {group.extras.map((extra) => (
                                            <div
                                                key={extra.id}
                                                className={clsx(
                                                    "flex items-center justify-between px-6 py-4 transition-colors group",
                                                    isDark ? "hover:bg-white/5" : "hover:bg-gray-50"
                                                )}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="w-2 h-2 rounded-full bg-gray-400" />
                                                    <div>
                                                        <p className="font-semibold">{extra.name}</p>
                                                        {extra.isDefault && (
                                                            <span className="text-xs text-green-500 font-medium">Varsayılan</span>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-4">
                                                    {extra.priceModifier !== 0 && (
                                                        <span className={clsx(
                                                            "font-bold",
                                                            extra.priceModifier > 0 ? "text-blue-500" : "text-green-500"
                                                        )}>
                                                            {extra.priceModifier > 0 ? '+' : ''}₺{extra.priceModifier}
                                                        </span>
                                                    )}

                                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button
                                                            onClick={() => openExtraModal(group.id, extra)}
                                                            className={clsx(
                                                                "p-2 rounded-lg transition-colors",
                                                                isDark ? "hover:bg-blue-500/10 text-blue-400" : "hover:bg-blue-50 text-blue-600"
                                                            )}
                                                        >
                                                            <Pencil className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setDeleteConfirm({
                                                                    id: extra.id,
                                                                    type: 'extra',
                                                                    name: extra.name
                                                                });
                                                            }}
                                                            className={clsx(
                                                                "p-2 rounded-lg transition-colors",
                                                                isDark ? "hover:bg-red-500/10 text-red-400" : "hover:bg-red-50 text-red-600"
                                                            )}
                                                            title="Seçeneği Sil"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    <button
                                        onClick={() => openExtraModal(group.id)}
                                        className={clsx(
                                            "w-full py-4 flex items-center justify-center gap-2 font-semibold transition-all border-t",
                                            isDark
                                                ? "border-[#38383A] text-gray-400 hover:bg-white/5 hover:text-blue-500"
                                                : "border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-blue-500"
                                        )}
                                    >
                                        <Plus className="w-5 h-5" />
                                        Yeni Seçenek Ekle
                                    </button>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Group Modal */}
            <AnimatePresence>
                {showGroupModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-black/40 backdrop-blur-md"
                            onClick={() => setShowGroupModal(false)}
                        />
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 20 }}
                            className={clsx(
                                "relative w-full max-w-lg rounded-[2.5rem] overflow-hidden shadow-2xl p-8",
                                isDark ? "bg-[#1C1C1E] border border-white/10" : "bg-white"
                            )}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <h2 className="text-2xl font-bold mb-8">
                                {editingGroup ? "Grubu Düzenle" : "Yeni Grup Oluştur"}
                            </h2>

                            <div className="space-y-6">
                                <div>
                                    <label className={clsx("block text-sm font-bold ml-1 mb-2", textSecondary)}>GRUP ADI</label>
                                    <input
                                        type="text"
                                        placeholder="Örn: İçecek Seçimi"
                                        value={groupForm.name}
                                        onChange={e => setGroupForm({ ...groupForm, name: e.target.value })}
                                        className={clsx(
                                            "w-full px-5 py-4 rounded-2xl text-lg font-semibold outline-none transition-all",
                                            inputBg, isDark ? "focus:bg-[#3A3A3C]" : "focus:bg-gray-50 focus:shadow-inner"
                                        )}
                                    />
                                </div>

                                <div>
                                    <label className={clsx("block text-sm font-bold ml-1 mb-2", textSecondary)}>SEÇİM TİPİ</label>
                                    <div className="grid grid-cols-2 gap-4">
                                        <button
                                            type="button"
                                            onClick={() => setGroupForm({ ...groupForm, selectionType: 'single' })}
                                            className={clsx(
                                                "flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border-2 transition-all",
                                                groupForm.selectionType === 'single'
                                                    ? "border-blue-500 bg-blue-500/10 text-blue-500"
                                                    : (isDark ? "border-[#3A3A3C] text-gray-400" : "border-gray-200 text-gray-500")
                                            )}
                                        >
                                            <CircleDot className="w-6 h-6" />
                                            <span className="font-semibold">Tekli</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setGroupForm({ ...groupForm, selectionType: 'multiple' })}
                                            className={clsx(
                                                "flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border-2 transition-all",
                                                groupForm.selectionType === 'multiple'
                                                    ? "border-blue-500 bg-blue-500/10 text-blue-500"
                                                    : (isDark ? "border-[#3A3A3C] text-gray-400" : "border-gray-200 text-gray-500")
                                            )}
                                        >
                                            <CheckSquare className="w-6 h-6" />
                                            <span className="font-semibold">Çoklu</span>
                                        </button>
                                    </div>
                                </div>

                                {groupForm.selectionType === 'multiple' && (
                                    <div>
                                        <label className={clsx("block text-sm font-bold ml-1 mb-2", textSecondary)}>MAKSİMUM SEÇİM</label>
                                        <input
                                            type="number"
                                            min="1"
                                            value={groupForm.maxSelections}
                                            onChange={e => setGroupForm({ ...groupForm, maxSelections: parseInt(e.target.value) || 1 })}
                                            className={clsx(
                                                "w-full px-5 py-4 rounded-2xl text-lg font-semibold outline-none transition-all",
                                                inputBg, isDark ? "focus:bg-[#3A3A3C]" : "focus:bg-gray-50 focus:shadow-inner"
                                            )}
                                        />
                                    </div>
                                )}

                                <div className="flex items-center justify-between p-4 rounded-2xl bg-opacity-50 border border-dashed" style={{ borderColor: isDark ? '#38383A' : '#E5E5EA' }}>
                                    <span className="font-semibold">Zorunlu Seçim</span>
                                    <button
                                        type="button"
                                        onClick={() => setGroupForm({ ...groupForm, isRequired: !groupForm.isRequired })}
                                        className={clsx(
                                            "w-12 h-7 rounded-full transition-colors relative duration-300",
                                            groupForm.isRequired ? "bg-blue-500" : (isDark ? "bg-[#3A3A3C]" : "bg-gray-300")
                                        )}
                                    >
                                        <span className={clsx(
                                            "absolute top-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform duration-300",
                                            groupForm.isRequired ? "translate-x-5 left-0.5" : "translate-x-0.5 left-0"
                                        )} />
                                    </button>
                                </div>

                                <button
                                    onClick={handleGroupSubmit}
                                    disabled={saving}
                                    className="w-full py-4 bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white rounded-2xl font-bold text-xl shadow-xl shadow-blue-500/20 transition-all flex items-center justify-center gap-3 mt-4"
                                >
                                    {saving ? <Loader2 className="w-6 h-6 animate-spin" /> : <Check className="w-6 h-6" />}
                                    Kaydet
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Extra Modal */}
            <AnimatePresence>
                {showExtraModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-black/40 backdrop-blur-md"
                            onClick={() => setShowExtraModal(false)}
                        />
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 20 }}
                            className={clsx(
                                "relative w-full max-w-lg rounded-[2.5rem] overflow-hidden shadow-2xl p-8",
                                isDark ? "bg-[#1C1C1E] border border-white/10" : "bg-white"
                            )}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <h2 className="text-2xl font-bold mb-8">
                                {editingExtra ? "Seçeneği Düzenle" : "Yeni Seçenek"}
                            </h2>

                            <div className="space-y-6">
                                <div>
                                    <label className={clsx("block text-sm font-bold ml-1 mb-2", textSecondary)}>SEÇENEK ADI</label>
                                    <input
                                        type="text"
                                        placeholder="Örn: Acılı"
                                        value={extraForm.name}
                                        onChange={e => setExtraForm({ ...extraForm, name: e.target.value })}
                                        className={clsx(
                                            "w-full px-5 py-4 rounded-2xl text-lg font-semibold outline-none transition-all",
                                            inputBg, isDark ? "focus:bg-[#3A3A3C]" : "focus:bg-gray-50 focus:shadow-inner"
                                        )}
                                    />
                                </div>

                                <div>
                                    <label className={clsx("block text-sm font-bold ml-1 mb-2", textSecondary)}>FİYAT FARKI (₺)</label>
                                    <input
                                        type="number"
                                        placeholder="0"
                                        step="0.5"
                                        value={extraForm.priceModifier}
                                        onChange={e => setExtraForm({ ...extraForm, priceModifier: e.target.value })}
                                        className={clsx(
                                            "w-full px-5 py-4 rounded-2xl text-lg font-semibold outline-none transition-all",
                                            inputBg, isDark ? "focus:bg-[#3A3A3C]" : "focus:bg-gray-50 focus:shadow-inner"
                                        )}
                                    />
                                    <p className={clsx("text-xs mt-2 ml-1", textSecondary)}>Ekstra ücret yoksa 0 bırakın.</p>
                                </div>

                                <div className="flex items-center justify-between p-4 rounded-2xl bg-opacity-50 border border-dashed" style={{ borderColor: isDark ? '#38383A' : '#E5E5EA' }}>
                                    <span className="font-semibold">Varsayılan Seçili</span>
                                    <button
                                        type="button"
                                        onClick={() => setExtraForm({ ...extraForm, isDefault: !extraForm.isDefault })}
                                        className={clsx(
                                            "w-12 h-7 rounded-full transition-colors relative duration-300",
                                            extraForm.isDefault ? "bg-blue-500" : (isDark ? "bg-[#3A3A3C]" : "bg-gray-300")
                                        )}
                                    >
                                        <span className={clsx(
                                            "absolute top-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform duration-300",
                                            extraForm.isDefault ? "translate-x-5 left-0.5" : "translate-x-0.5 left-0"
                                        )} />
                                    </button>
                                </div>

                                {/* Image Upload */}
                                <div>
                                    <label className={clsx("block text-sm font-bold ml-1 mb-2", textSecondary)}>GÖRSEL (Opsiyonel)</label>
                                    <div className="flex items-center gap-4">
                                        {/* Preview */}
                                        {extraForm.imageUrl ? (
                                            <div className="relative w-20 h-20 rounded-xl overflow-hidden bg-gray-100">
                                                <img src={toR2ProxyUrl(extraForm.imageUrl)} alt="Preview" className="w-full h-full object-cover" />
                                                <button
                                                    type="button"
                                                    onClick={() => setExtraForm({ ...extraForm, imageUrl: "" })}
                                                    className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center"
                                                >
                                                    <X className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ) : (
                                            <label className={clsx(
                                                "w-20 h-20 rounded-xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-colors",
                                                uploading ? "opacity-50" : "",
                                                isDark ? "border-[#3A3A3C] hover:border-blue-500" : "border-gray-200 hover:border-blue-500"
                                            )}>
                                                {uploading ? (
                                                    <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                                                ) : (
                                                    <ImagePlus className="w-6 h-6 text-gray-400" />
                                                )}
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    className="hidden"
                                                    onChange={handleExtraImageUpload}
                                                    disabled={uploading}
                                                />
                                            </label>
                                        )}
                                        <p className={clsx("text-xs", textSecondary)}>
                                            Ekstra seçenek için görsel ekleyin (örn: sos görseli)
                                        </p>
                                    </div>
                                </div>

                                <button
                                    onClick={handleExtraSubmit}
                                    disabled={saving || uploading}
                                    className="w-full py-4 bg-blue-600 hover:bg-blue-700 active:scale-[0.98] disabled:opacity-50 text-white rounded-2xl font-bold text-xl shadow-xl shadow-blue-500/20 transition-all flex items-center justify-center gap-3 mt-4"
                                >
                                    {saving ? <Loader2 className="w-6 h-6 animate-spin" /> : <Check className="w-6 h-6" />}
                                    Kaydet
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
