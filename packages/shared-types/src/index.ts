export interface Business {
  id: string;
  slug: string;
  name: string;
  coverImage: string | null;
  logoUrl: string | null;
  category: string;
  district: string | null;
  city: string | null;
  lat: number | null;
  lng: number | null;
  rating: number | null;
  reviewCount: number | null;
  distance: number | null;
  createdAt: string | null;
}

export interface BusinessData {
  name?: string;
  coverImage?: string;
  category?: string;
  moduleType?: string;
  district?: string;
  city?: string;
  location?: {
    lat?: number;
    lng?: number;
  };
  lat?: number;
  lng?: number;
  rating?: number;
  reviewCount?: number;
  description?: string;
  phone?: string;
  whatsapp?: string;
  address?: string;
  createdAt?: string;
}

export interface User {
  id: string;
  email: string;
  fullName?: string;
  avatar?: string;
  createdAt: string;
}

export interface KesfetOrder {
  id: string;
  userId: string;
  businessId: string;
  businessName: string;
  businessLogo?: string;
  businessSlug: string;
  items: {
    id: string;
    name: string;
    quantity: number;
    price: number;
  }[];
  total: number;
  status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'delivering' | 'delivered' | 'cancelled';
  createdAt: string;
  updatedAt: string;
}

export interface KesfetReservation {
  id: string;
  userId: string;
  businessId: string;
  businessName: string;
  businessSlug: string;
  date: string;
  time: string;
  guestCount: number;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'no_show';
  createdAt: string;
  updatedAt: string;
}

export interface FavoriteItem {
  id: string;
  itemId: string;
  itemType: 'business' | 'product';
  name: string;
  image?: string;
  rating?: number;
  reviewCount?: number;
  distance?: string;
  deliveryTime?: string;
  category?: string;
  price?: number;
  originalPrice?: number;
  storeName?: string;
}

export interface WalletData {
  balance: number;
  points: number;
}

export interface Location {
  lat: number;
  lng: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export type OrderStatus = KesfetOrder['status'];
export type ReservationStatus = KesfetReservation['status'];
export type FavoriteItemType = FavoriteItem['itemType'];
