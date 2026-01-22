"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
    Loader2,
    ArrowLeft,
    MapPin,
    Home,
    Building2,
    Trees,
    Bed,
    Maximize2,
    Calendar,
    Flame,
    Bath,
    Car,
    Sofa,
    Phone,
    MessageCircle,
    Share2,
    ChevronLeft,
    ChevronRight,
    X
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { toR2ProxyUrl } from "@/lib/publicImage";

// Types
interface Consultant {
    id: string;
    name: string;
    title?: string;
    phone: string;
    whatsapp?: string;
    email?: string;
    photoUrl?: string;
}

interface ListingLocation {
    city: string;
    district: string;
    neighborhood?: string;
    address?: string;
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

interface Listing {
    id: string;
    title: string;
    description?: string;
    propertyType: string;
    price: number;
    currency: string;
    images: ListingImage[];
    location: ListingLocation;
    features: ListingFeatures;
    consultant?: Consultant | null;
    createdAt?: string;
}

const formatPrice = (price: number, currency: string = "TRY"): string => {
    const symbols: Record<string, string> = { TRY: "₺", USD: "$", EUR: "€" };
    return `${symbols[currency] || "₺"}${price.toLocaleString("tr-TR")}`;
};

const PROPERTY_LABELS: Record<string, string> = {
    residential: "Konut",
    commercial: "Ticari",
    land: "Arsa",
};

const HEATING_LABELS: Record<string, string> = {
    central: "Merkezi",
    individual: "Bireysel",
    floor: "Yerden Isıtma",
    ac: "Klima",
    stove: "Soba",
    none: "Yok",
};

export default function EmlakDetailPage() {
    const params = useParams();
    const router = useRouter();
    const slug = params.slug as string;
    const listingId = params.listingId as string;

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [listing, setListing] = useState<Listing | null>(null);
    const [businessName, setBusinessName] = useState("");
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [isGalleryOpen, setIsGalleryOpen] = useState(false);

    // Fetch listing
    useEffect(() => {
        const fetchListing = async () => {
            try {
                setLoading(true);
                const res = await fetch(`/api/emlak/public-listings?businessSlug=${slug}`);
                const data = await res.json();

                if (!data.success) {
                    setError(data.error || "İlan yüklenemedi");
                    return;
                }

                setBusinessName(data.data.businessName || "");
                const found = data.data.listings?.find((l: Listing) => l.id === listingId);

                if (!found) {
                    setError("İlan bulunamadı");
                    return;
                }

                setListing(found);
            } catch (err) {
                console.error("Listing fetch error:", err);
                setError("İlan yüklenirken bir hata oluştu");
            } finally {
                setLoading(false);
            }
        };

        fetchListing();
    }, [slug, listingId]);

    // WhatsApp handler
    const handleWhatsApp = () => {
        if (!listing?.consultant) return;
        const phone = listing.consultant.whatsapp || listing.consultant.phone;
        if (!phone) return;

        const message = encodeURIComponent(
            `Merhaba, "${listing.title}" ilanı hakkında bilgi almak istiyorum.\n\nFiyat: ${formatPrice(listing.price, listing.currency)}\nKonum: ${listing.location.district}, ${listing.location.city}`
        );
        window.open(`https://wa.me/${phone.replace(/\D/g, "")}?text=${message}`, "_blank");
    };

    // Share handler
    const handleShare = async () => {
        if (!listing) return;
        const url = window.location.href;
        const text = `${listing.title} - ${formatPrice(listing.price, listing.currency)}`;

        if (navigator.share) {
            await navigator.share({ title: listing.title, text, url });
        } else {
            navigator.clipboard.writeText(url);
            alert("Link kopyalandı!");
        }
    };

    // Gallery navigation
    const nextImage = () => {
        if (!listing?.images) return;
        setCurrentImageIndex((prev) => (prev + 1) % listing.images.length);
    };

    const prevImage = () => {
        if (!listing?.images) return;
        setCurrentImageIndex((prev) => (prev - 1 + listing.images.length) % listing.images.length);
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="w-10 h-10 animate-spin text-emerald-500 mx-auto mb-4" />
                    <p className="text-gray-500">İlan yükleniyor...</p>
                </div>
            </div>
        );
    }

