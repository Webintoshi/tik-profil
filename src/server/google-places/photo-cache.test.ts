import assert from "node:assert/strict";
import test from "node:test";

import {
  buildGooglePhotoCacheKey,
  isGooglePhotoCacheFresh,
  normalizeGooglePhotoWidth,
} from "./photo-cache.ts";

test("photo cache keys are deterministic and use bounded width buckets", () => {
  const now = new Date("2026-08-14T12:00:00.000Z");

  assert.equal(normalizeGooglePhotoWidth(10), 240);
  assert.equal(normalizeGooglePhotoWidth(320), 480);
  assert.equal(normalizeGooglePhotoWidth(9000), 1280);
  assert.equal(
    buildGooglePhotoCacheKey("ChIJvalidPlace123", 320),
    "temporary/google-places/ChIJvalidPlace123/480.image",
  );
});

test("cached Google photos expire before the thirty day storage limit", () => {
  const now = new Date("2026-08-14T12:00:00.000Z");

  assert.equal(
    isGooglePhotoCacheFresh(new Date("2026-07-17T12:00:01.000Z"), now),
    true,
  );
  assert.equal(
    isGooglePhotoCacheFresh(new Date("2026-07-16T12:00:00.000Z"), now),
    false,
  );
});
