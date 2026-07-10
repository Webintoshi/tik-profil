export interface CustomerProfile {
  appUserId: string;
  avatarUrl: string | null;
  birthDate: string | null;
  createdAt: string;
  displayName: string | null;
  hobbies: string[];
  maritalStatus: string | null;
  occupation: string | null;
  phone: string | null;
  preferences: Record<string, unknown>;
  updatedAt: string;
}

export interface CustomerAddress {
  city: string;
  createdAt: string;
  district: string;
  fullAddress: string;
  id: string;
  isDefault: boolean;
  label: string;
  latitude: number | null;
  longitude: number | null;
  updatedAt: string;
}

export interface CustomerOrder {
  businessId: string;
  businessName: string | null;
  createdAt: string;
  id: string;
  itemCount: number;
  orderNumber: string | null;
  recordType: "ecommerce" | "fastfood";
  status: string;
  total: number;
}

export interface CustomerReservation {
  businessId: string;
  createdAt: string;
  endDate: string;
  id: string;
  reservationType: "hotel" | "vehicle";
  startDate: string;
  status: string;
  total: number;
}

export interface CustomerAccount {
  addresses: CustomerAddress[];
  email: string | null;
  orders: CustomerOrder[];
  profile: CustomerProfile | null;
  reservations: CustomerReservation[];
}

export interface CustomerAddressInput {
  city: string;
  district: string;
  fullAddress: string;
  id?: string;
  isDefault?: boolean;
  label: string;
  latitude?: number | null;
  longitude?: number | null;
}

export interface CustomerProfileUpdate {
  addresses?: CustomerAddressInput[];
  avatarUrl?: string | null;
  birthDate?: string | null;
  displayName?: string | null;
  hobbies?: string[];
  maritalStatus?: string | null;
  occupation?: string | null;
  phone?: string | null;
  preferences?: Record<string, unknown>;
}

interface ProfileResponse {
  addresses: CustomerAddress[];
  email: string | null;
  profile: CustomerProfile | null;
  success: boolean;
}

interface OrdersResponse {
  orders: CustomerOrder[];
  success: boolean;
}

interface ReservationsResponse {
  reservations: CustomerReservation[];
  success: boolean;
}

type JsonObject = Record<string, unknown>;

const DEFAULT_API_BASE_URL = process.env.EXPO_PUBLIC_TIKPROFIL_API_URL ?? "https://tikprofil.com";

export function buildCustomerHeaders(accessToken: string): Record<string, string> {
  return {
    Accept: "application/json",
    Authorization: `Bearer ${accessToken}`
  };
}

export function mapCustomerApiError(status: number, payload: unknown): string {
  const code = payload && typeof payload === "object" && "code" in payload
    ? payload.code
    : null;

  if (status === 401 || code === "UNAUTHORIZED") {
    return "Oturumunuz sona erdi. Yeniden giriş yapın.";
  }
  if (status === 400 || code === "VALIDATION_ERROR") {
    return "Hesap bilgilerini kontrol edip tekrar deneyin.";
  }
  if (status === 409 || code === "CUSTOMER_RESOURCE_CONFLICT") {
    return "Bu hesap bilgisi başka bir kayıtla çakışıyor.";
  }
  return "Hesap bilgileri şu anda alınamıyor. Tekrar deneyin.";
}

export class CustomerApiError extends Error {
  readonly code: string | null;
  readonly payload: unknown;
  readonly status: number;

  constructor(status: number, payload: unknown) {
    super(mapCustomerApiError(status, payload));
    this.name = "CustomerApiError";
    this.status = status;
    this.payload = payload;
    this.code = payload && typeof payload === "object" && "code" in payload && typeof payload.code === "string"
      ? payload.code
      : null;
  }
}

function endpoint(baseUrl: string, path: string): string {
  return `${baseUrl.replace(/\/$/, "")}${path}`;
}

