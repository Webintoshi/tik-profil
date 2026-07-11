import { randomUUID } from "node:crypto";

import type { QueryResultRow } from "pg";

import type {
    CreateOwnedReservationInput,
    ReservationAvailability,
    ReservationAvailabilityInput,
    ReservationOptions,
    ReservationRecord,
    ReservationStatus,
    ReservationVertical,
} from "../reservations/reservation-contract.ts";
import { DISABLED_RESERVATION_OPTIONS } from "../reservations/reservation-contract.ts";
import {
    ReservationCanonicalDataError,
    ReservationConflictError,
    ReservationNotFoundError,
    ReservationTerminalStatusError,
} from "../reservations/reservation-errors.ts";

interface QueryResultLike<T extends QueryResultRow = QueryResultRow> {
    rowCount: number | null;
    rows: T[];
}

export type ReservationQueryExecutor = (
    text: string,
    values?: readonly unknown[],
) => Promise<QueryResultLike>;

export type ReservationTransactionRunner = <T>(
    operation: (execute: ReservationQueryExecutor) => Promise<T>,
) => Promise<T>;

const ACTIVE_STATUSES = new Set<ReservationStatus>(["pending", "confirmed"]);
const TERMINAL_STATUSES = new Set<ReservationStatus>(["cancelled", "completed", "rejected"]);

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

function integer(value: unknown, fallback = 0): number {
    const parsed = Math.trunc(number(value));
    return Number.isFinite(parsed) ? parsed : fallback;
}

function iso(value: unknown): string {
    if (value instanceof Date) return value.toISOString();
    const parsed = new Date(text(value));
    return Number.isNaN(parsed.getTime()) ? text(value) : parsed.toISOString();
}

function dateValue(value: unknown): string {
    const raw = value instanceof Date ? value.toISOString() : text(value);
    return raw.includes("T") ? raw.slice(0, 10) : raw;
}

function mapRecord(row: QueryResultRow): ReservationRecord {
    const vertical = row.vertical === "restaurant" ? "restaurant" : row.vertical === "vehicle" ? "vehicle" : "hotel";
    const status = text(row.status) as ReservationStatus;
    return {
        businessId: text(row.business_id),
        businessName: text(row.business_name),
        businessSlug: text(row.business_slug),
        cancellable: ACTIVE_STATUSES.has(status),
        createdAt: iso(row.created_at),
        customerEmail: nullableText(row.customer_email),
        customerName: text(row.customer_name),
        customerPhone: text(row.customer_phone),
        endDate: vertical === "restaurant" ? iso(row.end_date) : dateValue(row.end_date),
        id: text(row.id),
        note: nullableText(row.note),
        partySize: row.party_size == null ? null : integer(row.party_size),
        reservationType: vertical,
        resourceId: text(row.resource_id),
        resourceName: text(row.resource_name),
        startDate: vertical === "restaurant" ? iso(row.start_date) : dateValue(row.start_date),
        status,
        total: number(row.total),
        unitPrice: number(row.unit_price),
    };
}

function moduleBusinessQuery(): string {
    return `
        SELECT business.id, business.name, business.slug,
               CASE
                 WHEN business.active_module = 'restaurant' THEN 'restaurant'
                 WHEN business.active_module = 'hotel' THEN 'hotel'
                 WHEN business.active_module IN ('rental', 'vehicle-rental') THEN 'vehicle'
                 WHEN EXISTS (
                   SELECT 1 FROM business_modules module
                   WHERE module.business_id = business.id AND module.module_key = 'restaurant' AND module.is_enabled = true
                 ) THEN 'restaurant'
                 WHEN EXISTS (
                   SELECT 1 FROM business_modules module
                   WHERE module.business_id = business.id AND module.module_key = 'hotel' AND module.is_enabled = true
                 ) THEN 'hotel'
                 WHEN EXISTS (
                   SELECT 1 FROM business_modules module
                   WHERE module.business_id = business.id AND module.module_key IN ('rental', 'vehicle-rental') AND module.is_enabled = true
                 ) THEN 'vehicle'
                 ELSE NULL
               END AS vertical
        FROM businesses business
        WHERE lower(business.slug) = lower($1)
        LIMIT 1
    `;
}

