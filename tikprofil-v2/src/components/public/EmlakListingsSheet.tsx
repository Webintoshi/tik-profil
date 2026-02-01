"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Minus, X, Loader2, MapPin, Phone, Home, Building2, Trees, User, ChevronLeft, ChevronRight, Search } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import clsx from "clsx";
import { createPortal } from "react-dom";
import { toR2ProxyUrl } from "@/lib/publicImage";

// Types
interface ListingLocation {
    city: string;
    district: string;
    neighborhood?: string;
}

interface ListingFeatures {
    grossArea: number;
    netArea?: number;
    roomCount?: string;
    floor?: number;
    totalFloors?: number;
    buildingAge?: number;
    heating?: string;
    bathrooms?: number;
    balcony?: boolean;
    parking?: boolean;
    furnished?: boolean;
}

interface ListingImage {
    url: string;
    order: number;
    isMain: boolean;
}

interface Consultant {
    id: string;
    name: string;
    title?: string;
    phone: string;
    whatsapp?: string;
    photoUrl?: string;
    slug?: string;
}

interface Listing {
    id: string;
    title: string;
    description?: string;
    propertyType: 'residential' | 'commercial' | 'land';
    propertySubType?: string;
    location: ListingLocation;
    features: ListingFeatures;
    price: number;
    currency: string;
    images: ListingImage[];
    consultant?: Consultant | null;
}

interface EmlakListingsSheetProps {
    isOpen: boolean;
    businessSlug: string;
    businessName: string;
    whatsappNumber?: string;
    onClose: () => void;
}

const PROPERTY_LABELS: Record<string, string> = {
    residential: 'Konut',
    commercial: 'Ticari',
    land: 'Arsa',
};

const PROPERTY_ICONS: Record<string, React.ElementType> = {
    residential: Home,
    commercial: Building2,
    land: Trees,
};

const HEATING_LABELS: Record<string, string> = {
    natural_gas: 'Doğalgaz',
    central: 'Merkezi',
    floor: 'Yerden',
    ac: 'Klima',
    stove: 'Soba',
    none: 'Yok',
};

function formatPrice(price: number, currency: string = 'TRY'): string {
    const symbols: Record<string, string> = { TRY: '₺', USD: '$', EUR: '€' };
    return `${symbols[currency] || '₺'}${price.toLocaleString('tr-TR')}`;
}

