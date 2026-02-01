"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Plus,
    LayoutGrid,
    QrCode,
    X,
    Loader2,
    Edit,
    Trash2,
    Check,
    Users,
    CheckCircle,
    Clock,
    Sparkles,
    Wrench,
    Download,
} from "lucide-react";
import { toast } from "sonner";
import { useBusinessContext } from "@/components/panel/BusinessSessionContext";
import { useTheme } from "@/components/panel/ThemeProvider";
import clsx from "clsx";

// Room interface
interface HotelRoom {
    id: string;
    roomNumber: string;
    roomTypeId: string;
    roomTypeName?: string;
    floor: number;
    status: "available" | "occupied" | "cleaning" | "maintenance";
    currentGuestName?: string;
    checkInDate?: string;
    checkOutDate?: string;
    qrCode?: string;
}

// Room type for dropdown
interface RoomType {
    id: string;
    name: string;
}

// Status configs
const STATUS_CONFIG = {
    available: { label: "Boş", color: "bg-green-500", icon: CheckCircle, textColor: "text-green-600" },
    occupied: { label: "Dolu", color: "bg-red-500", icon: Users, textColor: "text-red-600" },
    cleaning: { label: "Temizleniyor", color: "bg-yellow-500", icon: Sparkles, textColor: "text-yellow-600" },
    maintenance: { label: "Bakımda", color: "bg-gray-500", icon: Wrench, textColor: "text-gray-600" },
};

