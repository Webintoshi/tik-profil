import type { DiscoveryApi, ApiRuntimeConfig } from "@/api/types";
import { ApiClientError } from "@/api/types";
import { mockBusinesses } from "@/mocks/businesses";
import type {
  BusinessProfile,
  CategorySummary,
  DiscoveryBusiness,
  DiscoveryFilters,
  DiscoveryResponse,
  SearchFilters,
  SearchResponse,
} from "@/types/business";
import { normalizeSearchText } from "@/utils/text";

function asDiscoveryBusiness(business: BusinessProfile): DiscoveryBusiness {
  return {
    id: business.id,
    slug: business.slug,
    name: business.name,
    tagline: business.tagline,
    category: business.category,
    city: business.city,
    district: business.district,
    neighborhood: business.neighborhood,
    address: business.address,
    distanceKm: business.distanceKm,
    rating: business.rating,
    reviewCount: business.reviewCount,
    isOpen: business.isOpen,
    coverImageUrl: business.coverImageUrl,
    logoImageUrl: business.logoImageUrl,
    tags: business.tags,
  };
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function matchesDiscoveryFilters(
  business: BusinessProfile,
  filters: DiscoveryFilters,
): boolean {
  const categorySlug = normalizeSearchText(filters.category ?? "");

  if (
    filters.city &&
    normalizeSearchText(business.city) !== normalizeSearchText(filters.city)
  ) {
    return false;
  }

  if (
    filters.district &&
    normalizeSearchText(business.district) !== normalizeSearchText(filters.district)
  ) {
    return false;
  }

  if (
    filters.neighborhood &&
    normalizeSearchText(business.neighborhood ?? "") !==
      normalizeSearchText(filters.neighborhood)
  ) {
    return false;
  }

  if (
    categorySlug &&
    normalizeSearchText(business.category.slug) !== categorySlug &&
    normalizeSearchText(business.category.label) !== categorySlug
  ) {
    return false;
  }

  return true;
}

function searchPool(query: string, limit = 30): DiscoveryBusiness[] {
  const normalizedQuery = normalizeSearchText(query);

  return mockBusinesses
    .filter((business) => {
      const haystack = [
        business.name,
        business.tagline,
        business.category.label,
        business.category.slug,
        business.city,
        business.district,
        business.neighborhood,
        ...business.tags,
      ]
        .filter(Boolean)
        .map((value) => normalizeSearchText(value ?? ""))
        .join(" ");

      return haystack.includes(normalizedQuery);
    })
    .slice(0, limit)
    .map(asDiscoveryBusiness);
}

function buildCategories(): CategorySummary[] {
  const counts = new Map<string, CategorySummary>();

  mockBusinesses.forEach((business) => {
    const existing = counts.get(business.category.slug);

    if (existing) {
      existing.count += 1;
      return;
    }

    counts.set(business.category.slug, {
      id: business.category.id,
      slug: business.category.slug,
      label: business.category.label,
      icon: business.category.icon,
      count: 1,
    });
  });

  return Array.from(counts.values()).sort((left, right) => right.count - left.count);
}

export function createMockDiscoveryApi(
  config: ApiRuntimeConfig,
): DiscoveryApi {
  return {
    async getDiscoveryBusinesses(
      filters: DiscoveryFilters = {},
    ): Promise<DiscoveryResponse> {
      await delay(config.mockDelayMs);

      const page = filters.page ?? 1;
      const limit = filters.limit ?? 20;
      const filtered = mockBusinesses
        .filter((business) => matchesDiscoveryFilters(business, filters))
        .sort((left, right) => (left.distanceKm ?? 999) - (right.distanceKm ?? 999));
      const start = (page - 1) * limit;
      const pageItems = filtered.slice(start, start + limit).map(asDiscoveryBusiness);

      return {
        businesses: pageItems,
        total: filtered.length,
        page,
        limit,
        hasMore: start + limit < filtered.length,
      };
    },

    async searchBusinesses(filters: SearchFilters): Promise<SearchResponse> {
      await delay(config.mockDelayMs);
      const normalizedQuery = normalizeSearchText(filters.query);

      if (!normalizedQuery) {
        return {
          businesses: [],
          total: 0,
        };
      }

      if (normalizedQuery === "hata") {
        throw new ApiClientError("Mock API search failure", "MOCK_SEARCH_ERROR");
      }

      const results = searchPool(filters.query, filters.limit ?? 30).filter((business) => {
        if (
          filters.city &&
          normalizeSearchText(business.city) !== normalizeSearchText(filters.city)
        ) {
          return false;
        }

        if (
          filters.district &&
          normalizeSearchText(business.district) !==
            normalizeSearchText(filters.district)
        ) {
          return false;
        }

        return true;
      });

      return {
        businesses: results,
        total: results.length,
      };
    },

    async getCategories(): Promise<CategorySummary[]> {
      await delay(Math.max(250, config.mockDelayMs - 150));
      return buildCategories();
    },

    async getBusinessBySlug(slug: string): Promise<BusinessProfile | null> {
      await delay(Math.max(250, config.mockDelayMs - 100));
      return (
        mockBusinesses.find(
          (business) => normalizeSearchText(business.slug) === normalizeSearchText(slug),
        ) ?? null
      );
    },
  };
}
