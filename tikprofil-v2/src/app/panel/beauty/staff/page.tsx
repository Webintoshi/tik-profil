"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Edit3, Trash2, Loader2, Save, X, Phone, User } from "lucide-react";
import clsx from "clsx";
import { toast } from "sonner";
import { useTheme } from "@/components/panel/ThemeProvider";
import { Staff } from "@/types/beauty";
import { toR2ProxyUrl } from "@/lib/publicImage";

export default function BeautyStaffPage() {
    const { isDark } = useTheme();
    const [loading, setLoading] = useState(true);
    const [staff, setStaff] = useState<Staff[]>([]);
    const [showModal, setShowModal] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

    const [form, setForm] = useState({
        name: "",
        title: "",
        phone: "",
        photoUrl: "",
    });

    useEffect(() => {
        loadStaff();
    }, []);

    const loadStaff = async () => {
        try {
            setLoading(true);
            const res = await fetch('/api/beauty/staff');
            const data = await res.json();

            if (data.success) {
                setStaff(data.staff || []);
            }
        } catch (error) {
            console.error('Load error:', error);
            toast.error('Personel yüklenirken hata oluştu');
        } finally {
            setLoading(false);
        }
    };

    const openModal = (member?: Staff) => {
        if (member) {
            setEditingId(member.id);
            setForm({
                name: member.name,
                title: member.title || "",
                phone: member.phone || '',
                photoUrl: member.photoUrl || "",
            });
        } else {
            setEditingId(null);
            setForm({ name: "", title: "", phone: "", photoUrl: "" });
        }
        setShowModal(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!form.name.trim() || !form.phone.trim()) {
            toast.error('Ad ve telefon zorunlu');
            return;
        }

        setSaving(true);

        try {
            const payload = {
                ...(editingId && { id: editingId }),
                name: form.name.trim(),
                title: form.title.trim() || 'Uzman',
                phone: form.phone.trim(),
                photoUrl: form.photoUrl.trim(),
            };

            const res = await fetch('/api/beauty/staff', {
                method: editingId ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            const data = await res.json();

            if (data.success) {
                toast.success(editingId ? 'Personel güncellendi' : 'Personel eklendi');
                setShowModal(false);
                loadStaff();
            } else {
                toast.error(data.error || 'İşlem başarısız');
            }
        } catch {
            toast.error('Kayıt sırasında hata oluştu');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        try {
            const res = await fetch(`/api/beauty/staff?id=${id}`, { method: 'DELETE' });
            const data = await res.json();

            if (data.success) {
                setStaff(prev => prev.filter(s => s.id !== id));
                toast.success('Personel silindi');
            } else {
                toast.error(data.error || 'Silme başarısız');
            }
        } catch {
            toast.error('Silme sırasında hata oluştu');
        }
        setDeleteConfirm(null);
    };

    const toggleActive = async (id: string, isActive: boolean) => {
        try {
            const res = await fetch('/api/beauty/staff', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, isActive: !isActive }),
            });

            const data = await res.json();

            if (data.success) {
                setStaff(prev => prev.map(s =>
                    s.id === id ? { ...s, isActive: !isActive } : s
                ));
            }
        } catch {
            toast.error('Güncelleme başarısız');
        }
    };

    const inputClass = clsx(
        "w-full px-4 py-3 rounded-xl border focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all",
        isDark ? "bg-gray-700 border-gray-600 text-white" : "bg-white border-gray-200 text-gray-900"
    );

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className={clsx("text-2xl font-bold", isDark ? "text-white" : "text-gray-900")}>
                        Personel
                    </h1>
                    <p className={clsx("text-sm", isDark ? "text-gray-400" : "text-gray-500")}>
                        {staff.length} personel
                    </p>
                </div>
                <button
                    onClick={() => openModal()}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-pink-500 to-rose-600 text-white font-medium rounded-xl hover:shadow-lg transition-all"
                >
                    <Plus className="w-5 h-5" />
                    Yeni Personel
                </button>
            </div>

            {/* Staff Grid */}
            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="w-8 h-8 animate-spin text-pink-500" />
                </div>
            ) : staff.length === 0 ? (
                <div className={clsx("text-center py-20 rounded-2xl", isDark ? "bg-gray-800" : "bg-gray-50")}>
                    <div className="text-5xl mb-4">👩‍💼</div>
                    <h3 className={clsx("text-lg font-semibold mb-2", isDark ? "text-white" : "text-gray-900")}>
                        Henüz personel yok
                    </h3>
                    <p className={clsx("mb-4", isDark ? "text-gray-400" : "text-gray-500")}>
                        Ekibinizi tanıtın
                    </p>
                    <button
                        onClick={() => openModal()}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-pink-500 to-rose-600 text-white font-medium rounded-xl"
                    >
                        <Plus className="w-5 h-5" />
                        Personel Ekle
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {staff.map((member, index) => (
                        <motion.div
                            key={member.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className={clsx(
                                "p-5 rounded-2xl relative",
                                isDark ? "bg-gray-800" : "bg-white",
                                !member.isActive && "opacity-50"
                            )}
                        >
                            <div className="flex items-start gap-4">
                                {member.photoUrl ? (
                                    <img
                                        src={toR2ProxyUrl(member.photoUrl)}
                                        alt={member.name}
                                        className="w-16 h-16 rounded-full object-cover"
                                    />
                                ) : (
                                    <div className={clsx(
                                        "w-16 h-16 rounded-full flex items-center justify-center",
                                        isDark ? "bg-pink-500/20" : "bg-pink-100"
                                    )}>
                                        <User className="w-8 h-8 text-pink-500" />
                                    </div>
                                )}

                                <div className="flex-1">
                                    <h3 className={clsx("font-semibold text-lg", isDark ? "text-white" : "text-gray-900")}>
                                        {member.name}
                                    </h3>
                                    {member.title && (
                                        <p className={clsx("text-sm", isDark ? "text-gray-400" : "text-gray-500")}>
                                            {member.title}
                                        </p>
                                    )}
                                    <div className={clsx("flex items-center gap-1 mt-2", isDark ? "text-gray-500" : "text-gray-400")}>
                                        <Phone className="w-4 h-4" />
                                        <span className="text-sm">{member.phone}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                                <button
                                    onClick={() => toggleActive(member.id, member.isActive)}
                                    className={clsx(
                                        "flex-1 py-2 rounded-xl text-sm font-medium transition-colors",
                                        member.isActive
                                            ? "bg-emerald-100 text-emerald-700"
                                            : "bg-gray-100 text-gray-500"
                                    )}
                                >
                                    {member.isActive ? 'Aktif' : 'Pasif'}
                                </button>
                                <button
                                    onClick={() => openModal(member)}
                                    className={clsx(
                                        "p-2 rounded-lg transition-colors",
                                        isDark ? "hover:bg-gray-700" : "hover:bg-gray-100"
                                    )}
                                >
                                    <Edit3 className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => setDeleteConfirm(member.id)}
                                    className="p-2 rounded-lg hover:bg-rose-100 text-rose-500 transition-colors"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>

                            {/* Delete Confirm */}
                            {deleteConfirm === member.id && (
                                <div className="absolute inset-0 bg-black/50 rounded-2xl flex items-center justify-center p-4">
                                    <div className={clsx("p-4 rounded-xl w-full", isDark ? "bg-gray-800" : "bg-white")}>
                                        <p className={clsx("mb-3 text-center", isDark ? "text-white" : "text-gray-900")}>
                                            Bu personeli silmek istediğinize emin misiniz?
                                        </p>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => setDeleteConfirm(null)}
                                                className={clsx("flex-1 py-2 rounded-lg", isDark ? "bg-gray-700 text-white" : "bg-gray-100")}
                                            >
                                                İptal
                                            </button>
                                            <button
                                                onClick={() => handleDelete(member.id)}
                                                className="flex-1 py-2 rounded-lg bg-rose-600 text-white"
                                            >
                                                Sil
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    ))}
                </div>
            )}

            {/* Modal */}
            <AnimatePresence>
                {showModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setShowModal(false)}
                        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
                    >
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            onClick={(e) => e.stopPropagation()}
                            className={clsx(
                                "w-full max-w-md p-4 sm:p-6 rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto",
                                isDark ? "bg-gray-800" : "bg-white"
                            )}
                        >
                            <div className="flex items-center justify-between mb-6">
                                <h2 className={clsx("text-lg font-bold", isDark ? "text-white" : "text-gray-900")}>
                                    {editingId ? 'Personel Düzenle' : 'Yeni Personel'}
                                </h2>
                                <button
                                    onClick={() => setShowModal(false)}
                                    className={clsx("p-2 rounded-lg", isDark ? "hover:bg-gray-700" : "hover:bg-gray-100")}
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div>
                                    <label className={clsx("block text-sm font-medium mb-1.5", isDark ? "text-gray-300" : "text-gray-700")}>
                                        Ad Soyad *
                                    </label>
                                    <input
                                        type="text"
                                        value={form.name}
                                        onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
                                        placeholder="Ayşe Yılmaz"
                                        className={inputClass}
                                    />
                                </div>

                                <div>
                                    <label className={clsx("block text-sm font-medium mb-1.5", isDark ? "text-gray-300" : "text-gray-700")}>
                                        Unvan
                                    </label>
                                    <input
                                        type="text"
                                        value={form.title}
                                        onChange={(e) => setForm(prev => ({ ...prev, title: e.target.value }))}
                                        placeholder="Saç Stilisti"
                                        className={inputClass}
                                    />
                                </div>

                                <div>
                                    <label className={clsx("block text-sm font-medium mb-1.5", isDark ? "text-gray-300" : "text-gray-700")}>
                                        Telefon *
                                    </label>
                                    <input
                                        type="tel"
                                        value={form.phone}
                                        onChange={(e) => setForm(prev => ({ ...prev, phone: e.target.value }))}
                                        placeholder="05XX XXX XX XX"
                                        className={inputClass}
                                    />
                                </div>

                                <div>
                                    <label className={clsx("block text-sm font-medium mb-1.5", isDark ? "text-gray-300" : "text-gray-700")}>
                                        Fotoğraf URL
                                    </label>
                                    <input
                                        type="url"
                                        value={form.photoUrl}
                                        onChange={(e) => setForm(prev => ({ ...prev, photoUrl: e.target.value }))}
                                        placeholder="https://..."
                                        className={inputClass}
                                    />
                                </div>

                                <div className="flex gap-3 pt-4">
                                    <button
                                        type="button"
                                        onClick={() => setShowModal(false)}
                                        className={clsx(
                                            "flex-1 py-3 rounded-xl font-medium transition-colors",
                                            isDark ? "bg-gray-700 text-white hover:bg-gray-600" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                                        )}
                                    >
                                        İptal
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={saving}
                                        className="flex-1 py-3 bg-gradient-to-r from-pink-500 to-rose-600 text-white font-medium rounded-xl hover:shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                                    >
                                        {saving ? (
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                        ) : (
                                            <>
                                                <Save className="w-5 h-5" />
                                                Kaydet
                                            </>
                                        )}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
