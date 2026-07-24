import assert from "node:assert/strict";
import test from "node:test";

import { discoverOrduPetshops } from "./petshop-discovery.ts";
import type { PlacesClient } from "./places-client.ts";

test("Ordu discovery searches the complete pet-store vocabulary, follows pagination, deduplicates IDs, and caps concurrency", async () => {
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
                    places: [{
                        placeId: "shared",
                        displayName: "Pati Pet Market",
                        primaryType: "pet_store",
                        formattedAddress: "Akyazı, 52200 Altınordu/Ordu, Türkiye",
                        latitude: 40.98,
                        longitude: 37.88,
                    }],
                    nextPageToken: "altinordu-page-2",
                };
            }
            if (input.pageToken === "altinordu-page-2") {
                return {
                    places: [{ placeId: "second", displayName: "Klas Pet Shop", primaryType: "pet_store", formattedAddress: "Bucak, 52200 Altınordu/Ordu, Türkiye" }],
                    nextPageToken: null,
                };
            }
            return {
                places: [{
                    placeId: input.textQuery.includes("Fatsa") ? "fatsa" : "shared",
                    displayName: input.textQuery.includes("Fatsa") ? "Fatsa Pet Market" : "Pati Pet Market",
                    primaryType: "pet_store",
                    formattedAddress: input.textQuery.includes("Fatsa")
                        ? "Dumlupınar, 52400 Fatsa/Ordu, Türkiye"
                        : "Akyazı, 52200 Altınordu/Ordu, Türkiye",
                }],
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
        "akvaryum Altınordu Ordu",
        "akvaryum Fatsa Ordu",
        "evcil hayvan mağazası Altınordu Ordu",
        "evcil hayvan mağazası Fatsa Ordu",
        "kuş evi Altınordu Ordu",
        "kuş evi Fatsa Ordu",
        "pet market Altınordu Ordu",
        "pet market Fatsa Ordu",
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

test("Ordu discovery accepts the exact 30-day coordinate TTL and rejects invalid TTLs before provider calls", async () => {
    const maximumTtlMs = 2_592_000_000;
    let calls = 0;
    const client: PlacesClient = {
        async searchText() {
            calls += 1;
            return {
                places: [{
                    placeId: "place-1",
                    displayName: "Fatsa Pet Market",
                    primaryType: "pet_store",
                    formattedAddress: "Dumlupınar, 52400 Fatsa/Ordu, Türkiye",
                    latitude: 40.98,
                    longitude: 37.88,
                }],
                nextPageToken: null,
            };
        },
        async getPlace() {
            throw new Error("discovery must not request live admin projections");
        },
    };
    const now = new Date("2026-07-23T12:00:00.000Z");

    const result = await discoverOrduPetshops({
        client,
        districts: ["Fatsa"],
        coordinateTtlMs: maximumTtlMs,
        now: () => now,
    });

    assert.equal(result[0]?.temporaryLocation?.expiresAt.getTime(), now.getTime() + maximumTtlMs);
    assert.equal(calls, 5);

    for (const coordinateTtlMs of [-1, 0, 0.5, Number.NaN, Number.POSITIVE_INFINITY, maximumTtlMs + 1]) {
        calls = 0;
        await assert.rejects(
            discoverOrduPetshops({ client, districts: ["Fatsa"], coordinateTtlMs }),
            (error: unknown) => error instanceof RangeError
                && error.message === "coordinateTtlMs must be a finite positive integer no greater than 2592000000",
        );
        assert.equal(calls, 0);
    }
});

test("discovery trusts the Google address for district scope and rejects results outside Ordu", async () => {
    const client: PlacesClient = {
        async searchText(input) {
            if (input.textQuery.includes("Akkuş")) {
                return {
                    places: [
                        { placeId: "altinordu-place", displayName: "Altınordu Petshop", primaryType: "pet_store", formattedAddress: "Akyazı, 52200 Altınordu/Ordu, Türkiye" },
                        { placeId: "akkus-place", displayName: "Akkuş Petshop", primaryType: "pet_store", formattedAddress: "Merkez, 52950 Akkuş/Ordu, Türkiye" },
                        { placeId: "samsun-place", displayName: "Samsun Petshop", primaryType: "pet_store", formattedAddress: "Atakum/Samsun, Türkiye" },
                    ],
                    nextPageToken: null,
                } as never;
            }
            return { places: [], nextPageToken: null };
        },
        async getPlace() {
            throw new Error("discovery must not request details");
        },
    };

    const onlyAkkus = await discoverOrduPetshops({ client, districts: ["Akkuş"] });
    assert.deepEqual(onlyAkkus.map(({ placeId, districtScope }) => ({ placeId, districtScope })), [
        { placeId: "akkus-place", districtScope: "Akkuş" },
    ]);

    const akkusAndAltinordu = await discoverOrduPetshops({ client, districts: ["Akkuş", "Altınordu"] });
    assert.deepEqual(akkusAndAltinordu.map(({ placeId, districtScope }) => ({ placeId, districtScope })), [
        { placeId: "altinordu-place", districtScope: "Altınordu" },
        { placeId: "akkus-place", districtScope: "Akkuş" },
    ]);
});

test("discovery accepts Google pet shops stored as pet_store, store, or pet_care and rejects unrelated types", async () => {
    const client: PlacesClient = {
        async searchText() {
            return {
                places: [
                    { placeId: "pet-store", displayName: "Fatsa Pet Market", primaryType: "pet_store", formattedAddress: "Dumlupınar, 52400 Fatsa/Ordu, Türkiye" },
                    { placeId: "generic-store", displayName: "Elidopet", primaryType: "store", formattedAddress: "Sakarya, 52400 Fatsa/Ordu, Türkiye" },
                    { placeId: "pet-care", displayName: "Queen Pet Store", primaryType: "pet_care", formattedAddress: "Akyazı, 52200 Altınordu/Ordu, Türkiye" },
                    { placeId: "unrelated-store", displayName: "Akkuş Tuhafiye", primaryType: "store", formattedAddress: "Merkez, 52950 Akkuş/Ordu, Türkiye" },
                    { placeId: "bottle-store", displayName: "Bulak Su Ordu Pet ve Damacana Bayii", primaryType: "store", formattedAddress: "Durugöl, 52200 Altınordu/Ordu, Türkiye" },
                    { placeId: "veterinary", displayName: "Fatsa Veteriner Kliniği", primaryType: "veterinary_care", formattedAddress: "Dumlupınar, 52400 Fatsa/Ordu, Türkiye" },
                    { placeId: "misclassified-vet", displayName: "Cotyora Veteriner Kliniği", primaryType: "pet_store", formattedAddress: "Akyazı, 52200 Altınordu/Ordu, Türkiye" },
                    { placeId: "misclassified-market", displayName: "Gelsineve Sanal Market", primaryType: "pet_store", formattedAddress: "Şahincili, 52200 Altınordu/Ordu, Türkiye" },
                    { placeId: "misclassified-building-store", displayName: "Aliefendioğlu Yapı Malzemeleri", primaryType: "pet_store", formattedAddress: "Yeni, 52520 Kabataş/Ordu, Türkiye" },
                    { placeId: "restaurant", displayName: "Balık Evi", primaryType: "restaurant", formattedAddress: "Dumlupınar, 52400 Fatsa/Ordu, Türkiye" },
                ],
                nextPageToken: null,
            };
        },
        async getPlace() {
            throw new Error("discovery must not request details");
        },
    };

    const result = await discoverOrduPetshops({ client, districts: ["Akkuş", "Altınordu", "Fatsa"] });
    assert.deepEqual(result.map(({ placeId, districtScope }) => ({ placeId, districtScope })), [
        { placeId: "pet-store", districtScope: "Fatsa" },
        { placeId: "generic-store", districtScope: "Fatsa" },
        { placeId: "pet-care", districtScope: "Altınordu" },
    ]);
});
