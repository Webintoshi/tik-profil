"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Plus, Edit, Trash2, GripVertical, Search } from "lucide-react";
import { LiquidMetalCard } from "@/components/cities/LiquidMetalCard";
import { useBusinessSession } from "@/hooks/useBusinessSession";

interface Size {
    id: string;
    name: string;
    volume_ml: number;
    price_modifier: number;
    sort_order: number;
    is_active: boolean;
}

export default function CoffeeSizesPage() {
    const router = useRouter();
    const { session, loading: sessionLoading } = useBusinessSession();
    const [sizes, setSizes] = useState<Size[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState<Size | null>(null);
    const [formData, setFormData] = useState({
        name: "",
        volume_ml: 240,
        price_modifier: 0,
        sort_order: 0
    });

    useEffect(() => {
        if (!sessionLoading && !session) {
            router.push("/giris-yap");
            return;
        }
        if (session?.businessId) {
            fetchSizes();
        }
    }, [session, sessionLoading]);

    const fetchSizes = async () => {
        try {
            const res = await fetch(`/api/coffee/sizes?business_id=${session?.businessId}`);
            if (res.ok) {
                const data = await res.json();
                setSizes(data.data || []);
            }
        } catch (error) {
            console.error("Error fetching sizes:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const url = editing ? "/api/coffee/sizes" : "/api/coffee/sizes";
        const method = editing ? "PUT" : "POST";

        const res = await fetch(url, {
            method,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                ...(editing ? { id: editing.id } : {}),
                business_id: session?.businessId,
                ...formData
            })
        });

        if (res.ok) {
            setShowModal(false);
            setEditing(null);
            setFormData({ name: "", volume_ml: 240, price_modifier: 0, sort_order: 0 });
            fetchSizes();
        }
    };

    const handleEdit = (size: Size) => {
        setEditing(size);
        setFormData({
            name: size.name,
            volume_ml: size.volume_ml,
            price_modifier: Number(size.price_modifier),
            sort_order: size.sort_order
        });
        setShowModal(true);
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Bu boyutu silmek istediğinize emin misiniz?")) return;
        try {
            await fetch(`/api/coffee/sizes?id=${id}`, { method: "DELETE" });
            fetchSizes();
        } catch (error) {
            console.error("Error deleting size:", error);
        }
    };

    const toggleActive = async (size: Size) => {
        try {
            await fetch("/api/coffee/sizes", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ...size, is_active: !size.is_active })
            });
            fetchSizes();
        } catch (error) {
            console.error("Error toggling size:", error);
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
                    <h1 className="text-3xl font-bold text-white">Boyutlar</h1>
                    <p className="text-white/50 mt-1">{sizes.length} boyut</p>
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    className="flex items-center gap-2 px-5 py-2.5 bg-[#fe1e50] hover:bg-[#fe1e50]/90 text-white rounded-xl transition-all font-bold"
                >
                    <Plus className="w-5 h-5" />
                    Yeni Boyut
                </button>
            </div>

            <LiquidMetalCard>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="border-b border-white/[0.08]">
                            <tr>
                                <th className="px-6 py-4 text-left text-sm font-medium text-white/50">Sıra</th>
                                <th className="px-6 py-4 text-left text-sm font-medium text-white/50">Boyut Adı</th>
                                <th className="px-6 py-4 text-left text-sm font-medium text-white/50">Hacim</th>
                                <th className="px-6 py-4 text-left text-sm font-medium text-white/50">Fiyat Farkı</th>
                                <th className="px-6 py-4 text-left text-sm font-medium text-white/50">Durum</th>
                                <th className="px-6 py-4 text-right text-sm font-medium text-white/50">İşlemler</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/[0.05]">
                            {sizes.map((size) => (
                                <tr key={size.id} className="hover:bg-white/[0.02]">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <GripVertical className="w-4 h-4 text-white/30" />
                                            <span className="text-white">{size.sort_order}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-white font-medium">{size.name}</td>
                                    <td className="px-6 py-4 text-white/60">{size.volume_ml} ml</td>
                                    <td className="px-6 py-4">
                                        <span className={`font-medium ${size.price_modifier > 0 ? 'text-emerald-400' : size.price_modifier < 0 ? 'text-red-400' : 'text-white/60'}`}>
                                            {size.price_modifier > 0 ? '+' : ''}₺{size.price_modifier}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <button
                                            onClick={() => toggleActive(size)}
                                            className={`px-3 py-1 text-xs rounded-full transition ${
                                                size.is_active 
                                                    ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30' 
                                                    : 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                                            }`}
                                        >
                                            {size.is_active ? 'Aktif' : 'Pasif'}
                                        </button>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button
                                            onClick={() => handleEdit(size)}
                                            className="p-2 text-blue-400 hover:bg-blue-500/10 rounded-lg mr-2"
                                        >
                                            <Edit className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(size.id)}
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

            {showModal && (
                <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-[#1a1a2e] rounded-2xl p-6 w-full max-w-md border border-white/[0.1]"
                    >
                        <h2 className="text-xl font-bold text-white mb-4">
                            {editing ? "Boyut Düzenle" : "Yeni Boyut"}
                        </h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm text-white/60 mb-2">Boyut Adı</label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full px-4 py-3 bg-white/[0.05] border border-white/[0.1] rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-[#fe1e50]/50"
                                    placeholder="Short, Tall, Grande, Venti"
                                    required
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm text-white/60 mb-2">Hacim (ml)</label>
                                    <input
                                        type="number"
                                        value={formData.volume_ml}
                                        onChange={(e) => setFormData({ ...formData, volume_ml: parseInt(e.target.value) })}
                                        className="w-full px-4 py-3 bg-white/[0.05] border border-white/[0.1] rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-[#fe1e50]/50"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm text-white/60 mb-2">Fiyat Farkı (₺)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={formData.price_modifier}
                                        onChange={(e) => setFormData({ ...formData, price_modifier: parseFloat(e.target.value) })}
                                        className="w-full px-4 py-3 bg-white/[0.05] border border-white/[0.1] rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-[#fe1e50]/50"
                                    />
                                </div>
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
                                    {editing ? 'Güncelle' : 'Oluştur'}
                                </button>
                            </div>
                        </form>
                    </motion.div>
                </div>
            )}
        </div>
    );
}