function resourceOptionsQuery(vertical: ReservationVertical): string {
    if (vertical === "restaurant") {
        return `
            SELECT resource.id, resource.name, resource.description, resource.image_url,
                   resource.capacity, resource.unit_price, resource.time_slots
            FROM restaurant_reservation_resources resource
            WHERE resource.business_id = $1 AND resource.is_active = true
            ORDER BY resource.sort_order, resource.name
        `;
    }
    if (vertical === "hotel") {
        return `
            SELECT room_type.id, room_type.name, room_type.description,
                   CASE WHEN jsonb_typeof(room_type.images) = 'array' THEN room_type.images->>0 ELSE NULL END AS image_url,
                   COALESCE(room_type.max_guests, room_type.capacity, 1) AS capacity,
                   CASE WHEN room_type.discount_price IS NOT NULL
                              AND (room_type.discount_until IS NULL OR room_type.discount_until > now())
                        THEN room_type.discount_price ELSE room_type.price_per_night END AS unit_price,
                   '[]'::jsonb AS time_slots
            FROM hotel_room_types room_type
            WHERE room_type.business_id = $1 AND room_type.is_active = true
            ORDER BY room_type.sort_order, room_type.name
        `;
    }
    return `
        SELECT vehicle.id::text AS id, concat_ws(' ', vehicle.brand, vehicle.model, vehicle.year::text) AS name,
               vehicle.description, (
                   SELECT image.url FROM vehicle_images image
                   WHERE image.vehicle_id = vehicle.id
                   ORDER BY image.is_primary DESC, image.sort_order, image.created_at LIMIT 1
               ) AS image_url,
               COALESCE(vehicle.seats, 1) AS capacity, vehicle.daily_price AS unit_price,
               '[]'::jsonb AS time_slots
        FROM vehicles vehicle
        WHERE vehicle.business_id = $1 AND vehicle.status IN ('available', 'rented')
        ORDER BY vehicle.daily_price, vehicle.brand, vehicle.model
    `;
}

function canonicalResourceQuery(vertical: ReservationVertical): string {
    if (vertical === "restaurant") {
        return `
            WITH business_context AS (${moduleBusinessQuery()})
            SELECT business.id AS business_id, business.name AS business_name, business.slug AS business_slug,
                   resource.id AS resource_id, resource.name AS resource_name,
                   resource.capacity, resource.unit_price, resource.time_slots, true AS canonical_resource
            FROM business_context business
            JOIN restaurant_reservation_resources resource
              ON resource.business_id = business.id AND resource.id = $2 AND resource.is_active = true
            WHERE business.vertical = 'restaurant'
            LIMIT 1
        `;
    }
    if (vertical === "hotel") {
        return `
            WITH business_context AS (${moduleBusinessQuery()})
            SELECT business.id AS business_id, business.name AS business_name, business.slug AS business_slug,
                   room_type.id AS resource_id, room_type.name AS resource_name,
                   (SELECT count(*)::integer FROM hotel_rooms room
                    WHERE room.business_id = business.id AND room.room_type_id = room_type.id
                      AND room.is_active = true AND room.is_available = true) AS inventory_capacity,
                   COALESCE(room_type.max_guests, room_type.capacity, 1) AS guest_capacity,
                   CASE WHEN room_type.discount_price IS NOT NULL
                              AND (room_type.discount_until IS NULL OR room_type.discount_until > now())
                        THEN room_type.discount_price ELSE room_type.price_per_night END AS unit_price,
                   true AS canonical_resource
            FROM business_context business
            JOIN hotel_room_types room_type
              ON room_type.business_id = business.id AND room_type.id = $2 AND room_type.is_active = true
            WHERE business.vertical = 'hotel'
            LIMIT 1
        `;
    }
    return `
        WITH business_context AS (${moduleBusinessQuery()})
        SELECT business.id AS business_id, business.name AS business_name, business.slug AS business_slug,
               vehicle.id::text AS resource_id,
               concat_ws(' ', vehicle.brand, vehicle.model, vehicle.year::text) AS resource_name,
               1 AS capacity, vehicle.daily_price AS unit_price, true AS canonical_resource
        FROM business_context business
        JOIN vehicles vehicle ON vehicle.business_id = business.id AND vehicle.id::text = $2
                             AND vehicle.status IN ('available', 'rented')
        WHERE business.vertical = 'vehicle'
        LIMIT 1
    `;
}

