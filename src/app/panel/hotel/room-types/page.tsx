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

// Available amenities
const AMENITIES = [
    { id: "wifi", label: "Ücretsiz WiFi", icon: Wifi },
    { id: "ac", label: "Klima", icon: Wind },
    { id: "tv", label: "Smart TV", icon: Tv },
    { id: "minibar", label: "Mini Bar", icon: Coffee },
    { id: "bathroom", label: "Özel Banyo", icon: Bath },
    { id: "roomservice", label: "Oda Servisi", icon: UtensilsCrossed },
];

// Bed types
const BED_TYPES = [
    "Tek Kişilik",
    "Çift Kişilik",
    "İki Tek Yatak",
    "Kral Yatak",
    "Aile Odası",
];

export default function RoomTypesPage() {
    const session = useBusinessContext();
    const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingType, setEditingType] = useState<RoomType | null>(null);
    const [saving, setSaving] = useState(false);
    const [uploadingPhoto, setUploadingPhoto] = useState(false);

    // Form state
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

    // Load room types
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
            const formData = new FormData();
            formData.append('file', file);

            const res = await fetch('/api/hotel/upload', {
                method: 'POST',
                body: formData,
            });

            const data = await res.json();
            console.log('Upload response:', data);

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

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                        Oda Türleri
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">
                        Otelinizde bulunan oda türlerini tanımlayın
                    </p>
                </div>
                <button
                    onClick={openAddModal}
                    className="flex items-center gap-2 px-4 py-2.5 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors font-medium"
                >
                    <Plus className="w-5 h-5" />
                    Oda Türü Ekle
                </button>
            </div>

            {/* Room Types Grid */}
            {roomTypes.length === 0 ? (
                <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-12 text-center">
                    <BedDouble className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                        Henüz oda türü eklenmemiş
                    </h3>
                    <p className="text-gray-500 dark:text-gray-400 mb-6">
                        Oda türleri ekleyerek müşterilerinize sunduğunuz konaklama seçeneklerini tanımlayın.
                    </p>
                    <button
                        onClick={openAddModal}
                        className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors font-medium"
                    >
                        <Plus className="w-5 h-5" />
                        İlk Oda Türünü Ekle
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {roomTypes.map((roomType) => (
                        <motion.div
                            key={roomType.id}
                            layout
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden group"
                        >
                            {/* Photo */}
                            <div className="aspect-[4/3] bg-gray-100 dark:bg-gray-800 relative">
                                {roomType.photos?.length > 0 ? (
                                    <img
                                        src={roomType.photos[0]}
                                        alt={roomType.name}
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                        <ImageIcon className="w-12 h-12 text-gray-300 dark:text-gray-600" />
                                    </div>
                                )}

                                {/* Actions overlay */}
                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                                    <button
                                        onClick={() => openEditModal(roomType)}
                                        className="p-2 bg-white rounded-xl hover:bg-gray-100 transition-colors"
                                    >
                                        <Edit className="w-5 h-5 text-gray-700" />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(roomType)}
                                        className="p-2 bg-white rounded-xl hover:bg-red-50 transition-colors"
                                    >
                                        <Trash2 className="w-5 h-5 text-red-500" />
                                    </button>
                                </div>
                            </div>

                            {/* Info */}
                            <div className="p-5">
                                <div className="flex items-start justify-between mb-3">
                                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                        {roomType.name}
                                    </h3>
                                    <span className="text-lg font-bold text-blue-500">
                                        ₺{roomType.price}
                                        <span className="text-xs text-gray-400 font-normal">/gece</span>
                                    </span>
                                </div>

                                {roomType.description && (
                                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 line-clamp-2">
                                        {roomType.description}
                                    </p>
                                )}

                                {/* Quick Info */}
                                <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400 mb-4">
                                    <span className="flex items-center gap-1">
                                        <Users className="w-4 h-4" />
                                        {roomType.capacity} Kişi
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <Maximize className="w-4 h-4" />
                                        {roomType.size} m²
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <BedDouble className="w-4 h-4" />
                                        {roomType.bedType}
                                    </span>
                                </div>

                                {/* Amenities */}
                                <div className="flex flex-wrap gap-2">
                                    {roomType.amenities?.slice(0, 4).map((amenityId) => {
                                        const amenity = AMENITIES.find(a => a.id === amenityId);
                                        if (!amenity) return null;
                                        const Icon = amenity.icon;
                                        return (
                                            <span
                                                key={amenityId}
                                                className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded-lg text-xs text-gray-600 dark:text-gray-400"
                                            >
                                                <Icon className="w-3 h-3" />
                                                {amenity.label}
                                            </span>
                                        );
                                    })}
                                    {roomType.amenities?.length > 4 && (
                                        <span className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded-lg text-xs text-gray-500">
                                            +{roomType.amenities.length - 4}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}

            {/* Add/Edit Modal */}
            <AnimatePresence>
                {isModalOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
                        onClick={() => setIsModalOpen(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
                        >
                            {/* Header */}
                            <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-800">
                                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                                    {editingType ? "Oda Türünü Düzenle" : "Yeni Oda Türü"}
                                </h2>
                                <button
                                    onClick={() => setIsModalOpen(false)}
                                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                                >
                                    <X className="w-5 h-5 text-gray-500" />
                                </button>
                            </div>

                            {/* Form */}
                            <div className="p-5 space-y-5">
                                {/* Name */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                        Oda Türü Adı *
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.name}
                                        onChange={(e) => setFormData(p => ({ ...p, name: e.target.value }))}
                                        placeholder="Örn: Standart Oda, Deluxe Suit"
                                        className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                    />
                                </div>

                                {/* Description */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                        Açıklama
                                    </label>
                                    <textarea
                                        value={formData.description}
                                        onChange={(e) => setFormData(p => ({ ...p, description: e.target.value }))}
                                        placeholder="Oda hakkında kısa açıklama..."
                                        rows={3}
                                        className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
                                    />
                                </div>

                                {/* Price & Capacity */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                            Gecelik Fiyat (₺)
                                        </label>
                                        <input
                                            type="number"
                                            value={formData.price}
                                            onChange={(e) => setFormData(p => ({ ...p, price: Number(e.target.value) }))}
                                            min={0}
                                            className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                            Kapasite (Kişi)
                                        </label>
                                        <input
                                            type="number"
                                            value={formData.capacity}
                                            onChange={(e) => setFormData(p => ({ ...p, capacity: Number(e.target.value) }))}
                                            min={1}
                                            max={10}
                                            className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                        />
                                    </div>
                                </div>

                                {/* Bed Type & Size */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                            Yatak Tipi
                                        </label>
                                        <select
                                            value={formData.bedType}
                                            onChange={(e) => setFormData(p => ({ ...p, bedType: e.target.value }))}
                                            className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                        >
                                            {BED_TYPES.map(type => (
                                                <option key={type} value={type}>{type}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                            Oda Büyüklüğü (m²)
                                        </label>
                                        <input
                                            type="number"
                                            value={formData.size}
                                            onChange={(e) => setFormData(p => ({ ...p, size: Number(e.target.value) }))}
                                            min={1}
                                            className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                        />
                                    </div>
                                </div>

                                {/* Amenities */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
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
                                                    className={`flex items-center gap-2 px-3 py-2 rounded-xl border transition-all ${isSelected
                                                        ? "bg-blue-50 dark:bg-blue-900/30 border-blue-500 text-blue-600 dark:text-blue-400"
                                                        : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300"
                                                        }`}
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

                                {/* Photos */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Fotoğraflar
                                    </label>
                                    <div className="space-y-3">
                                        <label className="flex items-center gap-2 px-4 py-3 bg-gray-50 dark:bg-gray-800 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl cursor-pointer hover:border-blue-500 transition-colors">
                                            <input
                                                type="file"
                                                accept="image/*"
                                                onChange={handlePhotoUpload}
                                                disabled={uploadingPhoto}
                                                className="hidden"
                                            />
                                            {uploadingPhoto ? (
                                                <>
                                                    <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
                                                    <span className="text-sm text-gray-600 dark:text-gray-400">Yükleniyor...</span>
                                                </>
                                            ) : (
                                                <>
                                                    <Upload className="w-5 h-5 text-gray-500" />
                                                    <span className="text-sm text-gray-600 dark:text-gray-400">Fotoğraf seç</span>
                                                </>
                                            )}
                                        </label>

                                        {formData.photos.length > 0 && (
                                            <div className="grid grid-cols-4 gap-3">
                                                {formData.photos.map((photo, index) => (
                                                    <div key={index} className="relative aspect-square rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                                                        <img
                                                            src={photo}
                                                            alt={`Fotoğraf ${index + 1}`}
                                                            className="w-full h-full object-cover"
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() => removePhoto(index)}
                                                            className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
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

                            {/* Footer */}
                            <div className="flex items-center justify-end gap-3 p-5 border-t border-gray-200 dark:border-gray-800">
                                <button
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-4 py-2.5 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors font-medium"
                                >
                                    İptal
                                </button>
                                <button
                                    onClick={handleSave}
                                    disabled={saving}
                                    className="flex items-center gap-2 px-5 py-2.5 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors font-medium disabled:opacity-50"
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
