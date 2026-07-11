import { z } from "zod";

import type { AppointmentWorkingHours } from "./appointment-contract.ts";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
const ISTANBUL_OFFSET = "+03:00";
const DAY_KEYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"] as const;

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

export function appointmentInstant(date: string, time: string): Date {
    return new Date(`${date}T${time}:00${ISTANBUL_OFFSET}`);
}

const createSchema = z.object({
    businessSlug: z.string().trim().min(1).max(200),
    customerEmail: z.string().trim().email().max(254).nullable().optional(),
    customerName: z.string().trim().min(2).max(120),
    customerPhone: z.string().trim().min(7).max(30),
    date: z.string().regex(DATE_PATTERN).refine(isCalendarDate, "Appointment date must be a real calendar date"),
    idempotencyKey: z.string().trim().min(8).max(128).regex(/^[A-Za-z0-9._:-]+$/),
    note: z.string().trim().max(500).nullable().optional(),
    serviceId: z.string().trim().min(1).max(200),
    staffId: z.string().trim().min(1).max(200),
    time: z.string().regex(TIME_PATTERN),
});

export type AppointmentCreateInput = z.infer<typeof createSchema>;

export function parseAppointmentCreateInput(value: unknown, now = new Date()): AppointmentCreateInput {
    const parsed = createSchema.parse(value);
    if (appointmentInstant(parsed.date, parsed.time).getTime() <= now.getTime()) {
        throw new z.ZodError([{
            code: "custom",
            message: "Appointment must be in the future",
            path: ["date"],
        }]);
    }
    return parsed;
}

export function assertWithinWorkingHours(
    date: string,
    time: string,
    durationMinutes: number,
    workingHours: AppointmentWorkingHours,
): void {
    if (!isCalendarDate(date) || !TIME_PATTERN.test(time) || !Number.isInteger(durationMinutes) || durationMinutes <= 0) {
        throw new z.ZodError([{ code: "custom", message: "Invalid appointment time", path: ["time"] }]);
    }

    const day = DAY_KEYS[appointmentInstant(date, "12:00").getUTCDay()];
    const schedule = workingHours[day];
    if (!schedule?.isOpen || !TIME_PATTERN.test(schedule.start) || !TIME_PATTERN.test(schedule.end)) {
        throw new z.ZodError([{ code: "custom", message: "Business is closed", path: ["date"] }]);
    }

    const toMinutes = (value: string) => {
        const [hours, minutes] = value.split(":").map(Number);
        return hours * 60 + minutes;
    };
    const start = toMinutes(time);
    if (start < toMinutes(schedule.start) || start + durationMinutes > toMinutes(schedule.end)) {
        throw new z.ZodError([{ code: "custom", message: "Appointment is outside working hours", path: ["time"] }]);
    }
}
