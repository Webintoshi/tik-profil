// Emlak Module Types
// Production-ready TypeScript definitions with Zod validation

import { z } from 'zod';

// ==================== ENUMS ====================

export const ListingType = {
    SALE: 'sale',
} as const;

export const PropertyType = {
    RESIDENTIAL: 'residential',
    COMMERCIAL: 'commercial',
    LAND: 'land',
} as const;

export const PropertySubType = {
    // Residential
    APARTMENT: 'apartment',
    VILLA: 'villa',
    DETACHED: 'detached',
    RESIDENCE: 'residence',
    // Commercial
    SHOP: 'shop',
    OFFICE: 'office',
    WAREHOUSE: 'warehouse',
    // Land
    LAND: 'land',
    FIELD: 'field',
} as const;

export const HeatingType = {
    NATURAL_GAS: 'natural_gas',
    CENTRAL: 'central',
    FLOOR: 'floor',
    AC: 'ac',
    STOVE: 'stove',
    NONE: 'none',
} as const;

export const ListingStatus = {
    ACTIVE: 'active',
    SOLD: 'sold',
    INACTIVE: 'inactive',
} as const;

// ==================== ZOD SCHEMAS ====================

// Location schema
export const locationSchema = z.object({
    city: z.string().min(1, 'İl zorunlu').max(100),
    district: z.string().min(1, 'İlçe zorunlu').max(100),
    neighborhood: z.string().max(100).optional(),
    address: z.string().max(500).optional(),
});

// Features schema
export const featuresSchema = z.object({
    grossArea: z.number().min(1, 'Brüt m² zorunlu').max(100000),
    netArea: z.number().min(0).max(100000).optional(),
    roomCount: z.string().max(20).optional(), // "3+1", "2+1", etc.
    floor: z.number().min(-5).max(200).optional(),
    totalFloors: z.number().min(1).max(200).optional(),
    buildingAge: z.number().min(0).max(200).optional(),
    heating: z.string().max(50).optional(),
    bathrooms: z.number().min(0).max(50).optional(),
    balcony: z.boolean().optional(),
    parking: z.boolean().optional(),
    furnished: z.boolean().optional(),
});

// Image schema
export const listingImageSchema = z.object({
    url: z.string().url(),
    order: z.number().min(0),
    isMain: z.boolean(),
});

// Main listing schema for creation
export const createListingSchema = z.object({
    title: z.string().min(3, 'Başlık en az 3 karakter').max(200),
    description: z.string().max(5000).optional(),
    listingType: z.enum(['sale']),
    propertyType: z.enum(['residential', 'commercial', 'land']),
    propertySubType: z.string().max(50).optional(),
    location: locationSchema,
    features: featuresSchema,
    price: z.number().min(0, 'Fiyat 0 veya daha büyük olmalı').max(100000000000),
    currency: z.enum(['TRY', 'USD', 'EUR']).default('TRY'),
    images: z.array(listingImageSchema).max(20).optional(),
    consultantId: z.string().optional(),
    status: z.enum(['active', 'sold', 'inactive']).default('active'),
});

// Listing update schema (all fields optional except id)
export const updateListingSchema = createListingSchema.partial().extend({
    id: z.string().min(1),
});

// Consultant schema
export const consultantSchema = z.object({
    name: z.string().min(2, 'İsim en az 2 karakter').max(100),
    title: z.string().max(100).optional(),
    phone: z.string().min(10, 'Geçerli telefon numarası girin').max(20),
    whatsapp: z.string().max(20).optional(),
    email: z.string().email('Geçerli e-posta girin').optional().or(z.literal('')),
    photoUrl: z.string().url().optional().or(z.literal('')),
    // New fields for public profile
    slug: z.string().max(100).optional(),
    bio: z.string().max(1000).optional(),
    socialLinks: z.object({
        instagram: z.string().max(100).optional(),
        linkedin: z.string().max(200).optional(),
        twitter: z.string().max(100).optional(),
    }).optional(),
    isActive: z.boolean().default(true),
});

// Settings schema
export const emSettingsSchema = z.object({
    appearance: z.object({
        cardStyle: z.enum(['compact', 'detailed']).default('detailed'),
        showPrice: z.boolean().default(true),
        showConsultant: z.boolean().default(true),
    }),
    defaults: z.object({
        city: z.string().max(100).optional(),
        district: z.string().max(100).optional(),
    }),
    whatsappTemplate: z.string().max(500).optional(),
});

