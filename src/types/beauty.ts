// Beauty Center Module Types
// Production-ready TypeScript definitions with Zod validation

import { z } from 'zod';

// ==================== ZOD SCHEMAS ====================

// Category schema
export const serviceCategorySchema = z.object({
    name: z.string().min(1, 'Kategori adı zorunlu').max(100),
    icon: z.string().max(50).optional(),
    imageUrl: z.string().url().optional().or(z.literal('')),
    order: z.number().min(0).default(0),
    isActive: z.boolean().default(true),
});

// Service schema for creation
export const createServiceSchema = z.object({
    categoryId: z.string().min(1, 'Kategori seçin'),
    name: z.string().min(2, 'Hizmet adı en az 2 karakter').max(200),
    description: z.string().max(1000).optional(),
    price: z.number().min(0, 'Fiyat 0 veya üzeri olmalı'),
    duration: z.number().min(5, 'Süre en az 5 dakika').max(480, 'Süre en fazla 8 saat'), // in minutes
    images: z.array(z.object({
        url: z.string().url(),
        order: z.number().min(0),
        isMain: z.boolean(),
    })).optional(),
    isActive: z.boolean().default(true),
});

// Update service schema (partial)
export const updateServiceSchema = createServiceSchema.partial();

// Staff schema
export const staffSchema = z.object({
    name: z.string().min(2, 'Ad en az 2 karakter').max(100),
    title: z.string().max(100).optional(), // "Saç Stilisti", "Güzellik Uzmanı" etc.
    specialties: z.array(z.string()).optional(), // ["Saç Boyama", "Keratin"]
    phone: z.string().min(10, 'Telefon numarası geçersiz').max(20),
    photoUrl: z.string().url().optional().or(z.literal('')),
    isActive: z.boolean().default(true),
});

// Working hours schema
export const workingHoursSchema = z.object({
    monday: z.object({ open: z.string(), close: z.string(), isOpen: z.boolean() }),
    tuesday: z.object({ open: z.string(), close: z.string(), isOpen: z.boolean() }),
    wednesday: z.object({ open: z.string(), close: z.string(), isOpen: z.boolean() }),
    thursday: z.object({ open: z.string(), close: z.string(), isOpen: z.boolean() }),
    friday: z.object({ open: z.string(), close: z.string(), isOpen: z.boolean() }),
    saturday: z.object({ open: z.string(), close: z.string(), isOpen: z.boolean() }),
    sunday: z.object({ open: z.string(), close: z.string(), isOpen: z.boolean() }),
});

// Settings schema
export const beautySettingsSchema = z.object({
    workingHours: workingHoursSchema.optional(),
    appointmentSlotMinutes: z.number().min(15).max(120).default(30),
    whatsappTemplate: z.string().max(500).optional(),
    appearance: z.object({
        cardStyle: z.enum(['compact', 'detailed']).default('detailed'),
        showDuration: z.boolean().default(true),
        showStaff: z.boolean().default(false),
    }).optional(),
});

// ==================== TYPESCRIPT INTERFACES ====================

export interface ServiceImage {
    url: string;
    order: number;
    isMain: boolean;
}

export interface ServiceCategory {
    id: string;
    businessId: string;
    name: string;
    icon?: string;
    order: number;
    isActive: boolean;
    createdAt: Date | string;
}

export interface Service {
    id: string;
    businessId: string;
    categoryId: string;
    name: string;
    description?: string;
    price: number;
    currency: 'TRY' | 'USD' | 'EUR';
    duration: number; // in minutes
    images: ServiceImage[];
    isActive: boolean;
    createdAt: Date | string;
    updatedAt: Date | string;
}

export interface Staff {
    id: string;
    businessId: string;
    name: string;
    title?: string;
    specialties?: string[];
    phone: string;
    photoUrl?: string;
    isActive: boolean;
    createdAt: Date | string;
}

