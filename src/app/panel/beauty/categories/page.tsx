"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Edit3, Trash2, Loader2, GripVertical, Save, X } from "lucide-react";
import clsx from "clsx";
import { toast } from "sonner";
import { useTheme } from "@/components/panel/ThemeProvider";
import { ServiceCategory, CATEGORY_ICONS } from "@/types/beauty";

export default function BeautyCategoriesPage() {
    const { isDark } = useTheme();
    const [loading, setLoading] = useState(true);
    const [categories, setCategories] = useState<ServiceCategory[]>([]);
    const [showModal, setShowModal] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

    const [form, setForm] = useState({
        name: "",
        icon: "",
    });

    useEffect(() => {
        loadCategories();
    }, []);

    const loadCategories = async () => {
        try {
            setLoading(true);
            const res = await fetch('/api/beauty/categories');
            const data = await res.json();

            if (data.success) {
                setCategories(data.categories || []);
            }
        } catch (error) {
            console.error('Load error:', error);
            toast.error('Kategoriler yüklenirken hata oluştu');
        } finally {
            setLoading(false);
        }
    };

    const openModal = (category?: ServiceCategory) => {
        if (category) {
            setEditingId(category.id);
            setForm({
                name: category.name,
                icon: category.icon || "",
            });
        } else {
            setEditingId(null);
            setForm({ name: "", icon: "" });
        }
        setShowModal(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!form.name.trim()) {
            toast.error('Kategori adı zorunlu');
            return;
        }

        setSaving(true);

        try {
            const payload = {
                ...(editingId && { id: editingId }),
                name: form.name.trim(),
                icon: form.icon || CATEGORY_ICONS.find(c => c.value === form.name)?.icon || '✨',
                order: editingId ? undefined : categories.length,
            };

            const res = await fetch('/api/beauty/categories', {
                method: editingId ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            const data = await res.json();

            if (data.success) {
                toast.success(editingId ? 'Kategori güncellendi' : 'Kategori eklendi');
                setShowModal(false);
                loadCategories();
            } else {
                toast.error(data.error || 'İşlem başarısız');
            }
        } catch {
            toast.error('Kayıt sırasında hata oluştu');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        try {
            const res = await fetch(`/api/beauty/categories?id=${id}`, { method: 'DELETE' });
            const data = await res.json();

            if (data.success) {
                setCategories(prev => prev.filter(c => c.id !== id));
                toast.success('Kategori silindi');
            } else {
                toast.error(data.error || 'Silme başarısız');
            }
        } catch {
            toast.error('Silme sırasında hata oluştu');
        }
        setDeleteConfirm(null);
    };

    const toggleActive = async (id: string, isActive: boolean) => {
        try {
            const res = await fetch('/api/beauty/categories', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, isActive: !isActive }),
            });

            const data = await res.json();

            if (data.success) {
                setCategories(prev => prev.map(c =>
                    c.id === id ? { ...c, isActive: !isActive } : c
                ));
                toast.success(isActive ? 'Kategori pasif yapıldı' : 'Kategori aktif yapıldı');
            }
        } catch {
            toast.error('Güncelleme başarısız');
        }
    };

    const inputClass = clsx(
        "w-full px-4 py-3 rounded-xl border focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all",
        isDark ? "bg-gray-700 border-gray-600 text-white" : "bg-white border-gray-200 text-gray-900"
    );

    const iconOptions = CATEGORY_ICONS.map(c => [c.value, c.icon]);

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className={clsx("text-2xl font-bold", isDark ? "text-white" : "text-gray-900")}>
                        Hizmet Kategorileri
                    </h1>
                    <p className={clsx("text-sm", isDark ? "text-gray-400" : "text-gray-500")}>
                        {categories.length} kategori
                    </p>
                </div>
                <button
                    onClick={() => openModal()}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-pink-500 to-rose-600 text-white font-medium rounded-xl hover:shadow-lg transition-all"
                >
                    <Plus className="w-5 h-5" />
                    Yeni Kategori
                </button>
            </div>

            {/* Categories List */}
            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="w-8 h-8 animate-spin text-pink-500" />
                </div>
            ) : categories.length === 0 ? (
                <div className={clsx("text-center py-20 rounded-2xl", isDark ? "bg-gray-800" : "bg-gray-50")}>
                    <div className="text-5xl mb-4">📂</div>
                    <h3 className={clsx("text-lg font-semibold mb-2", isDark ? "text-white" : "text-gray-900")}>
                        Henüz kategori yok
                    </h3>
                    <p className={clsx("mb-4", isDark ? "text-gray-400" : "text-gray-500")}>
                        İlk kategorinizi oluşturun
                    </p>
                    <button
                        onClick={() => openModal()}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-pink-500 to-rose-600 text-white font-medium rounded-xl"
                    >
                        <Plus className="w-5 h-5" />
                        Kategori Ekle
                    </button>
                </div>
            ) : (
                <div className="space-y-2">
                    {categories.map((category, index) => (
                        <motion.div
                            key={category.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className={clsx(
                                "flex items-center gap-4 p-4 rounded-xl",
                                isDark ? "bg-gray-800" : "bg-white",
                                !category.isActive && "opacity-50"
                            )}
                        >
                            <GripVertical className={clsx("w-5 h-5 cursor-grab", isDark ? "text-gray-600" : "text-gray-300")} />

                            <div className="text-2xl">{category.icon || '💎'}</div>

                            <div className="flex-1">
                                <h3 className={clsx("font-semibold", isDark ? "text-white" : "text-gray-900")}>
                                    {category.name}
                                </h3>
                            </div>

                            <button
                                onClick={() => toggleActive(category.id, category.isActive)}
                                className={clsx(
                                    "px-3 py-1 rounded-lg text-sm font-medium transition-colors",
                                    category.isActive
                                        ? "bg-emerald-100 text-emerald-700"
                                        : "bg-gray-100 text-gray-500"
                                )}
                            >
                                {category.isActive ? 'Aktif' : 'Pasif'}
                            </button>

                            <button
                                onClick={() => openModal(category)}
                                className={clsx(
                                    "p-2 rounded-lg transition-colors",
                                    isDark ? "hover:bg-gray-700" : "hover:bg-gray-100"
                                )}
                            >
                                <Edit3 className="w-4 h-4" />
                            </button>

                            <button
                                onClick={() => setDeleteConfirm(category.id)}
                                className="p-2 rounded-lg hover:bg-rose-100 text-rose-500 transition-colors"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>

                            {/* Delete Confirm */}
                            {deleteConfirm === category.id && (
                                <div className="absolute inset-0 bg-black/50 rounded-xl flex items-center justify-center">
                                    <div className={clsx("p-4 rounded-xl", isDark ? "bg-gray-800" : "bg-white")}>
                                        <p className={clsx("mb-3", isDark ? "text-white" : "text-gray-900")}>
                                            Silmek istediğinize emin misiniz?
                                        </p>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => setDeleteConfirm(null)}
                                                className={clsx("px-4 py-2 rounded-lg", isDark ? "bg-gray-700 text-white" : "bg-gray-100")}
                                            >
                                                İptal
                                            </button>
                                            <button
                                                onClick={() => handleDelete(category.id)}
                                                className="px-4 py-2 rounded-lg bg-rose-600 text-white"
                                            >
                                                Sil
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    ))}
                </div>
            )}

            {/* Modal */}
            <AnimatePresence>
                {showModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setShowModal(false)}
                        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
                    >
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            onClick={(e) => e.stopPropagation()}
                            className={clsx(
                                "w-full max-w-md p-4 sm:p-6 rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto",
                                isDark ? "bg-gray-800" : "bg-white"
                            )}
                        >
                            <div className="flex items-center justify-between mb-6">
                                <h2 className={clsx("text-lg font-bold", isDark ? "text-white" : "text-gray-900")}>
                                    {editingId ? 'Kategori Düzenle' : 'Yeni Kategori'}
                                </h2>
                                <button
                                    onClick={() => setShowModal(false)}
                                    className={clsx("p-2 rounded-lg", isDark ? "hover:bg-gray-700" : "hover:bg-gray-100")}
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div>
                                    <label className={clsx("block text-sm font-medium mb-1.5", isDark ? "text-gray-300" : "text-gray-700")}>
                                        Kategori Adı *
                                    </label>
                                    <input
                                        type="text"
                                        value={form.name}
                                        onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
                                        placeholder="Saç Bakımı"
                                        className={inputClass}
                                    />
                                </div>

                                <div>
                                    <label className={clsx("block text-sm font-medium mb-1.5", isDark ? "text-gray-300" : "text-gray-700")}>
                                        İkon
                                    </label>
                                    <div className="flex flex-wrap gap-2">
                                        {iconOptions.map(([name, icon]) => (
                                            <button
                                                key={name}
                                                type="button"
                                                onClick={() => setForm(prev => ({ ...prev, icon, name: prev.name || name }))}
                                                className={clsx(
                                                    "w-12 h-12 rounded-xl text-2xl flex items-center justify-center transition-all",
                                                    form.icon === icon
                                                        ? "bg-pink-100 ring-2 ring-pink-500"
                                                        : isDark ? "bg-gray-700 hover:bg-gray-600" : "bg-gray-100 hover:bg-gray-200"
                                                )}
                                            >
                                                {icon}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="flex gap-3 pt-4">
                                    <button
                                        type="button"
                                        onClick={() => setShowModal(false)}
                                        className={clsx(
                                            "flex-1 py-3 rounded-xl font-medium transition-colors",
                                            isDark ? "bg-gray-700 text-white hover:bg-gray-600" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                                        )}
                                    >
                                        İptal
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={saving}
                                        className="flex-1 py-3 bg-gradient-to-r from-pink-500 to-rose-600 text-white font-medium rounded-xl hover:shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                                    >
                                        {saving ? (
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                        ) : (
                                            <>
                                                <Save className="w-5 h-5" />
                                                Kaydet
                                            </>
                                        )}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
