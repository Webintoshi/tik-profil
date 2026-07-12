import assert from "node:assert/strict";
import test from "node:test";

import {
    createNetgsmSmsSender,
    handleLogtoSmsWebhook,
    normalizeLogtoTurkishPhone,
} from "./netgsmSms.ts";

const validPayload = {
    payload: { code: "123456" },
    to: "+905551112233",
    type: "Register",
};

function request(body: unknown, authorization?: string) {
    return new Request("https://tikprofil.com/api/auth/logto/sms", {
        body: JSON.stringify(body),
        headers: {
            ...(authorization ? { authorization } : {}),
            "content-type": "application/json",
        },
        method: "POST",
    });
}

test("Logto SMS webhook rejects missing and incorrect bearer authorization", async () => {
    let sends = 0;
    const dependencies = {
        send: async () => { sends += 1; },
        webhookSecret: "a".repeat(32),
    };

    const missing = await handleLogtoSmsWebhook(request(validPayload), dependencies);
    const incorrect = await handleLogtoSmsWebhook(
        request(validPayload, `Bearer ${"b".repeat(32)}`),
        dependencies,
    );

    assert.equal(missing.status, 401);
    assert.equal(incorrect.status, 401);
    assert.equal(sends, 0);
});

test("Logto SMS webhook fails closed when its bearer secret is not configured", async () => {
    const response = await handleLogtoSmsWebhook(request(validPayload), {
        send: async () => undefined,
        webhookSecret: "",
    });

    assert.equal(response.status, 503);
});

test("Logto SMS webhook validates payload before delivery", async () => {
    let sends = 0;
    const dependencies = {
        send: async () => { sends += 1; },
        webhookSecret: "a".repeat(32),
    };

    for (const body of [
        { ...validPayload, to: "+90123" },
        { ...validPayload, type: "Unknown" },
        { ...validPayload, payload: { code: "12345" } },
        { ...validPayload, payload: null },
    ]) {
        const response = await handleLogtoSmsWebhook(
            request(body, `Bearer ${"a".repeat(32)}`),
            dependencies,
        );
        assert.equal(response.status, 400);
    }

    assert.equal(sends, 0);
});

test("Logto SMS webhook maps each supported usage to safe Turkish copy", async () => {
    const delivered: Array<{ message: string; phone: string }> = [];
    const expectedCopy = {
        ForgotPassword: "Tik Profil sifre yenileme kodunuz: 123456. Bu kodu kimseyle paylasmayin.",
        Generic: "Tik Profil dogrulama kodunuz: 123456. Bu kodu kimseyle paylasmayin.",
        Register: "Tik Profil kayit kodunuz: 123456. Bu kodu kimseyle paylasmayin.",
        SignIn: "Tik Profil giris kodunuz: 123456. Bu kodu kimseyle paylasmayin.",
    } as const;

    for (const [type, message] of Object.entries(expectedCopy)) {
        const response = await handleLogtoSmsWebhook(
            request({ ...validPayload, type }, `Bearer ${"a".repeat(32)}`),
            {
                send: async (input) => { delivered.push(input); },
                webhookSecret: "a".repeat(32),
            },
        );
        assert.equal(response.status, 204);
        assert.deepEqual(delivered.at(-1), { message, phone: "5551112233" });
    }
});

test("Turkish Logto phone normalization accepts only mobile E.164 numbers", () => {
    assert.equal(normalizeLogtoTurkishPhone("+905551112233"), "5551112233");
    assert.throws(() => normalizeLogtoTurkishPhone("05551112233"), /telefon/i);
    assert.throws(() => normalizeLogtoTurkishPhone("+904441112233"), /telefon/i);
});

test("Netgsm sender maps Basic auth and OTP REST v2 body exactly", async () => {
    let requestUrl = "";
    let requestInit: RequestInit | undefined;
    const sender = createNetgsmSmsSender({
        config: {
            appname: "TikProfil",
            endpoint: "https://api.netgsm.test/sms/rest/v2/otp",
            msgheader: "TIKPROFIL",
            password: "secret-password",
            usercode: "8500000000",
        },
        fetchImpl: async (url, init) => {
            requestUrl = String(url);
            requestInit = init;
            return new Response(JSON.stringify({ code: "00", jobid: "job-1" }), { status: 200 });
        },
    });

    await sender({ message: "Tik Profil dogrulama kodunuz: 123456", phone: "5551112233" });

    assert.equal(requestUrl, "https://api.netgsm.test/sms/rest/v2/otp");
    assert.equal(requestInit?.method, "POST");
    assert.equal(
        new Headers(requestInit?.headers).get("authorization"),
        `Basic ${Buffer.from("8500000000:secret-password").toString("base64")}`,
    );
    assert.deepEqual(JSON.parse(String(requestInit?.body)), {
        appname: "TikProfil",
        msg: "Tik Profil dogrulama kodunuz: 123456",
        msgheader: "TIKPROFIL",
        no: "5551112233",
    });
});

test("Netgsm sender fails closed for missing configuration and provider rejection", async () => {
    assert.throws(
        () => createNetgsmSmsSender({
            config: {
                endpoint: "https://api.netgsm.test/sms/rest/v2/otp",
                msgheader: "",
                password: "",
                usercode: "",
            },
        }),
        /yapilandirma/i,
    );

    const sender = createNetgsmSmsSender({
        config: {
            endpoint: "https://api.netgsm.test/sms/rest/v2/otp",
            msgheader: "TIKPROFIL",
            password: "secret-password",
            usercode: "8500000000",
        },
        fetchImpl: async () => new Response(
            JSON.stringify({ code: "30", description: "invalid credentials" }),
            { status: 200 },
        ),
    });

    await assert.rejects(
        () => sender({ message: "message", phone: "5551112233" }),
        /gonderilemedi/i,
    );
});

test("Logto SMS webhook maps provider failures without exposing details", async () => {
    const response = await handleLogtoSmsWebhook(
        request(validPayload, `Bearer ${"a".repeat(32)}`),
        {
            send: async () => { throw new Error("provider secret detail"); },
            webhookSecret: "a".repeat(32),
        },
    );

    assert.equal(response.status, 502);
    assert.deepEqual(await response.json(), {
        code: "SMS_DELIVERY_FAILED",
        error: "Dogrulama mesaji gonderilemedi.",
        success: false,
    });
});
