"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Plus,
    Trash2,
    Edit3,
    Check,
    X,
    ChevronDown,
    GripVertical,
    Image as ImageIcon,
    Package,
    Loader2,
    Save,
    AlertCircle,
    Printer
} from "lucide-react";
import { useTheme } from "@/components/panel/ThemeProvider";
import { useBusinessSession } from "@/hooks/useBusinessSession";
import clsx from "clsx";
import { toast } from "sonner";
import { PrintableMenu } from "@/components/panel/PrintableMenu";
import { uploadImageWithFallback } from "@/lib/clientUpload";
import {
    FBCategory,
    FBProduct,
    subscribeToCategories,
    subscribeToProducts,
    createCategory,
    updateCategory,
    deleteCategory,
    createProduct,
    updateProduct,
    deleteProduct,
    toggleProductStock,
    formatPrice
} from "@/lib/services/foodService";

// ============================================
// PRODUCT MODAL COMPONENT
// ============================================
interface ProductModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: { name: string; price: string; description: string; image: string }) => Promise<void>;
    initialData?: { name: string; price: string; description: string; image: string };
    title: string;
    isDark: boolean;
}

function ProductModal({ isOpen, onClose, onSave, initialData, title, isDark }: ProductModalProps) {
    const [formData, setFormData] = useState({
        name: initialData?.name || "",
        price: initialData?.price || "",
        description: initialData?.description || "",
        image: initialData?.image || ""
    });
    const [isSaving, setIsSaving] = useState(false);

    // Reset form when modal opens with new data
    useEffect(() => {
        if (isOpen) {
            setFormData({
                name: initialData?.name || "",
                price: initialData?.price || "",
                description: initialData?.description || "",
                image: initialData?.image || ""
            });
        }
    }, [isOpen, initialData]);

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'];
        if (!allowedTypes.includes(file.type)) {
            toast.error("Sadece JPG, PNG, WebP, GIF ve AVIF y??klenebilir");
            return;
        }

        if (file.size > 10 * 1024 * 1024) {
            toast.error("Dosya boyutu 10MB'dan k??????k olmal??");
            return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
            setFormData(prev => ({ ...prev, image: event.target?.result as string }));
        };
        reader.readAsDataURL(file);

        try {
            const { url } = await uploadImageWithFallback({
                file,
                moduleName: "restaurant",
                fallbackEndpoint: "/api/restaurant/upload",
            });

            if (url) {
                setFormData(prev => ({ ...prev, image: url }));
                toast.success("Foto?Yraf y??klendi");
            } else {
                toast.error("Foto?Yraf y??klenemedi");
            }
        } catch (error) {
            console.error("Upload error:", error);
            toast.error("Foto?Yraf y??kleme hatas??");
        }
    };

    const handleSubmit = async () => {
        if (!formData.name.trim()) {
            toast.error("Ürün adı zorunludur");
            return;
        }
        if (!formData.price) {
            toast.error("Fiyat zorunludur");
            return;
        }
        if (formData.image?.startsWith("data:image/")) {
            toast.error("Görsel yükleme tamamlanmadan kaydedilemez");
            return;
        }
        setIsSaving(true);
        try {
            await onSave(formData);
            onClose();
        } catch {
            toast.error("Bir hata oluştu");
        } finally {
            setIsSaving(false);
        }
    };

    if (!isOpen) return null;

    const cardBg = isDark ? "bg-[#111]" : "bg-white";
    const inputBg = isDark ? "bg-[#0a0a0a] border-[#222]" : "bg-gray-50 border-gray-200";
    const textPrimary = isDark ? "text-white" : "text-gray-900";
    const textSecondary = isDark ? "text-gray-400" : "text-gray-600";

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

            {/* Modal */}
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className={clsx("relative w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden", cardBg)}
            >
                {/* Header */}
                <div className={clsx("px-6 py-4 border-b flex items-center justify-between", isDark ? "border-[#222]" : "border-gray-200")}>
                    <h2 className={clsx("text-xl font-bold", textPrimary)}>{title}</h2>
                    <button onClick={onClose} className="p-2 hover:bg-gray-500/10 rounded-full transition-colors">
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-5">
                    {/* Image Upload - Large and Prominent */}
                    <div className="mb-6">
                        <label className={clsx("block text-sm font-medium mb-2", textSecondary)}>
                            Ürün Görseli
                        </label>
                        <label className={clsx(
                            "flex flex-col items-center justify-center w-full h-40 rounded-2xl border-2 border-dashed cursor-pointer transition-all",
                            isDark ? "border-[#333] hover:border-emerald-500/50 hover:bg-emerald-500/5" : "border-gray-300 hover:border-emerald-500 hover:bg-emerald-50",
                            formData.image && "border-solid"
                        )}>
                            {formData.image ? (
                                <div className="relative w-full h-full">
                                    <img src={formData.image} alt="Önizleme" className="w-full h-full object-contain rounded-2xl" />
                                    <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center rounded-2xl">
                                        <span className="text-white font-medium">Değiştir</span>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center gap-2 text-center p-4">
                                    <div className={clsx("w-14 h-14 rounded-full flex items-center justify-center", isDark ? "bg-emerald-500/10" : "bg-emerald-100")}>
                                        <ImageIcon className="w-7 h-7 text-emerald-500" />
                                    </div>
                                    <span className={clsx("font-medium", textPrimary)}>Görsel Yükle</span>
                                    <span className={clsx("text-xs", textSecondary)}>PNG, JPG veya WEBP</span>
                                </div>
                            )}
                            <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                        </label>
                    </div>

                    {/* Product Name */}
                    <div>
                        <label className={clsx("block text-sm font-medium mb-2", textSecondary)}>
                            Ürün Adı <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                            placeholder="Örn: Karışık Pizza"
                            className={clsx(
                                "w-full px-4 py-3.5 rounded-xl border-2 text-base font-medium transition-colors focus:outline-none focus:border-emerald-500",
                                inputBg, textPrimary
                            )}
                        />
                    </div>

                    {/* Price */}
                    <div>
                        <label className={clsx("block text-sm font-medium mb-2", textSecondary)}>
                            Fiyat (₺) <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="number"
                            value={formData.price}
                            onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                            placeholder="Örn: 150"
                            className={clsx(
                                "w-full px-4 py-3.5 rounded-xl border-2 text-base font-medium transition-colors focus:outline-none focus:border-emerald-500",
                                inputBg, textPrimary
                            )}
                        />
                    </div>

                    {/* Description */}
                    <div>
                        <label className={clsx("block text-sm font-medium mb-2", textSecondary)}>
                            Açıklama (Opsiyonel)
                        </label>
                        <textarea
                            value={formData.description}
                            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                            placeholder="Ürün hakkında kısa bir açıklama yazın..."
                            rows={3}
                            className={clsx(
                                "w-full px-4 py-3 rounded-xl border-2 text-sm transition-colors focus:outline-none focus:border-emerald-500 resize-none",
                                inputBg, textPrimary
                            )}
                        />
                    </div>
                </div>

                {/* Footer */}
                <div className={clsx("px-6 py-4 border-t flex gap-3", isDark ? "border-[#222]" : "border-gray-200")}>
                    <button
                        onClick={onClose}
                        className={clsx(
                            "flex-1 py-3.5 rounded-xl font-bold text-sm transition-colors",
                            isDark ? "bg-white/5 hover:bg-white/10 text-gray-300" : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                        )}
                    >
                        İptal
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={isSaving}
                        className="flex-1 py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white font-bold text-sm transition-colors flex items-center justify-center gap-2"
                    >
                        {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                        Kaydet
                    </button>
                </div>
            </motion.div>
        </div>
    );
}

