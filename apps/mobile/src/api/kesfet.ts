import {
  buildCanonicalCategoryCounts,
  businessMatchesCategory,
  getCategoryQueryKey
} from "@/business/category-catalog";
import { CustomerApiError } from "@/api/customer";
import {
  cachedGet,
  canonicalRequestKey,
  invalidateRequestCache,
  type CachedGetOptions
} from "@/api/request-cache";
import { normalizeCityName } from "@/city/normalize-city";

const CACHE_TTL = {
  categories: 5 * 60_000,
  cityGuide: 5 * 60_000,
  discovery: 30_000,
  ecommerce: 20_000,
  menu: 20_000,
  profile: 60_000,
  search: 15_000
} as const;

export class KesfetHttpError extends Error {
  readonly body: unknown;
  readonly status: number;

  constructor(
    status: number,
    body: unknown = null,
    message = `Request failed with HTTP ${status}`
  ) {
    super(message);
    this.name = "KesfetHttpError";
    this.body = body;
    this.status = status;
  }
}

export interface KesfetBusiness {
  id: string;
  slug: string;
  name: string;
  coverImage: string | null;
  logoUrl: string | null;
  category: string;
  categoryLabel: string;
  industryId: string | null;
  district: string | null;
  city: string | null;
  lat: number | null;
  lng: number | null;
  rating: number | null;
  reviewCount: number | null;
  createdAt: string | null;
  distance: number | null;
}

export interface KesfetCategory {
  id: string;
  label: string;
  emoji: string;
  count: number;
}

