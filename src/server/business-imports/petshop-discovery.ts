import type { PlacesClient, PlacesSearchPlace } from "./places-client.ts";
import { normalizeTurkishText } from "./places-client.ts";
import { ORDU_DISTRICTS } from "./contracts.ts";

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

const NORMALIZED_ORDU_DISTRICTS = ORDU_DISTRICTS.map((district) => ({
    district,
    normalized: normalizeTurkishText(district),
}));

const ACCEPTED_GOOGLE_PETSHOP_TYPES = new Set(["pet_store", "store", "pet_care"]);
const PETSHOP_NAME_PATTERN = /(?:pet|pati|akvaryum|akvarym|kuş evi|kedi kumu|\bcat\b|\bcats\b|felin|pleco|paws|su dünyası|water world)/i;
const EXCLUDED_PETSHOP_NAME_PATTERN = /(?:veteriner|kliniği|klinik|damacana)/i;

function isPetshopSearchPlace(place: PlacesSearchPlace): boolean {
    if (!place.displayName) return false;
    if (place.primaryType && !ACCEPTED_GOOGLE_PETSHOP_TYPES.has(place.primaryType)) return false;
    if (EXCLUDED_PETSHOP_NAME_PATTERN.test(place.displayName)) return false;
    return PETSHOP_NAME_PATTERN.test(place.displayName)
        || normalizeTurkishText(place.displayName) === "muhabbeteviordu";
}

function resolveOrduDistrict(formattedAddress: string | undefined): string | null {
    const normalizedAddress = normalizeTurkishText(formattedAddress ?? "");
    if (!/(^| )ordu( turkiye)?$/.test(normalizedAddress)) return null;

    const provinceIndex = normalizedAddress.lastIndexOf(" ordu");
    const districtAddress = provinceIndex >= 0
        ? normalizedAddress.slice(0, provinceIndex)
        : normalizedAddress;
    if (districtAddress.includes("ordu merkez")) return "Altınordu";

    let resolved: { district: string; index: number } | null = null;
    for (const entry of NORMALIZED_ORDU_DISTRICTS) {
        const index = districtAddress.lastIndexOf(entry.normalized);
        if (index >= 0 && (!resolved || index > resolved.index)) {
            resolved = { district: entry.district, index };
        }
    }
    return resolved?.district ?? null;
}

function createSearchTasks(districts: readonly string[]): SearchTask[] {
    const queryTerms = ["petshop", "pet market", "akvaryum", "kuş evi", "evcil hayvan mağazası"];
    return districts.flatMap((districtScope) => queryTerms.map((term) => ({
        districtScope,
        textQuery: `${term} ${districtScope} Ordu`,
    })));
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
    const requestedDistricts = new Set(input.districts);
    const discoveredByPlaceId = new Map<string, DiscoveredPlaceRef>();
    for (const result of results) {
        for (const place of result.places) {
            if (discoveredByPlaceId.has(place.placeId)) {
                continue;
            }
            if (!isPetshopSearchPlace(place)) {
                continue;
            }
            const districtScope = resolveOrduDistrict(place.formattedAddress);
            if (!districtScope || !requestedDistricts.has(districtScope)) {
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
                districtScope,
                ...(temporaryLocation ? { temporaryLocation } : {}),
            });
        }
    }
    return [...discoveredByPlaceId.values()];
}
