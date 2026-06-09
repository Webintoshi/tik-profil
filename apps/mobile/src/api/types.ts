import type {
  ApiMode,
  BusinessProfile,
  CategorySummary,
  DiscoveryFilters,
  DiscoveryResponse,
  SearchFilters,
  SearchResponse,
} from "@/types/business";

export interface ApiRuntimeConfig {
  mode: ApiMode;
  baseUrl: string;
  requestTimeoutMs: number;
  mockDelayMs: number;
  publicBusinessProfilePathTemplate?: string;
}

export interface DiscoveryApi {
  getDiscoveryBusinesses(filters?: DiscoveryFilters): Promise<DiscoveryResponse>;
  searchBusinesses(filters: SearchFilters): Promise<SearchResponse>;
  getCategories(): Promise<CategorySummary[]>;
  getBusinessBySlug(slug: string): Promise<BusinessProfile | null>;
}

export class ApiClientError extends Error {
  code: string;
  status?: number;

  constructor(message: string, code = "API_ERROR", status?: number) {
    super(message);
    this.name = "ApiClientError";
    this.code = code;
    this.status = status;
  }
}
