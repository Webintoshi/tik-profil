import assert from "node:assert/strict";
import test from "node:test";
import { resolveBusinessLogtoEntry } from "./business-entry";

test("starts the business Logto flow immediately for a normal entry", () => {
    assert.deepEqual(resolveBusinessLogtoEntry({}), {
        href: "/api/auth/logto/sign-in?actor=business&callbackUrl=%2Fpanel%2Fprofile",
        kind: "redirect",
    });
});

test("preserves a safe local callback path", () => {
    assert.deepEqual(resolveBusinessLogtoEntry({ callbackUrl: "/panel/settings" }), {
        href: "/api/auth/logto/sign-in?actor=business&callbackUrl=%2Fpanel%2Fsettings",
        kind: "redirect",
    });
});

test("rejects an external callback path", () => {
    assert.deepEqual(resolveBusinessLogtoEntry({ callbackUrl: "https://evil.example" }), {
        href: "/api/auth/logto/sign-in?actor=business&callbackUrl=%2Fpanel%2Fprofile",
        kind: "redirect",
    });
});

test("keeps authentication errors on the recovery surface", () => {
    assert.deepEqual(resolveBusinessLogtoEntry({ authError: "logto_access_denied" }), {
        authError: "logto_access_denied",
        kind: "recovery",
        loggedOut: false,
        retryHref: "/api/auth/logto/sign-in?actor=business&callbackUrl=%2Fpanel%2Fprofile",
    });
});

test("keeps successful logout on the recovery surface", () => {
    assert.deepEqual(resolveBusinessLogtoEntry({ logout: "success" }), {
        authError: null,
        kind: "recovery",
        loggedOut: true,
        retryHref: "/api/auth/logto/sign-in?actor=business&callbackUrl=%2Fpanel%2Fprofile",
    });
});
