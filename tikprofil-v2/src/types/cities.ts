export interface Place {
    id: string;
    name: string;
    category: 'manzara' | 'tarihi' | 'dogal' | 'plaj' | 'muzee' | 'yemek';
    images: string[];
    shortDesc: string;
    content: string;
    location?: { lat: number; lng: number };
    openingHours?: string;
    entranceFee?: string;
    rating: number;
    order: number;
}

export interface GalleryItem {
    id: string;
    url: string;
    alt: string;
    isCover: boolean;
}

export interface CityData {
    id: string;
    name: string;
    plate: string;
    slug: string;
    
    // SEO
    seoTitle: string;
    seoDescription: string;
    canonicalUrl?: string;
    ogImage?: string;
    
    // Content
    tagline: string;
    shortDescription: string;
    content: string;
    tags: string[];
    
    // Visual
    coverImage: string;
    coverImageAlt: string;
    gallery: GalleryItem[];
    
    // Places
    places: Place[];
    
    // Meta
    status: 'draft' | 'published' | 'scheduled';
    publishedAt?: string;
    
    // Analytics (readonly)
    viewCount?: number;
    avgReadTime?: number;
}

export type CityStatus = 'draft' | 'published' | 'scheduled';
export type PlaceCategory = 'manzara' | 'tarihi' | 'dogal' | 'plaj' | 'muzee' | 'yemek';

export interface PlaceCategoryConfig {
    value: PlaceCategory;
    label: string;
    icon: string;
}

export const PLACE_CATEGORIES: PlaceCategoryConfig[] = [
    { value: 'manzara', label: 'Manzara', icon: '🏔️' },
    { value: 'tarihi', label: 'Tarihi', icon: '🏛️' },
    { value: 'dogal', label: 'Doğal', icon: '🌲' },
    { value: 'plaj', label: 'Plaj', icon: '🏖️' },
    { value: 'muzee', label: 'Müze', icon: '🎨' },
    { value: 'yemek', label: 'Yemek', icon: '🍽️' },
];

export interface CityStats {
    totalPlaces: number;
    galleryCount: number;
    tagCount: number;
    contentLength: number;
    seoScore: number;
}

export function calculateSEOScore(data: Partial<CityData>): number {
    let score = 0;
    if (data.seoTitle && data.seoTitle.length > 10 && data.seoTitle.length < 70) score += 20;
    if (data.seoDescription && data.seoDescription.length > 50 && data.seoDescription.length < 160) score += 20;
    if (data.coverImage) score += 15;
    if (data.tagline) score += 10;
    if (data.content && data.content.length > 500) score += 15;
    if (data.places && data.places.length > 0) score += 10;
    if (data.tags && data.tags.length > 0) score += 10;
    return Math.min(100, score);
}
