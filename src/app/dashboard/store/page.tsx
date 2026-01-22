"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PageHeader, GlassCard, Button } from "@/components/ui";
import {
    Plus, Edit2, Trash2, X, Check, Loader2, Package,
    CreditCard, Box, ImagePlus
} from "lucide-react";
import {
    type StoreProduct,
    subscribeToProducts,
    createProduct,
    updateProduct,
    deleteProduct,
    CATEGORY_LABELS
} from "@/lib/storeProducts";
import clsx from "clsx";
import { toR2ProxyUrl } from "@/lib/publicImage";

export default function StorePage() {
    const [products, setProducts] = useState<StoreProduct[]>([]);
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingItem, setEditingItem] = useState<StoreProduct | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        const isSupabaseConfigured = Boolean(
            process.env.NEXT_PUBLIC_SUPABASE_URL &&
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
        );

        if (isSupabaseConfigured) {
            const unsubscribe = subscribeToProducts((data) => {
                setProducts(data);
            });
            return () => unsubscribe();
        }
    }, []);

    const handleDelete = async (id: string) => {
        if (!confirm("Bu ürünü silmek istediğinize emin misiniz?")) return;
        try {
            await deleteProduct(id);
            setProducts(prev => prev.filter(p => p.id !== id));
        } catch (error) {
            console.error("Delete error:", error);
        }
    };

    const formatPrice = (price: number) => {
        return new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(price);
    };

    const getStatusBadge = (status: StoreProduct["status"]) => {
        switch (status) {
            case "active":
                return <span className="px-2 py-1 rounded-full bg-accent-green/15 text-accent-green text-xs font-medium">Aktif</span>;
            case "out_of_stock":
                return <span className="px-2 py-1 rounded-full bg-accent-orange/15 text-accent-orange text-xs font-medium">Stok Yok</span>;
            default:
                return <span className="px-2 py-1 rounded-full bg-dark-700 text-dark-400 text-xs font-medium">Pasif</span>;
        }
    };

    const getCategoryIcon = (category: StoreProduct["category"]) => {
        switch (category) {
            case "nfc": return CreditCard;
            case "stand": return Box;
            default: return Package;
        }
    };

    return (
        <div className="space-y-6">
            <PageHeader
                title="Mağaza Yönetimi"
                description={`${products.length} ürün · Toplam stok: ${products.reduce((a, p) => a + p.stock, 0)}`}
                action={
                    <Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => setShowAddModal(true)}>
                        Yeni Ürün Ekle
                    </Button>
                }
            />

            {/* Products Table */}
            <GlassCard padding="none">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-dark-700/50">
                                <th className="text-left text-xs font-medium text-dark-500 px-6 py-4">Ürün</th>
                                <th className="text-left text-xs font-medium text-dark-500 px-6 py-4 hidden md:table-cell">Kategori</th>
                                <th className="text-left text-xs font-medium text-dark-500 px-6 py-4">Fiyat</th>
                                <th className="text-left text-xs font-medium text-dark-500 px-6 py-4 hidden lg:table-cell">Stok</th>
                                <th className="text-left text-xs font-medium text-dark-500 px-6 py-4">Durum</th>
                                <th className="text-right text-xs font-medium text-dark-500 px-6 py-4">İşlemler</th>
                            </tr>
                        </thead>
                        <tbody>
                            <AnimatePresence mode="popLayout">
                                {products.map((product) => {
                                    const CategoryIcon = getCategoryIcon(product.category);
                                    return (
                                        <motion.tr
                                            key={product.id}
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0, height: 0 }}
                                            className="border-b border-dark-700/30 hover:bg-dark-800/30"
                                        >
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="h-12 w-12 rounded-xl bg-dark-800 flex items-center justify-center">
                                                        <CategoryIcon className="h-6 w-6 text-dark-400" />
                                                    </div>
                                                    <div>
                                                        <p className="font-medium text-dark-100">{product.name}</p>
                                                        <p className="text-xs text-dark-500 truncate max-w-[200px]">{product.description}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 hidden md:table-cell">
                                                <span className="text-sm text-dark-400">{CATEGORY_LABELS[product.category]}</span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="font-semibold text-dark-100">{formatPrice(product.price)}</span>
                                            </td>
                                            <td className="px-6 py-4 hidden lg:table-cell">
                                                <span className={clsx(
                                                    "font-medium",
                                                    product.stock === 0 ? "text-red-500" : product.stock < 10 ? "text-accent-orange" : "text-dark-200"
                                                )}>
                                                    {product.stock}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                {getStatusBadge(product.status)}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        onClick={() => setEditingItem(product)}
                                                        className="p-2 rounded-lg hover:bg-dark-700 text-dark-400 hover:text-dark-200 transition-colors"
                                                    >
                                                        <Edit2 className="h-4 w-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(product.id)}
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

                {products.length === 0 && (
                    <div className="text-center py-12 text-dark-500">
                        Henüz ürün eklenmemiş
                    </div>
                )}
            </GlassCard>

            {/* Add/Edit Modal */}
            <AnimatePresence>
                {(showAddModal || editingItem) && (
                    <ProductModal
                        item={editingItem}
                        onClose={() => {
                            setShowAddModal(false);
                            setEditingItem(null);
                        }}
                        onSave={async (data) => {
                            setIsLoading(true);
                            try {
                                if (editingItem) {
                                    await updateProduct(editingItem.id, data);
                                    setProducts(prev => prev.map(p =>
                                        p.id === editingItem.id ? { ...p, ...data } : p
                                    ));
                                } else {
                                    const id = await createProduct(data);
                                    setProducts(prev => [...prev, { ...data, id, createdAt: new Date() }]);
                                }
                                setShowAddModal(false);
                                setEditingItem(null);
                            } catch (error) {
                                console.error("Save error:", error);
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

// Product Modal
function ProductModal({
    item,
    onClose,
    onSave,
    isLoading
}: {
    item: StoreProduct | null;
    onClose: () => void;
    onSave: (data: Omit<StoreProduct, "id" | "createdAt">) => void;
    isLoading: boolean;
}) {
    const [name, setName] = useState(item?.name || "");
    const [slug, setSlug] = useState(item?.slug || "");
    const [description, setDescription] = useState(item?.description || "");
    const [price, setPrice] = useState(item?.price || 0);
    const [stock, setStock] = useState(item?.stock || 0);
    const [category, setCategory] = useState<StoreProduct["category"]>(item?.category || "nfc");
    const [imageUrl, setImageUrl] = useState(item?.imageUrl || "");
    const [status, setStatus] = useState<StoreProduct["status"]>(item?.status || "active");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        await onSave({
            name,
            slug: slug || name.toLowerCase().replace(/\s+/g, "-"),
            description,
            price,
            stock,
            category,
            imageUrl,
            status: stock === 0 ? "out_of_stock" : status,
        });
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
                            {item ? "Ürünü Düzenle" : "Yeni Ürün Ekle"}
                        </h2>
                        <button onClick={onClose} className="p-2 rounded-lg hover:bg-dark-700">
                            <X className="h-5 w-5 text-dark-400" />
                        </button>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="p-6 space-y-5">
                        <div>
                            <label className="block text-sm font-medium text-dark-300 mb-2">Ürün Adı</label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Örn: NFC Dijital Kartvizit (Siyah)"
                                required
                                className="w-full px-4 py-3 rounded-xl bg-dark-800 border border-dark-700 text-dark-100 placeholder-dark-500 focus:outline-none focus:border-accent-blue"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-dark-300 mb-2">Açıklama</label>
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                rows={2}
                                placeholder="Ürün açıklaması"
                                className="w-full px-4 py-3 rounded-xl bg-dark-800 border border-dark-700 text-dark-100 placeholder-dark-500 focus:outline-none focus:border-accent-blue resize-none"
                            />
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-dark-300 mb-2">Fiyat (₺)</label>
                                <input
                                    type="number"
                                    value={price}
                                    onChange={(e) => setPrice(Number(e.target.value))}
                                    min="0"
                                    className="w-full px-4 py-3 rounded-xl bg-dark-800 border border-dark-700 text-dark-100 focus:outline-none focus:border-accent-blue"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-dark-300 mb-2">Stok</label>
                                <input
                                    type="number"
                                    value={stock}
                                    onChange={(e) => setStock(Number(e.target.value))}
                                    min="0"
                                    className="w-full px-4 py-3 rounded-xl bg-dark-800 border border-dark-700 text-dark-100 focus:outline-none focus:border-accent-blue"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-dark-300 mb-2">Kategori</label>
                                <select
                                    value={category}
                                    onChange={(e) => setCategory(e.target.value as StoreProduct["category"])}
                                    className="w-full px-4 py-3 rounded-xl bg-dark-800 border border-dark-700 text-dark-100 focus:outline-none focus:border-accent-blue"
                                >
                                    <option value="nfc">NFC Kart</option>
                                    <option value="stand">Stand</option>
                                    <option value="accessory">Aksesuar</option>
                                </select>
                            </div>
                        </div>

                        {/* Image Upload */}
                        <div>
                            <label className="block text-sm font-medium text-dark-300 mb-2">Ürün Görseli</label>
                            <div className="flex gap-4">
                                {imageUrl ? (
                                    <div className="relative h-24 w-24 rounded-xl overflow-hidden bg-dark-800 flex-shrink-0">
                                        <img
                                            src={toR2ProxyUrl(imageUrl)}
                                            alt="Preview"
                                            className="w-full h-full object-cover"
                                            onError={(e) => {
                                                e.currentTarget.style.display = 'none';
                                            }}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setImageUrl("")}
                                            className="absolute top-1 right-1 p-1 rounded-full bg-dark-900/80 text-dark-400 hover:text-red-500"
                                        >
                                            <X className="h-3 w-3" />
                                        </button>
                                    </div>
                                ) : (
                                    <div className="h-24 w-24 rounded-xl bg-dark-800 border-2 border-dashed border-dark-600 flex items-center justify-center flex-shrink-0">
                                        <ImagePlus className="h-8 w-8 text-dark-500" />
                                    </div>
                                )}
                                <div className="flex-1">
                                    <input
                                        type="url"
                                        value={imageUrl}
                                        onChange={(e) => setImageUrl(e.target.value)}
                                        placeholder="https://example.com/image.jpg"
                                        className="w-full px-4 py-3 rounded-xl bg-dark-800 border border-dark-700 text-dark-100 placeholder-dark-500 focus:outline-none focus:border-accent-blue text-sm"
                                    />
                                    <p className="text-xs text-dark-500 mt-2">
                                        Görsel URL&apos;si girin veya dosya yükleyin
                                    </p>
                                </div>
                            </div>
                        </div>

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
                                disabled={isLoading || !name}
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