// Listing Detail Modal Component
function ListingDetailModal({
    listing,
    isOpen,
    onClose,
}: {
    listing: Listing | null;
    isOpen: boolean;
    onClose: () => void;
}) {
    const [currentImageIndex, setCurrentImageIndex] = useState(0);

    useEffect(() => {
        if (isOpen) {
            setCurrentImageIndex(0);
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen]);

    if (!listing) return null;

    const images = listing.images?.length > 0 ? listing.images.sort((a, b) => a.order - b.order) : [];
    const mainImage = images[currentImageIndex] || images[0];

    const handleWhatsApp = () => {
        const phone = listing.consultant?.whatsapp || listing.consultant?.phone;
        if (!phone) return;

        const cleanPhone = phone.replace(/[\s\-\(\)]/g, '');
        const message = encodeURIComponent(`Merhaba, "${listing.title}" ilanı hakkında bilgi almak istiyorum.`);
        window.open(`https://wa.me/${cleanPhone}?text=${message}`, '_blank');
    };

    const handleCall = () => {
        const phone = listing.consultant?.phone;
        if (!phone) return;
        window.open(`tel:${phone}`, '_self');
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        onClick={onClose}
                        className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-md"
                    />

                    {/* Sheet */}
                    <motion.div
                        initial={{ y: "100%" }}
                        animate={{ y: 0 }}
                        exit={{ y: "100%" }}
                        transition={{ type: "spring", damping: 32, stiffness: 380, mass: 0.8 }}
                        className="fixed inset-x-0 bottom-0 z-[100] h-[95vh] sm:h-auto sm:max-h-[85vh] flex flex-col"
                    >
                        <div className="bg-gradient-to-b from-white via-white to-gray-50 rounded-t-[1.5rem] sm:rounded-t-[2.5rem] shadow-[0_-20px_60px_-15px_rgba(0,0,0,0.3)] flex flex-col h-full overflow-hidden">
                            {/* Handle */}
                            <div className="flex justify-center pt-3 sm:pt-4 pb-2 flex-shrink-0">
                                <div className="w-10 h-1 rounded-full bg-gray-300" />
                            </div>

                            {/* Close Button - Prominent */}
                            <button
                                onClick={onClose}
                                style={{ position: 'absolute', top: '12px', right: '12px', zIndex: 50, width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', backgroundColor: 'rgba(31, 41, 55, 0.9)', color: 'white', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)', border: 'none', cursor: 'pointer' }}
                            >
                                <X style={{ width: '20px', height: '20px' }} />
                            </button>

                            {/* Content */}
                            <div className="flex-1 overflow-y-auto px-5 pb-4">
                                {/* Image Gallery */}
                                {images.length > 0 && (
                                    <div
                                        className="relative w-full aspect-[16/10] mb-4 rounded-2xl overflow-hidden"
                                        onTouchStart={(e) => {
                                            const touch = e.touches[0];
                                            (e.currentTarget as HTMLElement).dataset.touchStartX = touch.clientX.toString();
                                        }}
                                        onTouchEnd={(e) => {
                                            const startX = parseFloat((e.currentTarget as HTMLElement).dataset.touchStartX || '0');
                                            const endX = e.changedTouches[0].clientX;
                                            const diff = startX - endX;

                                            if (Math.abs(diff) > 50) {
                                                if (diff > 0 && currentImageIndex < images.length - 1) {
                                                    setCurrentImageIndex(prev => prev + 1);
                                                } else if (diff < 0 && currentImageIndex > 0) {
                                                    setCurrentImageIndex(prev => prev - 1);
                                                }
                                            }
                                        }}
                                    >
                                        <Image
                                            src={mainImage?.url || ''}
                                            alt={listing.title}
                                            fill
                                            className="object-cover"

                                        />

                                        {/* Navigation Arrows */}
                                        {images.length > 1 && (
                                            <>
                                                {currentImageIndex > 0 && (
                                                    <button
                                                        onClick={() => setCurrentImageIndex(prev => prev - 1)}
                                                        className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm text-white flex items-center justify-center hover:bg-black/60 transition-colors"
                                                    >
                                                        <ChevronLeft className="w-5 h-5" />
                                                    </button>
                                                )}
                                                {currentImageIndex < images.length - 1 && (
                                                    <button
                                                        onClick={() => setCurrentImageIndex(prev => prev + 1)}
                                                        className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm text-white flex items-center justify-center hover:bg-black/60 transition-colors"
                                                    >
                                                        <ChevronRight className="w-5 h-5" />
                                                    </button>
                                                )}
                                            </>
                                        )}

                                        {/* Image Counter */}
                                        {images.length > 1 && (
                                            <div className="absolute bottom-3 right-3 px-2 py-1 bg-black/50 text-white text-xs rounded-lg">
                                                {currentImageIndex + 1} / {images.length}
                                            </div>
                                        )}

                                        {/* Image Dots */}
                                        {images.length > 1 && (
                                            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1">
                                                {images.map((_, i) => (
                                                    <button
                                                        key={i}
                                                        onClick={() => setCurrentImageIndex(i)}
                                                        className={clsx(
                                                            "w-2 h-2 rounded-full transition-all",
                                                            i === currentImageIndex ? "bg-white w-4" : "bg-white/50"
                                                        )}
                                                    />
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Title & Price */}
                                <div className="mb-4">
                                    <h2 className="text-xl font-bold text-gray-900">{listing.title}</h2>
                                    <div className="flex items-center gap-1 mt-1 text-gray-500 text-sm">
                                        <MapPin className="w-4 h-4" />
                                        {listing.location?.district}, {listing.location?.city}
                                    </div>
                                    <div className="mt-2 flex items-baseline gap-1">
                                        <span className="text-2xl font-bold text-purple-600">
                                            {formatPrice(listing.price, listing.currency)}
                                        </span>
                                    </div>
                                </div>

                                {/* Features Grid */}
                                <div className="grid grid-cols-3 gap-2 mb-4">
                                    {listing.features?.grossArea && (
                                        <div className="p-3 bg-gray-50 rounded-xl text-center">
                                            <div className="text-lg font-bold text-gray-900">{listing.features.grossArea}</div>
                                            <div className="text-xs text-gray-500">m²</div>
                                        </div>
                                    )}
                                    {listing.features?.roomCount && (
                                        <div className="p-3 bg-gray-50 rounded-xl text-center">
                                            <div className="text-lg font-bold text-gray-900">{listing.features.roomCount}</div>
                                            <div className="text-xs text-gray-500">Oda</div>
                                        </div>
                                    )}
                                    {listing.features?.floor !== undefined && (
                                        <div className="p-3 bg-gray-50 rounded-xl text-center">
                                            <div className="text-lg font-bold text-gray-900">{listing.features.floor}. Kat</div>
                                            <div className="text-xs text-gray-500">/ {listing.features?.totalFloors || '?'}</div>
                                        </div>
                                    )}
                                    {listing.features?.buildingAge !== undefined && (
                                        <div className="p-3 bg-gray-50 rounded-xl text-center">
                                            <div className="text-lg font-bold text-gray-900">{listing.features.buildingAge}</div>
                                            <div className="text-xs text-gray-500">Yaş</div>
                                        </div>
                                    )}
                                    {listing.features?.bathrooms !== undefined && (
                                        <div className="p-3 bg-gray-50 rounded-xl text-center">
                                            <div className="text-lg font-bold text-gray-900">{listing.features.bathrooms}</div>
                                            <div className="text-xs text-gray-500">Banyo</div>
                                        </div>
                                    )}
                                    {listing.features?.heating && (
                                        <div className="p-3 bg-gray-50 rounded-xl text-center">
                                            <div className="text-lg font-bold text-gray-900">{HEATING_LABELS[listing.features.heating] || listing.features.heating}</div>
                                            <div className="text-xs text-gray-500">Isıtma</div>
                                        </div>
                                    )}
                                </div>

                                {/* Extra Features */}
                                <div className="flex flex-wrap gap-2 mb-4">
                                    {listing.features?.balcony && (
                                        <span className="px-3 py-1 bg-emerald-50 text-emerald-700 text-sm rounded-full">Balkon</span>
                                    )}
                                    {listing.features?.parking && (
                                        <span className="px-3 py-1 bg-blue-50 text-blue-700 text-sm rounded-full">Otopark</span>
                                    )}
                                    {listing.features?.furnished && (
                                        <span className="px-3 py-1 bg-amber-50 text-amber-700 text-sm rounded-full">Eşyalı</span>
                                    )}
                                </div>

                                {/* Description */}
                                {listing.description && (
                                    <div className="mb-4">
                                        <h3 className="font-semibold text-gray-900 mb-2">Açıklama</h3>
                                        <p className="text-gray-600 text-sm leading-relaxed">{listing.description}</p>
                                    </div>
                                )}

                                {/* Consultant */}
                                {listing.consultant && (
                                    <div className="p-4 bg-gray-50 rounded-2xl">
                                        <div className="flex items-center gap-3">
                                            <div className="relative w-12 h-12 flex-shrink-0">
                                                {listing.consultant.photoUrl ? (
                                                    <Image
                                                        src={toR2ProxyUrl(listing.consultant.photoUrl)}
                                                        alt={listing.consultant.name}
                                                        fill
                                                        className="object-cover rounded-full"

                                                    />
                                                ) : (
                                                    <div className="w-full h-full bg-gray-200 rounded-full flex items-center justify-center">
                                                        <User className="w-6 h-6 text-gray-400" />
                                                    </div>
                                                )}
                                            </div>
                                            <div>
                                                <div className="font-semibold text-gray-900">{listing.consultant.name}</div>
                                                <div className="text-sm text-gray-500">{listing.consultant.title || 'Emlak Danışmanı'}</div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Footer Actions */}
                            {listing.consultant && (
                                <div className="border-t border-gray-100 p-4 bg-white/80 backdrop-blur-xl">
                                    <div className="flex gap-3">
                                        <button
                                            onClick={handleCall}
                                            className="flex-1 py-3 px-4 bg-gray-100 text-gray-700 font-semibold rounded-2xl flex items-center justify-center gap-2 hover:bg-gray-200 transition-colors"
                                        >
                                            <Phone className="w-5 h-5" />
                                            Ara
                                        </button>
                                        <button
                                            onClick={handleWhatsApp}
                                            className="flex-1 py-3 px-4 bg-gradient-to-r from-emerald-500 to-green-600 text-white font-semibold rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 transition-all"
                                        >
                                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                                            </svg>
                                            WhatsApp
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}

// Main Component - Following InlineMenu pattern exactly
export function EmlakListingsSheet({ isOpen, businessSlug, businessName, whatsappNumber, onClose }: EmlakListingsSheetProps) {
    const [loading, setLoading] = useState(true);
    const [listings, setListings] = useState<Listing[]>([]);
    const [consultants, setConsultants] = useState<Consultant[]>([]);
    const [activeTab, setActiveTab] = useState<'ilanlar' | 'danismanlar'>('ilanlar');
    const [activeFilter, setActiveFilter] = useState<string>("all");
    const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
    const [showDetail, setShowDetail] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    // Fetch listings and consultants immediately on mount (prefetch for instant UX)
    useEffect(() => {
        if (listings.length > 0) return; // Already loaded

        const fetchData = async () => {
            setLoading(true);
            try {
                const [listingsRes, consultantsRes] = await Promise.all([
                    fetch(`/api/emlak/public-listings?businessSlug=${businessSlug}`),
                    fetch(`/api/emlak/public-consultants?businessSlug=${businessSlug}`)
                ]);

                const listingsData = await listingsRes.json();
                const consultantsData = await consultantsRes.json();

                if (listingsData.success && listingsData.data) {
                    setListings(listingsData.data.listings || []);
                }
                if (consultantsData.success && consultantsData.data) {
                    setConsultants(consultantsData.data.consultants || []);
                }
            } catch (err) {
                console.error("Data fetch error:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [businessSlug]);

    // Filter listings by type and search query
    const filteredListings = listings.filter(l => {
        // Filter by type
        if (activeFilter !== 'all' && l.propertyType !== activeFilter) return false;

        // Filter by search query
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase().trim();
            const titleMatch = l.title?.toLowerCase().includes(query);
            const locationMatch = `${l.location?.district || ''} ${l.location?.city || ''}`.toLowerCase().includes(query);
            const consultantMatch = l.consultant?.name?.toLowerCase().includes(query);
            if (!titleMatch && !locationMatch && !consultantMatch) return false;
        }

        return true;
    });

    const openDetail = (listing: Listing) => {
        setSelectedListing(listing);
        setShowDetail(true);
    };

    const filters = [
        { value: 'all', label: 'Tümü', count: listings.length },
        { value: 'residential', label: 'Konut', count: listings.filter(l => l.propertyType === 'residential').length },
        { value: 'commercial', label: 'Ticari', count: listings.filter(l => l.propertyType === 'commercial').length },
        { value: 'land', label: 'Arsa', count: listings.filter(l => l.propertyType === 'land').length },
    ].filter(f => f.value === 'all' || f.count > 0);

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
                    className="overflow-hidden w-full col-span-2"
                    style={{ marginTop: '0' }}
                >
                    {/* Inline Container */}
                    <div className="relative rounded-2xl overflow-hidden border border-gray-200/60 bg-white shadow-elevated">
                        {/* Background */}
                        <div className="absolute inset-0 bg-gradient-to-br from-gray-50 via-white to-gray-100" />

                        {/* Header with Tabs */}
                        <div className="relative border-b border-gray-100">
                            <div className="px-4 py-3 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="w-9 h-9 rounded-full bg-purple-100 flex items-center justify-center text-purple-600">
                                        <Building2 className="w-4 h-4" />
                                    </div>
                                    {/* Tab Buttons */}
                                    <div className="flex">
                                        <button
                                            onClick={() => setActiveTab('ilanlar')}
                                            className={clsx(
                                                "px-3 py-1.5 text-sm font-bold transition-all rounded-lg",
                                                activeTab === 'ilanlar'
                                                    ? "text-purple-600 bg-purple-50"
                                                    : "text-gray-500 hover:text-gray-700"
                                            )}
                                        >
                                            İlanlar
                                            <span className={clsx(
                                                "ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full",
                                                activeTab === 'ilanlar' ? "bg-purple-100 text-purple-600" : "bg-gray-100 text-gray-500"
                                            )}>
                                                {listings.length}
                                            </span>
                                        </button>
                                        {consultants.length > 0 && (
                                            <button
                                                onClick={() => setActiveTab('danismanlar')}
                                                className={clsx(
                                                    "px-3 py-1.5 text-sm font-bold transition-all rounded-lg",
                                                    activeTab === 'danismanlar'
                                                        ? "text-purple-600 bg-purple-50"
                                                        : "text-gray-500 hover:text-gray-700"
                                                )}
                                            >
                                                Danışmanlar
                                                <span className={clsx(
                                                    "ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full",
                                                    activeTab === 'danismanlar' ? "bg-purple-100 text-purple-600" : "bg-gray-100 text-gray-500"
                                                )}>
                                                    {consultants.length}
                                                </span>
                                            </button>
                                        )}
                                    </div>
                                </div>
                                <button
                                    onClick={onClose}
                                    className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-gray-600 transition-all"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        {/* Search Input - Only show when ilanlar tab is active */}
                        {activeTab === 'ilanlar' && !loading && listings.length > 0 && (
                            <div style={{ padding: '0 16px 8px 16px' }}>
                                <div style={{
                                    position: 'relative',
                                    display: 'flex',
                                    alignItems: 'center',
                                    backgroundColor: '#f3f4f6',
                                    borderRadius: '12px',
                                    padding: '8px 12px',
                                    gap: '8px'
                                }}>
                                    <Search style={{ width: '18px', height: '18px', color: '#9ca3af', flexShrink: 0 }} />
                                    <input
                                        type="text"
                                        placeholder="İlan ara (başlık, konum, danışman...)"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        style={{
                                            flex: 1,
                                            backgroundColor: 'transparent',
                                            border: 'none',
                                            outline: 'none',
                                            fontSize: '14px',
                                            color: '#374151',
                                            width: '100%'
                                        }}
                                    />
                                    {searchQuery && (
                                        <button
                                            onClick={() => setSearchQuery('')}
                                            style={{
                                                backgroundColor: '#d1d5db',
                                                borderRadius: '50%',
                                                width: '18px',
                                                height: '18px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                border: 'none',
                                                cursor: 'pointer',
                                                flexShrink: 0
                                            }}
                                        >
                                            <X style={{ width: '12px', height: '12px', color: '#6b7280' }} />
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Content Area */}
                        <div className="p-4">
                            {loading ? (
                                <div className="flex flex-col items-center justify-center py-12">
                                    <Loader2 className="w-8 h-8 animate-spin text-purple-500 mb-2" />
                                    <p className="text-sm text-gray-400 font-medium">Yükleniyor...</p>
                                </div>
                            ) : (
                                <>
                                    {/* İlanlar Tab */}
                                    {activeTab === 'ilanlar' && (
                                        <>
                                            {listings.length === 0 ? (
                                                <div className="text-center py-16 min-h-[200px] flex flex-col items-center justify-center">
                                                    <div className="w-16 h-16 rounded-full bg-purple-50 flex items-center justify-center mb-4">
                                                        <Building2 className="w-8 h-8 text-purple-400" />
                                                    </div>
                                                    <p className="text-gray-500 font-medium">Henüz ilan eklenmemiş</p>
                                                    <p className="text-gray-400 text-sm mt-1">İlanlar eklendiğinde burada görünecek</p>
                                                </div>
                                            ) : (
                                                <>
                                                    {/* Filter Pills - Compact */}
                                                    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide mb-2">
                                                        {filters.map((filter) => (
                                                            <button
                                                                key={filter.value}
                                                                onClick={() => setActiveFilter(filter.value)}
                                                                className={clsx(
                                                                    "px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1",
                                                                    activeFilter === filter.value
                                                                        ? "bg-purple-600 text-white shadow-md shadow-purple-200"
                                                                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                                                )}
                                                            >
                                                                {filter.label}
                                                                <span className={clsx(
                                                                    "text-[10px] px-1 rounded-full",
                                                                    activeFilter === filter.value ? "bg-white/20" : "bg-gray-200"
                                                                )}>{filter.count}</span>
                                                            </button>
                                                        ))}
                                                    </div>

                                                    {/* Listings Grid - Sahibinden Style */}
                                                    <div className="grid grid-cols-2 gap-3">
                                                        {filteredListings.map((listing, index) => {
                                                            const mainImage = listing.images?.find(img => img.isMain) || listing.images?.[0];
                                                            const PropertyIcon = PROPERTY_ICONS[listing.propertyType] || Home;
                                                            const imageCount = listing.images?.length || 0;

                                                            return (
                                                                <motion.div
                                                                    key={listing.id}
                                                                    initial={{ opacity: 0, y: 10 }}
                                                                    animate={{ opacity: 1, y: 0 }}
                                                                    transition={{ delay: index * 0.03 }}
                                                                    onClick={() => openDetail(listing)}
                                                                    className="group bg-white rounded-xl border border-gray-100 hover:border-purple-200 hover:shadow-lg cursor-pointer transition-all flex flex-col"
                                                                >
                                                                    {/* Image Container - Fixed Height */}
                                                                    <div className="relative h-32 bg-gray-100 rounded-t-xl overflow-hidden flex-shrink-0">
                                                                        {mainImage?.url ? (
                                                                            <Image
                                                                                src={mainImage.url}
                                                                                alt={listing.title || 'İlan'}
                                                                                fill
                                                                                className="object-cover transition-transform duration-500 group-hover:scale-105"
                                                                                priority={index < 4}

                                                                            />
                                                                        ) : (
                                                                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
                                                                                <PropertyIcon className="w-10 h-10 text-gray-300" />
                                                                            </div>
                                                                        )}

                                                                        {/* Property Type Badge - Top Left */}
                                                                        <div className={clsx(
                                                                            "absolute top-2 left-2 px-2 py-1 rounded-md text-[10px] font-bold text-white shadow-md",
                                                                            listing.propertyType === 'residential' ? 'bg-blue-600' :
                                                                                listing.propertyType === 'commercial' ? 'bg-amber-500' : 'bg-emerald-600'
                                                                        )}>
                                                                            {PROPERTY_LABELS[listing.propertyType]}
                                                                        </div>

                                                                        {/* Image Count - Top Right */}
                                                                        {imageCount > 1 && (
                                                                            <div className="absolute top-2 right-2 px-2 py-1 bg-black/60 backdrop-blur-sm rounded-md flex items-center gap-1 text-white text-[10px] font-medium">
                                                                                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                                                                    <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                                                                                </svg>
                                                                                {imageCount}
                                                                            </div>
                                                                        )}

                                                                        {/* Features Badges - Bottom */}
                                                                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 via-black/40 to-transparent p-2 pt-4">
                                                                            <div className="flex items-center gap-1 flex-wrap">
                                                                                {listing.features?.grossArea && (
                                                                                    <span className="px-1.5 py-0.5 bg-white/90 rounded text-[9px] font-bold text-gray-800">
                                                                                        {listing.features.grossArea} m²
                                                                                    </span>
                                                                                )}
                                                                                {listing.features?.roomCount && (
                                                                                    <span className="px-1.5 py-0.5 bg-white/90 rounded text-[9px] font-bold text-gray-800">
                                                                                        {listing.features.roomCount}
                                                                                    </span>
                                                                                )}
                                                                                {listing.features?.floor !== undefined && (
                                                                                    <span className="px-1.5 py-0.5 bg-white/90 rounded text-[9px] font-bold text-gray-800">
                                                                                        {listing.features.floor}. Kat
                                                                                    </span>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                    </div>

                                                                    {/* Content - Using inline styles for guaranteed visibility */}
                                                                    <div style={{ padding: '10px', minHeight: '85px', backgroundColor: 'white', position: 'relative', zIndex: 10 }}>
                                                                        {/* Title */}
                                                                        <h4 style={{ fontWeight: 600, color: '#111827', fontSize: '11px', lineHeight: 1.3, marginBottom: '4px' }}>
                                                                            {listing.title || 'İlan Başlığı'}
                                                                        </h4>

                                                                        {/* Price */}
                                                                        <div style={{ marginTop: '4px' }}>
                                                                            <span style={{ fontWeight: 700, color: '#9333ea', fontSize: '13px' }}>
                                                                                {formatPrice(listing.price || 0, listing.currency)}
                                                                            </span>
                                                                        </div>

                                                                        {/* Location */}
                                                                        <p style={{ fontSize: '10px', color: '#9ca3af', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                                                                            <MapPin style={{ width: '10px', height: '10px' }} />
                                                                            {listing.location?.district || 'Konum'} / {listing.location?.city || ''}
                                                                        </p>

                                                                        {/* Consultant/Business Info */}
                                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #f3f4f6' }}>
                                                                            {listing.consultant?.photoUrl ? (
                                                                                <Image
                                                                                    src={toR2ProxyUrl(listing.consultant.photoUrl)}
                                                                                    alt={listing.consultant.name || 'Danışman'}
                                                                                    width={18}
                                                                                    height={18}
                                                                                    style={{ borderRadius: '50%', objectFit: 'cover' }}

                                                                                />
                                                                            ) : (
                                                                                <div style={{ width: '18px', height: '18px', borderRadius: '50%', backgroundColor: '#f3e8ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                                                    <User style={{ width: '10px', height: '10px', color: '#a855f7' }} />
                                                                                </div>
                                                                            )}
                                                                            <span style={{ fontSize: '10px', color: '#4b5563', fontWeight: 500 }}>
                                                                                {listing.consultant?.name || businessName}
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                </motion.div>
                                                            );
                                                        })}
                                                    </div>
                                                </>
                                            )}
                                        </>
                                    )}

                                    {activeTab === 'danismanlar' && (
                                        <div className="space-y-3">
                                            {consultants.map((consultant, index) => (
                                                <motion.div
                                                    key={consultant.id}
                                                    initial={{ opacity: 0, y: 10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    transition={{ delay: index * 0.05 }}
                                                >
                                                    <Link
                                                        href={`/${businessSlug}/danisman/${consultant.slug || consultant.id}`}
                                                        style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '16px', backgroundColor: 'white', borderRadius: '16px', border: '1px solid #e5e7eb', minHeight: '88px', textDecoration: 'none', cursor: 'pointer', transition: 'all 0.2s' }}
                                                        className="group hover:border-purple-300 hover:shadow-md"
                                                    >
                                                        {/* Photo */}
                                                        <div style={{ position: 'relative', width: '56px', height: '56px', borderRadius: '50%', overflow: 'hidden', flexShrink: 0, backgroundColor: '#f3e8ff' }}>
                                                            {consultant.photoUrl ? (
                                                                <Image
                                                                    src={toR2ProxyUrl(consultant.photoUrl)}
                                                                    alt={consultant.name || 'Danışman'}
                                                                    fill
                                                                    style={{ objectFit: 'cover' }}

                                                                />
                                                            ) : (
                                                                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                                    <User style={{ width: '28px', height: '28px', color: '#a855f7' }} />
                                                                </div>
                                                            )}
                                                        </div>

                                                        {/* Info */}
                                                        <div style={{ flex: 1, minWidth: 0, position: 'relative', zIndex: 10 }}>
                                                            <h4 style={{ fontWeight: 700, color: '#111827', fontSize: '14px', marginBottom: '2px' }}>{consultant.name || 'DanışmanA'}</h4>
                                                            <p style={{ fontSize: '12px', color: '#6b7280', marginBottom: '8px' }}>{consultant.title || 'Emlak Danışmanı'}</p>
                                                            {/* Contact Buttons */}
                                                            <div style={{ display: 'flex', gap: '8px' }}>
                                                                <span
                                                                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); window.location.href = `tel:${consultant.phone || ''}`; }}
                                                                    style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 12px', backgroundColor: '#f3f4f6', color: '#374151', borderRadius: '8px', fontSize: '12px', fontWeight: 500, textDecoration: 'none', cursor: 'pointer' }}
                                                                >
                                                                    <Phone style={{ width: '12px', height: '12px' }} />
                                                                    Ara
                                                                </span>
                                                                <span
                                                                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); window.open(`https://wa.me/${(consultant.whatsapp || consultant.phone || '').replace(/[\s\-\(\)]/g, '')}`, '_blank'); }}
                                                                    style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 12px', backgroundColor: '#22c55e', color: 'white', borderRadius: '8px', fontSize: '12px', fontWeight: 500, textDecoration: 'none', cursor: 'pointer' }}
                                                                >
                                                                    <svg style={{ width: '12px', height: '12px' }} fill="currentColor" viewBox="0 0 24 24">
                                                                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                                                                    </svg>
                                                                    WhatsApp
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </Link>
                                                </motion.div>
                                            ))}
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </div>

                    {/* Listing Detail Modal (Portal) */}
                    {mounted && showDetail && (
                        createPortal(
                            <ListingDetailModal
                                listing={selectedListing}
                                isOpen={showDetail}
                                onClose={() => {
                                    setShowDetail(false);
                                    setSelectedListing(null);
                                }}
                            />,
                            document.body
                        )
                    )}
                </motion.div>
            )}
        </AnimatePresence>
    );
}

