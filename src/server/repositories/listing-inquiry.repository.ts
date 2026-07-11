import { createHash, randomUUID } from "node:crypto";

import type { QueryResultRow } from "pg";

import type {
    CreateOwnedListingInquiryInput,
    ListingInquiryRecord,
    ListingInquiryStatus,
    ListingModuleId,
    ListingOption,
    ListingOptions,
} from "../listings/listing-inquiry-contract.ts";
import { DISABLED_LISTING_OPTIONS } from "../listings/listing-inquiry-contract.ts";
import {
    ListingInquiryCanonicalDataError,
    ListingInquiryIdempotencyConflictError,
    ListingInquiryNotFoundError,
    ListingInquiryStatusConflictError,
} from "../listings/listing-inquiry-errors.ts";

interface QueryResultLike<T extends QueryResultRow = QueryResultRow> {
    rowCount: number | null;
    rows: T[];
}

export type ListingInquiryQueryExecutor = (
    text: string,
    values?: readonly unknown[],
) => Promise<QueryResultLike>;

export type ListingInquiryTransactionRunner = <T>(
    operation: (execute: ListingInquiryQueryExecutor) => Promise<T>,
) => Promise<T>;

const CANCELLABLE_STATUSES = new Set<ListingInquiryStatus>(["pending", "contacted"]);
const INQUIRY_COLUMNS = `
    id, business_id, business_name, business_slug, listing_id, listing_title,
    listing_price, listing_currency, listing_image_url, module_id, customer_name,
    customer_phone, customer_email, message, status, created_at
`;

function asText(value: unknown, fallback = ""): string {
    return typeof value === "string" ? value : value == null ? fallback : String(value);
}

function asNullableText(value: unknown): string | null {
    const normalized = value == null ? "" : asText(value).trim();
    return normalized || null;
}

function asNumber(value: unknown): number {
    const parsed = typeof value === "number" ? value : Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
}

function asObject(value: unknown): Record<string, unknown> {
    if (value && typeof value === "object" && !Array.isArray(value)) return value as Record<string, unknown>;
    if (typeof value === "string") {
        try {
            const parsed: unknown = JSON.parse(value);
            return parsed && typeof parsed === "object" && !Array.isArray(parsed)
                ? parsed as Record<string, unknown>
                : {};
        } catch {
            return {};
        }
    }
    return {};
}

function valueFrom(data: Record<string, unknown>, camel: string, snake: string): unknown {
    return data[camel] ?? data[snake];
}

function firstImage(data: Record<string, unknown>): string | null {
    const direct = asNullableText(valueFrom(data, "imageUrl", "image_url"));
    if (direct) return direct;
    const images = data.images;
    if (Array.isArray(images)) {
        for (const image of images) {
            if (typeof image === "string" && image.trim()) return image.trim();
            const url = asNullableText(asObject(image).url);
            if (url) return url;
        }
    }
    const imageObject = asObject(images);
    return asNullableText(imageObject.url ?? imageObject.main ?? imageObject.primary);
}

function locationText(data: Record<string, unknown>): string {
    const location = asObject(data.location);
    const parts = [
        location.fullAddress ?? location.full_address ?? location.address,
        location.district,
        location.city,
    ].map(asNullableText).filter((part): part is string => Boolean(part));
    return [...new Set(parts)].join(", ");
}

function isActiveListing(data: Record<string, unknown>): boolean {
    const status = asNullableText(data.status);
    if (status) return status.toLowerCase() === "active";
    return data.isActive === true || data.is_active === true || asText(data.isActive ?? data.is_active).toLowerCase() === "true";
}

