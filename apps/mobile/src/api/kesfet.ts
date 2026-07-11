import {
  buildCanonicalCategoryCounts,
  businessMatchesCategory,
  getCategoryQueryKey
} from "@/business/category-catalog";
import { CustomerApiError } from "@/api/customer";

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
  isFeatured?: boolean;
  status?: "active" | "inactive" | "draft";
  stock?: number;
  stockQuantity?: number;
  trackStock?: boolean;
  sortOrder?: number;
  createdAt?: string;
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
  freeAbove?: number;
}

export interface PublicEcommerceSettings {
  id?: string;
  storeName?: string;
  storeDescription?: string;
  currency?: string;
  minOrderAmount?: number;
  freeShippingThreshold?: number;
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

async function fetchJson<T>(url: string): Promise<T | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      return null;
    }
    return await response.json() as T;
  } catch {
    return null;
  }
}

async function getJson<T>(url: string, fallback: T): Promise<T> {
  const proxyUrl = getLocalWebProxyUrl();
  if (proxyUrl && BASE_URL === "https://tikprofil.com") {
    const proxiedResponse = await fetchJson<T>(rewriteBaseUrl(url, proxyUrl));
    if (proxiedResponse) {
      return proxiedResponse;
    }
  }

  const response = await fetchJson<T>(url);
  if (response) {
    return response;
  }

  if (proxyUrl && !url.startsWith(proxyUrl)) {
    const proxiedResponse = await fetchJson<T>(rewriteBaseUrl(url, proxyUrl));
    if (proxiedResponse) {
      return proxiedResponse;
    }
  }

  return fallback;
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
      if (preserveHttpError) throw new CustomerApiError(response.status, data);
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

  return getJson<PublicProfileResponse>(
    buildUrl(`/api/public/profile/${encodeURIComponent(slug.trim())}`),
    { success: false, profile: null, redirectTarget: null }
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
    { success: false, error: "Menü yüklenemedi" }
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
    { success: false, categories: [], products: [], error: "Ürünler yüklenemedi" }
  );
}

export async function fetchPublicEcommerceSettings(
  businessId: string
): Promise<PublicEcommerceSettings | null> {
  if (!businessId.trim()) {
    return null;
  }

  return getJson<PublicEcommerceSettings | null>(
    buildUrl("/api/public/ecommerce-settings", { businessId: businessId.trim() }),
    null
  );
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
} = {}): Promise<PaginatedKesfetResponse> {
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
    })
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
    buildLocalSearchResponse(query)
  );
}

export async function fetchCategories(): Promise<CategoriesResponse> {
  return getJson<CategoriesResponse>(
    buildUrl("/api/kesfet/categories"),
    { success: true, categories: LOCAL_ORDU_CATEGORIES, total: LOCAL_ORDU_BUSINESSES.length }
  );
}

export async function fetchCityGuide(city: string): Promise<CityGuideResponse | null> {
  if (!city.trim()) {
    return null;
  }

  return getJson<CityGuideResponse | null>(
    buildUrl("/api/cities", { name: city.trim() }),
    city.trim().toLocaleLowerCase("tr-TR") === "ordu" ? LOCAL_ORDU_CITY_GUIDE : null
  );
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