function idempotentQuery(vertical: ReservationVertical): string {
    if (vertical === "restaurant") {
        return `SELECT id, business_id, business_name, business_slug, resource_id, resource_name,
                       customer_name, customer_phone, customer_email, starts_at AS start_date, ends_at AS end_date,
                       party_size, unit_price, total_amount AS total, status, notes AS note, created_at,
                       'restaurant' AS vertical
                FROM restaurant_reservations WHERE app_user_id = $1 AND idempotency_key = $2 LIMIT 1`;
    }
    if (vertical === "hotel") {
        return `SELECT id, business_id, business_name, business_slug, room_type_id AS resource_id, resource_name,
                       customer_name, customer_phone, customer_email, check_in_date AS start_date, check_out_date AS end_date,
                       guest_count AS party_size, price_per_night AS unit_price, total_price AS total,
                       reservation_status AS status, special_requests AS note, created_at, 'hotel' AS vertical
                FROM hotel_reservations WHERE app_user_id = $1 AND idempotency_key = $2 LIMIT 1`;
    }
    return `SELECT id, business_id, business_name, business_slug, vehicle_id::text AS resource_id, resource_name,
                   customer_name, customer_phone, customer_email, start_date, end_date,
                   NULL::integer AS party_size, daily_price AS unit_price, total_amount AS total,
                   status, notes AS note, created_at, 'vehicle' AS vertical
            FROM vehicle_reservations WHERE app_user_id = $1 AND idempotency_key = $2 LIMIT 1`;
}

async function findIdempotentReservation(
    execute: ReservationQueryExecutor,
    input: Pick<CreateOwnedReservationInput, "appUserId" | "idempotencyKey" | "vertical">,
): Promise<ReservationRecord | null> {
    const verticals: ReservationVertical[] = [
        input.vertical,
        ...(["restaurant", "hotel", "vehicle"] as const).filter((vertical) => vertical !== input.vertical),
    ];
    for (const vertical of verticals) {
        const rows = await optionalRows(execute, idempotentQuery(vertical), [input.appUserId, input.idempotencyKey]);
        if (rows[0]) return mapRecord(rows[0]);
    }
    return null;
}

function overlapCountQuery(vertical: ReservationVertical): string {
    if (vertical === "restaurant") {
        return `SELECT count(*)::integer AS overlap_count FROM restaurant_reservations
                WHERE business_id = $1 AND resource_id = $2 AND status IN ('pending', 'confirmed')
                  AND tstzrange(starts_at, ends_at, '[)') && tstzrange($3::timestamptz, $4::timestamptz, '[)')`;
    }
    if (vertical === "hotel") {
        return `SELECT count(*)::integer AS overlap_count FROM hotel_reservations
                WHERE business_id = $1 AND room_type_id = $2 AND reservation_status IN ('pending', 'confirmed')
                  AND daterange(check_in_date::date, check_out_date::date, '[)') && daterange($3::date, $4::date, '[)')`;
    }
    return `SELECT count(*)::integer AS overlap_count FROM vehicle_reservations
            WHERE business_id = $1 AND vehicle_id::text = $2 AND status IN ('pending', 'confirmed')
              AND daterange(start_date, end_date, '[]') && daterange($3::date, $4::date, '[]')`;
}

