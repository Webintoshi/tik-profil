import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, BedDouble, Users, Bath, Wifi, Tv, Wind, Coffee, Utensils, Phone } from "lucide-react";
import { toR2ProxyUrl } from "@/lib/publicImage";

// Types
interface RoomType {
    id: string;
    name: string;
    description?: string;
    capacity: number;
    bedType: string;
    pricePerNight: number;
    amenities: string[];
    imageUrl?: string;
}

interface Business {
    id: string;
    slug: string;
    name: string;
    logo?: string;
    phone?: string;
    whatsapp?: string;
}

// Amenity icons mapping
const AMENITY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
    wifi: Wifi,
    tv: Tv,
    klima: Wind,
    minibar: Coffee,
    kahvalti: Utensils,
};

async function getBusinessBySlug(slug: string): Promise<Business | null> {
    try {
        const { getSupabaseAdmin } = await import("@/lib/supabase");
        const supabase = getSupabaseAdmin();

        const { data, error } = await supabase
            .from('businesses')
            .select('id, slug, name, logo, phone, whatsapp')
            .ilike('slug', slug)
            .maybeSingle();

        if (error || !data) return null;

        return {
            id: data.id as string,
            slug: (data.slug as string) || slug,
            name: (data.name as string) || "İşletme",
            logo: data.logo as string | undefined,
            phone: data.phone as string | undefined,
            whatsapp: (data.whatsapp as string) || (data.phone as string) || undefined,
        };
    } catch (error) {
        console.error("Error fetching business:", error);
        return null;
    }
}

async function getRoomTypes(businessId: string): Promise<RoomType[]> {
    try {
        const { getCollectionREST } = await import("@/lib/documentStore");
        const roomTypes = await getCollectionREST("room_types");

        return roomTypes
            .filter((doc) => doc.businessId === businessId || doc.business_id === businessId)
            .map((doc) => ({
                id: doc.id as string,
                name: (doc.name as string) || 'Oda',
                description: (doc.description as string) || '',
                capacity: Number(doc.capacity || 2),
                bedType: (doc.bedType as string) || 'Çift Kişilik',
                pricePerNight: Number(doc.pricePerNight || 0),
                amenities: Array.isArray(doc.amenities) ? (doc.amenities as string[]) : [],
                imageUrl: (doc.imageUrl as string) || undefined,
            }))
            .sort((a, b) => a.name.localeCompare(b.name));
    } catch (error) {
        console.error("Error fetching room types:", error);
        return [];
    }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
    const { slug } = await params;
    const business = await getBusinessBySlug(slug);
    if (!business) return { title: "Odalar | Tık Profil" };
    return {
        title: `${business.name} - Odalarımız | Tık Profil`,
    };
}

export default async function PublicRoomsPage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    const business = await getBusinessBySlug(slug);

    if (!business) {
        notFound();
    }

    const roomTypes = await getRoomTypes(business.id);

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
                <div className="max-w-2xl mx-auto px-4 py-4">
                    <div className="flex items-center gap-4">
                        <Link
                            href={`/${business.slug}`}
                            className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5 text-gray-600" />
                        </Link>
                        <div className="flex items-center gap-3">
                            {business.logo ? (
                                <img src={toR2ProxyUrl(business.logo)} alt={business.name} className="w-10 h-10 rounded-full object-cover" />
                            ) : (
                                <div className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center text-white font-bold">
                                    {business.name.substring(0, 2).toUpperCase()}
                                </div>
                            )}
                            <div>
                                <h1 className="font-semibold text-gray-900">{business.name}</h1>
                                <p className="text-sm text-gray-500">Odalarımız</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Room Types */}
            <div className="max-w-2xl mx-auto px-4 py-6">
                {roomTypes.length === 0 ? (
                    <div className="text-center py-12">
                        <BedDouble className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                        <h2 className="text-lg font-medium text-gray-700">Henüz oda tanımlanmamış</h2>
                        <p className="text-gray-500 mt-1">Odalar yakında eklenecek.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {roomTypes.map((room) => (
                            <div key={room.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                                {/* Room Image */}
                                {room.imageUrl && (
                                    <div className="h-48 bg-gray-200">
                                        <img
                                            src={toR2ProxyUrl(room.imageUrl)}
                                            alt={room.name}
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                )}

                                {/* Room Info */}
                                <div className="p-5">
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <h3 className="text-lg font-semibold text-gray-900">{room.name}</h3>
                                            <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                                                <span className="flex items-center gap-1">
                                                    <Users className="w-4 h-4" />
                                                    {room.capacity} Kişi
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <BedDouble className="w-4 h-4" />
                                                    {room.bedType}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-2xl font-bold text-purple-600">
                                                ₺{room.pricePerNight.toLocaleString('tr-TR')}
                                            </p>
                                            <p className="text-xs text-gray-500">/ gece</p>
                                        </div>
                                    </div>

                                    {room.description && (
                                        <p className="mt-3 text-sm text-gray-600">{room.description}</p>
                                    )}

                                    {/* Amenities */}
                                    {room.amenities.length > 0 && (
                                        <div className="mt-4 flex flex-wrap gap-2">
                                            {room.amenities.map((amenity) => {
                                                const Icon = AMENITY_ICONS[amenity.toLowerCase()] || Bath;
                                                return (
                                                    <span
                                                        key={amenity}
                                                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-100 text-gray-700 text-xs rounded-full"
                                                    >
                                                        <Icon className="w-3 h-3" />
                                                        {amenity}
                                                    </span>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Contact CTA */}
                {business.whatsapp && roomTypes.length > 0 && (
                    <div className="mt-8">
                        <a
                            href={`https://wa.me/${business.whatsapp}?text=${encodeURIComponent(`Merhaba, ${business.name} için oda bilgisi almak istiyorum.`)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full h-14 rounded-2xl flex items-center justify-center gap-2 font-bold text-white bg-[#25D366] shadow-lg hover:bg-[#20bd5a] transition-colors"
                        >
                            <Phone className="w-5 h-5" />
                            Rezervasyon İçin İletişime Geç
                        </a>
                    </div>
                )}
            </div>
        </div>
    );
}
