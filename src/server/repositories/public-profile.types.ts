export interface PublicProfileSocialLinks {
    website?: string;
    instagram?: string;
    youtube?: string;
    google?: string;
    facebook?: string;
    twitter?: string;
    tiktok?: string;
    linkedin?: string;
}

export interface PublicProfile {
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
    whatsappEnabled?: boolean;
    about?: string;
    address?: string;
    mapsUrl?: string;
    showHours: boolean;
    workingHours: unknown;
    modules: string[];
    primaryModuleId: string | null;
    hasRestaurantModule: boolean;
    cartEnabled: boolean;
    social: PublicProfileSocialLinks;
}

export interface PublicProfileLookupResult {
    profile: PublicProfile | null;
    redirectTarget: string | null;
}

export type PublicProfileDataProvider = "legacy_supabase" | "postgres";