    if (error || !listing) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
                <div className="text-center">
                    <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
                        <span className="text-3xl">😕</span>
                    </div>
                    <h2 className="text-lg font-semibold text-gray-900 mb-2">İlan Bulunamadı</h2>
                    <p className="text-gray-500 mb-4">{error}</p>
                    <Link
                        href={`/${slug}/emlak`}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-lg"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        İlanlara Dön
                    </Link>
                </div>
            </div>
        );
    }

    const sortedImages = [...(listing.images || [])].sort((a, b) => a.order - b.order);
    const mainImage = sortedImages[currentImageIndex]?.url || sortedImages[0]?.url;

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-100">
                <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
                    <button
                        onClick={() => router.back()}
                        className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5 text-gray-700" />
                    </button>
                    <button
                        onClick={handleShare}
                        className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
                    >
                        <Share2 className="w-5 h-5 text-gray-700" />
                    </button>
                </div>
            </header>

            {/* Image Gallery */}
            <div className="relative bg-gray-900">
                <div
                    className="relative aspect-[16/10] cursor-pointer"
                    onClick={() => setIsGalleryOpen(true)}
                >
                    {mainImage ? (
                        <Image
                            src={mainImage}
                            alt={listing.title}
                            fill
                            className="object-cover"
                        />
                    ) : (
                        <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
                            <Home className="w-20 h-20 text-gray-600" />
                        </div>
                    )}

                    {/* Navigation arrows */}
                    {sortedImages.length > 1 && (
                        <>
                            <button
                                onClick={(e) => { e.stopPropagation(); prevImage(); }}
                                className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70"
                            >
                                <ChevronLeft className="w-6 h-6" />
                            </button>
                            <button
                                onClick={(e) => { e.stopPropagation(); nextImage(); }}
                                className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70"
                            >
                                <ChevronRight className="w-6 h-6" />
                            </button>
                        </>
                    )}

                    {/* Image counter */}
                    {sortedImages.length > 1 && (
                        <div className="absolute bottom-4 right-4 px-3 py-1.5 rounded-full bg-black/60 text-white text-sm">
                            {currentImageIndex + 1} / {sortedImages.length}
                        </div>
                    )}
                </div>
            </div>

            {/* Content */}
            <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
                {/* Price & Type */}
                <div className="flex items-center justify-between">
                    <div className="px-4 py-2 rounded-xl bg-emerald-500 text-white font-bold text-xl">
                        {formatPrice(listing.price, listing.currency)}
                    </div>
                    <div className="px-3 py-1.5 rounded-full bg-gray-100 text-gray-700 text-sm font-medium">
                        {PROPERTY_LABELS[listing.propertyType] || "Konut"}
                    </div>
                </div>

                {/* Title */}
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">{listing.title}</h1>
                    <div className="flex items-center gap-1.5 text-gray-500">
                        <MapPin className="w-4 h-4" />
                        <span>
                            {listing.location.neighborhood && `${listing.location.neighborhood}, `}
                            {listing.location.district}, {listing.location.city}
                        </span>
                    </div>
                </div>

                {/* Features Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {listing.features.roomCount && (
                        <div className="bg-white rounded-xl p-4 text-center border border-gray-100">
                            <Bed className="w-6 h-6 text-emerald-500 mx-auto mb-2" />
                            <div className="font-bold text-gray-900">{listing.features.roomCount}</div>
                            <div className="text-xs text-gray-500">Oda</div>
                        </div>
                    )}
                    <div className="bg-white rounded-xl p-4 text-center border border-gray-100">
                        <Maximize2 className="w-6 h-6 text-emerald-500 mx-auto mb-2" />
                        <div className="font-bold text-gray-900">{listing.features.grossArea} m²</div>
                        <div className="text-xs text-gray-500">Brüt Alan</div>
                    </div>
                    {listing.features.floor !== undefined && (
                        <div className="bg-white rounded-xl p-4 text-center border border-gray-100">
                            <Building2 className="w-6 h-6 text-emerald-500 mx-auto mb-2" />
                            <div className="font-bold text-gray-900">
                                {listing.features.floor}
                                {listing.features.totalFloors && `/${listing.features.totalFloors}`}
                            </div>
                            <div className="text-xs text-gray-500">Kat</div>
                        </div>
                    )}
                    {listing.features.buildingAge !== undefined && (
                        <div className="bg-white rounded-xl p-4 text-center border border-gray-100">
                            <Calendar className="w-6 h-6 text-emerald-500 mx-auto mb-2" />
                            <div className="font-bold text-gray-900">{listing.features.buildingAge}</div>
                            <div className="text-xs text-gray-500">Bina Yaşı</div>
                        </div>
                    )}
                </div>

                {/* Additional Features */}
                {(listing.features.heating || listing.features.bathrooms || listing.features.parking || listing.features.furnished) && (
                    <div className="bg-white rounded-xl p-4 border border-gray-100">
                        <h3 className="font-bold text-gray-900 mb-3">Özellikler</h3>
                        <div className="flex flex-wrap gap-2">
                            {listing.features.heating && (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 rounded-full text-sm text-gray-700">
                                    <Flame className="w-4 h-4" />
                                    {HEATING_LABELS[listing.features.heating] || listing.features.heating}
                                </span>
                            )}
                            {listing.features.bathrooms && (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 rounded-full text-sm text-gray-700">
                                    <Bath className="w-4 h-4" />
                                    {listing.features.bathrooms} Banyo
                                </span>
                            )}
                            {listing.features.parking && (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-100 text-emerald-700 rounded-full text-sm">
                                    <Car className="w-4 h-4" />
                                    Otopark
                                </span>
                            )}
                            {listing.features.furnished && (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-100 text-emerald-700 rounded-full text-sm">
                                    <Sofa className="w-4 h-4" />
                                    Eşyalı
                                </span>
                            )}
                        </div>
                    </div>
                )}

                {/* Description */}
                {listing.description && (
                    <div className="bg-white rounded-xl p-4 border border-gray-100">
                        <h3 className="font-bold text-gray-900 mb-3">Açıklama</h3>
                        <p className="text-gray-600 whitespace-pre-line">{listing.description}</p>
                    </div>
                )}

                {/* Consultant Card */}
                {listing.consultant && (
                    <div className="bg-white rounded-xl p-4 border border-gray-100">
                        <h3 className="font-bold text-gray-900 mb-4">İletişim</h3>
                        <div className="flex items-center gap-4">
                            {listing.consultant.photoUrl ? (
                                <Image
                                    src={toR2ProxyUrl(listing.consultant.photoUrl)}
                                    alt={listing.consultant.name}
                                    width={64}
                                    height={64}
                                    className="rounded-full object-cover"
                                />
                            ) : (
                                <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center text-2xl font-bold text-emerald-600">
                                    {listing.consultant.name.charAt(0)}
                                </div>
                            )}
                            <div className="flex-1">
                                <p className="font-bold text-gray-900">{listing.consultant.name}</p>
                                {listing.consultant.title && (
                                    <p className="text-sm text-gray-500">{listing.consultant.title}</p>
                                )}
                            </div>
                        </div>

                        {/* Contact buttons */}
                        <div className="flex gap-3 mt-4">
                            {listing.consultant.phone && (
                                <a
                                    href={`tel:${listing.consultant.phone}`}
                                    className="flex-1 flex items-center justify-center gap-2 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
                                >
                                    <Phone className="w-5 h-5" />
                                    Ara
                                </a>
                            )}
                            {(listing.consultant.whatsapp || listing.consultant.phone) && (
                                <button
                                    onClick={handleWhatsApp}
                                    className="flex-1 flex items-center justify-center gap-2 py-3 bg-green-500 text-white rounded-xl font-medium hover:bg-green-600 transition-colors"
                                >
                                    <MessageCircle className="w-5 h-5" />
                                    WhatsApp
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </main>

            {/* Fullscreen Gallery Modal */}
            <AnimatePresence>
                {isGalleryOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] bg-black flex items-center justify-center"
                    >
                        <button
                            onClick={() => setIsGalleryOpen(false)}
                            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/20 text-white flex items-center justify-center z-10"
                        >
                            <X className="w-6 h-6" />
                        </button>

                        <div className="relative w-full h-full flex items-center justify-center p-4">
                            {mainImage && (
                                <Image
                                    src={mainImage}
                                    alt={listing.title}
                                    fill
                                    className="object-contain"
                                />
                            )}
                        </div>

                        {sortedImages.length > 1 && (
                            <>
                                <button
                                    onClick={prevImage}
                                    className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/20 text-white flex items-center justify-center"
                                >
                                    <ChevronLeft className="w-8 h-8" />
                                </button>
                                <button
                                    onClick={nextImage}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/20 text-white flex items-center justify-center"
                                >
                                    <ChevronRight className="w-8 h-8" />
                                </button>
                            </>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Footer */}
            <footer className="text-center py-8 text-sm text-gray-400">
                <a href="https://tikprofil.com" target="_blank" rel="noopener noreferrer" className="hover:text-emerald-500">
                    tikprofil.com
                </a>
            </footer>
        </div>
    );
}
