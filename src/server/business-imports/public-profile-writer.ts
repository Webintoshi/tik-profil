import type { SourceFactInput } from "./contracts.ts";
import type { QueryExecutor, QueryTransactionRunner } from "./repository.ts";

export interface VerifiedBusinessProfile {
    businessId: string;
    slug: string;
    sourceFacts: readonly SourceFactInput[];
}

export interface PublicProfileWriter {
    createPending(input: VerifiedBusinessProfile): Promise<{ businessId: string }>;
    ensurePetshopModule(businessId: string): Promise<void>;
    publish(businessId: string): Promise<void>;
    hide(businessId: string, reason: string): Promise<void>;
}

export interface LegacyPublicProfileStore {
    upsertPending(businessId: string, value: Record<string, unknown>): Promise<void>;
    ensurePetshopModule(businessId: string): Promise<void>;
    publish(businessId: string): Promise<void>;
    hide(businessId: string, reason: string): Promise<void>;
}

export interface RuntimePublicProfileStore {
    upsertPending(businessId: string, value: Record<string, unknown>): Promise<void>;
    ensurePetshopModule(businessId: string): Promise<void>;
    publishIfOwned(businessId: string): Promise<boolean>;
    hide(businessId: string, reason: string): Promise<void>;
}

const PROFILE_FACT_KEYS = new Set([
    "name",
    "business_name",
    "city",
    "district",
    "address",
    "business_address",
    "phone",
    "whatsapp",
    "website",
    "website_uri",
]);

function sourceFactMap(sourceFacts: readonly SourceFactInput[]): Map<string, string> {
    const facts = new Map<string, string>();
    for (const fact of sourceFacts) {
        const key = fact.fieldKey.trim().toLowerCase();
        const value = fact.fieldValue.trim();
        if (PROFILE_FACT_KEYS.has(key) && value && !facts.has(key)) facts.set(key, value);
    }
    return facts;
}

function firstFact(facts: Map<string, string>, ...keys: string[]): string | undefined {
    for (const key of keys) {
        const value = facts.get(key);
        if (value) return value;
    }
    return undefined;
}

function buildPendingProfile(input: VerifiedBusinessProfile): Record<string, unknown> {
    const facts = sourceFactMap(input.sourceFacts);
    const name = firstFact(facts, "name", "business_name");
    if (!name) throw new Error("verified_business_name_required");

    const phone = firstFact(facts, "phone");
    const whatsapp = firstFact(facts, "whatsapp") ?? phone;
    const website = firstFact(facts, "website", "website_uri");
    return {
        id: input.businessId,
        slug: input.slug,
        name,
        status: "pending",
        active_module: "petshop",
        modules: ["petshops"],
        industry_id: "petshop",
        industry_label: "Petshop",
        isVerified: true,
        is_verified: true,
        city: firstFact(facts, "city") ?? "",
        district: firstFact(facts, "district") ?? "",
        address: firstFact(facts, "address", "business_address") ?? "",
        phone: phone ?? "",
        whatsapp: whatsapp ?? "",
        socialLinks: website ? { website } : {},
        source: "google_places_verified_import",
    };
}

export function createPublicProfileWriter(dependencies: {
    legacy: LegacyPublicProfileStore;
    runtime: RuntimePublicProfileStore;
}): PublicProfileWriter {
    return {
        async createPending(input) {
            const profile = buildPendingProfile(input);
            await dependencies.legacy.upsertPending(input.businessId, profile);
            await dependencies.runtime.upsertPending(input.businessId, profile);
            return { businessId: input.businessId };
        },

        async ensurePetshopModule(businessId) {
            await dependencies.legacy.ensurePetshopModule(businessId);
            await dependencies.runtime.ensurePetshopModule(businessId);
        },

        async publish(businessId) {
            if (!await dependencies.runtime.publishIfOwned(businessId)) {
                throw new Error("active_owner_required");
            }
            await dependencies.legacy.publish(businessId);
        },

        async hide(businessId, reason) {
            const outcomes = await Promise.allSettled([
                dependencies.runtime.hide(businessId, reason),
                dependencies.legacy.hide(businessId, reason),
            ]);
            if (outcomes.some((outcome) => outcome.status === "rejected")) {
                throw new Error("profile_hide_failed");
            }
        },
    };
}

export function createLegacyPublicProfileStore(): LegacyPublicProfileStore {
    return {
        async upsertPending(businessId, value) {
            const { createDocumentREST } = await import("../../lib/documentStore.ts");
            await createDocumentREST("businesses", value, businessId);
        },
        async ensurePetshopModule(businessId) {
            const { updateDocumentREST } = await import("../../lib/documentStore.ts");
            await updateDocumentREST("businesses", businessId, {
                active_module: "petshop",
                modules: ["petshops"],
                industry_label: "Petshop",
            });
        },
        async publish(businessId) {
            const { updateDocumentREST } = await import("../../lib/documentStore.ts");
            await updateDocumentREST("businesses", businessId, { status: "active" });
        },
        async hide(businessId, reason) {
            const { updateDocumentREST } = await import("../../lib/documentStore.ts");
            await updateDocumentREST("businesses", businessId, {
                status: "hidden",
                provisioningFailureCode: reason,
            });
        },
    };
}

