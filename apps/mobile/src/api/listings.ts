export type ListingModuleId = "emlak" | "realestate";

export interface ListingOption {
  consultantId: string | null;
  currency: string;
  description: string | null;
  id: string;
  imageUrl: string | null;
  listingType: string;
  locationText: string | null;
  price: number;
  propertyType: string;
  title: string;
}

export interface ListingOptions {
  business: { id: string; name: string; slug: string } | null;
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
  status: string;
}

export interface CreateListingInquiryInput {
  businessSlug: string;
  customerEmail?: string;
  customerName: string;
  customerPhone: string;
  idempotencyKey: string;
  listingId: string;
  message: string;
  moduleId: ListingModuleId;
}

export class ListingApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ListingApiError";
    this.status = status;
  }
}

const DEFAULT_API_BASE_URL = process.env.EXPO_PUBLIC_TIKPROFIL_API_URL ?? "https://tikprofil.com";
const emptyOptions: ListingOptions = { business: null, listings: [], moduleId: null, nativeEnabled: false };

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function isNullableString(value: unknown): value is string | null {
  return value === null || isString(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isModuleId(value: unknown): value is ListingModuleId {
  return value === "emlak" || value === "realestate";
}

function decodeListing(value: unknown): ListingOption | null {
  if (!isObject(value) || !isNullableString(value.consultantId) || !isString(value.currency)
    || !isNullableString(value.description) || !isString(value.id) || !isNullableString(value.imageUrl)
    || !isString(value.listingType) || !isNullableString(value.locationText)
    || !isFiniteNumber(value.price) || value.price < 0 || !isString(value.propertyType) || !isString(value.title)) return null;
  return value as unknown as ListingOption;
}

function decodeOptions(value: unknown): ListingOptions | null {
  if (!isObject(value) || typeof value.nativeEnabled !== "boolean") return null;
  if (!value.nativeEnabled) return emptyOptions;
  if (!isModuleId(value.moduleId) || !isObject(value.business)
    || !isString(value.business.id) || !isString(value.business.name) || !isString(value.business.slug)
    || !Array.isArray(value.listings)) return null;
  const listings = value.listings.map(decodeListing);
  if (!listings.length || listings.some((listing) => listing === null)) return null;
  return {
    business: { id: value.business.id, name: value.business.name, slug: value.business.slug },
    listings: listings.filter((listing): listing is ListingOption => listing !== null),
    moduleId: value.moduleId,
    nativeEnabled: true
  };
}

function decodeInquiry(value: unknown): ListingInquiryRecord | null {
  if (!isObject(value) || !isString(value.businessId) || !isString(value.businessName)
    || !isString(value.businessSlug) || typeof value.cancellable !== "boolean" || !isString(value.createdAt)
    || !isNullableString(value.customerEmail) || !isString(value.customerName) || !isString(value.customerPhone)
    || !isString(value.id) || !isString(value.listingCurrency) || !isString(value.listingId)
    || !isNullableString(value.listingImageUrl) || !isFiniteNumber(value.listingPrice)
    || !isString(value.listingTitle) || !isString(value.message) || !isModuleId(value.moduleId)
    || !isString(value.status)) return null;
  return value as unknown as ListingInquiryRecord;
}

async function json(input: string, init?: RequestInit) {
  const response = await fetch(input, init);
  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok || (isObject(payload) && payload.success === false)) {
    const message = isObject(payload) && isString(payload.error) ? payload.error : "Başvuru işlemi tamamlanamadı.";
    throw new ListingApiError(response.status, message);
  }
  return payload;
}

function endpoint(baseUrl: string, path: string) {
  return `${baseUrl.replace(/\/$/, "")}${path}`;
}

function bearer(accessToken: string, hasBody = false): HeadersInit {
  return { Accept: "application/json", Authorization: `Bearer ${accessToken}`, ...(hasBody ? { "Content-Type": "application/json" } : {}) };
}

export async function fetchListingOptions(businessSlug: string, baseUrl = DEFAULT_API_BASE_URL): Promise<ListingOptions> {
  try {
    const url = new URL(endpoint(baseUrl, "/api/kesfet/listings/options"));
    url.searchParams.set("businessSlug", businessSlug);
    return decodeOptions(await json(url.toString())) ?? emptyOptions;
  } catch {
    return emptyOptions;
  }
}

export async function createListingInquiry(accessToken: string, input: CreateListingInquiryInput, baseUrl = DEFAULT_API_BASE_URL) {
  const payload = await json(endpoint(baseUrl, "/api/kesfet/inquiries"), {
    body: JSON.stringify(input), headers: bearer(accessToken, true), method: "POST"
  });
  const inquiry = isObject(payload) ? decodeInquiry(payload.inquiry) : null;
  if (!inquiry) throw new ListingApiError(502, "Başvuru yanıtı geçersiz.");
  return inquiry;
}

export async function fetchListingInquiries(accessToken: string, baseUrl = DEFAULT_API_BASE_URL) {
  const payload = await json(endpoint(baseUrl, "/api/kesfet/inquiries"), { headers: bearer(accessToken) });
  if (!isObject(payload) || !Array.isArray(payload.inquiries)) throw new ListingApiError(502, "Başvuru geçmişi geçersiz.");
  const inquiries = payload.inquiries.map(decodeInquiry);
  if (inquiries.some((inquiry) => inquiry === null)) throw new ListingApiError(502, "Başvuru geçmişi geçersiz.");
  return inquiries.filter((inquiry): inquiry is ListingInquiryRecord => inquiry !== null);
}

export async function cancelListingInquiry(accessToken: string, inquiryId: string, baseUrl = DEFAULT_API_BASE_URL) {
  const payload = await json(endpoint(baseUrl, `/api/kesfet/inquiries/${encodeURIComponent(inquiryId)}/cancel`), {
    headers: bearer(accessToken, true), method: "PATCH"
  });
  const inquiry = isObject(payload) ? decodeInquiry(payload.inquiry) : null;
  if (!inquiry) throw new ListingApiError(502, "Başvuru iptal yanıtı geçersiz.");
  return inquiry;
}
