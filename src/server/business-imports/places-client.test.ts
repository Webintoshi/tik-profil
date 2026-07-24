import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
    PlacesClientError,
    createPlacesClient,
    normalizePhone,
    normalizeTurkishText,
    phoneMatch,
    type PlacesFetch,
} from "./places-client.ts";

function jsonResponse(body: unknown, status = 200): Response {
    return new Response(JSON.stringify(body), {
        status,
        headers: { "Content-Type": "application/json" },
    });
}

test("Places search uses the server key, minimum field mask, Turkish locale, and pagination", async () => {
    let request: Request | undefined;
    const fetch: PlacesFetch = async (input, init) => {
        request = new Request(input, init);
        return jsonResponse({
            places: [{
                id: "place-1",
                displayName: { text: "Ordu Pati" },
                formattedAddress: "Akyazı, 52200 Altınordu/Ordu, Türkiye",
                primaryType: "pet_store",
                location: { latitude: 40.98, longitude: 37.88 },
            }],
            nextPageToken: "next-page",
        });
    };
    const client = createPlacesClient({ apiKey: "server-key", fetch, timeoutMs: 4_000 });

    const page = await client.searchText({ textQuery: "petshop Altınordu Ordu", pageToken: "page-1" });

    assert.equal(request?.url, "https://places.googleapis.com/v1/places:searchText");
    assert.equal(request?.headers.get("X-Goog-Api-Key"), "server-key");
    assert.equal(request?.headers.get("X-Goog-FieldMask"), "places.id,places.displayName,places.formattedAddress,places.primaryType,places.location,nextPageToken");
    assert.deepEqual(await request?.json(), {
        textQuery: "petshop Altınordu Ordu",
        languageCode: "tr",
        regionCode: "tr",
        locationRestriction: {
            rectangle: {
                low: { latitude: 40.35, longitude: 36.7 },
                high: { latitude: 41.25, longitude: 38.2 },
            },
        },
        pageToken: "page-1",
    });
    assert.equal(request?.headers.get("X-Goog-FieldMask")?.match(/photo|review|rating|openingHours/), null);
    assert.deepEqual(page, {
        places: [{
            placeId: "place-1",
            displayName: "Ordu Pati",
            formattedAddress: "Akyazı, 52200 Altınordu/Ordu, Türkiye",
            primaryType: "pet_store",
            latitude: 40.98,
            longitude: 37.88,
        }],
        nextPageToken: "next-page",
    });
});

test("Places search retries rate-limited responses with bounded jitter", async () => {
    let calls = 0;
    const delays: number[] = [];
    const client = createPlacesClient({
        apiKey: "server-key",
        fetch: async () => {
            calls += 1;
            return calls === 1 ? jsonResponse({}, 429) : jsonResponse({ places: [] });
        },
        retryBaseDelayMs: 10,
        random: () => 1,
        sleep: async (delayMs) => { delays.push(delayMs); },
    });

    await client.searchText({ textQuery: "petshop Fatsa Ordu", pageToken: null });

    assert.equal(calls, 2);
    assert.deepEqual(delays, [12]);
});

test("Places search treats Google's empty object response as an empty result page", async () => {
    const client = createPlacesClient({
        apiKey: "server-key",
        fetch: async () => jsonResponse({}),
    });

    assert.deepEqual(
        await client.searchText({ textQuery: "petshop Akkuş Ordu", pageToken: null }),
        { places: [], nextPageToken: null },
    );
});

test("retryable failures make the initial request plus three retries while non-retryable failures make one call", async () => {
    for (const status of [429, 503]) {
        let calls = 0;
        const client = createPlacesClient({
            apiKey: "server-key",
            fetch: async () => {
                calls += 1;
                return jsonResponse({}, status);
            },
            sleep: async () => undefined,
        });

        await assert.rejects(client.searchText({ textQuery: "petshop Ordu", pageToken: null }));
        assert.equal(calls, 4);
    }

    let calls = 0;
    const client = createPlacesClient({
        apiKey: "server-key",
        fetch: async () => {
            calls += 1;
            return jsonResponse({}, 400);
        },
    });

    await assert.rejects(client.searchText({ textQuery: "petshop Ordu", pageToken: null }));
    assert.equal(calls, 1);
});

test("Places search rejects malformed responses and exhausted upstream failures without raw payloads", async () => {
    const malformedClient = createPlacesClient({
        apiKey: "server-key",
        fetch: async () => jsonResponse({ places: [{ id: 123 }] }),
    });
    const unavailableClient = createPlacesClient({
        apiKey: "server-key",
        fetch: async () => jsonResponse({ error: { message: "secret upstream body" } }, 503),
        sleep: async () => undefined,
    });

    await assert.rejects(
        malformedClient.searchText({ textQuery: "petshop Ordu", pageToken: null }),
        (error: unknown) => error instanceof PlacesClientError
            && error.code === "provider_unavailable"
            && !error.message.includes("123"),
    );
    await assert.rejects(
        unavailableClient.searchText({ textQuery: "petshop Ordu", pageToken: null }),
        (error: unknown) => error instanceof PlacesClientError
            && error.code === "provider_unavailable"
            && !error.message.includes("secret upstream body"),
    );
});

