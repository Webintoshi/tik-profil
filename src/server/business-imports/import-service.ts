import {
    ImportError,
    type ProviderCandidate,
    type ReviewCandidateInput,
    type SourceFactInput,
} from "./contracts.ts";
import { createServerPlacesClient, type PlacesClient } from "./places-client.ts";
import { discoverOrduPetshops, type DiscoveredPlaceRef } from "./petshop-discovery.ts";
import {
    businessImportRepository,
    type BusinessImportRepository,
    type ImportBatch,
    type ImportCandidate,
    type StartImportInput,
} from "./repository.ts";

export interface PlatformAdminActor {
    username: string;
    appUserId: string;
}

export interface ImportBatchSummary {
    id: string;
    status: string;
    importedCount: number;
    matchedCount: number;
    skippedCount: number;
    failedCount: number;
    failureCode: string | null;
    city: string | null;
    districts: string[];
    updatedAt: string;
}

export interface AdminCandidateProjection extends Omit<ImportCandidate, "provider"> {
    sourceFacts: SourceFactInput[];
    googleAttributionRequired: true;
    provider:
        | { available: true; place: ProviderCandidate }
        | { available: false; errorCode: "provider_unavailable" };
}

export interface ReviewCandidateRequest extends ReviewCandidateInput {
    batchId: string;
    candidateId: string;
}

export interface BusinessImportService {
    startPetshopDiscovery(input: Omit<StartImportInput, "actorId">, actor: PlatformAdminActor): Promise<ImportBatch>;
    getBatch(batchId: string): Promise<ImportBatchSummary>;
    listCandidates(batchId: string): Promise<AdminCandidateProjection[]>;
    reviewCandidate(input: ReviewCandidateRequest, actor: PlatformAdminActor): Promise<ImportCandidate>;
    runPetshopDiscoveryBatch(batchId: string): Promise<ImportBatch>;
}

export interface CreateBusinessImportServiceOptions {
    repository: BusinessImportRepository;
    places: PlacesClient;
    discoverPetshops?: (input: { client: PlacesClient; districts: readonly string[] }) => Promise<DiscoveredPlaceRef[]>;
}

function summarizeBatch(batch: ImportBatch): ImportBatchSummary {
    return {
        id: batch.id,
        status: batch.status,
        importedCount: batch.importedCount,
        matchedCount: batch.matchedCount,
        skippedCount: batch.skippedCount,
        failedCount: batch.failedCount,
        failureCode: batch.failureCode ?? null,
        city: batch.city,
        districts: batch.districts,
        updatedAt: batch.updatedAt,
    };
}

function hasCompleteProfileFacts(facts: readonly SourceFactInput[]): boolean {
    const keys = new Set(facts.map((fact) => fact.fieldKey));
    return (keys.has("name") || keys.has("business_name"))
        && (keys.has("address") || keys.has("business_address"));
}

function sanitizeDiscoveryFailure(error: unknown): ImportError["code"] {
    if (error instanceof ImportError && error.code !== "import_not_found") return error.code;
    const code = typeof error === "object" && error !== null ? (error as { code?: unknown }).code : undefined;
    return code === "provider_not_configured" || code === "provider_rate_limited" ? code : "provider_unavailable";
}

async function mapWithConcurrency<T, U>(
    values: readonly T[],
    limit: number,
    mapper: (value: T) => Promise<U>,
): Promise<U[]> {
    const results = new Array<U>(values.length);
    let nextIndex = 0;
    const worker = async () => {
        while (nextIndex < values.length) {
            const index = nextIndex;
            nextIndex += 1;
            results[index] = await mapper(values[index]);
        }
    };
    await Promise.all(Array.from({ length: Math.min(limit, values.length) }, worker));
    return results;
}

export function createBusinessImportService(options: CreateBusinessImportServiceOptions): BusinessImportService {
    const discoverPetshops = options.discoverPetshops ?? ((input) => discoverOrduPetshops(input));
    return {
        async startPetshopDiscovery(input, actor) {
            const { batch } = await options.repository.createOrGetBatch({
                ...input,
                actorId: actor.appUserId,
            });
            return batch;
        },

        async getBatch(batchId) {
            return summarizeBatch(await options.repository.getBatch(batchId));
        },

        async listCandidates(batchId) {
            await options.repository.getBatch(batchId);
            const candidates = await options.repository.listCandidates(batchId);
            return mapWithConcurrency(candidates, 3, async (candidate): Promise<AdminCandidateProjection> => {
                const sourceFacts = await options.repository.listSourceFacts(candidate.id);
                try {
                    const place = await options.places.getPlace(candidate.providerPlaceId);
                    return { ...candidate, sourceFacts, googleAttributionRequired: true, provider: { available: true, place } };
                } catch {
                    return {
                        ...candidate,
                        sourceFacts,
                        googleAttributionRequired: true,
                        provider: { available: false, errorCode: "provider_unavailable" },
                    };
                }
            });
        },

        async reviewCandidate(input, actor) {
            await options.repository.getBatch(input.batchId);
            const batchCandidates = await options.repository.listCandidates(input.batchId);
            if (!batchCandidates.some((candidate) => candidate.id === input.candidateId)) {
                throw new ImportError("import_not_found");
            }
            if (input.decision === "duplicate" && (!input.duplicateBusinessId || !input.dedupeReason)) {
                throw new ImportError("invalid_state");
            }

            return options.repository.reviewCandidate({
                candidateId: input.candidateId,
                status: input.decision,
                actorId: actor.appUserId,
                ...(input.sourceFacts ? { sourceFacts: input.sourceFacts } : {}),
                ...(input.decision === "duplicate" ? {
                    matchedBusinessId: input.duplicateBusinessId,
                    dedupeReason: input.dedupeReason,
                } : {}),
            });
        },

        async runPetshopDiscoveryBatch(batchId) {
            const claimed = await options.repository.claimBatch(batchId);
            if (!claimed) return options.repository.getBatch(batchId);
            const batch = claimed;
            const counters = { batchId, importedCount: 0, matchedCount: 0, skippedCount: 0, failedCount: 0 };
            try {
                const discovered = await discoverPetshops({ client: options.places, districts: batch.districts });
                for (const place of discovered) {
                    const candidate = await options.repository.upsertDiscoveredPlace({ ...place, batchId });
                    if (candidate.firstSeenBatchId === batchId) counters.importedCount += 1;
                    else counters.matchedCount += 1;
                }
                return options.repository.completeBatch(counters);
            } catch (error) {
                return options.repository.failBatch({ ...counters, failedCount: counters.failedCount + 1, failureCode: sanitizeDiscoveryFailure(error) });
            }
        },
    };
}

const serverPlacesClient: PlacesClient = {
    async searchText(input) {
        return (await createServerPlacesClient()).searchText(input);
    },
    async getPlace(placeId) {
        return (await createServerPlacesClient()).getPlace(placeId);
    },
};

export const businessImportService = createBusinessImportService({
    repository: businessImportRepository,
    places: serverPlacesClient,
});
