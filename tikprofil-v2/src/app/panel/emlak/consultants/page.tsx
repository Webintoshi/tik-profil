"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Plus,
    Search,
    Edit3,
    Trash2,
    Loader2,
    User,
    Phone,
    Mail,
    X,
    Save,
    Image as ImageIcon,
    ExternalLink
} from "lucide-react";
import clsx from "clsx";
import { toast } from "sonner";
import { useTheme } from "@/components/panel/ThemeProvider";
import { useBusinessSession } from "@/hooks/useBusinessSession";
import { getBusinessById } from "@/lib/services/foodService";
import Image from "next/image";
import { Consultant } from "@/types/emlak";
import { toR2ProxyUrl } from "@/lib/publicImage";
import { uploadImageWithFallback } from "@/lib/clientUpload";

export default function EmlakConsultantsPage() {
    const { isDark } = useTheme();
    const { session } = useBusinessSession();
    const [loading, setLoading] = useState(true);
    const [consultants, setConsultants] = useState<Consultant[]>([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [showModal, setShowModal] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
    const [uploadingPhoto, setUploadingPhoto] = useState(false);

    const [form, setForm] = useState({
        name: "",
        title: "Emlak Danışmanı",
        phone: "",
        whatsapp: "",
        email: "",
        photoUrl: "",
        bio: "",
        newPassword: "",
    });
    const [businessSlug, setBusinessSlug] = useState<string | null>(null);

    useEffect(() => {
        loadConsultants();
    }, []);

    // Get business slug using businessId from session
    useEffect(() => {
        if (session?.businessId) {
            getBusinessById(session.businessId).then(business => {
                if (business?.slug) {
                    setBusinessSlug(business.slug);
                }
            });
        }
    }, [session?.businessId]);

    const loadConsultants = async () => {
        try {
            setLoading(true);
            const consultantsRes = await fetch('/api/emlak/consultants');
            const consultantsData = await consultantsRes.json();

            if (consultantsData.success) {
                setConsultants(consultantsData.consultants || []);
            }
        } catch (error) {
            console.error('Load error:', error);
            toast.error('Veriler yüklenirken hata oluştu');
        } finally {
            setLoading(false);
        }
    };

    const openModal = (consultant?: Consultant) => {
        if (consultant) {
            setEditingId(consultant.id);
            setForm({
                name: consultant.name,
                title: consultant.title || "Emlak Danışmanı",
                phone: consultant.phone,
                whatsapp: consultant.whatsapp || consultant.phone,
                email: consultant.email || "",
                photoUrl: consultant.photoUrl || "",
                bio: consultant.bio || "",
                newPassword: "",
            });
        } else {
            setEditingId(null);
            setForm({
                name: "",
                title: "Emlak Danışmanı",
                phone: "",
                whatsapp: "",
                email: "",
                photoUrl: "",
                bio: "",
                newPassword: "",
            });
        }
        setShowModal(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!form.name.trim()) {
            toast.error('İsim zorunlu');
            return;
        }
        if (!form.phone.trim()) {
            toast.error('Telefon zorunlu');
            return;
        }

        setSaving(true);

        try {
            const payload = {
                ...(editingId && { id: editingId }),
                name: form.name.trim(),
                title: form.title.trim(),
                phone: form.phone.trim(),
                whatsapp: form.whatsapp.trim() || form.phone.trim(),
                email: form.email.trim(),
                photoUrl: form.photoUrl.trim(),
                bio: form.bio.trim(),
                ...(form.newPassword.trim().length >= 6 && { newPassword: form.newPassword.trim() }),
            };

            const res = await fetch('/api/emlak/consultants', {
                method: editingId ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            const data = await res.json();

            if (data.success) {
                toast.success(editingId ? 'Danışman güncellendi' : 'Danışman eklendi');
                setShowModal(false);
                loadConsultants();
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
            const res = await fetch(`/api/emlak/consultants?id=${id}`, { method: 'DELETE' });
            const data = await res.json();

            if (data.success) {
                setConsultants(prev => prev.filter(c => c.id !== id));
                toast.success('Danışman silindi');
            } else {
                toast.error(data.error || 'Silme başarısız');
            }
        } catch {
            toast.error('Silme sırasında hata oluştu');
        }
        setDeleteConfirm(null);
    };

    const filteredConsultants = consultants.filter(c =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.phone.includes(searchTerm)
    );

    const inputClass = clsx(
        "w-full px-4 py-3 rounded-xl border focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all",
        isDark ? "bg-gray-700 border-gray-600 text-white" : "bg-white border-gray-200 text-gray-900"
    );

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        Danışmanlar
                    </h1>
                    <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                        {filteredConsultants.length} danışman
                    </p>
                </div>
                <button
                    onClick={() => openModal()}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-violet-500 to-purple-600 text-white font-medium rounded-xl hover:shadow-lg transition-all"
                >
                    <Plus className="w-5 h-5" />
                    Yeni Danışman
                </button>
            </div>

            {/* Search */}
            <div className={`relative ${isDark ? 'bg-gray-800' : 'bg-white'} rounded-xl`}>
                <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 ${isDark ? 'text-gray-400' : 'text-gray-400'}`} />
                <input
                    type="text"
                    placeholder="Danışman ara..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className={`w-full pl-10 pr-4 py-3 rounded-xl border-0 focus:ring-2 focus:ring-purple-500 ${isDark ? 'bg-gray-800 text-white placeholder:text-gray-500' : 'bg-white text-gray-900'
                        }`}
                />
            </div>

            {/* Consultants Grid */}
            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
                </div>
            ) : filteredConsultants.length === 0 ? (
                <div className={`text-center py-20 rounded-2xl ${isDark ? 'bg-gray-800' : 'bg-gray-50'}`}>
                    <div className="text-5xl mb-4">👤</div>
                    <h3 className={`text-lg font-semibold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        {consultants.length === 0 ? 'Henüz danışman yok' : 'Sonuç bulunamadı'}
                    </h3>
                    <p className={`${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                        {consultants.length === 0 ? 'İlk danışmanınızı ekleyin' : 'Aramanızı değiştirin'}
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    <AnimatePresence>
                        {filteredConsultants.map((consultant, index) => (
                            <motion.div
                                key={consultant.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                transition={{ delay: index * 0.05 }}
                                className={`p-5 rounded-2xl ${isDark ? 'bg-gray-800' : 'bg-white'} shadow-sm hover:shadow-lg transition-all relative`}
                            >
                                <div className="flex items-start gap-4">
                                    {/* Photo */}
                                    <div className="relative w-16 h-16 flex-shrink-0">
                                        {consultant.photoUrl ? (
                                            <Image
                                                src={toR2ProxyUrl(consultant.photoUrl)}
                                                alt={consultant.name}
                                                fill
                                                className="object-cover rounded-xl"

                                            />
                                        ) : (
                                            <div className={`w-full h-full rounded-xl flex items-center justify-center ${isDark ? 'bg-gray-700' : 'bg-gray-100'}`}>
                                                <User className={`w-8 h-8 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
                                            </div>
                                        )}
                                    </div>

                                    {/* Info */}
                                    <div className="flex-1 min-w-0">
                                        <h3 className={`font-semibold truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                            {consultant.name}
                                        </h3>
                                        <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                            {consultant.title || 'Emlak Danışmanı'}
                                        </p>

                                        <div className="mt-2 space-y-1">
                                            <div className={`flex items-center gap-2 text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                                <Phone className="w-4 h-4" />
                                                <span>{consultant.phone}</span>
                                            </div>
                                            {consultant.email && (
                                                <div className={`flex items-center gap-2 text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                                    <Mail className="w-4 h-4" />
                                                    <span className="truncate">{consultant.email}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                                    <button
                                        onClick={() => openModal(consultant)}
                                        className={clsx(
                                            "flex-1 py-2 rounded-lg text-center text-sm font-medium transition-colors flex items-center justify-center gap-1",
                                            isDark ? "bg-gray-700 text-white hover:bg-gray-600" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                                        )}
                                    >
                                        <Edit3 className="w-4 h-4" />
                                        Düzenle
                                    </button>

                                    {businessSlug && consultant.slug && (
                                        <a
                                            href={`/${businessSlug}/danisman/${consultant.slug}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="p-2 rounded-lg bg-purple-100 text-purple-600 hover:bg-purple-200 transition-colors"
                                            title="Profil Sayfasını Aç"
                                        >
                                            <ExternalLink className="w-4 h-4" />
                                        </a>
                                    )}

                                    <button
                                        onClick={() => setDeleteConfirm(consultant.id)}
                                        className="p-2 rounded-lg bg-rose-100 text-rose-600 hover:bg-rose-200 transition-colors"
                                        title="Sil"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>

                                {/* Delete Confirm */}
                                {deleteConfirm === consultant.id && (
                                    <div className="absolute inset-0 bg-black/50 rounded-2xl flex items-center justify-center p-4">
                                        <div className={`p-4 rounded-xl ${isDark ? 'bg-gray-800' : 'bg-white'} text-center`}>
                                            <p className={`mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                                Bu danışmanı silmek istiyor musunuz?
                                            </p>
                                            <div className="flex gap-2 justify-center">
                                                <button
                                                    onClick={() => setDeleteConfirm(null)}
                                                    className={`px-4 py-2 rounded-lg ${isDark ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-700'}`}
                                                >
                                                    İptal
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(consultant.id)}
                                                    className="px-4 py-2 rounded-lg bg-rose-600 text-white"
                                                >
                                                    Sil
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            )}

            {/* Modal */}
            <AnimatePresence>
                {showModal && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowModal(false)}
                            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className={`fixed inset-4 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 z-50 md:w-full md:max-w-lg p-6 rounded-2xl ${isDark ? 'bg-gray-800' : 'bg-white'} shadow-2xl overflow-y-auto max-h-[90vh]`}
                        >
                            <div className="flex items-center justify-between mb-6">
                                <h2 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                    {editingId ? 'Danışman Düzenle' : 'Yeni Danışman'}
                                </h2>
                                <button
                                    onClick={() => setShowModal(false)}
                                    className={`p-2 rounded-lg ${isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div>
                                    <label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                                        Ad Soyad *
                                    </label>
                                    <input
                                        type="text"
                                        value={form.name}
                                        onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
                                        placeholder="Ahmet Yılmaz"
                                        className={inputClass}
                                    />
                                </div>

                                <div>
                                    <label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                                        Unvan
                                    </label>
                                    <input
                                        type="text"
                                        value={form.title}
                                        onChange={(e) => setForm(prev => ({ ...prev, title: e.target.value }))}
                                        placeholder="Emlak Danışmanı"
                                        className={inputClass}
                                    />
                                </div>

                                <div>
                                    <label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                                        Telefon *
                                    </label>
                                    <input
                                        type="tel"
                                        value={form.phone}
                                        onChange={(e) => setForm(prev => ({ ...prev, phone: e.target.value }))}
                                        placeholder="+90 532 123 4567"
                                        className={inputClass}
                                    />
                                </div>

                                <div>
                                    <label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                                        WhatsApp
                                    </label>
                                    <input
                                        type="tel"
                                        value={form.whatsapp}
                                        onChange={(e) => setForm(prev => ({ ...prev, whatsapp: e.target.value }))}
                                        placeholder="Telefon ile aynıysa boş bırakın"
                                        className={inputClass}
                                    />
                                </div>

                                <div>
                                    <label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                                        E-posta
                                    </label>
                                    <input
                                        type="email"
                                        value={form.email}
                                        onChange={(e) => setForm(prev => ({ ...prev, email: e.target.value }))}
                                        placeholder="ahmet@emlak.com"
                                        className={inputClass}
                                    />
                                </div>

                                {/* Photo Upload */}
                                <div>
                                    <label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                                        Fotoğraf
                                    </label>
                                    <div className="flex gap-4 items-start">
                                        {/* Preview */}
                                        <div className={clsx(
                                            "relative w-20 h-20 rounded-xl overflow-hidden flex-shrink-0 border-2",
                                            isDark ? "border-gray-700 bg-gray-700" : "border-gray-200 bg-gray-100"
                                        )}>
                                            {form.photoUrl ? (
                                                <Image
                                                    src={toR2ProxyUrl(form.photoUrl)}
                                                    alt="Preview"
                                                    fill
                                                    className="object-cover"

                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center">
                                                    <User className={`w-8 h-8 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
                                                </div>
                                            )}
                                        </div>

                                        {/* Upload Button */}
                                        <div className="flex-1">
                                            <input
                                                type="file"
                                                accept="image/*"
                                                id="consultant-photo"
                                                className="hidden"
                                                onChange={async (e) => {
                                                    const file = e.target.files?.[0];
                                                    if (!file) return;

                                                    if (file.size > 5 * 1024 * 1024) {
                                                        toast.error('Dosya boyutu 5MB\'dan küçük olmalı');
                                                        return;
                                                    }

                                                    setUploadingPhoto(true);
                                                    try {
                                                        const { url } = await uploadImageWithFallback({
                                                            file,
                                                            moduleName: "emlak",
                                                            fallbackEndpoint: "/api/emlak/upload",
                                                        });

                                                        if (url) {
                                                            setForm(prev => ({ ...prev, photoUrl: url }));
                                                            toast.success('Foto?Yraf y??klendi');
                                                        } else {
                                                            toast.error('Y??kleme ba?Yar??s??z');
                                                        }
                                                    } catch {
                                                        toast.error('Yükleme hatası');
                                                    } finally {
                                                        setUploadingPhoto(false);
                                                    }
                                                }}
                                            />
                                            <label
                                                htmlFor="consultant-photo"
                                                className={clsx(
                                                    "flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl cursor-pointer transition-colors",
                                                    uploadingPhoto && "opacity-50 pointer-events-none",
                                                    isDark
                                                        ? "bg-gray-700 text-white hover:bg-gray-600"
                                                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                                                )}
                                            >
                                                {uploadingPhoto ? (
                                                    <>
                                                        <Loader2 className="w-5 h-5 animate-spin" />
                                                        Yükleniyor...
                                                    </>
                                                ) : (
                                                    <>
                                                        <ImageIcon className="w-4 h-4" />
                                                        Fotoğraf Yükle
                                                    </>
                                                )}
                                            </label>
                                            <p className={`text-xs mt-1.5 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                                                Max 5MB, JPG/PNG
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Bio */}
                                <div>
                                    <label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                                        Hakkında
                                    </label>
                                    <textarea
                                        value={form.bio}
                                        onChange={(e) => setForm(prev => ({ ...prev, bio: e.target.value }))}
                                        placeholder="Danışman hakkında kısa bilgi (profil sayfasında görünecek)"
                                        rows={3}
                                        maxLength={1000}
                                        className={inputClass}
                                    />
                                    <p className={`text-xs mt-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                                        {form.bio.length}/1000
                                    </p>
                                </div>

                                {/* Password for Login */}
                                {editingId && (
                                    <div className="border-t pt-4 mt-4 border-gray-200 dark:border-gray-700">
                                        <label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                                            Panel Şifresi (Opsiyonel)
                                        </label>
                                        <input
                                            type="password"
                                            placeholder="Yeni şifre belirle (min 6 karakter)"
                                            className={inputClass}
                                            onChange={(e) => setForm(prev => ({ ...prev, newPassword: e.target.value }))}
                                        />
                                        <p className={`text-xs mt-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                                            Danışmanın /danisman-giris sayfasından giriş yapması için şifre belirleyin
                                        </p>
                                    </div>
                                )}

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
                                        className="flex-1 py-3 bg-gradient-to-r from-violet-500 to-purple-600 text-white font-medium rounded-xl hover:shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2"
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
                    </>
                )}
            </AnimatePresence>
        </div>
    );
}
