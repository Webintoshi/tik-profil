"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Package,
    Plus,
    Loader2,
    Edit2,
    Trash2,
    X,
    Check,
    Image as ImageIcon,
    Search,
    Filter,
    AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import clsx from "clsx";
import { useBusinessSession } from "@/hooks/useBusinessSession";
import { useTheme } from "@/components/panel/ThemeProvider";
import { ImageGalleryUploader, type GalleryImage } from "@/components/panel/ImageGalleryUploader";
import type { Product, Category } from "@/types/ecommerce";
import { toR2ProxyUrl } from "@/lib/publicImage";

export default function EcommerceProductsPage() {
    const { session } = useBusinessSession();
    const { isDark } = useTheme();
    const [isLoading, setIsLoading] = useState(true);
    const [products, setProducts] = useState<Product[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [showModal, setShowModal] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [isDeleting, setIsDeleting] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [filterCategory, setFilterCategory] = useState<string>("");

    // Fetch products and categories
    useEffect(() => {
        async function fetchData() {
            if (!session?.businessId) return;

            try {
                const [productsRes, categoriesRes] = await Promise.all([
                    fetch(`/api/ecommerce/products?businessId=${session.businessId}`),
                    fetch(`/api/ecommerce/categories?businessId=${session.businessId}`),
                ]);

                if (productsRes.ok) {
                    const data = await productsRes.json();
                    setProducts(data.products || []);
                }
                if (categoriesRes.ok) {
                    const data = await categoriesRes.json();
                    setCategories(data.categories || []);
                }
            } catch (error) {
                console.error("Fetch error:", error);
                toast.error("Veriler yüklenemedi");
            } finally {
                setIsLoading(false);
            }
        }

        fetchData();
    }, [session?.businessId]);

    // Filter products
    const filteredProducts = products.filter((product) => {
        const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = !filterCategory || product.categoryId === filterCategory;
        return matchesSearch && matchesCategory;
    });

    // Handle save
    const handleSave = async (productData: Partial<Product>) => {
        if (!session?.businessId) return;

        try {
            const isEdit = !!editingProduct;
            const res = await fetch("/api/ecommerce/products", {
                method: isEdit ? "PUT" : "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    businessId: session.businessId,
                    id: editingProduct?.id,
                    ...productData,
                }),
            });

            if (res.ok) {
                const data = await res.json();
                if (isEdit) {
                    setProducts((prev) =>
                        prev.map((p) => (p.id === editingProduct.id ? { ...p, ...productData } : p))
                    );
                    toast.success("Ürün güncellendi");
                } else {
                    setProducts((prev) => [data.product, ...prev]);
                    toast.success("Ürün oluşturuldu");
                }
                setShowModal(false);
                setEditingProduct(null);
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
                `/api/ecommerce/products?businessId=${session.businessId}&id=${id}`,
                { method: "DELETE" }
            );

            if (res.ok) {
                setProducts((prev) => prev.filter((p) => p.id !== id));
                toast.success("Ürün silindi");
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

    // Get category name
    const getCategoryName = (categoryId?: string) => {
        if (!categoryId) return "-";
        return categories.find((c) => c.id === categoryId)?.name || "-";
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className={clsx("h-8 w-8 animate-spin", isDark ? "text-cyan-400" : "text-cyan-500")} />
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto p-4 sm:p-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center">
                        <Package className="h-6 w-6 text-white" />
                    </div>
                    <div>
                        <h1 className={clsx("text-xl font-bold", isDark ? "text-white" : "text-gray-900")}>Ürünler</h1>
                        <p className={clsx("text-sm", isDark ? "text-white/50" : "text-gray-500")}>{products.length} ürün</p>
                    </div>
                </div>

                <button
                    onClick={() => {
                        setEditingProduct(null);
                        setShowModal(true);
                    }}
                    className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-medium transition-colors"
                >
                    <Plus className="h-4 w-4" />
                    Yeni Ürün
                </button>
            </div>

            {/* Search & Filter */}
            <div className="flex flex-col sm:flex-row gap-3 mb-6">
                <div className="relative flex-1">
                    <Search className={clsx("absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5", isDark ? "text-white/40" : "text-gray-400")} />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Ürün ara..."
                        className={clsx(
                            "w-full pl-10 pr-4 py-2.5 rounded-xl border outline-none",
                            isDark
                                ? "bg-white/5 border-white/10 text-white placeholder:text-white/40 focus:border-cyan-500/50"
                                : "bg-white border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20"
                        )}
                    />
                </div>
                <div className="relative">
                    <Filter className={clsx("absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5", isDark ? "text-white/40" : "text-gray-400")} />
                    <select
                        value={filterCategory}
                        onChange={(e) => setFilterCategory(e.target.value)}
                        className={clsx(
                            "pl-10 pr-8 py-2.5 rounded-xl border outline-none appearance-none min-w-[160px]",
                            isDark
                                ? "bg-white/5 border-white/10 text-white focus:border-cyan-500/50"
                                : "bg-white border-gray-200 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20"
                        )}
                    >
                        <option value="">Tüm Kategoriler</option>
                        {categories.map((cat) => (
                            <option key={cat.id} value={cat.id}>
                                {cat.name}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Products Grid */}
            {filteredProducts.length === 0 ? (
                <div className={clsx("text-center py-16 rounded-2xl", isDark ? "bg-white/5" : "bg-gray-50")}>
                    <Package className={clsx("h-12 w-12 mx-auto mb-4", isDark ? "text-white/20" : "text-gray-300")} />
                    <h3 className={clsx("text-lg font-medium mb-2", isDark ? "text-white" : "text-gray-900")}>
                        {searchQuery || filterCategory ? "Ürün bulunamadı" : "Henüz ürün yok"}
                    </h3>
                    <p className={clsx("mb-4", isDark ? "text-white/50" : "text-gray-500")}>
                        {searchQuery || filterCategory
                            ? "Arama kriterlerinizi değiştirmeyi deneyin"
                            : "Mağazanıza ürünler ekleyin"}
                    </p>
                    {!searchQuery && !filterCategory && (
                        <button
                            onClick={() => setShowModal(true)}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-lg font-medium hover:bg-emerald-600"
                        >
                            <Plus className="h-4 w-4" />
                            İlk Ürünü Ekle
                        </button>
                    )}
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredProducts.map((product, index) => (
                        <motion.div
                            key={product.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.03 }}
                            className={clsx(
                                "rounded-2xl border overflow-hidden hover:shadow-lg transition-shadow group",
                                isDark ? "bg-white/[0.03] border-white/10" : "bg-white border-gray-100"
                            )}
                        >
                            {/* Image */}
                            <div className={clsx("h-40 relative", isDark ? "bg-white/5" : "bg-gray-100")}>
                                {product.images && product.images.length > 0 ? (
                                    <img
                                        src={toR2ProxyUrl(product.images[0])}
                                        alt={product.name}
                                        className="h-full w-full object-cover"
                                    />
                                ) : (
                                    <div className="h-full w-full flex items-center justify-center">
                                        <ImageIcon className={clsx("h-10 w-10", isDark ? "text-white/20" : "text-gray-300")} />
                                    </div>
                                )}

                                {/* Status Badge */}
                                {product.status !== "active" && (
                                    <div className="absolute top-2 left-2">
                                        <span className="px-2 py-1 text-xs font-medium bg-gray-800/70 text-white rounded-lg">
                                            Pasif
                                        </span>
                                    </div>
                                )}

                                {/* Stock Warning */}
                                {product.stock !== undefined && product.stock <= 5 && (
                                    <div className="absolute top-2 right-2">
                                        <span className="px-2 py-1 text-xs font-medium bg-red-500 text-white rounded-lg flex items-center gap-1">
                                            <AlertCircle className="h-3 w-3" />
                                            {product.stock === 0 ? "Stok Yok" : `${product.stock} kaldı`}
                                        </span>
                                    </div>
                                )}

                                {/* Actions Overlay */}
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                                    <button
                                        onClick={() => {
                                            setEditingProduct(product);
                                            setShowModal(true);
                                        }}
                                        className="p-2 bg-white text-gray-700 rounded-lg hover:bg-gray-100"
                                    >
                                        <Edit2 className="h-5 w-5" />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(product.id)}
                                        disabled={isDeleting === product.id}
                                        className="p-2 bg-white text-red-500 rounded-lg hover:bg-red-50"
                                    >
                                        {isDeleting === product.id ? (
                                            <Loader2 className="h-5 w-5 animate-spin" />
                                        ) : (
                                            <Trash2 className="h-5 w-5" />
                                        )}
                                    </button>
                                </div>
                            </div>

                            {/* Content */}
                            <div className="p-4">
                                <p className={clsx("text-xs mb-1", isDark ? "text-white/40" : "text-gray-400")}>
                                    {getCategoryName(product.categoryId)}
                                </p>
                                <h3 className={clsx("font-medium truncate mb-2", isDark ? "text-white" : "text-gray-900")}>
                                    {product.name}
                                </h3>
                                <div className="flex items-center justify-between">
                                    <div>
                                        {product.compareAtPrice && product.compareAtPrice > product.price ? (
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold text-lg text-emerald-600">
                                                    {product.price.toLocaleString("tr-TR")}₺
                                                </span>
                                                <span className="text-sm text-gray-400 line-through">
                                                    {product.compareAtPrice.toLocaleString("tr-TR")}₺
                                                </span>
                                            </div>
                                        ) : (
                                            <span className="font-bold text-lg text-gray-900">
                                                {product.price.toLocaleString("tr-TR")}₺
                                            </span>
                                        )}
                                    </div>
                                    {product.stock !== undefined && (
                                        <span className="text-sm text-gray-500">
                                            Stok: {product.stock}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}

            {/* Product Modal */}
            <AnimatePresence>
                {showModal && (
                    <ProductModal
                        product={editingProduct}
                        categories={categories}
                        onSave={handleSave}
                        onClose={() => {
                            setShowModal(false);
                            setEditingProduct(null);
                        }}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}

// Product Modal Component
function ProductModal({
    product,
    categories,
    onSave,
    onClose,
}: {
    product: Product | null;
    categories: Category[];
    onSave: (data: Partial<Product>) => Promise<void>;
    onClose: () => void;
}) {
    const [name, setName] = useState(product?.name || "");
    const [description, setDescription] = useState(product?.description || "");
    const [price, setPrice] = useState(String(product?.price || ""));
    const [compareAtPrice, setCompareAtPrice] = useState(String(product?.compareAtPrice || ""));
    const [categoryId, setCategoryId] = useState(product?.categoryId || "");
    const [stock, setStock] = useState(String(product?.stock ?? ""));
    const [images, setImages] = useState<GalleryImage[]>(
        product?.images?.map((url, i) => ({
            id: `img-${i}`,
            url,
            order: i,
            isMain: i === 0
        })) || []
    );
    const [status, setStatus] = useState<"active" | "inactive" | "draft" | "archived">(product?.status || "active");
    const [isSaving, setIsSaving] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) {
            toast.error("Ürün adı zorunlu");
            return;
        }
        if (!price || parseFloat(price) <= 0) {
            toast.error("Geçerli bir fiyat girin");
            return;
        }

        setIsSaving(true);
        await onSave({
            name: name.trim(),
            description: description.trim() || undefined,
            price: parseFloat(price),
            compareAtPrice: compareAtPrice ? parseFloat(compareAtPrice) : undefined,
            categoryId: categoryId || undefined,
            stock: stock ? parseInt(stock) : 0,
            images: images.sort((a, b) => a.order - b.order).map(img => img.url),
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
                className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto"
            >
                <div
                    onClick={(e) => e.stopPropagation()}
                    className="bg-white rounded-2xl shadow-xl w-full max-w-lg my-8"
                >
                    <div className="flex items-center justify-between p-4 border-b border-gray-100">
                        <h3 className="font-semibold text-gray-900">
                            {product ? "Ürün Düzenle" : "Yeni Ürün"}
                        </h3>
                        <button
                            onClick={onClose}
                            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="p-4 space-y-4 max-h-[calc(100vh-200px)] overflow-y-auto">
                        {/* Name */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                Ürün Adı *
                            </label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Örn: iPhone 15 Pro"
                                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none text-gray-900 placeholder:text-gray-400"
                            />
                        </div>

                        {/* Category */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                Kategori
                            </label>
                            <select
                                value={categoryId}
                                onChange={(e) => setCategoryId(e.target.value)}
                                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none text-gray-900 placeholder:text-gray-400"
                            >
                                <option value="">Kategori Seç</option>
                                {categories.map((cat) => (
                                    <option key={cat.id} value={cat.id}>
                                        {cat.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Description */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                Açıklama
                            </label>
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Ürün açıklaması..."
                                rows={3}
                                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none resize-none"
                            />
                        </div>

                        {/* Prices */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                    Fiyat *
                                </label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        value={price}
                                        onChange={(e) => setPrice(e.target.value)}
                                        placeholder="0"
                                        min="0"
                                        step="0.01"
                                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none pr-8"
                                    />
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                                        ₺
                                    </span>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                    Karşılaştırma Fiyatı
                                </label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        value={compareAtPrice}
                                        onChange={(e) => setCompareAtPrice(e.target.value)}
                                        placeholder="İndirim için"
                                        min="0"
                                        step="0.01"
                                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none pr-8"
                                    />
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                                        ₺
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Stock */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                Stok Miktarı
                            </label>
                            <input
                                type="number"
                                value={stock}
                                onChange={(e) => setStock(e.target.value)}
                                placeholder="0"
                                min="0"
                                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none text-gray-900 placeholder:text-gray-400"
                            />
                        </div>

                        {/* Product Images */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                Ürün Görselleri
                            </label>
                            <ImageGalleryUploader
                                images={images}
                                onChange={setImages}
                                maxImages={5}
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
                                disabled={isSaving || !name.trim() || !price}
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

