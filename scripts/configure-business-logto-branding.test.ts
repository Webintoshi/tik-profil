import assert from "node:assert/strict";
import test from "node:test";
import { buildDefaultFallbackPayload, parseBrandingCliArgs } from "./configure-business-logto-branding";
import {
    buildBusinessAuthenticationPayload,
    buildBusinessBrandingPayload,
} from "../src/server/auth/logto/business-branding";

test("CLI defaults to inspection without allowing a global fallback", () => {
    assert.deepEqual(parseBrandingCliArgs([]), {
        allowDefaultFallback: false,
        applyAuthentication: false,
        backupPath: null,
        mode: "inspect",
        restorePath: null,
    });
});

test("CLI applies authentication only with an explicit flag", () => {
    assert.deepEqual(parseBrandingCliArgs(["--apply-authentication"]), {
        allowDefaultFallback: false,
        applyAuthentication: true,
        backupPath: null,
        mode: "apply",
        restorePath: null,
    });
});

test("CLI requires a path for restore mode", () => {
    assert.throws(() => parseBrandingCliArgs(["--restore"]), /restore_path_required/);
});

test("default fallback preserves authentication unless explicitly supplied", () => {
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
    assert.equal(payload.signUp, undefined);
    assert.equal(payload.signInMode, "SignInAndRegister");
    assert.deepEqual(payload.socialSignInConnectorTargets, []);
    assert.equal(payload.hideLogtoBranding, true);
    assert.equal(payload.customCss, branding.customCss);
});

test("default fallback applies verified email, profile phone and password registration", () => {
    const current = { signIn: { methods: [] }, signUp: null };
    const branding = buildBusinessBrandingPayload("https://tikprofil.com");
    const authentication = buildBusinessAuthenticationPayload();
    const payload = buildDefaultFallbackPayload(current, branding, authentication);

    assert.deepEqual(payload.signIn, authentication.signIn);
    assert.deepEqual(payload.signUp, authentication.signUp);
    assert.doesNotMatch(JSON.stringify(payload), /username/);
});
