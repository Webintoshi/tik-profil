import assert from "node:assert/strict";
import test from "node:test";

import type { CityEvent, CityEventSnapshot } from "./contracts.ts";
import { buildCityEventsPage, CityEventsInputError } from "./service.ts";

const NOW = new Date("2026-09-05T09:00:00.000Z");

function event(overrides: Partial<CityEvent> = {}): CityEvent {
    return {
        id: "biletinial:movie-1",
        source: "biletinial",
        category: "sinema",
        title: "Ordu'da Film",
        sourceUrl: "https://www.biletinial.com/tr-tr/sinema/movie-1",
        imageUrl: null,
        sessions: [
            {
                id: "biletinial:session-1",
                startsAt: "2026-09-05T11:00:00.000Z",
                venueName: "Ordu Cinevizyon",
                venueAddress: null,
                room: "Salon 1",
                ticketUrl: "https://www.biletinial.com/tr-tr/sinema/movie-1/session-1",
                ticketUrlKind: "session",
                availability: "unknown",
            },
        ],
        ...overrides,
    };
}

function snapshot(overrides: Partial<CityEventSnapshot> = {}): CityEventSnapshot {
    return {
        city: "ordu",
        source: "biletinial",
        fetchedAt: "2026-09-05T08:30:00.000Z",
        events: [event()],
        ...overrides,
    };
}

test("future sessions remain visible while expired sessions and empty events are omitted", () => {
    const visible = event({
        sessions: [
            {
                id: "biletinial:past",
                startsAt: "2026-09-05T08:59:59.000Z",
                venueName: "Ordu Cinevizyon",
                venueAddress: null,
                room: null,
                ticketUrl: "https://www.biletinial.com/tr-tr/sinema/past",
                ticketUrlKind: "session",
                availability: "unknown",
            },
            {
                id: "biletinial:future",
                startsAt: "2026-09-05T12:00:01+03:00",
                venueName: "Ordu Cinevizyon",
                venueAddress: null,
                room: null,
                ticketUrl: "https://www.biletinial.com/tr-tr/sinema/future",
                ticketUrlKind: "session",
                availability: "available",
            },
            {
                id: "biletinial:exactly-now",
                startsAt: "2026-09-05T09:00:00.000Z",
                venueName: "Ordu Cinevizyon",
                venueAddress: null,
                room: null,
                ticketUrl: "https://www.biletinial.com/tr-tr/sinema/now",
                ticketUrlKind: "session",
                availability: "unknown",
            },
        ],
    });
    const expired = event({
        id: "biletinial:movie-expired",
        sessions: [{ ...visible.sessions[0], id: "biletinial:expired-only" }],
    });

    const page = buildCityEventsPage(
        [snapshot({ events: [visible, expired] })],
        { city: "Ordu", category: "sinema", limit: 20 },
        NOW,
    );

    assert.equal(page.events.length, 1);
    assert.deepEqual(page.events[0]?.sessions.map((session) => session.startsAt), [
        "2026-09-05T09:00:01.000Z",
    ]);
    assert.equal(page.total, 1);
    assert.equal(page.categories.find(({ slug }) => slug === "sinema")?.count, 1);
});

test("date filtering uses Europe/Istanbul and category counts distinct events", () => {
    const cinema = event({
        sessions: [
            { ...event().sessions[0], startsAt: "2026-09-05T20:59:59.000Z" },
            { ...event().sessions[0], id: "biletinial:session-2", startsAt: "2026-09-05T21:00:00.000Z" },
        ],
    });
    const theatre = event({
        id: "biletinial:play-1",
        category: "tiyatro",
        title: "Oyun",
        sessions: [{ ...event().sessions[0], id: "biletinial:play-session", startsAt: "2026-09-06T17:00:00.000Z" }],
    });

    const page = buildCityEventsPage(
        [snapshot({ events: [cinema, theatre] })],
        { city: "Ordu", category: "sinema", date: "2026-09-06" },
        NOW,
    );

    assert.deepEqual(page.events.map(({ id }) => id), ["biletinial:movie-1"]);
    assert.deepEqual(page.events[0]?.sessions.map(({ startsAt }) => startsAt), ["2026-09-05T21:00:00.000Z"]);
    assert.equal(page.categories.find(({ slug }) => slug === "sinema")?.count, 1);
    assert.equal(page.categories.find(({ slug }) => slug === "tiyatro")?.count, 1);
});

