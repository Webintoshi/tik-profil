export type ReservationVertical = "hotel" | "restaurant" | "vehicle";

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
  business: { id: string; name: string; slug: string } | null;
  nativeEnabled: boolean;
  resources: ReservationResource[];
  timeSlots: string[];
  vertical: ReservationVertical | null;
}

export interface ReservationRecord {
  businessId: string;
  businessName: string;
  cancellable: boolean;
  createdAt: string;
  endDate: string;
  id: string;
  reservationType: ReservationVertical;
  resourceId: string;
  resourceName: string;
  startDate: string;
  status: string;
  total: number;
}

export interface CreateReservationInput {
  businessSlug: string;
  customerEmail?: string;
  customerName: string;
  customerPhone: string;
  endDate: string;
  idempotencyKey: string;
  note?: string;
  partySize?: number;
  resourceId: string;
  startDate: string;
  time?: string;
  vertical: ReservationVertical;
}

export class ReservationApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ReservationApiError";
    this.status = status;
  }
}

const DEFAULT_API_BASE_URL = process.env.EXPO_PUBLIC_TIKPROFIL_API_URL ?? "https://tikprofil.com";
const emptyOptions: ReservationOptions = { business: null, nativeEnabled: false, resources: [], timeSlots: [], vertical: null };

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

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(isString);
}

function isVertical(value: unknown): value is ReservationVertical {
  return value === "hotel" || value === "restaurant" || value === "vehicle";
}

function decodeResource(value: unknown, fallbackTimeSlots: string[]): ReservationResource | null {
  if (!isObject(value) || !isString(value.id) || !isString(value.name)
    || !isNullableString(value.description) || !isNullableString(value.imageUrl)
    || !isFiniteNumber(value.capacity) || value.capacity < 0
    || (value.timeSlots !== undefined && !isStringArray(value.timeSlots))
    || !isFiniteNumber(value.unitPrice) || value.unitPrice < 0) return null;
  return {
    capacity: value.capacity,
    description: value.description,
    id: value.id,
    imageUrl: value.imageUrl,
    name: value.name,
    timeSlots: isStringArray(value.timeSlots) ? value.timeSlots : fallbackTimeSlots,
    unitPrice: value.unitPrice
  };
}

function decodeOptions(value: unknown): ReservationOptions | null {
  if (!isObject(value) || typeof value.nativeEnabled !== "boolean") return null;
  if (!value.nativeEnabled) return emptyOptions;
  if (!isVertical(value.vertical) || !isObject(value.business)
    || !isString(value.business.id) || !isString(value.business.name) || !isString(value.business.slug)
    || !Array.isArray(value.resources) || !isStringArray(value.timeSlots)) return null;
  const timeSlots = value.timeSlots;
  const resources = value.resources.map((resource) => decodeResource(resource, timeSlots));
  if (resources.some((resource) => resource === null)) return null;
  return {
    business: { id: value.business.id, name: value.business.name, slug: value.business.slug },
    nativeEnabled: true,
    resources: resources.filter((resource): resource is ReservationResource => resource !== null),
    timeSlots,
    vertical: value.vertical
  };
}

function decodeReservation(value: unknown): ReservationRecord | null {
  if (!isObject(value) || !isString(value.businessId) || !isString(value.businessName)
    || typeof value.cancellable !== "boolean" || !isString(value.createdAt) || !isString(value.endDate)
    || !isString(value.id) || !isVertical(value.reservationType) || !isString(value.resourceId)
    || !isString(value.resourceName) || !isString(value.startDate) || !isString(value.status)
    || !isFiniteNumber(value.total)) return null;
  return value as unknown as ReservationRecord;
}

async function json(input: string, init?: RequestInit) {
  const response = await fetch(input, init);
  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok || (isObject(payload) && payload.success === false)) {
    const message = isObject(payload) && isString(payload.error) ? payload.error : "Rezervasyon islemi tamamlanamadi.";
    throw new ReservationApiError(response.status, message);
  }
  return payload;
}

function endpoint(baseUrl: string, path: string) {
  return `${baseUrl.replace(/\/$/, "")}${path}`;
}

function bearer(accessToken: string, hasBody = false): HeadersInit {
  return { Accept: "application/json", Authorization: `Bearer ${accessToken}`, ...(hasBody ? { "Content-Type": "application/json" } : {}) };
}

export async function fetchReservationOptions(businessSlug: string, baseUrl = DEFAULT_API_BASE_URL): Promise<ReservationOptions> {
  try {
    const url = new URL(endpoint(baseUrl, "/api/kesfet/reservations/options"));
    url.searchParams.set("businessSlug", businessSlug);
    const payload = await json(url.toString());
    return decodeOptions(payload) ?? emptyOptions;
  } catch {
    return emptyOptions;
  }
}

export async function fetchReservationAvailability(input: {
  businessSlug: string;
  endDate: string;
  resourceId: string;
  startDate: string;
  vertical: ReservationVertical;
}, baseUrl = DEFAULT_API_BASE_URL): Promise<{ available: boolean; unavailableDates: string[] }> {
  const url = new URL(endpoint(baseUrl, "/api/kesfet/reservations/availability"));
  Object.entries(input).forEach(([key, value]) => url.searchParams.set(key, value));
  const payload = await json(url.toString());
  if (!isObject(payload) || typeof payload.available !== "boolean" || !Array.isArray(payload.unavailableDates) || !payload.unavailableDates.every(isString)) {
    throw new ReservationApiError(502, "Musaitlik bilgisi gecersiz.");
  }
  return { available: payload.available, unavailableDates: payload.unavailableDates };
}

export async function createReservation(accessToken: string, input: CreateReservationInput, baseUrl = DEFAULT_API_BASE_URL) {
  const payload = await json(endpoint(baseUrl, "/api/kesfet/reservations"), {
    body: JSON.stringify(input), headers: bearer(accessToken, true), method: "POST"
  });
  const reservation = isObject(payload) ? decodeReservation(payload.reservation) : null;
  if (!reservation) throw new ReservationApiError(502, "Rezervasyon yaniti gecersiz.");
  return reservation;
}

export async function fetchReservations(accessToken: string, baseUrl = DEFAULT_API_BASE_URL) {
  const payload = await json(endpoint(baseUrl, "/api/kesfet/reservations"), { headers: bearer(accessToken) });
  if (!isObject(payload) || !Array.isArray(payload.reservations)) throw new ReservationApiError(502, "Rezervasyon gecmisi gecersiz.");
  const reservations = payload.reservations.map(decodeReservation);
  if (reservations.some((reservation) => reservation === null)) throw new ReservationApiError(502, "Rezervasyon gecmisi gecersiz.");
  return reservations.filter((reservation): reservation is ReservationRecord => reservation !== null);
}

export async function cancelReservation(accessToken: string, reservationId: string, baseUrl = DEFAULT_API_BASE_URL) {
  const payload = await json(endpoint(baseUrl, `/api/kesfet/reservations/${encodeURIComponent(reservationId)}/cancel`), {
    headers: bearer(accessToken, true), method: "PATCH"
  });
  const reservation = isObject(payload) ? decodeReservation(payload.reservation) : null;
  if (!reservation) throw new ReservationApiError(502, "Rezervasyon iptal yaniti gecersiz.");
  return reservation;
}
