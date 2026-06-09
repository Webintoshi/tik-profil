export type ApiMode = "mock" | "real";

export interface BusinessCategory {
  id: string;
  slug: string;
  label: string;
  icon: string;
}

export interface BusinessLink {
  id: string;
  label: string;
  type: "website" | "instagram" | "facebook" | "x" | "linkedin";
  url: string;
}

export interface BusinessHours {
  day: string;
  hours: string;
  isToday?: boolean;
}

export interface BusinessContact {
  phone?: string;
  whatsapp?: string;
  address: string;
  directionsUrl: string;
}

export interface DiscoveryBusiness {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  category: BusinessCategory;
  city: string;
  district: string;
  neighborhood?: string;
  address: string;
  distanceKm?: number;
  rating?: number;
  reviewCount?: number;
  isOpen?: boolean;
  coverImageUrl?: string;
  logoImageUrl?: string;
  tags: string[];
}

export interface BusinessProfile extends DiscoveryBusiness {
  description: string;
  contact: BusinessContact;
  websiteUrl?: string;
  socialLinks: BusinessLink[];
  workingHours: BusinessHours[];
  qrProfileUrl: string;
}

export interface CategorySummary {
  id: string;
  slug: string;
  label: string;
  icon: string;
  count: number;
}

export interface DiscoveryFilters {
  city?: string;
  district?: string;
  neighborhood?: string;
  category?: string;
  page?: number;
  limit?: number;
  lat?: number;
  lng?: number;
}

export interface SearchFilters {
  query: string;
  city?: string;
  district?: string;
  lat?: number;
  lng?: number;
  limit?: number;
}

export interface DiscoveryResponse {
  businesses: DiscoveryBusiness[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export interface SearchResponse {
  businesses: DiscoveryBusiness[];
  total: number;
}
