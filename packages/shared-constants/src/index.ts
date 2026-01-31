export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
export const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
export const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://tikprofil.com';

export const BUSINESS_CATEGORIES = [
  { id: 'all', name: 'Tümü', icon: 'compass' },
  { id: 'restaurant', name: 'Restoran', icon: 'utensils' },
  { id: 'cafe', name: 'Cafe', icon: 'coffee' },
  { id: 'fastfood', name: 'Fast Food', icon: 'pizza' },
  { id: 'beauty', name: 'Güzellik', icon: 'scissors' },
  { id: 'shopping', name: 'Alışveriş', icon: 'shopping-bag' },
  { id: 'service', name: 'Hizmet', icon: 'briefcase' },
  { id: 'other', name: 'Diğer', icon: 'building' },
] as const;

export const ORDER_STATUSES = [
  { id: 'all', label: 'Tümü' },
  { id: 'active', label: 'Aktif' },
  { id: 'completed', label: 'Tamamlanan' },
  { id: 'cancelled', label: 'İptal' },
] as const;

export const RESERVATION_STATUSES = [
  { id: 'all', label: 'Tümü' },
  { id: 'upcoming', label: 'Yaklaşan' },
  { id: 'past', label: 'Geçmiş' },
  { id: 'cancelled', label: 'İptal' },
] as const;

export const CITIES = [
  'İstanbul',
  'Ankara',
  'İzmir',
  'Antalya',
  'Bursa',
  'Adana',
  'Mersin',
  'Konya',
  'Gaziantep',
  'Şanlıurfa',
] as const;

export const PAGINATION = {
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
} as const;

export const CACHE_KEYS = {
  BUSINESS_LIST: 'business-list',
  FAVORITES: 'favorites',
  ORDERS: 'orders',
  RESERVATIONS: 'reservations',
  USER_PROFILE: 'user-profile',
  WALLET: 'wallet',
} as const;

export const STORAGE_KEYS = {
  AUTH_TOKEN: 'tikprofil_session',
  REFRESH_TOKEN: 'tikprofil_refresh_token',
  USER_PREFERENCES: 'tikprofil_preferences',
  LOCATION_PERMISSION: 'location_permission',
} as const;

export const DEEP_LINKING = {
  BUSINESS_PREFIX: 'business',
  ORDER_PREFIX: 'order',
  RESERVATION_PREFIX: 'reservation',
} as const;

export const THEME = {
  COLORS: {
    PRIMARY: '#10B981',
    SECONDARY: '#14B8A6',
    SUCCESS: '#10B981',
    WARNING: '#F59E0B',
    ERROR: '#EF4444',
    INFO: '#3B82F6',
    DARK: '#111827',
    LIGHT: '#F9FAFB',
  },
  SPACING: {
    XS: 4,
    SM: 8,
    MD: 16,
    LG: 24,
    XL: 32,
    XXL: 48,
  },
  BORDER_RADIUS: {
    SM: 8,
    MD: 12,
    LG: 16,
    XL: 20,
    FULL: 9999,
  },
} as const;
