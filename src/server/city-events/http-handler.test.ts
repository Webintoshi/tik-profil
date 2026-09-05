import assert from "node:assert/strict";
import test from "node:test";

import type { CityEventSnapshot, EventSource } from "./contracts.ts";
import { createCityEventsHandler, parsePublishedEventSources } from "./http-handler.ts";

const snapshot: CityEventSnapshot = {
    city: "ordu",
    source: "biletinial",
    fetchedAt: "2026-09-05T08:30:00.000Z",
    events: [{
        id: "biletinial:event-1",
        source: "biletinial",
        category: "sinema",
        title: "Film",
        sourceUrl: "https://www.biletinial.com/tr-tr/sinema/event-1",
        imageUrl: null,
        sessions: [{
            id: "biletinial:session-1",
            startsAt: "2026-09-05T12:00:00.000Z",
            venueName: "Ordu Cinevizyon",
            venueAddress: null,
            room: null,
            ticketUrl: "https://www.biletinial.com/tr-tr/sinema/event-1",
            ticketUrlKind: "event",
            availability: "unknown",
        }],
    }],
};

function handler(options: {
    publishedSources?: readonly EventSource[];
    readSnapshots?: () => Promise<CityEventSnapshot[]>;
    onError?: (error: unknown) => void;
} = {}) {
    return createCityEventsHandler({
        now: () => new Date("2026-09-05T09:00:00.000Z"),
        publishedSources: options.publishedSources ?? ["biletinial"],
        repository: {
            readSnapshots: options.readSnapshots ?? (async () => [snapshot]),
            saveSnapshot: async () => undefined,
        },
        onError: options.onError,
    });
}

test("valid GET requests return a briefly cacheable public Ordu page", async () => {
    const response = await handler()(new Request("https://tikprofil.com/api/kesfet/events?city=Ordu&category=sinema&limit=20"));

    assert.equal(response.status, 200);
    assert.equal(response.headers.get("cache-control"), "public, max-age=15, s-maxage=60");
    assert.equal(response.headers.get("cdn-cache-control"), "public, max-age=15, s-maxage=60");
    const body = await response.json();
    assert.equal(body.success, true);
    assert.equal(body.page.events.length, 1);
});

test("invalid public query input returns 400 before repository access", async () => {
    let reads = 0;
    const request = handler({
        readSnapshots: async () => {
            reads += 1;
            return [snapshot];
        },
    });

    for (const url of [
        "https://tikprofil.com/api/kesfet/events?city=Giresun",
        "https://tikprofil.com/api/kesfet/events?city=Ordu&category=spor",
        "https://tikprofil.com/api/kesfet/events?city=Ordu&date=05-09-2026",
        "https://tikprofil.com/api/kesfet/events?city=Ordu&limit=-1",
    ]) {
        const response = await request(new Request(url));
        assert.equal(response.status, 400);
        assert.deepEqual(await response.json(), {
            success: false,
            error: { code: "INVALID_CITY_EVENTS_QUERY", message: "Etkinlik sorgusu geçerli değil." },
        });
    }
    assert.equal(reads, 0);
});

test("only explicitly published source snapshots reach the response", async () => {
    const biletiva: CityEventSnapshot = {
        ...snapshot,
        source: "biletiva",
        events: [{
            ...snapshot.events[0],
            id: "biletiva:event-2",
            source: "biletiva",
            sourceUrl: "https://www.biletiva.com/event/event-2",
            sessions: [{
                ...snapshot.events[0]!.sessions[0]!,
                id: "biletiva:session-2",
                ticketUrl: "https://www.biletiva.com/event/event-2",
            }],
        }],
    };
    const response = await handler({
        publishedSources: ["biletiva"],
        readSnapshots: async () => [snapshot, biletiva],
    })(new Request("https://tikprofil.com/api/kesfet/events?city=Ordu"));

    const body = await response.json();
    assert.deepEqual(body.page.events.map(({ source }: { source: string }) => source), ["biletiva"]);
});

test("a missing configured source marks an otherwise usable catalog stale", async () => {
    const response = await handler({
        publishedSources: ["biletinial", "biletiva"],
        readSnapshots: async () => [snapshot],
    })(new Request("https://tikprofil.com/api/kesfet/events?city=Ordu"));

    const body = await response.json();
    assert.equal(response.status, 200);
    assert.equal(body.page.status, "ready");
    assert.equal(body.page.events.length, 1);
    assert.equal(body.page.stale, true);
});

test("no configured publication sources returns awaiting-sync without reading storage", async () => {
    let reads = 0;
    const response = await handler({
        publishedSources: [],
        readSnapshots: async () => {
            reads += 1;
            return [snapshot];
        },
    })(new Request("https://tikprofil.com/api/kesfet/events?city=Ordu"));

    assert.equal(reads, 0);
    assert.equal((await response.json()).page.status, "awaiting-sync");
});

test("repository failures return sanitized no-store 503 responses", async () => {
    let logged: unknown;
    const response = await handler({
        readSnapshots: async () => {
            throw new Error("postgres password=server-secret");
        },
        onError: (error) => {
            logged = error;
        },
    })(new Request("https://tikprofil.com/api/kesfet/events?city=Ordu"));

    assert.equal(response.status, 503);
    assert.match(response.headers.get("cache-control") ?? "", /no-store/);
    const text = await response.text();
    assert.equal(text.includes("server-secret"), false);
    assert.deepEqual(JSON.parse(text), {
        success: false,
        error: { code: "CITY_EVENTS_UNAVAILABLE", message: "Etkinlikler şu anda yüklenemiyor." },
    });
    assert.ok(logged instanceof Error);
});

test("publication configuration is comma-separated, allowlisted and deny-by-default", () => {
    assert.deepEqual(parsePublishedEventSources(undefined), []);
    assert.deepEqual(parsePublishedEventSources(" biletiva,unknown,biletinial,biletiva "), ["biletiva", "biletinial"]);
});
