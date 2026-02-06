"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Plus, Edit, Trash2, Search } from "lucide-react";
import { LiquidMetalCard } from "@/components/cities/LiquidMetalCard";
import { useBusinessSession } from "@/hooks/useBusinessSession";

interface Category {
    id: string;
    name: string;
    slug: string;
    icon: string;
    sort_order: number;
    is_active: boolean;
}

export default function CoffeeCategoriesPage() {
    const router = useRouter();
    const { session, loading: sessionLoading } = useBusinessSession();
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState<Category | null>(null);
    const [formData, setFormData] = useState({
        name: "",
        icon: "coffee",
        sort_order: 0
    });

    useEffect(() => {
        if (!sessionLoading && !session) {
            router.push("/giris-yap");
            return;
        }
        if (session?.businessId) {
            fetchCategories();
        }
    }, [session, sessionLoading]);

    const fetchCategories = async () => {
        try {
            const res = await fetch(`/api/coffee/categories?business_id=${session?.businessId}`);
            if (res.ok) {
                const data = await res.json();
                setCategories(data.data || []);
            }
        } catch (error) {
            console.error("Error fetching categories:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const url = editing ? `/api/coffee/categories` : "/api/coffee/categories";
        const method = editing ? "PUT" : "POST";

        const res = await fetch(url, {
            method,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                ...(editing ? { id: editing.id } : {}),
                business_id: session?.businessId,
                ...formData,
                slug: formData.name.toLowerCase().replace(/\s+/g, "-")
            })
        });

        if (res.ok) {
            setShowModal(false);
            setEditing(null);
            setFormData({ name: "", icon: "coffee", sort_order: 0 });
            fetchCategories();
        }
    };

    const handleEdit = (cat: Category) => {
        setEditing(cat);
        setFormData({ name: cat.name, icon: cat.icon || "coffee", sort_order: cat.sort_order });
        setShowModal(true);
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Bu kategoriyi silmek istediğinize emin misiniz?")) return;
        try {
            await fetch(`/api/coffee/categories?id=${id}`, { method: "DELETE" });
            fetchCategories();
        } catch (error) {
            console.error("Error deleting category:", error);
        }
    };

    if (sessionLoading || loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="w-12 h-12 border-4 border-white/10 border-t-[#fe1e50] rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-white">Kategoriler</h1>
                    <p className="text-white/50 mt-1">{categories.length} kategori</p>
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    className="flex items-center gap-2 px-5 py-2.5 bg-[#fe1e50] hover:bg-[#fe1e50]/90 text-white rounded-xl transition-all font-bold"
                >
                    <Plus className="w-5 h-5" />
                    Yeni Kategori
                </button>
            </div>

            <LiquidMetalCard>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="border-b border-white/[0.08]">
                            <tr>
                                <th className="px-6 py-4 text-left text-sm font-medium text-white/50">Sıra</th>
                                <th className="px-6 py-4 text-left text-sm font-medium text-white/50">İkon</th>
                                <th className="px-6 py-4 text-left text-sm font-medium text-white/50">Ad</th>
                                <th className="px-6 py-4 text-left text-sm font-medium text-white/50">Slug</th>
                                <th className="px-6 py-4 text-left text-sm font-medium text-white/50">Durum</th>
                                <th className="px-6 py-4 text-right text-sm font-medium text-white/50">İşlemler</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/[0.05]">
                            {categories.map((cat) => (
                                <tr key={cat.id} className="hover:bg-white/[0.02]">
                                    <td className="px-6 py-4 text-white">{cat.sort_order}</td>
                                    <td className="px-6 py-4 text-white/60">{cat.icon}</td>
                                    <td className="px-6 py-4 text-white font-medium">{cat.name}</td>
                                    <td className="px-6 py-4 text-white/60">{cat.slug}</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 text-xs rounded-full ${
                                            cat.is_active ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"
                                        }`}>
                                            {cat.is_active ? "Aktif" : "Pasif"}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button
                                            onClick={() => handleEdit(cat)}
                                            className="p-2 text-blue-400 hover:bg-blue-500/10 rounded-lg mr-2"
                                        >
                                            <Edit className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(cat.id)}
                                            className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </LiquidMetalCard>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-[#1a1a2e] rounded-2xl p-6 w-full max-w-md border border-white/[0.1]"
                    >
                        <h2 className="text-xl font-bold text-white mb-4">
                            {editing ? "Kategori Düzenle" : "Yeni Kategori"}
                        </h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm text-white/60 mb-2">Kategori Adı</label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full px-4 py-3 bg-white/[0.05] border border-white/[0.1] rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-[#fe1e50]/50"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-white/60 mb-2">İkon (Lucide)</label>
                                <input
                                    type="text"
                                    value={formData.icon}
                                    onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                                    className="w-full px-4 py-3 bg-white/[0.05] border border-white/[0.1] rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-[#fe1e50]/50"
                                    placeholder="coffee, glass-water, cake"
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-white/60 mb-2">Sıra No</label>
                                <input
                                    type="number"
                                    value={formData.sort_order}
                                    onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) })}
                                    className="w-full px-4 py-3 bg-white/[0.05] border border-white/[0.1] rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-[#fe1e50]/50"
                                />
                            </div>
                            <div className="flex gap-2 justify-end pt-4">
                                <button
                                    type="button"
                                    onClick={() => { setShowModal(false); setEditing(null); }}
                                    className="px-4 py-2 bg-white/[0.05] text-white rounded-xl hover:bg-white/[0.1]"
                                >
                                    İptal
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-[#fe1e50] text-white rounded-xl hover:bg-[#fe1e50]/90"
                                >
                                    Kaydet
                                </button>
                            </div>
                        </form>
                    </motion.div>
                </div>
            )}
        </div>
    );
}