export interface PaginatedKesfetResponse {
  success: boolean;
  businesses: KesfetBusiness[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export interface SearchResponse {
  success: boolean;
  businesses: KesfetBusiness[];
  total: number;
}

export interface CategoriesResponse {
  success: boolean;
  categories: KesfetCategory[];
  total: number;
}

export interface CityGuidePlace {
  id: string;
  name: string;
  image: string;
  category: string;
}

export interface CityGuideResponse {
  id: string;
  name: string;
  plate?: number;
  tagline?: string;
  description?: string;
  coverImage?: string;
  places: CityGuidePlace[];
}

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface ReadRequestOptions {
  force?: boolean;
}

export interface PublicProfileSocialLinks {
  website?: string | null;
  instagram?: string | null;
  youtube?: string | null;
  google?: string | null;
  facebook?: string | null;
  twitter?: string | null;
  tiktok?: string | null;
  linkedin?: string | null;
}

export interface PublicProfile {
  id: string;
  slug: string;
  name: string;
  logo?: string | null;
  cover?: string | null;
  industry: string;
  industryLabel: string;
  isVerified: boolean;
  phone?: string | null;
  whatsapp?: string | null;
  about?: string | null;
  address?: string | null;
  mapsUrl?: string | null;
  showHours: boolean;
  workingHours: unknown;
  modules: string[];
  hasRestaurantModule: boolean;
  cartEnabled: boolean;
  social: PublicProfileSocialLinks;
}

export interface PublicProfileResponse {
  success: boolean;
  profile: PublicProfile | null;
  redirectTarget?: string | null;
}

export interface PublicFoodMenuCategory {
  id: string;
  name: string;
  icon?: string | null;
  sortOrder?: number;
  order?: number;
}

export interface PublicFoodMenuProduct {
  id: string;
  name: string;
  name_en?: string;
  description?: string;
  description_en?: string;
  price: number;
  categoryId: string;
  imageUrl?: string | null;
  image?: string | null;
  inStock?: boolean;
  sortOrder?: number;
  order?: number;
  discountPrice?: number | null;
  discountUntil?: string | null;
  extraGroupIds?: string[];
}

export interface PublicFoodMenuExtra {
  id: string;
  groupId: string;
  name: string;
  priceModifier: number;
  isDefault?: boolean;
  image?: string;
  imageUrl?: string;
  order?: number;
}

export interface PublicFoodMenuExtraGroup {
  id: string;
  name: string;
  selectionType?: "single" | "multiple";
  isRequired?: boolean;
  maxSelections?: number;
  order?: number;
  extras: PublicFoodMenuExtra[];
}

export interface PublicFoodMenuData {
  businessId: string;
  businessName: string;
  businessLogoUrl?: string;
  businessLogo?: string;
  businessPhone?: string;
  businessWhatsapp?: string;
  whatsapp?: string;
  categories: PublicFoodMenuCategory[];
  products: PublicFoodMenuProduct[];
  extraGroups?: PublicFoodMenuExtraGroup[];
  extras?: PublicFoodMenuExtra[];
  settings?: {
    cartEnabled?: boolean;
    whatsappOrderEnabled?: boolean;
    deliveryEnabled?: boolean;
    pickupEnabled?: boolean;
    minOrderAmount?: number;
    freeDeliveryAbove?: number;
    deliveryFee?: number;
    estimatedDeliveryTime?: string | null;
    cashPayment?: boolean;
    cardOnDelivery?: boolean;
    onlinePayment?: boolean;
  };
}

export interface PublicFoodMenuResponse {
  success: boolean;
  data?: PublicFoodMenuData;
  error?: string;
}

export interface PublicEcommerceCategory {
  id: string;
  name: string;
  slug?: string;
  image?: string;
  isActive?: boolean;
  order?: number;
  sortOrder?: number;
  productCount?: number;
}

export interface PublicEcommerceProduct {
  id: string;
  businessId?: string;
  name: string;
  description?: string;
  price: number;
  compareAtPrice?: number;
  categoryId?: string;
  categoryName?: string;
  images?: string[];
  image?: string;
  isActive?: boolean;
  active?: boolean;
  isFeatured?: boolean;
  status?: "active" | "inactive" | "draft";
  stock?: number | null;
  stockQuantity?: number | null;
  trackStock?: boolean;
  sortOrder?: number;
  createdAt?: string;
  variants?: PublicEcommerceProductVariant[];
}

export interface PublicEcommerceProductVariant {
  id: string;
  name?: string;
  price?: number;
  stock?: number | null;
  stockQuantity?: number | null;
  isActive?: boolean;
  active?: boolean;
}

export interface PublicEcommerceProductsResponse {
  success?: boolean;
  categories?: PublicEcommerceCategory[];
  products?: PublicEcommerceProduct[];
  error?: string;
}

export interface PublicEcommerceShippingOption {
  id: string;
  name: string;
  price?: number;
  fee?: number;
  estimatedDays?: string;
  isActive?: boolean;
  freeAbove?: number | null;
}

export interface PublicEcommerceSettings {
  id?: string;
  storeName?: string;
  storeDescription?: string;
  currency?: string;
  minOrderAmount?: number;
  freeShippingThreshold?: number | null;
  taxRate?: number;
  shippingOptions?: PublicEcommerceShippingOption[];
  paymentMethods?: Record<string, boolean>;
  checkoutSettings?: {
    requirePhone?: boolean;
    requireEmail?: boolean;
    requireAddress?: boolean;
    allowNotes?: boolean;
  };
}

export interface PublicEcommerceSettingsResponse {
  success: boolean;
  settings: PublicEcommerceSettings;
}

export interface PublicEcommerceCheckoutInput {
  businessId: string;
  items: Array<{
    productId: string;
    variantId?: string;
    quantity: number;
  }>;
  customerInfo: {
    name: string;
    phone: string;
    email?: string;
    address: string;
    city: string;
    district?: string;
    notes?: string;
  };
  paymentMethod: "cash" | "card" | "transfer" | "online";
  shippingCost: number;
  shippingMethod?: string;
  couponCode?: string;
}

export interface PublicEcommerceCheckoutResponse {
  success?: boolean;
  orderId?: string;
  orderNumber?: string;
  total?: number;
  error?: string;
}

export interface PublicFastFoodOrderInput {
  businessId: string;
  idempotencyKey: string;
  customerName: string;
  customerPhone: string;
  customerAddress?: string;
  deliveryType: "pickup" | "delivery" | "table";
  tableId?: string;
  paymentMethod: "cash" | "card" | "online";
  items: Array<{
    productId: string;
    productName: string;
    unitPrice: number;
    quantity: number;
    selectedExtras?: Array<{
      id: string;
      name: string;
      priceModifier: number;
    }>;
    totalPrice: number;
  }>;
  subtotal: number;
  deliveryFee: number;
  total: number;
  customerNote?: string;
  couponId?: string | null;
  couponCode?: string | null;
  couponDiscount?: number;
}

export interface PublicFastFoodOrderResponse {
  success?: boolean;
  orderId?: string;
  orderNumber?: string;
  status?: string;
  error?: string;
}

export interface PublicFastFoodCouponValidationInput {
  businessId: string;
  categoryIds?: string[];
  code: string;
  customerPhone?: string;
  productIds?: string[];
  subtotal: number;
}

export interface PublicFastFoodCouponValidationResponse {
  valid: boolean;
  coupon?: {
    code: string;
    discountType: "fixed" | "free_delivery" | "percentage";
    discountValue: number;
    id: string;
    title: string;
  };
  discount?: number;
  message?: string;
}

const BASE_URL = process.env.EXPO_PUBLIC_TIKPROFIL_API_URL ?? "https://tikprofil.com";
const LOCAL_WEB_PROXY_URL = process.env.EXPO_PUBLIC_TIKPROFIL_LOCAL_PROXY_URL ?? "http://localhost:8787";

const LOCAL_ORDU_BUSINESSES: KesfetBusiness[] = [
  {
    id: "0e1b9b30-abc9-4711-99ee-5c78da19cb59",
    slug: "cemile-petshop",
    name: "Cemile Petshop",
    coverImage: "https://cdn.tikprofil.com/covers/0e1b9b30-abc9-4711-99ee-5c78da19cb59/1770556001756_cover.jpeg",
    logoUrl: "https://cdn.tikprofil.com/logos/0e1b9b30-abc9-4711-99ee-5c78da19cb59/1770555998587_logo.jpeg",
    category: "petshop",
    categoryLabel: "Petshop",
    industryId: "petshop",
    district: "Akyazi",
    city: "Ordu",
    lat: null,
    lng: null,
    rating: null,
    reviewCount: null,
    createdAt: "2026-02-08T13:06:18.317+00:00",
    distance: null
  },
  {
    id: "1de50f6f-d68f-45be-8e14-82295e7b60cf",
    slug: "manchego",
    name: "MANCHEGO AKYAZI",
    coverImage: "https://cdn.tikprofil.com/covers/1de50f6f-d68f-45be-8e14-82295e7b60cf/1770511596298_cover.png",
    logoUrl: "https://cdn.tikprofil.com/logos/1de50f6f-d68f-45be-8e14-82295e7b60cf/1770511063431_logo.jpeg",
    category: "kahve_shop",
    categoryLabel: "Kahve Shop",
    industryId: "kahve_shop",
    district: "Akyazi",
    city: "Ordu",
    lat: null,
    lng: null,
    rating: null,
    reviewCount: null,
    createdAt: "2026-02-06T07:15:23.888+00:00",
    distance: null
  },
  {
    id: "23ZU6GH1B3XZrLxA8V6p",
    slug: "alaz",
    name: "ALAZ RESTORAN ORDU",
    coverImage: "https://cdn.tikprofil.com/covers/23ZU6GH1B3XZrLxA8V6p/1768444852031_cover.jpg",
    logoUrl: "https://cdn.tikprofil.com/logos/23ZU6GH1B3XZrLxA8V6p/1768444850635_logo.jpg",
    category: "restoran",
    categoryLabel: "Restoran",
    industryId: "restoran",
    district: "Altinordu",
    city: "Ordu",
    lat: null,
    lng: null,
    rating: null,
    reviewCount: null,
    createdAt: "2025-12-29T05:21:08.118+00:00",
    distance: null
  },
  {
    id: "8IssSPZF1Lw0A3q4UyNz",
    slug: "bebek-burger-akyazi",
    name: "BEBEK BURGER AKYAZI",
    coverImage: "https://cdn.tikprofil.com/covers/8IssSPZF1Lw0A3q4UyNz/1768444855252_cover.jpg",
    logoUrl: "https://cdn.tikprofil.com/logos/8IssSPZF1Lw0A3q4UyNz/1768444854459_logo.jpg",
    category: "fast_food",
    categoryLabel: "Fast Food",
    industryId: "fast_food",
    district: "Akyazi",
    city: "Ordu",
    lat: null,
    lng: null,
    rating: null,
    reviewCount: null,
    createdAt: "2025-12-26T16:13:39.223+00:00",
    distance: null
  },
  {
    id: "670opHVFicU7Tth7kXgZ",
    slug: "celebi-emlak",
    name: "CELEBI EMLAK",
    coverImage: "https://cdn.tikprofil.com/covers/670opHVFicU7Tth7kXgZ/1768444853709_cover.jpg",
    logoUrl: "https://cdn.tikprofil.com/logos/670opHVFicU7Tth7kXgZ/1768444852952_logo.jpg",
    category: "emlak_ofisi",
    categoryLabel: "Emlak ofisi",
    industryId: "emlak_ofisi",
    district: "Altinordu",
    city: "Ordu",
    lat: null,
    lng: null,
    rating: null,
    reviewCount: null,
    createdAt: "2025-12-30T03:34:30.449+00:00",
    distance: null
  },
  {
    id: "gmf6u7OEJ5UDSse7Yr9G",
    slug: "derycraft",
    name: "DERYCRAFT",
    coverImage: "https://cdn.tikprofil.com/covers/gmf6u7OEJ5UDSse7Yr9G/1768444856768_cover.jpg",
    logoUrl: "https://cdn.tikprofil.com/logos/gmf6u7OEJ5UDSse7Yr9G/1768444856020_logo.jpg",
    category: "e_ticaret",
    categoryLabel: "E-Ticaret",
    industryId: "e_ticaret",
    district: "Altinordu",
    city: "Ordu",
    lat: null,
    lng: null,
    rating: null,
    reviewCount: null,
    createdAt: "2026-01-08T11:29:42.465+00:00",
    distance: null
  },
  {
    id: "3a1561f7-40a9-4a66-9e98-0e03d89e7215",
    slug: "atlas-smoke-fastfood-20260605002259",
    name: "atlas-smoke-fastfood-20260605002259",
    coverImage: null,
    logoUrl: null,
    category: "fast_food_burger",
    categoryLabel: "Fast Food (Burger,pizza ve digerleri)",
    industryId: "fast_food_burger",
    district: "Altinordu",
    city: "Ordu",
    lat: null,
    lng: null,
    rating: null,
    reviewCount: null,
    createdAt: "2026-06-05T00:27:00.085+00:00",
    distance: null
  },
  {
    id: "23ccf322-f999-474a-a625-eacdb67caf12",
    slug: "robotik-muhendisligi",
    name: "Robotik Muhendisligi",
    coverImage: null,
    logoUrl: null,
    category: "e_ticaret",
    categoryLabel: "E-Ticaret",
    industryId: "e_ticaret",
    district: "Altinordu",
    city: "Ordu",
    lat: null,
    lng: null,
    rating: null,
    reviewCount: null,
    createdAt: "2026-01-31T10:49:25.401+00:00",
    distance: null
  },
  {
    id: "3a825178-7d0d-4dc6-8c31-4fefaa63b33c",
    slug: "sedef",
    name: "Sedef",
    coverImage: null,
    logoUrl: null,
    category: "klinik_saglik",
    categoryLabel: "Klinik & Saglik",
    industryId: "klinik_saglik",
    district: "Altinordu",
    city: "Ordu",
    lat: null,
    lng: null,
    rating: null,
    reviewCount: null,
    createdAt: "2026-01-28T14:23:44.773+00:00",
    distance: null
  },
  {
    id: "aaa1a17c-af15-419a-96de-a5f3cc6de471",
    slug: "daglarca",
    name: "Daglarca",
    coverImage: null,
    logoUrl: null,
    category: "arac_kiralama",
    categoryLabel: "Arac Kiralama",
    industryId: "arac_kiralama",
    district: "Altinordu",
    city: "Ordu",
    lat: null,
    lng: null,
    rating: null,
    reviewCount: null,
    createdAt: "2026-01-29T23:14:21.211+00:00",
    distance: null
  },
  {
    id: "ebee814e-9f20-4321-9974-459d2deeed61",
    slug: "makarna",
    name: "Makarna",
    coverImage: null,
    logoUrl: null,
    category: "fast_food_burger",
    categoryLabel: "Fast Food (Burger,pizza ve digerleri)",
    industryId: "fast_food_burger",
    district: "Altinordu",
    city: "Ordu",
    lat: null,
    lng: null,
    rating: null,
    reviewCount: null,
    createdAt: "2026-03-03T08:26:32.57+00:00",
    distance: null
  },
  {
    id: "f6b76935-adfd-4d7e-89ae-e6b56526331c",
    slug: "palmiye-baba",
    name: "Palmiye Baba",
    coverImage: null,
    logoUrl: null,
    category: "otel_konaklama",
    categoryLabel: "Otel & Konaklama",
    industryId: "otel_konaklama",
    district: "Altinordu",
    city: "Ordu",
    lat: null,
    lng: null,
    rating: null,
    reviewCount: null,
    createdAt: "2026-01-24T21:17:16.172+00:00",
    distance: null
  },
  {
    id: "otIRVEsgRyzTqPIB6Ou6",
    slug: "ezmeo",
    name: "EZMEO",
    coverImage: null,
    logoUrl: null,
    category: "other",
    categoryLabel: "Other",
    industryId: "other",
    district: "Altinordu",
    city: "Ordu",
    lat: null,
    lng: null,
    rating: null,
    reviewCount: null,
    createdAt: "2026-01-03T21:11:39.996+00:00",
    distance: null
  }
];

const LOCAL_ORDU_CATEGORIES: KesfetCategory[] = buildCanonicalCategoryCounts(LOCAL_ORDU_BUSINESSES);

const LOCAL_ORDU_CITY_GUIDE: CityGuideResponse = {
  id: "ordu",
  name: "Ordu",
  plate: 52,
  tagline: "Mavinin ve yeşilin buluştuğu oksijen diyarı.",
  description: "Karadeniz'in incisi Ordu; sahil rotası, Boztepe manzarası, kahve durakları ve yerel lezzetleriyle keşif akışını besler.",
  coverImage: "https://images.unsplash.com/photo-1625903995874-9f20c4228964?q=80&w=2000&auto=format&fit=crop",
  places: [
    {
      id: "ordu-food-guide",
      name: "Ordu'da ne yenir?",
      image: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?q=80&w=900&auto=format&fit=crop",
      category: "Yeme içme"
    },
    {
      id: "ordu-coffee-guide",
      name: "Boztepe'de kahve molası",
      image: "https://images.unsplash.com/photo-1688152787884-6997b7188706?q=80&w=800&auto=format&fit=crop",
      category: "Kafe rotası"
    },
    {
      id: "ordu-coast-guide",
      name: "Sahil boyunca balık ve yürüyüş",
      image: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?q=80&w=900&auto=format&fit=crop",
      category: "Sahil"
    },
    {
      id: "ordu-yason-guide",
      name: "Yason Burnu gezi rotası",
      image: "https://images.unsplash.com/photo-1629833596856-291771146744?q=80&w=800&auto=format&fit=crop",
      category: "Gezi"
    }
  ]
};

export function getLocalDiscoveryBootstrap(category?: string | null) {
  return {
    businesses: buildLocalDiscoveryResponse({ limit: 24, category }).businesses,
    categories: LOCAL_ORDU_CATEGORIES,
    cityGuide: LOCAL_ORDU_CITY_GUIDE
  };
}

function buildUrl(path: string, params: Record<string, string | number | null | undefined> = {}) {
  const url = new URL(path, BASE_URL);

  Object.entries(params).forEach(([key, value]) => {
    if (value === null || value === undefined || value === "") {
      return;
    }
    url.searchParams.set(key, String(value));
  });

  return url.toString();
}

function getLocalWebProxyUrl() {
  const location = (globalThis as { location?: { hostname?: string } }).location;
  if (!location) {
    return null;
  }

  return location.hostname === "localhost" || location.hostname === "127.0.0.1"
    ? LOCAL_WEB_PROXY_URL
    : null;
}

function rewriteBaseUrl(url: string, nextBaseUrl: string) {
  const parsed = new URL(url);
  return new URL(`${parsed.pathname}${parsed.search}`, nextBaseUrl).toString();
}

function getTransportUrls(url: string) {
  const proxyUrl = getLocalWebProxyUrl();
  const candidates: string[] = [];
  if (proxyUrl && BASE_URL === "https://tikprofil.com") {
    candidates.push(rewriteBaseUrl(url, proxyUrl));
  }
  candidates.push(url);
  if (proxyUrl) candidates.push(rewriteBaseUrl(url, proxyUrl));
  return [...new Set(candidates)];
}

async function fetchJsonStrict<T>(url: string): Promise<T> {
  let lastError: KesfetHttpError | null = null;
  for (const requestUrl of getTransportUrls(url)) {
    try {
      const response = await fetch(requestUrl);
      const body = await response.json().catch(() => null);
      if (response.ok) {
        if (body === null) throw new KesfetHttpError(502, null, "Response body is not valid JSON");
        return body as T;
      }

      const error = new KesfetHttpError(response.status, body);
      if (response.status >= 400 && response.status < 500) throw error;
      lastError = error;
    } catch (error) {
      if (error instanceof KesfetHttpError && error.status >= 400 && error.status < 500) throw error;
      lastError = error instanceof KesfetHttpError
        ? error
        : new KesfetHttpError(0, null, error instanceof Error ? error.message : "Network request failed");
    }
  }
  throw lastError ?? new KesfetHttpError(0);
}

async function getJson<T>(
  url: string,
  fallback: T,
  ttlMs: number,
  validate?: (value: unknown) => value is T,
  cacheOptions: CachedGetOptions = {}
): Promise<T> {
  try {
    return await cachedGet(canonicalRequestKey(url), async () => {
      const value = await fetchJsonStrict<unknown>(url);
      if (validate && !validate(value)) {
        throw new KesfetHttpError(502, value, "Response body has an invalid shape");
      }
      return value as T;
    }, ttlMs, cacheOptions);
  } catch {
    return fallback;
  }
}

async function getJsonOrThrow<T>(
  url: string,
  ttlMs: number,
  validate?: (value: unknown) => value is T,
  cacheOptions: CachedGetOptions = {}
): Promise<T> {
  return cachedGet(canonicalRequestKey(url), async () => {
    const value = await fetchJsonStrict<unknown>(url);
    if (validate && !validate(value)) {
      throw new KesfetHttpError(502, value, "Response body has an invalid shape");
    }
    return value as T;
  }, ttlMs, cacheOptions);
}

async function postJson<T>(
  url: string,
  body: unknown,
  fallback: T,
  extraHeaders: Record<string, string> = {},
  preserveHttpError = false
): Promise<T> {
  const proxyUrl = getLocalWebProxyUrl();
  const requestUrl = proxyUrl && BASE_URL === "https://tikprofil.com"
    ? rewriteBaseUrl(url, proxyUrl)
    : url;

  try {
    const response = await fetch(requestUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...extraHeaders
      },
      body: JSON.stringify(body)
    });
    const data = await response.json().catch(() => null);

    if (!response.ok) {
      if (preserveHttpError) {
        const serverMessage = data && typeof data === "object"
          ? (typeof data.error === "string" ? data.error : typeof data.message === "string" ? data.message : undefined)
          : undefined;
        throw new CustomerApiError(response.status, data, serverMessage);
      }
      return {
        ...(typeof fallback === "object" && fallback ? fallback : {}),
        error: data?.error || data?.message || "İşlem tamamlanamadı"
      } as T;
    }

    return data as T;
  } catch (error) {
    if (error instanceof CustomerApiError) throw error;
    return fallback;
  }
}

