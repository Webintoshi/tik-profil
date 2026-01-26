import { Metadata } from "next";
import { notFound } from "next/navigation";
import {
    Link as ExternalLinkIcon, // Renamed to avoid partial conflict if needed, though unused in strict injection
    Utensils,
    Scissors,
    Stethoscope,
    MapPin,
    Phone,
    // MessageCircle, // WhatsApp alternate
    // ExternalLink
} from "lucide-react";
import Link from "next/link";
import { PublicProfileWrapper, ActionButton } from "@/components/public";
import { TikLogo } from "@/components/TikLogo";
import {
    SocialIconWebsite,
    SocialIconInstagram,
    SocialIconYouTube,
    SocialIconFacebook,
    SocialIconTikTok,
    SocialIconX,
    SocialIconLinkedIn,
    SocialIconGoogle,
    SocialIconWhatsApp,
} from "@/components/public";
import { toR2ProxyUrl } from "@/lib/publicImage";

// ============================================
// TYPES
// ============================================
interface Business {
    id: string;
    slug: string;
    name: string;
    logo?: string;
    cover?: string;
    industry: string;
    industryLabel: string;
    isVerified: boolean;
    phone?: string;
    whatsapp?: string;
    about?: string;
    address?: string;
    mapsUrl?: string; // Preferred for "Konum" Button
    hasRestaurantModule?: boolean;
    cartEnabled?: boolean;
    social: {
        website?: string;
        instagram?: string;
        youtube?: string;
        google?: string;
        facebook?: string;
        twitter?: string;
        tiktok?: string;
        linkedin?: string;
    };
}

const INDUSTRY_ACTIONS: Record<string, { label: string; icon: string }> = {
    "e-commerce": { label: "Sipariş Ver", icon: "cart" },
    "ecommerce": { label: "Sipariş Ver", icon: "cart" },
    "restaurant": { label: "Sipariş Ver", icon: "utensils" },
    "restoran": { label: "Sipariş Ver", icon: "utensils" },
    "fastfood": { label: "Sipariş Ver", icon: "utensils" },
    "fast-food": { label: "Sipariş Ver", icon: "utensils" },
    "cafe": { label: "Sipariş Ver", icon: "utensils" },
    "kafe": { label: "Sipariş Ver", icon: "utensils" },
    "hotel": { label: "Odaları Gör", icon: "building" },
    "otel": { label: "Odaları Gör", icon: "building" },
    "hostel": { label: "Odaları Gör", icon: "building" },
    "boutique": { label: "Odaları Gör", icon: "building" },
    "aparthotel": { label: "Odaları Gör", icon: "building" },
    "health": { label: "Randevu Al", icon: "calendar" },
    "beauty": { label: "Randevu Al", icon: "scissors" },
    "clinic": { label: "Randevu Al", icon: "stethoscope" },
    "salon": { label: "Randevu Al", icon: "scissors" },
    "barber": { label: "Randevu Al", icon: "scissors" },
    "spa": { label: "Randevu Al", icon: "calendar" },
    "default": { label: "İletişime Geç", icon: "phone" },
};

// ============================================
// ICONS
// ============================================
// WhatsApp Icon Definition
const WhatsAppIcon = () => (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
);

