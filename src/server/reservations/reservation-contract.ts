export type ReservationVertical = "hotel" | "restaurant" | "vehicle";
export type ReservationStatus = "cancelled" | "completed" | "confirmed" | "pending" | "rejected";

export interface ReservationBusiness {
    id: string;
    name: string;
    slug: string;
}

export interface ReservationResource {
    capacity: number;
    description: string | null;
    id: string;
    imageUrl: string | null;
    name: string;
    timeSlots: string[];
    unitPrice: number;
}

export interface ReservationOptions {
    business: ReservationBusiness | null;
    nativeEnabled: boolean;
    resources: ReservationResource[];
    timeSlots: string[];
    vertical: ReservationVertical | null;
}

export interface ReservationRecord {
    businessId: string;
    businessName: string;
    businessSlug: string;
    cancellable: boolean;
    createdAt: string;
    customerEmail: string | null;
    customerName: string;
    customerPhone: string;
    endDate: string;
    id: string;
    note: string | null;
    partySize: number | null;
    reservationType: ReservationVertical;
    resourceId: string;
    resourceName: string;
    startDate: string;
    status: ReservationStatus;
    total: number;
    unitPrice: number;
}

export interface CreateOwnedReservationInput {
    appUserId: string;
    businessSlug: string;
    customerEmail: string | null;
    customerName: string;
    customerPhone: string;
    endDate: string;
    idempotencyKey: string;
    note: string | null;
    partySize?: number;
    resourceId: string;
    startDate: string;
    vertical: ReservationVertical;
}

export interface ReservationAvailabilityInput {
    businessSlug: string;
    endDate: string;
    resourceId: string;
    startDate: string;
    vertical: ReservationVertical;
}

export interface ReservationAvailability {
    available: boolean;
    unavailableDates: string[];
}

export const DISABLED_RESERVATION_OPTIONS: ReservationOptions = {
    business: null,
    nativeEnabled: false,
    resources: [],
    timeSlots: [],
    vertical: null,
};
