import { randomUUID } from "node:crypto";

import type { QueryResultRow } from "pg";

import type {
    AppointmentOptions,
    AppointmentRecord,
    AppointmentSettings,
    AppointmentVertical,
    CreateOwnedAppointmentInput,
} from "../appointments/appointment-contract.ts";
import {
    AppointmentCanonicalDataError,
    AppointmentNotFoundError,
    AppointmentOverlapError,
    AppointmentTerminalStatusError,
} from "../appointments/appointment-errors.ts";
import { appointmentInstant, assertWithinWorkingHours } from "../appointments/appointment-validation.ts";

interface QueryResultLike<T extends QueryResultRow = QueryResultRow> {
    rowCount: number | null;
    rows: T[];
}

export type AppointmentQueryExecutor = (
    text: string,
    values?: readonly unknown[],
) => Promise<QueryResultLike>;

export type AppointmentTransactionRunner = <T>(
    operation: (execute: AppointmentQueryExecutor) => Promise<T>,
) => Promise<T>;

const ACTIVE_STATUSES = new Set(["pending", "confirmed"]);

function text(value: unknown, fallback = ""): string {
    return typeof value === "string" ? value : value == null ? fallback : String(value);
}

function nullableText(value: unknown): string | null {
    return value == null ? null : text(value);
}

function number(value: unknown): number {
    const parsed = typeof value === "number" ? value : Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
}

function dateOnly(value: unknown): string {
    const raw = text(value);
    return raw.includes("T") ? raw.slice(0, 10) : raw;
}

function iso(value: unknown): string {
    if (value instanceof Date) return value.toISOString();
    const parsed = new Date(text(value));
    return Number.isNaN(parsed.getTime()) ? text(value) : parsed.toISOString();
}

function mapRecord(row: QueryResultRow): AppointmentRecord {
    const status = text(row.status) as AppointmentRecord["status"];
    return {
        businessId: text(row.business_id),
        businessName: text(row.business_name),
        businessSlug: text(row.business_slug),
        cancellable: ACTIVE_STATUSES.has(status),
        createdAt: iso(row.created_at),
        endsAt: row.ends_at == null ? null : iso(row.ends_at),
        customerEmail: nullableText(row.customer_email),
        customerName: text(row.customer_name),
        customerPhone: text(row.customer_phone),
        date: dateOnly(row.date),
        id: text(row.id),
        note: nullableText(row.notes),
        serviceId: text(row.service_id),
        serviceName: text(row.service_name),
        servicePrice: number(row.service_price),
        staffId: text(row.staff_id),
        staffName: text(row.staff_name),
        status,
        startsAt: row.starts_at == null ? null : iso(row.starts_at),
        time: text(row.time_slot).slice(0, 5),
        vertical: row.vertical === "beauty" ? "beauty" : "clinic",
    };
}

function normalizeWorkingHours(value: unknown): AppointmentSettings["workingHours"] {
    const source = value && typeof value === "object" && !Array.isArray(value)
        ? value as Record<string, unknown>
        : {};
    const normalized: AppointmentSettings["workingHours"] = {};
    for (const [day, raw] of Object.entries(source)) {
        if (!raw || typeof raw !== "object" || Array.isArray(raw)) continue;
        const record = raw as Record<string, unknown>;
        const start = text(record.start);
        const end = text(record.end);
        if (!start || !end) continue;
        normalized[day] = {
            end,
            isOpen: record.isOpen === true || record.isActive === true,
            start,
        };
    }
    return normalized;
}

interface OccupiedAppointmentInterval {
    end: Date;
    staffId: string;
    start: Date;
}

export function generateAppointmentSlots(
    now: Date,
    settings: AppointmentSettings,
    services: readonly { durationMinutes: number; id: string }[],
    staffIds: readonly string[],
    occupied: readonly OccupiedAppointmentInterval[],
) {
    const slots: AppointmentOptions["slots"] = [];
    const days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
    for (let offset = 1; offset <= 14; offset += 1) {
        const day = new Date(now);
        day.setUTCDate(day.getUTCDate() + offset);
        const date = day.toISOString().slice(0, 10);
        const schedule = settings.workingHours[days[day.getUTCDay()]];
        if (!schedule?.isOpen) continue;
        const toMinutes = (value: string) => {
            const [hours, minutes] = value.split(":").map(Number);
            return hours * 60 + minutes;
        };
        const start = toMinutes(schedule.start);
        const end = toMinutes(schedule.end);
        for (const service of services) {
            for (const staffId of staffIds) {
                for (let minute = start; minute + service.durationMinutes <= end; minute += settings.slotMinutes) {
                    const time = `${String(Math.floor(minute / 60)).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")}`;
                    const candidateStart = appointmentInstant(date, time);
                    const candidateEnd = new Date(candidateStart.getTime() + service.durationMinutes * 60_000);
                    const overlaps = occupied.some((item) => item.staffId === staffId
                        && candidateStart.getTime() < item.end.getTime()
                        && candidateEnd.getTime() > item.start.getTime());
                    if (!overlaps) slots.push({ date, serviceId: service.id, staffId, time });
                }
            }
        }
    }
    return slots;
}