export interface DayHours {
    open: string;
    close: string;
    isOpen: boolean;
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

export interface BeautySettings {
    businessId: string;
    workingHours?: WorkingHours;
    appointmentSlotMinutes: number;
    whatsappTemplate?: string;
    appearance?: {
        cardStyle: 'compact' | 'detailed';
        showDuration: boolean;
        showStaff: boolean;
    };
}

// Customer schema for creation
export const customerSchema = z.object({
    name: z.string().min(2, 'Ad en az 2 karakter').max(100),
    phone: z.string().min(10, 'Telefon numarası geçersiz').max(20),
    email: z.string().email('Geçerli bir email girin').optional().or(z.literal('')),
    notes: z.string().max(1000).optional(),
    tags: z.array(z.string()).optional(), // ["VIP", "Yeni Müşteri", etc.]
});

export interface Customer {
    id: string;
    businessId: string;
    name: string;
    phone: string;
    email?: string;
    notes?: string;
    tags?: string[];
    totalAppointments: number;
    totalSpent: number;
    lastVisit?: string;
    createdAt: Date | string;
    updatedAt: Date | string;
}

// ==================== API RESPONSE TYPES ====================

export interface CategoriesResponse {
    success: boolean;
    categories?: ServiceCategory[];
    error?: string;
}

export interface ServicesResponse {
    success: boolean;
    services?: Service[];
    error?: string;
}

export interface ServiceResponse {
    success: boolean;
    service?: Service;
    serviceId?: string;
    error?: string;
}

export interface StaffResponse {
    success: boolean;
    staff?: Staff[];
    error?: string;
}

// ==================== APPOINTMENT TYPES ====================

export type AppointmentStatus = 'pending' | 'confirmed' | 'cancelled' | 'rejected' | 'completed';

export interface Appointment {
    id: string;
    businessId: string;
    serviceId: string;
    serviceName: string;
    serviceDuration: number;
    staffId: string; // "any" if not selected
    staffName: string; // "Herhangi bir uzman" if not selected
    customerName: string;
    customerPhone: string;
    date: string; // YYYY-MM-DD
    startTime: string; // HH:mm
    endTime: string; // HH:mm
    status: AppointmentStatus;
    note?: string;
    createdAt: Date | string;
}

// Appointment schema for creation
export const createAppointmentSchema = z.object({
    serviceId: z.string().min(1, 'Hizmet seçimi zorunlu'),
    staffId: z.string().default('any'),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Geçersiz tarih formatı'),
    startTime: z.string().regex(/^\d{2}:\d{2}$/, 'Geçersiz saat formatı'),
    customerName: z.string().min(2, 'Ad Soyad zorunlu'),
    customerPhone: z.string().min(10, 'Telefon zorunlu'),
    note: z.string().max(500).optional(),
});

export interface AppointmentsResponse {
    success: boolean;
    appointments?: Appointment[];
    error?: string;
}

export interface AppointmentActionResponse {
    success: boolean;
    appointmentId?: string;
    error?: string;
}

// ==================== DISPLAY HELPERS ====================

// Default category icons
export const CATEGORY_ICONS: Record<string, string> = {
    'Saç': '💇‍♀️',
    'Tırnak': '💅',
    'Cilt': '✨',
    'Makyaj': '💄',
    'Masaj': '💆‍♀️',
    'Epilasyon': '🪒',
    'Kaş & Kirpik': '👁️',
    'default': '💎',
};

// Format duration in Turkish
export function formatDuration(minutes: number): string {
    if (minutes < 60) {
        return `${minutes} dk`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (mins === 0) {
        return `${hours} saat`;
    }
    return `${hours} saat ${mins} dk`;
}

// Format price with Turkish locale
export function formatPrice(price: number, currency: string = 'TRY'): string {
    const symbols: Record<string, string> = { TRY: '₺', USD: '$', EUR: '€' };
    return `${symbols[currency] || '₺'}${price.toLocaleString('tr-TR')}`;
}

// Default working hours
export const DEFAULT_WORKING_HOURS: WorkingHours = {
    monday: { open: '09:00', close: '19:00', isOpen: true },
    tuesday: { open: '09:00', close: '19:00', isOpen: true },
    wednesday: { open: '09:00', close: '19:00', isOpen: true },
    thursday: { open: '09:00', close: '19:00', isOpen: true },
    friday: { open: '09:00', close: '19:00', isOpen: true },
    saturday: { open: '09:00', close: '18:00', isOpen: true },
    sunday: { open: '00:00', close: '00:00', isOpen: false },
};

// Day labels in Turkish
export const DAY_LABELS: Record<string, string> = {
    monday: 'Pazartesi',
    tuesday: 'Salı',
    wednesday: 'Çarşamba',
    thursday: 'Perşembe',
    friday: 'Cuma',
    saturday: 'Cumartesi',
    sunday: 'Pazar',
};
