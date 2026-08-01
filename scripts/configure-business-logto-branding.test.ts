import assert from "node:assert/strict";
import test from "node:test";
import { buildDefaultFallbackPayload, parseBrandingCliArgs } from "./configure-business-logto-branding";
import { buildBusinessBrandingPayload } from "../src/server/auth/logto/business-branding";

test("CLI defaults to inspection without allowing a global fallback", () => {
    assert.deepEqual(parseBrandingCliArgs([]), {
        allowDefaultFallback: false,
        backupPath: null,
        mode: "inspect",
        restorePath: null,
    });
});

test("CLI requires a path for restore mode", () => {
    assert.throws(() => parseBrandingCliArgs(["--restore"]), /restore_path_required/);
});

test("default fallback keeps identifier methods while removing registration and social actions", () => {
    const current = {
        signIn: {
            methods: [
                { identifier: "email", isPasswordPrimary: true, password: true, verificationCode: false },
                { identifier: "username", isPasswordPrimary: true, password: true, verificationCode: false },
            ],
        },
        signInMode: "SignInAndRegister",
        socialSignInConnectorTargets: ["google"],
    };
    const branding = buildBusinessBrandingPayload("https://tikprofil.com");
    const payload = buildDefaultFallbackPayload(current, branding);

    assert.deepEqual(payload.signIn, current.signIn);
    assert.equal(payload.signInMode, "SignIn");
    assert.deepEqual(payload.socialSignInConnectorTargets, []);
    assert.equal(payload.hideLogtoBranding, true);
    assert.equal(payload.customCss, branding.customCss);
});