const defaultExecutor: QueryExecutor = async (text, values) => {
    const { query } = await import("../db/query.ts");
    return query(text, values);
};

const defaultTransactionRunner: QueryTransactionRunner = async (operation) => {
    const { withTransaction } = await import("../db/transaction.ts");
    return withTransaction(({ query }) => operation(query as QueryExecutor));
};

export function createRuntimePublicProfileStore(
    execute: QueryExecutor = defaultExecutor,
    runInTransaction: QueryTransactionRunner = defaultTransactionRunner,
): RuntimePublicProfileStore {
    return {
        async upsertPending(businessId, value) {
            await execute(
                `INSERT INTO businesses (
                    id, slug, name, phone, whatsapp, status, industry_id, industry_label,
                    active_module, address, city, district, social_links, is_verified, source, created_at, updated_at
                 ) VALUES ($1, $2, $3, $4, $5, 'pending', 'petshop', 'Petshop', 'petshop', $6, $7, $8, $9::jsonb, true, $10, now(), now())
                 ON CONFLICT (id) DO UPDATE SET
                    slug = EXCLUDED.slug,
                    name = EXCLUDED.name,
                    phone = EXCLUDED.phone,
                    whatsapp = EXCLUDED.whatsapp,
                    status = CASE WHEN businesses.status = 'active' THEN businesses.status ELSE 'pending' END,
                    industry_id = 'petshop',
                    industry_label = 'Petshop',
                    active_module = 'petshop',
                    address = EXCLUDED.address,
                    city = EXCLUDED.city,
                    district = EXCLUDED.district,
                    social_links = EXCLUDED.social_links,
                    is_verified = true,
                    source = EXCLUDED.source,
                    updated_at = now()`,
                [
                    businessId,
                    value.slug,
                    value.name,
                    value.phone || null,
                    value.whatsapp || null,
                    value.address || null,
                    value.city || null,
                    value.district || null,
                    JSON.stringify(value.socialLinks ?? {}),
                    value.source,
                ],
            );
        },
        async ensurePetshopModule(businessId) {
            await execute(
                `INSERT INTO business_modules (business_id, module_key, is_enabled, source)
                 VALUES ($1, 'petshops', true, 'google_places_verified_import')
                 ON CONFLICT (business_id, module_key) DO UPDATE SET
                    is_enabled = true, source = EXCLUDED.source, updated_at = now()`,
                [businessId],
            );
        },
        async publishIfOwned(businessId) {
            return runInTransaction(async (transactionQuery) => {
                const discoveryProfiles = await transactionQuery(
                    `SELECT id
                     FROM business_discovery_profiles
                     WHERE business_id = $1
                     FOR UPDATE`,
                    [businessId],
                );
                if (discoveryProfiles.rows.length !== 1) return false;
                const updated = await transactionQuery(
                    `UPDATE businesses business
                     SET status = 'active', updated_at = now()
                     WHERE business.id = $1
                       AND EXISTS (
                           SELECT 1
                           FROM business_memberships membership
                           INNER JOIN business_roles role
                             ON role.business_id = membership.business_id
                            AND role.id = membership.role_id
                           WHERE membership.business_id = business.id
                             AND membership.membership_status = 'active'
                             AND role.role_key = 'owner'
                       )
                     RETURNING business.id`,
                    [businessId],
                );
                if (!updated.rows[0]) return false;
                const discovery = await transactionQuery(
                    `UPDATE business_discovery_profiles
                     SET discover_status = 'published', updated_at = now()
                     WHERE id = $1
                     RETURNING id`,
                    [discoveryProfiles.rows[0]?.id],
                );
                if (discovery.rows.length !== 1) throw new Error("discovery_profile_publish_failed");
                return true;
            });
        },
        async hide(businessId, reason) {
            await runInTransaction(async (transactionQuery) => {
                await transactionQuery(
                    `UPDATE businesses
                     SET status = 'hidden', updated_at = now()
                     WHERE id = $1`,
                    [businessId],
                );
                await transactionQuery(
                    `UPDATE business_discovery_profiles
                     SET discover_status = 'hidden',
                         metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object('provisioningFailureCode', $2::text),
                         updated_at = now()
                     WHERE business_id = $1`,
                    [businessId, reason],
                );
            });
        },
    };
}

export const publicProfileWriter = createPublicProfileWriter({
    legacy: createLegacyPublicProfileStore(),
    runtime: createRuntimePublicProfileStore(),
});
