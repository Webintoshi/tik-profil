import type { ProviderCandidate } from "./contracts.ts";

const PLACES_API_BASE_URL = "https://places.googleapis.com/v1";
const SEARCH_FIELD_MASK = "places.id,places.displayName,places.formattedAddress,places.primaryType,places.location,nextPageToken";
const PLACE_FIELD_MASK = "id,displayName,formattedAddress,nationalPhoneNumber,internationalPhoneNumber,websiteUri,googleMapsUri,location,rating,userRatingCount,regularOpeningHours";
const MAX_RETRY_ATTEMPTS = 3;
const ORDU_LOCATION_RESTRICTION = {
    rectangle: {
        low: { latitude: 40.35, longitude: 36.7 },
        high: { latitude: 41.25, longitude: 38.2 },
    },
} as const;

export type PlacesFetch = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

export interface PlacesSearchPlace {
    placeId: string;
    displayName?: string;
    formattedAddress?: string;
    primaryType?: string;
    latitude?: number;
    longitude?: number;
}

export interface PlacesSearchPage {
    places: PlacesSearchPlace[];
    nextPageToken: string | null;
}

export interface PlacesClient {
    searchText(input: { textQuery: string; pageToken: string | null }): Promise<PlacesSearchPage>;
    getPlace(placeId: string): Promise<ProviderCandidate>;
}

export type PlacesClientErrorCode = "provider_not_configured" | "provider_rate_limited" | "provider_unavailable";

export class PlacesClientError extends Error {
    readonly code: PlacesClientErrorCode;

    constructor(code: PlacesClientErrorCode) {
        super(code);
        this.name = "PlacesClientError";
        this.code = code;
    }
}

export interface CreatePlacesClientOptions {
    apiKey?: string;
    fetch?: PlacesFetch;
    timeoutMs?: number;
    retryBaseDelayMs?: number;
    random?: () => number;
    sleep?: (delayMs: number) => Promise<void>;
}

interface PlacesRequestOptions {
    path: string;
    method: "GET" | "POST";
    fieldMask: string;
    body?: unknown;
}

const MOJIBAKE_TURKISH_REPLACEMENTS: ReadonlyArray<readonly [string, string]> = [
    ["\u00C3\u2021", "C"], ["\u00C3\u00A7", "c"], ["\u00C4\u009E", "G"], ["\u00C4\u009F", "g"],
    ["\u00C4\u00B0", "I"], ["\u00C4\u00B1", "i"], ["\u00C3\u0096", "O"], ["\u00C3\u00B6", "o"],
    ["\u00C5\u0178", "S"], ["\u00C5\u015F", "s"], ["\u00C3\u009C", "U"], ["\u00C3\u00BC", "u"],
];

