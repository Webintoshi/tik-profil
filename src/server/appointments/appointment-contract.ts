export type AppointmentVertical = "beauty" | "clinic";
export type AppointmentStatus = "cancelled" | "completed" | "confirmed" | "pending" | "rejected";

export interface AppointmentWorkingDay {
    end: string;
    isOpen: boolean;
    start: string;
}

export type AppointmentWorkingHours = Record<string, AppointmentWorkingDay>;

export interface AppointmentServiceOption {
    currency: string;
    description: string | null;
    durationMinutes: number;
    id: string;
    name: string;
    price: number;
}

export interface AppointmentStaffOption {
    id: string;
    name: string;
    title: string | null;
}

export interface AppointmentSlotOption {
    date: string;
    staffId: string;
    time: string;
}

export interface AppointmentSettings {
    requireEmail: boolean;
    requirePhone: boolean;
    slotMinutes: number;
    workingHours: AppointmentWorkingHours;
}

export interface AppointmentOptions {
    nativeEnabled: boolean;
    services: AppointmentServiceOption[];
    settings: AppointmentSettings | null;
    slots: AppointmentSlotOption[];
    staff: AppointmentStaffOption[];
    vertical: AppointmentVertical | null;
}

export interface AppointmentRecord {
    businessName: string;
    businessSlug: string;
    cancellable: boolean;
    createdAt: string;
    customerEmail: string | null;
    customerName: string;
    customerPhone: string;
    date: string;
    id: string;
    note: string | null;
    serviceId: string;
    serviceName: string;
    servicePrice: number;
    staffId: string;
    staffName: string;
    status: AppointmentStatus;
    time: string;
    vertical: AppointmentVertical;
}

export interface CreateOwnedAppointmentInput {
    appUserId: string;
    businessSlug: string;
    customerEmail: string | null;
    customerName: string;
    customerPhone: string;
    date: string;
    idempotencyKey: string;
    note: string | null;
    serviceId: string;
    staffId: string;
    time: string;
}

export const DISABLED_APPOINTMENT_OPTIONS: AppointmentOptions = {
    nativeEnabled: false,
    services: [],
    settings: null,
    slots: [],
    staff: [],
    vertical: null,
};