function unavailableDatesQuery(vertical: ReservationVertical): string {
    if (vertical === "restaurant") {
        return `
            WITH requested_dates AS (
                SELECT day::date AS unavailable_date
                FROM generate_series($3::timestamptz::date, ($4::timestamptz - interval '1 second')::date, interval '1 day') day
            )
            SELECT requested_dates.unavailable_date
            FROM requested_dates
            WHERE EXISTS (
                SELECT 1 FROM restaurant_reservations reservation
                WHERE reservation.business_id = $1 AND reservation.resource_id = $2
                  AND reservation.status IN ('pending', 'confirmed')
                  AND tstzrange(reservation.starts_at, reservation.ends_at, '[)')
                      && tstzrange($3::timestamptz, $4::timestamptz, '[)')
                  AND reservation.starts_at::date <= requested_dates.unavailable_date
                  AND reservation.ends_at::date >= requested_dates.unavailable_date
            )
            ORDER BY requested_dates.unavailable_date
        `;
    }
    if (vertical === "hotel") {
        return `
            WITH requested_dates AS (
                SELECT day::date AS unavailable_date
                FROM generate_series($3::date, $4::date - 1, interval '1 day') day
            )
            SELECT requested_dates.unavailable_date
            FROM requested_dates
            WHERE (
                SELECT count(*) FROM hotel_reservations reservation
                WHERE reservation.business_id = $1 AND reservation.room_type_id = $2
                  AND reservation.reservation_status IN ('pending', 'confirmed')
                  AND daterange(reservation.check_in_date::date, reservation.check_out_date::date, '[)')
                      @> requested_dates.unavailable_date
            ) >= $5
            ORDER BY requested_dates.unavailable_date
        `;
    }
    return `
        WITH requested_dates AS (
            SELECT day::date AS unavailable_date
            FROM generate_series($3::date, $4::date, interval '1 day') day
        )
        SELECT requested_dates.unavailable_date
        FROM requested_dates
        WHERE EXISTS (
            SELECT 1 FROM vehicle_reservations reservation
            WHERE reservation.business_id = $1 AND reservation.vehicle_id::text = $2
              AND reservation.status IN ('pending', 'confirmed')
              AND daterange(reservation.start_date, reservation.end_date, '[]') @> requested_dates.unavailable_date
        )
        ORDER BY requested_dates.unavailable_date
    `;
}

function assignableHotelRoomQuery(): string {
    return `
        SELECT room.id::text AS assigned_room_id
        FROM hotel_rooms room
        WHERE room.business_id = $1 AND room.room_type_id = $2
          AND room.is_active = true AND room.is_available = true
          AND NOT EXISTS (
              SELECT 1 FROM hotel_reservations reservation
              WHERE reservation.business_id = room.business_id AND reservation.room_id = room.id
                AND reservation.reservation_status IN ('pending', 'confirmed')
                AND tstzrange(reservation.check_in_date, reservation.check_out_date, '[)')
                    && tstzrange($3::date::timestamptz, $4::date::timestamptz, '[)')
          )
        ORDER BY room.room_number
        FOR UPDATE OF room SKIP LOCKED
        LIMIT 1
    `;
}

function insertQuery(vertical: ReservationVertical): string {
    if (vertical === "restaurant") {
        return `INSERT INTO restaurant_reservations (
                    id, app_user_id, business_id, business_name, business_slug, resource_id, resource_name,
                    customer_name, customer_phone, customer_email, starts_at, ends_at, party_size,
                    unit_price, total_amount, status, notes, idempotency_key
                ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::timestamptz,$12::timestamptz,$13,$14,$15,'pending',$16,$17)
                RETURNING id, business_id, business_name, business_slug, resource_id, resource_name,
                          customer_name, customer_phone, customer_email, starts_at AS start_date, ends_at AS end_date,
                          party_size, unit_price, total_amount AS total, status, notes AS note, created_at,
                          'restaurant' AS vertical`;
    }
    if (vertical === "hotel") {
        return `INSERT INTO hotel_reservations (
                    id, app_user_id, business_id, business_name, business_slug, room_type_id, room_id, resource_name,
                    customer_name, customer_phone, customer_email, check_in_date, check_out_date,
                    adults, children, guest_count, total_nights, price_per_night, total_price,
                    reservation_status, special_requests, idempotency_key
                ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12::date,$13::date,$14,0,$14,$15,$16,$17,'pending',$18,$19)
                RETURNING id, business_id, business_name, business_slug, room_type_id AS resource_id, resource_name,
                          customer_name, customer_phone, customer_email, check_in_date AS start_date, check_out_date AS end_date,
                          guest_count AS party_size, price_per_night AS unit_price, total_price AS total,
                          reservation_status AS status, special_requests AS note, created_at, 'hotel' AS vertical`;
    }
    return `INSERT INTO vehicle_reservations (
                id, app_user_id, business_id, business_name, business_slug, vehicle_id, resource_name,
                customer_name, customer_phone, customer_email, start_date, end_date, total_days,
                daily_price, total_amount, status, notes, idempotency_key
            ) VALUES ($1::uuid,$2,$3,$4,$5,$6::uuid,$7,$8,$9,$10,$11::date,$12::date,$13,$14,$15,'pending',$16,$17)
            RETURNING id, business_id, business_name, business_slug, vehicle_id::text AS resource_id, resource_name,
                      customer_name, customer_phone, customer_email, start_date, end_date,
                      NULL::integer AS party_size, daily_price AS unit_price, total_amount AS total,
                      status, notes AS note, created_at, 'vehicle' AS vertical`;
}

