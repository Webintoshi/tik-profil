"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
    Plus, Search, Filter, MoreVertical, Edit, Trash2,
    Star, Eye, EyeOff
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useBusinessSession } from "@/hooks/useBusinessSession";
import { useTheme } from "@/components/panel/ThemeProvider";
import clsx from "clsx";

interface Product {
    id: string;
    name: string;
    image_url: string;
    base_price: number;
    discount_price: number | null;
    is_available: boolean;
    is_featured: boolean;
    category_id: string;
    category?: { name: string };
}

export default function CoffeeProductsPage() {
    const router = useRouter();
    const { session, loading: sessionLoading } = useBusinessSession();
    const [products, setProducts] = useState<Product[]>([]);
    const [categories, setCategories] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [filterCategory, setFilterCategory] = useState("");

    const { isDark } = useTheme();
    const cardBg = isDark ? "bg-gray-800" : "bg-white";
    const textPrimary = isDark ? "text-white" : "text-gray-900";
    const textSecondary = isDark ? "text-gray-400" : "text-gray-500";

    useEffect(() => {
        if (!sessionLoading && !session) {
            router.push("/giris-yap");
            return;
        }
        if (session?.businessId) {
            fetchData();
        }
    }, [session, sessionLoading]);

    const fetchData = async () => {
        try {
            const [productsRes, categoriesRes] = await Promise.all([
                fetch(`/api/coffee/products?business_id=${session?.businessId}`),
                fetch(`/api/coffee/categories?business_id=${session?.businessId}`)
            ]);

            if (productsRes.ok) {
                const data = await productsRes.json();
                setProducts(data.data || []);
            }
            if (categoriesRes.ok) {
                const data = await categoriesRes.json();
                setCategories(data.data || []);
            }
        } catch (error) {
            console.error("Error fetching data:", error);
        } finally {
            setLoading(false);
        }
    };

    const toggleAvailability = async (id: string, current: boolean) => {
        try {
            await fetch(`/api/coffee/products`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id, is_available: !current })
            });
            fetchData();
        } catch (error) {
            console.error("Error toggling availability:", error);
        }
    };

    const deleteProduct = async (id: string) => {
        if (!confirm("Bu ürünü silmek istediğinize emin misiniz?")) return;
        try {
            await fetch(`/api/coffee/products?id=${id}`, { method: "DELETE" });
            fetchData();
        } catch (error) {
            console.error("Error deleting product:", error);
        }
    };

    const filteredProducts = products.filter(p => {
        const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase());
        const matchesCategory = !filterCategory || p.category_id === filterCategory;
        return matchesSearch && matchesCategory;
    });

    if (sessionLoading || loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="w-12 h-12 border-4 border-white/10 border-t-[#fe1e50] rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="p-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className={clsx("text-3xl font-bold", textPrimary)}>Ürünler</h1>
                    <p className={clsx("mt-1", textSecondary)}>{products.length} ürün listeleniyor</p>
                </div>
                <Link
                    href="/panel/coffee/products/new"
                    className="flex items-center gap-2 px-5 py-2.5 bg-[#fe1e50] hover:bg-[#fe1e50]/90 text-white rounded-xl transition-all font-bold shadow-lg shadow-[#fe1e50]/20"
                >
                    <Plus className="w-5 h-5" />
                    Yeni Ürün
                </Link>
            </div>

            {/* Filters */}
            <div className={clsx("mb-6 rounded-2xl shadow-sm", cardBg)}>
                <div className="p-4 flex flex-col md:flex-row gap-4">
                    <div className="relative flex-1">
                        <Search className={clsx("absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5", textSecondary)} />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Ürün ara..."
                            className={clsx(
                                "w-full pl-12 pr-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#fe1e50]/50",
                                isDark 
                                    ? "bg-white/[0.05] border-white/[0.1] text-white placeholder-white/30" 
                                    : "bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400"
                            )}
                        />
                    </div>
                    <select
                        value={filterCategory}
                        onChange={(e) => setFilterCategory(e.target.value)}
                        className={clsx(
                            "px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#fe1e50]/50",
                            isDark 
                                ? "bg-white/[0.05] border-white/[0.1] text-white" 
                                : "bg-gray-50 border-gray-200 text-gray-900"
                        )}
                    >
                        <option value="">Tüm Kategoriler</option>
                        {categories.map(cat => (
                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Products Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredProducts.map((product, index) => (
                    <motion.div
                        key={product.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                    >
                        <div className={clsx("rounded-2xl shadow-sm overflow-hidden", cardBg)}>
                            <div className="relative aspect-square">
                                {product.image_url ? (
                                    <Image
                                        src={product.image_url}
                                        alt={product.name}
                                        fill
                                        className="object-cover rounded-t-3xl"
                                    />
                                ) : (
                                    <div className={clsx("w-full h-full flex items-center justify-center rounded-t-3xl", isDark ? "bg-white/[0.05]" : "bg-gray-100")}>
                                        <span className={textSecondary}>Görsel yok</span>
                                    </div>
                                )}
                                {product.is_featured && (
                                    <div className="absolute top-3 left-3 px-3 py-1 bg-amber-500 text-white text-xs font-bold rounded-full flex items-center gap-1">
                                        <Star className="w-3 h-3" />
                                        Öne Çıkan
                                    </div>
                                )}
                                <div className="absolute top-3 right-3 flex gap-2">
                                    <button
                                        onClick={() => toggleAvailability(product.id, product.is_available)}
                                        className={clsx(
                                            "p-2 rounded-lg backdrop-blur-sm transition-colors",
                                            product.is_available 
                                                ? 'bg-emerald-500/80 text-white' 
                                                : 'bg-red-500/80 text-white'
                                        )}
                                    >
                                        {product.is_available ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>
                            <div className="p-4">
                                <div className="flex items-start justify-between mb-2">
                                    <div>
                                        <h3 className={clsx("font-bold text-lg", textPrimary)}>{product.name}</h3>
                                        <p className={clsx("text-sm", textSecondary)}>
                                            {categories.find(c => c.id === product.category_id)?.name || "Kategori yok"}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className={clsx("font-bold text-xl", textPrimary)}>₺{product.base_price}</p>
                                        {product.discount_price && (
                                            <p className="text-emerald-400 text-sm">₺{product.discount_price}</p>
                                        )}
                                    </div>
                                </div>
                                <div className={clsx("flex items-center gap-2 mt-4 pt-4 border-t", isDark ? "border-white/[0.08]" : "border-gray-100")}>
                                    <Link
                                        href={`/panel/coffee/products/${product.id}`}
                                        className={clsx(
                                            "flex-1 flex items-center justify-center gap-2 py-2 rounded-lg transition-colors",
                                            isDark ? "bg-white/[0.05] hover:bg-white/[0.1] text-white" : "bg-gray-100 hover:bg-gray-200 text-gray-900"
                                        )}
                                    >
                                        <Edit className="w-4 h-4" />
                                        Düzenle
                                    </Link>
                                    <button
                                        onClick={() => deleteProduct(product.id)}
                                        className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>

            {filteredProducts.length === 0 && (
                <div className="text-center py-16">
                    <div className={clsx("w-20 h-20 mx-auto mb-4 rounded-2xl flex items-center justify-center", isDark ? "bg-white/[0.05]" : "bg-gray-100")}>
                        <Search className={clsx("w-10 h-10", textSecondary)} />
                    </div>
                    <h3 className={clsx("text-lg font-semibold mb-2", textPrimary)}>Ürün Bulunamadı</h3>
                    <p className={clsx("mb-6", textSecondary)}>Arama kriterlerinize uygun ürün yok</p>
                    <Link
                        href="/panel/coffee/products/new"
                        className="inline-flex items-center gap-2 px-6 py-3 bg-[#fe1e50] hover:bg-[#fe1e50]/90 text-white rounded-xl transition-all font-bold"
                    >
                        <Plus className="w-5 h-5" />
                        İlk Ürünü Ekle
                    </Link>
                </div>
            )}
        </div>
    );
}
