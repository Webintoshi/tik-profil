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

async function requestJson<T>(
  accessToken: string,
  path: string,
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
  if (!response.ok || !payload || typeof payload !== "object" || !("success" in payload) || !payload.success) {
    throw new CustomerApiError(response.status, payload);
  }
  return payload as T;
}

export async function fetchCustomerAccount(
  accessToken: string,
  baseUrl = DEFAULT_API_BASE_URL
): Promise<CustomerAccount> {
  const [profile, orders, reservations] = await Promise.all([
    requestJson<ProfileResponse>(accessToken, "/api/kesfet/user/profile", {}, baseUrl),
    requestJson<OrdersResponse>(accessToken, "/api/kesfet/orders", {}, baseUrl),
    requestJson<ReservationsResponse>(accessToken, "/api/kesfet/reservations", {}, baseUrl)
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
    { body: JSON.stringify(update), method: "PUT" },
    baseUrl
  );
  return { addresses: result.addresses, email: result.email, profile: result.profile };
}