function insertValues(
    input: CreateOwnedReservationInput,
    context: QueryResultRow,
    unitPrice: number,
    units: number,
): readonly unknown[] {
    const common = [
        randomUUID(), input.appUserId, text(context.business_id), text(context.business_name), text(context.business_slug),
        input.resourceId, text(context.resource_name), input.customerName, input.customerPhone, input.customerEmail,
        input.startDate, input.endDate,
    ];
    if (input.vertical === "restaurant") {
        return [...common, input.partySize ?? 1, unitPrice, unitPrice * (input.partySize ?? 1), input.note, input.idempotencyKey];
    }
    if (input.vertical === "hotel") {
        return [
            randomUUID(), input.appUserId, text(context.business_id), text(context.business_name), text(context.business_slug),
            input.resourceId, text(context.assigned_room_id), text(context.resource_name), input.customerName,
            input.customerPhone, input.customerEmail, input.startDate, input.endDate, input.partySize ?? 1,
            units, unitPrice, unitPrice * units, input.note, input.idempotencyKey,
        ];
    }
    return [...common, units, unitPrice, unitPrice * units, input.note, input.idempotencyKey];
}

function listQuery(vertical: ReservationVertical, ownerColumn: "app_user_id" | "business_id", filters = ""): string {
    const where = `WHERE ${ownerColumn} = $1${filters}`;
    if (vertical === "restaurant") return `${idempotentQuery(vertical).replace("WHERE app_user_id = $1 AND idempotency_key = $2 LIMIT 1", `${where} ORDER BY created_at DESC LIMIT 200`)}`;
    if (vertical === "hotel") return `${idempotentQuery(vertical).replace("WHERE app_user_id = $1 AND idempotency_key = $2 LIMIT 1", `${where} ORDER BY created_at DESC LIMIT 200`)}`;
    return `${idempotentQuery(vertical).replace("WHERE app_user_id = $1 AND idempotency_key = $2 LIMIT 1", `${where} ORDER BY created_at DESC LIMIT 200`)}`;
}

function isUndefinedCanonical(error: unknown): boolean {
    return Boolean(error && typeof error === "object" && "code" in error && (error.code === "42P01" || error.code === "42703"));
}

async function optionalRows(execute: ReservationQueryExecutor, query: string, values: readonly unknown[]): Promise<QueryResultRow[]> {
    try {
        return (await execute(query, values)).rows;
    } catch (error) {
        if (isUndefinedCanonical(error)) return [];
        throw error;
    }
}

