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
                            className={`
                                h-32 bg-white border border-gray-100 rounded-[24px] 
                                flex flex-col items-center justify-center gap-3 
                                shadow-sm hover:shadow-md transition-all active:scale-95
                                ${isSocialFullWidth ? 'col-span-2' : ''}
                            `}
                        >
                            <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                                {/* Globe Icon */}
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" /><path d="M2 12h20" /></svg>
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
                            className={`
                                h-32 bg-white border border-gray-100 rounded-[24px] 
                                flex flex-col items-center justify-center gap-3 
                                shadow-sm hover:shadow-md transition-all active:scale-95
                                ${isSocialFullWidth ? 'col-span-2' : ''}
                            `}
                        >
                            <div className="w-12 h-12 rounded-full bg-orange-50 flex items-center justify-center">
                                {/* Instagram Icon */}
                                <svg viewBox="0 0 24 24" className="w-6 h-6">
                                    <defs>
                                        <linearGradient id="ig-grad-chunky-2" x1="0%" y1="100%" x2="100%" y2="0%">
                                            <stop offset="0%" stopColor="#FFDC80" />
                                            <stop offset="25%" stopColor="#F77737" />
                                            <stop offset="50%" stopColor="#F56040" />
                                            <stop offset="75%" stopColor="#C13584" />
                                            <stop offset="100%" stopColor="#833AB4" />
                                        </linearGradient>
                                    </defs>
                                    <rect x="2" y="2" width="20" height="20" rx="5" fill="url(#ig-grad-chunky-2)" />
                                    <circle cx="12" cy="12" r="4" fill="none" stroke="white" strokeWidth="2" />
                                    <circle cx="17.5" cy="6.5" r="1.5" fill="white" />
                                </svg>
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
                            className={`
                                h-32 bg-white border border-gray-100 rounded-[24px] 
                                flex flex-col items-center justify-center gap-3 
                                shadow-sm hover:shadow-md transition-all active:scale-95
                                ${isSocialFullWidth ? 'col-span-2' : ''}
                            `}
                        >
                            <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center text-red-600">
                                <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor">
                                    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                                </svg>
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
                            className={`
                                h-32 bg-white border border-gray-100 rounded-[24px] 
                                flex flex-col items-center justify-center gap-3 
                                shadow-sm hover:shadow-md transition-all active:scale-95
                                ${isSocialFullWidth ? 'col-span-2' : ''}
                            `}
                        >
                            <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center">
                                <svg viewBox="0 0 24 24" className="w-6 h-6">
                                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                </svg>
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
                            className={`
                                h-32 bg-white border border-gray-100 rounded-[24px] 
                                flex flex-col items-center justify-center gap-3 
                                shadow-sm hover:shadow-md transition-all active:scale-95
                                ${isSocialFullWidth ? 'col-span-2' : ''}
                            `}
                        >
                            <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                                <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor">
                                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                                </svg>
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
                            className={`
                                h-32 bg-white border border-gray-100 rounded-[24px] 
                                flex flex-col items-center justify-center gap-3 
                                shadow-sm hover:shadow-md transition-all active:scale-95
                                ${isSocialFullWidth ? 'col-span-2' : ''}
                            `}
                        >
                            <div className="w-12 h-12 rounded-full bg-gray-900 flex items-center justify-center">
                                <svg viewBox="0 0 24 24" className="w-6 h-6" fill="white">
                                    <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z" />
                                </svg>
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
                            className={`
                                h-32 bg-white border border-gray-100 rounded-[24px] 
                                flex flex-col items-center justify-center gap-3 
                                shadow-sm hover:shadow-md transition-all active:scale-95
                                ${isSocialFullWidth ? 'col-span-2' : ''}
                            `}
                        >
                            <div className="w-12 h-12 rounded-full bg-gray-900 flex items-center justify-center">
                                <svg viewBox="0 0 24 24" className="w-5 h-5" fill="white">
                                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                                </svg>
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
                            className={`
                                h-32 bg-white border border-gray-100 rounded-[24px] 
                                flex flex-col items-center justify-center gap-3 
                                shadow-sm hover:shadow-md transition-all active:scale-95
                                ${isSocialFullWidth ? 'col-span-2' : ''}
                            `}
                        >
                            <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-700">
                                <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor">
                                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                                </svg>
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
                        <TikLogo variant="light" className="w-6 h-6" />
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
                website: (socialLinks.website as string) || (fields.website as string) || undefined,
                instagram: (socialLinks.instagram as string) || (fields.instagram as string) || undefined,
                youtube: (socialLinks.youtube as string) || (fields.youtube as string) || undefined,
                google: (socialLinks.google as string) || (fields.google as string) || undefined,
                facebook: (socialLinks.facebook as string) || (fields.facebook as string) || undefined,
                twitter: (socialLinks.twitter as string) || (fields.twitter as string) || undefined,
                tiktok: (socialLinks.tiktok as string) || (fields.tiktok as string) || undefined,
                linkedin: (socialLinks.linkedin as string) || (fields.linkedin as string) || undefined,
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
