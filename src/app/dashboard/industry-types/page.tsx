"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PageHeader, GlassCard, Button } from "@/components/ui";
import {
    Plus, Search, X, Check, Loader2, Trash2, Edit2,
    ToggleLeft, ToggleRight, Utensils, Coffee, Wine,
    Stethoscope, Scissors, Dumbbell, Wrench, Car, Building,
    Truck, ShoppingBag, Dog, Book, Camera, Music, Heart
} from "lucide-react";
import {
    type IndustryDefinition,
    type IndustryCategory,
    CATEGORY_LABELS,
    ICON_OPTIONS,
    COLOR_OPTIONS,
    generateSlug,
    subscribeToIndustryDefinitions,
    createIndustryDefinition,
    updateIndustryDefinition,
    deleteIndustryDefinition,
    toggleIndustryStatus
} from "@/lib/industryService";
import { MODULE_REGISTRY } from "@/lib/ModuleRegistry";
import clsx from "clsx";

// Icon mapping
const ICON_MAP: Record<string, React.ElementType> = {
    Utensils, Coffee, Wine, Stethoscope, Scissors, Dumbbell,
    Wrench, Car, Building, Truck, ShoppingBag, Dog, Book, Camera, Music, Heart
};



export default function IndustryTypesPage() {
    const [definitions, setDefinitions] = useState<IndustryDefinition[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingItem, setEditingItem] = useState<IndustryDefinition | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        const isSupabaseConfigured = Boolean(
            process.env.NEXT_PUBLIC_SUPABASE_URL &&
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
        );

        if (isSupabaseConfigured) {
            const unsubscribe = subscribeToIndustryDefinitions((data) => {
                setDefinitions(data);
            });
            return () => unsubscribe();
        }
    }, []);

    const filteredDefinitions = definitions.filter(d =>
        d.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.slug.includes(searchQuery.toLowerCase())
    );

    const handleDelete = async (id: string) => {
        if (!confirm("Bu işletme türünü silmek istediğinize emin misiniz?")) return;

        try {
            await deleteIndustryDefinition(id);
            setDefinitions(prev => prev.filter(d => d.id !== id));
        } catch (error) {
            console.error("Delete error:", error);
        }
    };

    const handleToggleStatus = async (item: IndustryDefinition) => {
        try {
            await toggleIndustryStatus(item.id, item.status);
            setDefinitions(prev => prev.map(d =>
                d.id === item.id
                    ? { ...d, status: d.status === "active" ? "passive" : "active" }
                    : d
            ));
        } catch (error) {
            console.error("Toggle error:", error);
        }
    };

    return (
        <div className="space-y-6">
            <PageHeader
                title="İşletme Türleri"
                description={`${definitions.length} kayıtlı tür · ${definitions.filter(d => d.status === "active").length} aktif`}
                action={
                    <Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => setShowAddModal(true)}>
                        Yeni Tür Ekle
                    </Button>
                }
            />

            {/* Search */}
            <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-dark-500" />
                <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Tür ara..."
                    className="w-full pl-12 pr-4 py-3 rounded-xl bg-dark-800 border border-dark-700 text-dark-100 placeholder-dark-500 focus:outline-none focus:border-accent-blue transition-colors"
                />
            </div>

            {/* Table */}
            <GlassCard padding="none">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-dark-700/50">
                                <th className="text-left text-xs font-medium text-dark-500 px-6 py-4">İkon</th>
                                <th className="text-left text-xs font-medium text-dark-500 px-6 py-4">Tür Adı</th>
                                <th className="text-left text-xs font-medium text-dark-500 px-6 py-4 hidden md:table-cell">Kod</th>
                                <th className="text-left text-xs font-medium text-dark-500 px-6 py-4 hidden lg:table-cell">Kategori</th>
                                <th className="text-left text-xs font-medium text-dark-500 px-6 py-4">Durum</th>
                                <th className="text-right text-xs font-medium text-dark-500 px-6 py-4">İşlemler</th>
                            </tr>
                        </thead>
                        <tbody>
                            <AnimatePresence mode="popLayout">
                                {filteredDefinitions.map((item) => {
                                    const IconComponent = ICON_MAP[item.icon] || Utensils;
                                    return (
                                        <motion.tr
                                            key={item.id}
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0, height: 0 }}
                                            className="border-b border-dark-700/30 hover:bg-dark-800/30"
                                        >
                                            <td className="px-6 py-4">
                                                <div
                                                    className="h-10 w-10 rounded-xl flex items-center justify-center"
                                                    style={{ backgroundColor: `${item.color}20` }}
                                                >
                                                    <IconComponent className="h-5 w-5" style={{ color: item.color }} />
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="font-medium text-dark-100">{item.label}</span>
                                            </td>
                                            <td className="px-6 py-4 hidden md:table-cell">
                                                <code className="text-sm text-dark-400 bg-dark-800 px-2 py-1 rounded">{item.slug}</code>
                                            </td>
                                            <td className="px-6 py-4 hidden lg:table-cell">
                                                <span className="text-sm text-dark-400">{CATEGORY_LABELS[item.category]}</span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <button
                                                    onClick={() => handleToggleStatus(item)}
                                                    className={clsx(
                                                        "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
                                                        item.status === "active"
                                                            ? "bg-accent-green/15 text-accent-green"
                                                            : "bg-dark-700 text-dark-400"
                                                    )}
                                                >
                                                    {item.status === "active" ? (
                                                        <><ToggleRight className="h-4 w-4" /> Aktif</>
                                                    ) : (
                                                        <><ToggleLeft className="h-4 w-4" /> Pasif</>
                                                    )}
                                                </button>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        onClick={() => setEditingItem(item)}
                                                        className="p-2 rounded-lg hover:bg-dark-700 text-dark-400 hover:text-dark-200 transition-colors"
                                                    >
                                                        <Edit2 className="h-4 w-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(item.id)}
                                                        className="p-2 rounded-lg hover:bg-red-500/10 text-dark-400 hover:text-red-500 transition-colors"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </motion.tr>
                                    );
                                })}
                            </AnimatePresence>
                        </tbody>
                    </table>
                </div>

                {filteredDefinitions.length === 0 && (
                    <div className="text-center py-12 text-dark-500">
                        {searchQuery ? "Sonuç bulunamadı" : "Henüz tür eklenmemiş"}
                    </div>
                )}
            </GlassCard>

            {/* Add/Edit Modal */}
            <AnimatePresence>
                {(showAddModal || editingItem) && (
                    <IndustryTypeModal
                        item={editingItem}
                        onClose={() => {
                            setShowAddModal(false);
                            setEditingItem(null);
                        }}
                        onSave={async (data) => {
                            setIsLoading(true);
                            try {
                                if (editingItem) {
                                    await updateIndustryDefinition(editingItem.id, data);
                                    setDefinitions(prev => prev.map(d =>
                                        d.id === editingItem.id ? { ...d, ...data } : d
                                    ));
                                } else {
                                    const id = await createIndustryDefinition({
                                        ...data,
                                        order: definitions.length,
                                    });
                                    setDefinitions(prev => [...prev, { ...data, id, createdAt: new Date(), order: prev.length }]);
                                }
                                setShowAddModal(false);
                                setEditingItem(null);
                            } catch (error: any) {
                                console.error("Save error:", error);
                                alert(`Kayıt Hatası!\n\n${error?.message || error?.code || "Bilinmeyen hata"}\n\nSupabase erişim ayarlarınızı kontrol edin.`);
                            }
                            setIsLoading(false);
                        }}
                        isLoading={isLoading}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}

// Add/Edit Modal
function IndustryTypeModal({
    item,
    onClose,
    onSave,
    isLoading
}: {
    item: IndustryDefinition | null;
    onClose: () => void;
    onSave: (data: Omit<IndustryDefinition, "id" | "createdAt">) => void;
    isLoading: boolean;
}) {
    const [label, setLabel] = useState(item?.label || "");
    const [slug, setSlug] = useState(item?.slug || "");
    const [category, setCategory] = useState<IndustryCategory>(item?.category || "hizmet");
    const [icon, setIcon] = useState(item?.icon || "Utensils");
    const [color, setColor] = useState(item?.color || COLOR_OPTIONS[0]);
    const [description, setDescription] = useState(item?.description || "");
    const [status, setStatus] = useState<"active" | "passive">(item?.status || "active");
    const [selectedModules, setSelectedModules] = useState<string[]>(item?.modules || []);
    const [activeModules, setActiveModules] = useState<Array<{ id: string, label: string, description: string }>>([]);
    const [loadingModules, setLoadingModules] = useState(true);

    // Fetch active modules from API
    useEffect(() => {
        const fetchActiveModules = async () => {
            try {
                const response = await fetch("/api/admin/modules");
                if (response.ok) {
                    const data = await response.json();
                    if (data.success && data.modules && data.modules.length > 0) {
                        // Convert module IDs to module objects using MODULE_REGISTRY
                        const modules = data.modules.map((moduleId: string) => {
                            const mod = MODULE_REGISTRY.find(m => m.id === moduleId);
                            return {
                                id: moduleId,
                                label: mod?.label || moduleId,
                                description: mod?.description || "",
                            };
                        });
                        setActiveModules(modules);
                    }
                }
            } catch (error) {
                console.error("Failed to fetch active modules:", error);
                // Fallback to MODULE_REGISTRY if fetch fails
                setActiveModules(MODULE_REGISTRY.slice(0, 15).map(m => ({
                    id: m.id,
                    label: m.label,
                    description: m.description,
                })));
            } finally {
                setLoadingModules(false);
            }
        };

        fetchActiveModules();
    }, []);

    // Auto-generate slug from label
    useEffect(() => {
        if (!item && label) {
            setSlug(generateSlug(label));
        }
    }, [label, item]);

    const toggleModule = (moduleId: string) => {
        setSelectedModules(prev =>
            prev.includes(moduleId)
                ? prev.filter(id => id !== moduleId)
                : [...prev, moduleId]
        );
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        await onSave({ label, slug, category, icon, color, description, status, order: item?.order || 0, modules: selectedModules });
    };

    return (
        <>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="fixed inset-0 z-50 bg-dark-950/80 backdrop-blur-md"
            />
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
            >
                <div
                    onClick={(e) => e.stopPropagation()}
                    className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border border-dark-700/50 pointer-events-auto"
                    style={{ background: "rgba(28, 28, 30, 0.95)", backdropFilter: "blur(40px)" }}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between p-6 border-b border-dark-700/50">
                        <h2 className="text-lg font-semibold text-dark-100">
                            {item ? "Türü Düzenle" : "Yeni Tür Ekle"}
                        </h2>
                        <button onClick={onClose} className="p-2 rounded-lg hover:bg-dark-700">
                            <X className="h-5 w-5 text-dark-400" />
                        </button>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="p-6 space-y-5">
                        {/* Label */}
                        <div>
                            <label className="block text-sm font-medium text-dark-300 mb-2">Tür Adı</label>
                            <input
                                type="text"
                                value={label}
                                onChange={(e) => setLabel(e.target.value)}
                                placeholder="Örn: Yoga Stüdyosu"
                                required
                                className="w-full px-4 py-3 rounded-xl bg-dark-800 border border-dark-700 text-dark-100 placeholder-dark-500 focus:outline-none focus:border-accent-blue"
                            />
                        </div>

                        {/* Slug */}
                        <div>
                            <label className="block text-sm font-medium text-dark-300 mb-2">Tür Kodu</label>
                            <input
                                type="text"
                                value={slug}
                                onChange={(e) => setSlug(e.target.value)}
                                placeholder="yoga-studyosu"
                                required
                                className="w-full px-4 py-3 rounded-xl bg-dark-800 border border-dark-700 text-dark-100 placeholder-dark-500 focus:outline-none focus:border-accent-blue font-mono text-sm"
                            />
                        </div>

                        {/* Category */}
                        <div>
                            <label className="block text-sm font-medium text-dark-300 mb-2">Kategori</label>
                            <select
                                value={category}
                                onChange={(e) => setCategory(e.target.value as IndustryCategory)}
                                className="w-full px-4 py-3 rounded-xl bg-dark-800 border border-dark-700 text-dark-100 focus:outline-none focus:border-accent-blue"
                            >
                                {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                                    <option key={key} value={key}>{label}</option>
                                ))}
                            </select>
                        </div>

                        {/* Icon Selection */}
                        <div>
                            <label className="block text-sm font-medium text-dark-300 mb-2">İkon</label>
                            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
                                {ICON_OPTIONS.map((opt) => {
                                    const IconComp = ICON_MAP[opt.icon] || Utensils;
                                    return (
                                        <button
                                            key={opt.id}
                                            type="button"
                                            onClick={() => setIcon(opt.icon)}
                                            className={clsx(
                                                "h-10 w-10 rounded-lg flex items-center justify-center transition-all",
                                                icon === opt.icon
                                                    ? "bg-accent-blue text-white"
                                                    : "bg-dark-800 text-dark-400 hover:bg-dark-700"
                                            )}
                                        >
                                            <IconComp className="h-5 w-5" />
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Color Selection */}
                        <div>
                            <label className="block text-sm font-medium text-dark-300 mb-2">Renk</label>
                            <div className="flex gap-2">
                                {COLOR_OPTIONS.map((c) => (
                                    <button
                                        key={c}
                                        type="button"
                                        onClick={() => setColor(c)}
                                        className={clsx(
                                            "h-8 w-8 rounded-full transition-all",
                                            color === c && "ring-2 ring-white ring-offset-2 ring-offset-dark-900"
                                        )}
                                        style={{ backgroundColor: c }}
                                    />
                                ))}
                            </div>
                        </div>

                        {/* Description */}
                        <div>
                            <label className="block text-sm font-medium text-dark-300 mb-2">Açıklama</label>
                            <input
                                type="text"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Kısa açıklama"
                                className="w-full px-4 py-3 rounded-xl bg-dark-800 border border-dark-700 text-dark-100 placeholder-dark-500 focus:outline-none focus:border-accent-blue"
                            />
                        </div>

                        {/* Module Selection */}
                        <div>
                            <label className="block text-sm font-medium text-dark-300 mb-2">
                                Fonksiyonlar ({selectedModules.length} seçili)
                            </label>
                            <div className="max-h-40 overflow-y-auto bg-dark-800 border border-dark-700 rounded-xl p-3 space-y-2">
                                {loadingModules ? (
                                    <div className="flex items-center justify-center py-4">
                                        <Loader2 className="h-5 w-5 text-dark-400 animate-spin" />
                                        <span className="ml-2 text-sm text-dark-400">Modüller yükleniyor...</span>
                                    </div>
                                ) : activeModules.length === 0 ? (
                                    <div className="text-center py-4 text-sm text-dark-500">
                                        Henüz aktif modül yok. Önce Modüller sayfasından aktifleştirin.
                                    </div>
                                ) : (
                                    activeModules.map((mod) => (
                                        <label
                                            key={mod.id}
                                            className={clsx(
                                                "flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors",
                                                selectedModules.includes(mod.id)
                                                    ? "bg-accent-blue/20 text-accent-blue"
                                                    : "hover:bg-dark-700 text-dark-300"
                                            )}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={selectedModules.includes(mod.id)}
                                                onChange={() => toggleModule(mod.id)}
                                                className="w-4 h-4 rounded border-dark-600 bg-dark-700 text-accent-blue focus:ring-accent-blue"
                                            />
                                            <span className="text-sm font-medium">{mod.label}</span>
                                            <span className="text-xs text-dark-500 ml-auto">{mod.description}</span>
                                        </label>
                                    ))
                                )}
                            </div>
                            <p className="text-xs text-dark-500 mt-2">Bu işletme türü için geçerli fonksiyonları seçin</p>
                        </div>

                        {/* Status Toggle */}
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-dark-300">Durum</span>
                            <button
                                type="button"
                                onClick={() => setStatus(s => s === "active" ? "passive" : "active")}
                                className={clsx(
                                    "flex items-center gap-2 px-4 py-2 rounded-xl transition-colors",
                                    status === "active"
                                        ? "bg-accent-green/15 text-accent-green"
                                        : "bg-dark-700 text-dark-400"
                                )}
                            >
                                {status === "active" ? <ToggleRight className="h-5 w-5" /> : <ToggleLeft className="h-5 w-5" />}
                                {status === "active" ? "Aktif" : "Pasif"}
                            </button>
                        </div>

                        {/* Submit */}
                        <div className="flex gap-3 pt-4">
                            <button
                                type="button"
                                onClick={onClose}
                                className="flex-1 px-4 py-3 rounded-xl bg-dark-700 text-dark-200 hover:bg-dark-600 font-medium transition-colors"
                            >
                                İptal
                            </button>
                            <button
                                type="submit"
                                disabled={isLoading || !label || !slug}
                                className="flex-1 px-4 py-3 rounded-xl bg-accent-blue text-white font-medium hover:bg-accent-blue/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Check className="h-5 w-5" />}
                                {item ? "Güncelle" : "Kaydet"}
                            </button>
                        </div>
                    </form>
                </div>
            </motion.div>
        </>
    );
}
