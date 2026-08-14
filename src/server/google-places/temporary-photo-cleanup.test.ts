import assert from "node:assert/strict";
import test from "node:test";

import { cleanupExpiredGooglePhotoObjects } from "./temporary-photo-cleanup.ts";

test("cleanup removes only temporary Google photos at least thirty days old", async () => {
  const deleted: string[] = [];
  const result = await cleanupExpiredGooglePhotoObjects({
    now: new Date("2026-08-14T12:00:00.000Z"),
    listObjects: async () => [
      { key: "temporary/google-places/old.image", lastModified: new Date("2026-07-15T11:59:59.000Z") },
      { key: "temporary/google-places/fresh.image", lastModified: new Date("2026-07-16T12:00:01.000Z") },
      { key: "businesses/logo.webp", lastModified: new Date("2020-01-01T00:00:00.000Z") },
    ],
    deleteObjects: async (keys) => { deleted.push(...keys); },
  });

  assert.deepEqual(deleted, ["temporary/google-places/old.image"]);
  assert.deepEqual(result, { deleted: 1, scanned: 3 });
});
