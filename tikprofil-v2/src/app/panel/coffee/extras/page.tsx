"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Plus, Trash2, ChevronDown, ChevronUp, GripVertical } from "lucide-react";
import { clsx } from "clsx";
import { useTheme } from "@/components/panel/ThemeProvider";
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
    const { isDark } = useTheme();
    const cardBg = isDark ? "bg-gray-800" : "bg-white";
    const textPrimary = isDark ? "text-white" : "text-gray-900";
    const textSecondary = isDark ? "text-gray-400" : "text-gray-500";
    const textMuted = isDark ? "text-gray-500" : "text-gray-400";
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
                <div className={clsx("w-12 h-12 border-4 rounded-full animate-spin", isDark ? "border-white/10" : "border-gray-200", "border-t-[#fe1e50]")} />
            </div>
        );
    }

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className={clsx("text-3xl font-bold", textPrimary)}>Ekstralar</h1>
                    <p className={clsx("mt-1", textSecondary)}>Süt, şurup ve ekstra seçenekleri</p>
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
                    <div key={group.id} className={clsx(cardBg, "rounded-2xl shadow-sm border", isDark ? "border-white/[0.08]" : "border-gray-200", !group.is_active ? 'opacity-60' : '')}>
                        <div 
                            className="p-4 flex items-center justify-between cursor-pointer"
                            onClick={() => toggleExpanded(group.id)}
                        >
                            <div className="flex items-center gap-3">
                                <GripVertical className={clsx("w-5 h-5", textMuted)} />
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h3 className={clsx("font-bold", textPrimary)}>{group.name}</h3>
                                        {group.is_required && (
                                            <span className="px-2 py-0.5 text-xs bg-red-500/20 text-red-500 rounded-full">Zorunlu</span>
                                        )}
                                        <span className={clsx("px-2 py-0.5 text-xs rounded-full", group.is_active ? "bg-emerald-500/20 text-emerald-600" : isDark ? "bg-white/10 text-white/50" : "bg-gray-100 text-gray-500")}>
                                            {group.is_active ? 'Aktif' : 'Pasif'}
                                        </span>
                                    </div>
                                    <p className={clsx("text-sm", textMuted)}>
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
                                    <ChevronUp className={clsx("w-5 h-5", textMuted)} />
                                ) : (
                                    <ChevronDown className={clsx("w-5 h-5", textMuted)} />
                                )}
                            </div>
                        </div>

                        {expandedGroups.has(group.id) && (
                            <div className={clsx("border-t divide-y", isDark ? "border-white/[0.08] divide-white/[0.05]" : "border-gray-100 divide-gray-100")}>
                                {group.extras?.map((extra) => (
                                    <div key={extra.id} className="px-4 py-3 flex justify-between items-center">
                                        <div className="flex items-center gap-3">
                                            <GripVertical className={clsx("w-4 h-4", isDark ? "text-white/20" : "text-gray-300")} />
                                            <span className={textPrimary}>{extra.name}</span>
                                            <span className={clsx("text-sm", extra.price_modifier > 0 ? "text-emerald-600" : textMuted)}>
                                                {extra.price_modifier !== 0 ? `${extra.price_modifier > 0 ? '+' : ''}₺${extra.price_modifier}` : 'Ücretsiz'}
                                            </span>
                                        </div>
                                        <button
                                            onClick={() => handleDeleteExtra(extra.id)}
                                            className={clsx("p-1.5 rounded transition", isDark ? "text-white/30 hover:text-red-400 hover:bg-red-500/10" : "text-gray-400 hover:text-red-500 hover:bg-red-50")}
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Group Modal */}
            {showGroupModal && (
                <div className={clsx("fixed inset-0 z-50 flex items-center justify-center p-4", isDark ? "bg-black/50" : "bg-black/30", "backdrop-blur-sm")}>
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className={clsx("rounded-2xl p-6 w-full max-w-md border", isDark ? "bg-[#1a1a2e] border-white/[0.1]" : "bg-white border-gray-200")}
                    >
                        <h2 className={clsx("text-xl font-bold mb-4", textPrimary)}>Yeni Ekstra Grubu</h2>
                        <form onSubmit={handleCreateGroup} className="space-y-4">
                            <div>
                                <label className={clsx("block text-sm mb-2", textSecondary)}>Grup Adı</label>
                                <input
                                    type="text"
                                    value={groupForm.name}
                                    onChange={(e) => setGroupForm({ ...groupForm, name: e.target.value })}
                                    className={clsx("w-full px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#fe1e50]/50", isDark ? "bg-white/[0.05] border border-white/[0.1] text-white" : "bg-gray-50 border border-gray-200 text-gray-900")}
                                    placeholder="Süt Seçimi, Şurup, Ekstralar"
                                    required
                                />
                            </div>
                            <div>
                                <label className={clsx("block text-sm mb-2", textSecondary)}>Seçim Tipi</label>
                                <select
                                    value={groupForm.selection_type}
                                    onChange={(e) => setGroupForm({ ...groupForm, selection_type: e.target.value as 'single' | 'multiple' })}
                                    className={clsx("w-full px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#fe1e50]/50", isDark ? "bg-white/[0.05] border border-white/[0.1] text-white" : "bg-gray-50 border border-gray-200 text-gray-900")}
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
                                    className={clsx("rounded", isDark ? "bg-white/[0.05] border-white/[0.1]" : "bg-gray-50 border-gray-200")}
                                />
                                <label htmlFor="required" className={textSecondary}>Zorunlu seçim</label>
                            </div>
                            <div className="flex gap-2 justify-end pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowGroupModal(false)}
                                    className={clsx("px-4 py-2 rounded-xl", isDark ? "bg-white/[0.05] text-white hover:bg-white/[0.1]" : "bg-gray-100 text-gray-700 hover:bg-gray-200")}
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
                <div className={clsx("fixed inset-0 z-50 flex items-center justify-center p-4", isDark ? "bg-black/50" : "bg-black/30", "backdrop-blur-sm")}>
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className={clsx("rounded-2xl p-6 w-full max-w-md border", isDark ? "bg-[#1a1a2e] border-white/[0.1]" : "bg-white border-gray-200")}
                    >
                        <h2 className={clsx("text-xl font-bold mb-1", textPrimary)}>Yeni Seçenek</h2>
                        <p className={clsx("text-sm mb-4", textMuted)}>{selectedGroup.name}</p>
                        <form onSubmit={handleCreateExtra} className="space-y-4">
                            <div>
                                <label className={clsx("block text-sm mb-2", textSecondary)}>Seçenek Adı</label>
                                <input
                                    type="text"
                                    value={extraForm.name}
                                    onChange={(e) => setExtraForm({ ...extraForm, name: e.target.value })}
                                    className={clsx("w-full px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#fe1e50]/50", isDark ? "bg-white/[0.05] border border-white/[0.1] text-white" : "bg-gray-50 border border-gray-200 text-gray-900")}
                                    placeholder="Yulaf Sütü, Vanilya Şurupu"
                                    required
                                />
                            </div>
                            <div>
                                <label className={clsx("block text-sm mb-2", textSecondary)}>Fiyat Farkı (₺)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={extraForm.price_modifier}
                                    onChange={(e) => setExtraForm({ ...extraForm, price_modifier: parseFloat(e.target.value) })}
                                    className={clsx("w-full px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#fe1e50]/50", isDark ? "bg-white/[0.05] border border-white/[0.1] text-white" : "bg-gray-50 border border-gray-200 text-gray-900")}
                                    placeholder="0"
                                />
                            </div>
                            <div className="flex gap-2 justify-end pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowExtraModal(false)}
                                    className={clsx("px-4 py-2 rounded-xl", isDark ? "bg-white/[0.05] text-white hover:bg-white/[0.1]" : "bg-gray-100 text-gray-700 hover:bg-gray-200")}
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
