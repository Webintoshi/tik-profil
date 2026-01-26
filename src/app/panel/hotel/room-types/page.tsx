"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Plus,
    BedDouble,
    Users,
    Maximize,
    Wifi,
    Wind,
    Tv,
    Coffee,
    Bath,
    UtensilsCrossed,
    X,
    Loader2,
    Edit,
    Trash2,
    Image as ImageIcon,
    Check,
    Upload,
} from "lucide-react";
import { toast } from "sonner";
import { useBusinessContext } from "@/components/panel/BusinessSessionContext";
import { useTheme } from "@/components/panel/ThemeProvider";
import clsx from "clsx";

interface RoomType {
    id: string;
    name: string;
    description: string;
    price: number;
    pricePerNight?: number;
    currency?: string;
    capacity: number;
    bedType: string;
    size: number;
    sizeSqm?: number;
    photos: string[];
    amenities: string[];
    images?: unknown;
    isActive?: boolean;
    order?: number;
}

const AMENITIES = [
    { id: "wifi", label: "WiFi", icon: Wifi },
    { id: "ac", label: "Klima", icon: Wind },
    { id: "tv", label: "TV", icon: Tv },
    { id: "minibar", label: "Mini Bar", icon: Coffee },
    { id: "bathroom", label: "Banyo", icon: Bath },
    { id: "roomservice", label: "Oda Servisi", icon: UtensilsCrossed },
];

const BED_TYPES = [
    "Tek Kişilik",
    "Çift Kişilik",
    "İki Tek Yatak",
    "Kral Yatak",
    "Aile Odası",
];

