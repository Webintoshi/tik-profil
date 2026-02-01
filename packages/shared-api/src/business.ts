import { supabase } from './supabase';
import type { Business, BusinessData } from '@tikprofil/shared-types';
import { calculateHaversineDistance } from '@tikprofil/shared-utils';

export async function getBusinesses(options: {
  lat?: number;
  lng?: number;
  city?: string;
  category?: string;
  limit?: number;
}): Promise<Business[]> {
  const { lat, lng, city, category, limit = 100 } = options;

  let query = supabase
    .from('businesses')
    .select('id,slug,name,logo,cover,data,status,industry_id,industry_label,created_at')
    // .eq('status', 'active') // Geçici olarak tüm işletmeleri getir
    .limit(limit);

  if (city) {
    query = query.ilike('data->>city', `%${city}%`);
  }

  if (category) {
    const catLower = category.toLowerCase().replace(/\s+/g, '_');
    query = query.or(
      [
        `data->>category.ilike.%${catLower}%`,
        `data->>moduleType.ilike.%${catLower}%`,
        `industry_label.ilike.%${catLower}%`,
        `industry_id.ilike.%${catLower}%`,
      ].join(',')
    );
  }

  const { data, error } = await query;

  if (error) {
    console.error('[getBusinesses] Error:', error);
    throw error;
  }

  const businesses: Business[] = (data || []).map((row: any) => {
    const payload = (row.data || {}) as BusinessData;
    const location = payload.location;

    return {
      id: row.id,
      slug: row.slug || row.id,
      name: row.name || payload.name || 'İşletme',
      coverImage: payload.coverImage || row.cover || row.logo || null,
      logoUrl: row.logo || null,
      category: payload.category || payload.moduleType || 'other',
      subCategory: payload.subCategory || null,
      description: payload.description || null,
      isVerified: payload.isVerified || false,
      district: payload.district || null,
      city: payload.city || null,
      lat: location?.lat || payload.lat || null,
      lng: location?.lng || payload.lng || null,
      rating: payload.rating || null,
      reviewCount: payload.reviewCount || null,
      distance: null,
      phone: payload.phone || null,
      whatsapp: payload.whatsapp || null,
      address: payload.address || null,
      createdAt: payload.createdAt || row.created_at || null,
    };
  });

  if (lat && lng) {
    businesses.forEach((b) => {
      if (b.lat && b.lng) {
        b.distance = calculateHaversineDistance(lat, lng, b.lat, b.lng);
      } else {
        b.distance = 999999;
      }
    });

    businesses.sort((a, b) => (a.distance || 999999) - (b.distance || 999999));
  }

  return businesses;
}

export async function getBusinessBySlug(slug: string): Promise<Business | null> {
  const { data, error } = await supabase
    .from('businesses')
    .select('*')
    .eq('slug', slug)
    .eq('status', 'active')
    .single();

  if (error || !data) {
    return null;
  }

  const payload = (data.data || {}) as BusinessData;
  const location = payload.location;

  return {
    id: data.id,
    slug: data.slug || data.id,
    name: data.name || payload.name || 'İşletme',
    coverImage: payload.coverImage || data.cover || data.logo || null,
    logoUrl: data.logo || null,
    category: payload.category || payload.moduleType || 'other',
    subCategory: payload.subCategory || null,
    description: payload.description || null,
    isVerified: payload.isVerified || false,
    district: payload.district || null,
    city: payload.city || null,
    lat: location?.lat || payload.lat || null,
    lng: location?.lng || payload.lng || null,
    rating: payload.rating || null,
    reviewCount: payload.reviewCount || null,
    distance: null,
    phone: payload.phone || null,
    whatsapp: payload.whatsapp || null,
    address: payload.address || null,
    createdAt: payload.createdAt || data.created_at || null,
  };
}

export async function searchBusinesses(query: string, options?: { lat?: number; lng?: number }): Promise<Business[]> {
  const { lat, lng } = options || {};

  let dbQuery = supabase
    .from('businesses')
    .select('id,slug,name,logo,cover,data,status,industry_id,industry_label,created_at')
    .eq('status', 'active')
    .or(`name.ilike.%${query}%,data->>city.ilike.%${query}%`);

  const { data, error } = await dbQuery;

  if (error) {
    console.error('[searchBusinesses] Error:', error);
    throw error;
  }

  const businesses: Business[] = (data || []).map((row: any) => {
    const payload = (row.data || {}) as BusinessData;
    const location = payload.location;

    return {
      id: row.id,
      slug: row.slug || row.id,
      name: row.name || payload.name || 'İşletme',
      coverImage: payload.coverImage || row.cover || row.logo || null,
      logoUrl: row.logo || null,
      category: payload.category || payload.moduleType || 'other',
      subCategory: payload.subCategory || null,
      description: payload.description || null,
      isVerified: payload.isVerified || false,
      district: payload.district || null,
      city: payload.city || null,
      lat: location?.lat || payload.lat || null,
      lng: location?.lng || payload.lng || null,
      rating: payload.rating || null,
      reviewCount: payload.reviewCount || null,
      distance: null,
      phone: payload.phone || null,
      whatsapp: payload.whatsapp || null,
      address: payload.address || null,
      createdAt: payload.createdAt || row.created_at || null,
    };
  });

  if (lat && lng) {
    businesses.forEach((b) => {
      if (b.lat && b.lng) {
        b.distance = calculateHaversineDistance(lat, lng, b.lat, b.lng);
      } else {
        b.distance = 999999;
      }
    });
  }

  return businesses;
}
