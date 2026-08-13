import assert from "node:assert/strict";
import test from "node:test";

import { mapGoogleTokenPayload } from "./google.ts";

test("maps only a verified Google identity", () => {
    assert.deepEqual(mapGoogleTokenPayload({
        aud: "web-client",
        email: " PERSON@Example.COM ",
        email_verified: true,
        exp: 1,
        iat: 1,
        iss: "https://accounts.google.com",
        name: "  Test Person  ",
        picture: " https://example.com/avatar.png ",
        sub: "google-subject",
    }), {
        avatarUrl: "https://example.com/avatar.png",
        displayName: "Test Person",
        email: "person@example.com",
        providerSubject: "google-subject",
    });
});

test("rejects unverified or incomplete Google identities", () => {
    assert.throws(() => mapGoogleTokenPayload({
        aud: "web-client",
        email: "person@example.com",
        email_verified: false,
        exp: 1,
        iat: 1,
        iss: "https://accounts.google.com",
        sub: "google-subject",
    }), /verified email/i);
    assert.throws(() => mapGoogleTokenPayload(undefined), /verified email/i);
});