function mapListing(row: QueryResultRow): ListingOption | null {
    const data = asObject(row.data);
    if (!isActiveListing(data)) return null;
    const id = asText(row.id).trim();
    const title = asText(data.title).trim();
    const propertyType = asText(valueFrom(data, "propertyType", "property_type")).trim();
    const listingType = asText(valueFrom(data, "listingType", "listing_type")).trim();
    const rawPrice = valueFrom(data, "price", "price");
    const price = typeof rawPrice === "number" ? rawPrice : Number(rawPrice);
    const currency = asText(data.currency).trim();
    if (!id || !title || !propertyType || !listingType || !Number.isFinite(price) || price < 0 || !currency) return null;
    return {
        consultantId: asNullableText(valueFrom(data, "consultantId", "consultant_id")),
        currency,
        description: asNullableText(data.description),
        id,
        imageUrl: firstImage(data),
        listingType,
        locationText: locationText(data),
        price,
        propertyType,
        title,
    };
}

export function mapListingInquiryRecord(row: QueryResultRow): ListingInquiryRecord {
    const status = asText(row.status) as ListingInquiryStatus;
    return {
        businessId: asText(row.business_id),
        businessName: asText(row.business_name),
        businessSlug: asText(row.business_slug),
        cancellable: CANCELLABLE_STATUSES.has(status),
        createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : new Date(asText(row.created_at)).toISOString(),
        customerEmail: asNullableText(row.customer_email),
        customerName: asText(row.customer_name),
        customerPhone: asText(row.customer_phone),
        id: asText(row.id),
        listingCurrency: asText(row.listing_currency),
        listingId: asText(row.listing_id),
        listingImageUrl: asNullableText(row.listing_image_url),
        listingPrice: asNumber(row.listing_price),
        listingTitle: asText(row.listing_title),
        message: asText(row.message),
        moduleId: asText(row.module_id) as ListingModuleId,
        status,
    };
}

function businessQuery(): string {
    return `
        SELECT business.id, business.name, business.slug,
               CASE
                 WHEN business.active_module = 'emlak' THEN 'emlak'
                 WHEN business.active_module = 'realestate' THEN 'realestate'
                 WHEN EXISTS (
                   SELECT 1 FROM business_modules module
                   WHERE module.business_id = business.id AND module.module_key = 'emlak' AND module.is_enabled = true
                 ) THEN 'emlak'
                 WHEN EXISTS (
                   SELECT 1 FROM business_modules module
                   WHERE module.business_id = business.id AND module.module_key = 'realestate' AND module.is_enabled = true
                 ) THEN 'realestate'
                 ELSE NULL
               END AS module_id
        FROM businesses business
        WHERE lower(business.slug) = lower($1)
        LIMIT 1
    `;
}

function physicalListingsQuery(): string {
    return `
        SELECT listing.id::text AS id, to_jsonb(listing) AS data
        FROM em_listings listing
        WHERE listing.business_id::text = $1
          AND lower(COALESCE(listing.status::text, '')) = 'active'
        ORDER BY listing.created_at DESC
        LIMIT 500
    `;
}

function physicalListingIdsQuery(): string {
    return `
        SELECT listing.id::text AS id
        FROM em_listings listing
        WHERE listing.business_id::text = $1
    `;
}

function legacyListingsQuery(): string {
    return `
        SELECT document.id::text AS id, document.data
        FROM app_documents document
        WHERE document.collection = 'em_listings'
          AND COALESCE(document.data->>'businessId', document.data->>'business_id') = $1
          AND CASE
                WHEN document.data ? 'status' THEN lower(document.data->>'status') = 'active'
                ELSE lower(COALESCE(document.data->>'isActive', document.data->>'is_active', 'false')) = 'true'
              END
        ORDER BY document.created_at DESC
        LIMIT 500
    `;
}

function isOptionalStoreError(error: unknown): boolean {
    return Boolean(error && typeof error === "object" && "code" in error
        && (error.code === "42P01" || error.code === "42703"));
}

async function optionalRows(
    execute: ListingInquiryQueryExecutor,
    text: string,
    values: readonly unknown[],
): Promise<QueryResultRow[]> {
    try {
        return (await execute(text, values)).rows;
    } catch (error) {
        if (isOptionalStoreError(error)) return [];
        throw error;
    }
}

