"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    LayoutGrid,
    Plus,
    Loader2,
    Edit2,
    Trash2,
    GripVertical,
    X,
    Check,
    Image as ImageIcon,
} from "lucide-react";
import { toast } from "sonner";
import clsx from "clsx";
import { useBusinessSession } from "@/hooks/useBusinessSession";
import { useTheme } from "@/components/panel/ThemeProvider";
import { ImageGalleryUploader, type GalleryImage } from "@/components/panel/ImageGalleryUploader";
import type { Category } from "@/types/ecommerce";
import { toR2ProxyUrl } from "@/lib/publicImage";

export default function EcommerceCategoriesPage() {
    const { session } = useBusinessSession();
    const { isDark } = useTheme();
    const [isLoading, setIsLoading] = useState(true);
    const [categories, setCategories] = useState<Category[]>([]);
    const [showModal, setShowModal] = useState(false);
    const [editingCategory, setEditingCategory] = useState<Category | null>(null);
    const [isDeleting, setIsDeleting] = useState<string | null>(null);

    // Fetch categories
    useEffect(() => {
        async function fetchCategories() {
            if (!session?.businessId) return;

            try {
                const res = await fetch(`/api/ecommerce/categories?businessId=${session.businessId}`);
                if (res.ok) {
                    const data = await res.json();
                    setCategories(data.categories || []);
                }
            } catch (error) {
                console.error("Categories fetch error:", error);
                toast.error("Kategoriler yüklenemedi");
            } finally {
                setIsLoading(false);
            }
        }

        fetchCategories();
    }, [session?.businessId]);

    // Handle save (create or update)
    const handleSave = async (categoryData: Partial<Category>) => {
        if (!session?.businessId) return;

        try {
            const isEdit = !!editingCategory;
            const res = await fetch("/api/ecommerce/categories", {
                method: isEdit ? "PUT" : "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    businessId: session.businessId,
                    id: editingCategory?.id,
                    ...categoryData,
                }),
            });

            if (res.ok) {
                const data = await res.json();
                if (isEdit) {
                    setCategories(prev =>
                        prev.map(cat => cat.id === editingCategory.id ? { ...cat, ...categoryData } : cat)
                    );
                    toast.success("Kategori güncellendi");
                } else {
                    setCategories(prev => [...prev, data.category]);
                    toast.success("Kategori oluşturuldu");
                }
                setShowModal(false);
                setEditingCategory(null);
            } else {
                const error = await res.json();
                toast.error(error.error || "İşlem başarısız");
            }
        } catch (error) {
            console.error("Save error:", error);
            toast.error("Bağlantı hatası");
        }
    };

    // Handle delete
    const handleDelete = async (id: string) => {
        if (!session?.businessId) return;

        setIsDeleting(id);
        try {
            const res = await fetch(
                `/api/ecommerce/categories?businessId=${session.businessId}&id=${id}`,
                { method: "DELETE" }
            );

            if (res.ok) {
                setCategories(prev => prev.filter(cat => cat.id !== id));
                toast.success("Kategori silindi");
            } else {
                const error = await res.json();
                toast.error(error.error || "Silme başarısız");
            }
        } catch (error) {
            console.error("Delete error:", error);
            toast.error("Bağlantı hatası");
        } finally {
            setIsDeleting(null);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className={clsx("h-8 w-8 animate-spin", isDark ? "text-cyan-400" : "text-cyan-500")} />
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto p-4 sm:p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center">
                        <LayoutGrid className="h-6 w-6 text-white" />
                    </div>
                    <div>
                        <h1 className={clsx("text-xl font-bold", isDark ? "text-white" : "text-gray-900")}>Kategoriler</h1>
                        <p className={clsx("text-sm", isDark ? "text-white/50" : "text-gray-500")}>{categories.length} kategori</p>
                    </div>
                </div>

                <button
                    onClick={() => {
                        setEditingCategory(null);
                        setShowModal(true);
                    }}
                    className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-medium transition-colors"
                >
                    <Plus className="h-4 w-4" />
                    Yeni Kategori
                </button>
            </div>

            {/* Categories List */}
            {categories.length === 0 ? (
                <div className={clsx("text-center py-16 rounded-2xl", isDark ? "bg-white/5" : "bg-gray-50")}>
                    <LayoutGrid className={clsx("h-12 w-12 mx-auto mb-4", isDark ? "text-white/20" : "text-gray-300")} />
                    <h3 className={clsx("text-lg font-medium mb-2", isDark ? "text-white" : "text-gray-900")}>
                        Henüz kategori yok
                    </h3>
                    <p className={clsx("mb-4", isDark ? "text-white/50" : "text-gray-500")}>
                        Ürünlerinizi düzenlemek için kategoriler oluşturun
                    </p>
                    <button
                        onClick={() => setShowModal(true)}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-lg font-medium hover:bg-emerald-600"
                    >
                        <Plus className="h-4 w-4" />
                        İlk Kategoriyi Ekle
                    </button>
                </div>
            ) : (
                <div className={clsx("rounded-2xl border divide-y", isDark ? "bg-white/[0.03] border-white/10 divide-white/10" : "bg-white border-gray-100 divide-gray-100")}>
                    {categories.map((category, index) => (
                        <motion.div
                            key={category.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className={clsx("flex items-center gap-4 p-4 transition-colors", isDark ? "hover:bg-white/5" : "hover:bg-gray-50")}
                        >
                            {/* Drag Handle */}
                            <GripVertical className={clsx("h-5 w-5 cursor-grab", isDark ? "text-white/30" : "text-gray-300")} />

                            {/* Image */}
                            <div className={clsx("h-14 w-14 rounded-xl flex items-center justify-center overflow-hidden flex-shrink-0", isDark ? "bg-white/10" : "bg-gray-100")}>
                                {category.image ? (
                                    <img
                                        src={toR2ProxyUrl(category.image)}
                                        alt={category.name}
                                        className="h-full w-full object-cover"
                                    />
                                ) : (
                                    <ImageIcon className={clsx("h-6 w-6", isDark ? "text-white/30" : "text-gray-300")} />
                                )}
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <h3 className={clsx("font-medium truncate", isDark ? "text-white" : "text-gray-900")}>
                                        {category.name}
                                    </h3>
                                    {category.status === "inactive" && (
                                        <span className="px-1.5 py-0.5 text-xs bg-gray-100 text-gray-500 rounded">
                                            Pasif
                                        </span>
                                    )}
                                </div>
                                <p className="text-sm text-gray-500">
                                    {category.productCount || 0} ürün
                                    {category.description && ` • ${category.description.slice(0, 50)}...`}
                                </p>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => {
                                        setEditingCategory(category);
                                        setShowModal(true);
                                    }}
                                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                                >
                                    <Edit2 className="h-4 w-4" />
                                </button>
                                <button
                                    onClick={() => handleDelete(category.id)}
                                    disabled={isDeleting === category.id}
                                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                                >
                                    {isDeleting === category.id ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <Trash2 className="h-4 w-4" />
                                    )}
                                </button>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}

            {/* Category Modal */}
            <AnimatePresence>
                {showModal && (
                    <CategoryModal
                        category={editingCategory}
                        onSave={handleSave}
                        onClose={() => {
                            setShowModal(false);
                            setEditingCategory(null);
                        }}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}

// Category Modal Component
function CategoryModal({
    category,
    onSave,
    onClose,
}: {
    category: Category | null;
    onSave: (data: Partial<Category>) => Promise<void>;
    onClose: () => void;
}) {
    const [name, setName] = useState(category?.name || "");
    const [description, setDescription] = useState(category?.description || "");
    const [images, setImages] = useState<GalleryImage[]>(
        category?.image ? [{ id: 'cat-img', url: category.image, order: 0, isMain: true }] : []
    );
    const [status, setStatus] = useState<"active" | "inactive">(category?.status || "active");
    const [isSaving, setIsSaving] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) {
            toast.error("Kategori adı zorunlu");
            return;
        }

        setIsSaving(true);
        await onSave({
            name: name.trim(),
            description: description.trim() || undefined,
            image: images[0]?.url || undefined,
            status,
        });
        setIsSaving(false);
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
                            {category ? "Kategori Düzenle" : "Yeni Kategori"}
                        </h3>
                        <button
                            onClick={onClose}
                            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="p-4 space-y-4">
                        {/* Name */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                Kategori Adı *
                            </label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Örn: Elektronik"
                                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none text-gray-900 placeholder:text-gray-400"
                            />
                        </div>

                        {/* Description */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                Açıklama
                            </label>
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Kategori açıklaması..."
                                rows={2}
                                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none resize-none text-gray-900 placeholder:text-gray-400"
                            />
                        </div>

                        {/* Category Image */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                Kategori Görseli
                            </label>
                            <ImageGalleryUploader
                                images={images}
                                onChange={setImages}
                                maxImages={1}
                                uploadEndpoint="/api/ecommerce/upload"
                                uploadModule="ecommerce"
                            />
                        </div>

                        {/* Status */}
                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                            <span className="font-medium text-gray-700">Aktif</span>
                            <button
                                type="button"
                                onClick={() => setStatus(status === "active" ? "inactive" : "active")}
                                className={clsx(
                                    "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                                    status === "active" ? "bg-emerald-500" : "bg-gray-300"
                                )}
                            >
                                <span
                                    className={clsx(
                                        "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                                        status === "active" ? "translate-x-6" : "translate-x-1"
                                    )}
                                />
                            </button>
                        </div>

                        {/* Actions */}
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
                                disabled={isSaving || !name.trim()}
                                className="flex-1 px-4 py-2.5 bg-emerald-500 text-white rounded-xl font-medium hover:bg-emerald-600 disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {isSaving ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <Check className="h-4 w-4" />
                                )}
                                Kaydet
                            </button>
                        </div>
                    </form>
                </div>
            </motion.div>
        </>
    );
}