export default function RoomTypesPage() {
    const { isDark } = useTheme();
    const session = useBusinessContext();
    const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingType, setEditingType] = useState<RoomType | null>(null);
    const [saving, setSaving] = useState(false);
    const [uploadingPhoto, setUploadingPhoto] = useState(false);

    const [formData, setFormData] = useState({
        name: "",
        description: "",
        price: 0,
        capacity: 2,
        bedType: "Çift Kişilik",
        size: 25,
        amenities: ["wifi", "ac", "tv", "bathroom"],
        photos: [] as string[],
    });

    const loadRoomTypes = useCallback(async () => {
        if (!session?.businessId) return;

        try {
            const res = await fetch(`/api/hotel/room-types?businessId=${session.businessId}`);
            const data = await res.json();
            if (data.success) {
                setRoomTypes(data.roomTypes || []);
            }
        } catch (error) {
            console.error("Error loading room types:", error);
        } finally {
            setLoading(false);
        }
    }, [session?.businessId]);

    useEffect(() => {
        loadRoomTypes();
    }, [loadRoomTypes]);

    const openAddModal = () => {
        setEditingType(null);
        setFormData({
            name: "",
            description: "",
            price: 0,
            capacity: 2,
            bedType: "Çift Kişilik",
            size: 25,
            amenities: ["wifi", "ac", "tv", "bathroom"],
            photos: [],
        });
        setIsModalOpen(true);
    };

    const openEditModal = (roomType: RoomType) => {
        setEditingType(roomType);
        setFormData({
            name: roomType.name,
            description: roomType.description,
            price: roomType.price,
            capacity: roomType.capacity,
            bedType: roomType.bedType,
            size: roomType.size,
            amenities: roomType.amenities,
            photos: roomType.photos || [],
        });
        setIsModalOpen(true);
    };

    const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploadingPhoto(true);
        try {
            const uploadData = new FormData();
            uploadData.append('file', file);

            const res = await fetch('/api/hotel/upload', {
                method: 'POST',
                body: uploadData,
            });

            const data = await res.json();

            if (data.success && (data.imageUrl || data.url)) {
                const imageUrl = data.imageUrl || data.url;
                setFormData(prev => ({
                    ...prev,
                    photos: [...prev.photos, imageUrl],
                }));
                toast.success('Fotoğraf yüklendi');
            } else {
                toast.error(data.error || 'Yükleme hatası');
            }
        } catch (error) {
            console.error('Photo upload error:', error);
            toast.error('Yükleme hatası');
        } finally {
            setUploadingPhoto(false);
        }
    };

    const removePhoto = (index: number) => {
        setFormData(prev => ({
            ...prev,
            photos: prev.photos.filter((_, i) => i !== index),
        }));
    };

    const toggleAmenity = (amenityId: string) => {
        setFormData(prev => ({
            ...prev,
            amenities: prev.amenities.includes(amenityId)
                ? prev.amenities.filter(a => a !== amenityId)
                : [...prev.amenities, amenityId],
        }));
    };

    const handleSave = async () => {
        if (!formData.name.trim()) {
            toast.error("Oda türü adı gerekli");
            return;
        }

        setSaving(true);
        try {
            const url = editingType
                ? `/api/hotel/room-types/${editingType.id}`
                : "/api/hotel/room-types";

            const method = editingType ? "PUT" : "POST";

            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...formData,
                    businessId: session?.businessId,
                    images: formData.photos,
                }),
            });

            const data = await res.json();

            if (data.success) {
                toast.success(editingType ? "Oda türü güncellendi" : "Oda türü eklendi");
                setIsModalOpen(false);
                loadRoomTypes();
            } else {
                toast.error(data.error || "Bir hata oluştu");
            }
        } catch (error) {
            console.error("Save error:", error);
            toast.error("Kaydetme hatası");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (roomType: RoomType) => {
        if (!confirm(`"${roomType.name}" oda türünü silmek istediğinize emin misiniz?`)) {
            return;
        }

        try {
            const res = await fetch(`/api/hotel/room-types/${roomType.id}`, {
                method: "DELETE",
            });

            const data = await res.json();

            if (data.success) {
                toast.success("Oda türü silindi");
                loadRoomTypes();
            } else {
                toast.error(data.error || "Silme hatası");
            }
        } catch (error) {
            console.error("Delete error:", error);
            toast.error("Silme hatası");
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
        );
    }

    const cardBg = isDark ? "bg-[#111]" : "bg-white";
    const borderColor = isDark ? "border-[#222]" : "border-slate-200/60";
    const textPrimary = isDark ? "text-white" : "text-slate-900";
    const textSecondary = isDark ? "text-gray-400" : "text-slate-500";
    const inputBg = isDark ? "bg-[#0a0a0a] border-[#222]" : "bg-slate-50 border-slate-200";
    const buttonBg = isDark ? "bg-[#1a1a1a] hover:bg-[#252525]" : "bg-slate-900 hover:bg-slate-800";
    const buttonDisabledBg = isDark ? "bg-white/5 hover:bg-white/10" : "bg-slate-100 hover:bg-slate-200";
    const labelColor = isDark ? "text-gray-300" : "text-slate-700";
    const iconColor = isDark ? "text-gray-400" : "text-slate-300";

    return (
        <div className="min-h-screen p-4 md:p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className={clsx("text-2xl md:text-3xl font-bold", textPrimary)}>
                        Oda Türleri
                    </h1>
                    <p className={clsx("text-sm md:text-base", textSecondary)}>
                        Otelinizde bulunan oda türlerini tanımlayın
                    </p>
                </div>
                <button
                    onClick={openAddModal}
                    className={clsx("flex items-center gap-2 px-5 py-3 text-white rounded-xl transition-colors font-semibold text-sm", buttonBg)}
                >
                    <Plus className="w-4 h-4" />
                    Oda Türü Ekle
                </button>
            </div>

            {roomTypes.length === 0 ? (
                <div className={clsx("rounded-2xl border p-16 text-center", cardBg, borderColor)}>
                    <BedDouble className={clsx("w-16 h-16 mx-auto mb-4", iconColor)} />
                    <h3 className={clsx("text-lg font-semibold mb-2", textPrimary)}>
                        Henüz oda türü eklenmemiş
                    </h3>
                    <p className={clsx("text-sm mb-6 max-w-md mx-auto", textSecondary)}>
                        Oda türleri ekleyerek müşterilerinize sunduğunuz konaklama seçeneklerini tanımlayın.
                    </p>
                    <button
                        onClick={openAddModal}
                        className={clsx("inline-flex items-center gap-2 px-5 py-3 text-white rounded-xl transition-colors font-semibold text-sm", buttonBg)}
                    >
                        <Plus className="w-4 h-4" />
                        İlk Oda Türünü Ekle
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {roomTypes.map((roomType) => (
                        <motion.div
                            key={roomType.id}
                            layout
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className={clsx("rounded-2xl border overflow-hidden group hover:shadow-lg transition-all duration-200", cardBg, borderColor)}
                        >
                            <div className={clsx("aspect-[4/3] relative", isDark ? "bg-[#0a0a0a]" : "bg-slate-50")}>
                                {roomType.photos?.length > 0 ? (
                                    <img
                                        src={roomType.photos[0]}
                                        alt={roomType.name}
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                        <ImageIcon className={clsx("w-12 h-12", iconColor)} />
                                    </div>
                                )}

                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                                    <button
                                        onClick={() => openEditModal(roomType)}
                                        className="p-2.5 bg-white rounded-xl hover:bg-slate-50 transition-colors"
                                    >
                                        <Edit className="w-5 h-5 text-slate-700" />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(roomType)}
                                        className="p-2.5 bg-white rounded-xl hover:bg-red-50 transition-colors"
                                    >
                                        <Trash2 className="w-5 h-5 text-red-500" />
                                    </button>
                                </div>
                            </div>

                            <div className="p-5">
                                <div className="flex items-start justify-between mb-3">
                                    <h3 className={clsx("text-lg font-semibold", textPrimary)}>
                                        {roomType.name}
                                    </h3>
                                    <span className={clsx("text-lg font-semibold", textPrimary)}>
                                        ₺{roomType.price}
                                        <span className={clsx("text-xs font-normal ml-1", isDark ? "text-gray-400" : "text-slate-400")}>/gece</span>
                                    </span>
                                </div>

                                {roomType.description && (
                                    <p className={clsx("text-sm mb-4 line-clamp-2 leading-relaxed", textSecondary)}>
                                        {roomType.description}
                                    </p>
                                )}

                                <div className={clsx("flex items-center gap-4 text-sm mb-4", textSecondary)}>
                                    <span className="flex items-center gap-1.5">
                                        <Users className="w-4 h-4" />
                                        {roomType.capacity} Kişi
                                    </span>
                                    <span className="flex items-center gap-1.5">
                                        <Maximize className="w-4 h-4" />
                                        {roomType.size} m²
                                    </span>
                                    <span className="flex items-center gap-1.5">
                                        <BedDouble className="w-4 h-4" />
                                        {roomType.bedType}
                                    </span>
                                </div>

                                <div className="flex flex-wrap gap-2">
                                    {roomType.amenities?.slice(0, 4).map((amenityId) => {
                                        const amenity = AMENITIES.find(a => a.id === amenityId);
                                        if (!amenity) return null;
                                        const Icon = amenity.icon;
                                        return (
                                            <span
                                                key={amenityId}
                                                className={clsx("inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs", isDark ? "bg-[#1a1a1a] text-gray-400" : "bg-slate-50 text-slate-600")}
                                            >
                                                <Icon className="w-3.5 h-3.5" />
                                                {amenity.label}
                                            </span>
                                        );
                                    })}
                                    {roomType.amenities?.length > 4 && (
                                        <span className={clsx("px-2.5 py-1.5 rounded-lg text-xs", isDark ? "bg-[#1a1a1a] text-gray-500" : "bg-slate-50 text-slate-500")}>
                                            +{roomType.amenities.length - 4}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}

            <AnimatePresence>
                {isModalOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4"
                        onClick={() => setIsModalOpen(false)}
                    >
                        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                            className={clsx("relative w-full max-w-lg rounded-3xl shadow-2xl max-h-[90vh] overflow-y-auto", cardBg, borderColor)}
                        >
                            <div className={clsx("flex items-center justify-between p-5 border-b", borderColor)}>
                                <h2 className={clsx("text-lg font-semibold", textPrimary)}>
                                    {editingType ? "Oda Türünü Düzenle" : "Yeni Oda Türü"}
                                </h2>
                                <button
                                    onClick={() => setIsModalOpen(false)}
                                    className="p-2 hover:bg-gray-500/10 rounded-full transition-colors"
                                >
                                    <X className="w-5 h-5 text-gray-500" />
                                </button>
                            </div>

                            <div className="p-5 space-y-4">
                                <div>
                                    <label className={clsx("block text-sm font-medium mb-1.5", labelColor)}>
                                        Oda Türü Adı *
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.name}
                                        onChange={(e) => setFormData(p => ({ ...p, name: e.target.value }))}
                                        placeholder="Örn: Standart Oda, Deluxe Suit"
                                        className={clsx("w-full px-4 py-3.5 rounded-xl border-2 text-base font-medium transition-colors focus:outline-none focus:border-blue-500", inputBg, textPrimary)}
                                    />
                                </div>

                                <div>
                                    <label className={clsx("block text-sm font-medium mb-1.5", labelColor)}>
                                        Açıklama
                                    </label>
                                    <textarea
                                        value={formData.description}
                                        onChange={(e) => setFormData(p => ({ ...p, description: e.target.value }))}
                                        placeholder="Oda hakkında kısa açıklama..."
                                        rows={3}
                                        className={clsx("w-full px-4 py-3.5 rounded-xl border-2 text-base font-medium transition-colors focus:outline-none focus:border-blue-500 resize-none", inputBg, textPrimary)}
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className={clsx("block text-sm font-medium mb-1.5", labelColor)}>
                                            Gecelik Fiyat (₺)
                                        </label>
                                        <input
                                            type="number"
                                            value={formData.price}
                                            onChange={(e) => setFormData(p => ({ ...p, price: Number(e.target.value) }))}
                                            min={0}
                                            className={clsx("w-full px-4 py-3.5 rounded-xl border-2 text-base font-medium transition-colors focus:outline-none focus:border-blue-500", inputBg, textPrimary)}
                                        />
                                    </div>
                                    <div>
                                        <label className={clsx("block text-sm font-medium mb-1.5", labelColor)}>
                                            Kapasite (Kişi)
                                        </label>
                                        <input
                                            type="number"
                                            value={formData.capacity}
                                            onChange={(e) => setFormData(p => ({ ...p, capacity: Number(e.target.value) }))}
                                            min={1}
                                            max={10}
                                            className={clsx("w-full px-4 py-3.5 rounded-xl border-2 text-base font-medium transition-colors focus:outline-none focus:border-blue-500", inputBg, textPrimary)}
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className={clsx("block text-sm font-medium mb-1.5", labelColor)}>
                                            Yatak Tipi
                                        </label>
                                        <select
                                            value={formData.bedType}
                                            onChange={(e) => setFormData(p => ({ ...p, bedType: e.target.value }))}
                                            className={clsx("w-full px-4 py-3.5 rounded-xl border-2 text-base font-medium transition-colors focus:outline-none focus:border-blue-500", inputBg, textPrimary)}
                                        >
                                            {BED_TYPES.map(type => (
                                                <option key={type} value={type}>{type}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className={clsx("block text-sm font-medium mb-1.5", labelColor)}>
                                            Oda Büyüklüğü (m²)
                                        </label>
                                        <input
                                            type="number"
                                            value={formData.size}
                                            onChange={(e) => setFormData(p => ({ ...p, size: Number(e.target.value) }))}
                                            min={1}
                                            className={clsx("w-full px-4 py-3.5 rounded-xl border-2 text-base font-medium transition-colors focus:outline-none focus:border-blue-500", inputBg, textPrimary)}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className={clsx("block text-sm font-medium mb-2", labelColor)}>
                                        Oda Özellikleri
                                    </label>
                                    <div className="grid grid-cols-2 gap-2">
                                        {AMENITIES.map((amenity) => {
                                            const Icon = amenity.icon;
                                            const isSelected = formData.amenities.includes(amenity.id);
                                            return (
                                                <button
                                                    key={amenity.id}
                                                    type="button"
                                                    onClick={() => toggleAmenity(amenity.id)}
                                                    className={clsx("flex items-center gap-2 px-3 py-2 rounded-xl border-2 transition-all", isSelected ? "bg-blue-500 border-blue-500 text-white" : isDark ? "border-[#222] text-gray-400 hover:border-[#333]" : "border-slate-200 text-slate-600 hover:border-slate-300")}
                                                >
                                                    {isSelected ? (
                                                        <Check className="w-4 h-4" />
                                                    ) : (
                                                        <Icon className="w-4 h-4" />
                                                    )}
                                                    <span className="text-sm">{amenity.label}</span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                <div>
                                    <label className={clsx("block text-sm font-medium mb-2", labelColor)}>
                                        Fotoğraflar
                                    </label>
                                    <div className="space-y-3">
                                        <label className={clsx("flex items-center gap-2 px-4 py-3 border-2 border-dashed rounded-xl cursor-pointer transition-colors", isDark ? "border-[#222] hover:border-[#333]" : "border-slate-300 hover:border-slate-400")}>
                                            <input
                                                type="file"
                                                accept="image/*"
                                                onChange={handlePhotoUpload}
                                                disabled={uploadingPhoto}
                                                className="hidden"
                                            />
                                            {uploadingPhoto ? (
                                                <>
                                                    <Loader2 className={clsx("w-5 h-5 animate-spin", iconColor)} />
                                                    <span className={clsx("text-sm", textSecondary)}>Yükleniyor...</span>
                                                </>
                                            ) : (
                                                <>
                                                    <Upload className={clsx("w-5 h-5", iconColor)} />
                                                    <span className={clsx("text-sm", textSecondary)}>Fotoğraf seç</span>
                                                </>
                                            )}
                                        </label>

                                        {formData.photos.length > 0 && (
                                            <div className="grid grid-cols-4 gap-3">
                                                {formData.photos.map((photo, index) => (
                                                    <div key={index} className={clsx("relative aspect-square rounded-lg overflow-hidden border", borderColor)}>
                                                        <img
                                                            src={photo}
                                                            alt={`Fotoğraf ${index + 1}`}
                                                            className="w-full h-full object-cover"
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() => removePhoto(index)}
                                                            className="absolute top-1 right-1 p-1 bg-slate-900 text-white rounded-full hover:bg-slate-800 transition-colors"
                                                        >
                                                            <X className="w-3 h-3" />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className={clsx("flex items-center justify-end gap-3 p-5 border-t", borderColor)}>
                                <button
                                    onClick={() => setIsModalOpen(false)}
                                    className={clsx("px-4 py-3.5 rounded-xl font-semibold text-sm transition-colors", buttonDisabledBg, isDark ? "text-gray-300" : "text-slate-600")}
                                >
                                    İptal
                                </button>
                                <button
                                    onClick={handleSave}
                                    disabled={saving}
                                    className="flex items-center gap-2 px-5 py-3.5 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors font-semibold disabled:opacity-50"
                                >
                                    {saving ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <Check className="w-4 h-4" />
                                    )}
                                    {editingType ? "Güncelle" : "Kaydet"}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