async function loadOptions(execute: ListingInquiryQueryExecutor, businessSlug: string): Promise<ListingOptions> {
    const business = (await execute(businessQuery(), [businessSlug])).rows[0];
    const moduleId = business?.module_id as ListingModuleId | undefined;
    if (!business || (moduleId !== "emlak" && moduleId !== "realestate")) return DISABLED_LISTING_OPTIONS;
    const businessId = asText(business.id);
    const [physicalRows, physicalIdRows, legacyRows] = await Promise.all([
        optionalRows(execute, physicalListingsQuery(), [businessId]),
        optionalRows(execute, physicalListingIdsQuery(), [businessId]),
        optionalRows(execute, legacyListingsQuery(), [businessId]),
    ]);
    const listings = new Map<string, ListingOption>();
    const physicalKeys = new Set(
        physicalIdRows
            .map((row) => asText(row.id).trim())
            .filter(Boolean)
            .map((id) => `${businessId}:${id}`),
    );
    for (const row of physicalRows) {
        const listing = mapListing(row);
        if (listing) listings.set(`${businessId}:${listing.id}`, listing);
    }
    for (const row of legacyRows) {
        const listing = mapListing(row);
        const key = listing ? `${businessId}:${listing.id}` : "";
        if (listing && !physicalKeys.has(key) && !listings.has(key)) listings.set(key, listing);
    }
    if (listings.size === 0) return DISABLED_LISTING_OPTIONS;
    return {
        business: { id: businessId, name: asText(business.name), slug: asText(business.slug) },
        listings: [...listings.values()],
        moduleId,
        nativeEnabled: true,
    };
}

function fingerprint(input: CreateOwnedListingInquiryInput): string {
    const stablePayload = [
        input.businessSlug.trim().toLowerCase(),
        input.listingId.trim(),
        input.customerName.trim(),
        input.customerPhone.trim(),
        input.customerEmail?.trim().toLowerCase() ?? null,
        input.message?.trim() || null,
    ];
    return createHash("sha256").update(JSON.stringify(stablePayload)).digest("hex");
}

function idempotentQuery(): string {
    return `
        SELECT ${INQUIRY_COLUMNS}, idempotency_fingerprint
        FROM listing_inquiries
        WHERE app_user_id = $1 AND idempotency_key = $2
        LIMIT 1
    `;
}

function insertQuery(): string {
    return `
        INSERT INTO listing_inquiries (
            id, app_user_id, business_id, business_name, business_slug, listing_id,
            listing_title, module_id, listing_price, listing_currency, listing_image_url,
            customer_name, customer_phone, customer_email, message, status,
            idempotency_key, idempotency_fingerprint
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
        RETURNING ${INQUIRY_COLUMNS}
    `;
}

