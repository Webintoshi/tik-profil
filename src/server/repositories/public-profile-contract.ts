import { mergeLegacyBusinessFields } from "./kesfet-contract.ts";
import type {
    PublicProfile,
    PublicProfileSocialLinks,
} from "./public-profile.types.ts";

function isRecord(value: unknown): value is Record<string, unknown> {
    return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function asString(value: unknown): string | undefined {
    return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function asBoolean(value: unknown): boolean | undefined {
    return typeof value === "boolean" ? value : undefined;
}

function asStringArray(value: unknown): string[] {
    if (!Array.isArray(value)) {
        return [];
    }

    return value
        .map((entry) => asString(entry)?.toLowerCase())
        .filter((entry): entry is string => Boolean(entry));
}

function normalizeWorkingHours(value: unknown): unknown {
    if (Array.isArray(value) || isRecord(value)) {
        return value;
    }

    return [];
}

function normalizeIndustryLabelValue(value: string): string {
    return value
        .toLocaleLowerCase("tr-TR")
        .replaceAll("ş", "s")
        .replaceAll("ğ", "g")
        .replaceAll("ü", "u")
        .replaceAll("ö", "o")
        .replaceAll("ç", "c")
        .replaceAll("ı", "i")
        .replaceAll("ÅŸ", "s")
        .replaceAll("ÄŸ", "g")
        .replaceAll("Ã¼", "u")
        .replaceAll("Ã¶", "o")
        .replaceAll("Ã§", "c")
        .replaceAll("Ä±", "i")
        .replace(/\s+/g, "")
        .replace(/-/g, "");
}

function getNormalizedModuleKeys(values: readonly string[]): string[] {
    const seen = new Set<string>();
    const modules: string[] = [];

    values.forEach((value) => {
        const normalized = value.trim().toLowerCase();
        if (!normalized || seen.has(normalized)) {
            return;
        }

        seen.add(normalized);
        modules.push(normalized);
    });

    return modules;
}

function buildSocialLinks(fields: Record<string, unknown>, fallback?: Record<string, unknown>): PublicProfileSocialLinks {
    const socialLinks = isRecord(fields.socialLinks) ? fields.socialLinks : {};
    const social = isRecord(fields.social) ? fields.social : {};
    const rowSocial = isRecord(fallback) ? fallback : {};

    return {
        website: asString(socialLinks.website) || asString(social.website) || asString(fields.website) || asString(rowSocial.website),
        instagram: asString(socialLinks.instagram) || asString(social.instagram) || asString(fields.instagram) || asString(rowSocial.instagram),
        youtube: asString(socialLinks.youtube) || asString(social.youtube) || asString(fields.youtube) || asString(rowSocial.youtube),
        google: asString(socialLinks.google) || asString(social.google) || asString(fields.google) || asString(rowSocial.google),
        facebook: asString(socialLinks.facebook) || asString(social.facebook) || asString(fields.facebook) || asString(rowSocial.facebook),
        twitter: asString(socialLinks.twitter) || asString(social.twitter) || asString(fields.twitter) || asString(rowSocial.twitter),
        tiktok: asString(socialLinks.tiktok) || asString(social.tiktok) || asString(fields.tiktok) || asString(rowSocial.tiktok),
        linkedin: asString(socialLinks.linkedin) || asString(social.linkedin) || asString(fields.linkedin) || asString(rowSocial.linkedin),
    };
}

export interface PostgresPublicProfileRow {
    id: string;
    slug: string;
    previous_slugs: string[];
    name: string;
    phone: string | null;
    whatsapp: string | null;
    status: string | null;
    industry_id: string | null;
    industry_label: string | null;
    active_module: string | null;
    logo: string | null;
    cover: string | null;
    about: string | null;
    address: string | null;
    maps_url: string | null;
    social_links: unknown;
    show_hours: boolean;
    working_hours: unknown;
    is_verified: boolean;
    legacy_source: unknown;
}

export function getPublicProfileIndustryLabel(industryId: string): string {
    const labels: Record<string, string> = {
        "restaurant": "Restoran",
        "restoran": "Restoran",
        "restorant": "Restoran",
        "cafe": "Kafe",
        "kafe": "Kafe",
        "fastfood": "Fast Food",
        "fast-food": "Fast Food",
        "hotel": "Otel",
        "otel": "Otel",
        "hostel": "Hostel",
        "boutique": "Butik Otel",
        "aparthotel": "Apart Otel",
        "e-commerce": "E-ticaret",
        "ecommerce": "E-ticaret",
        "health": "Saglik",
        "beauty": "Guzellik",
        "clinic": "Klinik",
        "salon": "Kuafor/Salon",
        "retail": "Perakende",
        "service": "Hizmet",
        "spa": "SPA",
        "gym": "Spor Salonu",
        "vehicle-rental": "Arac Kiralama",
        "oto_galeri": "Oto Galeri",
        "auto-dealer": "Oto Galeri",
        "car-dealer": "Oto Galeri",
        "default": "Isletme",
    };
    const normalizedId = industryId?.toLowerCase().trim() || "default";
    return labels[normalizedId] || labels.default;
}

export function derivePublicProfileIndustry(
    modules: readonly string[],
    rawLabel: string,
): string {
    const normalizedModules = getNormalizedModuleKeys(modules);
    const normalizedLabel = normalizeIndustryLabelValue(rawLabel);

    const moduleGroups = [
        { industry: "clinic", values: ["clinic", "hospital", "dentist", "veteriner", "pharmacy", "optik", "physiotherapy", "psychology", "nutrition", "laboratory"] },
        { industry: "beauty", values: ["beauty", "salon", "guzellik", "kuafor", "spa", "barber"] },
        { industry: "hotel", values: ["hotel", "otel", "hostel", "boutique", "aparthotel"] },
        { industry: "restaurant", values: ["restaurant", "restoran", "cafe", "kafe"] },
        { industry: "fastfood", values: ["fastfood", "fast-food"] },
        { industry: "emlak", values: ["emlak", "realestate", "real-estate", "gayrimenkul"] },
        { industry: "ecommerce", values: ["ecommerce", "e-commerce", "magaza", "shop", "store"] },
        { industry: "vehicle-rental", values: ["vehicle-rental", "rentacar", "arac-kiralama", "oto-kiralama", "rent-a-car"] },
    ];

    for (const group of moduleGroups) {
        if (normalizedModules.some((moduleKey) => group.values.includes(moduleKey))) {
            return group.industry;
        }
    }

    if (normalizedModules.length > 0) {
        return normalizedModules[0];
    }

    if (["arackiralama", "rentacar", "otokiralama"].includes(normalizedLabel)) {
        return "vehicle-rental";
    }

    return normalizedLabel || "default";
}

function buildPublicProfile({
    id,
    slug,
    name,
    logo,
    cover,
    industry,
    industryLabel,
    isVerified,
    phone,
    whatsapp,
    about,
    address,
    mapsUrl,
    showHours,
    workingHours,
    modules,
    cartEnabled,
    social,
}: {
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
    mapsUrl?: string;
    showHours: boolean;
    workingHours: unknown;
    modules: string[];
    cartEnabled: boolean;
    social: PublicProfileSocialLinks;
}): PublicProfile {
    return {
        id,
        slug,
        name,
        logo,
        cover,
        industry,
        industryLabel,
        isVerified,
        phone,
        whatsapp,
        about,
        address,
        mapsUrl,
        showHours,
        workingHours,
        modules,
        hasRestaurantModule: modules.includes("restaurant"),
        cartEnabled,
        social,
    };
}

export function normalizeLegacyPublicProfileSource({
    source,
    slug,
}: {
    source: unknown;
    slug: string;
}): PublicProfile {
    const record = isRecord(source) ? source : {};
    const fields = mergeLegacyBusinessFields(source);
    const modules = getNormalizedModuleKeys(
        asStringArray(record.modules).length > 0
            ? asStringArray(record.modules)
            : asStringArray(fields.modules),
    );
    const rawLabel =
        asString(record.industry_label) ||
        asString(fields.industry_label) ||
        asString(fields.industryLabel) ||
        "";
    const social = buildSocialLinks(fields);
    const socialLinks = isRecord(fields.socialLinks) ? fields.socialLinks : {};
    const industry = derivePublicProfileIndustry(modules, rawLabel);

    return buildPublicProfile({
        id: asString(record.id) || asString(fields.id) || "",
        slug: asString(record.slug) || asString(fields.slug) || slug,
        name: asString(record.name) || asString(fields.name) || "Isletme",
        logo: asString(record.logo) || asString(fields.logo),
        cover: asString(record.cover) || asString(fields.cover),
        industry,
        industryLabel: rawLabel || getPublicProfileIndustryLabel(industry),
        isVerified: asBoolean(fields.isVerified) ?? true,
        phone: asString(record.phone) || asString(fields.phone),
        whatsapp:
            asString(socialLinks.whatsapp) ||
            asString(fields.whatsapp) ||
            asString(fields.phone) ||
            asString(record.phone),
        about: asString(record.about) || asString(fields.about),
        address: asString(fields.address) || asString(record.address),
        mapsUrl: asString(fields.mapsUrl) || asString(fields.maps_url),
        showHours: asBoolean(fields.showHours) ?? false,
        workingHours: normalizeWorkingHours(fields.workingHours ?? fields.working_hours),
        modules,
        cartEnabled: asBoolean(fields.cartEnabled) ?? true,
        social,
    });
}

export function normalizePostgresPublicProfileRow({
    row,
    moduleKeys,
}: {
    row: PostgresPublicProfileRow;
    moduleKeys: readonly string[];
}): PublicProfile {
    const legacyFields = mergeLegacyBusinessFields(row.legacy_source);
    const rowSocialLinks = isRecord(row.social_links) ? row.social_links : {};
    const modules = getNormalizedModuleKeys(
        asStringArray(legacyFields.modules).length > 0
            ? asStringArray(legacyFields.modules)
            : [...moduleKeys],
    );
    const rawLabel =
        asString(row.industry_label) ||
        asString(legacyFields.industry_label) ||
        asString(legacyFields.industryLabel) ||
        "";
    const social = buildSocialLinks(legacyFields, rowSocialLinks);
    const legacySocialLinks = isRecord(legacyFields.socialLinks) ? legacyFields.socialLinks : {};
    const industry = derivePublicProfileIndustry(
        modules.length > 0 ? modules : (row.active_module ? [row.active_module] : []),
        rawLabel,
    );

    return buildPublicProfile({
        id: row.id,
        slug: row.slug,
        name: row.name || asString(legacyFields.name) || "Isletme",
        logo: asString(row.logo) || asString(legacyFields.logo),
        cover: asString(row.cover) || asString(legacyFields.cover),
        industry,
        industryLabel: rawLabel || getPublicProfileIndustryLabel(industry),
        isVerified:
            asBoolean(legacyFields.isVerified) ??
            asBoolean(legacyFields.is_verified) ??
            true,
        phone: asString(row.phone) || asString(legacyFields.phone),
        whatsapp:
            asString(row.whatsapp) ||
            asString(legacySocialLinks.whatsapp) ||
            asString(legacyFields.whatsapp) ||
            asString(legacyFields.phone) ||
            asString(row.phone),
        about: asString(row.about) || asString(legacyFields.about),
        address: asString(row.address) || asString(legacyFields.address),
        mapsUrl: asString(row.maps_url) || asString(legacyFields.mapsUrl) || asString(legacyFields.maps_url),
        showHours: asBoolean(legacyFields.showHours) ?? row.show_hours ?? false,
        workingHours: normalizeWorkingHours(legacyFields.workingHours ?? legacyFields.working_hours ?? row.working_hours),
        modules,
        cartEnabled: asBoolean(legacyFields.cartEnabled) ?? true,
        social,
    });
}

export function createDemoPublicProfile(slug: string): PublicProfile | null {
    if (slug !== "demo-isletme") {
        return null;
    }

    return buildPublicProfile({
        id: "demo_business",
        slug: "demo-isletme",
        name: "Demo Isletme",
        industry: "e-commerce",
        industryLabel: "E-ticaret",
        isVerified: true,
        phone: "05551234567",
        whatsapp: "905551234567",
        address: "Istanbul",
        showHours: false,
        workingHours: [],
        modules: [],
        cartEnabled: true,
        social: {
            website: "https://example.com",
        },
    });
}

export function buildPublicProfileMetadataTitle(profile: Pick<PublicProfile, "name"> | null): string {
    if (!profile) {
        return "Isletme Bulunamadi";
    }

    return `${profile.name} | T\u0131k Profil`;
}