function isObject(value: unknown): value is JsonObject {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function decodeError(status: number, payload: unknown): CustomerApiError {
  return new CustomerApiError(status, { code: "INVALID_RESPONSE", response: payload });
}

function string(value: unknown): value is string {
  return typeof value === "string";
}

function nullableString(value: unknown): value is string | null {
  return value === null || string(value);
}

function finiteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function decodeAddress(value: unknown): CustomerAddress | null {
  if (!isObject(value)
    || !string(value.city)
    || !string(value.createdAt)
    || !string(value.district)
    || !string(value.fullAddress)
    || !string(value.id)
    || typeof value.isDefault !== "boolean"
    || !string(value.label)
    || !(value.latitude === null || finiteNumber(value.latitude))
    || !(value.longitude === null || finiteNumber(value.longitude))
    || !string(value.updatedAt)) return null;
  return {
    city: value.city,
    createdAt: value.createdAt,
    district: value.district,
    fullAddress: value.fullAddress,
    id: value.id,
    isDefault: value.isDefault,
    label: value.label,
    latitude: value.latitude,
    longitude: value.longitude,
    updatedAt: value.updatedAt
  };
}

function decodeProfile(value: unknown): CustomerProfile | null | undefined {
  if (value === null) return null;
  if (!isObject(value)
    || !string(value.appUserId)
    || !nullableString(value.avatarUrl)
    || !nullableString(value.birthDate)
    || !string(value.createdAt)
    || !nullableString(value.displayName)
    || !Array.isArray(value.hobbies)
    || !value.hobbies.every(string)
    || !nullableString(value.maritalStatus)
    || !nullableString(value.occupation)
    || !nullableString(value.phone)
    || !isObject(value.preferences)
    || !string(value.updatedAt)) return undefined;
  return {
    appUserId: value.appUserId,
    avatarUrl: value.avatarUrl,
    birthDate: value.birthDate,
    createdAt: value.createdAt,
    displayName: value.displayName,
    hobbies: value.hobbies,
    maritalStatus: value.maritalStatus,
    occupation: value.occupation,
    phone: value.phone,
    preferences: value.preferences,
    updatedAt: value.updatedAt
  };
}

function decodeProfileResponse(payload: JsonObject, status: number): ProfileResponse {
  const profile = decodeProfile(payload.profile);
  const addresses = Array.isArray(payload.addresses) ? payload.addresses.map(decodeAddress) : null;
  if (profile === undefined
    || !nullableString(payload.email)
    || !addresses
    || addresses.some((address) => address === null)) throw decodeError(status, payload);
  return {
    addresses: addresses.filter((address): address is CustomerAddress => address !== null),
    email: payload.email,
    profile,
    success: true
  };
}

function decodeOrder(value: unknown): CustomerOrder | null {
  if (!isObject(value)
    || !string(value.businessId)
    || !nullableString(value.businessName)
    || !string(value.createdAt)
    || !string(value.id)
    || !finiteNumber(value.itemCount)
    || !Number.isInteger(value.itemCount)
    || value.itemCount < 0
    || !nullableString(value.orderNumber)
    || (value.recordType !== "ecommerce" && value.recordType !== "fastfood")
    || !string(value.status)
    || !finiteNumber(value.total)) return null;
  return {
    businessId: value.businessId,
    businessName: value.businessName,
    createdAt: value.createdAt,
    id: value.id,
    itemCount: value.itemCount,
    orderNumber: value.orderNumber,
    recordType: value.recordType,
    status: value.status,
    total: value.total
  };
}

function decodeOrdersResponse(payload: JsonObject, status: number): OrdersResponse {
  const orders = Array.isArray(payload.orders) ? payload.orders.map(decodeOrder) : null;
  if (!orders || orders.some((order) => order === null)) throw decodeError(status, payload);
  return { orders: orders.filter((order): order is CustomerOrder => order !== null), success: true };
}

function decodeReservation(value: unknown): CustomerReservation | null {
  if (!isObject(value)
    || !string(value.businessId)
    || !string(value.createdAt)
    || !string(value.endDate)
    || !string(value.id)
    || (value.reservationType !== "hotel" && value.reservationType !== "vehicle")
    || !string(value.startDate)
    || !string(value.status)
    || !finiteNumber(value.total)) return null;
  return {
    businessId: value.businessId,
    createdAt: value.createdAt,
    endDate: value.endDate,
    id: value.id,
    reservationType: value.reservationType,
    startDate: value.startDate,
    status: value.status,
    total: value.total
  };
}

function decodeReservationsResponse(payload: JsonObject, status: number): ReservationsResponse {
  const reservations = Array.isArray(payload.reservations) ? payload.reservations.map(decodeReservation) : null;
  if (!reservations || reservations.some((reservation) => reservation === null)) throw decodeError(status, payload);
  return {
    reservations: reservations.filter((reservation): reservation is CustomerReservation => reservation !== null),
    success: true
  };
}

async function requestJson<T>(
  accessToken: string,
  path: string,
  decode: (payload: JsonObject, status: number) => T,
  options: RequestInit = {},
  baseUrl = DEFAULT_API_BASE_URL
): Promise<T> {
  const headers = {
    ...buildCustomerHeaders(accessToken),
    ...(options.body ? { "Content-Type": "application/json" } : {}),
    ...options.headers
  };
  const response = await fetch(endpoint(baseUrl, path), { ...options, headers });
  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok || (isObject(payload) && payload.success === false)) {
    throw new CustomerApiError(response.status, payload);
  }
  if (!isObject(payload) || payload.success !== true) throw decodeError(response.status, payload);
  return decode(payload, response.status);
}

export async function fetchCustomerAccount(
  accessToken: string,
  baseUrl = DEFAULT_API_BASE_URL
): Promise<CustomerAccount> {
  const [profile, orders, reservations] = await Promise.all([
    requestJson(accessToken, "/api/kesfet/user/profile", decodeProfileResponse, {}, baseUrl),
    requestJson(accessToken, "/api/kesfet/orders", decodeOrdersResponse, {}, baseUrl),
    requestJson(accessToken, "/api/kesfet/reservations", decodeReservationsResponse, {}, baseUrl)
  ]);

  return {
    addresses: profile.addresses,
    email: profile.email,
    orders: orders.orders,
    profile: profile.profile,
    reservations: reservations.reservations
  };
}

export async function saveCustomerProfile(
  accessToken: string,
  update: CustomerProfileUpdate,
  baseUrl = DEFAULT_API_BASE_URL
): Promise<Pick<CustomerAccount, "addresses" | "email" | "profile">> {
  const result = await requestJson<ProfileResponse>(
    accessToken,
    "/api/kesfet/user/profile",
    decodeProfileResponse,
    { body: JSON.stringify(update), method: "PUT" },
    baseUrl
  );
  return { addresses: result.addresses, email: result.email, profile: result.profile };
}
