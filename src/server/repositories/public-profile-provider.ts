import {
    getPublicProfileDataProvider,
    isPublicProfileDualReadCompareEnabled,
} from "../../lib/env.ts";
import { createPublicProfileDualReadComparisonSummary } from "./public-profile-dual-read.ts";
import type {
    PublicProfileDataProvider,
    PublicProfileLookupResult,
} from "./public-profile.types.ts";

interface PublicProfileLogger {
    info(message: string, context?: unknown): void;
    warn(message: string, context?: unknown): void;
}

export interface PublicProfileProviderDependencies {
    getProvider: () => PublicProfileDataProvider;
    isCompareEnabled: () => boolean;
    hasPostgresDatabaseUrl: () => boolean;
    loadLegacyProfile: (slug: string) => Promise<PublicProfileLookupResult>;
    loadPostgresProfile: (slug: string) => Promise<PublicProfileLookupResult>;
    logger: PublicProfileLogger;
}

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

function getDefaultDependencies(): PublicProfileProviderDependencies {
    return {
        getProvider: getPublicProfileDataProvider,
        isCompareEnabled: isPublicProfileDualReadCompareEnabled,
        hasPostgresDatabaseUrl: () => Boolean(process.env.DATABASE_URL?.trim()),
        loadLegacyProfile: async (slug: string) => {
            const repository = await import("./legacy/public-profile.repository.ts");
            return repository.loadPublicProfileBySlug(slug);
        },
        loadPostgresProfile: async (slug: string) => {
            const repository = await import("./postgres/public-profile.repository.ts");
            return repository.loadPublicProfileBySlug(slug);
        },
        logger: console,
    };
}

function getEffectiveProvider(
    dependencies: PublicProfileProviderDependencies,
): PublicProfileDataProvider {
    const provider = dependencies.getProvider();

    if (provider === "postgres" && !dependencies.hasPostgresDatabaseUrl()) {
        dependencies.logger.warn(
            "[PublicProfileProvider] postgres provider requested without DATABASE_URL; falling back to legacy_supabase",
            { provider },
        );
        return "legacy_supabase";
    }

    return provider;
}

function logComparison(
    dependencies: PublicProfileProviderDependencies,
    route: string,
    legacy: PublicProfileLookupResult,
    postgres: PublicProfileLookupResult,
): void {
    const summary = createPublicProfileDualReadComparisonSummary(route, legacy, postgres);

    if (summary.hasDiff) {
        dependencies.logger.warn("[PublicProfileDualRead] profile mismatch detected", summary);
        return;
    }

    dependencies.logger.info("[PublicProfileDualRead] profile comparison matched", {
        route,
        found: summary.legacyFound,
    });
}

export function createPublicProfileProvider(
    overrides: Partial<PublicProfileProviderDependencies> = {},
) {
    const dependencies: PublicProfileProviderDependencies = {
        ...getDefaultDependencies(),
        ...overrides,
    };

    return {
        async loadBySlug(
            route: string,
            slug: string,
            options: { compare?: boolean } = {},
        ): Promise<PublicProfileLookupResult> {
            const provider = getEffectiveProvider(dependencies);
            const shouldCompare =
                (options.compare ?? true) &&
                dependencies.isCompareEnabled() &&
                dependencies.hasPostgresDatabaseUrl();

            if (shouldCompare) {
                const [legacyResult, postgresResult] = await Promise.allSettled([
                    dependencies.loadLegacyProfile(slug),
                    dependencies.loadPostgresProfile(slug),
                ]);

                if (legacyResult.status === "fulfilled" && postgresResult.status === "fulfilled") {
                    logComparison(dependencies, route, legacyResult.value, postgresResult.value);
                } else {
                    dependencies.logger.warn("[PublicProfileDualRead] comparison skipped because one provider failed", {
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
                        dependencies.logger.warn(
                            "[PublicProfileProvider] postgres read failed during dual-read; returning legacy_supabase result",
                            {
                                route,
                                error: serializeError(postgresResult.reason),
                            },
                        );
                        return legacyResult.value;
                    }

                    throw postgresResult.reason;
                }

                if (legacyResult.status === "fulfilled") {
                    return legacyResult.value;
                }

                if (postgresResult.status === "fulfilled") {
                    dependencies.logger.warn(
                        "[PublicProfileProvider] legacy read failed during dual-read; returning postgres comparison result",
                        {
                            route,
                            error: serializeError(legacyResult.reason),
                        },
                    );
                    return postgresResult.value;
                }

                throw legacyResult.reason;
            }

            if (provider === "postgres") {
                try {
                    return await dependencies.loadPostgresProfile(slug);
                } catch (error) {
                    dependencies.logger.warn(
                        "[PublicProfileProvider] postgres read failed; returning legacy_supabase result",
                        {
                            route,
                            error: serializeError(error),
                        },
                    );
                    return dependencies.loadLegacyProfile(slug);
                }
            }

            return dependencies.loadLegacyProfile(slug);
        },
    };
}

export async function loadPublicProfileBySlug(
    route: string,
    slug: string,
    options?: { compare?: boolean },
): Promise<PublicProfileLookupResult> {
    return createPublicProfileProvider().loadBySlug(route, slug, options);
}
