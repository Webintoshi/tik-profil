"use client";

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
    onClose: () => void;
}

const AMENITIES = [
    { id: "wifi", label: "WiFi", icon: Wifi },
    { id: "ac", label: "Klima", icon: Wind },
    { id: "tv", label: "TV", icon: Tv },
    { id: "minibar", label: "Mini Bar", icon: Coffee },
    { id: "bathroom", label: "Banyo", icon: Bath },
    { id: "roomservice", label: "Oda Servisi", icon: UtensilsCrossed },
];

export function HotelInlineMenu({ isOpen, businessSlug, onClose }: HotelInlineMenuProps) {
    const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);
    const [loading, setLoading] = useState(false);

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

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden w-full"
            >
                <div className="rounded-2xl overflow-hidden border border-gray-200 bg-white relative">
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                        </div>
                    ) : roomTypes.length === 0 ? (
                        <div className="text-center py-12">
                            <BedDouble className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                            <p className="text-gray-600">Henüz oda türü eklenmemiş</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 gap-3 p-4">
                            {roomTypes.map((roomType) => (
                                <motion.div
                                    key={roomType.id}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ duration: 0.3 }}
                                    className="
                                        h-32 bg-white border border-gray-100 rounded-[24px] 
                                        flex flex-col items-center justify-center gap-3 
                                        shadow-sm hover:shadow-md transition-all active:scale-95
                                        col-span-2
                                    "
                                >
                                    <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center">
                                        {roomType.photos?.length > 0 ? (
                                            <img
                                                src={roomType.photos[0]}
                                                alt={roomType.name}
                                                className="w-full h-full object-cover rounded-full"
                                            />
                                        ) : (
                                            <BedDouble className="w-8 h-8 text-blue-500" />
                                        )}
                                    </div>
                                    <div className="text-center">
                                        <h3 className="text-base font-semibold text-gray-800">
                                            {roomType.name}
                                        </h3>
                                        <span className="text-base font-bold text-blue-600">
                                            ₺{roomType.price}
                                            <span className="text-xs text-gray-400 font-normal">/gece</span>
                                        </span>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    )}
                </div>
            </motion.div>
        </AnimatePresence>
    );
}
