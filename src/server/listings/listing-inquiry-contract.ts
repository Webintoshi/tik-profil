export type ListingModuleId = "emlak" | "realestate";
export type ListingInquiryStatus = "pending" | "contacted" | "resolved" | "rejected" | "cancelled";

export interface ListingBusiness {
    id: string;
    name: string;
    slug: string;
}

export interface ListingOption {
    consultantId: string | null;
    currency: string;
    description: string | null;
    id: string;
    imageUrl: string | null;
    listingType: string;
    locationText: string;
    price: number;
    propertyType: string;
    title: string;
}

export interface ListingOptions {
    business: ListingBusiness | null;
    listings: ListingOption[];
    moduleId: ListingModuleId | null;
    nativeEnabled: boolean;
}

export interface ListingInquiryRecord {
    businessId: string;
    businessName: string;
    businessSlug: string;
    cancellable: boolean;
    createdAt: string;
    customerEmail: string | null;
    customerName: string;
    customerPhone: string;
    id: string;
    listingCurrency: string;
    listingId: string;
    listingImageUrl: string | null;
    listingPrice: number;
    listingTitle: string;
    message: string;
    moduleId: ListingModuleId;
    status: ListingInquiryStatus;
}

export interface CreateOwnedListingInquiryInput {
    appUserId: string;
    businessSlug: string;
    customerEmail: string | null;
    customerName: string;
    customerPhone: string;
    idempotencyKey: string;
    listingId: string;
    message: string;
}

export const DISABLED_LISTING_OPTIONS: ListingOptions = {
    business: null,
    listings: [],
    moduleId: null,
    nativeEnabled: false,
};