// ============================================
// PROFILE CONTENT COMPONENT
// ============================================
function ProfileContent({ business }: { business: Business }) {
    const industryAction = INDUSTRY_ACTIONS[business.industry] || INDUSTRY_ACTIONS["default"];

    const renderActionIcon = () => {
        switch (industryAction.icon) {
            case "cart": return <div className="w-6 h-6"><svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg></div>;
            case "phone": return <Phone className="w-6 h-6" />;
            case "utensils": return <Utensils className="w-6 h-6" />;
            case "calendar": return <div className="w-6 h-6"><svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg></div>;
            case "scissors": return <Scissors className="w-6 h-6" />;
            case "stethoscope": return <Stethoscope className="w-6 h-6" />;
            default: return <Phone className="w-6 h-6" />;
        }
    };

    // Construct Map URL
    const mapLink = business.mapsUrl || (business.address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(business.address)}` : null);

    // Lonely Card Logic (Still useful for full width, but layout is fixed "Tombul")
    const socialCount = [
        business.social.website,
        business.social.instagram,
        business.social.youtube,
        business.social.google
    ].filter(Boolean).length;

    // Mission 50 Code Injection: If 1 item, it gets col-span-2.
    const isSocialFullWidth = socialCount === 1;

    return (
        <div className="min-h-screen w-full bg-gray-50 md:flex md:justify-center md:py-10 font-sans selection:bg-purple-100 selection:text-purple-900">
            {/* MAIN CARD */}
            <div className="
                w-full 
                bg-white 
                min-h-screen 
                relative 
                flex flex-col
                md:w-[480px] 
                md:min-h-[800px] 
                md:rounded-[2.5rem] 
                md:shadow-2xl 
                md:overflow-hidden
                border-none
            ">
                {/* 1. LAYER: HEADER */}

                {/* Cover Image - Reduced height as requested */}
                <div className="relative h-36 md:h-48 w-full bg-gray-200">
                    {business.cover ? (
                        <img src={toR2ProxyUrl(business.cover)} alt="Cover" className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900" />
                    )}
                    <div className="absolute inset-0 bg-black/10" />
                </div>

                {/* Identity Row - Left Aligned Horizontal Layout */}
                <div className="px-6 flex flex-row items-end relative z-10">
                    {/* Avatar (Left) */}
                    <div className="
                        w-24 h-24 -mt-[103px]
                        rounded-full 
                        border-[4px] border-white 
                        shadow-lg 
                        overflow-hidden 
                        flex-shrink-0 
                        bg-white
                    ">
                        {business.logo ? (
                            <img src={toR2ProxyUrl(business.logo)} alt="Logo" className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full bg-slate-900 flex items-center justify-center text-white text-2xl font-bold">
                                {business.name.substring(0, 2).toUpperCase()}
                            </div>
                        )}
                    </div>

                    {/* Text Block (Right of Avatar) - Left Aligned */}
                    <div className="ml-4 flex flex-col items-start justify-end pb-2 min-w-0 flex-1">
                        {/* Name + Verified Badge */}
                        <div className="flex flex-row items-center gap-2 mt-[10px]">
                            <h1 className="text-xl md:text-2xl font-bold text-gray-900 leading-tight tracking-tight truncate">
                                {business.name}
                            </h1>
                            {business.isVerified && (
                                <svg viewBox="0 0 22 22" className="w-[1.3rem] h-[1.3rem] text-blue-600 -ml-[3px] mt-[3px] shrink-0 drop-shadow-sm" fill="currentColor" aria-label="Verified">
                                    <path d="M20.396 11c-.018-.646-.215-1.275-.57-1.816-.354-.54-.852-.972-1.438-1.246.223-.605.27-1.264.14-1.897-.131-.634-.437-1.218-.882-1.687-.47-.445-1.053-.75-1.687-.882-.633-.13-1.292-.083-1.897.14-.273-.587-.704-1.086-1.245-1.44S11.647 1.62 11 1.604c-.646.017-1.273.213-1.813.568s-.969.854-1.24 1.44c-.605-.223-1.264-.27-1.896-.14-.635.13-1.218.436-1.687.882-.445.468-.751 1.053-.882 1.687-.13.633-.083 1.29.139 1.896-.588.274-1.087.705-1.441 1.246-.354.54-.551 1.17-.569 1.816.017.647.215 1.276.569 1.817.354.54.853.971 1.441 1.245-.222.606-.27 1.265-.139 1.897.131.634.437 1.218.882 1.687.47.445 1.053.75 1.687.882.632.13 1.29.083 1.896-.14.271.586.702 1.084 1.24 1.439.54.354 1.166.551 1.813.568.647-.017 1.274-.213 1.814-.568.541-.355.972-.853 1.245-1.44.604.223 1.263.27 1.897.14.634-.13 1.217-.436 1.687-.882.445-.469.75-1.053.882-1.687.13-.632.083-1.29-.14-1.897.586-.273 1.084-.704 1.439-1.245.354-.54.55-1.169.568-1.816zM9.662 14.85l-3.429-3.428 1.293-1.302 2.136 2.138 5.691-5.692 1.29 1.307-6.981 6.977z" />
                                </svg>
                            )}
                        </div>

                        {/* Industry Badge */}
                        <div className="mt-1">
                            <span className="bg-purple-100 text-purple-700 px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wide">
                                {business.industryLabel}
                            </span>
                        </div>
                    </div>
                </div>

                {/* About Description - Below Header, Full Width */}
                {business.about && (
                    <div className="px-6 mt-4">
                        <p className="text-gray-700 text-[15px] leading-[1.6] font-medium">
                            {business.about.length > 155 ? business.about.substring(0, 155) + "..." : business.about}
                        </p>
                    </div>
                )}

                {/* 2. LAYER: ACTION GRID (STRICT 2x2) - h-14 CONSISTENCY (Preserved) */}
                <div className="mt-8 px-6 grid grid-cols-2 gap-3">
                    {/* BUTTON 1: ARA (Blue) */}
                    <a href={`tel:${business.phone}`} className="
                        h-14 rounded-2xl flex items-center justify-center gap-2 font-bold text-white text-sm md:text-base
                        bg-blue-600 shadow-lg shadow-blue-600/25
                        transition-transform active:scale-95 hover:bg-blue-700
                    ">
                        <Phone className="w-5 h-5" />
                        Ara
                    </a>

                    {/* BUTTON 2: WHATSAPP (Green) */}
                    <a href={`https://wa.me/${business.whatsapp}`} className="
                        h-14 rounded-2xl flex items-center justify-center gap-2 font-bold text-white text-sm md:text-base
                        bg-[#25D366] shadow-lg shadow-green-500/25
                        transition-transform active:scale-95 hover:bg-[#20bd5a]
                    ">
                        <WhatsAppIcon />
                        WhatsApp
                    </a>

                    {/* BUTTON 3: KONUM (Red) */}
                    {mapLink ? (
                        <a href={mapLink} target="_blank" rel="noopener noreferrer" className="
                            h-14 rounded-2xl flex items-center justify-center gap-2 font-bold text-white text-sm md:text-base
                            bg-red-500 shadow-lg shadow-red-500/25
                            transition-transform active:scale-95 hover:bg-red-600
                        ">
                            <MapPin className="w-5 h-5" />
                            Konum
                        </a>
                    ) : (
                        <div className="
                            h-14 rounded-2xl flex items-center justify-center gap-2 font-bold text-gray-400 text-sm md:text-base
                            bg-gray-200 cursor-not-allowed
                         ">
                            <MapPin className="w-5 h-5" />
                            Konum
                        </div>
                    )}

                    {/* BUTTON 4: ACTION (Purple) - Now uses ActionButton for reservation support */}
                    <ActionButton
                        industry={business.industry}
                        whatsappNumber={business.whatsapp}
                        businessName={business.name}
                        businessSlug={business.slug}
                        businessId={business.id}
                        businessLogo={business.logo}
                        businessPhone={business.phone}
                    />
                </div>

                {/* --- Social Grid (The "Tombul" Cards) [USER INJECTED] --- */}
                <div className="mt-6 px-6 grid grid-cols-2 gap-3 w-full pb-8">

                    {/* Web Sitesi */}
                    {business.social.website && (
                        <a
                            href={business.social.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="h-32 bg-white border border-gray-100 rounded-[24px] flex flex-col items-center justify-center gap-3 shadow-sm hover:shadow-md transition-all active:scale-95"
                        >
                            <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                                <SocialIconWebsite />
                            </div>
                            <span className="text-sm font-semibold text-gray-700">Web Sitesi</span>
                        </a>
                    )}

                    {/* Instagram */}
                    {business.social.instagram && (
                        <a
                            href={`https://instagram.com/${business.social.instagram}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="h-32 bg-white border border-gray-100 rounded-[24px] flex flex-col items-center justify-center gap-3 shadow-sm hover:shadow-md transition-all active:scale-95"
                        >
                            <div className="w-12 h-12 rounded-full bg-orange-50 flex items-center justify-center">
                                <SocialIconInstagram />
                            </div>
                            <span className="text-sm font-semibold text-gray-700">Instagram</span>
                        </a>
                    )}

                    {/* YouTube */}
                    {business.social.youtube && (
                        <a
                            href={`https://youtube.com/${business.social.youtube}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="h-32 bg-white border border-gray-100 rounded-[24px] flex flex-col items-center justify-center gap-3 shadow-sm hover:shadow-md transition-all active:scale-95"
                        >
                            <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center text-red-600">
                                <SocialIconYouTube />
                            </div>
                            <span className="text-sm font-semibold text-gray-700">YouTube</span>
                        </a>
                    )}

                    {/* Google Reviews */}
                    {business.social.google && (
                        <a
                            href={business.social.google}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="h-32 bg-white border border-gray-100 rounded-[24px] flex flex-col items-center justify-center gap-3 shadow-sm hover:shadow-md transition-all active:scale-95"
                        >
                            <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center">
                                <SocialIconGoogle />
                            </div>
                            <span className="text-sm font-semibold text-gray-700">Yorumlar</span>
                        </a>
                    )}

                    {/* Facebook */}
                    {business.social.facebook && (
                        <a
                            href={business.social.facebook.startsWith('http') ? business.social.facebook : `https://facebook.com/${business.social.facebook}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="h-32 bg-white border border-gray-100 rounded-[24px] flex flex-col items-center justify-center gap-3 shadow-sm hover:shadow-md transition-all active:scale-95"
                        >
                            <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                                <SocialIconFacebook />
                            </div>
                            <span className="text-sm font-semibold text-gray-700">Facebook</span>
                        </a>
                    )}

                    {/* TikTok */}
                    {business.social.tiktok && (
                        <a
                            href={business.social.tiktok.startsWith('http') ? business.social.tiktok : `https://tiktok.com/@${business.social.tiktok.replace('@', '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="h-32 bg-white border border-gray-100 rounded-[24px] flex flex-col items-center justify-center gap-3 shadow-sm hover:shadow-md transition-all active:scale-95"
                        >
                            <div className="w-12 h-12 rounded-full bg-gray-900 flex items-center justify-center">
                                <SocialIconTikTok />
                            </div>
                            <span className="text-sm font-semibold text-gray-700">TikTok</span>
                        </a>
                    )}

                    {/* Twitter/X */}
                    {business.social.twitter && (
                        <a
                            href={business.social.twitter.startsWith('http') ? business.social.twitter : `https://x.com/${business.social.twitter.replace('@', '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="h-32 bg-white border border-gray-100 rounded-[24px] flex flex-col items-center justify-center gap-3 shadow-sm hover:shadow-md transition-all active:scale-95"
                        >
                            <div className="w-12 h-12 rounded-full bg-gray-900 flex items-center justify-center">
                                <SocialIconX />
                            </div>
                            <span className="text-sm font-semibold text-gray-700">X</span>
                        </a>
                    )}

                    {/* LinkedIn */}
                    {business.social.linkedin && (
                        <a
                            href={business.social.linkedin.startsWith('http') ? business.social.linkedin : `https://linkedin.com/company/${business.social.linkedin}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="h-32 bg-white border border-gray-100 rounded-[24px] flex flex-col items-center justify-center gap-3 shadow-sm hover:shadow-md transition-all active:scale-95"
                        >
                            <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-700">
                                <SocialIconLinkedIn />
                            </div>
                            <span className="text-sm font-semibold text-gray-700">LinkedIn</span>
                        </a>
                    )}
                </div>

                {/* 4. FOOTER */}
                <div className="py-8 bg-gray-50 flex flex-col items-center justify-center gap-2 border-t border-gray-100">
                    <Link
                        href="/"
                        className="opacity-60 hover:opacity-100 transition-opacity"
                        aria-label="Tık Profil Anasayfa"
                    >
                        <TikLogo variant="light" className="w-5 h-5" />
                    </Link>
                </div>
            </div>
        </div>
    );
}

// ============================================
// DATA FETCHING (PRESERVED)
// ============================================
async function getBusinessBySlug(slug: string): Promise<Business | null> {
    try {
        const { getSupabaseAdmin } = await import("@/lib/supabase");
        const supabase = getSupabaseAdmin();

        const { data: business, error } = await supabase
            .from('businesses')
            .select('*')
            .ilike('slug', slug)
            .maybeSingle();

        if (error) {
            console.error("Supabase error fetching business:", error);
            return null;
        }

        if (!business) {
            // DEMO FALLBACK
            if (slug === "demo-isletme") {
                return {
                    id: "demo_business",
                    slug: "demo-isletme",
                    name: "Demo İşletme",
                    industry: "e-commerce",
                    industryLabel: "E-ticaret",
                    isVerified: true,
                    phone: "05551234567",
                    whatsapp: "905551234567",
                    address: "İstanbul",
                    social: { website: "https://example.com" }
                } as Business;
            }
            return null;
        }

        const fields = (business.data as Record<string, unknown>) || {};
        const socialLinks = (fields.socialLinks as Record<string, unknown>) || (fields.social as Record<string, unknown>) || {};
        
        // Debug: Log data structure for derycraft
        if (slug === "derycraft") {
            console.log("=== Derycraft Debug Info ===");
            console.log("business.data:", JSON.stringify(business.data, null, 2));
            console.log("socialLinks:", JSON.stringify(socialLinks, null, 2));
            console.log("fields keys:", Object.keys(fields));
        }
        
        // Fallback: Check if social fields exist directly at fields level (legacy format)
        const socialFields: Record<string, unknown> = {
            website: (socialLinks.website as string) || (fields.website as string),
            instagram: (socialLinks.instagram as string) || (fields.instagram as string),
            youtube: (socialLinks.youtube as string) || (fields.youtube as string),
            google: (socialLinks.google as string) || (fields.google as string),
            facebook: (socialLinks.facebook as string) || (fields.facebook as string),
            twitter: (socialLinks.twitter as string) || (fields.twitter as string),
            tiktok: (socialLinks.tiktok as string) || (fields.tiktok as string),
            linkedin: (socialLinks.linkedin as string) || (fields.linkedin as string),
        };
        
        // Debug: Log social fields
        if (slug === "derycraft") {
            console.log("socialFields:", JSON.stringify(socialFields, null, 2));
        }

        // Derive industry from modules array (most reliable) or normalize the label
        // industry_id is document store document ID, not usable for action matching
        const modulesArr = Array.isArray(business.modules)
            ? (business.modules as string[])
            : (fields.modules as string[]) || [];
        const rawLabel = (business.industry_label as string) || (fields.industry_label as string) || (fields.industryLabel as string) || "";
        const normalizedLabel = rawLabel.toLowerCase()
            .replace(/ş/g, "s").replace(/ğ/g, "g").replace(/ü/g, "u")
            .replace(/ö/g, "o").replace(/ç/g, "c").replace(/ı/g, "i")
            .replace(/\s+/g, "").replace(/-/g, "");

        // Use first module as industry, or normalized label, or default
        const derivedIndustry = modulesArr[0] || normalizedLabel || "default";

        return {
            id: (business.id as string) || '',
            slug: (business.slug as string) || slug,
            name: (business.name as string) || (fields.name as string) || "İşletme",
            logo: (business.logo as string) || (fields.logo as string) || undefined,
            cover: (business.cover as string) || (fields.cover as string) || undefined,
            industry: derivedIndustry,
            industryLabel: rawLabel || getIndustryLabel(derivedIndustry),
            isVerified: (fields.isVerified as boolean) ?? true,
            phone: (business.phone as string) || (fields.phone as string) || undefined,
            whatsapp: (socialLinks.whatsapp as string) || (fields.whatsapp as string) || (fields.phone as string) || (business.phone as string) || undefined,
            about: (business.about as string) || (fields.about as string) || undefined,
            address: (fields.address as string) || undefined,
            mapsUrl: (fields.mapsUrl as string) || undefined,
            hasRestaurantModule: modulesArr.includes("restaurant"),
            cartEnabled: (fields.cartEnabled as boolean) ?? true,
            social: {
                website: (socialFields.website as string) || undefined,
                instagram: (socialFields.instagram as string) || undefined,
                youtube: (socialFields.youtube as string) || undefined,
                google: (socialFields.google as string) || undefined,
                facebook: (socialFields.facebook as string) || undefined,
                twitter: (socialFields.twitter as string) || undefined,
                tiktok: (socialFields.tiktok as string) || undefined,
                linkedin: (socialFields.linkedin as string) || undefined,
            },
        };

    } catch (error) {
        console.error("Error fetching business:", error);
        return null;
    }
}

function getIndustryLabel(industryId: string): string {
    const labels: Record<string, string> = {
        // Restaurant variants
        "restaurant": "Restoran",
        "restoran": "Restoran",
        "restorant": "Restoran",
        // Cafe variants
        "cafe": "Kafe",
        "kafe": "Kafe",
        // Fast Food
        "fastfood": "Fast Food",
        "fast-food": "Fast Food",
        // Hotel variants - ADDED
        "hotel": "Otel",
        "otel": "Otel",
        "hostel": "Hostel",
        "boutique": "Butik Otel",
        "aparthotel": "Apart Otel",
        // Other industries
        "e-commerce": "E-ticaret",
        "health": "Sağlık",
        "beauty": "Güzellik",
        "clinic": "Klinik",
        "salon": "Kuaför/Salon",
        "retail": "Perakende",
        "service": "Hizmet",
        "spa": "SPA",
        "gym": "Spor Salonu",
        "default": "İşletme"
    };
    // Normalize the industry ID (lowercase, trim)
    const normalizedId = industryId?.toLowerCase().trim() || "default";
    return labels[normalizedId] || labels["default"];
}

// ============================================
// CHECK FOR OLD SLUG REDIRECT
// ============================================
async function getBusinessByPreviousSlug(oldSlug: string): Promise<{ currentSlug: string } | null> {
    try {
        const { getSupabaseAdmin } = await import("@/lib/supabase");
        const supabase = getSupabaseAdmin();

        const { data, error } = await supabase
            .from('businesses')
            .select('slug')
            .contains('previous_slugs', [oldSlug.toLowerCase()])
            .maybeSingle();

        if (error) {
            console.error("Supabase error checking previous slug:", error);
            return null;
        }

        if (!data?.slug) return null;
        return { currentSlug: data.slug as string };
    } catch (error) {
        console.error("Error checking previous slug:", error);
        return null;
    }
}

// ============================================
// MAIN PAGE EXPORT
// ============================================
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
    const { slug } = await params;
    const business = await getBusinessBySlug(slug);
    if (!business) return { title: "İşletme Bulunamadı" };
    return {
        title: `${business.name} | Tık Profil`,
        viewport: "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no",
    };
}

export default async function PublicProfilePage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    const business = await getBusinessBySlug(slug);

    if (!business) {
        // Check if this is an old slug that should redirect
        const redirectInfo = await getBusinessByPreviousSlug(slug);
        if (redirectInfo) {
            // Use Next.js redirect with 301 status
            const { redirect } = await import("next/navigation");
            redirect(`/${redirectInfo.currentSlug}`);
        }
        notFound();
    }

    return (
        <PublicProfileWrapper business={business}>
            <ProfileContent business={business} />
        </PublicProfileWrapper>
    );
}
