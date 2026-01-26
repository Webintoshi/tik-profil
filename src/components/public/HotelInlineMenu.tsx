"use client";

import Image from "next/image";
import { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
    Loader2,
    BedDouble,
    Users,
    Maximize,
    Wifi,
    Wind,
    Tv,
    Coffee,
    Bath,
    UtensilsCrossed,
    List,
    LayoutGrid,
    ChevronRight,
} from "lucide-react";

interface RoomType {
    id: string;
    name: string;
    description: string;
    price: number;
    capacity: number;
    bedType: string;
    size: number;
    photos: string[];
    amenities: string[];
}

interface HotelInlineMenuProps {
    isOpen: boolean;
    businessSlug: string;
    businessPhone?: string;
    businessName?: string;
    onClose: () => void;
}

type ViewMode = "list" | "full";

const AMENITIES = [
    { id: "wifi", label: "WiFi", icon: Wifi },
    { id: "ac", label: "Klima", icon: Wind },
    { id: "tv", label: "TV", icon: Tv },
    { id: "minibar", label: "Mini Bar", icon: Coffee },
    { id: "bathroom", label: "Banyo", icon: Bath },
    { id: "roomservice", label: "Oda Servisi", icon: UtensilsCrossed },
];

export function HotelInlineMenu({ isOpen, businessSlug, businessPhone, businessName, onClose }: HotelInlineMenuProps) {
    const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);
    const [loading, setLoading] = useState(false);
    const [viewMode, setViewMode] = useState<ViewMode>("list");
    const [expandedCardId, setExpandedCardId] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen && roomTypes.length === 0) {
            const fetchRoomTypes = async () => {
                try {
                    setLoading(true);
                    const res = await fetch(`/api/hotel/public-room-types?businessSlug=${businessSlug}`);
                    const data = await res.json();

                    if (data.success) {
                        setRoomTypes(data.data.roomTypes || []);
                    }
                } catch (err) {
                    console.error("Room types fetch error:", err);
                } finally {
                    setLoading(false);
                }
            };

            fetchRoomTypes();
        }
    }, [isOpen, businessSlug, roomTypes.length]);

    const toggleExpand = (roomTypeId: string) => {
        if (viewMode === "full") {
            setExpandedCardId(expandedCardId === roomTypeId ? null : roomTypeId);
        }
    };

    const handleViewModeChange = (mode: ViewMode) => {
        setViewMode(mode);
        setExpandedCardId(null);
    };

    const handleWhatsAppInquiry = (roomType: RoomType) => {
        const phone = businessPhone?.replace(/\D/g, "") || "";
        const message = encodeURIComponent(
            `Merhaba, ${businessName || "otel"} için ${roomType.name} odası hakkında bilgi almak istiyorum.`
        );
        window.open(`https://wa.me/${phone}?text=${message}`, "_blank");
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
                className="w-full col-span-2"
                style={{ marginTop: "0.75rem" }}
            >
                <div className="rounded-2xl overflow-hidden bg-white border border-slate-200/60 shadow-sm relative w-full">
                    {loading ? (
                        <div className="flex items-center justify-center py-20">
                            <div className="flex flex-col items-center gap-3">
                                <Loader2 className="w-10 h-10 animate-spin text-slate-400" />
                                <p className="text-sm text-slate-500 font-medium">Oda türleri yükleniyor...</p>
                            </div>
                        </div>
                    ) : roomTypes.length === 0 ? (
                        <div className="text-center py-20 px-6">
                            <div className="w-16 h-16 rounded-2xl bg-slate-50 mx-auto flex items-center justify-center mb-4">
                                <BedDouble className="w-8 h-8 text-slate-400" />
                            </div>
                            <h3 className="text-lg font-semibold text-slate-900 mb-1">Oda Türü Bulunamadı</h3>
                            <p className="text-sm text-slate-500">Henüz oda türü eklenmemiş</p>
                        </div>
                    ) : (
                        <>
                            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                                <div>
                                    <span className="text-sm font-semibold text-slate-700">{roomTypes.length} Oda Türü</span>
                                    <p className="text-xs text-slate-500 mt-0.5">Görünümü seçin</p>
                                </div>
                                <div className="flex items-center gap-0.5 bg-slate-100 rounded-lg p-0.5">
                                    <motion.button
                                        onClick={() => handleViewModeChange("list")}
                                        className={`p-2 rounded-md transition-all ${viewMode === "list" ? "bg-white text-slate-900 shadow-sm" : "text-slate-400 hover:text-slate-600"}`}
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                    >
                                        <List className="w-4 h-4" />
                                    </motion.button>

                                    <motion.button
                                        onClick={() => handleViewModeChange("full")}
                                        className={`p-2 rounded-md transition-all ${viewMode === "full" ? "bg-white text-slate-900 shadow-sm" : "text-slate-400 hover:text-slate-600"}`}
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                    >
                                        <LayoutGrid className="w-4 h-4" />
                                    </motion.button>
                                </div>
                            </div>

                            <div className="p-4 w-full">
                                {viewMode === "list" && (
                                    <div className="grid grid-cols-1 gap-4 w-full">
                                        {roomTypes.map((roomType, index) => (
                                            <motion.div
                                                key={roomType.id}
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ duration: 0.3, delay: index * 0.05 }}
                                                className="group relative overflow-hidden rounded-2xl bg-white border border-slate-200 hover:border-slate-300 hover:shadow-lg transition-all duration-200"
                                            >
                                                <div className="flex flex-col">
                                                    <div className="w-full h-[280px] flex-shrink-0 relative overflow-hidden">
                                                        {roomType.photos && roomType.photos.length > 0 && roomType.photos[0] ? (
                                                            <>
                                                                <motion.img
                                                                    src={roomType.photos[0]}
                                                                    alt={roomType.name}
                                                                    className="w-full h-full object-cover"
                                                                    whileHover={{ scale: 1.02 }}
                                                                    transition={{ duration: 0.3 }}
                                                                />
                                                                <div className="absolute top-4 left-4">
                                                                    <div className="bg-white/95 backdrop-blur-sm px-4 py-2 rounded-lg shadow-sm">
                                                                        <span className="text-base font-semibold text-slate-900">₺{(roomType.price || 0).toLocaleString()}</span>
                                                                        <span className="text-xs text-slate-500 ml-1">/gece</span>
                                                                    </div>
                                                                </div>
                                                            </>
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center bg-slate-50">
                                                                <BedDouble className="w-12 h-12 text-slate-300" />
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div className="p-5 flex flex-col">
                                                        <div className="flex-1">
                                                            <h4 className="text-xl font-semibold text-slate-900 mb-2">{roomType.name}</h4>
                                                            {roomType.description && (
                                                                <p className="text-sm text-slate-600 line-clamp-2 mb-4 leading-relaxed">{roomType.description}</p>
                                                            )}

                                                            <div className="flex flex-wrap gap-2 mb-4">
                                                                {roomType.capacity && (
                                                                    <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-lg">
                                                                        <Users className="w-3.5 h-3.5 text-slate-500" />
                                                                        <span className="text-sm font-medium text-slate-700">{roomType.capacity} Kişi</span>
                                                                    </div>
                                                                )}
                                                                {roomType.size && (
                                                                    <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-lg">
                                                                        <Maximize className="w-3.5 h-3.5 text-slate-500" />
                                                                        <span className="text-sm font-medium text-slate-700">{roomType.size} m²</span>
                                                                    </div>
                                                                )}
                                                                {roomType.bedType && (
                                                                    <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-lg">
                                                                        <BedDouble className="w-3.5 h-3.5 text-slate-500" />
                                                                        <span className="text-sm font-medium text-slate-700">{roomType.bedType}</span>
                                                                    </div>
                                                                )}
                                                            </div>

                                                            {roomType.amenities && roomType.amenities.length > 0 && (
                                                                <div className="flex flex-wrap gap-2">
                                                                    {roomType.amenities.slice(0, 4).map((amenity, idx) => {
                                                                        const amenityIcon = AMENITIES.find((a) => a.id === amenity);
                                                                        if (!amenityIcon) return null;
                                                                        return (
                                                                            <div
                                                                                key={idx}
                                                                                className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-lg"
                                                                            >
                                                                                <amenityIcon.icon className="w-3.5 h-3.5 text-slate-500" />
                                                                                <span className="text-sm font-medium text-slate-700">{amenityIcon.label}</span>
                                                                            </div>
                                                                        );
                                                                    })}
                                                                    {roomType.amenities.length > 4 && (
                                                                        <span className="text-sm text-slate-500 bg-slate-50 px-3 py-1.5 rounded-lg">+{roomType.amenities.length - 4}</span>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>

                                                        <div className="flex gap-2 mt-5 pt-4 border-t border-slate-100">
                                                            <motion.button
                                                                onClick={() => handleWhatsAppInquiry(roomType)}
                                                                whileHover={{ scale: 1.01 }}
                                                                whileTap={{ scale: 0.99 }}
                                                                className="flex-1 py-3.5 bg-[#25D366] text-white font-medium rounded-xl hover:bg-[#20bd5a] transition-colors text-sm flex items-center justify-center gap-2"
                                                            >
                                                                <Image src="/whatsapp1.png" alt="WhatsApp" width={16} height={16} />
                                                                Daha Fazla Bilgi Al
                                                            </motion.button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        ))}
                                    </div>
                                )}

                                {viewMode === "full" && (
                                    <div className="space-y-4 w-full">
                                        {roomTypes.map((roomType, index) => (
                                            <motion.div
                                                key={roomType.id}
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ duration: 0.3, delay: index * 0.05 }}
                                                className="group relative overflow-hidden rounded-2xl bg-white border border-slate-200 hover:border-slate-300 hover:shadow-lg transition-all duration-200"
                                            >
                                                <div onClick={() => toggleExpand(roomType.id)} className="relative overflow-hidden">
                                                    <div className="aspect-video relative">
                                                        {roomType.photos && roomType.photos.length > 0 && roomType.photos[0] ? (
                                                            <>
                                                                <motion.img
                                                                    src={roomType.photos[0]}
                                                                    alt={roomType.name}
                                                                    className="w-full h-full object-cover"
                                                                    whileHover={{ scale: 1.02 }}
                                                                    transition={{ duration: 0.3 }}
                                                                />
                                                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                                                                <div className="absolute top-4 left-4">
                                                                    <div className="bg-white/95 backdrop-blur-sm px-5 py-2.5 rounded-lg shadow-sm">
                                                                        <span className="text-lg font-semibold text-slate-900">₺{(roomType.price || 0).toLocaleString()}</span>
                                                                        <span className="text-sm text-slate-500 ml-1">/gece</span>
                                                                    </div>
                                                                </div>
                                                                <div className="absolute bottom-4 left-4 right-4">
                                                                    <h4 className="text-xl font-semibold text-white mb-1">{roomType.name}</h4>
                                                                    {roomType.description && (
                                                                        <p className="text-sm text-white/90 line-clamp-1">{roomType.description}</p>
                                                                    )}
                                                                </div>
                                                                <motion.button
                                                                    animate={{ rotate: expandedCardId === roomType.id ? 180 : 0 }}
                                                                    transition={{ duration: 0.3 }}
                                                                    className="absolute top-4 right-4 w-9 h-9 bg-white/95 backdrop-blur-sm rounded-full flex items-center justify-center text-slate-600 hover:bg-white transition-all shadow-sm"
                                                                >
                                                                    <ChevronRight className="w-4 h-4" />
                                                                </motion.button>
                                                            </>
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center bg-slate-50">
                                                                <BedDouble className="w-12 h-12 text-slate-300" />
                                                            </div>
                                                        )}
                                                    </div>

                                                    <AnimatePresence>
                                                        {expandedCardId === roomType.id && (
                                                            <motion.div
                                                                initial={{ height: 0, opacity: 0 }}
                                                                animate={{ height: "auto", opacity: 1 }}
                                                                exit={{ height: 0, opacity: 0 }}
                                                                transition={{ duration: 0.3 }}
                                                                className="overflow-hidden"
                                                            >
                                                                <div className="p-6 space-y-4">
                                                                    <div className="flex flex-wrap gap-3">
                                                                        {roomType.capacity && (
                                                                            <div className="flex items-center gap-2 bg-slate-50 px-4 py-2.5 rounded-lg">
                                                                                <Users className="w-4 h-4 text-slate-500" />
                                                                                <span className="text-sm font-medium text-slate-700">{roomType.capacity} Kişi</span>
                                                                            </div>
                                                                        )}
                                                                        {roomType.size && (
                                                                            <div className="flex items-center gap-2 bg-slate-50 px-4 py-2.5 rounded-lg">
                                                                                <Maximize className="w-4 h-4 text-slate-500" />
                                                                                <span className="text-sm font-medium text-slate-700">{roomType.size} m²</span>
                                                                            </div>
                                                                        )}
                                                                        {roomType.bedType && (
                                                                            <div className="flex items-center gap-2 bg-slate-50 px-4 py-2.5 rounded-lg">
                                                                                <BedDouble className="w-4 h-4 text-slate-500" />
                                                                                <span className="text-sm font-medium text-slate-700">{roomType.bedType}</span>
                                                                            </div>
                                                                        )}
                                                                    </div>

                                                                    {roomType.amenities && roomType.amenities.length > 0 && (
                                                                        <div>
                                                                            <p className="text-xs font-semibold text-slate-500 mb-3 uppercase tracking-wide">Özellikler</p>
                                                                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                                                                {roomType.amenities.map((amenity, idx) => {
                                                                                    const amenityIcon = AMENITIES.find((a) => a.id === amenity);
                                                                                    if (!amenityIcon) return null;
                                                                                    return (
                                                                                        <div
                                                                                            key={idx}
                                                                                            className="flex items-center gap-2 bg-slate-50 px-3 py-2.5 rounded-lg"
                                                                                        >
                                                                                            <amenityIcon.icon className="w-4 h-4 text-slate-500" />
                                                                                            <span className="text-sm font-medium text-slate-700">{amenityIcon.label}</span>
                                                                                        </div>
                                                                                    );
                                                                                })}
                                                                            </div>
                                                                        </div>
                                                                    )}

                                                                    <div className="flex gap-2 pt-2">
                                                                        <motion.button
                                                                            onClick={() => handleWhatsAppInquiry(roomType)}
                                                                            whileHover={{ scale: 1.01 }}
                                                                            whileTap={{ scale: 0.99 }}
                                                                            className="flex-1 py-4 bg-[#25D366] text-white font-medium rounded-xl hover:bg-[#20bd5a] transition-colors text-sm flex items-center justify-center gap-2"
                                                                        >
                                                                            <Image src="/whatsapp1.png" alt="WhatsApp" width={20} height={20} />
                                                                            Daha Fazla Bilgi Al
                                                                        </motion.button>
                                                                    </div>
                                                                </div>
                                                            </motion.div>
                                                        )}
                                                    </AnimatePresence>
                                                </div>
                                            </motion.div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </motion.div>
        </AnimatePresence>
    );
}
