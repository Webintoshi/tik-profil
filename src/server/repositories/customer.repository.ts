import type { ListingInquiryRecord } from "../listings/listing-inquiry-contract.ts";
import { mapListingInquiryRecord } from "./listing-inquiry.repository.ts";

export interface QueryResultLike {
    rowCount: number | null;
    rows: Record<string, unknown>[];
}

export type QueryExecutor = (
    text: string,
    values?: readonly unknown[],
) => Promise<QueryResultLike>;

export type QueryTransactionRunner = <T>(
    operation: (execute: QueryExecutor) => Promise<T>,
) => Promise<T>;

export class CustomerRepositoryOwnershipError extends Error {
    readonly code = "CUSTOMER_RESOURCE_NOT_FOUND";
    readonly statusCode = 404;

    constructor(resource: string) {
        super(`${resource} not found for customer owner`);
        this.name = "CustomerRepositoryOwnershipError";
    }
}

export class CustomerRepositoryConflictError extends Error {
    readonly code = "CUSTOMER_RESOURCE_CONFLICT";
    readonly statusCode = 409;

    constructor(message: string) {
        super(message);
        this.name = "CustomerRepositoryConflictError";
    }
}

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

export interface CustomerProfileInput {
    avatarUrl: string | null;
    birthDate: string | null;
    displayName: string | null;
    hobbies: string[];
    maritalStatus: string | null;
    occupation: string | null;
    phone: string | null;
    preferences: Record<string, unknown>;
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

export interface CustomerAddressInput {
    city: string;
    district: string;
    fullAddress: string;
    id?: string;
    isDefault: boolean;
    label: string;
    latitude: number | null;
    longitude: number | null;
}

export interface CustomerFavorite {
    businessSlug: string;
    createdAt: string;
    id: string;
}

export interface CustomerOrderSummary {
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

export interface CustomerReservationSummary {
    businessId: string;
    createdAt: string;
    endDate: string;
    id: string;
    reservationType: "hotel" | "vehicle";
    startDate: string;
    status: string;
    total: number;
}

function asNullableString(value: unknown): string | null {
    return typeof value === "string" ? value : null;
}

function asString(value: unknown): string {
    return typeof value === "string" ? value : String(value ?? "");
}

function asIsoTimestamp(value: unknown): string {
    const date = value instanceof Date ? value : new Date(asString(value));
    return Number.isNaN(date.getTime()) ? asString(value) : date.toISOString();
}

function asDateValue(value: unknown): string {
    return value instanceof Date ? asIsoTimestamp(value) : asString(value);
}

function asNumber(value: unknown): number {
    const parsed = typeof value === "number" ? value : Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
}

function asObject(value: unknown): Record<string, unknown> {
    return value && typeof value === "object" && !Array.isArray(value)
        ? value as Record<string, unknown>
        : {};
}

function mapProfile(row: Record<string, unknown>): CustomerProfile {
    return {
        appUserId: asString(row.app_user_id),
        avatarUrl: asNullableString(row.avatar_url),
        birthDate: asNullableString(row.birth_date),
        createdAt: asIsoTimestamp(row.created_at),
        displayName: asNullableString(row.display_name),
        hobbies: Array.isArray(row.hobbies) ? row.hobbies.filter((value): value is string => typeof value === "string") : [],
        maritalStatus: asNullableString(row.marital_status),
        occupation: asNullableString(row.occupation),
        phone: asNullableString(row.phone),
        preferences: asObject(row.preferences),
        updatedAt: asIsoTimestamp(row.updated_at),
    };
}

function mapAddress(row: Record<string, unknown>): CustomerAddress {
    return {
        city: asString(row.city),
        createdAt: asIsoTimestamp(row.created_at),
        district: asString(row.district),
        fullAddress: asString(row.full_address),
        id: asString(row.id),
        isDefault: row.is_default === true,
        label: asString(row.label),
        latitude: row.latitude === null || row.latitude === undefined ? null : asNumber(row.latitude),
        longitude: row.longitude === null || row.longitude === undefined ? null : asNumber(row.longitude),
        updatedAt: asIsoTimestamp(row.updated_at),
    };
}

function mapFavorite(row: Record<string, unknown>): CustomerFavorite {
    return {
        businessSlug: asString(row.business_slug),
        createdAt: asIsoTimestamp(row.created_at),
        id: asString(row.id),
    };
}

function isUndefinedTable(error: unknown): boolean {
    return Boolean(error && typeof error === "object" && "code" in error && error.code === "42P01");
}

function isUniqueViolation(error: unknown): boolean {
    return Boolean(error && typeof error === "object" && "code" in error && error.code === "23505");
}

async function queryOptionalTable(
    executor: QueryExecutor,
    text: string,
    values: readonly unknown[],
): Promise<Record<string, unknown>[]> {
    try {
        return (await executor(text, values)).rows;
    } catch (error) {
        if (isUndefinedTable(error)) {
            return [];
        }
        throw error;
    }
}

export function createCustomerRepository(
    execute: QueryExecutor,
    runInTransaction?: QueryTransactionRunner,
) {
    return {
        async getProfile(appUserId: string): Promise<CustomerProfile | null> {
            const result = await execute(
                `
                    SELECT
                        app_user_id, display_name, phone, avatar_url, birth_date,
                        marital_status, occupation, hobbies, preferences, created_at, updated_at
                    FROM customer_profiles
                    WHERE app_user_id = $1
                    LIMIT 1
                `,
                [appUserId],
            );
            return result.rows[0] ? mapProfile(result.rows[0]) : null;
        },

        async upsertProfile(appUserId: string, input: CustomerProfileInput): Promise<CustomerProfile> {
            const result = await execute(
                `
                    INSERT INTO customer_profiles (
                        app_user_id, display_name, phone, avatar_url, birth_date,
                        marital_status, occupation, hobbies, preferences
                    )
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8::text[], $9::jsonb)
                    ON CONFLICT (app_user_id) DO UPDATE SET
                        display_name = EXCLUDED.display_name,
                        phone = EXCLUDED.phone,
                        avatar_url = EXCLUDED.avatar_url,
                        birth_date = EXCLUDED.birth_date,
                        marital_status = EXCLUDED.marital_status,
                        occupation = EXCLUDED.occupation,
                        hobbies = EXCLUDED.hobbies,
                        preferences = EXCLUDED.preferences,
                        updated_at = now()
                    RETURNING
                        app_user_id, display_name, phone, avatar_url, birth_date,
                        marital_status, occupation, hobbies, preferences, created_at, updated_at
                `,
                [
                    appUserId,
                    input.displayName,
                    input.phone,
                    input.avatarUrl,
                    input.birthDate,
                    input.maritalStatus,
                    input.occupation,
                    input.hobbies,
                    JSON.stringify(input.preferences),
                ],
            );
            return mapProfile(result.rows[0]);
        },

        async listAddresses(appUserId: string): Promise<CustomerAddress[]> {
            const result = await execute(
                `
                    SELECT id, label, full_address, district, city, latitude, longitude,
                           is_default, created_at, updated_at
                    FROM customer_addresses
                    WHERE app_user_id = $1
                    ORDER BY is_default DESC, created_at ASC
                `,
                [appUserId],
            );
            return result.rows.map(mapAddress);
        },

        async saveAddress(appUserId: string, input: CustomerAddressInput): Promise<CustomerAddress> {
            try {
                const result = await execute(
                    `
                        INSERT INTO customer_addresses (
                            id, app_user_id, label, full_address, district, city,
                            latitude, longitude, is_default
                        )
                        VALUES (COALESCE($1::uuid, gen_random_uuid()), $2, $3, $4, $5, $6, $7, $8, $9)
                        ON CONFLICT (id) DO UPDATE SET
                            label = EXCLUDED.label,
                            full_address = EXCLUDED.full_address,
                            district = EXCLUDED.district,
                            city = EXCLUDED.city,
                            latitude = EXCLUDED.latitude,
                            longitude = EXCLUDED.longitude,
                            is_default = EXCLUDED.is_default,
                            updated_at = now()
                        WHERE customer_addresses.app_user_id = EXCLUDED.app_user_id
                        RETURNING id, label, full_address, district, city, latitude, longitude,
                                  is_default, created_at, updated_at
                    `,
                    [
                        input.id ?? null,
                        appUserId,
                        input.label,
                        input.fullAddress,
                        input.district,
                        input.city,
                        input.latitude,
                        input.longitude,
                        input.isDefault,
                    ],
                );
                if (!result.rows[0]) {
                    throw new CustomerRepositoryOwnershipError("Customer address");
                }
                return mapAddress(result.rows[0]);
            } catch (error) {
                if (isUniqueViolation(error)) {
                    throw new CustomerRepositoryConflictError("Customer already has a default address");
                }
                throw error;
            }
        },

        async saveProfileWithAddresses(
            appUserId: string,
            profileInput: CustomerProfileInput,
            addresses: CustomerAddressInput[],
        ): Promise<{ addresses: CustomerAddress[]; profile: CustomerProfile }> {
            if (!runInTransaction) {
                throw new Error("Customer repository transaction runner is required");
            }

            try {
                return await runInTransaction(async (transactionExecute) => {
                    const transactionRepository = createCustomerRepository(
                        transactionExecute,
                        runInTransaction,
                    );
                    const existingIds = addresses
                        .map((address) => address.id)
                        .filter((id): id is string => Boolean(id));
                    if (existingIds.length > 0) {
                        const conflicts = await transactionExecute(
                            `
                                SELECT id
                                FROM customer_addresses
                                WHERE id = ANY($2::uuid[])
                                  AND app_user_id <> $1
                            `,
                            [appUserId, existingIds],
                        );
                        if (conflicts.rows.length > 0) {
                            throw new CustomerRepositoryOwnershipError("Customer address");
                        }
                    }

                    const profile = await transactionRepository.upsertProfile(appUserId, profileInput);
                    if (addresses.some((address) => address.isDefault)) {
                        await transactionExecute(
                            `
                                UPDATE customer_addresses
                                SET is_default = false, updated_at = now()
                                WHERE app_user_id = $1
                                  AND is_default = true
                            `,
                            [appUserId],
                        );
                    }

                    for (const address of addresses) {
                        await transactionRepository.saveAddress(appUserId, address);
                    }

                    return {
                        addresses: await transactionRepository.listAddresses(appUserId),
                        profile,
                    };
                });
            } catch (error) {
                if (isUniqueViolation(error)) {
                    throw new CustomerRepositoryConflictError("Customer already has a default address");
                }
                throw error;
            }
        },

        async deleteAddress(appUserId: string, id: string): Promise<boolean> {
            const result = await execute(
                `
                    DELETE FROM customer_addresses
                    WHERE app_user_id = $1 AND id = $2
                    RETURNING id
                `,
                [appUserId, id],
            );
            return result.rows.length > 0;
        },

        async listFavorites(appUserId: string): Promise<CustomerFavorite[]> {
            const result = await execute(
                `
                    SELECT id, business_slug, created_at
                    FROM customer_favorites
                    WHERE app_user_id = $1
                    ORDER BY created_at DESC
                `,
                [appUserId],
            );
            return result.rows.map(mapFavorite);
        },

        async addFavorite(appUserId: string, businessSlug: string): Promise<CustomerFavorite> {
            const result = await execute(
                `
                    INSERT INTO customer_favorites (app_user_id, business_slug)
                    VALUES ($1, $2)
                    ON CONFLICT (app_user_id, business_slug) DO UPDATE SET
                        business_slug = EXCLUDED.business_slug
                    RETURNING id, business_slug, created_at
                `,
                [appUserId, businessSlug],
            );
            return mapFavorite(result.rows[0]);
        },

        async deleteFavorite(appUserId: string, businessSlug: string): Promise<boolean> {
            const result = await execute(
                `
                    DELETE FROM customer_favorites
                    WHERE app_user_id = $1 AND business_slug = $2
                    RETURNING id
                `,
                [appUserId, businessSlug],
            );
            return result.rows.length > 0;
        },

        async listOrders(appUserId: string): Promise<CustomerOrderSummary[]> {
            const [fastfoodRows, ecommerceRows] = await Promise.all([
                queryOptionalTable(execute, `
                    SELECT id, business_id, business_name, order_number, status,
                           total, items, created_at, 'fastfood' AS record_type
                    FROM ff_orders
                    WHERE app_user_id = $1
                    ORDER BY created_at DESC
                    LIMIT 100
                `, [appUserId]),
                queryOptionalTable(execute, `
                    SELECT id, business_id, NULL::text AS business_name, order_number,
                           order_status AS status, total, items, created_at,
                           'ecommerce' AS record_type
                    FROM ecommerce_orders
                    WHERE app_user_id = $1
                    ORDER BY created_at DESC
                    LIMIT 100
                `, [appUserId]),
            ]);

            return [...fastfoodRows, ...ecommerceRows]
                .map((row): CustomerOrderSummary => ({
                    businessId: asString(row.business_id),
                    businessName: asNullableString(row.business_name),
                    createdAt: asIsoTimestamp(row.created_at),
                    id: asString(row.id),
                    itemCount: Array.isArray(row.items)
                        ? row.items.reduce((sum: number, item: unknown) => {
                            if (!item || typeof item !== "object") return sum;
                            const quantity = Number((item as Record<string, unknown>).quantity);
                            return sum + (Number.isInteger(quantity) && quantity > 0 ? quantity : 0);
                        }, 0)
                        : 0,
                    orderNumber: asNullableString(row.order_number),
                    recordType: row.record_type === "ecommerce" ? "ecommerce" : "fastfood",
                    status: asString(row.status),
                    total: asNumber(row.total),
                }))
                .sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt));
        },

