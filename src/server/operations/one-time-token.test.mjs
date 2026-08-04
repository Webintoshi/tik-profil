import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";

import { verifyOneTimeOperationToken } from "./one-time-token.mjs";

test("one-time operation token requires an exact SHA-256 match", () => {
    const token = "a".repeat(64);
    const hash = createHash("sha256").update(token).digest("hex");
    assert.equal(verifyOneTimeOperationToken(token, hash), true);
    assert.equal(verifyOneTimeOperationToken("b".repeat(64), hash), false);
    assert.equal(verifyOneTimeOperationToken("short", hash), false);
});
