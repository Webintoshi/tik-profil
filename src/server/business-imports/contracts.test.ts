import assert from "node:assert/strict";
import test from "node:test";

import {
    ImportError,
    ReviewCandidateSchema,
    StartPetshopImportSchema,
} from "./contracts.ts";

test("petshop start contract only accepts Ordu and known districts", () => {
    const idempotencyKey = "06e6db6f-a739-4d84-a9a7-a7c1b0ec61a4";

    assert.equal(StartPetshopImportSchema.safeParse({
        city: "Ordu",
        districts: ["Altınordu"],
        idempotencyKey,
    }).success, true);
    assert.equal(StartPetshopImportSchema.safeParse({
        city: "Samsun",
        districts: [],
        idempotencyKey,
    }).success, false);
    assert.equal(StartPetshopImportSchema.safeParse({
        city: "Ordu",
        districts: ["Merkez"],
        idempotencyKey,
    }).success, false);
    assert.equal(StartPetshopImportSchema.safeParse({
        city: "Ordu",
        districts: ["Altınordu"],
        idempotencyKey: "not-a-uuid",
    }).success, false);
});

test("candidate review only accepts explicit workflow decisions and verified source facts", () => {
    assert.equal(ReviewCandidateSchema.safeParse({
        decision: "approved",
        sourceFacts: [{
            fieldKey: "name",
            fieldValue: "Ordu Pet Market",
            sourceType: "business_website",
            sourceUrl: "https://example.com/hakkimizda",
        }],
    }).success, true);
    assert.equal(ReviewCandidateSchema.safeParse({
        decision: "published",
    }).success, false);
    assert.equal(ReviewCandidateSchema.safeParse({
        decision: "approved",
        sourceFacts: [{
            fieldKey: "name",
            fieldValue: "Ordu Pet Market",
            sourceType: "google_places",
        }],
    }).success, false);
});

test("import errors expose stable codes without operational detail", () => {
    const error = new ImportError("provider_rate_limited");

    assert.equal(error.code, "provider_rate_limited");
    assert.equal(error.statusCode, 429);
    assert.equal(error.message, "provider_rate_limited");
});
