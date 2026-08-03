import { createHash, timingSafeEqual } from "node:crypto";

export function verifyOneTimeOperationToken(token, expectedHash) {
    if (typeof token !== "string" || !/^[a-f0-9]{64}$/i.test(token)) return false;
    if (typeof expectedHash !== "string" || !/^[a-f0-9]{64}$/i.test(expectedHash)) return false;

    const actual = Buffer.from(createHash("sha256").update(token).digest("hex"), "hex");
    const expected = Buffer.from(expectedHash, "hex");
    return timingSafeEqual(actual, expected);
}