// ==================== TYPESCRIPT INTERFACES ====================

export type ListingTypeValue = typeof ListingType[keyof typeof ListingType];
export type PropertyTypeValue = typeof PropertyType[keyof typeof PropertyType];
export type PropertySubTypeValue = typeof PropertySubType[keyof typeof PropertySubType];
export type HeatingTypeValue = typeof HeatingType[keyof typeof HeatingType];
export type ListingStatusValue = typeof ListingStatus[keyof typeof ListingStatus];

export interface ListingLocation {
    city: string;
    district: string;
    neighborhood?: string;
    address?: string;
}

export interface ListingFeatures {
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

export interface ListingImage {
    url: string;
    order: number;
    isMain: boolean;
}

export interface Listing {
    id: string;
    businessId: string;
    consultantId?: string;

    // Basic info
    title: string;
    description?: string;
    listingType: ListingTypeValue;
    propertyType: PropertyTypeValue;
    propertySubType?: string;

    // Location
    location: ListingLocation;

    // Features
    features: ListingFeatures;

    // Price
    price: number;
    currency: 'TRY' | 'USD' | 'EUR';

    // Images
    images: ListingImage[];

    // Status
    status: ListingStatusValue;
    isActive: boolean;

    // Timestamps
    createdAt: Date | string;
    updatedAt: Date | string;
}

export interface Consultant {
    id: string;
    businessId: string;
    name: string;
    title?: string;
    phone: string;
    whatsapp?: string;
    email?: string;
    photoUrl?: string;
    // New fields for public profile
    slug?: string;
    bio?: string;
    socialLinks?: {
        instagram?: string;
        linkedin?: string;
        twitter?: string;
    };
    isActive: boolean;
    createdAt: Date | string;
}

export interface EmSettings {
    businessId: string;
    appearance: {
        cardStyle: 'compact' | 'detailed';
        showPrice: boolean;
        showConsultant: boolean;
    };
    defaults: {
        city?: string;
        district?: string;
    };
    whatsappTemplate?: string;
}

// ==================== API RESPONSE TYPES ====================

export interface ListingsResponse {
    success: boolean;
    listings?: Listing[];
    error?: string;
}

export interface ListingResponse {
    success: boolean;
    listing?: Listing;
    listingId?: string;
    error?: string;
}

export interface ConsultantsResponse {
    success: boolean;
    consultants?: Consultant[];
    error?: string;
}

export interface ConsultantResponse {
    success: boolean;
    consultant?: Consultant;
    consultantId?: string;
    error?: string;
}

// ==================== DISPLAY HELPERS ====================

export const PROPERTY_TYPE_LABELS: Record<PropertyTypeValue, string> = {
    residential: 'Konut',
    commercial: 'Ticari',
    land: 'Arsa/Tarla',
};

export const PROPERTY_SUB_TYPE_LABELS: Record<string, string> = {
    apartment: 'Daire',
    villa: 'Villa',
    detached: 'Müstakil Ev',
    residence: 'Residence',
    shop: 'Dükkan',
    office: 'Ofis',
    warehouse: 'Depo',
    land: 'Arsa',
    field: 'Tarla',
};

export const HEATING_LABELS: Record<string, string> = {
    natural_gas: 'Doğalgaz',
    central: 'Merkezi',
    floor: 'Yerden Isıtma',
    ac: 'Klima',
    stove: 'Soba',
    none: 'Yok',
};

export const STATUS_LABELS: Record<ListingStatusValue, string> = {
    active: 'Aktif',
    sold: 'Satıldı',
    inactive: 'Pasif',
};

// Format price with Turkish locale
export function formatPrice(price: number, currency: string = 'TRY'): string {
    const symbols: Record<string, string> = { TRY: '₺', USD: '$', EUR: '€' };
    const symbol = symbols[currency] || '₺';
    return `${symbol}${price.toLocaleString('tr-TR')}`;
}

// Get property badge color
export function getPropertyBadgeColor(type: PropertyTypeValue): string {
    const colors: Record<PropertyTypeValue, string> = {
        residential: 'bg-blue-500',
        commercial: 'bg-amber-500',
        land: 'bg-emerald-500',
    };
    return colors[type] || 'bg-gray-500';
}
