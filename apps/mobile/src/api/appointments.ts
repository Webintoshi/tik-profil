const DEFAULT_API_BASE_URL = process.env.EXPO_PUBLIC_TIKPROFIL_API_URL ?? "https://tikprofil.com";

export class AppointmentApiError extends Error {
  readonly payload: unknown;
  readonly status: number;

  constructor(status: number, payload: unknown, message: string) {
    super(message);
    this.name = "AppointmentApiError";
    this.payload = payload;
    this.status = status;
  }
}

export type AppointmentVertical = "beauty" | "clinic";
export type AppointmentStatus = "cancelled" | "completed" | "confirmed" | "pending" | "rejected";

export interface AppointmentServiceOption {
  currency: string;
  description: string | null;
  durationMinutes: number;
  id: string;
  name: string;
  price: number;
}

export interface AppointmentStaffOption {
  id: string;
  name: string;
  title: string | null;
}

export interface AppointmentSlotOption {
  date: string;
  serviceId: string;
  staffId: string;
  time: string;
}

export interface AppointmentOptions {
  nativeEnabled: boolean;
  services: AppointmentServiceOption[];
  settings: {
    requireEmail: boolean;
    requirePhone: boolean;
    slotMinutes: number;
    workingHours: Record<string, { end: string; isOpen: boolean; start: string }>;
  } | null;
  slots: AppointmentSlotOption[];
  staff: AppointmentStaffOption[];
  vertical: AppointmentVertical | null;
}

export interface CustomerAppointment {
  businessName: string;
  businessSlug: string;
  cancellable: boolean;
  createdAt: string;
  customerEmail: string | null;
  customerName: string;
  customerPhone: string;
  date: string;
  id: string;
  note: string | null;
  serviceId: string;
  serviceName: string;
  servicePrice: number;
  staffId: string;
  staffName: string;
  status: AppointmentStatus;
  time: string;
  vertical: AppointmentVertical;
}

export interface CreateAppointmentInput {
  businessSlug: string;
  customerEmail?: string | null;
  customerName: string;
  customerPhone: string;
  date: string;
  idempotencyKey: string;
  note?: string | null;
  serviceId: string;
  staffId: string;
  time: string;
}

const DISABLED_OPTIONS: AppointmentOptions = {
  nativeEnabled: false,
  services: [],
  settings: null,
  slots: [],
  staff: [],
  vertical: null
};

function endpoint(baseUrl: string, path: string) {
  return `${baseUrl.replace(/\/$/, "")}${path}`;
}

