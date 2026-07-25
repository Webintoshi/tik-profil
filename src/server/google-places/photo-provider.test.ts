import assert from "node:assert/strict";
import test from "node:test";

import {
  getCurrentGooglePlacePhotoMetadata,
  resolveGooglePlacePhotoMedia,
} from "./photo-provider.ts";

const photoDetails = {
  googleMapsUri: "https://maps.google.com/place-source",
  photos: [
    {
      name: "places/ChIJvalidPlace123/photos/photo-resource",
      googleMapsUri: "https://maps.google.com/photo-source",
      authorAttributions: [
        {
          displayName: "Ayse Yilmaz",
          uri: "https://maps.google.com/contributor/ayse",
          photoUri: "https://images.example.com/author.jpg",
        },
      ],
    },
  ],
};

test("current photo metadata exposes attribution and the individual Google Maps source", async () => {
  const requests: Array<{ input: string; init?: RequestInit }> = [];
  const result = await getCurrentGooglePlacePhotoMetadata(
    "ChIJvalidPlace123",
    "server-key",
    async (input, init) => {
      requests.push({ input: String(input), init });
      return Response.json(photoDetails);
    },
  );

  assert.deepEqual(result, {
    resourceName: "places/ChIJvalidPlace123/photos/photo-resource",
    sourceUrl: "https://maps.google.com/photo-source",
    authorAttributions: [
      {
        displayName: "Ayse Yilmaz",
        uri: "https://maps.google.com/contributor/ayse",
        photoUri: "https://images.example.com/author.jpg",
      },
    ],
  });
  assert.equal(requests.length, 1);
  assert.equal(
    new Headers(requests[0].init?.headers).get("X-Goog-Api-Key"),
    "server-key",
  );
  assert.equal(requests[0].input.includes("server-key"), false);
});

test("photo-less places return null instead of a generated fallback", async () => {
  const result = await getCurrentGooglePlacePhotoMetadata(
    "ChIJvalidPlace123",
    "server-key",
    async () => Response.json({ photos: [] }),
  );
  assert.equal(result, null);
});

test("photo media is resolved live and never returns the resource name as an image URL", async () => {
  const result = await resolveGooglePlacePhotoMedia(
    "places/ChIJvalidPlace123/photos/photo-resource",
    "server-key",
    async () =>
      Response.json({
        photoUri: "https://lh3.googleusercontent.com/current-photo",
      }),
  );
  assert.equal(result, "https://lh3.googleusercontent.com/current-photo");
});