test("Places search times out and missing credentials fail before transport", async () => {
    const timeoutClient = createPlacesClient({
        apiKey: "server-key",
        timeoutMs: 5,
        fetch: async (_input, init) => new Promise<Response>((_resolve, reject) => {
            init?.signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")));
        }),
    });
    let called = false;
    const unconfiguredClient = createPlacesClient({
        apiKey: undefined,
        fetch: async () => {
            called = true;
            return jsonResponse({ places: [] });
        },
    });

    await assert.rejects(
        timeoutClient.searchText({ textQuery: "petshop Ordu", pageToken: null }),
        (error: unknown) => error instanceof PlacesClientError && error.code === "provider_unavailable",
    );
    await assert.rejects(
        unconfiguredClient.searchText({ textQuery: "petshop Ordu", pageToken: null }),
        (error: unknown) => error instanceof PlacesClientError && error.code === "provider_not_configured",
    );
    assert.equal(called, false);
});

test("Places search keeps its timeout active while the response body is being read", async () => {
    let bodyObservedAbort = false;
    const client = createPlacesClient({
        apiKey: "server-key",
        timeoutMs: 5,
        fetch: async (_input, init) => ({
            ok: true,
            json: async () => new Promise<unknown>((resolve) => {
                init?.signal?.addEventListener("abort", () => {
                    bodyObservedAbort = true;
                    resolve({});
                });
                setTimeout(() => resolve({ places: [] }), 30);
            }),
        }) as Response,
    });

    await assert.rejects(
        client.searchText({ textQuery: "petshop Ordu", pageToken: null }),
        (error: unknown) => error instanceof PlacesClientError && error.code === "provider_unavailable",
    );
    assert.equal(bodyObservedAbort, true);
});

test("Places getPlace projects live admin fields without a storage dependency", async () => {
    let request: Request | undefined;
    const client = createPlacesClient({
        apiKey: "server-key",
        fetch: async (input, init) => {
            request = new Request(input, init);
            return jsonResponse({
                id: "place-1",
                displayName: { text: "Pati Market" },
                formattedAddress: "Altınordu, Ordu",
                nationalPhoneNumber: "0452 000 00 00",
                internationalPhoneNumber: "+90 452 000 00 00",
                websiteUri: "https://example.com",
                googleMapsUri: "https://maps.google.com/?cid=123",
                rating: 4.6,
                userRatingCount: 87,
                regularOpeningHours: {
                    weekdayDescriptions: ["Pazartesi: 09:00-19:00", "Salı: 09:00-19:00"],
                },
                location: { latitude: 40.98, longitude: 37.88 },
            });
        },
    });

    const place = await client.getPlace("place-1");

    assert.equal(request?.url, "https://places.googleapis.com/v1/places/place-1");
    assert.equal(request?.headers.get("X-Goog-FieldMask"), "id,displayName,formattedAddress,nationalPhoneNumber,internationalPhoneNumber,websiteUri,googleMapsUri,location,rating,userRatingCount,regularOpeningHours");
    assert.deepEqual(place, {
        provider: "google_places",
        placeId: "place-1",
        displayName: "Pati Market",
        formattedAddress: "Altınordu, Ordu",
        nationalPhoneNumber: "0452 000 00 00",
        internationalPhoneNumber: "+90 452 000 00 00",
        websiteUri: "https://example.com",
        googleMapsUri: "https://maps.google.com/?cid=123",
        rating: 4.6,
        userRatingCount: 87,
        weekdayDescriptions: ["Pazartesi: 09:00-19:00", "Salı: 09:00-19:00"],
        latitude: 40.98,
        longitude: 37.88,
    });
});

test("shared Turkish normalization and phone matching handle valid text and known mojibake", () => {
    assert.equal(normalizeTurkishText("Çınar'ın Pati Dünyası"), "cinarin pati dunyasi");
    assert.equal(normalizeTurkishText("\u00C3\u2021\u00C4\u00B1nar'\u00C4\u00B1n Pati D\u00C3\u00BCnyas\u00C4\u00B1"), "cinarin pati dunyasi");
    assert.equal(normalizePhone("+90 (555) 111 22 33"), "905551112233");
    assert.equal(phoneMatch("0555 111 22 33", "+90 555 111 22 33"), true);
});

test("the one-business endpoint keeps Turkish response text free of mojibake", async () => {
    const routeSource = await readFile(new URL("../../app/api/google-places/route.ts", import.meta.url), "utf8");

    assert.doesNotMatch(routeSource, /\\u00C5\\u0178|\\u00C4\\u00B1/);
});
