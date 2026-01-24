"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
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
import Image from "next/image";

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
}

const AMENITIES = [
    { id: "wifi", label: "WiFi", icon: Wifi },
    { id: "ac", label: "Klima", icon: Wind },
    { id: "tv", label: "TV", icon: Tv },
    { id: "minibar", label: "Mini Bar", icon: Coffee },
    { id: "bathroom", label: "Banyo", icon: Bath },
    { id: "roomservice", label: "Oda Servisi", icon: UtensilsCrossed },
];

export default function HotelOdaPublicPage() {
    const params = useParams();
    const slug = params.slug as string;

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);
    const [businessName, setBusinessName] = useState("");

    useEffect(() => {
        const fetchRoomTypes = async () => {
            try {
                setLoading(true);
                const res = await fetch(
                    `/api/hotel/public-room-types?businessSlug=${slug}`
                );
                const data = await res.json();

                if (!data.success) {
                    setError(data.error || "Oda türleri yüklenemedi");
                    return;
                }

                setRoomTypes(data.data.roomTypes || []);
                setBusinessName(data.data.businessName || "");
            } catch (err) {
                console.error("Room types fetch error:", err);
                setError("Oda türleri yüklenirken bir hata oluştu");
            } finally {
                setLoading(false);
            }
        };

        fetchRoomTypes();
    }, [slug]);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
                <Loader2 className="w-12 h-12 animate-spin text-blue-500" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
                <div className="text-center p-8">
                    <p className="text-red-500 text-lg font-medium mb-2">Hata</p>
                    <p className="text-gray-600 dark:text-gray-400">{error}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12">
            <div className="max-w-7xl mx-auto px-4 sm:px-6">
                <header className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                        {businessName}
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400">
                        Oda Türleri
                    </p>
                </header>

                {roomTypes.length === 0 ? (
                    <div className="bg-white dark:bg-gray-900 rounded-2xl p-12 text-center border border-gray-200 dark:border-gray-800">
                        <BedDouble className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                            Henüz oda türü eklenmemiş
                        </h2>
                        <p className="text-gray-600 dark:text-gray-400">
                            Oda türleri ekleyerek konaklama seçeneklerinizi sunun.
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {roomTypes.map((roomType, index) => (
                            <motion.div
                                key={roomType.id}
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ duration: 0.3 }}
                                className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden"
                            >
                                <div className="aspect-[4/3] bg-gray-100 dark:bg-gray-800 relative">
                                    {roomType.photos?.length > 0 ? (
                                        <img
                                            src={roomType.photos[0]}
                                            alt={roomType.name}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center">
                                            <BedDouble className="w-16 h-16 text-gray-300 dark:text-gray-600" />
                                        </div>
                                    )}
                                </div>

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

                                    <p className="text-gray-600 dark:text-gray-400 text-sm mb-4 line-clamp-2">
                                        {roomType.description}
                                    </p>

                                    <div className="flex items-center gap-4 mb-4 text-sm text-gray-600 dark:text-gray-400">
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
            </div>
        </div>
    );
}
