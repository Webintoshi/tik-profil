import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import test from "node:test";

import { buildOptimizedOwnedImageUrl, type ImgproxyConfig } from "./imgproxy-url.ts";

const config: ImgproxyConfig = {
    baseUrl: "https://images.example.com",
    keyHex: "11".repeat(64),
    saltHex: "22".repeat(64),
    sourceBaseUrl: "https://tikprofil.com/api/r2",
};

test("builds signed WebP URLs only for owned R2 media", () => {
    const source = "https://tikprofil.com/api/r2/businesses/demo/cover.jpg";
    const url = buildOptimizedOwnedImageUrl(source, { fit: "fill", width: 720, height: 405 }, config);
    const encodedSource = Buffer.from(source).toString("base64url");
    const path = `/rs:fill:720:405:0/g:sm/q:82/${encodedSource}.webp`;
    const signature = createHmac("sha256", Buffer.from(config.keyHex, "hex"))
        .update(Buffer.from(config.saltHex, "hex"))
        .update(path)
        .digest("base64url");
    assert.equal(url, `https://images.example.com/${signature}${path}`);
});

test("does not proxy external or lookalike URLs", () => {
    assert.equal(
        buildOptimizedOwnedImageUrl("https://example.com/photo.jpg", { width: 720 }, config),
        "https://example.com/photo.jpg",
    );
    assert.equal(
        buildOptimizedOwnedImageUrl("https://tikprofil.com/api/r2-evil/photo.jpg", { width: 720 }, config),
        "https://tikprofil.com/api/r2-evil/photo.jpg",
    );
});

test("falls back to the original URL when signing config is invalid", () => {
    const source = "https://tikprofil.com/api/r2/photo.jpg";
    assert.equal(buildOptimizedOwnedImageUrl(source, { width: 720 }, { ...config, keyHex: "bad" }), source);
});
