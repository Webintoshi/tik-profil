import assert from "node:assert/strict";
import test from "node:test";

import {
  buildGoogleBusinessPhotoPath,
  resolveBusinessLogo,
} from "./business-photo.ts";

test("manual business logos always take precedence over imported Google photos", () => {
  assert.equal(
    resolveBusinessLogo({
      manualLogo: "https://cdn.tikprofil.com/businesses/logo.png",
      placeId: "ChIJvalidPlace123",
      photoAvailable: true,
    }),
    "https://cdn.tikprofil.com/businesses/logo.png",
  );
});

test("photo-backed imported businesses receive an internal media path without exposing credentials", () => {
  assert.equal(
    resolveBusinessLogo({
      manualLogo: null,
      placeId: "ChIJvalidPlace123",
      photoAvailable: true,
    }),
    "/api/google-places/photo/ChIJvalidPlace123",
  );
  assert.equal(
    buildGoogleBusinessPhotoPath("ChIJvalidPlace123"),
    "/api/google-places/photo/ChIJvalidPlace123",
  );
});

test("photo-less or malformed imported businesses retain the category fallback", () => {
  assert.equal(
    resolveBusinessLogo({
      manualLogo: null,
      placeId: "ChIJvalidPlace123",
      photoAvailable: false,
    }),
    null,
  );
  assert.equal(
    resolveBusinessLogo({
      manualLogo: null,
      placeId: "not valid!",
      photoAvailable: true,
    }),
    null,
  );
});
