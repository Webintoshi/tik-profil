import { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Phone, MapPin, Home, Building2, Trees, ChevronLeft } from "lucide-react";
import { toR2ProxyUrl } from "@/lib/publicImage";

// ============================================
// TYPES
// ============================================
interface Consultant {
    id: string;
    name: string;
    title: string;
    phone: string;
    whatsapp: string;
    email?: string;
    photoUrl?: string;
    slug: string;
    bio?: string;
    socialLinks?: {
        instagram?: string;
        linkedin?: string;
        twitter?: string;
    };
}

interface Business {
    id: string;
    name: string;
    slug: string;
    logo?: string;
}

interface Listing {
    id: string;
    title: string;
    price: number;
    currency: string;
    propertyType: string;
    location: {
        city: string;
        district: string;
    };
    features: {
        grossArea: number;
        roomCount?: string;
    };
    images: Array<{ url: string; isMain: boolean }>;
}

interface ConsultantData {
    consultant: Consultant;
    business: Business;
    listings: Listing[];
    stats: {
        totalListings: number;
        activeListings: number;
    };
}

// Property type icons
const PROPERTY_ICONS: Record<string, typeof Home> = {
    residential: Home,
    commercial: Building2,
    land: Trees,
};

// ============================================
// DATA FETCHING
// ============================================
async function getConsultantData(businessSlug: string, consultantSlug: string): Promise<ConsultantData | null> {
    try {
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://tikprofil.com';
        const res = await fetch(
            `${baseUrl}/api/emlak/public-consultant/${consultantSlug}?businessSlug=${businessSlug}`,
            { cache: 'no-store' }
        );

        if (!res.ok) return null;

        const data = await res.json();
        if (!data.success) return null;

        return data.data;
    } catch (error) {
        console.error('Error fetching consultant:', error);
        return null;
    }
}

// ============================================
// METADATA
// ============================================
export async function generateMetadata({
    params
}: {
    params: Promise<{ slug: string; consultantSlug: string }>
}): Promise<Metadata> {
    const { slug, consultantSlug } = await params;
    const data = await getConsultantData(slug, consultantSlug);

    if (!data) {
        return { title: "Danışman Bulunamadı" };
    }

    return {
        title: `${data.consultant.name} | ${data.business.name} | Tık Profil`,
        description: data.consultant.bio || `${data.consultant.name} - ${data.consultant.title} - ${data.business.name}`,
    };
}

// ============================================
// WHATSAPP ICON
// ============================================
const WhatsAppIcon = () => (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
);