export function createListingInquiryRepository(
    execute: ListingInquiryQueryExecutor,
    runTransaction: ListingInquiryTransactionRunner = async (operation) => operation(execute),
) {
    return {
        async getOptions(businessSlug: string): Promise<ListingOptions> {
            return loadOptions(execute, businessSlug);
        },

        async listOwned(appUserId: string): Promise<ListingInquiryRecord[]> {
            const result = await execute(`
                SELECT ${INQUIRY_COLUMNS}
                FROM listing_inquiries
                WHERE app_user_id = $1
                ORDER BY created_at DESC
                LIMIT 200
            `, [appUserId]);
            return result.rows.map(mapListingInquiryRecord);
        },

        async createOwned(input: CreateOwnedListingInquiryInput): Promise<ListingInquiryRecord> {
            return runTransaction(async (transaction) => {
                const requestFingerprint = fingerprint(input);
                await transaction("SELECT pg_advisory_xact_lock(hashtext($1))", [
                    `listing-inquiry:${input.appUserId}:${input.idempotencyKey}`,
                ]);
                const existing = (await transaction(idempotentQuery(), [input.appUserId, input.idempotencyKey])).rows[0];
                if (existing) {
                    if (existing.idempotency_fingerprint !== requestFingerprint) {
                        throw new ListingInquiryIdempotencyConflictError();
                    }
                    return mapListingInquiryRecord(existing);
                }

                const options = await loadOptions(transaction, input.businessSlug);
                const listing = options.listings.find((candidate) => candidate.id === input.listingId);
                if (!options.nativeEnabled || !options.business || !options.moduleId || !listing) {
                    throw new ListingInquiryCanonicalDataError();
                }
                const result = await transaction(insertQuery(), [
                    randomUUID(), input.appUserId, options.business.id, options.business.name, options.business.slug,
                    listing.id, listing.title, options.moduleId, listing.price, listing.currency, listing.imageUrl,
                    input.customerName, input.customerPhone, input.customerEmail, input.message, "pending",
                    input.idempotencyKey, requestFingerprint,
                ]);
                return mapListingInquiryRecord(result.rows[0]);
            });
        },

        async cancelOwned(appUserId: string, id: string): Promise<ListingInquiryRecord> {
            const result = await execute(`
                UPDATE listing_inquiries
                SET status = 'cancelled', updated_at = now()
                WHERE app_user_id = $1 AND id = $2 AND status IN ('pending', 'contacted')
                RETURNING ${INQUIRY_COLUMNS}
            `, [appUserId, id]);
            if (result.rows[0]) return mapListingInquiryRecord(result.rows[0]);
            const owned = await execute(
                "SELECT status FROM listing_inquiries WHERE app_user_id = $1 AND id = $2 LIMIT 1",
                [appUserId, id],
            );
            if (!owned.rows[0]) throw new ListingInquiryNotFoundError();
            throw new ListingInquiryStatusConflictError();
        },

        async listBusiness(
            businessId: string,
            filters: { status: ListingInquiryStatus | null },
        ): Promise<ListingInquiryRecord[]> {
            const statusClause = filters.status ? " AND status = $2" : "";
            const values = filters.status ? [businessId, filters.status] : [businessId];
            const result = await execute(`
                SELECT ${INQUIRY_COLUMNS}
                FROM listing_inquiries
                WHERE business_id = $1${statusClause}
                ORDER BY created_at DESC
                LIMIT 200
            `, values);
            return result.rows.map(mapListingInquiryRecord);
        },

        async updateBusinessStatus(
            businessId: string,
            id: string,
            status: ListingInquiryStatus,
        ): Promise<ListingInquiryRecord> {
            const previousStatuses: Partial<Record<ListingInquiryStatus, ListingInquiryStatus[]>> = {
                contacted: ["pending"],
                rejected: ["pending", "contacted"],
                resolved: ["contacted"],
            };
            const allowed = previousStatuses[status];
            if (!allowed) throw new ListingInquiryStatusConflictError();
            const result = await execute(`
                UPDATE listing_inquiries
                SET status = $3, updated_at = now()
                WHERE business_id = $1 AND id = $2 AND status = ANY($4::text[])
                RETURNING ${INQUIRY_COLUMNS}
            `, [businessId, id, status, allowed]);
            if (result.rows[0]) return mapListingInquiryRecord(result.rows[0]);
            const owned = await execute(
                "SELECT status FROM listing_inquiries WHERE business_id = $1 AND id = $2 LIMIT 1",
                [businessId, id],
            );
            if (!owned.rows[0]) throw new ListingInquiryNotFoundError();
            throw new ListingInquiryStatusConflictError();
        },
    };
}

const defaultExecutor: ListingInquiryQueryExecutor = async (text, values) => {
    const { query } = await import("../db/query.ts");
    return query(text, values);
};

const defaultTransactionRunner: ListingInquiryTransactionRunner = async (operation) => {
    const { withTransaction } = await import("../db/transaction.ts");
    return withTransaction(({ query }) => operation(query));
};

export const listingInquiryRepository = createListingInquiryRepository(defaultExecutor, defaultTransactionRunner);
export type ListingInquiryRepository = ReturnType<typeof createListingInquiryRepository>;
