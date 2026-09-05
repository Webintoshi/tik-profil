import assert from "node:assert/strict";
import test from "node:test";

import type { CityEventSnapshot } from "./contracts.ts";
import { createCityEventsRepository } from "./repository.ts";

const newer: CityEventSnapshot = {
    city: "ordu",
    source: "biletinial",
    fetchedAt: "2026-09-05T08:00:00.000Z",
    events: [{
        id: "biletinial:event-1",
        source: "biletinial",
        category: "konser",
        title: "Yeni; DROP TABLE city_event_snapshots;",
        sourceUrl: "https://www.biletinial.com/tr-tr/muzik/event-1",
        imageUrl: null,
        sessions: [{
            id: "biletinial:session-1",
            startsAt: "2026-09-06T17:00:00.000Z",
            venueName: "Ordu Kültür Sanat Merkezi",
            venueAddress: null,
            room: null,
            ticketUrl: "https://www.biletinial.com/tr-tr/muzik/event-1",
            ticketUrlKind: "event",
            availability: "unknown",
        }],
    }],
};

test("reads only configured published sources for Ordu and validates stored snapshots", async () => {
    const calls: Array<{ text: string; values: readonly unknown[] }> = [];
    const repository = createCityEventsRepository({
        publishedSources: ["biletinial"],
        query: async (text, values = []) => {
            calls.push({ text, values });
            return { rows: [{ snapshot: newer }] };
        },
    });

    assert.deepEqual(await repository.readSnapshots("ordu"), [newer]);
    assert.deepEqual(calls[0]?.values, ["ordu", ["biletinial"]]);
    assert.match(calls[0]?.text ?? "", /source\s*=\s*ANY/i);
});

test("an empty publication allowlist returns no snapshots without querying PostgreSQL", async () => {
    let queryCalls = 0;
    const repository = createCityEventsRepository({
        publishedSources: [],
        query: async () => {
            queryCalls += 1;
            return { rows: [] };
        },
    });

    assert.deepEqual(await repository.readSnapshots("ordu"), []);
    assert.equal(queryCalls, 0);
});

test("snapshot writes are parameterized and older overlapping runs cannot replace newer data", async () => {
    let stored: CityEventSnapshot | null = null;
    const calls: Array<{ text: string; values: readonly unknown[] }> = [];
    const repository = createCityEventsRepository({
        query: async (text, values = []) => {
            calls.push({ text, values });
            const candidate = JSON.parse(String(values[3])) as CityEventSnapshot;
            if (!stored || new Date(stored.fetchedAt).getTime() <= new Date(candidate.fetchedAt).getTime()) {
                stored = candidate;
            }
            return { rows: [] };
        },
    });

    await repository.saveSnapshot(newer);
    await repository.saveSnapshot({ ...newer, fetchedAt: "2026-09-05T07:59:59.000Z", events: [] });

    assert.deepEqual(stored, newer);
    assert.equal(calls.length, 2);
    assert.deepEqual(calls[0]?.values.slice(0, 3), ["ordu", "biletinial", "2026-09-05T08:00:00.000Z"]);
    assert.equal(String(calls[0]?.values[3]).includes("DROP TABLE"), true);
    assert.equal((calls[0]?.text ?? "").includes("DROP TABLE"), false);
    assert.match(calls[0]?.text ?? "", /ON\s+CONFLICT\s*\(city,\s*source\)/i);
    assert.match(calls[0]?.text ?? "", /WHERE\s+city_event_snapshots\.fetched_at\s*<=\s*EXCLUDED\.fetched_at/i);
});

test("repository failures reject instead of masquerading as an empty catalog", async () => {
    const repository = createCityEventsRepository({
        publishedSources: ["biletinial"],
        query: async () => {
            throw new Error("database unavailable");
        },
    });

    await assert.rejects(repository.readSnapshots("ordu"), /database unavailable/);
});