test("pagination is deterministic, cursor based and capped at fifty", () => {
    const events = Array.from({ length: 52 }, (_, index) => event({
        id: `biletinial:movie-${String(index + 1).padStart(2, "0")}`,
        title: `Film ${index + 1}`,
        sessions: [{
            ...event().sessions[0],
            id: `biletinial:session-${index + 1}`,
            startsAt: new Date(Date.UTC(2026, 8, 6, 11 + index)).toISOString(),
        }],
    }));

    const first = buildCityEventsPage([snapshot({ events: [...events].reverse() })], { city: "Ordu", limit: 500 }, NOW);
    assert.equal(first.events.length, 50);
    assert.equal(first.total, 52);
    assert.ok(first.nextCursor);

    const second = buildCityEventsPage([snapshot({ events })], { city: "Ordu", cursor: first.nextCursor ?? undefined, limit: 500 }, NOW);
    assert.deepEqual(second.events.map(({ id }) => id), ["biletinial:movie-51", "biletinial:movie-52"]);
    assert.equal(second.nextCursor, null);
});

test("freshness uses the oldest published snapshot and empty input awaits sync", () => {
    const fresh = snapshot({ source: "biletinial", fetchedAt: "2026-09-05T08:00:00.000Z" });
    const old = snapshot({
        source: "biletiva",
        fetchedAt: "2026-09-03T20:59:59.000Z",
        events: [event({
            id: "biletiva:movie-2",
            source: "biletiva",
            sourceUrl: "https://www.biletiva.com/event/movie-2",
            sessions: [{
                ...event().sessions[0],
                id: "biletiva:session-2",
                ticketUrl: "https://www.biletiva.com/event/movie-2",
            }],
        })],
    });

    const ready = buildCityEventsPage([fresh, old], { city: "Ordu" }, NOW);
    assert.equal(ready.status, "ready");
    assert.equal(ready.updatedAt, "2026-09-03T20:59:59.000Z");
    assert.equal(ready.stale, true);

    assert.deepEqual(buildCityEventsPage([], { city: "Ordu" }, NOW), {
        city: "Ordu",
        categories: [
            { slug: "sinema", label: "Sinema", count: 0 },
            { slug: "tiyatro", label: "Tiyatro", count: 0 },
            { slug: "konser", label: "Konser", count: 0 },
            { slug: "cocuk", label: "Çocuk Etkinlikleri", count: 0 },
        ],
        events: [],
        total: 0,
        nextCursor: null,
        updatedAt: null,
        stale: false,
        status: "awaiting-sync",
    });
});

test("invalid city, category, date and cursor inputs are rejected", () => {
    const invalidQueries = [
        { city: "Giresun" },
        { city: "Ordu", category: "spor" },
        { city: "Ordu", date: "2026-02-30" },
        { city: "Ordu", cursor: "not-a-city-events-cursor" },
        { city: "Ordu", cursor: Buffer.from(JSON.stringify({ v: 1, startsAt: "not-a-date", id: "biletinial:event-1" })).toString("base64url") },
        { city: "Ordu", limit: 0 },
    ];

    for (const query of invalidQueries) {
        assert.throws(() => buildCityEventsPage([snapshot()], query, NOW), CityEventsInputError);
    }
});

test("malformed snapshots reject duplicate IDs, unknown categories, wrong city and unsafe URLs", () => {
    const malformed = [
        snapshot({ events: [event(), event()] }),
        snapshot({ events: [event({ category: "spor" as never })] }),
        snapshot({ city: "giresun" as never }),
        snapshot({ events: [event({ id: "movie-without-source-prefix" })] }),
        snapshot({ events: [event({ sourceUrl: "http://www.biletinial.com/event/1" })] }),
        snapshot({ events: [event({ sessions: [{ ...event().sessions[0], ticketUrl: "https://biletinial.com.evil.test/event/1" }] })] }),
        snapshot({ events: [event({ sessions: [{ ...event().sessions[0], startsAt: "2026-09-06T14:00:00" }] })] }),
        snapshot({ events: [event({ imageUrl: "https://cdn.example.com/poster.jpg" })] }),
    ];

    for (const value of malformed) {
        assert.throws(() => buildCityEventsPage([value], { city: "Ordu" }, NOW));
    }
});