export function createAppointmentRepository(
    execute: AppointmentQueryExecutor,
    runTransaction: AppointmentTransactionRunner = async (operation) => operation(execute),
) {
    return {
        async listBusiness(
            vertical: AppointmentVertical,
            businessId: string,
            filters: Readonly<{ date?: string | null; status?: string | null }> = {},
        ): Promise<AppointmentRecord[]> {
            const table = vertical === "beauty" ? "beauty_appointments" : "clinic_appointments";
            const values: unknown[] = [businessId];
            const clauses = ["business_id = $1"];
            if (filters.status) {
                values.push(filters.status);
                clauses.push(`status = $${values.length}`);
            }
            if (filters.date) {
                values.push(filters.date);
                clauses.push(`date::date = $${values.length}::date`);
            }
            const result = await execute(`
                SELECT id, business_id, business_name, business_slug, customer_email, customer_name, customer_phone,
                       date, notes, service_id, service_name, service_price, staff_id, staff_name,
                       status, time_slot, starts_at, ends_at, created_at, '${vertical}' AS vertical
                FROM ${table}
                WHERE ${clauses.join(" AND ")}
                ORDER BY starts_at DESC, created_at DESC
                LIMIT 500
            `, values);
            return result.rows.map(mapRecord);
        },

        async updateBusinessStatus(
            vertical: AppointmentVertical,
            businessId: string,
            id: string,
            status: AppointmentRecord["status"],
            note?: string,
        ): Promise<AppointmentRecord> {
            const table = vertical === "beauty" ? "beauty_appointments" : "clinic_appointments";
            const result = await execute(`
                UPDATE ${table}
                SET status = $3, notes = CASE WHEN $4::text IS NULL THEN notes ELSE $4 END, updated_at = now()
                WHERE business_id = $1 AND id = $2
                RETURNING id, business_id, business_name, business_slug, customer_email, customer_name, customer_phone,
                          date, notes, service_id, service_name, service_price, staff_id, staff_name,
                          status, time_slot, starts_at, ends_at, created_at, '${vertical}' AS vertical
            `, [businessId, id, status, note ?? null]);
            if (!result.rows[0]) throw new AppointmentNotFoundError("Appointment not found for this business.");
            return mapRecord(result.rows[0]);
        },

        async getOptions(businessSlug: string, now: Date): Promise<AppointmentOptions> {
            const businessResult = await execute(`
                SELECT id, name, slug,
                       CASE
                         WHEN active_module = 'clinic' THEN 'clinic'
                         WHEN active_module = 'beauty' THEN 'beauty'
                         WHEN EXISTS (
                           SELECT 1 FROM business_modules bm WHERE bm.business_id = businesses.id AND bm.module_key = 'clinic' AND bm.is_enabled = true
                         ) THEN 'clinic'
                         WHEN EXISTS (
                           SELECT 1 FROM business_modules bm WHERE bm.business_id = businesses.id AND bm.module_key = 'beauty' AND bm.is_enabled = true
                         ) THEN 'beauty'
                         ELSE NULL
                       END AS vertical
                FROM businesses
                WHERE lower(slug) = lower($1)
                LIMIT 1
            `, [businessSlug]);
            const business = businessResult.rows[0];
            const vertical = business?.vertical as AppointmentVertical | undefined;
            if (!business || (vertical !== "clinic" && vertical !== "beauty")) {
                return { nativeEnabled: false, services: [], settings: null, slots: [], staff: [], vertical: null };
            }

            const [servicesResult, staffResult, settingsResult, occupiedResult] = await Promise.all([
                execute(`SELECT id, name, description, COALESCE(duration_minutes, 30) AS duration_minutes,
                                COALESCE(price, 0) AS price
                         FROM ${vertical}_services WHERE business_id = $1 AND is_active = true
                         ORDER BY COALESCE(sort_order, 0), name`, [business.id]),
                execute(`SELECT id, name, title FROM ${vertical}_staff
                         WHERE business_id = $1 AND is_active = true ORDER BY name`, [business.id]),
                execute(`SELECT working_hours
                         FROM ${vertical}_settings WHERE business_id = $1 LIMIT 1`, [business.id]),
                execute(`SELECT starts_at, ends_at, staff_id FROM ${vertical}_appointments
                         WHERE business_id = $1 AND status IN ('pending', 'confirmed')
                           AND starts_at >= now() AND starts_at < now() + interval '15 days'`, [business.id]),
            ]);
            const settingsRow = settingsResult.rows[0];
            const settings: AppointmentSettings = {
                requireEmail: false,
                requirePhone: true,
                slotMinutes: 30,
                workingHours: normalizeWorkingHours(settingsRow?.working_hours),
            };
            const services = servicesResult.rows.map((row) => ({
                currency: "TRY",
                description: nullableText(row.description),
                durationMinutes: Math.max(5, Math.trunc(number(row.duration_minutes) || 30)),
                id: text(row.id),
                name: text(row.name),
                price: number(row.price),
            }));
            const staff = staffResult.rows.map((row) => ({ id: text(row.id), name: text(row.name), title: nullableText(row.title) }));
            const occupied = occupiedResult.rows.map((row) => ({
                end: new Date(text(row.ends_at)),
                staffId: text(row.staff_id),
                start: new Date(text(row.starts_at)),
            })).filter((item) => !Number.isNaN(item.start.getTime()) && !Number.isNaN(item.end.getTime()));
            const slots = generateAppointmentSlots(now, settings, services, staff.map((item) => item.id), occupied);
            return {
                nativeEnabled: services.length > 0 && staff.length > 0 && slots.length > 0,
                services,
                settings,
                slots,
                staff,
                vertical,
            };
        },

        async listOwned(appUserId: string): Promise<AppointmentRecord[]> {
            const result = await execute(`
                SELECT id, business_id, business_name, business_slug, customer_email, customer_name, customer_phone,
                       date, notes, service_id, service_name, service_price, staff_id, staff_name,
                       status, time_slot, created_at, 'clinic' AS vertical
                FROM clinic_appointments WHERE app_user_id = $1
                UNION ALL
                SELECT id, business_id, business_name, business_slug, customer_email, customer_name, customer_phone,
                       date, notes, service_id, service_name, service_price, staff_id, staff_name,
                       status, time_slot, created_at, 'beauty' AS vertical
                FROM beauty_appointments WHERE app_user_id = $1
                ORDER BY created_at DESC LIMIT 200
            `, [appUserId]);
            return result.rows.map(mapRecord);
        },

        async createOwned(input: CreateOwnedAppointmentInput): Promise<AppointmentRecord> {
            try {
                return await runTransaction(async (transaction) => {
                    const id = randomUUID();
                    const startsAt = appointmentInstant(input.date, input.time);
                    const preflight = await transaction(`
                        WITH business_context AS (
                            SELECT b.id,
                                   CASE
                                     WHEN b.active_module = 'clinic' THEN 'clinic'
                                     WHEN b.active_module = 'beauty' THEN 'beauty'
                                     WHEN EXISTS (SELECT 1 FROM business_modules bm WHERE bm.business_id = b.id AND bm.module_key = 'clinic' AND bm.is_enabled = true) THEN 'clinic'
                                     WHEN EXISTS (SELECT 1 FROM business_modules bm WHERE bm.business_id = b.id AND bm.module_key = 'beauty' AND bm.is_enabled = true) THEN 'beauty'
                                   END AS vertical
                            FROM businesses b WHERE lower(b.slug) = lower($1) LIMIT 1
                        )
                        SELECT COALESCE(s.duration_minutes, 30) AS duration_minutes, cfg.working_hours
                        FROM business_context b
                        JOIN clinic_services s ON b.vertical = 'clinic' AND s.business_id = b.id AND s.id = $2 AND s.is_active = true
                        JOIN clinic_staff st ON st.business_id = b.id AND st.id = $3 AND st.is_active = true
                        LEFT JOIN clinic_settings cfg ON cfg.business_id = b.id
                        UNION ALL
                        SELECT COALESCE(s.duration_minutes, 30), cfg.working_hours
                        FROM business_context b
                        JOIN beauty_services s ON b.vertical = 'beauty' AND s.business_id = b.id AND s.id = $2 AND s.is_active = true
                        JOIN beauty_staff st ON st.business_id = b.id AND st.id = $3 AND st.is_active = true
                        LEFT JOIN beauty_settings cfg ON cfg.business_id = b.id
                        LIMIT 1
                    `, [input.businessSlug, input.serviceId, input.staffId]);
                    if (preflight.rows[0]) {
                        assertWithinWorkingHours(
                            input.date,
                            input.time,
                            Math.max(5, Math.trunc(number(preflight.rows[0].duration_minutes) || 30)),
                            normalizeWorkingHours(preflight.rows[0].working_hours),
                        );
                    }
                    const result = await transaction(`
                        WITH business_context AS (
                            SELECT b.id, b.name, b.slug,
                                   CASE
                                     WHEN b.active_module = 'clinic' THEN 'clinic'
                                     WHEN b.active_module = 'beauty' THEN 'beauty'
                                     WHEN EXISTS (
                                       SELECT 1 FROM business_modules bm WHERE bm.business_id = b.id AND bm.module_key = 'clinic' AND bm.is_enabled = true
                                     ) THEN 'clinic'
                                     WHEN EXISTS (
                                       SELECT 1 FROM business_modules bm WHERE bm.business_id = b.id AND bm.module_key = 'beauty' AND bm.is_enabled = true
                                     ) THEN 'beauty'
                                   END AS vertical
                            FROM businesses b WHERE lower(b.slug) = lower($2) LIMIT 1
                        ), option_context AS (
                            SELECT c.*, s.id AS service_id, s.name AS service_name,
                                   COALESCE(s.price, 0) AS service_price,
                                   COALESCE(s.duration_minutes, 30) AS duration_minutes,
                                   st.id AS staff_id, st.name AS staff_name,
                                   cfg.working_hours
                            FROM business_context c
                            JOIN clinic_services s ON c.vertical = 'clinic' AND s.business_id = c.id AND s.id = $3 AND s.is_active = true
                            JOIN clinic_staff st ON st.business_id = c.id AND st.id = $4 AND st.is_active = true
                            LEFT JOIN clinic_settings cfg ON cfg.business_id = c.id
                            UNION ALL
                            SELECT c.*, s.id, s.name, COALESCE(s.price, 0), COALESCE(s.duration_minutes, 30),
                                   st.id, st.name, cfg.working_hours
                            FROM business_context c
                            JOIN beauty_services s ON c.vertical = 'beauty' AND s.business_id = c.id AND s.id = $3 AND s.is_active = true
                            JOIN beauty_staff st ON st.business_id = c.id AND st.id = $4 AND st.is_active = true
                            LEFT JOIN beauty_settings cfg ON cfg.business_id = c.id
                        ), clinic_insert AS (
                            INSERT INTO clinic_appointments (
                                id, app_user_id, business_id, business_name, business_slug,
                                service_id, service_name, service_price, staff_id, staff_name,
                                customer_name, customer_phone, customer_email, date, time_slot,
                                starts_at, ends_at, status, notes, idempotency_key
                            )
                            SELECT $5, $1, id, name, slug, service_id, service_name, service_price,
                                   staff_id, staff_name, $6, $7, $8, $9::date, $10,
                                   $11::timestamptz, $11::timestamptz + make_interval(mins => duration_minutes),
                                   'pending', $12, $13
                            FROM option_context WHERE vertical = 'clinic'
                            ON CONFLICT (app_user_id, idempotency_key)
                            WHERE app_user_id IS NOT NULL AND idempotency_key IS NOT NULL DO NOTHING
                            RETURNING *, 'clinic' AS vertical
                        ), beauty_insert AS (
                            INSERT INTO beauty_appointments (
                                id, app_user_id, business_id, business_name, business_slug,
                                service_id, service_name, service_price, staff_id, staff_name,
                                customer_name, customer_phone, customer_email, date, time_slot,
                                starts_at, ends_at, status, notes, idempotency_key
                            )
                            SELECT $5, $1, id, name, slug, service_id, service_name, service_price,
                                   staff_id, staff_name, $6, $7, $8, $9::date, $10,
                                   $11::timestamptz, $11::timestamptz + make_interval(mins => duration_minutes),
                                   'pending', $12, $13
                            FROM option_context WHERE vertical = 'beauty'
                            ON CONFLICT (app_user_id, idempotency_key)
                            WHERE app_user_id IS NOT NULL AND idempotency_key IS NOT NULL DO NOTHING
                            RETURNING *, 'beauty' AS vertical
                        )
                        SELECT id, business_id, business_name, business_slug, customer_email, customer_name, customer_phone,
                               date, notes, service_id, service_name, service_price, staff_id, staff_name,
                               status, time_slot, created_at, vertical FROM clinic_insert
                        UNION ALL
                        SELECT id, business_id, business_name, business_slug, customer_email, customer_name, customer_phone,
                               date, notes, service_id, service_name, service_price, staff_id, staff_name,
                               status, time_slot, created_at, vertical FROM beauty_insert
                    `, [
                        input.appUserId, input.businessSlug, input.serviceId, input.staffId, id,
                        input.customerName, input.customerPhone, input.customerEmail, input.date,
                        input.time, startsAt.toISOString(), input.note, input.idempotencyKey,
                    ]);
                    if (result.rows[0]) return mapRecord(result.rows[0]);

                    const existing = await transaction(`
                        SELECT id, business_id, business_name, business_slug, customer_email, customer_name, customer_phone,
                               date, notes, service_id, service_name, service_price, staff_id, staff_name,
                               status, time_slot, created_at, 'clinic' AS vertical FROM clinic_appointments
                        WHERE app_user_id = $1 AND idempotency_key = $2
                        UNION ALL
                        SELECT id, business_id, business_name, business_slug, customer_email, customer_name, customer_phone,
                               date, notes, service_id, service_name, service_price, staff_id, staff_name,
                               status, time_slot, created_at, 'beauty' AS vertical FROM beauty_appointments
                        WHERE app_user_id = $1 AND idempotency_key = $2
                        LIMIT 1
                    `, [input.appUserId, input.idempotencyKey]);
                    if (existing.rows[0]) return mapRecord(existing.rows[0]);
                    throw new AppointmentCanonicalDataError("Business, service, staff, or appointment settings are unavailable.");
                });
            } catch (error) {
                if (error && typeof error === "object" && "code" in error && error.code === "23P01") {
                    throw new AppointmentOverlapError();
                }
                throw error;
            }
        },

        async cancelOwned(appUserId: string, id: string): Promise<AppointmentRecord> {
            const updated = await execute(`
                WITH clinic_update AS (
                    UPDATE clinic_appointments SET status = 'cancelled', updated_at = now()
                    WHERE id = $2 AND app_user_id = $1 AND status IN ('pending', 'confirmed')
                    RETURNING *, 'clinic' AS vertical
                ), beauty_update AS (
                    UPDATE beauty_appointments SET status = 'cancelled', updated_at = now()
                    WHERE id = $2 AND app_user_id = $1 AND status IN ('pending', 'confirmed')
                    RETURNING *, 'beauty' AS vertical
                )
                SELECT id, business_id, business_name, business_slug, customer_email, customer_name, customer_phone,
                       date, notes, service_id, service_name, service_price, staff_id, staff_name,
                       status, time_slot, created_at, vertical FROM clinic_update
                UNION ALL
                SELECT id, business_id, business_name, business_slug, customer_email, customer_name, customer_phone,
                       date, notes, service_id, service_name, service_price, staff_id, staff_name,
                       status, time_slot, created_at, vertical FROM beauty_update
            `, [appUserId, id]);
            if (updated.rows[0]) return mapRecord(updated.rows[0]);

            const existing = await execute(`
                SELECT status FROM clinic_appointments WHERE id = $2 AND app_user_id = $1
                UNION ALL
                SELECT status FROM beauty_appointments WHERE id = $2 AND app_user_id = $1
                LIMIT 1
            `, [appUserId, id]);
            if (!existing.rows[0]) throw new AppointmentNotFoundError();
            throw new AppointmentTerminalStatusError();
        },
    };
}

const defaultExecutor: AppointmentQueryExecutor = async (queryText, values) => {
    const { query } = await import("../db/query.ts");
    return query<QueryResultRow>(queryText, values);
};

const defaultTransactionRunner: AppointmentTransactionRunner = async (operation) => {
    const { getPostgresPool } = await import("../db/postgres.ts");
    const client = await getPostgresPool().connect();
    const transactionExecutor: AppointmentQueryExecutor = (queryText, values) =>
        client.query(queryText, values ? [...values] : undefined);
    try {
        await client.query("BEGIN");
        const result = await operation(transactionExecutor);
        await client.query("COMMIT");
        return result;
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
};

export const appointmentRepository = createAppointmentRepository(defaultExecutor, defaultTransactionRunner);
export type AppointmentRepository = ReturnType<typeof createAppointmentRepository>;

export {
    AppointmentNotFoundError,
    AppointmentOverlapError,
    AppointmentTerminalStatusError,
};
