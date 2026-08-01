import assert from "node:assert/strict";
import test from "node:test";

import { handleLogtoEmailWebhook } from "./verificationEmail.ts";

const secret = "a".repeat(32);
const validPayload = {
    payload: { code: "123456" },
    to: "Isletme@Example.com",
    type: "Register",
};

function request(body: unknown, authorization?: string) {
    return new Request("https://tikprofil.com/api/auth/logto/email", {
        body: JSON.stringify(body),
        headers: {
            ...(authorization ? { authorization } : {}),
            "content-type": "application/json",
        },
        method: "POST",
    });
}

test("Logto email webhook rejects missing authorization and configuration", async () => {
    const missingSecret = await handleLogtoEmailWebhook(request(validPayload), {
        send: async () => undefined,
        webhookSecret: "",
    });
    const missingAuthorization = await handleLogtoEmailWebhook(request(validPayload), {
        send: async () => undefined,
        webhookSecret: secret,
    });

    assert.equal(missingSecret.status, 503);
    assert.equal(missingAuthorization.status, 401);
});

test("Logto email webhook validates email, code and usage", async () => {
    for (const body of [
        { ...validPayload, to: "not-an-email" },
        { ...validPayload, payload: { code: "12345" } },
        { ...validPayload, type: "Unknown" },
    ]) {
        const response = await handleLogtoEmailWebhook(request(body, `Bearer ${secret}`), {
            send: async () => undefined,
            webhookSecret: secret,
        });
        assert.equal(response.status, 400);
    }
});

test("Logto email webhook sends normalized verification email", async () => {
    const delivered: Array<{ html: string; subject: string; to: string }> = [];
    const response = await handleLogtoEmailWebhook(request(validPayload, `Bearer ${secret}`), {
        send: async (input) => { delivered.push(input); },
        webhookSecret: secret,
    });

    assert.equal(response.status, 200);
    assert.equal(delivered[0]?.to, "isletme@example.com");
    assert.match(delivered[0]?.subject ?? "", /Hesap dogrulama/);
    assert.match(delivered[0]?.html ?? "", /123456/);
});

test("Logto email webhook hides provider failures", async () => {
    const response = await handleLogtoEmailWebhook(request(validPayload, `Bearer ${secret}`), {
        send: async () => { throw new Error("provider secret detail"); },
        webhookSecret: secret,
    });

    assert.equal(response.status, 502);
    assert.deepEqual(await response.json(), {
        code: "EMAIL_DELIVERY_FAILED",
        error: "Dogrulama e-postasi gonderilemedi.",
        success: false,
    });
});
