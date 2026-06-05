import type { DiscoveryApi, ApiRuntimeConfig } from "@/api/types";
import { ApiClientError } from "@/api/types";
import { buildApiUrl } from "@/api/url";
import type {
  BusinessProfile,
  CategorySummary,
  DiscoveryBusiness,
  DiscoveryFilters,
  DiscoveryResponse,
  SearchFilters,
  SearchResponse,
} from "@/types/business";

type PublicBusinessPayload = {
  id: string;
  slug: string;
  name: string;
  coverImage?: string | null;
  logoUrl?: string | null;
  category?: string | null;
  categoryLabel?: string | null;
  district?: string | null;
  city?: string | null;
  rating?: number | null;
  reviewCount?: number | null;
  distance?: number | null;
};

function mapDiscoveryBusiness(payload: PublicBusinessPayload): DiscoveryBusiness {
  const categoryLabel = payload.categoryLabel || payload.category || "İşletme";

  return {
    id: payload.id,
    slug: payload.slug,
    name: payload.name,
    tagline: "Tık Profil işletme profili",
    category: {
      id: payload.category || "genel",
      slug: payload.category || "genel",
      label: categoryLabel,
      icon: "📍",
    },
    city: payload.city || "Bilinmiyor",
    district: payload.district || "Merkez",
    address: `${payload.district || "Merkez"}, ${payload.city || "Türkiye"}`,
    distanceKm: payload.distance ?? undefined,
    rating: payload.rating ?? undefined,
    reviewCount: payload.reviewCount ?? undefined,
    isOpen: undefined,
    coverImageUrl: payload.coverImage ?? undefined,
    logoImageUrl: payload.logoUrl ?? undefined,
    tags: [],
  };
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url);

  if (!response.ok) {
    throw new ApiClientError(
      `Request failed with status ${response.status}`,
      "HTTP_ERROR",
      response.status,
    );
  }

  return response.json() as Promise<T>;
}

export function createRealDiscoveryApi(
  config: ApiRuntimeConfig,
): DiscoveryApi {
  return {
    async getDiscoveryBusinesses(
      filters: DiscoveryFilters = {},
    ): Promise<DiscoveryResponse> {
      const payload = await fetchJson<{
        businesses: PublicBusinessPayload[];
        total: number;
        page: number;
        limit: number;
        hasMore: boolean;
      }>(
        buildApiUrl(config.baseUrl, "/api/kesfet", {
          city: filters.city,
          category: filters.category,
          page: filters.page,
          limit: filters.limit,
          lat: filters.lat,
          lng: filters.lng,
        }),
      );

      return {
        businesses: payload.businesses.map(mapDiscoveryBusiness),
        total: payload.total,
        page: payload.page,
        limit: payload.limit,
        hasMore: payload.hasMore,
      };
    },

    async searchBusinesses(filters: SearchFilters): Promise<SearchResponse> {
      const payload = await fetchJson<{
        businesses: PublicBusinessPayload[];
        total: number;
      }>(
        buildApiUrl(config.baseUrl, "/api/kesfet/search", {
          q: filters.query,
          city: filters.city,
          lat: filters.lat,
          lng: filters.lng,
        }),
      );

      return {
        businesses: payload.businesses.map(mapDiscoveryBusiness),
        total: payload.total,
      };
    },

    async getCategories(): Promise<CategorySummary[]> {
      const payload = await fetchJson<{
        categories: Array<{
          id: string;
          label: string;
          emoji: string;
          count: number;
        }>;
      }>(buildApiUrl(config.baseUrl, "/api/kesfet/categories"));

      return payload.categories.map((category) => ({
        id: category.id,
        slug: category.id,
        label: category.label,
        icon: category.emoji,
        count: category.count,
      }));
    },

    async getBusinessBySlug(slug: string): Promise<BusinessProfile | null> {
      if (!config.publicBusinessProfilePathTemplate) {
        throw new ApiClientError(
          "Public business detail endpoint is not wired for mobile yet.",
          "BUSINESS_DETAIL_NOT_READY",
        );
      }

      const pathname = config.publicBusinessProfilePathTemplate.replace(
        "{slug}",
        encodeURIComponent(slug),
      );

      const payload = await fetchJson<Record<string, unknown>>(
        buildApiUrl(config.baseUrl, pathname),
      );

      const business = payload.business as BusinessProfile | undefined;
      return business ?? null;
    },
  };
}
