import {
    getBusinessDataProvider,
    isBusinessDualReadCompareEnabled,
    type BusinessDataProvider,
} from "@/lib/env";
import { hasPostgresDatabaseUrl } from "@/server/db/postgres";
import type { KesfetPublicBusiness } from "./businesses.types";
import * as legacyBusinessesRepository from "./legacy/businesses.repository";
import * as postgresBusinessesRepository from "./postgres/businesses.repository";

function serializeError(error: unknown): { name?: string; message: string } {
    if (error instanceof Error) {
        return {
            name: error.name,
            message: error.message,
        };
    }

    return {
        message: String(error),
    };
}

function getBusinessIdentifiers(
    businesses: readonly KesfetPublicBusiness[],
    key: "id" | "slug",
): string[] {
    return [...new Set(
        businesses
            .map((business) => {
                const value = key === "slug"
                    ? business.slug.trim().toLowerCase()
                    : business.id.trim();
                return value || null;
            })
            .filter((value): value is string => Boolean(value)),
    )].sort();
}

function getMissingValues(source: readonly string[], target: ReadonlySet<string>): string[] {
    return source.filter((value) => !target.has(value)).slice(0, 5);
}

function logDualReadComparison(
    route: string,
    legacyBusinesses: readonly KesfetPublicBusiness[],
    postgresBusinesses: readonly KesfetPublicBusiness[],
) {
    const legacyIds = getBusinessIdentifiers(legacyBusinesses, "id");
    const postgresIds = getBusinessIdentifiers(postgresBusinesses, "id");
    const legacySlugs = getBusinessIdentifiers(legacyBusinesses, "slug");
    const postgresSlugs = getBusinessIdentifiers(postgresBusinesses, "slug");
    const postgresIdSet = new Set(postgresIds);
    const legacyIdSet = new Set(legacyIds);
    const postgresSlugSet = new Set(postgresSlugs);
    const legacySlugSet = new Set(legacySlugs);

    const summary = {
        route,
        legacyCount: legacyBusinesses.length,
        postgresCount: postgresBusinesses.length,
        idsMissingInPostgres: getMissingValues(legacyIds, postgresIdSet),
        idsMissingInLegacy: getMissingValues(postgresIds, legacyIdSet),
        slugsMissingInPostgres: getMissingValues(legacySlugs, postgresSlugSet),
        slugsMissingInLegacy: getMissingValues(postgresSlugs, legacySlugSet),
    };

    const hasDiff =
        summary.legacyCount !== summary.postgresCount ||
        summary.idsMissingInPostgres.length > 0 ||
        summary.idsMissingInLegacy.length > 0 ||
        summary.slugsMissingInPostgres.length > 0 ||
        summary.slugsMissingInLegacy.length > 0;

    if (hasDiff) {
        console.warn("[BusinessDualRead] discovery mismatch detected", summary);
        return;
    }

    console.info("[BusinessDualRead] discovery comparison matched", {
        route,
        count: summary.legacyCount,
    });
}

function getEffectiveBusinessDataProvider(): BusinessDataProvider {
    const provider = getBusinessDataProvider();

    if (provider === "postgres" && !hasPostgresDatabaseUrl()) {
        console.warn("[BusinessProvider] postgres provider requested without DATABASE_URL; falling back to legacy_supabase", {
            provider,
        });
        return "legacy_supabase";
    }

    return provider;
}

async function loadLegacyBusinesses(): Promise<KesfetPublicBusiness[]> {
    return legacyBusinessesRepository.listActiveBusinessesForDiscovery();
}

async function loadPostgresBusinesses(): Promise<KesfetPublicBusiness[]> {
    return postgresBusinessesRepository.listActiveBusinessesForDiscovery();
}

export async function loadKesfetBusinessesForDiscovery(
    route: string,
): Promise<KesfetPublicBusiness[]> {
    const provider = getEffectiveBusinessDataProvider();
    const shouldCompare = isBusinessDualReadCompareEnabled() && hasPostgresDatabaseUrl();

    if (shouldCompare) {
        const [legacyResult, postgresResult] = await Promise.allSettled([
            loadLegacyBusinesses(),
            loadPostgresBusinesses(),
        ]);

        if (legacyResult.status === "fulfilled" && postgresResult.status === "fulfilled") {
            logDualReadComparison(route, legacyResult.value, postgresResult.value);
        } else {
            console.warn("[BusinessDualRead] comparison skipped because one provider failed", {
                route,
                legacy: legacyResult.status === "rejected" ? serializeError(legacyResult.reason) : "ok",
                postgres: postgresResult.status === "rejected" ? serializeError(postgresResult.reason) : "ok",
            });
        }

        if (provider === "postgres") {
            if (postgresResult.status === "fulfilled") {
                return postgresResult.value;
            }

            if (legacyResult.status === "fulfilled") {
                console.warn("[BusinessProvider] postgres read failed during dual-read; returning legacy_supabase result", {
                    route,
                    error: serializeError(postgresResult.reason),
                });
                return legacyResult.value;
            }

            throw postgresResult.reason;
        }

        if (legacyResult.status === "fulfilled") {
            return legacyResult.value;
        }

        if (postgresResult.status === "fulfilled") {
            console.warn("[BusinessProvider] legacy read failed during dual-read; returning postgres comparison result", {
                route,
                error: serializeError(legacyResult.reason),
            });
            return postgresResult.value;
        }

        throw legacyResult.reason;
    }

    if (provider === "postgres") {
        try {
            return await loadPostgresBusinesses();
        } catch (error) {
            console.warn("[BusinessProvider] postgres read failed; returning legacy_supabase result", {
                route,
                error: serializeError(error),
            });
            return loadLegacyBusinesses();
        }
    }

    return loadLegacyBusinesses();
}
