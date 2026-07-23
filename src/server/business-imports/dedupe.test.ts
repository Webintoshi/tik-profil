import assert from "node:assert/strict";
import test from "node:test";

import { decideDuplicate } from "./dedupe.ts";

test("provider place ID wins over every verified fact signal", () => {
    const decision = decideDuplicate({
        providerPlaceId: "place-a",
        sourceFacts: [
            { fieldKey: "phone", fieldValue: "+90 452 111 22 33" },
            { fieldKey: "domain", fieldValue: "https://candidate.example" },
        ],
    }, [
        {
            businessId: "business-provider",
            providerPlaceId: "place-a",
            sourceFacts: [{ fieldKey: "phone", fieldValue: "+90 452 999 88 77" }],
        },
        {
            businessId: "business-phone",
            sourceFacts: [{ fieldKey: "phone", fieldValue: "0452 111 22 33" }],
        },
    ]);

    assert.deepEqual(decision, {
        kind: "duplicate",
        businessId: "business-provider",
        reason: "place_id",
    });
});

test("phone and domain matches use a stable priority and business ID tie break", () => {
    const decision = decideDuplicate({
        sourceFacts: [
            { fieldKey: "phone", fieldValue: "+90 452 111 22 33" },
            { fieldKey: "website", fieldValue: "https://www.pati.example.tr/iletisim" },
        ],
    }, [
        {
            businessId: "z-phone",
            sourceFacts: [{ fieldKey: "phone", fieldValue: "04521112233" }],
        },
        {
            businessId: "a-phone",
            sourceFacts: [{ fieldKey: "phone", fieldValue: "452 111 22 33" }],
        },
        {
            businessId: "domain-only",
            sourceFacts: [{ fieldKey: "domain", fieldValue: "pati.example.tr" }],
        },
    ]);

    assert.deepEqual(decision, {
        kind: "duplicate",
        businessId: "a-phone",
        reason: "phone",
    });
});

test("conflicting verified weak signals require manual review", () => {
    const decision = decideDuplicate({
        verifiedDistrict: "Alt\u0131nordu",
        sourceFacts: [
            { fieldKey: "name", fieldValue: "Pati Dukkani" },
            { fieldKey: "address", fieldValue: "Ataturk Caddesi 1, Ordu" },
        ],
    }, [
        {
            businessId: "name-match",
            verifiedDistrict: "Alt\u0131nordu",
            sourceFacts: [{ fieldKey: "name", fieldValue: "Pati Dukkani" }],
        },
        {
            businessId: "address-match",
            verifiedDistrict: "Alt\u0131nordu",
            sourceFacts: [{ fieldKey: "address", fieldValue: "Ataturk Caddesi 1 Ordu" }],
        },
    ]);

    assert.deepEqual(decision, {
        kind: "manual_review",
        reason: "conflicting_name_address_matches",
    });
});

test("weak name and address facts do not dedupe businesses in different verified districts", () => {
    const decision = decideDuplicate({
        verifiedDistrict: "Alt\u0131nordu",
        sourceFacts: [
            { fieldKey: "name", fieldValue: "Pati Dukkani" },
            { fieldKey: "address", fieldValue: "Ataturk Caddesi 1" },
        ],
    }, [{
        businessId: "fatsa-pati",
        verifiedDistrict: "Fatsa",
        sourceFacts: [
            { fieldKey: "name", fieldValue: "Pati Dukkani" },
            { fieldKey: "address", fieldValue: "Ataturk Caddesi 1" },
        ],
    }]);

    assert.deepEqual(decision, { kind: "new" });
});

test("does not use unverified live provider display fields", () => {
    const decision = decideDuplicate({
        providerPlaceId: "place-new",
        sourceFacts: [],
    }, [{
        businessId: "existing",
        providerPlaceId: "place-existing",
        sourceFacts: [],
    }]);

    assert.deepEqual(decision, { kind: "new" });
});