export default function RoomsPage() {
    const { isDark } = useTheme();
    const session = useBusinessContext();
    const [rooms, setRooms] = useState<HotelRoom[]>([]);
    const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingRoom, setEditingRoom] = useState<HotelRoom | null>(null);
    const [saving, setSaving] = useState(false);
    const [qrModalRoom, setQrModalRoom] = useState<HotelRoom | null>(null);

    // Form state
    const [formData, setFormData] = useState({
        roomNumber: "",
        roomTypeId: "",
        floor: 1,
        status: "available" as HotelRoom["status"],
    });

    // Theme colors
    const cardBg = isDark ? "bg-[#111]" : "bg-white";
    const borderColor = isDark ? "border-[#222]" : "border-gray-200";
    const textPrimary = isDark ? "text-white" : "text-gray-900";
    const textSecondary = isDark ? "text-gray-400" : "text-gray-600";
    const inputBg = isDark ? "bg-[#0a0a0a] border-[#222]" : "bg-gray-50 border-gray-200";

    // Load rooms and room types
    const loadData = useCallback(async () => {
        if (!session?.businessId) return;

        try {
            const [roomsRes, typesRes] = await Promise.all([
                fetch(`/api/hotel/rooms?businessId=${session.businessId}`),
                fetch(`/api/hotel/room-types?businessId=${session.businessId}`),
            ]);

            const roomsData = await roomsRes.json();
            const typesData = await typesRes.json();

            if (roomsData.success) {
                // Enrich rooms with room type names
                const enrichedRooms = (roomsData.rooms || []).map((room: HotelRoom) => {
                    const roomType = (typesData.roomTypes || []).find((t: RoomType) => t.id === room.roomTypeId);
                    return { ...room, roomTypeName: roomType?.name || "Belirtilmemiş" };
                });
                setRooms(enrichedRooms);
            }

            if (typesData.success) {
                setRoomTypes(typesData.roomTypes || []);
            }
        } catch (error) {
            console.error("Error loading data:", error);
        } finally {
            setLoading(false);
        }
    }, [session?.businessId]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const openAddModal = () => {
        setEditingRoom(null);
        setFormData({
            roomNumber: "",
            roomTypeId: roomTypes[0]?.id || "",
            floor: 1,
            status: "available",
        });
        setIsModalOpen(true);
    };

    const openEditModal = (room: HotelRoom) => {
        setEditingRoom(room);
        setFormData({
            roomNumber: room.roomNumber,
            roomTypeId: room.roomTypeId,
            floor: room.floor,
            status: room.status,
        });
        setIsModalOpen(true);
    };

    const handleSave = async () => {
        if (!formData.roomNumber.trim()) {
            toast.error("Oda numarası gerekli");
            return;
        }

        setSaving(true);
        try {
            const url = editingRoom
                ? `/api/hotel/rooms/${editingRoom.id}`
                : "/api/hotel/rooms";

            const method = editingRoom ? "PUT" : "POST";

            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...formData,
                    businessId: session?.businessId,
                }),
            });

            const data = await res.json();

            if (data.success) {
                toast.success(editingRoom ? "Oda güncellendi" : "Oda eklendi");
                setIsModalOpen(false);
                loadData();
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

    const handleStatusChange = async (room: HotelRoom, newStatus: HotelRoom["status"]) => {
        try {
            const res = await fetch(`/api/hotel/rooms/${room.id}/status`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: newStatus }),
            });

            const data = await res.json();

            if (data.success) {
                toast.success(`Oda ${room.roomNumber} durumu güncellendi`);
                loadData();
            } else {
                toast.error(data.error || "Güncelleme hatası");
            }
        } catch (error) {
            console.error("Status change error:", error);
            toast.error("Durum değiştirme hatası");
        }
    };

    const handleDelete = async (room: HotelRoom) => {
        if (!confirm(`Oda ${room.roomNumber} silmek istediğinize emin misiniz?`)) {
            return;
        }

        try {
            const res = await fetch(`/api/hotel/rooms/${room.id}`, {
                method: "DELETE",
            });

            const data = await res.json();

            if (data.success) {
                toast.success("Oda silindi");
                loadData();
            } else {
                toast.error(data.error || "Silme hatası");
            }
        } catch (error) {
            console.error("Delete error:", error);
            toast.error("Silme hatası");
        }
    };

    const generateQrUrl = (room: HotelRoom) => {
        const baseUrl = typeof window !== "undefined" ? window.location.origin : "https://tikprofil.com";
        return `${baseUrl}/r/${session?.businessId}/room/${room.roomNumber}`;
    };

    // Group rooms by floor
    const roomsByFloor = rooms.reduce((acc, room) => {
        const floor = room.floor || 1;
        if (!acc[floor]) acc[floor] = [];
        acc[floor].push(room);
        return acc;
    }, {} as Record<number, HotelRoom[]>);

    const floors = Object.keys(roomsByFloor).map(Number).sort((a, b) => b - a);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
        );
    }

    return (
        <div className="min-h-screen p-4 md:p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className={clsx("text-2xl md:text-3xl font-bold mb-2", textPrimary)}>
                        Oda Yönetimi
                    </h1>
                    <p className={clsx("text-sm md:text-base", textSecondary)}>
                        Oteldeki odaları yönetin ve QR kodlarını oluşturun
                    </p>
                </div>
                <button
                    onClick={openAddModal}
                    className="flex items-center gap-2 px-5 py-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors font-semibold"
                >
                    <Plus className="w-5 h-5" />
                    Oda Ekle
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Object.entries(STATUS_CONFIG).map(([status, config]) => {
                    const count = rooms.filter(r => r.status === status).length;
                    const Icon = config.icon;
                    return (
                        <div
                            key={status}
                            className={clsx("rounded-2xl border p-4 md:p-5", cardBg, borderColor)}
                        >
                            <div className="flex items-center gap-3">
                                <div className={clsx("p-2.5 rounded-xl", `${config.color}/10`)}>
                                    <Icon className={clsx("w-5 h-5", config.textColor)} />
                                </div>
                                <div>
                                    <p className={clsx("text-2xl font-bold", textPrimary)}>{count}</p>
                                    <p className={clsx("text-sm", textSecondary)}>{config.label}</p>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Rooms by Floor */}
            {rooms.length === 0 ? (
                <div className={clsx("rounded-2xl border p-12 text-center", cardBg, borderColor)}>
                    <LayoutGrid className={clsx("w-16 h-16 mx-auto mb-4", textSecondary)} />
                    <h3 className={clsx("text-lg font-semibold mb-2", textPrimary)}>
                        Henüz oda eklenmemiş
                    </h3>
                    <p className={clsx("mb-6", textSecondary)}>
                        Odalarınızı ekleyerek her birine özel QR kod oluşturun.
                    </p>
                    <button
                        onClick={openAddModal}
                        className="inline-flex items-center gap-2 px-5 py-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors font-semibold"
                    >
                        <Plus className="w-5 h-5" />
                        İlk Odayı Ekle
                    </button>
                </div>
            ) : (
                <div className="space-y-6">
                    {floors.map(floor => (
                        <div key={floor} className={clsx("rounded-2xl border overflow-hidden", cardBg, borderColor)}>
                            <div className={clsx("px-5 py-4 border-b", borderColor)}>
                                <h3 className={clsx("font-semibold", textPrimary)}>
                                    {floor}. Kat
                                </h3>
                            </div>
                            <div className="p-5">
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                                    {roomsByFloor[floor]
                                        .sort((a, b) => a.roomNumber.localeCompare(b.roomNumber, undefined, { numeric: true }))
                                        .map(room => {
                                            const statusConfig = STATUS_CONFIG[room.status];
                                            const Icon = statusConfig.icon;
                                            return (
                                                <motion.div
                                                    key={room.id}
                                                    layout
                                                    className="relative group"
                                                >
                                                    <div className={clsx(
                                                        "p-4 rounded-xl border-2 transition-all cursor-pointer hover:shadow-md",
                                                        room.status === "available"
                                                            ? isDark ? "border-green-900 bg-green-900/20" : "border-green-200 bg-green-50"
                                                            : room.status === "occupied"
                                                                ? isDark ? "border-red-900 bg-red-900/20" : "border-red-200 bg-red-50"
                                                                : room.status === "cleaning"
                                                                    ? isDark ? "border-yellow-900 bg-yellow-900/20" : "border-yellow-200 bg-yellow-50"
                                                                    : isDark ? "border-gray-700 bg-gray-800" : "border-gray-200 bg-gray-50"
                                                    )}>
                                                        <div className="flex items-center justify-between mb-2">
                                                            <span className={clsx("text-lg font-bold", textPrimary)}>
                                                                {room.roomNumber}
                                                            </span>
                                                            <Icon className={clsx("w-4 h-4", statusConfig.textColor)} />
                                                        </div>
                                                        <p className={clsx("text-xs truncate", textSecondary)}>
                                                            {room.roomTypeName}
                                                        </p>

                                                        {/* Actions overlay */}
                                                        <div className="absolute inset-0 bg-black/70 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                                            <button
                                                                onClick={() => setQrModalRoom(room)}
                                                                className="p-2 bg-white rounded-lg hover:bg-gray-100 transition-colors"
                                                                title="QR Kod"
                                                            >
                                                                <QrCode className="w-4 h-4 text-gray-700" />
                                                            </button>
                                                            <button
                                                                onClick={() => openEditModal(room)}
                                                                className="p-2 bg-white rounded-lg hover:bg-gray-100 transition-colors"
                                                                title="Düzenle"
                                                            >
                                                                <Edit className="w-4 h-4 text-gray-700" />
                                                            </button>
                                                            <button
                                                                onClick={() => handleDelete(room)}
                                                                className="p-2 bg-white rounded-lg hover:bg-red-50 transition-colors"
                                                                title="Sil"
                                                            >
                                                                <Trash2 className="w-4 h-4 text-red-500" />
                                                            </button>
                                                        </div>
                                                    </div>

                                                    {/* Quick status change */}
                                                    <div className="flex gap-1 mt-2">
                                                        {(Object.keys(STATUS_CONFIG) as Array<keyof typeof STATUS_CONFIG>).map(status => (
                                                            <button
                                                                key={status}
                                                                onClick={() => handleStatusChange(room, status)}
                                                                className={clsx("flex-1 h-2 rounded-full transition-all", room.status === status ? STATUS_CONFIG[status].color : isDark ? "bg-gray-700 hover:opacity-70" : "bg-gray-200 hover:opacity-70")}
                                                                title={STATUS_CONFIG[status].label}
                                                            />
                                                        ))}
                                                    </div>
                                                </motion.div>
                                            );
                                        })}
                                </div>
                            </div>
                        </div>
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
                        className="fixed inset-0 z-50 flex items-center justify-center p-4"
                        onClick={() => setIsModalOpen(false)}
                    >
                        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                            className={clsx("relative w-full max-w-md rounded-3xl shadow-2xl overflow-hidden", cardBg)}
                        >
                            {/* Header */}
                            <div className={clsx("flex items-center justify-between p-5 border-b", borderColor)}>
                                <h2 className={clsx("text-xl font-semibold", textPrimary)}>
                                    {editingRoom ? "Odayı Düzenle" : "Yeni Oda"}
                                </h2>
                                <button
                                    onClick={() => setIsModalOpen(false)}
                                    className="p-2 hover:bg-gray-500/10 rounded-full transition-colors"
                                >
                                    <X className="w-5 h-5 text-gray-500" />
                                </button>
                            </div>

                            {/* Form */}
                            <div className="p-5 space-y-5">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className={clsx("block text-sm font-medium mb-2", textSecondary)}>
                                            Oda Numarası *
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.roomNumber}
                                            onChange={(e) => setFormData(p => ({ ...p, roomNumber: e.target.value }))}
                                            placeholder="101"
                                            className={clsx("w-full px-4 py-3.5 rounded-xl border-2 text-base font-medium transition-colors focus:outline-none focus:border-blue-500", inputBg, textPrimary)}
                                        />
                                    </div>
                                    <div>
                                        <label className={clsx("block text-sm font-medium mb-2", textSecondary)}>
                                            Kat
                                        </label>
                                        <input
                                            type="number"
                                            value={formData.floor}
                                            onChange={(e) => setFormData(p => ({ ...p, floor: Number(e.target.value) }))}
                                            min={-2}
                                            max={50}
                                            className={clsx("w-full px-4 py-3.5 rounded-xl border-2 text-base font-medium transition-colors focus:outline-none focus:border-blue-500", inputBg, textPrimary)}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className={clsx("block text-sm font-medium mb-2", textSecondary)}>
                                        Oda Türü
                                    </label>
                                    <select
                                        value={formData.roomTypeId}
                                        onChange={(e) => setFormData(p => ({ ...p, roomTypeId: e.target.value }))}
                                        className={clsx("w-full px-4 py-3.5 rounded-xl border-2 text-base font-medium transition-colors focus:outline-none focus:border-blue-500", inputBg, textPrimary)}
                                    >
                                        <option value="">Seçiniz</option>
                                        {roomTypes.map(type => (
                                            <option key={type.id} value={type.id}>{type.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className={clsx("block text-sm font-medium mb-2", textSecondary)}>
                                        Durum
                                    </label>
                                    <div className="grid grid-cols-2 gap-2">
                                        {(Object.entries(STATUS_CONFIG) as [keyof typeof STATUS_CONFIG, typeof STATUS_CONFIG[keyof typeof STATUS_CONFIG]][]).map(([status, config]) => {
                                            const Icon = config.icon;
                                            return (
                                                <button
                                                    key={status}
                                                    type="button"
                                                    onClick={() => setFormData(p => ({ ...p, status }))}
                                                    className={clsx("flex items-center gap-2 px-3 py-2 rounded-xl border transition-all", formData.status === status ? `${config.color}/20 border-current ${config.textColor}` : isDark ? "border-[#222] text-gray-400" : "border-gray-200 text-gray-600")}
                                                >
                                                    <Icon className="w-4 h-4" />
                                                    <span className="text-sm">{config.label}</span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>

                            {/* Footer */}
                            <div className={clsx("flex items-center justify-end gap-3 p-5 border-t", borderColor)}>
                                <button
                                    onClick={() => setIsModalOpen(false)}
                                    className={clsx("px-4 py-3.5 rounded-xl font-semibold text-sm transition-colors", isDark ? "bg-white/5 hover:bg-white/10 text-gray-300" : "bg-gray-100 hover:bg-gray-200 text-gray-700")}
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
                                    {editingRoom ? "Güncelle" : "Kaydet"}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* QR Code Modal */}
            <AnimatePresence>
                {qrModalRoom && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4"
                        onClick={() => setQrModalRoom(null)}
                    >
                        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                            className={clsx("relative w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden p-6 text-center", cardBg)}
                        >
                            <h3 className={clsx("text-xl font-semibold mb-2", textPrimary)}>
                                Oda {qrModalRoom.roomNumber}
                            </h3>
                            <p className={clsx("mb-6", textSecondary)}>
                                Bu QR kodu odaya yerleştirin
                            </p>

                            {/* QR Code placeholder - in real implementation use a QR library */}
                            <div className="bg-white p-4 rounded-xl inline-block mb-4">
                                <img
                                    src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(generateQrUrl(qrModalRoom))}`}
                                    alt={`Oda ${qrModalRoom.roomNumber} QR`}
                                    className="w-48 h-48"
                                />
                            </div>

                            <p className="text-xs text-gray-400 mb-4 break-all">
                                {generateQrUrl(qrModalRoom)}
                            </p>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => setQrModalRoom(null)}
                                    className={clsx("flex-1 px-4 py-3.5 rounded-xl font-semibold text-sm transition-colors", isDark ? "bg-white/5 hover:bg-white/10 text-gray-300" : "bg-gray-100 hover:bg-gray-200 text-gray-700")}
                                >
                                    Kapat
                                </button>
                                <a
                                    href={`https://api.qrserver.com/v1/create-qr-code/?size=400x400&format=png&data=${encodeURIComponent(generateQrUrl(qrModalRoom))}`}
                                    download={`oda-${qrModalRoom.roomNumber}-qr.png`}
                                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3.5 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors font-semibold"
                                >
                                    <Download className="w-4 h-4" />
                                    İndir
                                </a>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
