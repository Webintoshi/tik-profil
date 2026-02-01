"use client";

import { motion } from "framer-motion";
import { MapPin, Home, Building2, Trees, Bed, Maximize2, Phone } from "lucide-react";
import Image from "next/image";
import { toR2ProxyUrl } from "@/lib/publicImage";

interface Consultant {
    id: string;
    name: string;
    phone: string;
    whatsapp?: string;
    photoUrl?: string;
}

interface ListingFeatures {
    grossArea: number;
    netArea?: number;
    roomCount?: string;
    floor?: number;
    totalFloors?: number;
    buildingAge?: number;
}

interface ListingLocation {
    city: string;
    district: string;
    neighborhood?: string;
}

interface EmlakListingCardProps {
    listing: {
        id: string;
        title: string;
        description?: string;
        propertyType: string;
        price: number;
        currency: string;
        images: { url: string; isMain: boolean }[];
        location: ListingLocation;
        features: ListingFeatures;
        consultant?: Consultant | null;
    };
    onClick: () => void;
    onWhatsApp?: () => void;
}

const formatPrice = (price: number, currency: string = "TRY"): string => {
    const symbols: Record<string, string> = { TRY: "₺", USD: "$", EUR: "€" };
    return `${symbols[currency] || "₺"}${price.toLocaleString("tr-TR")}`;
};

const getPropertyIcon = (type: string) => {
    switch (type) {
        case "residential": return <Home className="w-4 h-4" />;
        case "commercial": return <Building2 className="w-4 h-4" />;
        case "land": return <Trees className="w-4 h-4" />;
        default: return <Home className="w-4 h-4" />;
    }
};

const getPropertyLabel = (type: string): string => {
    const labels: Record<string, string> = {
        residential: "Konut",
        commercial: "Ticari",
        land: "Arsa",
    };
    return labels[type] || "Konut";
};

export function EmlakListingCard({ listing, onClick, onWhatsApp }: EmlakListingCardProps) {
    const mainImage = listing.images?.find(img => img.isMain)?.url || listing.images?.[0]?.url;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            whileTap={{ scale: 0.98 }}
            onClick={onClick}
            className="bg-white rounded-2xl shadow-lg overflow-hidden cursor-pointer group"
        >
            {/* Image */}
            <div className="relative aspect-[16/10] bg-gray-100 overflow-hidden">
                {mainImage ? (
                    <Image
                        src={toR2ProxyUrl(mainImage)}
                        alt={listing.title}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                ) : (
                    <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
                        <Home className="w-16 h-16 text-gray-300" />
                    </div>
                )}

                {/* Property Type Badge */}
                <div className="absolute top-3 left-3 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-sm text-white text-xs font-medium flex items-center gap-1.5">
                    {getPropertyIcon(listing.propertyType)}
                    {getPropertyLabel(listing.propertyType)}
                </div>

                {/* Price Badge */}
                <div className="absolute bottom-3 right-3 px-4 py-2 rounded-xl bg-emerald-500 text-white font-bold text-lg shadow-lg">
                    {formatPrice(listing.price, listing.currency)}
                </div>
            </div>

            {/* Content */}
            <div className="p-4">
                {/* Title */}
                <h3 className="font-bold text-gray-900 text-lg line-clamp-1 mb-2">
                    {listing.title}
                </h3>

                {/* Location */}
                <div className="flex items-center gap-1.5 text-gray-500 text-sm mb-3">
                    <MapPin className="w-4 h-4 text-gray-400" />
                    <span>{listing.location.district}, {listing.location.city}</span>
                </div>

                {/* Features */}
                <div className="flex items-center gap-4 text-sm text-gray-600 mb-4">
                    {listing.features.roomCount && (
                        <div className="flex items-center gap-1">
                            <Bed className="w-4 h-4 text-gray-400" />
                            <span>{listing.features.roomCount}</span>
                        </div>
                    )}
                    <div className="flex items-center gap-1">
                        <Maximize2 className="w-4 h-4 text-gray-400" />
                        <span>{listing.features.grossArea} m²</span>
                    </div>
                    {listing.features.floor !== undefined && (
                        <span className="text-gray-400">
                            Kat {listing.features.floor}
                            {listing.features.totalFloors && `/${listing.features.totalFloors}`}
                        </span>
                    )}
                </div>

                {/* Consultant & WhatsApp */}
                {listing.consultant && (
                    <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                        <div className="flex items-center gap-2">
                            {listing.consultant.photoUrl ? (
                                <Image
                                    src={toR2ProxyUrl(listing.consultant.photoUrl)}
                                    alt={listing.consultant.name}
                                    width={32}
                                    height={32}
                                    className="rounded-full object-cover"
                                />
                            ) : (
                                <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-500">
                                    {listing.consultant.name.charAt(0)}
                                </div>
                            )}
                            <span className="text-sm font-medium text-gray-700">
                                {listing.consultant.name}
                            </span>
                        </div>

                        {(listing.consultant.whatsapp || listing.consultant.phone) && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onWhatsApp?.();
                                }}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-500 text-white text-sm font-medium hover:bg-green-600 transition-colors"
                            >
                                <Phone className="w-4 h-4" />
                                İletişim
                            </button>
                        )}
                    </div>
                )}
            </div>
        </motion.div>
    );
}

