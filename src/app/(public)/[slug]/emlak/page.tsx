"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
    Loader2,
    Home,
    Building2,
    Trees,
    Filter,
    ArrowLeft,
    Search
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { EmlakListingCard } from "@/components/public/emlak/EmlakListingCard";

// Types
interface Consultant {
    id: string;
    name: string;
    phone: string;
    whatsapp?: string;
    photoUrl?: string;
}

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
}

interface Listing {
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
}

const PROPERTY_TYPES = [
    { id: "all", label: "Tümü", icon: Filter },
    { id: "residential", label: "Konut", icon: Home },
    { id: "commercial", label: "Ticari", icon: Building2 },
    { id: "land", label: "Arsa", icon: Trees },
];

export default function EmlakPublicPage() {
    const params = useParams();
    const router = useRouter();
    const slug = params.slug as string;

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [listings, setListings] = useState<Listing[]>([]);
    const [businessName, setBusinessName] = useState("");
    const [selectedType, setSelectedType] = useState("all");
    const [searchQuery, setSearchQuery] = useState("");

    // Fetch listings
    useEffect(() => {
        const fetchListings = async () => {
            try {
                setLoading(true);
                const res = await fetch(
                    `/api/emlak/public-listings?businessSlug=${slug}&propertyType=${selectedType}`
                );
                const data = await res.json();

                if (!data.success) {
                    setError(data.error || "İlanlar yüklenemedi");
                    return;
                }

                setListings(data.data.listings || []);
                setBusinessName(data.data.businessName || "");
            } catch (err) {
                console.error("Listings fetch error:", err);
                setError("İlanlar yüklenirken bir hata oluştu");
            } finally {
                setLoading(false);
            }
        };

        fetchListings();
    }, [slug, selectedType]);

    // Filter by search query
    const filteredListings = listings.filter(listing =>
        searchQuery === "" ||
        listing.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        listing.location.district.toLowerCase().includes(searchQuery.toLowerCase()) ||
        listing.location.city.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // WhatsApp handler
    const handleWhatsApp = (listing: Listing) => {
        const phone = listing.consultant?.whatsapp || listing.consultant?.phone;
        if (!phone) return;

        const message = encodeURIComponent(
            `Merhaba, "${listing.title}" ilanı hakkında bilgi almak istiyorum.`
        );
        window.open(`https://wa.me/${phone.replace(/\D/g, "")}?text=${message}`, "_blank");
    };

    // Navigate to listing detail
    const goToListing = (listingId: string) => {
        router.push(`/${slug}/emlak/${listingId}`);
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="w-10 h-10 animate-spin text-emerald-500 mx-auto mb-4" />
                    <p className="text-gray-500">İlanlar yükleniyor...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
                <div className="text-center">
                    <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
                        <span className="text-3xl">😕</span>
                    </div>
                    <h2 className="text-lg font-semibold text-gray-900 mb-2">İlanlar Yüklenemedi</h2>
                    <p className="text-gray-500">{error}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-100">
                <div className="max-w-4xl mx-auto px-4 py-4">
                    <div className="flex items-center gap-3">
                        <Link
                            href={`/${slug}`}
                            className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5 text-gray-700" />
                        </Link>
                        <div>
                            <h1 className="font-bold text-gray-900 text-lg">{businessName}</h1>
                            <p className="text-sm text-gray-500">
                                {filteredListings.length} ilan
                            </p>
                        </div>
                    </div>
                </div>
            </header>

            {/* Search & Filters */}
            <div className="sticky top-[73px] z-40 bg-gray-50 border-b border-gray-100 pb-4">
                <div className="max-w-4xl mx-auto px-4 pt-4 space-y-3">
                    {/* Search */}
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                            type="text"
                            placeholder="İlan veya konum ara..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-12 pr-4 py-3 rounded-xl bg-white border border-gray-200 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                        />
                    </div>

                    {/* Type Filter */}
                    <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-hide">
                        {PROPERTY_TYPES.map((type) => {
                            const isActive = selectedType === type.id;
                            const Icon = type.icon;
                            return (
                                <button
                                    key={type.id}
                                    onClick={() => setSelectedType(type.id)}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap transition-all ${isActive
                                            ? "bg-emerald-500 text-white shadow-lg"
                                            : "bg-white text-gray-600 border border-gray-200 hover:border-emerald-300"
                                        }`}
                                >
                                    <Icon className="w-4 h-4" />
                                    {type.label}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Listings Grid */}
            <main className="max-w-4xl mx-auto px-4 py-6">
                {filteredListings.length === 0 ? (
                    <div className="text-center py-16">
                        <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                            <Home className="w-10 h-10 text-gray-300" />
                        </div>
                        <h2 className="text-lg font-semibold text-gray-900 mb-2">İlan Bulunamadı</h2>
                        <p className="text-gray-500">
                            {searchQuery
                                ? "Aramanızla eşleşen ilan bulunamadı"
                                : "Henüz aktif ilan bulunmuyor"}
                        </p>
                    </div>
                ) : (
                    <div className="grid gap-4 md:grid-cols-2">
                        <AnimatePresence mode="popLayout">
                            {filteredListings.map((listing, index) => (
                                <motion.div
                                    key={listing.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    transition={{ delay: index * 0.05 }}
                                >
                                    <EmlakListingCard
                                        listing={listing}
                                        onClick={() => goToListing(listing.id)}
                                        onWhatsApp={() => handleWhatsApp(listing)}
                                    />
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                )}
            </main>

            {/* Footer */}
            <footer className="text-center py-8 text-sm text-gray-400">
                <a href="https://tikprofil.com" target="_blank" rel="noopener noreferrer" className="hover:text-emerald-500">
                    tikprofil.com
                </a>
            </footer>
        </div>
    );
}
