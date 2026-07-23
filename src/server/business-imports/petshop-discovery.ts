import type { PlacesClient, PlacesSearchPlace } from "./places-client.ts";

const DEFAULT_COORDINATE_TTL_MS = 30 * 24 * 60 * 60 * 1_000;
const MAX_COORDINATE_TTL_MS = 2_592_000_000;

export interface DiscoveredPlaceRef {
    provider: "google_places";
    placeId: string;
    districtScope: string;
    temporaryLocation?: {
        latitude: number;
        longitude: number;
        expiresAt: Date;
    };
}

export interface DiscoverOrduPetshopsInput {
    client: PlacesClient;
    districts: readonly string[];
    maxConcurrency?: number;
    now?: () => Date;
    coordinateTtlMs?: number;
}

interface SearchTask {
    districtScope: string;
    textQuery: string;
}

function createSearchTasks(districts: readonly string[]): SearchTask[] {
    return districts.flatMap((districtScope) => [
        { districtScope, textQuery: `petshop ${districtScope} Ordu` },
        { districtScope, textQuery: `evcil hayvan mağazası ${districtScope} Ordu` },
    ]);
}

function validateCoordinateTtlMs(value: number | undefined): number {
    const coordinateTtlMs = value ?? DEFAULT_COORDINATE_TTL_MS;
    if (!Number.isFinite(coordinateTtlMs)
        || !Number.isInteger(coordinateTtlMs)
        || coordinateTtlMs <= 0
        || coordinateTtlMs > MAX_COORDINATE_TTL_MS) {
        throw new RangeError("coordinateTtlMs must be a finite positive integer no greater than 2592000000");
    }
    return coordinateTtlMs;
}

async function searchAllPages(client: PlacesClient, task: SearchTask): Promise<PlacesSearchPlace[]> {
    const places: PlacesSearchPlace[] = [];
    let pageToken: string | null = null;
    do {
        const page = await client.searchText({ textQuery: task.textQuery, pageToken });
        places.push(...page.places);
        pageToken = page.nextPageToken;
    } while (pageToken);
    return places;
}

export async function discoverOrduPetshops(input: DiscoverOrduPetshopsInput): Promise<DiscoveredPlaceRef[]> {
    const coordinateTtlMs = validateCoordinateTtlMs(input.coordinateTtlMs);
    const tasks = createSearchTasks(input.districts);
    const results: Array<{ task: SearchTask; places: PlacesSearchPlace[] }> = new Array(tasks.length);
    const workerCount = Math.min(tasks.length, Math.max(1, Math.min(3, input.maxConcurrency ?? 3)));
    let nextTaskIndex = 0;

    async function worker(): Promise<void> {
        while (nextTaskIndex < tasks.length) {
            const taskIndex = nextTaskIndex;
            nextTaskIndex += 1;
            const task = tasks[taskIndex];
            results[taskIndex] = { task, places: await searchAllPages(input.client, task) };
        }
    }

    await Promise.all(Array.from({ length: workerCount }, worker));

    const now = input.now ?? (() => new Date());
    const discoveredByPlaceId = new Map<string, DiscoveredPlaceRef>();
    for (const result of results) {
        for (const place of result.places) {
            if (discoveredByPlaceId.has(place.placeId)) {
                continue;
            }
            const temporaryLocation = place.latitude !== undefined && place.longitude !== undefined
                ? {
                    latitude: place.latitude,
                    longitude: place.longitude,
                    expiresAt: new Date(now().getTime() + coordinateTtlMs),
                }
                : undefined;
            discoveredByPlaceId.set(place.placeId, {
                provider: "google_places",
                placeId: place.placeId,
                districtScope: result.task.districtScope,
                ...(temporaryLocation ? { temporaryLocation } : {}),
            });
        }
    }
    return [...discoveredByPlaceId.values()];
}