        async listInquiries(appUserId: string): Promise<ListingInquiryRecord[]> {
            const result = await execute(`
                SELECT id, business_id, business_name, business_slug, listing_id, listing_title,
                       listing_price, listing_currency, listing_image_url, module_id, customer_name,
                       customer_phone, customer_email, message, status, created_at
                FROM listing_inquiries
                WHERE app_user_id = $1
                ORDER BY created_at DESC
                LIMIT 200
            `, [appUserId]);
            return result.rows.map(mapListingInquiryRecord);
        },

        async listReservations(appUserId: string): Promise<CustomerReservationSummary[]> {
            const [hotelRows, vehicleRows] = await Promise.all([
                queryOptionalTable(execute, `
                    SELECT id, business_id, check_in_date AS start_date,
                           check_out_date AS end_date, reservation_status AS status,
                           total_price AS total, created_at, 'hotel' AS reservation_type
                    FROM hotel_reservations
                    WHERE app_user_id = $1
                    ORDER BY created_at DESC
                    LIMIT 100
                `, [appUserId]),
                queryOptionalTable(execute, `
                    SELECT id, business_id, start_date, end_date, status,
                           total_amount AS total, created_at, 'vehicle' AS reservation_type
                    FROM vehicle_reservations
                    WHERE app_user_id = $1
                    ORDER BY created_at DESC
                    LIMIT 100
                `, [appUserId]),
            ]);

            return [...hotelRows, ...vehicleRows]
                .map((row): CustomerReservationSummary => ({
                    businessId: asString(row.business_id),
                    createdAt: asIsoTimestamp(row.created_at),
                    endDate: asDateValue(row.end_date),
                    id: asString(row.id),
                    reservationType: row.reservation_type === "vehicle" ? "vehicle" : "hotel",
                    startDate: asDateValue(row.start_date),
                    status: asString(row.status),
                    total: asNumber(row.total),
                }))
                .sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt));
        },
    };
}

const defaultExecutor: QueryExecutor = async (text, values) => {
    const { query } = await import("../db/query.ts");
    return query(text, values);
};

const defaultTransactionRunner: QueryTransactionRunner = async (operation) => {
    const { getPostgresPool } = await import("../db/postgres.ts");
    const client = await getPostgresPool().connect();
    const transactionExecutor: QueryExecutor = async (text, values) =>
        client.query(text, values ? [...values] : undefined);
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

export const customerRepository = createCustomerRepository(defaultExecutor, defaultTransactionRunner);
export type CustomerRepository = ReturnType<typeof createCustomerRepository>;
