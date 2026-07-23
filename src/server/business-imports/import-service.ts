import {
    ImportError,
    type ProviderCandidate,
    type ReviewCandidateInput,
    type SourceFactInput,
} from "./contracts.ts";
import { createServerPlacesClient, type PlacesClient } from "./places-client.ts";
import {
    businessImportRepository,
    type BusinessImportRepository,
    type ImportBatch,
    type ImportCandidate,
    type StartImportInput,
} from "./repository.ts";

export interface PlatformAdminActor {
    username: string;
    appUserId?: string;
}

export interface ImportBatchSummary {
    id: string;
    status: string;
    importedCount: number;
    matchedCount: number;
    skippedCount: number;
    failedCount: number;
    city: string | null;
    districts: string[];
    updatedAt: string;
}

export interface AdminCandidateProjection extends Omit<ImportCandidate, "provider"> {
    googleAttributionRequired: true;
    provider:
        | { available: true; place: ProviderCandidate }
        | { available: false; errorCode: "provider_unavailable" };
}

export interface ReviewCandidateRequest extends ReviewCandidateInput {
    batchId: string;
    candidateId: string;
}

export interface DiscoveryDispatchJob {
    batchId: string;
    city: "Ordu";
    districts: string[];
}

export interface DiscoveryDispatcher {
    dispatchDiscovery(job: DiscoveryDispatchJob): Promise<void>;
}

export interface BusinessImportService {
    startPetshopDiscovery(input: StartImportInput, actor: PlatformAdminActor): Promise<ImportBatch>;
    getBatch(batchId: string): Promise<ImportBatchSummary>;
    listCandidates(batchId: string): Promise<AdminCandidateProjection[]>;
    reviewCandidate(input: ReviewCandidateRequest, actor: PlatformAdminActor): Promise<ImportCandidate>;
}

export interface CreateBusinessImportServiceOptions extends DiscoveryDispatcher {
    repository: BusinessImportRepository;
    places: PlacesClient;
}

function summarizeBatch(batch: ImportBatch): ImportBatchSummary {
    return {
        id: batch.id,
        status: batch.status,
        importedCount: batch.importedCount,
        matchedCount: batch.matchedCount,
        skippedCount: batch.skippedCount,
        failedCount: batch.failedCount,
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
    return {
        async startPetshopDiscovery(input, actor) {
            const batch = await options.repository.createOrGetBatch({
                ...input,
                actorId: actor.appUserId,
            });
            await options.dispatchDiscovery({
                batchId: batch.id,
                city: "Ordu",
                districts: [...input.districts],
            });
            return batch;
        },

        async getBatch(batchId) {
            return summarizeBatch(await options.repository.getBatch(batchId));
        },

        async listCandidates(batchId) {
            const candidates = await options.repository.listCandidates(batchId);
            return mapWithConcurrency(candidates, 3, async (candidate): Promise<AdminCandidateProjection> => {
                try {
                    const place = await options.places.getPlace(candidate.providerPlaceId);
                    return { ...candidate, googleAttributionRequired: true, provider: { available: true, place } };
                } catch {
                    return {
                        ...candidate,
                        googleAttributionRequired: true,
                        provider: { available: false, errorCode: "provider_unavailable" },
                    };
                }
            });
        },

        async reviewCandidate(input, actor) {
            const batchCandidates = await options.repository.listCandidates(input.batchId);
            if (!batchCandidates.some((candidate) => candidate.id === input.candidateId)) {
                throw new ImportError("invalid_state");
            }
            if (input.decision === "approved" && !hasCompleteProfileFacts(input.sourceFacts ?? [])) {
                throw new ImportError("invalid_state");
            }
            if (input.decision === "duplicate" && (!input.duplicateBusinessId || !input.dedupeReason)) {
                throw new ImportError("invalid_state");
            }

            if (input.sourceFacts) {
                await options.repository.replaceSourceFacts(input.candidateId, input.sourceFacts, actor.appUserId);
            }

            return options.repository.transitionCandidate({
                candidateId: input.candidateId,
                status: input.decision,
                actorId: actor.appUserId,
                ...(input.decision === "duplicate" ? {
                    matchedBusinessId: input.duplicateBusinessId,
                    dedupeReason: input.dedupeReason,
                } : {}),
            });
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

/**
 * HTTP creates the durable running batch; a worker or command process is the
 * only component that performs discovery. This boundary is intentionally
 * awaited so the route never leaves an untracked provider task behind.
 */
const queuedDiscoveryDispatcher: DiscoveryDispatcher = {
    async dispatchDiscovery() {
        // A worker claims running import batches through its configured dispatcher.
    },
};

export const businessImportService = createBusinessImportService({
    repository: businessImportRepository,
    places: serverPlacesClient,
    ...queuedDiscoveryDispatcher,
});
