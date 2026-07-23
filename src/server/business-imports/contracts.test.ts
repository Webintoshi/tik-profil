import assert from "node:assert/strict";
import test from "node:test";

import {
    ImportError,
    ReviewCandidateSchema,
    StartPetshopImportSchema,
} from "./contracts.ts";
import {
    getBusinessImportRecoveryFromEmail,
    getGoogleMapsApiKey,
    getLogtoManagementCredentials,
} from "../../lib/env.ts";

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

test("import provider accessors return only complete server configuration", () => {
    const previous = {
        BUSINESS_IMPORT_RECOVERY_FROM_EMAIL: process.env.BUSINESS_IMPORT_RECOVERY_FROM_EMAIL,
        GOOGLE_MAPS_API_KEY: process.env.GOOGLE_MAPS_API_KEY,
        LOGTO_MANAGEMENT_APP_ID: process.env.LOGTO_MANAGEMENT_APP_ID,
        LOGTO_MANAGEMENT_APP_SECRET: process.env.LOGTO_MANAGEMENT_APP_SECRET,
    };

    try {
        process.env.GOOGLE_MAPS_API_KEY = " places-key ";
        process.env.LOGTO_MANAGEMENT_APP_ID = " management-id ";
        process.env.LOGTO_MANAGEMENT_APP_SECRET = " management-secret ";
        process.env.BUSINESS_IMPORT_RECOVERY_FROM_EMAIL = " recovery@tikprofil.com ";

        assert.equal(getGoogleMapsApiKey(), "places-key");
        assert.deepEqual(getLogtoManagementCredentials(), {
            appId: "management-id",
            appSecret: "management-secret",
        });
        assert.equal(getBusinessImportRecoveryFromEmail(), "recovery@tikprofil.com");

        process.env.LOGTO_MANAGEMENT_APP_SECRET = "";
        assert.equal(getLogtoManagementCredentials(), null);
    } finally {
        for (const [key, value] of Object.entries(previous)) {
            if (value === undefined) {
                delete process.env[key];
            } else {
                process.env[key] = value;
            }
        }
    }
});
