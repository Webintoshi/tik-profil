import assert from "node:assert/strict";
import test from "node:test";

import { createGooglePlacePhotoHandler } from "./photo-handler.ts";

const metadata = {
  resourceName: "places/ChIJvalidPlace123/photos/photo-resource",
  sourceUrl: "https://maps.google.com/photo-source",
  authorAttributions: [
    { displayName: "Ayse Yilmaz", uri: null, photoUri: null },
  ],
};

test("unpublished Place IDs return 404 before Google is called", async () => {
  let providerCalls = 0;
  const handler = createGooglePlacePhotoHandler({
    apiKey: "server-secret",
    isPublishedPlaceId: async () => false,
    getMetadata: async () => {
      providerCalls += 1;
      return metadata;
    },
    resolveMedia: async () => "https://lh3.googleusercontent.com/photo",
  });

  const response = await handler.media("ChIJvalidPlace123");
  assert.equal(response.status, 404);
  assert.equal(providerCalls, 0);
  assert.equal(await response.text(), "");
});

test("live media redirects are no-store and never expose the API key", async () => {
  let requestedWidth = 0;
  const handler = createGooglePlacePhotoHandler({
    apiKey: "server-secret",
    isPublishedPlaceId: async () => true,
    getMetadata: async () => metadata,
    resolveMedia: async (_resourceName, _apiKey, width) => {
      requestedWidth = width;
      return "https://lh3.googleusercontent.com/photo";
    },
  });

  const response = await handler.media("ChIJvalidPlace123", 320);
  assert.equal(response.status, 302);
  assert.equal(
    response.headers.get("location"),
    "https://lh3.googleusercontent.com/photo",
  );
  assert.equal(response.headers.get("cache-control"), "no-store, max-age=0");
  assert.equal(
    [...response.headers.values()].join(" ").includes("server-secret"),
    false,
  );
  assert.equal(requestedWidth, 320);
});

test("fresh R2 media is served without requiring a Google API key", async () => {
  let googleCalls = 0;
  const handler = createGooglePlacePhotoHandler({
    apiKey: undefined,
    isPublishedPlaceId: async () => true,
    getCachedMedia: async () => ({
      url: "https://media.tikprofil.com/temporary/google-places/photo.webp",
      maxAgeSeconds: 3600,
    }),
    getMetadata: async () => {
      googleCalls += 1;
      return metadata;
    },
    resolveMedia: async () => {
      googleCalls += 1;
      return "https://lh3.googleusercontent.com/photo";
    },
  });

  const response = await handler.media("ChIJvalidPlace123", 320);

  assert.equal(response.status, 302);
  assert.equal(
    response.headers.get("location"),
    "https://media.tikprofil.com/temporary/google-places/photo.webp",
  );
  assert.equal(response.headers.get("cache-control"), "public, max-age=3600");
  assert.equal(googleCalls, 0);
});

test("a cache miss stores the resolved Google photo and redirects to R2", async () => {
  const stored: Array<{ mediaUrl: string; placeId: string; requestedWidth: number }> = [];
  const handler = createGooglePlacePhotoHandler({
    apiKey: "server-secret",
    isPublishedPlaceId: async () => true,
    getCachedMedia: async () => null,
    getMetadata: async () => metadata,
    resolveMedia: async () => "https://lh3.googleusercontent.com/photo",
    storeCachedMedia: async (input) => {
      stored.push({
        mediaUrl: input.mediaUrl,
        placeId: input.placeId,
        requestedWidth: input.requestedWidth,
      });
      return {
        url: "https://media.tikprofil.com/temporary/google-places/photo.webp",
        maxAgeSeconds: 3600,
      };
    },
  });

  const response = await handler.media("ChIJvalidPlace123", 320);

  assert.equal(response.status, 302);
  assert.equal(
    response.headers.get("location"),
    "https://media.tikprofil.com/temporary/google-places/photo.webp",
  );
  assert.equal(response.headers.get("cache-control"), "public, max-age=3600");
  assert.deepEqual(stored, [{
    mediaUrl: "https://lh3.googleusercontent.com/photo",
    placeId: "ChIJvalidPlace123",
    requestedWidth: 320,
  }]);
});

test("metadata responses include attribution and the individual source with no-store headers", async () => {
  const handler = createGooglePlacePhotoHandler({
    apiKey: "server-secret",
    isPublishedPlaceId: async () => true,
    getMetadata: async () => metadata,
    resolveMedia: async () => null,
  });

  const response = await handler.metadata("ChIJvalidPlace123");
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "no-store, max-age=0");
  assert.deepEqual(await response.json(), {
    success: true,
    sourceUrl: "https://maps.google.com/photo-source",
    authorAttributions: metadata.authorAttributions,
  });
});

test("missing configuration and upstream failures produce sanitized responses", async () => {
  const missingConfig = createGooglePlacePhotoHandler({
    apiKey: undefined,
    isPublishedPlaceId: async () => true,
    getMetadata: async () => metadata,
    resolveMedia: async () => null,
  });
  assert.equal((await missingConfig.media("ChIJvalidPlace123")).status, 503);

  const upstreamFailure = createGooglePlacePhotoHandler({
    apiKey: "server-secret",
    isPublishedPlaceId: async () => true,
    getMetadata: async () => {
      throw new Error("server-secret upstream payload");
    },
    resolveMedia: async () => null,
  });
  const response = await upstreamFailure.metadata("ChIJvalidPlace123");
  assert.equal(response.status, 502);
  assert.equal((await response.text()).includes("server-secret"), false);
});
