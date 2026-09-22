export interface DiscoveryCategorySummary {
    id: string;
    slug: string;
    label: string;
    imageUrl: string | null;
    count: number;
}

export interface CategoryBusinessCard {
    id: string;
    slug: string;
    name: string;
    coverImage: string | null;
    logoUrl: string | null;
    categoryId: string | null;
    categoryLabel: string | null;
    district: string | null;
    city: string | null;
    rating: number | null;
    reviewCount: number;
}

export interface FeaturedBusinessCard extends CategoryBusinessCard {
    position: 1 | 2 | 3 | 4 | 5;
}

export interface CategoryPageCursor {
    id: string;
    score: number;
}

export interface CategoryPageBootstrap {
    parent: DiscoveryCategorySummary;
    children: DiscoveryCategorySummary[];
    selectedChild: DiscoveryCategorySummary;
    featured: FeaturedBusinessCard[];
    businesses: CategoryBusinessCard[];
    total: number;
    nextCursor: string | null;
    hasMore: boolean;
}

export interface CategoryBusinessesPage {
    businesses: CategoryBusinessCard[];
    total: number;
    nextCursor: string | null;
    hasMore: boolean;
}

export type FeaturedSlotStatus = "scheduled" | "active" | "paused" | "cancelled";

export interface FeaturedSlotInput {
    id?: string;
    city: string;
    childCategoryId: string;
    position: number;
    businessId: string;
    startsAt: string;
    endsAt: string;
    status: FeaturedSlotStatus;
    createdBy?: string | null;
}

export interface FeaturedSlotAssignment {
    id: string;
    city: string;
    childCategoryId: string;
    position: 1 | 2 | 3 | 4 | 5;
    businessId: string;
    businessName: string;
    businessSlug: string;
    startsAt: string;
    endsAt: string;
    status: FeaturedSlotStatus;
    createdBy: string | null;
}

export interface FeaturedSlotInventoryItem<TAssignment = FeaturedSlotAssignment> {
    position: 1 | 2 | 3 | 4 | 5;
    assignment: TAssignment | null;
}