export function createReservationRepository(
    execute: ReservationQueryExecutor,
    runTransaction: ReservationTransactionRunner = async (operation) => operation(execute),
) {
    return {
        async getOptions(businessSlug: string): Promise<ReservationOptions> {
            const businessResult = await execute(moduleBusinessQuery(), [businessSlug]);
            const business = businessResult.rows[0];
            const vertical = business?.vertical as ReservationVertical | undefined;
            if (!business || !vertical || !["restaurant", "hotel", "vehicle"].includes(vertical)) {
                return DISABLED_RESERVATION_OPTIONS;
            }
            const resourcesResult = await execute(resourceOptionsQuery(vertical), [text(business.id)]);
            if (resourcesResult.rows.length === 0) return DISABLED_RESERVATION_OPTIONS;
            const slots = new Set<string>();
            const resources = resourcesResult.rows.map((row) => {
                const resourceSlots = Array.isArray(row.time_slots)
                    ? row.time_slots.filter((slot): slot is string => typeof slot === "string").sort()
                    : [];
                for (const slot of resourceSlots) slots.add(slot);
                return {
                    capacity: Math.max(1, integer(row.capacity, 1)),
                    description: nullableText(row.description),
                    id: text(row.id),
                    imageUrl: nullableText(row.image_url),
                    name: text(row.name),
                    timeSlots: resourceSlots,
                    unitPrice: number(row.unit_price),
                };
            });
            if (vertical === "restaurant" && slots.size === 0) return DISABLED_RESERVATION_OPTIONS;
            return {
                business: { id: text(business.id), name: text(business.name), slug: text(business.slug) },
                nativeEnabled: true,
                resources,
                timeSlots: [...slots].sort(),
                vertical,
            };
        },

        async getAvailability(input: ReservationAvailabilityInput): Promise<ReservationAvailability> {
            const context = (await execute(canonicalResourceQuery(input.vertical), [input.businessSlug, input.resourceId])).rows[0];
            const inventoryCapacity = input.vertical === "hotel"
                ? integer(context?.inventory_capacity)
                : integer(context?.capacity);
            if (!context || inventoryCapacity < 1) throw new ReservationCanonicalDataError();
            const result = await execute(unavailableDatesQuery(input.vertical), [
                text(context.business_id), input.resourceId, input.startDate, input.endDate, inventoryCapacity,
            ]);
            const unavailableDates = result.rows.map((row) => dateValue(row.unavailable_date));
            return { available: unavailableDates.length === 0, unavailableDates };
        },

        async createOwned(input: CreateOwnedReservationInput): Promise<ReservationRecord> {
            try {
                return await runTransaction(async (transaction) => {
                    await transaction("SELECT pg_advisory_xact_lock(hashtext($1))", [`reservation-idempotency:${input.appUserId}:${input.idempotencyKey}`]);
                    await transaction("SELECT pg_advisory_xact_lock(hashtext($1))", [`reservation-resource:${input.vertical}:${input.businessSlug}:${input.resourceId}`]);
                    const existing = await findIdempotentReservation(transaction, input);
                    if (existing) return existing;

                    const context = (await transaction(canonicalResourceQuery(input.vertical), [input.businessSlug, input.resourceId])).rows[0];
                    const inventoryCapacity = input.vertical === "hotel"
                        ? integer(context?.inventory_capacity)
                        : integer(context?.capacity);
                    if (!context || inventoryCapacity < 1) throw new ReservationCanonicalDataError();
                    const guestCapacity = input.vertical === "hotel"
                        ? integer(context.guest_capacity)
                        : inventoryCapacity;
                    if ((input.vertical === "restaurant" || input.vertical === "hotel")
                        && (input.partySize ?? 0) > guestCapacity) {
                        throw new ReservationConflictError("Party size exceeds resource capacity.");
                    }
                    if (input.vertical === "restaurant") {
                        const selectedTime = /T([0-2]\d:[0-5]\d)/.exec(input.startDate)?.[1];
                        const canonicalSlots = Array.isArray(context.time_slots)
                            ? context.time_slots.filter((slot): slot is string => typeof slot === "string")
                            : [];
                        if (!selectedTime || !canonicalSlots.includes(selectedTime)) {
                            throw new ReservationCanonicalDataError("Selected restaurant time is not canonical.");
                        }
                    }

                    const overlap = await transaction(overlapCountQuery(input.vertical), [
                        text(context.business_id), input.resourceId, input.startDate, input.endDate,
                    ]);
                    const overlapLimit = input.vertical === "hotel" ? inventoryCapacity : 1;
                    if (integer(overlap.rows[0]?.overlap_count) >= overlapLimit) throw new ReservationConflictError();

                    if (input.vertical === "hotel") {
                        const room = await transaction(assignableHotelRoomQuery(), [
                            text(context.business_id), input.resourceId, input.startDate, input.endDate,
                        ]);
                        if (!room.rows[0]) throw new ReservationConflictError();
                        context.assigned_room_id = room.rows[0].assigned_room_id;
                    }

                    const milliseconds = Date.parse(`${input.endDate}${input.endDate.includes("T") ? "" : "T00:00:00Z"}`)
                        - Date.parse(`${input.startDate}${input.startDate.includes("T") ? "" : "T00:00:00Z"}`);
                    const elapsedDays = Math.max(1, Math.ceil(milliseconds / 86_400_000));
                    const units = input.vertical === "vehicle" ? elapsedDays + 1 : elapsedDays;
                    const unitPrice = number(context.unit_price);
                    const inserted = await transaction(insertQuery(input.vertical), insertValues(input, context, unitPrice, units));
                    if (!inserted.rows[0]) throw new ReservationCanonicalDataError("Reservation could not be persisted.");
                    return mapRecord(inserted.rows[0]);
                });
            } catch (error) {
                if (error && typeof error === "object" && "code" in error && error.code === "23P01") {
                    throw new ReservationConflictError();
                }
                throw error;
            }
        },

        async listOwned(appUserId: string): Promise<ReservationRecord[]> {
            const rows = await Promise.all((["restaurant", "hotel", "vehicle"] as const).map((vertical) =>
                optionalRows(execute, listQuery(vertical, "app_user_id"), [appUserId])));
            return rows.flat().map(mapRecord)
                .sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt));
        },

        async cancelOwned(appUserId: string, id: string): Promise<ReservationRecord> {
            for (const vertical of ["restaurant", "hotel", "vehicle"] as const) {
                const table = vertical === "restaurant" ? "restaurant_reservations" : vertical === "hotel" ? "hotel_reservations" : "vehicle_reservations";
                const statusColumn = vertical === "hotel" ? "reservation_status" : "status";
                const result = await execute(`
                    WITH updated AS (
                        UPDATE ${table} SET ${statusColumn} = 'cancelled', updated_at = now()
                        WHERE id::text = $2 AND app_user_id = $1 AND ${statusColumn} IN ('pending', 'confirmed')
                        RETURNING *
                    )
                    SELECT updated.*, '${vertical}' AS vertical,
                           ${vertical === "restaurant" ? "starts_at" : vertical === "hotel" ? "check_in_date" : "start_date"} AS start_date,
                           ${vertical === "restaurant" ? "ends_at" : vertical === "hotel" ? "check_out_date" : "end_date"} AS end_date,
                           ${vertical === "restaurant" ? "resource_id::text" : vertical === "hotel" ? "room_type_id::text" : "vehicle_id::text"} AS resource_id,
                           ${vertical === "restaurant" ? "party_size" : vertical === "hotel" ? "guest_count" : "NULL::integer"} AS party_size,
                           ${vertical === "restaurant" ? "unit_price" : vertical === "hotel" ? "price_per_night" : "daily_price"} AS unit_price,
                           ${vertical === "restaurant" ? "total_amount" : vertical === "hotel" ? "total_price" : "total_amount"} AS total,
                           ${statusColumn} AS status,
                           ${vertical === "hotel" ? "special_requests" : "notes"} AS note
                    FROM updated
                `, [appUserId, id]).catch((error) => isUndefinedCanonical(error) ? { rowCount: 0, rows: [] } : Promise.reject(error));
                if (result.rows[0]) return mapRecord(result.rows[0]);
            }

            let ownedStatus: ReservationStatus | null = null;
            for (const vertical of ["restaurant", "hotel", "vehicle"] as const) {
                const table = vertical === "restaurant" ? "restaurant_reservations" : vertical === "hotel" ? "hotel_reservations" : "vehicle_reservations";
                const statusColumn = vertical === "hotel" ? "reservation_status" : "status";
                const result = await execute(`SELECT ${statusColumn} AS status FROM ${table} WHERE id::text = $2 AND app_user_id = $1 LIMIT 1`, [appUserId, id])
                    .catch((error) => isUndefinedCanonical(error) ? { rowCount: 0, rows: [] } : Promise.reject(error));
                if (result.rows[0]) { ownedStatus = text(result.rows[0].status) as ReservationStatus; break; }
            }
            if (!ownedStatus) throw new ReservationNotFoundError();
            throw new ReservationTerminalStatusError();
        },

        async listBusiness(
            vertical: ReservationVertical,
            businessId: string,
            filters: Readonly<{ status?: ReservationStatus | null }> = {},
        ): Promise<ReservationRecord[]> {
            const values: unknown[] = [businessId];
            let filter = "";
            if (filters.status) {
                values.push(filters.status);
                filter = ` AND ${vertical === "hotel" ? "reservation_status" : "status"} = $2`;
            }
            const rows = await execute(listQuery(vertical, "business_id", filter), values);
            return rows.rows.map(mapRecord);
        },

        async updateBusinessStatus(
            vertical: ReservationVertical,
            businessId: string,
            id: string,
            status: ReservationStatus,
        ): Promise<ReservationRecord> {
            const sourceStatuses: ReservationStatus[] = status === "confirmed" || status === "rejected"
                ? ["pending"]
                : status === "completed"
                    ? ["confirmed"]
                    : status === "cancelled"
                        ? ["pending", "confirmed"]
                        : [];
            if (sourceStatuses.length === 0) throw new ReservationTerminalStatusError();
            const table = vertical === "restaurant" ? "restaurant_reservations" : vertical === "hotel" ? "hotel_reservations" : "vehicle_reservations";
            const statusColumn = vertical === "hotel" ? "reservation_status" : "status";
            const sourceStatusSql = sourceStatuses.length === 1
                ? `${statusColumn} = '${sourceStatuses[0]}'`
                : `${statusColumn} IN ('pending', 'confirmed')`;
            const result = await execute(`
                UPDATE ${table} SET ${statusColumn} = $3, updated_at = now()
                WHERE business_id = $1 AND id::text = $2 AND ${sourceStatusSql}
                RETURNING *, '${vertical}' AS vertical,
                          ${vertical === "restaurant" ? "starts_at" : vertical === "hotel" ? "check_in_date" : "start_date"} AS start_date,
                          ${vertical === "restaurant" ? "ends_at" : vertical === "hotel" ? "check_out_date" : "end_date"} AS end_date,
                          ${vertical === "restaurant" ? "resource_id::text" : vertical === "hotel" ? "room_type_id::text" : "vehicle_id::text"} AS resource_id,
                          ${vertical === "restaurant" ? "party_size" : vertical === "hotel" ? "guest_count" : "NULL::integer"} AS party_size,
                          ${vertical === "restaurant" ? "unit_price" : vertical === "hotel" ? "price_per_night" : "daily_price"} AS unit_price,
                          ${vertical === "restaurant" ? "total_amount" : vertical === "hotel" ? "total_price" : "total_amount"} AS total,
                          ${statusColumn} AS status, ${vertical === "hotel" ? "special_requests" : "notes"} AS note
            `, [businessId, id, status]);
            if (result.rows[0]) return mapRecord(result.rows[0]);
            const existing = await execute(`SELECT ${statusColumn} AS status FROM ${table} WHERE business_id = $1 AND id::text = $2 LIMIT 1`, [businessId, id]);
            if (!existing.rows[0]) throw new ReservationNotFoundError("Reservation was not found for this business.");
            throw new ReservationTerminalStatusError();
        },
    };
}

const defaultExecutor: ReservationQueryExecutor = async (queryText, values) => {
    const { query } = await import("../db/query.ts");
    return query<QueryResultRow>(queryText, values);
};

const defaultTransactionRunner: ReservationTransactionRunner = async (operation) => {
    const { getPostgresPool } = await import("../db/postgres.ts");
    const client = await getPostgresPool().connect();
    const transactionExecutor: ReservationQueryExecutor = (queryText, values) =>
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

export const reservationRepository = createReservationRepository(defaultExecutor, defaultTransactionRunner);
export type ReservationRepository = ReturnType<typeof createReservationRepository>;

export {
    ReservationCanonicalDataError,
    ReservationConflictError,
    ReservationNotFoundError,
    ReservationTerminalStatusError,
};