// ============================================
// MAIN PAGE
// ============================================
export default async function ConsultantPublicPage({
    params
}: {
    params: Promise<{ slug: string; consultantSlug: string }>
}) {
    const { slug, consultantSlug } = await params;
    const data = await getConsultantData(slug, consultantSlug);

    if (!data) {
        notFound();
    }

    const { consultant, business, listings, stats } = data;

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header with back button */}
            <div className="bg-white border-b border-gray-100 sticky top-0 z-10">
                <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
                    <Link
                        href={`/${business.slug}`}
                        className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
                    >
                        <ChevronLeft className="w-5 h-5" />
                    </Link>
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                        {business.logo && (
                            <Image
                                src={toR2ProxyUrl(business.logo)}
                                alt={business.name}
                                width={28}
                                height={28}
                                className="rounded-full object-cover"
                            />
                        )}
                        <span className="text-sm font-medium text-gray-600 truncate">{business.name}</span>
                    </div>
                </div>
            </div>

            <div className="max-w-lg mx-auto">
                {/* Profile Section */}
                <div className="bg-white">
                    <div className="px-6 py-8 text-center">
                        {/* Photo */}
                        <div className="w-28 h-28 mx-auto mb-4 rounded-full overflow-hidden bg-gray-100 ring-4 ring-white shadow-lg">
                            {consultant.photoUrl ? (
                                <Image
                                    src={toR2ProxyUrl(consultant.photoUrl)}
                                    alt={consultant.name}
                                    width={112}
                                    height={112}
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-500 to-purple-700 text-white text-3xl font-bold">
                                    {consultant.name.charAt(0).toUpperCase()}
                                </div>
                            )}
                        </div>

                        {/* Name & Title */}
                        <h1 className="text-2xl font-bold text-gray-900">{consultant.name}</h1>
                        <p className="text-purple-600 font-medium mt-1">{consultant.title}</p>

                        {/* Stats */}
                        <div className="flex justify-center gap-6 mt-4">
                            <div className="text-center">
                                <div className="text-2xl font-bold text-gray-900">{stats.activeListings}</div>
                                <div className="text-xs text-gray-500">Aktif İlan</div>
                            </div>
                        </div>
                    </div>

                    {/* Contact Buttons */}
                    <div className="px-6 pb-6 grid grid-cols-2 gap-3">
                        <a
                            href={`tel:${consultant.phone}`}
                            className="h-12 flex items-center justify-center gap-2 bg-blue-600 text-white font-semibold rounded-xl shadow-lg shadow-blue-600/25 hover:bg-blue-700 transition-colors"
                        >
                            <Phone className="w-5 h-5" />
                            Ara
                        </a>
                        <a
                            href={`https://wa.me/${consultant.whatsapp}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="h-12 flex items-center justify-center gap-2 bg-[#25D366] text-white font-semibold rounded-xl shadow-lg shadow-green-500/25 hover:bg-[#20bd5a] transition-colors"
                        >
                            <WhatsAppIcon />
                            WhatsApp
                        </a>
                    </div>

                    {/* Bio */}
                    {consultant.bio && (
                        <div className="px-6 pb-6">
                            <h3 className="font-semibold text-gray-900 mb-2">Hakkında</h3>
                            <p className="text-gray-600 text-sm leading-relaxed">{consultant.bio}</p>
                        </div>
                    )}

                    {/* Social Links */}
                    {consultant.socialLinks && Object.values(consultant.socialLinks).some(v => v) && (
                        <div className="px-6 pb-6">
                            <div className="flex gap-3 justify-center">
                                {consultant.socialLinks.instagram && (
                                    <a
                                        href={`https://instagram.com/${consultant.socialLinks.instagram}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="w-10 h-10 flex items-center justify-center rounded-full bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400 text-white"
                                    >
                                        <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
                                            <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                                        </svg>
                                    </a>
                                )}
                                {consultant.socialLinks.linkedin && (
                                    <a
                                        href={consultant.socialLinks.linkedin}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="w-10 h-10 flex items-center justify-center rounded-full bg-[#0077b5] text-white"
                                    >
                                        <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
                                            <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                                        </svg>
                                    </a>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Listings Section */}
                <div className="mt-2 bg-white">
                    <div className="px-6 py-4 border-b border-gray-100">
                        <h2 className="font-bold text-gray-900">Aktif İlanlar</h2>
                    </div>

                    {listings.length === 0 ? (
                        <div className="px-6 py-12 text-center">
                            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                                <Home className="w-8 h-8 text-gray-400" />
                            </div>
                            <p className="text-gray-500">Henüz aktif ilan yok</p>
                        </div>
                    ) : (
                        <div className="p-4 grid grid-cols-2 gap-3">
                            {listings.map((listing) => {
                                const mainImage = listing.images?.find(img => img.isMain) || listing.images?.[0];
                                const PropertyIcon = PROPERTY_ICONS[listing.propertyType] || Home;

                                return (
                                    <Link
                                        key={listing.id}
                                        href={`/${business.slug}/emlak/${listing.id}`}
                                        className="group bg-white rounded-xl border border-gray-100 overflow-hidden hover:border-purple-200 hover:shadow-lg transition-all"
                                    >
                                        {/* Image */}
                                        <div className="relative h-28 bg-gray-100">
                                            {mainImage?.url ? (
                                                <Image
                                                    src={mainImage.url}
                                                    alt={listing.title}
                                                    fill
                                                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center">
                                                    <PropertyIcon className="w-8 h-8 text-gray-300" />
                                                </div>
                                            )}
                                        </div>

                                        {/* Content */}
                                        <div className="p-3">
                                            <h3 className="font-semibold text-sm text-gray-900 line-clamp-1">{listing.title}</h3>
                                            <div className="flex items-center gap-1 mt-1 text-xs text-gray-500">
                                                <MapPin className="w-3 h-3" />
                                                <span className="truncate">{listing.location.district}</span>
                                            </div>
                                            <div className="mt-2 font-bold text-purple-600">
                                                {listing.currency === 'TRY' ? '₺' : listing.currency === 'USD' ? '$' : '€'}
                                                {listing.price.toLocaleString('tr-TR')}
                                            </div>
                                        </div>
                                    </Link>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="py-8 text-center">
                    <Link href="/" className="inline-flex items-center gap-2 text-gray-400 text-sm hover:text-gray-600 transition-colors">
                        <span>Tık Profil</span>
                    </Link>
                </div>
            </div>
        </div>
    );
}
