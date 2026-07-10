export interface QueryResultLike {
    rowCount: number | null;
    rows: Record<string, unknown>[];
}

export type QueryExecutor = (
    text: string,
    values?: readonly unknown[],
) => Promise<QueryResultLike>;

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
        createdAt: asString(row.created_at),
        displayName: asNullableString(row.display_name),
        hobbies: Array.isArray(row.hobbies) ? row.hobbies.filter((value): value is string => typeof value === "string") : [],
        maritalStatus: asNullableString(row.marital_status),
        occupation: asNullableString(row.occupation),
        phone: asNullableString(row.phone),
        preferences: asObject(row.preferences),
        updatedAt: asString(row.updated_at),
    };
}

function mapAddress(row: Record<string, unknown>): CustomerAddress {
    return {
        city: asString(row.city),
        createdAt: asString(row.created_at),
        district: asString(row.district),
        fullAddress: asString(row.full_address),
        id: asString(row.id),
        isDefault: row.is_default === true,
        label: asString(row.label),
        latitude: row.latitude === null || row.latitude === undefined ? null : asNumber(row.latitude),
        longitude: row.longitude === null || row.longitude === undefined ? null : asNumber(row.longitude),
        updatedAt: asString(row.updated_at),
    };
}

function mapFavorite(row: Record<string, unknown>): CustomerFavorite {
    return {
        businessSlug: asString(row.business_slug),
        createdAt: asString(row.created_at),
        id: asString(row.id),
    };
}

function isUndefinedTable(error: unknown): boolean {
    return Boolean(error && typeof error === "object" && "code" in error && error.code === "42P01");
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

export function createCustomerRepository(execute: QueryExecutor) {
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
                throw new Error("Customer address not found for owner");
            }
            return mapAddress(result.rows[0]);
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
                    createdAt: asString(row.created_at),
                    id: asString(row.id),
                    itemCount: Array.isArray(row.items) ? row.items.length : 0,
                    orderNumber: asNullableString(row.order_number),
                    recordType: row.record_type === "ecommerce" ? "ecommerce" : "fastfood",
                    status: asString(row.status),
                    total: asNumber(row.total),
                }))
                .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
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
                    createdAt: asString(row.created_at),
                    endDate: asString(row.end_date),
                    id: asString(row.id),
                    reservationType: row.reservation_type === "vehicle" ? "vehicle" : "hotel",
                    startDate: asString(row.start_date),
                    status: asString(row.status),
                    total: asNumber(row.total),
                }))
                .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
        },
    };
}

const defaultExecutor: QueryExecutor = async (text, values) => {
    const { query } = await import("../db/query.ts");
    return query(text, values);
};

export const customerRepository = createCustomerRepository(defaultExecutor);
export type CustomerRepository = ReturnType<typeof createCustomerRepository>;