function object(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function string(value: unknown): value is string {
  return typeof value === "string";
}

function nullableString(value: unknown): value is string | null {
  return value === null || string(value);
}

function number(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function decodeService(value: unknown): AppointmentServiceOption | null {
  if (!object(value) || !string(value.id) || !string(value.name) || !nullableString(value.description)
    || !number(value.durationMinutes) || !Number.isInteger(value.durationMinutes) || value.durationMinutes <= 0
    || !number(value.price) || !string(value.currency)) return null;
  return {
    currency: value.currency,
    description: value.description,
    durationMinutes: value.durationMinutes,
    id: value.id,
    name: value.name,
    price: value.price
  };
}

function decodeStaff(value: unknown): AppointmentStaffOption | null {
  if (!object(value) || !string(value.id) || !string(value.name) || !nullableString(value.title)) return null;
  return { id: value.id, name: value.name, title: value.title };
}

function decodeSlot(value: unknown): AppointmentSlotOption | null {
  if (!object(value) || !string(value.date) || !string(value.serviceId) || !string(value.staffId) || !string(value.time)) return null;
  return { date: value.date, serviceId: value.serviceId, staffId: value.staffId, time: value.time };
}

function decodeSettings(value: unknown): AppointmentOptions["settings"] | undefined {
  if (value === null) return null;
  if (!object(value) || typeof value.requireEmail !== "boolean" || typeof value.requirePhone !== "boolean"
    || !number(value.slotMinutes) || !Number.isInteger(value.slotMinutes) || !object(value.workingHours)) return undefined;
  const workingHours: NonNullable<AppointmentOptions["settings"]>["workingHours"] = {};
  for (const [day, raw] of Object.entries(value.workingHours)) {
    if (!object(raw) || !string(raw.start) || !string(raw.end) || typeof raw.isOpen !== "boolean") return undefined;
    workingHours[day] = { end: raw.end, isOpen: raw.isOpen, start: raw.start };
  }
  return { requireEmail: value.requireEmail, requirePhone: value.requirePhone, slotMinutes: value.slotMinutes, workingHours };
}

function decodeOptions(value: unknown): AppointmentOptions | null {
  if (!object(value) || typeof value.nativeEnabled !== "boolean"
    || (value.vertical !== "clinic" && value.vertical !== "beauty" && value.vertical !== null)
    || !Array.isArray(value.services) || !Array.isArray(value.staff) || !Array.isArray(value.slots)) return null;
  const services = value.services.map(decodeService);
  const staff = value.staff.map(decodeStaff);
  const slots = value.slots.map(decodeSlot);
  const settings = decodeSettings(value.settings);
  if (services.some((item) => !item) || staff.some((item) => !item) || slots.some((item) => !item) || settings === undefined) return null;
  return {
    nativeEnabled: value.nativeEnabled,
    services: services.filter((item): item is AppointmentServiceOption => Boolean(item)),
    settings,
    slots: slots.filter((item): item is AppointmentSlotOption => Boolean(item)),
    staff: staff.filter((item): item is AppointmentStaffOption => Boolean(item)),
    vertical: value.vertical
  };
}

function decodeAppointment(value: unknown): CustomerAppointment | null {
  if (!object(value) || !string(value.businessName) || !string(value.businessSlug) || typeof value.cancellable !== "boolean"
    || !string(value.createdAt) || !nullableString(value.customerEmail) || !string(value.customerName)
    || !string(value.customerPhone) || !string(value.date) || !string(value.id) || !nullableString(value.note)
    || !string(value.serviceId) || !string(value.serviceName) || !number(value.servicePrice) || !string(value.staffId)
    || !string(value.staffName) || !["cancelled", "completed", "confirmed", "pending", "rejected"].includes(String(value.status))
    || !string(value.time) || (value.vertical !== "clinic" && value.vertical !== "beauty")) return null;
  return value as unknown as CustomerAppointment;
}

async function jsonRequest(path: string, init: RequestInit, baseUrl: string) {
  const response = await fetch(endpoint(baseUrl, path), init);
  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok || !object(payload) || payload.success !== true) {
    const message = object(payload) && string(payload.error) ? payload.error : "Randevu işlemi tamamlanamadı.";
    throw new AppointmentApiError(response.status, payload, message);
  }
  return payload;
}

export async function fetchAppointmentOptions(businessSlug: string, baseUrl = DEFAULT_API_BASE_URL): Promise<AppointmentOptions> {
  try {
    const payload = await jsonRequest(`/api/kesfet/appointments/options?businessSlug=${encodeURIComponent(businessSlug)}`, {}, baseUrl);
    return decodeOptions(payload) ?? DISABLED_OPTIONS;
  } catch {
    return DISABLED_OPTIONS;
  }
}

function authenticated(accessToken: string, options: RequestInit = {}): RequestInit {
  return {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers
    }
  };
}

export async function createAppointment(accessToken: string, input: CreateAppointmentInput, baseUrl = DEFAULT_API_BASE_URL) {
  const payload = await jsonRequest("/api/kesfet/appointments", authenticated(accessToken, {
    body: JSON.stringify(input), method: "POST"
  }), baseUrl);
  const appointment = decodeAppointment(payload.appointment);
  if (!appointment) throw new AppointmentApiError(200, { code: "INVALID_RESPONSE", response: payload }, "Randevu yanıtı doğrulanamadı.");
  return appointment;
}

export async function fetchAppointments(accessToken: string, baseUrl = DEFAULT_API_BASE_URL) {
  const payload = await jsonRequest("/api/kesfet/appointments", authenticated(accessToken), baseUrl);
  if (!Array.isArray(payload.appointments)) throw new AppointmentApiError(200, { code: "INVALID_RESPONSE", response: payload }, "Randevu geçmişi doğrulanamadı.");
  const appointments = payload.appointments.map(decodeAppointment);
  if (appointments.some((item) => !item)) throw new AppointmentApiError(200, { code: "INVALID_RESPONSE", response: payload }, "Randevu geçmişi doğrulanamadı.");
  return appointments.filter((item): item is CustomerAppointment => Boolean(item));
}

export async function cancelAppointment(accessToken: string, id: string, baseUrl = DEFAULT_API_BASE_URL) {
  const payload = await jsonRequest("/api/kesfet/appointments", authenticated(accessToken, {
    body: JSON.stringify({ id }), method: "PATCH"
  }), baseUrl);
  const appointment = decodeAppointment(payload.appointment);
  if (!appointment) throw new AppointmentApiError(200, { code: "INVALID_RESPONSE", response: payload }, "Randevu yanıtı doğrulanamadı.");
  return appointment;
}