export function normalizeTurkishText(value: string): string {
    let normalized = value || "";
    for (const [malformed, replacement] of MOJIBAKE_TURKISH_REPLACEMENTS) {
        normalized = normalized.replaceAll(malformed, replacement);
    }

    return normalized
        .toLocaleLowerCase("tr-TR")
        .replaceAll("\u0131", "i")
        .replaceAll("\u011F", "g")
        .replaceAll("\u00FC", "u")
        .replaceAll("\u015F", "s")
        .replaceAll("\u00F6", "o")
        .replaceAll("\u00E7", "c")
        .normalize("NFD")
        .replace(/[\u0300-\u036F]/g, "")
        .replace(/['\u2019]/g, "")
        .replace(/[^a-z0-9\s]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

export function normalizePhone(phone: string): string {
    return (phone || "").replace(/\D/g, "");
}

export function phoneMatch(firstPhone: string, secondPhone: string): boolean {
    const first = normalizePhone(firstPhone);
    const second = normalizePhone(secondPhone);
    return Boolean(first && second && first.slice(-10) === second.slice(-10));
}

function defaultSleep(delayMs: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, delayMs));
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function parseLocation(value: unknown): { latitude: number; longitude: number } | undefined {
    if (!isRecord(value) || typeof value.latitude !== "number" || typeof value.longitude !== "number") {
        return undefined;
    }
    if (!Number.isFinite(value.latitude) || !Number.isFinite(value.longitude)) {
        return undefined;
    }
    return { latitude: value.latitude, longitude: value.longitude };
}

function parseSearchPage(value: unknown): PlacesSearchPage {
    if (!isRecord(value) || (value.places !== undefined && !Array.isArray(value.places))) {
        throw new PlacesClientError("provider_unavailable");
    }

    const places = (value.places ?? []).map((place): PlacesSearchPlace => {
        if (!isRecord(place) || typeof place.id !== "string" || !place.id.trim()) {
            throw new PlacesClientError("provider_unavailable");
        }
        const location = parseLocation(place.location);
        const displayName = isRecord(place.displayName) ? optionalString(place.displayName.text) : undefined;
        const formattedAddress = optionalString(place.formattedAddress);
        const primaryType = optionalString(place.primaryType);
        return {
            placeId: place.id,
            ...(displayName ? { displayName } : {}),
            ...(formattedAddress ? { formattedAddress } : {}),
            ...(primaryType ? { primaryType } : {}),
            ...(location ?? {}),
        };
    });
    const nextPageToken = typeof value.nextPageToken === "string" && value.nextPageToken.trim()
        ? value.nextPageToken
        : null;
    return { places, nextPageToken };
}

function optionalString(value: unknown): string | undefined {
    return typeof value === "string" && value.trim() ? value : undefined;
}

function optionalFiniteNumber(value: unknown): number | undefined {
    return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function parseWeekdayDescriptions(value: unknown): string[] | undefined {
    if (!isRecord(value) || !Array.isArray(value.weekdayDescriptions)) return undefined;
    const descriptions = value.weekdayDescriptions.filter(
        (description): description is string => typeof description === "string" && Boolean(description.trim()),
    );
    return descriptions.length ? descriptions : undefined;
}

function parsePlace(value: unknown, requestedPlaceId: string): ProviderCandidate {
    if (!isRecord(value) || typeof value.id !== "string" || value.id !== requestedPlaceId) {
        throw new PlacesClientError("provider_unavailable");
    }

    const displayName = isRecord(value.displayName) ? optionalString(value.displayName.text) : undefined;
    const formattedAddress = optionalString(value.formattedAddress);
    const nationalPhoneNumber = optionalString(value.nationalPhoneNumber);
    const internationalPhoneNumber = optionalString(value.internationalPhoneNumber);
    const websiteUri = optionalString(value.websiteUri);
    const googleMapsUri = optionalString(value.googleMapsUri);
    const rating = optionalFiniteNumber(value.rating);
    const userRatingCount = optionalFiniteNumber(value.userRatingCount);
    const weekdayDescriptions = parseWeekdayDescriptions(value.regularOpeningHours);
    const location = parseLocation(value.location);
    return {
        provider: "google_places",
        placeId: value.id,
        ...(displayName ? { displayName } : {}),
        ...(formattedAddress ? { formattedAddress } : {}),
        ...(nationalPhoneNumber ? { nationalPhoneNumber } : {}),
        ...(internationalPhoneNumber ? { internationalPhoneNumber } : {}),
        ...(websiteUri ? { websiteUri } : {}),
        ...(googleMapsUri ? { googleMapsUri } : {}),
        ...(rating !== undefined ? { rating } : {}),
        ...(userRatingCount !== undefined ? { userRatingCount } : {}),
        ...(weekdayDescriptions ? { weekdayDescriptions } : {}),
        ...(location ?? {}),
    };
}

export function createPlacesClient(options: CreatePlacesClientOptions): PlacesClient {
    const apiKey = options.apiKey?.trim();
    const fetch = options.fetch ?? globalThis.fetch.bind(globalThis);
    const timeoutMs = options.timeoutMs ?? 8_000;
    const retryBaseDelayMs = options.retryBaseDelayMs ?? 250;
    const random = options.random ?? Math.random;
    const sleep = options.sleep ?? defaultSleep;

    async function request(requestOptions: PlacesRequestOptions): Promise<unknown> {
        if (!apiKey) {
            throw new PlacesClientError("provider_not_configured");
        }

        for (let attempt = 0; attempt <= MAX_RETRY_ATTEMPTS; attempt += 1) {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), timeoutMs);
            let response: Response;
            try {
                response = await fetch(`${PLACES_API_BASE_URL}${requestOptions.path}`, {
                    method: requestOptions.method,
                    headers: {
                        "Content-Type": "application/json",
                        "X-Goog-Api-Key": apiKey,
                        "X-Goog-FieldMask": requestOptions.fieldMask,
                    },
                    ...(requestOptions.body === undefined ? {} : { body: JSON.stringify(requestOptions.body) }),
                    signal: controller.signal,
                });

                if (response.ok) {
                    const value = await response.json();
                    if (controller.signal.aborted) {
                        throw new PlacesClientError("provider_unavailable");
                    }
                    return value;
                }
            } catch {
                throw new PlacesClientError("provider_unavailable");
            } finally {
                clearTimeout(timeout);
            }

            const retryable = response.status === 429 || response.status >= 500;
            if (!retryable || attempt === MAX_RETRY_ATTEMPTS) {
                throw new PlacesClientError(response.status === 429 ? "provider_rate_limited" : "provider_unavailable");
            }

            const exponentialDelay = retryBaseDelayMs * (2 ** attempt);
            const jitter = Math.floor(random() * retryBaseDelayMs * 0.25);
            await sleep(exponentialDelay + jitter);
        }

        throw new PlacesClientError("provider_unavailable");
    }

    return {
        async searchText(input) {
            const response = await request({
                path: "/places:searchText",
                method: "POST",
                fieldMask: SEARCH_FIELD_MASK,
                body: {
                    textQuery: input.textQuery,
                    languageCode: "tr",
                    regionCode: "tr",
                    locationRestriction: ORDU_LOCATION_RESTRICTION,
                    ...(input.pageToken ? { pageToken: input.pageToken } : {}),
                },
            });
            return parseSearchPage(response);
        },
        async getPlace(placeId) {
            const response = await request({
                path: `/places/${encodeURIComponent(placeId)}`,
                method: "GET",
                fieldMask: PLACE_FIELD_MASK,
            });
            return parsePlace(response, placeId);
        },
    };
}

/** Server callers obtain the secret only through the Task 2 server-only module. */
export async function createServerPlacesClient(
    options: Omit<CreatePlacesClientOptions, "apiKey"> = {},
): Promise<PlacesClient> {
    const { getGoogleMapsApiKey } = await import("./env.ts");
    return createPlacesClient({ ...options, apiKey: getGoogleMapsApiKey() });
}
