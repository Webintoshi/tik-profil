"use client";

import { useState, useEffect, useRef } from "react";
import { useBusinessSession } from "@/hooks/useBusinessSession";
import { useTheme } from "@/components/panel/ThemeProvider";
import { motion, AnimatePresence } from "framer-motion";
import {
    Plus, Calendar, Clock, MapPin, Trash2, Edit,
    X, Loader2, Image as ImageIcon, PartyPopper,
    ToggleLeft, ToggleRight
} from "lucide-react";
import clsx from "clsx";
import { toast } from "sonner";
import {
    getEvents, createEvent, updateEvent, deleteEvent, toggleEventStatus,
    FBEvent
} from "@/lib/services/eventService";
import { uploadImageWithFallback } from "@/lib/clientUpload";

export default function EventsPage() {
    const { session } = useBusinessSession();
    const { isDark } = useTheme();
    const [events, setEvents] = useState<FBEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingEvent, setEditingEvent] = useState<FBEvent | null>(null);
    const [saving, setSaving] = useState(false);

    // Form state
    const [formData, setFormData] = useState({
        title: "",
        description: "",
        image: "",
        date: "",
        start_time: "",
        end_time: "",
        location: "",
    });

    const fileInputRef = useRef<HTMLInputElement>(null);

    // Theme colors
    const cardBg = isDark ? "bg-[#111]" : "bg-white";
    const borderColor = isDark ? "border-[#222]" : "border-gray-200";
    const textPrimary = isDark ? "text-white" : "text-gray-900";
    const textSecondary = isDark ? "text-gray-400" : "text-gray-600";
    const inputBg = isDark ? "bg-[#0a0a0a] border-[#333]" : "bg-white border-gray-300";

    // Load events
    useEffect(() => {
        if (!session?.businessId) return;

        const loadEvents = async () => {
            setLoading(true);
            try {
                const data = await getEvents(session.businessId);
                setEvents(data);
            } catch (error) {
                console.error("Error loading events:", error);
                toast.error("Etkinlikler yüklenirken hata oluştu");
            }
            setLoading(false);
        };

        loadEvents();
    }, [session?.businessId]);

    // Open modal for new event
    const handleNewEvent = () => {
        setEditingEvent(null);
        setFormData({
            title: "",
            description: "",
            image: "",
            date: "",
            start_time: "",
            end_time: "",
            location: "",
        });
        setShowModal(true);
    };

    // Open modal for editing
    const handleEditEvent = (event: FBEvent) => {
        setEditingEvent(event);
        setFormData({
            title: event.title,
            description: event.description || "",
            image: event.image || "",
            date: event.date,
            start_time: event.start_time,
            end_time: event.end_time || "",
            location: event.location || "",
        });
        setShowModal(true);
    };

    // Handle image upload - Base64
    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 5 * 1024 * 1024) {
            toast.error("Dosya boyutu 5MB'dan k??????k olmal??");
            return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
            setFormData(prev => ({ ...prev, image: event.target?.result as string }));
            toast.success("G??rsel y??klendi");
        };
        reader.readAsDataURL(file);

        try {
            const { url } = await uploadImageWithFallback({
                file,
                moduleName: "events",
            });

            if (url) {
                setFormData(prev => ({ ...prev, image: url }));
            }
        } catch {
            toast.error("Y??kleme hatas??");
        }
    };

    // Save event
    const handleSave = async () => {
        if (!session?.businessId || !formData.title || !formData.date || !formData.start_time) {
            toast.error("Lütfen zorunlu alanları doldurun");
            return;
        }

        setSaving(true);
        try {
            if (editingEvent) {
                await updateEvent(editingEvent.id, {
                    ...formData,
                    business_id: session.businessId,
                    is_active: editingEvent.is_active,
                });
                setEvents(prev => prev.map(e =>
                    e.id === editingEvent.id ? { ...e, ...formData } : e
                ));
                toast.success("Etkinlik güncellendi");
            } else {
                const newId = await createEvent({
                    ...formData,
                    business_id: session.businessId,
                    is_active: true,
                });
                const newEvent: FBEvent = {
                    id: newId,
                    ...formData,
                    business_id: session.businessId,
                    is_active: true,
                    created_at: new Date(),
                };
                setEvents(prev => [...prev, newEvent]);
                toast.success("Etkinlik oluşturuldu");
            }
            setShowModal(false);
        } catch (error) {
            toast.error("Kayıt sırasında hata oluştu");
        }
        setSaving(false);
    };

    // Delete event
    const handleDelete = async (eventId: string) => {
        if (!confirm("Bu etkinliği silmek istediğinize emin misiniz?")) return;

        try {
            await deleteEvent(eventId);
            setEvents(prev => prev.filter(e => e.id !== eventId));
            toast.success("Etkinlik silindi");
        } catch (error) {
            toast.error("Silme işlemi başarısız");
        }
    };

    // Toggle active status
    const handleToggleStatus = async (event: FBEvent) => {
        try {
            await toggleEventStatus(event.id, !event.is_active);
            setEvents(prev => prev.map(e =>
                e.id === event.id ? { ...e, is_active: !e.is_active } : e
            ));
            toast.success(event.is_active ? "Etkinlik pasife alındı" : "Etkinlik aktifleştirildi");
        } catch (error) {
            toast.error("Durum değişikliği başarısız");
        }
    };

    // Format date for display
    const formatDate = (dateStr: string) => {
        try {
            return new Intl.DateTimeFormat("tr-TR", {
                weekday: "short",
                day: "numeric",
                month: "long",
                year: "numeric",
            }).format(new Date(dateStr));
        } catch {
            return dateStr;
        }
    };

    // Check if event is past
    const isPastEvent = (dateStr: string) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return new Date(dateStr) < today;
    };

    return (
        <div className="min-h-screen p-4 md:p-6">
            {/* Header */}
            <div className="max-w-4xl mx-auto mb-8">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <PartyPopper className="w-8 h-8 text-purple-500" />
                        <div>
                            <h1 className={clsx("text-2xl font-bold", textPrimary)}>Etkinlikler</h1>
                            <p className={textSecondary}>Özel etkinliklerinizi yönetin</p>
                        </div>
                    </div>
                    <button
                        onClick={handleNewEvent}
                        className="flex items-center gap-2 px-5 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-semibold transition-colors shadow-lg shadow-purple-600/25"
                    >
                        <Plus className="w-5 h-5" />
                        Yeni Etkinlik
                    </button>
                </div>
            </div>

            {/* Events Grid */}
            <div className="max-w-4xl mx-auto">
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
                    </div>
                ) : events.length === 0 ? (
                    <div className={clsx("text-center py-20 rounded-2xl border", cardBg, borderColor)}>
                        <PartyPopper className={clsx("w-16 h-16 mx-auto mb-4", textSecondary)} />
                        <h3 className={clsx("text-lg font-semibold mb-2", textPrimary)}>Henüz etkinlik yok</h3>
                        <p className={clsx("mb-6", textSecondary)}>İlk etkinliğinizi oluşturun</p>
                        <button
                            onClick={handleNewEvent}
                            className="px-6 py-3 bg-purple-600 text-white rounded-xl font-semibold hover:bg-purple-700 transition-colors"
                        >
                            Etkinlik Ekle
                        </button>
                    </div>
                ) : (
                    <div className="grid gap-4">
                        {events.map(event => (
                            <motion.div
                                key={event.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className={clsx(
                                    "rounded-2xl border overflow-hidden transition-all",
                                    cardBg,
                                    event.is_active ? borderColor : "border-gray-300 dark:border-gray-700 opacity-60"
                                )}
                            >
                                <div className="flex flex-col sm:flex-row">
                                    {/* Event Image */}
                                    <div className={clsx(
                                        "w-full sm:w-40 h-40 flex-shrink-0",
                                        isDark ? "bg-[#0a0a0a]" : "bg-gray-100"
                                    )}>
                                        {event.image ? (
                                            <img
                                                src={event.image}
                                                alt={event.title}
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center">
                                                <PartyPopper className={clsx("w-12 h-12", textSecondary)} />
                                            </div>
                                        )}
                                    </div>

                                    {/* Event Details */}
                                    <div className="flex-1 p-5">
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <h3 className={clsx("font-bold text-lg", textPrimary)}>
                                                    {event.title}
                                                </h3>
                                                {event.description && (
                                                    <p className={clsx("text-sm mt-1 line-clamp-2", textSecondary)}>
                                                        {event.description}
                                                    </p>
                                                )}
                                            </div>

                                            {/* Status Badge */}
                                            <span className={clsx(
                                                "px-3 py-1 rounded-full text-xs font-medium flex-shrink-0",
                                                isPastEvent(event.date)
                                                    ? isDark ? "bg-gray-800 text-gray-400" : "bg-gray-100 text-gray-500"
                                                    : event.is_active
                                                        ? isDark ? "bg-green-900/30 text-green-400" : "bg-green-100 text-green-600"
                                                        : isDark ? "bg-gray-800 text-gray-400" : "bg-gray-100 text-gray-500"
                                            )}>
                                                {isPastEvent(event.date) ? "Geçmiş" : event.is_active ? "Aktif" : "Pasif"}
                                            </span>
                                        </div>

                                        <div className={clsx("flex flex-wrap gap-4 mt-4 text-sm", textSecondary)}>
                                            <div className="flex items-center gap-1">
                                                <Calendar className="w-4 h-4" />
                                                {formatDate(event.date)}
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <Clock className="w-4 h-4" />
                                                {event.start_time}{event.end_time && ` - ${event.end_time}`}
                                            </div>
                                            {event.location && (
                                                <div className="flex items-center gap-1">
                                                    <MapPin className="w-4 h-4" />
                                                    {event.location}
                                                </div>
                                            )}
                                        </div>

                                        {/* Actions */}
                                        <div className="flex items-center gap-2 mt-4">
                                            <button
                                                onClick={() => handleToggleStatus(event)}
                                                className={clsx(
                                                    "p-2 rounded-lg transition-colors",
                                                    event.is_active
                                                        ? "text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20"
                                                        : "text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                                                )}
                                            >
                                                {event.is_active ? (
                                                    <ToggleRight className="w-5 h-5" />
                                                ) : (
                                                    <ToggleLeft className="w-5 h-5" />
                                                )}
                                            </button>
                                            <button
                                                onClick={() => handleEditEvent(event)}
                                                className="p-2 rounded-lg text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                                            >
                                                <Edit className="w-5 h-5" />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(event.id)}
                                                className="p-2 rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                            >
                                                <Trash2 className="w-5 h-5" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>

            {/* Event Modal */}
            <AnimatePresence>
                {showModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
                        onClick={() => setShowModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                            className={clsx("rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto", cardBg)}
                        >
                            {/* Modal Header */}
                            <div className={clsx("flex items-center justify-between p-5 border-b", borderColor)}>
                                <h2 className={clsx("text-xl font-bold", textPrimary)}>
                                    {editingEvent ? "Etkinliği Düzenle" : "Yeni Etkinlik"}
                                </h2>
                                <button
                                    onClick={() => setShowModal(false)}
                                    className={clsx("p-2 rounded-lg transition-colors", isDark ? "hover:bg-white/10" : "hover:bg-gray-100")}
                                >
                                    <X className="w-5 h-5 text-gray-500" />
                                </button>
                            </div>

                            {/* Modal Body */}
                            <div className="p-5 space-y-4">
                                {/* Image Upload */}
                                <div>
                                    <label className={clsx("block text-sm font-medium mb-2", textSecondary)}>Görsel</label>
                                    <div
                                        onClick={() => fileInputRef.current?.click()}
                                        className={clsx(
                                            "aspect-video rounded-xl border-2 border-dashed flex items-center justify-center cursor-pointer transition-colors overflow-hidden",
                                            isDark
                                                ? "border-gray-700 hover:border-purple-500"
                                                : "border-gray-300 hover:border-purple-400",
                                            formData.image && "border-solid"
                                        )}
                                    >
                                        {formData.image ? (
                                            <div className="relative w-full h-full">
                                                <img src={formData.image} className="w-full h-full object-cover" alt="Preview" />
                                                <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                                                    <span className="text-white font-medium">Değiştir</span>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className={clsx("text-center", textSecondary)}>
                                                <div className={clsx("w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-2", isDark ? "bg-purple-500/10" : "bg-purple-100")}>
                                                    <ImageIcon className="w-7 h-7 text-purple-500" />
                                                </div>
                                                <p className={clsx("font-medium", textPrimary)}>Görsel Yükle</p>
                                                <p className="text-sm">PNG, JPG veya WEBP</p>
                                            </div>
                                        )}
                                    </div>
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={handleImageUpload}
                                    />
                                </div>

                                {/* Title */}
                                <div>
                                    <label className={clsx("block text-sm font-medium mb-2", textSecondary)}>
                                        Etkinlik Adı <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.title}
                                        onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                                        placeholder="Örn: Canlı Müzik Gecesi"
                                        className={clsx(
                                            "w-full px-4 py-3 rounded-xl border-2 focus:outline-none focus:border-purple-500 transition-colors",
                                            inputBg, textPrimary
                                        )}
                                    />
                                </div>

                                {/* Description */}
                                <div>
                                    <label className={clsx("block text-sm font-medium mb-2", textSecondary)}>
                                        Açıklama
                                    </label>
                                    <textarea
                                        value={formData.description}
                                        onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                                        placeholder="Etkinlik hakkında detaylar..."
                                        rows={3}
                                        className={clsx(
                                            "w-full px-4 py-3 rounded-xl border-2 focus:outline-none focus:border-purple-500 transition-colors resize-none",
                                            inputBg, textPrimary
                                        )}
                                    />
                                </div>

                                {/* Date & Time */}
                                <div className="grid grid-cols-3 gap-3">
                                    <div>
                                        <label className={clsx("block text-sm font-medium mb-2", textSecondary)}>
                                            Tarih <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="date"
                                            value={formData.date}
                                            onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                                            className={clsx(
                                                "w-full px-4 py-3 rounded-xl border-2 focus:outline-none focus:border-purple-500 transition-colors cursor-pointer",
                                                inputBg, textPrimary
                                            )}
                                        />
                                    </div>
                                    <div>
                                        <label className={clsx("block text-sm font-medium mb-2", textSecondary)}>
                                            Başlangıç <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="time"
                                            value={formData.start_time}
                                            onChange={(e) => setFormData(prev => ({ ...prev, start_time: e.target.value }))}
                                            className={clsx(
                                                "w-full px-4 py-3 rounded-xl border-2 focus:outline-none focus:border-purple-500 transition-colors cursor-pointer",
                                                inputBg, textPrimary
                                            )}
                                        />
                                    </div>
                                    <div>
                                        <label className={clsx("block text-sm font-medium mb-2", textSecondary)}>Bitiş</label>
                                        <input
                                            type="time"
                                            value={formData.end_time}
                                            onChange={(e) => setFormData(prev => ({ ...prev, end_time: e.target.value }))}
                                            className={clsx(
                                                "w-full px-4 py-3 rounded-xl border-2 focus:outline-none focus:border-purple-500 transition-colors cursor-pointer",
                                                inputBg, textPrimary
                                            )}
                                        />
                                    </div>
                                </div>

                                {/* Location */}
                                <div>
                                    <label className={clsx("block text-sm font-medium mb-2", textSecondary)}>Konum</label>
                                    <input
                                        type="text"
                                        value={formData.location}
                                        onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                                        placeholder="Örn: Ana Salon, Teras"
                                        className={clsx(
                                            "w-full px-4 py-3 rounded-xl border-2 focus:outline-none focus:border-purple-500 transition-colors",
                                            inputBg, textPrimary
                                        )}
                                    />
                                </div>
                            </div>

                            {/* Modal Footer */}
                            <div className={clsx("p-5 border-t flex gap-3", borderColor)}>
                                <button
                                    onClick={() => setShowModal(false)}
                                    className={clsx(
                                        "flex-1 py-3 rounded-xl font-semibold transition-colors",
                                        isDark
                                            ? "bg-white/5 hover:bg-white/10 text-gray-300"
                                            : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                                    )}
                                >
                                    İptal
                                </button>
                                <button
                                    onClick={handleSave}
                                    disabled={saving || !formData.title || !formData.date || !formData.start_time}
                                    className="flex-1 py-3 rounded-xl bg-purple-600 text-white font-semibold hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    {saving ? (
                                        <>
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                            Kaydediliyor...
                                        </>
                                    ) : (
                                        editingEvent ? "Güncelle" : "Oluştur"
                                    )}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
