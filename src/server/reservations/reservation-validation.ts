import { z } from "zod";

import type { ReservationAvailabilityInput, ReservationVertical } from "./reservation-contract.ts";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const RFC3339_PATTERN = /^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d(?:\.\d{1,3})?)?(?:Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)$/;
const VEHICLE_ALIASES = new Set(["rental", "vehicle", "vehicle-rental"]);

function isCalendarDate(value: string): boolean {
    if (!DATE_PATTERN.test(value)) return false;
    const [year, month, day] = value.split("-").map(Number);
    const candidate = new Date(0);
    candidate.setUTCHours(0, 0, 0, 0);
    candidate.setUTCFullYear(year, month - 1, day);
    return candidate.getUTCFullYear() === year
        && candidate.getUTCMonth() === month - 1
        && candidate.getUTCDate() === day;
}

function normalizeVertical(value: unknown): ReservationVertical | unknown {
    if (typeof value !== "string") return value;
    const normalized = value.trim().toLowerCase();
    return VEHICLE_ALIASES.has(normalized) ? "vehicle" : normalized;
}

const commonSchema = z.object({
    businessSlug: z.string().trim().min(1).max(200),
    customerEmail: z.string().trim().email().max(254).nullable().optional(),
    customerName: z.string().trim().min(2).max(120),
    customerPhone: z.string().trim().min(7).max(30),
    idempotencyKey: z.string().trim().min(8).max(128).regex(/^[A-Za-z0-9._:-]+$/),
    note: z.string().trim().max(500).nullable().optional(),
    resourceId: z.string().trim().min(1).max(200),
});

const dateOnlySchema = z.string().regex(DATE_PATTERN).refine(isCalendarDate, "Must be a real calendar date");
const dateTimeSchema = z.string().regex(RFC3339_PATTERN).refine((value) => Number.isFinite(Date.parse(value)), "Must be a valid RFC3339 datetime");

const createSchema = z.preprocess(
    (value) => value && typeof value === "object" && !Array.isArray(value)
        ? { ...(value as Record<string, unknown>), vertical: normalizeVertical((value as Record<string, unknown>).vertical) }
        : value,
    z.discriminatedUnion("vertical", [
        commonSchema.extend({
            endDate: dateTimeSchema,
            partySize: z.number().int().min(1).max(100),
            startDate: dateTimeSchema,
            vertical: z.literal("restaurant"),
        }),
        commonSchema.extend({
            endDate: dateOnlySchema,
            partySize: z.number().int().min(1).max(50).optional(),
            startDate: dateOnlySchema,
            vertical: z.literal("hotel"),
        }),
        commonSchema.extend({
            endDate: dateOnlySchema,
            partySize: z.undefined().optional(),
            startDate: dateOnlySchema,
            vertical: z.literal("vehicle"),
        }),
    ]),
);

export type ReservationCreateInput = z.infer<typeof createSchema>;

function assertRange(vertical: ReservationVertical, startDate: string, endDate: string, now: Date): void {
    const start = Date.parse(DATE_PATTERN.test(startDate) ? `${startDate}T00:00:00Z` : startDate);
    const end = Date.parse(DATE_PATTERN.test(endDate) ? `${endDate}T00:00:00Z` : endDate);
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
        throw new z.ZodError([{ code: "custom", message: "Reservation end must be after start", path: ["endDate"] }]);
    }
    const today = now.toISOString().slice(0, 10);
    if (vertical === "restaurant" ? start <= now.getTime() : startDate < today) {
        throw new z.ZodError([{ code: "custom", message: "Reservation must not be in the past", path: ["startDate"] }]);
    }
}

export function parseReservationCreateInput(value: unknown, now = new Date()): ReservationCreateInput {
    const parsed = createSchema.parse(value);
    assertRange(parsed.vertical, parsed.startDate, parsed.endDate, now);
    return parsed;
}

export function parseReservationAvailabilityInput(searchParams: URLSearchParams): ReservationAvailabilityInput {
    const vertical = normalizeVertical(searchParams.get("vertical"));
    const base = {
        businessSlug: searchParams.get("businessSlug"),
        endDate: searchParams.get("endDate"),
        resourceId: searchParams.get("resourceId"),
        startDate: searchParams.get("startDate"),
        vertical,
    };
    const schema = z.discriminatedUnion("vertical", [
        z.object({ businessSlug: z.string().trim().min(1).max(200), endDate: dateTimeSchema, resourceId: z.string().trim().min(1).max(200), startDate: dateTimeSchema, vertical: z.literal("restaurant") }),
        z.object({ businessSlug: z.string().trim().min(1).max(200), endDate: dateOnlySchema, resourceId: z.string().trim().min(1).max(200), startDate: dateOnlySchema, vertical: z.literal("hotel") }),
        z.object({ businessSlug: z.string().trim().min(1).max(200), endDate: dateOnlySchema, resourceId: z.string().trim().min(1).max(200), startDate: dateOnlySchema, vertical: z.literal("vehicle") }),
    ]);
    const parsed = schema.parse(base);
    assertRange(parsed.vertical, parsed.startDate, parsed.endDate, new Date(0));
    return parsed;
}
