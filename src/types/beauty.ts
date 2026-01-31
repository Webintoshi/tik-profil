import { z } from 'zod';

// Service Category Schema
export const serviceCategorySchema = z.object({
    name: z.string().min(1, 'Kategori adı zorunlu').max(100),
    icon: z.string().max(50).optional(),
    order: z.number().min(0).default(0),
    isActive: z.boolean().default(true),
    imageUrl: z.string().optional(),
});

// Category Icons
export const CATEGORY_ICONS = [
    { value: 'scissors', label: 'Makas', icon: '✂️' },
    { value: 'sparkles', label: 'Parlama', icon: '✨' },
    { value: 'heart', label: 'Kalp', icon: '❤️' },
    { value: 'star', label: 'Yıldız', icon: '⭐' },
    { value: 'user', label: 'Kişi', icon: '👤' },
    { value: 'crown', label: 'Tac', icon: '👑' },
    { value: 'gem', label: 'Mücevher', icon: '💎' },
    { value: 'flower', label: 'Çiçek', icon: '🌸' },
    { value: 'sun', label: 'Güneş', icon: '☀️' },
    { value: 'moon', label: 'Ay', icon: '🌙' },
];

// Working Hours
export const DEFAULT_WORKING_HOURS: Record<string, DayHours> = {
    monday: { start: '09:00', end: '18:00', isActive: true, isOpen: true },
    tuesday: { start: '09:00', end: '18:00', isActive: true, isOpen: true },
    wednesday: { start: '09:00', end: '18:00', isActive: true, isOpen: true },
    thursday: { start: '09:00', end: '18:00', isActive: true, isOpen: true },
    friday: { start: '09:00', end: '18:00', isActive: true, isOpen: true },
    saturday: { start: '09:00', end: '18:00', isActive: true, isOpen: true },
    sunday: { start: '09:00', end: '18:00', isActive: false, isOpen: false },
};

// Appointment Schema
export const createAppointmentSchema = z.object({
    serviceId: z.string().min(1, 'Hizmet seçimi zorunlu'),
    staffId: z.string().min(1, 'Personel seçimi zorunlu'),
    customerName: z.string().min(2, 'Ad soyad zorunlu'),
    customerPhone: z.string().min(10, 'Geçerli telefon numarası girin'),
    customerEmail: z.string().email().optional(),
    date: z.string().min(1, 'Tarih seçimi zorunlu'),
    time: z.string().min(1, 'Saat seçimi zorunlu'),
    notes: z.string().optional(),
});

// Staff Schema
export const staffSchema = z.object({
    name: z.string().min(2, 'İsim en az 2 karakter olmalı'),
    email: z.string().email().optional(),
    phone: z.string().optional(),
    specialties: z.array(z.string()).default([]),
    bio: z.string().max(500).optional(),
    avatar: z.string().optional(),
    isActive: z.boolean().default(true),
    title: z.string().optional(),
    photoUrl: z.string().optional(),
});

// Customer Schema
export const customerSchema = z.object({
    name: z.string().min(2, 'İsim zorunlu'),
    email: z.string().email().optional(),
    phone: z.string().min(10, 'Telefon zorunlu'),
    notes: z.string().optional(),
    tags: z.array(z.string()).optional(),
});

// Service Schema
export const createServiceSchema = z.object({
    name: z.string().min(2, 'Hizmet adı zorunlu'),
    description: z.string().optional(),
    price: z.number().min(0, 'Fiyat 0 veya daha büyük olmalı'),
    duration: z.number().min(5, 'Süre en az 5 dakika olmalı'),
    categoryId: z.string().min(1, 'Kategori seçimi zorunlu'),
    staffIds: z.array(z.string()).default([]),
    isActive: z.boolean().default(true),
    images: z.array(z.string()).optional(),
    currency: z.string().optional(),
});

// Settings Schema
export const beautySettingsSchema = z.object({
    businessName: z.string().optional(),
    address: z.string().optional(),
    phone: z.string().optional(),
    email: z.string().email().optional(),
    workingHours: z.record(z.string(), z.object({
        start: z.string(),
        end: z.string(),
        isActive: z.boolean(),
    })).optional(),
    requirePhone: z.boolean().default(true),
    requireEmail: z.boolean().default(false),
    isActive: z.boolean().default(true),
    appointmentSlotMinutes: z.number().default(30),
});

// Working Hours Types
export interface DayHours {
    start: string;
    end: string;
    isActive: boolean;
    isOpen?: boolean;
    open?: string;
    close?: string;
}

export interface WorkingHours {
    monday: DayHours;
    tuesday: DayHours;
    wednesday: DayHours;
    thursday: DayHours;
    friday: DayHours;
    saturday: DayHours;
    sunday: DayHours;
}

// Appointment Status
export type AppointmentStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled';

// Beauty Settings
export interface BeautySettings {
    businessName?: string;
    address?: string;
    phone?: string;
    email?: string;
    workingHours?: WorkingHours;
    requirePhone: boolean;
    requireEmail: boolean;
    isActive: boolean;
    appointmentSlotMinutes?: number;
}

// Types
export interface Service {
    id: string;
    name: string;
    description?: string;
    price: number;
    duration: number;
    categoryId: string;
    staffIds: string[];
    isActive: boolean;
    businessId?: string;
    images?: string[];
    currency?: string;
}

export interface Staff {
    id: string;
    name: string;
    email?: string;
    phone?: string;
    specialties: string[];
    bio?: string;
    avatar?: string;
    isActive: boolean;
    title?: string;
    photoUrl?: string;
}

export interface Appointment {
    id: string;
    businessId?: string;
    serviceId: string;
    serviceName?: string;
    serviceDuration?: number;
    staffId: string;
    staffName?: string;
    customerName: string;
    customerPhone: string;
    customerEmail?: string;
    date: string;
    time: string;
    startTime?: string;
    endTime?: string;
    notes?: string;
    note?: string;
    status: AppointmentStatus;
    createdAt?: string;
}

export interface Customer {
    id: string;
    name: string;
    email?: string;
    phone: string;
    notes?: string;
    businessId?: string;
    tags?: string[];
    lastVisit?: string;
    totalAppointments?: number;
    totalSpent?: number;
}

export interface ServiceCategory {
    id: string;
    name: string;
    icon?: string;
    order: number;
    isActive: boolean;
    imageUrl?: string;
}

// Helper functions
export const formatPrice = (price: number): string => {
    return `${price.toLocaleString('tr-TR')} ₺`;
};

export const formatDuration = (duration: number): string => {
    if (duration >= 60) {
        const hours = Math.floor(duration / 60);
        const minutes = duration % 60;
        return minutes > 0 ? `${hours} sa ${minutes} dk` : `${hours} sa`;
    }
    return `${duration} dk`;
};