function buildLocalDiscoveryResponse(params: {
  page?: number;
  limit?: number;
  category?: string | null;
}): PaginatedKesfetResponse {
  const page = params.page ?? 1;
  const limit = params.limit ?? 20;
  const filtered = params.category
    ? LOCAL_ORDU_BUSINESSES.filter((business) => businessMatchesCategory(business, params.category))
    : LOCAL_ORDU_BUSINESSES;
  const start = (page - 1) * limit;
  const businesses = filtered.slice(start, start + limit);

  return {
    success: true,
    businesses,
    total: filtered.length,
    page,
    limit,
    hasMore: start + businesses.length < filtered.length
  };
}

function normalizeSearchValue(value: string) {
  return value
    .toLocaleLowerCase("tr-TR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function buildLocalSearchResponse(query: string): SearchResponse {
  const normalizedQuery = normalizeSearchValue(query.trim());
  const businesses = LOCAL_ORDU_BUSINESSES.filter((business) => {
    const searchable = [
      business.name,
      business.slug,
      business.category,
      business.categoryLabel,
      business.district,
      business.city
    ].filter(Boolean).join(" ");

    return normalizeSearchValue(searchable).includes(normalizedQuery);
  });

  return {
    success: true,
    businesses,
    total: businesses.length
  };
}

export function getPublicProfileUrl(slug: string) {
  return `${BASE_URL}/${slug}`;
}

export function getPublicMenuUrl(slug: string) {
  return `${BASE_URL}/${slug}/menu`;
}

export function resolveTikProfilAssetUrl(url?: string | null) {
  if (!url) {
    return null;
  }

  if (/^https?:\/\//i.test(url)) {
    return url;
  }

  return new URL(url, BASE_URL).toString();
}

export async function fetchPublicProfile(slug: string): Promise<PublicProfileResponse> {
  if (!slug.trim()) {
    return { success: false, profile: null, redirectTarget: null };
  }

  return getJsonOrThrow<PublicProfileResponse>(
    buildUrl(`/api/public/profile/${encodeURIComponent(slug.trim())}`),
    CACHE_TTL.profile,
    isPublicProfileResponse,
    {
      awaitRevalidation: true,
      classifyError: classifyProfileCacheError
    }
  );
}

export async function fetchPublicFoodMenu(
  slug: string,
  kind: "fastfood" | "restaurant"
): Promise<PublicFoodMenuResponse> {
  if (!slug.trim()) {
    return { success: false, error: "businessSlug required" };
  }

  const path = kind === "fastfood" ? "/api/fastfood/public-menu" : "/api/restaurant/public-menu";

  return getJson<PublicFoodMenuResponse>(
    buildUrl(path, { businessSlug: slug.trim() }),
    { success: false, error: "Menü yüklenemedi" },
    CACHE_TTL.menu,
    isSuccessResponse
  );
}

export async function submitPublicFastFoodOrder(
  input: PublicFastFoodOrderInput,
  accessToken?: string | null
): Promise<PublicFastFoodOrderResponse> {
  return postJson<PublicFastFoodOrderResponse>(
    buildUrl("/api/fastfood/orders"),
    input,
    { success: false, error: "Sipariş gönderilemedi" },
    accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
    Boolean(accessToken)
  );
}

export function invalidatePublicFoodMenuCache(slug: string, kind: "fastfood" | "restaurant") {
  const path = kind === "fastfood" ? "/api/fastfood/public-menu" : "/api/restaurant/public-menu";
  return invalidateRequestCache(buildUrl(path, { businessSlug: slug.trim() }));
}

export async function validatePublicFastFoodCoupon(
  input: PublicFastFoodCouponValidationInput
): Promise<PublicFastFoodCouponValidationResponse> {
  return postJson<PublicFastFoodCouponValidationResponse>(
    buildUrl("/api/fastfood/validate-coupon"),
    input,
    { valid: false, message: "Kupon doğrulanamadı" }
  );
}

export async function fetchPublicEcommerceProducts(
  businessId: string
): Promise<PublicEcommerceProductsResponse> {
  if (!businessId.trim()) {
    return { success: false, categories: [], products: [], error: "businessId required" };
  }

  return getJson<PublicEcommerceProductsResponse>(
    buildUrl("/api/public/products", { businessId: businessId.trim() }),
    { success: false, categories: [], products: [], error: "Ürünler yüklenemedi" },
    CACHE_TTL.ecommerce,
    isEcommerceProductsResponse
  );
}

export async function fetchPublicEcommerceSettings(
  businessId: string
): Promise<PublicEcommerceSettings | null> {
  if (!businessId.trim()) {
    return null;
  }

  const response = await getJson<PublicEcommerceSettingsResponse | null>(
    buildUrl("/api/public/ecommerce-settings", { businessId: businessId.trim() }),
    null,
    CACHE_TTL.ecommerce,
    isEcommerceSettingsResponse
  );
  return response?.settings ?? null;
}

export function invalidatePublicEcommerceCache(businessId: string) {
  const normalizedId = businessId.trim();
  const productsInvalidated = invalidateRequestCache(buildUrl("/api/public/products", { businessId: normalizedId }));
  const settingsInvalidated = invalidateRequestCache(buildUrl("/api/public/ecommerce-settings", { businessId: normalizedId }));
  return productsInvalidated || settingsInvalidated;
}

export async function submitPublicEcommerceCheckout(
  input: PublicEcommerceCheckoutInput
): Promise<PublicEcommerceCheckoutResponse> {
  return postJson<PublicEcommerceCheckoutResponse>(
    buildUrl("/api/public/checkout"),
    input,
    { success: false, error: "Sipariş oluşturulamadı" }
  );
}

export async function fetchDiscoveryBusinesses(params: {
  page?: number;
  limit?: number;
  city?: string | null;
  category?: string | null;
  distance?: number | null;
  coordinates?: Coordinates | null;
} = {}, options: ReadRequestOptions = {}): Promise<PaginatedKesfetResponse> {
  const page = params.page ?? 1;
  const limit = params.limit ?? 20;

  return getJson<PaginatedKesfetResponse>(
    buildUrl("/api/kesfet", {
      page,
      limit,
      city: params.city,
      category: getCategoryQueryKey(params.category),
      distance: params.distance,
      lat: params.coordinates?.lat,
      lng: params.coordinates?.lng
    }),
    buildLocalDiscoveryResponse({
      page,
      limit,
      category: params.category
    }),
    CACHE_TTL.discovery,
    isDiscoveryResponse,
    { force: options.force }
  );
}

export async function searchBusinesses(query: string, coordinates?: Coordinates | null): Promise<SearchResponse> {
  if (!query.trim()) {
    return { success: true, businesses: [], total: 0 };
  }

  return getJson<SearchResponse>(
    buildUrl("/api/kesfet/search", {
      q: query.trim(),
      lat: coordinates?.lat,
      lng: coordinates?.lng
    }),
    buildLocalSearchResponse(query),
    CACHE_TTL.search,
    isSearchResponse
  );
}

export async function fetchCategories(options: ReadRequestOptions = {}): Promise<CategoriesResponse> {
  return getJson<CategoriesResponse>(
    buildUrl("/api/kesfet/categories"),
    { success: true, categories: LOCAL_ORDU_CATEGORIES, total: LOCAL_ORDU_BUSINESSES.length },
    CACHE_TTL.categories,
    isCategoriesResponse,
    { force: options.force }
  );
}

export async function fetchCityGuide(city: string, options: ReadRequestOptions = {}): Promise<CityGuideResponse | null> {
  const requestedCity = city.trim();
  const normalizedCity = normalizeCityName(requestedCity);
  if (!normalizedCity) {
    return null;
  }

  const fallback = normalizedCity === "ordu" ? LOCAL_ORDU_CITY_GUIDE : null;
  const response = await getJson<unknown>(
    buildUrl("/api/cities", { name: requestedCity }),
    null,
    CACHE_TTL.cityGuide,
    (value): value is unknown => isCityGuideResponse(value) && normalizeCityName(value.name) === normalizedCity,
    { force: options.force }
  );

  return isCityGuideResponse(response) && normalizeCityName(response.name) === normalizedCity
    ? response
    : fallback;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function classifyProfileCacheError(error: unknown) {
  return error instanceof KesfetHttpError && (error.status === 404 || error.status === 410)
    ? "terminal" as const
    : "retryable" as const;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isOptionalString(value: unknown) {
  return value === undefined || value === null || typeof value === "string";
}

function isNullableString(value: unknown) {
  return value === null || typeof value === "string";
}

function isNullableFiniteNumber(value: unknown) {
  return value === null || isFiniteNumber(value);
}

function isKesfetBusiness(value: unknown): value is KesfetBusiness {
  if (!isRecord(value)) return false;
  return isNonEmptyString(value.id)
    && isNonEmptyString(value.slug)
    && isNonEmptyString(value.name)
    && isNonEmptyString(value.category)
    && isNonEmptyString(value.categoryLabel)
    && isNullableString(value.coverImage)
    && isNullableString(value.logoUrl)
    && isNullableString(value.industryId)
    && isNullableString(value.district)
    && isNullableString(value.city)
    && isNullableFiniteNumber(value.lat)
    && isNullableFiniteNumber(value.lng)
    && isNullableFiniteNumber(value.rating)
    && isNullableFiniteNumber(value.reviewCount)
    && isNullableString(value.createdAt)
    && isNullableFiniteNumber(value.distance);
}

function isFoodMenuExtra(value: unknown): value is PublicFoodMenuExtra {
  return isRecord(value)
    && isNonEmptyString(value.id)
    && isNonEmptyString(value.groupId)
    && isNonEmptyString(value.name)
    && isFiniteNumber(value.priceModifier);
}

function isFoodMenuData(value: unknown): value is PublicFoodMenuData {
  if (!isRecord(value)
    || !isNonEmptyString(value.businessId)
    || !isNonEmptyString(value.businessName)
    || !Array.isArray(value.categories)
    || !Array.isArray(value.products)) {
    return false;
  }

  const categoriesValid = value.categories.every((category) => isRecord(category)
    && isNonEmptyString(category.id)
    && isNonEmptyString(category.name));
  const productsValid = value.products.every((product) => isRecord(product)
    && isNonEmptyString(product.id)
    && isNonEmptyString(product.name)
    && isNonEmptyString(product.categoryId)
    && isFiniteNumber(product.price));
  const extrasValid = value.extras === undefined || (Array.isArray(value.extras) && value.extras.every(isFoodMenuExtra));
  const groupsValid = value.extraGroups === undefined || (Array.isArray(value.extraGroups) && value.extraGroups.every((group) => isRecord(group)
    && isNonEmptyString(group.id)
    && isNonEmptyString(group.name)
    && Array.isArray(group.extras)
    && group.extras.every(isFoodMenuExtra)));
  return categoriesValid && productsValid && extrasValid && groupsValid;
}

function isSuccessResponse(value: unknown): value is PublicFoodMenuResponse {
  return isRecord(value) && value.success === true && isFoodMenuData(value.data);
}

function isPublicProfileResponse(value: unknown): value is PublicProfileResponse {
  if (!isRecord(value) || value.success !== true) return false;
  if (value.profile === null) return isNonEmptyString(value.redirectTarget);
  if (!isRecord(value.profile)) return false;

  const profile = value.profile;
  return isNonEmptyString(profile.id)
    && isNonEmptyString(profile.slug)
    && isNonEmptyString(profile.name)
    && isNonEmptyString(profile.industry)
    && isNonEmptyString(profile.industryLabel)
    && typeof profile.isVerified === "boolean"
    && typeof profile.showHours === "boolean"
    && Array.isArray(profile.modules)
    && profile.modules.every((module) => typeof module === "string")
    && typeof profile.hasRestaurantModule === "boolean"
    && typeof profile.cartEnabled === "boolean"
    && Object.hasOwn(profile, "workingHours")
    && isOptionalString(profile.logo)
    && isOptionalString(profile.cover)
    && isOptionalString(profile.phone)
    && isOptionalString(profile.whatsapp)
    && isOptionalString(profile.about)
    && isOptionalString(profile.address)
    && isOptionalString(profile.mapsUrl)
    && isRecord(profile.social)
    && Object.values(profile.social).every(isOptionalString);
}

function isOptionalFiniteNumber(value: unknown) {
  return value === undefined || isFiniteNumber(value);
}

function isOptionalNullableFiniteNumber(value: unknown) {
  return value === undefined || value === null || isFiniteNumber(value);
}

function isOptionalBoolean(value: unknown) {
  return value === undefined || typeof value === "boolean";
}

function isEcommerceProductVariant(value: unknown): value is PublicEcommerceProductVariant {
  return isRecord(value)
    && isNonEmptyString(value.id)
    && (value.name === undefined || typeof value.name === "string")
    && isOptionalFiniteNumber(value.price)
    && isOptionalNullableFiniteNumber(value.stock)
    && isOptionalNullableFiniteNumber(value.stockQuantity)
    && isOptionalBoolean(value.isActive)
    && isOptionalBoolean(value.active);
}

function isEcommerceProduct(value: unknown): value is PublicEcommerceProduct {
  if (!isRecord(value)) return false;
  return isNonEmptyString(value.id)
    && isNonEmptyString(value.name)
    && isFiniteNumber(value.price)
    && (value.businessId === undefined || typeof value.businessId === "string")
    && (value.description === undefined || typeof value.description === "string")
    && isOptionalFiniteNumber(value.compareAtPrice)
    && (value.categoryId === undefined || typeof value.categoryId === "string")
    && (value.categoryName === undefined || typeof value.categoryName === "string")
    && (value.images === undefined || (Array.isArray(value.images) && value.images.every((image) => typeof image === "string")))
    && (value.image === undefined || typeof value.image === "string")
    && isOptionalBoolean(value.isActive)
    && isOptionalBoolean(value.active)
    && isOptionalBoolean(value.isFeatured)
    && (value.status === undefined || value.status === "active" || value.status === "inactive" || value.status === "draft")
    && isOptionalNullableFiniteNumber(value.stock)
    && isOptionalNullableFiniteNumber(value.stockQuantity)
    && isOptionalBoolean(value.trackStock)
    && isOptionalFiniteNumber(value.sortOrder)
    && (value.createdAt === undefined || typeof value.createdAt === "string")
    && (value.variants === undefined || (Array.isArray(value.variants) && value.variants.every(isEcommerceProductVariant)));
}

function isEcommerceProductsResponse(value: unknown): value is PublicEcommerceProductsResponse {
  if (!isRecord(value) || value.success !== true || !Array.isArray(value.categories) || !Array.isArray(value.products)) {
    return false;
  }
  return value.categories.every((category) => isRecord(category)
      && isNonEmptyString(category.id)
      && isNonEmptyString(category.name))
    && value.products.every(isEcommerceProduct);
}

function isEcommerceShippingOption(value: unknown): value is PublicEcommerceShippingOption {
  return isRecord(value)
    && isNonEmptyString(value.id)
    && isNonEmptyString(value.name)
    && isOptionalFiniteNumber(value.price)
    && isOptionalFiniteNumber(value.fee)
    && (value.estimatedDays === undefined || typeof value.estimatedDays === "string")
    && isOptionalBoolean(value.isActive)
    && isOptionalNullableFiniteNumber(value.freeAbove);
}

function isEcommerceSettingsResponse(value: unknown): value is PublicEcommerceSettingsResponse {
  if (!isRecord(value) || value.success !== true || !isRecord(value.settings)) return false;
  const settings = value.settings;
  return isNonEmptyString(settings.id)
    && isNonEmptyString(settings.storeName)
    && typeof settings.storeDescription === "string"
    && isNonEmptyString(settings.currency)
    && isFiniteNumber(settings.minOrderAmount)
    && isOptionalNullableFiniteNumber(settings.freeShippingThreshold)
    && isFiniteNumber(settings.taxRate)
    && Array.isArray(settings.shippingOptions)
    && settings.shippingOptions.every(isEcommerceShippingOption)
    && isRecord(settings.paymentMethods)
    && Object.values(settings.paymentMethods).every((enabled) => typeof enabled === "boolean")
    && isRecord(settings.checkoutSettings)
    && typeof settings.checkoutSettings.requirePhone === "boolean"
    && typeof settings.checkoutSettings.requireEmail === "boolean"
    && typeof settings.checkoutSettings.requireAddress === "boolean"
    && typeof settings.checkoutSettings.allowNotes === "boolean";
}

function isDiscoveryResponse(value: unknown): value is PaginatedKesfetResponse {
  return isRecord(value)
    && value.success === true
    && Array.isArray(value.businesses)
    && value.businesses.every(isKesfetBusiness)
    && isFiniteNumber(value.total)
    && isFiniteNumber(value.page)
    && isFiniteNumber(value.limit)
    && typeof value.hasMore === "boolean";
}

function isSearchResponse(value: unknown): value is SearchResponse {
  return isRecord(value)
    && value.success === true
    && Array.isArray(value.businesses)
    && value.businesses.every(isKesfetBusiness)
    && isFiniteNumber(value.total);
}

function isCategoriesResponse(value: unknown): value is CategoriesResponse {
  return isRecord(value)
    && value.success === true
    && Array.isArray(value.categories)
    && value.categories.every((category) => isRecord(category)
      && isNonEmptyString(category.id)
      && isNonEmptyString(category.label)
      && typeof category.emoji === "string"
      && isFiniteNumber(category.count))
    && isFiniteNumber(value.total);
}

function isCityGuideResponse(value: unknown): value is CityGuideResponse {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const guide = value as Record<string, unknown>;
  return isNonEmptyString(guide.id)
    && isNonEmptyString(guide.name)
    && typeof guide.plate === "number"
    && Number.isFinite(guide.plate)
    && isNonEmptyString(guide.coverImage)
    && Array.isArray(guide.places)
    && guide.places.every((place) => {
      if (typeof place !== "object" || place === null) {
        return false;
      }
      const item = place as Record<string, unknown>;
      return isNonEmptyString(item.id)
        && isNonEmptyString(item.name)
        && isNonEmptyString(item.image)
        && isNonEmptyString(item.category);
    });
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export async function logQrScan(business: Pick<KesfetBusiness, "id" | "slug">) {
  try {
    const url = buildUrl("/api/qr-scan");
    const proxyUrl = getLocalWebProxyUrl();
    const requestUrl = proxyUrl && BASE_URL === "https://tikprofil.com"
      ? rewriteBaseUrl(url, proxyUrl)
      : url;

    await fetch(requestUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        businessId: business.id,
        businessSlug: business.slug
      })
    });
  } catch {
    return;
  }
}