// ============================================
// MAIN MENU PAGE
// ============================================
export default function MenuPage() {
    const { isDark } = useTheme();
    const { session, isLoading: sessionLoading } = useBusinessSession();

    const [categories, setCategories] = useState<FBCategory[]>([]);
    const [products, setProducts] = useState<FBProduct[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [expandedCategories, setExpandedCategories] = useState<string[]>([]);
    const [newCategoryName, setNewCategoryName] = useState("");
    const [editingCategory, setEditingCategory] = useState<string | null>(null);
    const [editingCategoryName, setEditingCategoryName] = useState("");
    const [isAdding, setIsAdding] = useState(false);

    // Product Modal State
    const [isProductModalOpen, setIsProductModalOpen] = useState(false);
    const [productModalMode, setProductModalMode] = useState<"add" | "edit">("add");
    const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
    const [editingProductId, setEditingProductId] = useState<string | null>(null);
    const [editingProductData, setEditingProductData] = useState<{ name: string; price: string; description: string; image: string } | undefined>();
    const [showPrintPreview, setShowPrintPreview] = useState(false);

    // Theme colors
    const cardBg = isDark ? "bg-[#111]" : "bg-white";
    const borderColor = isDark ? "border-[#222]" : "border-gray-200";
    const textPrimary = isDark ? "text-white" : "text-gray-900";
    const textSecondary = isDark ? "text-gray-400" : "text-gray-600";
    const inputBg = isDark ? "bg-[#0a0a0a] border-[#222]" : "bg-gray-50 border-gray-200";

    // Subscribe to real-time data
    useEffect(() => {
        if (!session?.businessId) return;

        let loadedCount = 0;
        const checkLoaded = () => {
            loadedCount++;
            if (loadedCount >= 2) setIsLoading(false);
        };

        const unsubCategories = subscribeToCategories(session.businessId, (data) => {
            setCategories(data);
            // Use functional update to avoid stale closure
            setExpandedCategories(prev => {
                if (prev.length === 0 && data.length > 0) {
                    return [data[0].id];
                }
                return prev;
            });
            checkLoaded();
        });

        const unsubProducts = subscribeToProducts(session.businessId, (data) => {
            setProducts(data);
            checkLoaded();
        });

        return () => {
            unsubCategories();
            unsubProducts();
        };
    }, [session?.businessId]);

    // Toggle category expansion
    const toggleCategory = (id: string) => {
        setExpandedCategories(prev =>
            prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
        );
    };

    // Add category
    const handleAddCategory = async () => {
        if (!newCategoryName.trim() || !session?.businessId) {
            toast.error("Kategori adı girin");
            return;
        }
        setIsAdding(true);
        try {
            const newId = await createCategory(session.businessId, newCategoryName.trim(), categories.length);
            setNewCategoryName("");
            setExpandedCategories(prev => [...prev, newId]);
            toast.success("Kategori eklendi");
        } catch (error) {
            console.error("Error adding category:", error);
            toast.error("Kategori eklenirken hata oluştu");
        } finally {
            setIsAdding(false);
        }
    };

    // Save category edit
    const saveCategoryEdit = async () => {
        if (!editingCategoryName.trim() || !editingCategory) return;
        try {
            await updateCategory(editingCategory, { name: editingCategoryName.trim() });
            setEditingCategory(null);
            toast.success("Kategori güncellendi");
        } catch (error) {
            console.error("Error updating category:", error);
            toast.error("Güncelleme hatası");
        }
    };

    // Delete category
    const handleDeleteCategory = async (id: string) => {
        if (!confirm("Bu kategori ve içindeki tüm ürünler silinecek. Emin misiniz?")) return;
        try {
            const categoryProducts = products.filter(p => p.category_id === id);
            await Promise.all(categoryProducts.map(p => deleteProduct(p.id)));
            await deleteCategory(id);
            toast.success("Kategori silindi");
        } catch (error) {
            console.error("Error deleting category:", error);
            toast.error("Silme hatası");
        }
    };

    // Open Add Product Modal
    const openAddProductModal = (categoryId: string) => {
        setSelectedCategoryId(categoryId);
        setProductModalMode("add");
        setEditingProductData(undefined);
        setIsProductModalOpen(true);
    };

    // Open Edit Product Modal
    const openEditProductModal = (product: FBProduct) => {
        setEditingProductId(product.id);
        setProductModalMode("edit");
        setEditingProductData({
            name: product.name,
            price: product.price.toString(),
            description: product.description || "",
            image: product.image || ""
        });
        setIsProductModalOpen(true);
    };

    // Handle Product Modal Save
    const handleProductModalSave = async (data: { name: string; price: string; description: string; image: string }) => {
        if (productModalMode === "add" && selectedCategoryId && session?.businessId) {
            const categoryProducts = products.filter(p => p.category_id === selectedCategoryId);
            await createProduct({
                category_id: selectedCategoryId,
                business_id: session.businessId,
                name: data.name.trim(),
                price: parseFloat(data.price),
                description: data.description.trim() || undefined,
                image: data.image || undefined,
                in_stock: true,
                order: categoryProducts.length
            });
            toast.success("Ürün eklendi! 🎉");
        } else if (productModalMode === "edit" && editingProductId) {
            await updateProduct(editingProductId, {
                name: data.name.trim(),
                price: parseFloat(data.price),
                description: data.description.trim() || undefined,
                image: data.image || undefined
            });
            toast.success("Ürün güncellendi! ✅");
        }
    };

    // Toggle stock
    const handleToggleStock = async (productId: string, currentStock: boolean) => {
        try {
            await toggleProductStock(productId, !currentStock);
            toast.success(currentStock ? "Ürün tükendi olarak işaretlendi" : "Ürün stokta olarak işaretlendi");
        } catch (error) {
            console.error("Error toggling stock:", error);
            toast.error("Güncelleme hatası");
        }
    };

    // Delete product
    const handleDeleteProduct = async (id: string) => {
        if (!confirm("Bu ürünü silmek istediğinize emin misiniz?")) return;
        try {
            await deleteProduct(id);
            toast.success("Ürün silindi");
        } catch (error) {
            console.error("Error deleting product:", error);
            toast.error("Silme hatası");
        }
    };

    // Get products for a category
    const getCategoryProducts = (categoryId: string) =>
        products.filter(p => p.category_id === categoryId);

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
            <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className={clsx("text-2xl md:text-3xl font-bold mb-2", textPrimary)}>
                        Menü Yönetimi
                    </h1>
                    <p className={clsx("text-sm md:text-base", textSecondary)}>
                        Kategoriler ve ürünler ekleyin, fiyatları güncelleyin
                    </p>
                </div>
                <button
                    onClick={() => {
                        if (categories.length === 0) {
                            toast.error("Menüde kategori bulunmuyor");
                            return;
                        }
                        setShowPrintPreview(true);
                    }}
                    disabled={categories.length === 0}
                    className={clsx(
                        "flex items-center gap-2 px-5 py-3 rounded-xl font-semibold transition-all",
                        "bg-emerald-500 text-white hover:bg-emerald-600",
                        "disabled:opacity-50 disabled:cursor-not-allowed"
                    )}
                >
                    <Printer className="w-5 h-5" />
                    Menüyü Yazdır
                </button>
            </div>

            {/* Add Category - More Prominent */}
            <div className={clsx("rounded-2xl border p-4 md:p-5 mb-6", cardBg, borderColor)}>
                <div className="flex flex-col sm:flex-row gap-3">
                    <input
                        type="text"
                        value={newCategoryName}
                        onChange={(e) => setNewCategoryName(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleAddCategory()}
                        placeholder="Yeni kategori adı (ör: Tatlılar, İçecekler)"
                        className={clsx(
                            "flex-1 px-4 py-3.5 rounded-xl border-2 transition-colors focus:outline-none focus:border-emerald-500 text-base",
                            inputBg, textPrimary
                        )}
                        disabled={isAdding}
                    />
                    <button
                        onClick={handleAddCategory}
                        disabled={isAdding}
                        className="px-6 py-3.5 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2 text-base"
                    >
                        {isAdding ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
                        Kategori Ekle
                    </button>
                </div>
            </div>

            {/* Categories List */}
            <div className="space-y-4">
                <AnimatePresence>
                    {categories.map((category) => {
                        const categoryProducts = getCategoryProducts(category.id);
                        const isExpanded = expandedCategories.includes(category.id);
                        const isEditing = editingCategory === category.id;

                        return (
                            <motion.div
                                key={category.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, height: 0 }}
                                className={clsx("rounded-2xl border overflow-hidden", cardBg, borderColor)}
                            >
                                {/* Category Header */}
                                <div className={clsx(
                                    "flex items-center gap-3 p-4 cursor-pointer transition-colors",
                                    isExpanded && (isDark ? "bg-white/5" : "bg-gray-50")
                                )}>
                                    <button className="text-gray-400 cursor-grab hover:text-gray-600 transition-colors">
                                        <GripVertical className="w-5 h-5" />
                                    </button>

                                    {isEditing ? (
                                        <div className="flex items-center gap-2 flex-1">
                                            <input
                                                type="text"
                                                value={editingCategoryName}
                                                onChange={(e) => setEditingCategoryName(e.target.value)}
                                                onKeyDown={(e) => e.key === "Enter" && saveCategoryEdit()}
                                                className={clsx("flex-1 px-3 py-2 rounded-lg border-2 text-base", inputBg, textPrimary)}
                                                autoFocus
                                            />
                                            <button onClick={saveCategoryEdit} className="p-2 text-emerald-500 hover:bg-emerald-500/10 rounded-lg">
                                                <Check className="w-5 h-5" />
                                            </button>
                                            <button onClick={() => setEditingCategory(null)} className="p-2 text-gray-500 hover:bg-gray-500/10 rounded-lg">
                                                <X className="w-5 h-5" />
                                            </button>
                                        </div>
                                    ) : (
                                        <>
                                            <div
                                                className="flex-1 flex items-center gap-3"
                                                onClick={() => toggleCategory(category.id)}
                                            >
                                                <span className={clsx("font-bold text-lg", textPrimary)}>
                                                    {category.name}
                                                </span>
                                                <span className={clsx(
                                                    "px-2.5 py-1 rounded-full text-xs font-bold",
                                                    isDark ? "bg-emerald-500/20 text-emerald-400" : "bg-emerald-100 text-emerald-600"
                                                )}>
                                                    {categoryProducts.length} ürün
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <button
                                                    onClick={() => {
                                                        setEditingCategory(category.id);
                                                        setEditingCategoryName(category.name);
                                                    }}
                                                    className="p-2.5 hover:bg-blue-500/10 rounded-xl transition-colors"
                                                    title="Düzenle"
                                                >
                                                    <Edit3 className="w-5 h-5 text-blue-500" />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteCategory(category.id)}
                                                    className="p-2.5 hover:bg-red-500/10 rounded-xl transition-colors"
                                                    title="Sil"
                                                >
                                                    <Trash2 className="w-5 h-5 text-red-500" />
                                                </button>
                                                <button
                                                    onClick={() => toggleCategory(category.id)}
                                                    className="p-2.5"
                                                >
                                                    <ChevronDown className={clsx(
                                                        "w-5 h-5 transition-transform text-gray-500",
                                                        isExpanded && "rotate-180"
                                                    )} />
                                                </button>
                                            </div>
                                        </>
                                    )}
                                </div>

                                {/* Products List */}
                                <AnimatePresence>
                                    {isExpanded && (
                                        <motion.div
                                            initial={{ height: 0 }}
                                            animate={{ height: "auto" }}
                                            exit={{ height: 0 }}
                                            className="overflow-hidden"
                                        >
                                            <div className={clsx("border-t", borderColor)}>
                                                {/* Products */}
                                                {categoryProducts.length === 0 ? (
                                                    <div className={clsx("p-8 text-center", textSecondary)}>
                                                        <AlertCircle className="w-10 h-10 mx-auto mb-2 opacity-50" />
                                                        <p>Bu kategoride henüz ürün yok</p>
                                                    </div>
                                                ) : (
                                                    categoryProducts.map((product) => (
                                                        <div
                                                            key={product.id}
                                                            className={clsx(
                                                                "flex items-center gap-4 p-4 border-b last:border-b-0 transition-colors hover:bg-gray-50/5",
                                                                borderColor,
                                                                !product.in_stock && "opacity-60"
                                                            )}
                                                        >
                                                            {/* Product Image - Larger */}
                                                            <div className={clsx(
                                                                "w-20 h-20 rounded-2xl flex items-center justify-center flex-shrink-0 overflow-hidden",
                                                                isDark ? "bg-white/5" : "bg-gray-100"
                                                            )}>
                                                                {product.image ? (
                                                                    <img src={product.image} alt={product.name} className="w-full h-full object-cover rounded-2xl" />
                                                                ) : (
                                                                    <ImageIcon className="w-8 h-8 text-gray-400" />
                                                                )}
                                                            </div>

                                                            {/* Product Info */}
                                                            <div className="flex-1 min-w-0">
                                                                <p className={clsx("font-bold text-base truncate", textPrimary)}>
                                                                    {product.name}
                                                                </p>
                                                                {product.description && (
                                                                    <p className={clsx("text-sm truncate mt-0.5", textSecondary)}>
                                                                        {product.description}
                                                                    </p>
                                                                )}
                                                                <p className="text-emerald-500 font-bold text-lg mt-1">
                                                                    {formatPrice(product.price)}
                                                                </p>
                                                            </div>

                                                            {/* Stock Toggle - Switch Style */}
                                                            <button
                                                                onClick={() => handleToggleStock(product.id, product.in_stock)}
                                                                className={clsx(
                                                                    "relative w-14 h-8 rounded-full transition-colors flex-shrink-0",
                                                                    product.in_stock ? "bg-emerald-500" : "bg-red-500"
                                                                )}
                                                            >
                                                                <span className={clsx(
                                                                    "absolute top-1 w-6 h-6 bg-white rounded-full shadow transition-transform",
                                                                    product.in_stock ? "left-7" : "left-1"
                                                                )} />
                                                            </button>

                                                            {/* Actions - Larger Icons */}
                                                            <div className="flex items-center gap-1">
                                                                <button
                                                                    onClick={() => openEditProductModal(product)}
                                                                    className="p-3 hover:bg-blue-500/10 rounded-xl transition-colors"
                                                                    title="Düzenle"
                                                                >
                                                                    <Edit3 className="w-5 h-5 text-blue-500" />
                                                                </button>
                                                                <button
                                                                    onClick={() => handleDeleteProduct(product.id)}
                                                                    className="p-3 hover:bg-red-500/10 rounded-xl transition-colors"
                                                                    title="Sil"
                                                                >
                                                                    <Trash2 className="w-5 h-5 text-red-500" />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ))
                                                )}

                                                {/* Add Product Button - More Prominent */}
                                                <button
                                                    onClick={() => openAddProductModal(category.id)}
                                                    className={clsx(
                                                        "w-full p-4 flex items-center justify-center gap-2 font-bold transition-colors",
                                                        isDark
                                                            ? "text-emerald-400 hover:bg-emerald-500/10"
                                                            : "text-emerald-600 hover:bg-emerald-50"
                                                    )}
                                                >
                                                    <Plus className="w-5 h-5" />
                                                    Yeni Ürün Ekle
                                                </button>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </motion.div>
                        );
                    })}
                </AnimatePresence>
            </div>

            {/* Empty State */}
            {categories.length === 0 && (
                <div className={clsx("text-center py-16 rounded-2xl border", cardBg, borderColor)}>
                    <Package className={clsx("w-16 h-16 mx-auto mb-4", textSecondary)} />
                    <p className={clsx("text-lg font-medium", textPrimary)}>Henüz kategori eklenmemiş</p>
                    <p className={clsx("text-sm mt-1", textSecondary)}>
                        Yukarıdan ilk kategorinizi ekleyerek başlayın
                    </p>
                </div>
            )}

            {/* Product Modal */}
            <AnimatePresence>
                {isProductModalOpen && (
                    <ProductModal
                        isOpen={isProductModalOpen}
                        onClose={() => {
                            setIsProductModalOpen(false);
                            setEditingProductId(null);
                            setEditingProductData(undefined);
                        }}
                        onSave={handleProductModalSave}
                        initialData={editingProductData}
                        title={productModalMode === "add" ? "Yeni Ürün Ekle" : "Ürünü Düzenle"}
                        isDark={isDark}
                    />
                )}
            </AnimatePresence>

            {/* Print Preview Modal */}
            {showPrintPreview && (
                <PrintableMenu
                    businessName={session?.businessName || "İşletme"}
                    categories={categories}
                    products={products}
                    onClose={() => setShowPrintPreview(false)}
                />
            )}
        </div>
    );
}
