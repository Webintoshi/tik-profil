import assert from "node:assert/strict";
import test from "node:test";

import { discoverOrduPetshops } from "./petshop-discovery.ts";
import type { PlacesClient } from "./places-client.ts";

test("Ordu discovery searches both Turkish queries, follows pagination, deduplicates IDs, and caps concurrency", async () => {
    const calls: Array<{ textQuery: string; pageToken: string | null }> = [];
    let inFlight = 0;
    let maxInFlight = 0;
    const client: PlacesClient = {
        async searchText(input) {
            calls.push(input);
            inFlight += 1;
            maxInFlight = Math.max(maxInFlight, inFlight);
            await new Promise((resolve) => setTimeout(resolve, 2));
            inFlight -= 1;

            if (input.textQuery === "petshop Altınordu Ordu" && input.pageToken === null) {
                return {
                    places: [{ placeId: "shared", latitude: 40.98, longitude: 37.88 }],
                    nextPageToken: "altinordu-page-2",
                };
            }
            if (input.pageToken === "altinordu-page-2") {
                return { places: [{ placeId: "second" }], nextPageToken: null };
            }
            return {
                places: [{ placeId: input.textQuery.includes("Fatsa") ? "fatsa" : "shared" }],
                nextPageToken: null,
            };
        },
        async getPlace() {
            throw new Error("discovery must not request live admin projections");
        },
    };

    const result = await discoverOrduPetshops({
        client,
        districts: ["Altınordu", "Fatsa"],
        maxConcurrency: 3,
        now: () => new Date("2026-07-23T12:00:00.000Z"),
        coordinateTtlMs: 60_000,
    });

    assert.equal(maxInFlight <= 3, true);
    assert.deepEqual(calls.map((call) => call.textQuery).sort(), [
        "evcil hayvan mağazası Altınordu Ordu",
        "evcil hayvan mağazası Fatsa Ordu",
        "petshop Altınordu Ordu",
        "petshop Altınordu Ordu",
        "petshop Fatsa Ordu",
    ].sort());
    assert.deepEqual(result, [
        {
            provider: "google_places",
            placeId: "shared",
            districtScope: "Altınordu",
            temporaryLocation: {
                latitude: 40.98,
                longitude: 37.88,
                expiresAt: new Date("2026-07-23T12:01:00.000Z"),
            },
        },
        { provider: "google_places", placeId: "second", districtScope: "Altınordu" },
        { provider: "google_places", placeId: "fatsa", districtScope: "Fatsa" },
    ]);
});
