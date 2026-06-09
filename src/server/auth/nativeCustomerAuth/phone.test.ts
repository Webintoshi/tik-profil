import test from "node:test";
import assert from "node:assert/strict";

import {
    NativeCustomerAuthError,
    normalizeTurkishMobilePhone,
} from "./phone.ts";

test("normalizes Turkish mobile phone numbers for app and Netgsm usage", () => {
    const normalized = normalizeTurkishMobilePhone("0555 111 22 33");

    assert.equal(normalized.e164, "+905551112233");
    assert.equal(normalized.netgsmNo, "5551112233");
    assert.equal(normalized.providerUserId, "phone:+905551112233");
    assert.equal(normalized.masked, "+90 555 *** ** 33");
});

test("accepts already normalized E.164 Turkish mobile numbers", () => {
    const normalized = normalizeTurkishMobilePhone("+90 532 123 45 67");

    assert.equal(normalized.e164, "+905321234567");
    assert.equal(normalized.netgsmNo, "5321234567");
});

test("rejects non-mobile or foreign phone numbers", () => {
    assert.throws(
        () => normalizeTurkishMobilePhone("0312 111 22 33"),
        (error) => error instanceof NativeCustomerAuthError && error.code === "INVALID_PHONE",
    );
    assert.throws(
        () => normalizeTurkishMobilePhone("+49 151 111 22 33"),
        (error) => error instanceof NativeCustomerAuthError && error.code === "INVALID_PHONE",
    );
});
