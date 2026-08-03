import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";

import { verifyOneTimeOperationToken } from "./one-time-token.mjs";

test("one-time operation token is fixed length, hashed and timing-safe", () => {
    const token = "a".repeat(64);
    const expectedHash = createHash("sha256").update(token).digest("hex");

    assert.equal(verifyOneTimeOperationToken(token, expectedHash), true);
    assert.equal(verifyOneTimeOperationToken("b".repeat(64), expectedHash), false);
    assert.equal(verifyOneTimeOperationToken("short", expectedHash), false);
    assert.equal(verifyOneTimeOperationToken(token, "invalid"), false);
});
