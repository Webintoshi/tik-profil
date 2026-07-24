import assert from "node:assert/strict";
import test from "node:test";

import { isTrustedRequestOrigin } from "./request-origin.ts";

test("origin validation uses exact configured and development origins", () => {
    assert.equal(isTrustedRequestOrigin(
        new Headers({ origin: "https://tikprofil.com" }),
        "https://tikprofil.com/app",
        ["http://localhost:8082"],
    ), true);
    assert.equal(isTrustedRequestOrigin(
        new Headers({ referer: "http://localhost:8082/account" }),
        "https://tikprofil.com",
        ["http://localhost:8082"],
    ), true);
    assert.equal(isTrustedRequestOrigin(
        new Headers({ origin: "https://tikprofil.com.evil.example" }),
        "https://tikprofil.com",
        [],
    ), false);
});

test("server requests remain allowed while malformed browser origins fail closed", () => {
    assert.equal(isTrustedRequestOrigin(new Headers(), "https://tikprofil.com"), true);
    assert.equal(isTrustedRequestOrigin(new Headers({ origin: "null" }), "https://tikprofil.com"), false);
    assert.equal(isTrustedRequestOrigin(new Headers({ origin: "file:///tmp/test" }), "https://tikprofil.com"), false);
    assert.equal(isTrustedRequestOrigin(
        new Headers({ origin: "null", referer: "https://tikprofil.com/account" }),
        "https://tikprofil.com",
    ), false);
});
