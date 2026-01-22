"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Edit3, Trash2, Loader2, Save, X, Clock, Search } from "lucide-react";
import clsx from "clsx";
import { toast } from "sonner";
import { useTheme } from "@/components/panel/ThemeProvider";
import { Service, ServiceCategory, formatDuration, formatPrice } from "@/types/beauty";

export default function BeautyServicesPage() {
    const { isDark } = useTheme();
    const [loading, setLoading] = useState(true);
    const [services, setServices] = useState<Service[]>([]);
    const [categories, setCategories] = useState<ServiceCategory[]>([]);
    const [showModal, setShowModal] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [filterCategory, setFilterCategory] = useState<string>("all");

    const [form, setForm] = useState({
        categoryId: "",
        name: "",
        description: "",
        price: "",
        duration: "30",
    });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const [catRes, svcRes] = await Promise.all([
                fetch('/api/beauty/categories'),
                fetch('/api/beauty/services'),
            ]);

            const [catData, svcData] = await Promise.all([
                catRes.json(),
                svcRes.json(),
            ]);

            if (catData.success) setCategories(catData.categories || []);
            if (svcData.success) setServices(svcData.services || []);
        } catch (error) {
            console.error('Load error:', error);
            toast.error('Veriler yüklenirken hata oluştu');
        } finally {
            setLoading(false);
        }
    };

    const filteredServices = services.filter(s => {
        const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = filterCategory === "all" || s.categoryId === filterCategory;
        return matchesSearch && matchesCategory;
    });

    const getCategoryName = (categoryId: string) => {
        const cat = categories.find(c => c.id === categoryId);
        return cat?.name || 'Kategori Yok';
    };

    const openModal = (service?: Service) => {
        if (service) {
            setEditingId(service.id);
            setForm({
                categoryId: service.categoryId,
                name: service.name,
                description: service.description || "",
                price: String(service.price),
                duration: String(service.duration),
            });
        } else {
            setEditingId(null);
            setForm({
                categoryId: categories[0]?.id || "",
                name: "",
                description: "",
                price: "",
                duration: "30",
            });
        }
        setShowModal(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!form.name.trim() || !form.categoryId || !form.price) {
            toast.error('Lütfen zorunlu alanları doldurun');
            return;
        }

        setSaving(true);

        try {
            const payload = {
                ...(editingId && { id: editingId }),
                categoryId: form.categoryId,
                name: form.name.trim(),
                description: form.description.trim(),
                price: Number(form.price),
                duration: Number(form.duration) || 30,
            };

            const res = await fetch('/api/beauty/services', {
                method: editingId ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            const data = await res.json();

            if (data.success) {
                toast.success(editingId ? 'Hizmet güncellendi' : 'Hizmet eklendi');
                setShowModal(false);
                loadData();
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
            const res = await fetch(`/api/beauty/services?id=${id}`, { method: 'DELETE' });
            const data = await res.json();

            if (data.success) {
                setServices(prev => prev.filter(s => s.id !== id));
                toast.success('Hizmet silindi');
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
            const res = await fetch('/api/beauty/services', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, isActive: !isActive }),
            });

            const data = await res.json();

            if (data.success) {
                setServices(prev => prev.map(s =>
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
                        Hizmetler
                    </h1>
                    <p className={clsx("text-sm", isDark ? "text-gray-400" : "text-gray-500")}>
                        {services.length} hizmet
                    </p>
                </div>
                <button
                    onClick={() => openModal()}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-pink-500 to-rose-600 text-white font-medium rounded-xl hover:shadow-lg transition-all"
                >
                    <Plus className="w-5 h-5" />
                    Yeni Hizmet
                </button>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className={clsx("absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5", isDark ? "text-gray-500" : "text-gray-400")} />
                    <input
                        type="text"
                        placeholder="Hizmet Ara..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className={clsx(inputClass, "pl-10")}
                    />
                </div>
                <select
                    value={filterCategory}
                    onChange={(e) => setFilterCategory(e.target.value)}
                    className={clsx(inputClass, "sm:w-48")}
                >
                    <option value="all">Tüm Kategoriler</option>
                    {categories.map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                </select>
            </div>

            {/* Services Grid */}
            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="w-8 h-8 animate-spin text-pink-500" />
                </div>
            ) : filteredServices.length === 0 ? (
                <div className={clsx("text-center py-20 rounded-2xl", isDark ? "bg-gray-800" : "bg-gray-50")}>
                    <div className="text-5xl mb-4">✨</div>
                    <h3 className={clsx("text-lg font-semibold mb-2", isDark ? "text-white" : "text-gray-900")}>
                        {searchQuery || filterCategory !== "all" ? "Sonuç bulunamadı" : "Henüz hizmet yok"}
                    </h3>
                    <p className={clsx("mb-4", isDark ? "text-gray-400" : "text-gray-500")}>
                        {categories.length === 0 ? "Önce bir kategori oluşturun" : "İlk hizmetinizi ekleyin"}
                    </p>
                    {categories.length > 0 && (
                        <button
                            onClick={() => openModal()}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-pink-500 to-rose-600 text-white font-medium rounded-xl"
                        >
                            <Plus className="w-5 h-5" />
                            Hizmet Ekle
                        </button>
                    )}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredServices.map((service, index) => (
                        <motion.div
                            key={service.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className={clsx(
                                "p-5 rounded-2xl transition-all",
                                isDark ? "bg-gray-800" : "bg-white",
                                !service.isActive && "opacity-50"
                            )}
                        >
                            <div className="flex items-start justify-between mb-3">
                                <span className={clsx(
                                    "px-2 py-1 rounded-lg text-xs font-medium",
                                    isDark ? "bg-pink-500/20 text-pink-400" : "bg-pink-100 text-pink-600"
                                )}>
                                    {getCategoryName(service.categoryId)}
                                </span>
                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={() => openModal(service)}
                                        className={clsx("p-1.5 rounded-lg transition-colors", isDark ? "hover:bg-gray-700" : "hover:bg-gray-100")}
                                    >
                                        <Edit3 className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => setDeleteConfirm(service.id)}
                                        className="p-1.5 rounded-lg hover:bg-rose-100 text-rose-500 transition-colors"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            <h3 className={clsx("font-semibold text-lg mb-1", isDark ? "text-white" : "text-gray-900")}>
                                {service.name}
                            </h3>

                            {service.description && (
                                <p className={clsx("text-sm mb-3 line-clamp-2", isDark ? "text-gray-400" : "text-gray-500")}>
                                    {service.description}
                                </p>
                            )}

                            <div className="flex items-center justify-between pt-3 border-t border-gray-200 dark:border-gray-700">
                                <div className="flex items-center gap-2">
                                    <Clock className={clsx("w-4 h-4", isDark ? "text-gray-500" : "text-gray-400")} />
                                    <span className={clsx("text-sm", isDark ? "text-gray-400" : "text-gray-500")}>
                                        {formatDuration(service.duration)}
                                    </span>
                                </div>
                                <span className={clsx("font-bold text-lg", "text-pink-500")}>
                                    {formatPrice(service.price, service.currency)}
                                </span>
                            </div>

                            <button
                                onClick={() => toggleActive(service.id, service.isActive)}
                                className={clsx(
                                    "w-full mt-3 py-2 rounded-xl text-sm font-medium transition-colors",
                                    service.isActive
                                        ? "bg-emerald-100 text-emerald-700"
                                        : "bg-gray-100 text-gray-500"
                                )}
                            >
                                {service.isActive ? 'Aktif' : 'Pasif'}
                            </button>

                            {/* Delete Confirm */}
                            {deleteConfirm === service.id && (
                                <div className="absolute inset-0 bg-black/50 rounded-2xl flex items-center justify-center p-4">
                                    <div className={clsx("p-4 rounded-xl w-full", isDark ? "bg-gray-800" : "bg-white")}>
                                        <p className={clsx("mb-3 text-center", isDark ? "text-white" : "text-gray-900")}>
                                            Bu hizmeti silmek istediğinize emin misiniz?
                                        </p>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => setDeleteConfirm(null)}
                                                className={clsx("flex-1 py-2 rounded-lg", isDark ? "bg-gray-700 text-white" : "bg-gray-100")}
                                            >
                                                İptal
                                            </button>
                                            <button
                                                onClick={() => handleDelete(service.id)}
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
                                "w-full max-w-lg p-4 sm:p-6 rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto",
                                isDark ? "bg-gray-800" : "bg-white"
                            )}
                        >
                            <div className="flex items-center justify-between mb-6">
                                <h2 className={clsx("text-lg font-bold", isDark ? "text-white" : "text-gray-900")}>
                                    {editingId ? 'Hizmet Düzenle' : 'Yeni Hizmet'}
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
                                        Kategori *
                                    </label>
                                    <select
                                        value={form.categoryId}
                                        onChange={(e) => setForm(prev => ({ ...prev, categoryId: e.target.value }))}
                                        className={inputClass}
                                    >
                                        <option value="">Kategori Seçin</option>
                                        {categories.map(cat => (
                                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className={clsx("block text-sm font-medium mb-1.5", isDark ? "text-gray-300" : "text-gray-700")}>
                                        Hizmet Adı *
                                    </label>
                                    <input
                                        type="text"
                                        value={form.name}
                                        onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
                                        placeholder="Saç Boyama"
                                        className={inputClass}
                                    />
                                </div>

                                <div>
                                    <label className={clsx("block text-sm font-medium mb-1.5", isDark ? "text-gray-300" : "text-gray-700")}>
                                        Açıklama
                                    </label>
                                    <textarea
                                        value={form.description}
                                        onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
                                        placeholder="Hizmet hakkında kısa açıklama..."
                                        rows={3}
                                        className={inputClass}
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className={clsx("block text-sm font-medium mb-1.5", isDark ? "text-gray-300" : "text-gray-700")}>
                                            Fiyat (₺) *
                                        </label>
                                        <input
                                            type="number"
                                            value={form.price}
                                            onChange={(e) => setForm(prev => ({ ...prev, price: e.target.value }))}
                                            placeholder="250"
                                            min="0"
                                            className={inputClass}
                                        />
                                    </div>
                                    <div>
                                        <label className={clsx("block text-sm font-medium mb-1.5", isDark ? "text-gray-300" : "text-gray-700")}>
                                            Süre (dk)
                                        </label>
                                        <select
                                            value={form.duration}
                                            onChange={(e) => setForm(prev => ({ ...prev, duration: e.target.value }))}
                                            className={inputClass}
                                        >
                                            <option value="15">15 dakika</option>
                                            <option value="30">30 dakika</option>
                                            <option value="45">45 dakika</option>
                                            <option value="60">1 saat</option>
                                            <option value="90">1.5 saat</option>
                                            <option value="120">2 saat</option>
                                            <option value="180">3 saat</option>
                                            <option value="240">4 saat</option>
                                        </select>
                                    </div>
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
