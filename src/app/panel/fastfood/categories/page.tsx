"use client";

import { useState, useEffect, useRef } from "react";
import {
    Plus,
    LayoutGrid,
    Pencil,
    Trash2,
    Loader2,
    GripVertical,
    Check,
    X,
    ArrowUp,
    ArrowDown
} from "lucide-react";
import clsx from "clsx";
import { toast } from "sonner";
import { useTheme } from "@/components/panel/ThemeProvider";

interface Category {
    id: string;
    name: string;
    icon: string;
    sortOrder: number;
    isActive: boolean;
}

// Emoji picker options
const EMOJI_OPTIONS = ["🍔", "🍟", "🌭", "🍕", "🌮", "🌯", "🥙", "🍗", "🍖", "🥤", "☕", "🍩", "🍦", "🥗", "🍜", "🍣", "🥚", "🥓", "🧀", "🍰"];

export default function FastFoodCategoriesPage() {
    const { isDark } = useTheme();
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingCategory, setEditingCategory] = useState<Category | null>(null);
    const [formData, setFormData] = useState({ name: "", icon: "🍔", isActive: true });
    const [saving, setSaving] = useState(false);

    // Drag state
    const [draggedItem, setDraggedItem] = useState<string | null>(null);
    const [dragOverItem, setDragOverItem] = useState<string | null>(null);
    const [isSavingOrder, setIsSavingOrder] = useState(false);

    // Theme colors
    const cardBg = isDark ? "bg-[#111]" : "bg-white";
    const borderColor = isDark ? "border-[#222]" : "border-gray-200";
    const textPrimary = isDark ? "text-white" : "text-gray-900";
    const textSecondary = isDark ? "text-gray-400" : "text-gray-600";
    const inputBg = isDark ? "bg-[#0a0a0a] border-[#222]" : "bg-gray-50 border-gray-200";

    // Load categories
    useEffect(() => {
        loadCategories();
    }, []);

    const loadCategories = async () => {
        try {
            const res = await fetch("/api/fastfood/categories");
            const data = await res.json();
            if (data.success) {
                // Sort by sortOrder
                const sorted = (data.categories || []).sort((a: Category, b: Category) =>
                    (a.sortOrder || 0) - (b.sortOrder || 0)
                );
                setCategories(sorted);
            }
        } catch (error) {
            console.error("Failed to load categories:", error);
            toast.error("Kategoriler yüklenemedi");
        } finally {
            setLoading(false);
        }
    };

    const openModal = (category?: Category) => {
        if (category) {
            setEditingCategory(category);
            setFormData({ name: category.name, icon: category.icon, isActive: category.isActive });
        } else {
            setEditingCategory(null);
            setFormData({ name: "", icon: "🍔", isActive: true });
        }
        setShowModal(true);
    };

    const handleSubmit = async () => {
        if (!formData.name.trim()) {
            toast.error("Kategori adı gerekli");
            return;
        }

        setSaving(true);
        try {
            const url = "/api/fastfood/categories";
            const method = editingCategory ? "PUT" : "POST";
            const body = editingCategory
                ? { id: editingCategory.id, ...formData }
                : { ...formData, sortOrder: categories.length };

            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });

            const data = await res.json();
            if (data.success) {
                toast.success(editingCategory ? "Kategori güncellendi" : "Kategori eklendi");
                setShowModal(false);
                loadCategories();
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
        if (!confirm("Bu kategoriyi silmek istediğinizden emin misiniz?")) return;

        try {
            const res = await fetch(`/api/fastfood/categories?id=${id}`, { method: "DELETE" });
            const data = await res.json();
            if (data.success) {
                toast.success("Kategori silindi");
                loadCategories();
            } else {
                toast.error(data.error || "Silme başarısız");
            }
        } catch (error) {
            console.error("Delete error:", error);
            toast.error("Bir hata oluştu");
        }
    };

    const toggleActive = async (category: Category) => {
        try {
            const res = await fetch("/api/fastfood/categories", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id: category.id, isActive: !category.isActive }),
            });
            const data = await res.json();
            if (data.success) {
                setCategories(prev =>
                    prev.map(c => c.id === category.id ? { ...c, isActive: !c.isActive } : c)
                );
                toast.success(category.isActive ? "Kategori pasife alındı" : "Kategori aktifleştirildi");
            }
        } catch (error) {
            console.error("Toggle error:", error);
        }
    };

    // Drag and Drop handlers
    const handleDragStart = (e: React.DragEvent, categoryId: string) => {
        setDraggedItem(categoryId);
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", categoryId);
        // Add some styling to the dragged element
        if (e.currentTarget instanceof HTMLElement) {
            e.currentTarget.style.opacity = "0.5";
        }
    };

    const handleDragEnd = (e: React.DragEvent) => {
        setDraggedItem(null);
        setDragOverItem(null);
        if (e.currentTarget instanceof HTMLElement) {
            e.currentTarget.style.opacity = "1";
        }
    };

    const handleDragOver = (e: React.DragEvent, categoryId: string) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        if (categoryId !== draggedItem) {
            setDragOverItem(categoryId);
        }
    };

    const handleDragLeave = () => {
        setDragOverItem(null);
    };

    const handleDrop = async (e: React.DragEvent, targetId: string) => {
        e.preventDefault();
        setDragOverItem(null);

        if (!draggedItem || draggedItem === targetId) return;

        // Reorder locally first
        const draggedIndex = categories.findIndex(c => c.id === draggedItem);
        const targetIndex = categories.findIndex(c => c.id === targetId);

        if (draggedIndex === -1 || targetIndex === -1) return;

        const newCategories = [...categories];
        const [removed] = newCategories.splice(draggedIndex, 1);
        newCategories.splice(targetIndex, 0, removed);

        // Update sort orders
        const updatedCategories = newCategories.map((cat, index) => ({
            ...cat,
            sortOrder: index
        }));

        setCategories(updatedCategories);
        setDraggedItem(null);

        // Save to server
        await saveNewOrder(updatedCategories);
    };

    const saveNewOrder = async (orderedCategories: Category[]) => {
        setIsSavingOrder(true);
        try {
            // Save each category's new sortOrder
            const updates = orderedCategories.map((cat, index) =>
                fetch("/api/fastfood/categories", {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ id: cat.id, sortOrder: index }),
                })
            );

            await Promise.all(updates);
            toast.success("Sıralama kaydedildi");
        } catch (error) {
            console.error("Save order error:", error);
            toast.error("Sıralama kaydedilemedi");
            loadCategories(); // Reload original order
        } finally {
            setIsSavingOrder(false);
        }
    };

    // Move up/down buttons for mobile
    const moveCategory = async (categoryId: string, direction: 'up' | 'down') => {
        const index = categories.findIndex(c => c.id === categoryId);
        if (index === -1) return;

        const newIndex = direction === 'up' ? index - 1 : index + 1;
        if (newIndex < 0 || newIndex >= categories.length) return;

        const newCategories = [...categories];
        [newCategories[index], newCategories[newIndex]] = [newCategories[newIndex], newCategories[index]];

        const updatedCategories = newCategories.map((cat, i) => ({
            ...cat,
            sortOrder: i
        }));

        setCategories(updatedCategories);
        await saveNewOrder(updatedCategories);
    };

    return (
        <div className="min-h-screen p-4 md:p-6 space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className={clsx("text-2xl md:text-3xl font-bold mb-2", textPrimary)}>
                        Kategoriler
                    </h1>
                    <p className={clsx("text-sm md:text-base", textSecondary)}>
                        Sürükleyerek sıralayın veya kategorileri yönetin
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    {isSavingOrder && (
                        <span className="flex items-center gap-2 text-sm text-emerald-500">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Kaydediliyor...
                        </span>
                    )}
                    <button
                        onClick={() => openModal()}
                        className="flex items-center gap-2 px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold transition-all shadow-lg shadow-emerald-500/20 active:scale-95"
                    >
                        <Plus className="w-5 h-5" />
                        Yeni Kategori
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className={clsx("rounded-3xl border overflow-hidden transition-colors", cardBg, borderColor)}>
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
                    </div>
                ) : categories.length === 0 ? (
                    <div className="text-center py-20 px-4">
                        <div className={clsx("w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6", isDark ? "bg-emerald-500/10" : "bg-emerald-50")}>
                            <LayoutGrid className="w-10 h-10 text-emerald-500" />
                        </div>
                        <h3 className={clsx("text-xl font-bold mb-2", textPrimary)}>Henüz kategori yok</h3>
                        <p className={clsx("text-gray-500 max-w-sm mx-auto mb-8", textSecondary)}>
                            Menünüzü oluşturmaya başlamak için ilk kategorinizi ekleyin.
                        </p>
                        <button
                            onClick={() => openModal()}
                            className="text-emerald-500 font-bold hover:underline"
                        >
                            Kategori Ekle
                        </button>
                    </div>
                ) : (
                    <div className="divide-y transition-colors" style={{ borderColor: isDark ? '#222' : '#e5e7eb' }}>
                        {categories.map((category, index) => (
                            <div
                                key={category.id}
                                draggable
                                onDragStart={(e) => handleDragStart(e, category.id)}
                                onDragEnd={handleDragEnd}
                                onDragOver={(e) => handleDragOver(e, category.id)}
                                onDragLeave={handleDragLeave}
                                onDrop={(e) => handleDrop(e, category.id)}
                                className={clsx(
                                    "flex items-center gap-4 p-5 transition-all group",
                                    isDark ? "hover:bg-white/5" : "hover:bg-gray-50",
                                    draggedItem === category.id && "opacity-50",
                                    dragOverItem === category.id && (isDark ? "bg-emerald-500/10 border-l-4 border-emerald-500" : "bg-emerald-50 border-l-4 border-emerald-500")
                                )}
                            >
                                {/* Drag Handle */}
                                <div
                                    className={clsx(
                                        "p-2 rounded-lg cursor-grab active:cursor-grabbing transition-colors",
                                        isDark ? "text-gray-600 hover:text-gray-400 hover:bg-white/5" : "text-gray-300 hover:text-gray-500 hover:bg-gray-100"
                                    )}
                                    title="Sürükleyerek sırala"
                                >
                                    <GripVertical className="w-5 h-5" />
                                </div>

                                {/* Sort order indicator */}
                                <div className={clsx(
                                    "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold",
                                    isDark ? "bg-[#1a1a1a] text-gray-400" : "bg-gray-100 text-gray-500"
                                )}>
                                    {index + 1}
                                </div>

                                {/* Icon */}
                                <div className={clsx(
                                    "w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shadow-sm",
                                    isDark ? "bg-[#1a1a1a] border border-[#333]" : "bg-white border border-gray-100"
                                )}>
                                    {category.icon}
                                </div>

                                {/* Name & Status */}
                                <div className="flex-1 min-w-0">
                                    <h3 className={clsx("font-bold text-lg truncate", textPrimary)}>
                                        {category.name}
                                    </h3>
                                    <div className="flex gap-2 mt-1">
                                        <span className={clsx(
                                            "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium",
                                            category.isActive
                                                ? (isDark ? "bg-emerald-500/10 text-emerald-400" : "bg-emerald-50 text-emerald-600")
                                                : (isDark ? "bg-gray-800 text-gray-400" : "bg-gray-100 text-gray-500")
                                        )}>
                                            {category.isActive ? "Aktif" : "Pasif"}
                                        </span>
                                    </div>
                                </div>

                                {/* Move buttons (visible on mobile) */}
                                <div className="flex flex-col gap-1 md:hidden">
                                    <button
                                        onClick={() => moveCategory(category.id, 'up')}
                                        disabled={index === 0}
                                        className={clsx(
                                            "p-1.5 rounded-lg transition-colors disabled:opacity-30",
                                            isDark ? "hover:bg-white/10" : "hover:bg-gray-100"
                                        )}
                                    >
                                        <ArrowUp className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => moveCategory(category.id, 'down')}
                                        disabled={index === categories.length - 1}
                                        className={clsx(
                                            "p-1.5 rounded-lg transition-colors disabled:opacity-30",
                                            isDark ? "hover:bg-white/10" : "hover:bg-gray-100"
                                        )}
                                    >
                                        <ArrowDown className="w-4 h-4" />
                                    </button>
                                </div>

                                {/* Actions */}
                                <div className="flex items-center gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={() => toggleActive(category)}
                                        className={clsx(
                                            "w-12 h-7 rounded-full transition-colors relative mr-2 focus:outline-none",
                                            category.isActive ? "bg-emerald-500" : (isDark ? "bg-gray-700" : "bg-gray-300")
                                        )}
                                        title={category.isActive ? "Pasife al" : "Aktifleştir"}
                                    >
                                        <span className={clsx(
                                            "absolute top-1 w-5 h-5 bg-white rounded-full shadow-sm transition-transform",
                                            category.isActive ? "left-6" : "left-1"
                                        )} />
                                    </button>

                                    <button
                                        onClick={() => openModal(category)}
                                        className={clsx(
                                            "p-2.5 rounded-xl transition-colors",
                                            isDark ? "hover:bg-blue-500/10 text-blue-400" : "hover:bg-blue-50 text-blue-600"
                                        )}
                                        title="Düzenle"
                                    >
                                        <Pencil className="w-5 h-5" />
                                    </button>

                                    <button
                                        onClick={() => handleDelete(category.id)}
                                        className={clsx(
                                            "p-2.5 rounded-xl transition-colors",
                                            isDark ? "hover:bg-red-500/10 text-red-400" : "hover:bg-red-50 text-red-600"
                                        )}
                                        title="Sil"
                                    >
                                        <Trash2 className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Drag hint */}
            {categories.length > 1 && (
                <p className={clsx("text-center text-sm", textSecondary)}>
                    💡 Kategorileri sürükleyerek sıralayabilirsiniz
                </p>
            )}

            {/* Modal */}
            {showModal && (
                <div
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
                    onClick={() => setShowModal(false)}
                >
                    <div
                        onClick={(e) => e.stopPropagation()}
                        className={clsx("w-full max-w-md rounded-3xl shadow-2xl overflow-hidden", cardBg)}
                    >
                        <div className={clsx("px-6 py-4 border-b flex items-center justify-between", borderColor)}>
                            <h2 className={clsx("text-xl font-bold", textPrimary)}>
                                {editingCategory ? "Kategori Düzenle" : "Yeni Kategori"}
                            </h2>
                            <button
                                onClick={() => setShowModal(false)}
                                className="p-2 rounded-full hover:bg-gray-500/10 transition-colors"
                            >
                                <X className="w-5 h-5 text-gray-500" />
                            </button>
                        </div>

                        <div className="p-6 space-y-5">
                            {/* Name */}
                            <div>
                                <label className={clsx("block text-sm font-medium mb-2", textSecondary)}>
                                    Kategori Adı <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="Örn: Burgerler"
                                    className={clsx(
                                        "w-full px-4 py-3.5 rounded-xl border-2 text-base font-medium transition-colors focus:outline-none focus:border-emerald-500",
                                        inputBg, textPrimary
                                    )}
                                    autoFocus
                                />
                            </div>

                            {/* Emoji Picker */}
                            <div>
                                <label className={clsx("block text-sm font-medium mb-2", textSecondary)}>İkon Seçin</label>
                                <div className="flex flex-wrap gap-2">
                                    {EMOJI_OPTIONS.map((emoji) => (
                                        <button
                                            key={emoji}
                                            type="button"
                                            onClick={() => setFormData({ ...formData, icon: emoji })}
                                            className={clsx(
                                                "w-11 h-11 text-xl rounded-xl transition-all border-2",
                                                formData.icon === emoji
                                                    ? "bg-emerald-500/10 border-emerald-500 scale-110 shadow-lg"
                                                    : (isDark ? "bg-[#1a1a1a] border-transparent hover:border-[#333]" : "bg-gray-50 border-transparent hover:border-gray-200")
                                            )}
                                        >
                                            {emoji}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Active Toggle */}
                            <div className={clsx("flex items-center justify-between p-4 rounded-xl border", borderColor, isDark ? "bg-[#151515]" : "bg-gray-50")}>
                                <div>
                                    <span className={clsx("font-medium block", textPrimary)}>Aktif Durum</span>
                                    <span className="text-xs text-gray-500">Kategori menüde görünsün mü?</span>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setFormData({ ...formData, isActive: !formData.isActive })}
                                    className={clsx(
                                        "relative w-12 h-7 rounded-full transition-colors",
                                        formData.isActive ? "bg-emerald-500" : (isDark ? "bg-gray-700" : "bg-gray-300")
                                    )}
                                >
                                    <span className={clsx(
                                        "absolute top-1 w-5 h-5 bg-white rounded-full shadow-sm transition-transform",
                                        formData.isActive ? "left-6" : "left-1"
                                    )} />
                                </button>
                            </div>
                        </div>

                        <div className={clsx("px-6 py-4 border-t flex gap-3", borderColor)}>
                            <button
                                onClick={() => setShowModal(false)}
                                className={clsx(
                                    "flex-1 py-3.5 rounded-xl font-bold text-sm transition-colors",
                                    isDark ? "bg-white/5 hover:bg-white/10 text-gray-300" : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                                )}
                            >
                                İptal
                            </button>
                            <button
                                onClick={handleSubmit}
                                disabled={saving || !formData.name.trim()}
                                className="flex-1 py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white font-bold text-sm transition-colors flex items-center justify-center gap-2"
                            >
                                {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
                                Kaydet
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
