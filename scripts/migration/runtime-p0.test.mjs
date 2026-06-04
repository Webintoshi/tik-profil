import test from "node:test";
import assert from "node:assert/strict";

import {
    detectHashScheme,
    extractBusinessModules,
    resolveRuntimeBusinessReference,
} from "./_runtime-p0.mjs";

test("detectHashScheme classifies supported legacy and current formats", () => {
    assert.deepEqual(detectHashScheme("$2b$12$abcdefghijklmnopqrstuvABCDEFGHIJKLMNO1234567890"), {
        hash_scheme: "bcrypt",
        rehash_required: false,
    });

    assert.deepEqual(detectHashScheme("0123456789abcdef:fedcba9876543210"), {
        hash_scheme: "pbkdf2_like",
        rehash_required: false,
    });

    assert.deepEqual(detectHashScheme("cGFzc3dvcmQ="), {
        hash_scheme: "legacy_base64_family",
        rehash_required: true,
    });

    assert.deepEqual(detectHashScheme("not-a-known-hash-format"), {
        hash_scheme: "unknown",
        rehash_required: true,
    });
});

test("resolveRuntimeBusinessReference excludes archive-only orphans and honors enabled mappings", () => {
    const manifest = {
        entries: [
            {
                legacy_business_id: "orphan-biz",
                entity_scopes: ["business_staff"],
                action: "archive_only",
                exclude_from_runtime_import: true,
                mapping: { enabled: false, target_business_id: null },
                reason: "archive only",
                confidence: "high",
                source_note: "",
                audit_timestamp: "",
            },
            {
                legacy_business_id: "mapped-orphan",
                entity_scopes: ["qr_scans"],
                action: "archive_only",
                exclude_from_runtime_import: false,
                mapping: { enabled: true, target_business_id: "canonical-biz" },
                reason: "mapped",
                confidence: "high",
                source_note: "",
                audit_timestamp: "",
            },
        ],
        source_note: "",
        audit_timestamp: "",
    };

    assert.deepEqual(
        resolveRuntimeBusinessReference({
            manifest,
            entity: "business_staff",
            business_id: "orphan-biz",
            canonicalBusinessIds: new Set(["biz-1"]),
        }),
        {
            business_id: null,
            excluded: true,
            mapping_applied: false,
            exclusion_reason: "archive_only",
        },
    );

    assert.deepEqual(
        resolveRuntimeBusinessReference({
            manifest,
            entity: "qr_scans",
            business_id: "mapped-orphan",
            canonicalBusinessIds: new Set(["biz-1"]),
        }),
        {
            business_id: "canonical-biz",
            excluded: false,
            mapping_applied: true,
            exclusion_reason: null,
        },
    );

    assert.deepEqual(
        resolveRuntimeBusinessReference({
            manifest,
            entity: "business_staff",
            business_id: "biz-1",
            canonicalBusinessIds: new Set(["biz-1"]),
        }),
        {
            business_id: "biz-1",
            excluded: false,
            mapping_applied: false,
            exclusion_reason: null,
        },
    );
});

test("extractBusinessModules prefers normalized modules and deduplicates fallbacks", () => {
    assert.deepEqual(
        extractBusinessModules({
            normalized: {
                modules: ["restaurant", "fastfood", "restaurant"],
            },
            source_row: {
                modules: ["ignored"],
            },
        }),
        ["restaurant", "fastfood"],
    );

    assert.deepEqual(
        extractBusinessModules({
            normalized: {},
            source_row: {
                modules: ["hotel", "hotel", "clinic"],
                data: {
                    modules: ["ignored"],
                },
            },
        }),
        ["hotel", "clinic"],
    );

    assert.deepEqual(
        extractBusinessModules({
            normalized: {},
            source_row: {
                data: {
                    modules: ["appointment", "appointment", "beauty"],
                },
            },
        }),
        ["appointment", "beauty"],
    );
});
