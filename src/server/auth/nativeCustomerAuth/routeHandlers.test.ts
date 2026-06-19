import test from "node:test";
import assert from "node:assert/strict";

import {
    handleCustomerOtpStart,
    handleCustomerOtpVerify,
} from "./routeHandlers.ts";

const CUSTOMER_SESSION_COOKIE = "tikprofil_customer_session";

function jsonRequest(body: unknown): Request {
    return new Request("https://tikprofil.com/api/auth/customer/otp", {
        body: JSON.stringify(body),
        headers: {
            "content-type": "application/json",
        },
        method: "POST",
    });
}

test("customer OTP start returns masked delivery metadata without exposing the code", async () => {
    const calls: unknown[] = [];
    const response = await handleCustomerOtpStart(jsonRequest({ phone: "0555 111 22 33" }), {
        createOtpService: () => ({
            async start(input) {
                calls.push(input);
                return {
                    expiresInSeconds: 180,
                    maskedPhone: "+90 555 *** ** 33",
                    resendAfterSeconds: 60,
                };
            },
        }),
    });

    assert.equal(response.status, 200);
    assert.deepEqual(calls, [{ phone: "0555 111 22 33" }]);

    const body = await response.json();
    assert.deepEqual(body, {
        data: {
            expiresInSeconds: 180,
            maskedPhone: "+90 555 *** ** 33",
            resendAfterSeconds: 60,
        },
        success: true,
    });
    assert.equal(JSON.stringify(body).includes("123456"), false);
});

test("customer OTP verify provisions native customer and sets customer session cookie", async () => {
    const response = await handleCustomerOtpVerify(jsonRequest({
        code: "123456",
        phone: "0555 111 22 33",
    }), {
        createOtpService: () => ({
            async verify(input) {
                assert.deepEqual(input, {
                    code: "123456",
                    phone: "0555 111 22 33",
                });

                return {
                    challengeId: "challenge-1",
                    phone: {
                        e164: "+905551112233",
                        masked: "+90 555 *** ** 33",
                        netgsmNo: "5551112233",
                        providerUserId: "phone:+905551112233",
                    },
                    provider: "native_otp",
                    providerUserId: "phone:+905551112233",
                };
            },
        }),
        createProvisioningService: () => ({
            async provision(input) {
                assert.deepEqual(input, {
                    displayName: null,
                    email: null,
                    phone: "+905551112233",
                    provider: "native_otp",
                    providerUserId: "phone:+905551112233",
                });

                return {
                    appUser: {
                        id: "app-user-1",
                        status: "created",
                    },
                    authProviderLink: {
                        id: "provider-link-1",
                        status: "created",
                    },
                    counts: {
                        created: 2,
                        found: 0,
                        updated: 0,
                    },
                    displayName: "+905551112233",
                    email: null,
                    phone: "+905551112233",
                    provider: "native_otp",
                    providerUserId: "phone:+905551112233",
                };
            },
        }),
        createSessionToken: async (input) => {
            assert.deepEqual(input, {
                appUserId: "app-user-1",
                authProvider: "native_otp",
                displayName: "+905551112233",
                email: null,
                subject: "phone:+905551112233",
            });

            return "test-session-token";
        },
    });

    assert.equal(response.status, 200);
    assert.match(response.headers.get("set-cookie") ?? "", new RegExp(`${CUSTOMER_SESSION_COOKIE}=test-session-token`));

    const body = await response.json();
    assert.deepEqual(body, {
        data: {
            actorType: "customer",
            appUserId: "app-user-1",
            displayName: "+905551112233",
            email: null,
            logtoSub: "phone:+905551112233",
            phone: "+905551112233",
            provider: "native_otp",
            role: "customer",
            success: true,
        },
        success: true,
    });
});
