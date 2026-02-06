"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Plus, Trash2, ChevronDown, ChevronUp, GripVertical } from "lucide-react";
import { LiquidMetalCard } from "@/components/cities/LiquidMetalCard";
import { useBusinessSession } from "@/hooks/useBusinessSession";

interface Extra {
    id: string;
    name: string;
    price_modifier: number;
    sort_order: number;
}

interface ExtraGroup {
    id: string;
    name: string;
    slug: string;
    selection_type: "single" | "multiple";
    min_selection: number;
    max_selection: number;
    is_required: boolean;
    sort_order: number;
    is_active: boolean;
    extras?: Extra[];
}

export default function CoffeeExtrasPage() {
    const router = useRouter();
    const { session, loading: sessionLoading } = useBusinessSession();
    const [groups, setGroups] = useState<ExtraGroup[]>([]);
    const [loading, setLoading] = useState(true);
    const [showGroupModal, setShowGroupModal] = useState(false);
    const [showExtraModal, setShowExtraModal] = useState(false);
    const [selectedGroup, setSelectedGroup] = useState<ExtraGroup | null>(null);
    const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
    
    const [groupForm, setGroupForm] = useState({
        name: "",
        selection_type: "single" as const,
        min_selection: 0,
        max_selection: 1,
        is_required: false,
        sort_order: 0
    });
    
    const [extraForm, setExtraForm] = useState({
        name: "",
        price_modifier: 0,
        sort_order: 0
    });

    useEffect(() => {
        if (!sessionLoading && !session) {
            router.push("/giris-yap");
            return;
        }
        if (session?.businessId) {
            fetchGroups();
        }
    }, [session, sessionLoading]);

    const fetchGroups = async () => {
        try {
            const res = await fetch(`/api/coffee/extra-groups?business_id=${session?.businessId}`);
            if (res.ok) {
                const data = await res.json();
                setGroups(data.data || []);
                setExpandedGroups(new Set(data.data?.map((g: ExtraGroup) => g.id) || []));
            }
        } catch (error) {
            console.error("Error fetching groups:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateGroup = async (e: React.FormEvent) => {
        e.preventDefault();
        const res = await fetch("/api/coffee/extra-groups", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...groupForm, business_id: session?.businessId })
        });
        if (res.ok) {
            setShowGroupModal(false);
            setGroupForm({ name: "", selection_type: "single", min_selection: 0, max_selection: 1, is_required: false, sort_order: 0 });
            fetchGroups();
        }
    };

    const handleCreateExtra = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedGroup) return;
        
        const res = await fetch("/api/coffee/extras", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
                ...extraForm, 
                business_id: session?.businessId,
                extra_group_id: selectedGroup.id 
            })
        });
        if (res.ok) {
            setShowExtraModal(false);
            setExtraForm({ name: "", price_modifier: 0, sort_order: 0 });
            fetchGroups();
        }
    };

    const handleDeleteExtra = async (extraId: string) => {
        if (!confirm("Bu seçeneği silmek istediğinize emin misiniz?")) return;
        await fetch(`/api/coffee/extras?id=${extraId}`, { method: "DELETE" });
        fetchGroups();
    };

    const handleDeleteGroup = async (groupId: string) => {
        if (!confirm("Bu grubu silmek istediğinize emin misiniz?")) return;
        await fetch(`/api/coffee/extra-groups?id=${groupId}`, { method: "DELETE" });
        fetchGroups();
    };

    const toggleExpanded = (groupId: string) => {
        setExpandedGroups(prev => {
            const next = new Set(prev);
            if (next.has(groupId)) next.delete(groupId);
            else next.add(groupId);
            return next;
        });
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
                    <h1 className="text-3xl font-bold text-white">Ekstralar</h1>
                    <p className="text-white/50 mt-1">Süt, şurup ve ekstra seçenekleri</p>
                </div>
                <button
                    onClick={() => setShowGroupModal(true)}
                    className="flex items-center gap-2 px-5 py-2.5 bg-[#fe1e50] hover:bg-[#fe1e50]/90 text-white rounded-xl transition-all font-bold"
                >
                    <Plus className="w-5 h-5" />
                    Yeni Grup
                </button>
            </div>

            <div className="space-y-4">
                {groups.map((group) => (
                    <LiquidMetalCard key={group.id} className={!group.is_active ? 'opacity-60' : ''}>
                        <div 
                            className="p-4 flex items-center justify-between cursor-pointer"
                            onClick={() => toggleExpanded(group.id)}
                        >
                            <div className="flex items-center gap-3">
                                <GripVertical className="w-5 h-5 text-white/30" />
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h3 className="font-bold text-white">{group.name}</h3>
                                        {group.is_required && (
                                            <span className="px-2 py-0.5 text-xs bg-red-500/20 text-red-400 rounded-full">Zorunlu</span>
                                        )}
                                        <span className={`px-2 py-0.5 text-xs rounded-full ${group.is_active ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/10 text-white/50'}`}>
                                            {group.is_active ? 'Aktif' : 'Pasif'}
                                        </span>
                                    </div>
                                    <p className="text-sm text-white/40">
                                        {group.selection_type === 'single' ? 'Tekli seçim' : 'Çoklu seçim'}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={(e) => { e.stopPropagation(); setSelectedGroup(group); setShowExtraModal(true); }}
                                    className="p-2 text-blue-400 hover:bg-blue-500/10 rounded-lg"
                                >
                                    <Plus className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={(e) => { e.stopPropagation(); handleDeleteGroup(group.id); }}
                                    className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                                {expandedGroups.has(group.id) ? (
                                    <ChevronUp className="w-5 h-5 text-white/40" />
                                ) : (
                                    <ChevronDown className="w-5 h-5 text-white/40" />
                                )}
                            </div>
                        </div>

                        {expandedGroups.has(group.id) && (
                            <div className="border-t border-white/[0.08] divide-y divide-white/[0.05]">
                                {group.extras?.map((extra) => (
                                    <div key={extra.id} className="px-4 py-3 flex justify-between items-center">
                                        <div className="flex items-center gap-3">
                                            <GripVertical className="w-4 h-4 text-white/20" />
                                            <span className="text-white">{extra.name}</span>
                                            <span className={`text-sm ${extra.price_modifier > 0 ? 'text-emerald-400' : 'text-white/40'}`}>
                                                {extra.price_modifier !== 0 ? `${extra.price_modifier > 0 ? '+' : ''}₺${extra.price_modifier}` : 'Ücretsiz'}
                                            </span>
                                        </div>
                                        <button
                                            onClick={() => handleDeleteExtra(extra.id)}
                                            className="p-1.5 text-white/30 hover:text-red-400 hover:bg-red-500/10 rounded transition"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </LiquidMetalCard>
                ))}
            </div>

            {/* Group Modal */}
            {showGroupModal && (
                <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-[#1a1a2e] rounded-2xl p-6 w-full max-w-md border border-white/[0.1]"
                    >
                        <h2 className="text-xl font-bold text-white mb-4">Yeni Ekstra Grubu</h2>
                        <form onSubmit={handleCreateGroup} className="space-y-4">
                            <div>
                                <label className="block text-sm text-white/60 mb-2">Grup Adı</label>
                                <input
                                    type="text"
                                    value={groupForm.name}
                                    onChange={(e) => setGroupForm({ ...groupForm, name: e.target.value })}
                                    className="w-full px-4 py-3 bg-white/[0.05] border border-white/[0.1] rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-[#fe1e50]/50"
                                    placeholder="Süt Seçimi, Şurup, Ekstralar"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-white/60 mb-2">Seçim Tipi</label>
                                <select
                                    value={groupForm.selection_type}
                                    onChange={(e) => setGroupForm({ ...groupForm, selection_type: e.target.value as 'single' | 'multiple' })}
                                    className="w-full px-4 py-3 bg-white/[0.05] border border-white/[0.1] rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-[#fe1e50]/50"
                                >
                                    <option value="single">Tekli Seçim</option>
                                    <option value="multiple">Çoklu Seçim</option>
                                </select>
                            </div>
                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="required"
                                    checked={groupForm.is_required}
                                    onChange={(e) => setGroupForm({ ...groupForm, is_required: e.target.checked })}
                                    className="rounded bg-white/[0.05] border-white/[0.1]"
                                />
                                <label htmlFor="required" className="text-white/60">Zorunlu seçim</label>
                            </div>
                            <div className="flex gap-2 justify-end pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowGroupModal(false)}
                                    className="px-4 py-2 bg-white/[0.05] text-white rounded-xl hover:bg-white/[0.1]"
                                >
                                    İptal
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-[#fe1e50] text-white rounded-xl hover:bg-[#fe1e50]/90"
                                >
                                    Oluştur
                                </button>
                            </div>
                        </form>
                    </motion.div>
                </div>
            )}

            {/* Extra Modal */}
            {showExtraModal && selectedGroup && (
                <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-[#1a1a2e] rounded-2xl p-6 w-full max-w-md border border-white/[0.1]"
                    >
                        <h2 className="text-xl font-bold text-white mb-1">Yeni Seçenek</h2>
                        <p className="text-white/40 text-sm mb-4">{selectedGroup.name}</p>
                        <form onSubmit={handleCreateExtra} className="space-y-4">
                            <div>
                                <label className="block text-sm text-white/60 mb-2">Seçenek Adı</label>
                                <input
                                    type="text"
                                    value={extraForm.name}
                                    onChange={(e) => setExtraForm({ ...extraForm, name: e.target.value })}
                                    className="w-full px-4 py-3 bg-white/[0.05] border border-white/[0.1] rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-[#fe1e50]/50"
                                    placeholder="Yulaf Sütü, Vanilya Şurupu"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-white/60 mb-2">Fiyat Farkı (₺)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={extraForm.price_modifier}
                                    onChange={(e) => setExtraForm({ ...extraForm, price_modifier: parseFloat(e.target.value) })}
                                    className="w-full px-4 py-3 bg-white/[0.05] border border-white/[0.1] rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-[#fe1e50]/50"
                                    placeholder="0"
                                />
                            </div>
                            <div className="flex gap-2 justify-end pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowExtraModal(false)}
                                    className="px-4 py-2 bg-white/[0.05] text-white rounded-xl hover:bg-white/[0.1]"
                                >
                                    İptal
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-[#fe1e50] text-white rounded-xl hover:bg-[#fe1e50]/90"
                                >
                                    Ekle
                                </button>
                            </div>
                        </form>
                    </motion.div>
                </div>
            )}
        </div>
    );
}
