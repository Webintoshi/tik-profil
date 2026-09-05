import assert from "node:assert/strict";
import test from "node:test";
import { parseCityEventSnapshot, type CityEventSnapshot } from "./contracts.ts";

const HASH = "a".repeat(64);
const PUBLIC_BASE = "https://media.tikprofil.test";
const poster = `${PUBLIC_BASE}/events/ordu/biletinial/123/${HASH}.png`;
const snapshot: CityEventSnapshot = {
  city: "ordu", source: "biletinial", fetchedAt: "2026-09-05T09:00:00.000Z",
  events: [{ id: "biletinial:123", source: "biletinial", category: "sinema", title: "Test filmi",
    sourceUrl: "https://biletinial.com/tr-tr/sinema/test-filmi", imageUrl: null, sessions: [] }],
};

function configureR2(context: import("node:test").TestContext) {
  const previous = process.env.CLOUDFLARE_R2_PUBLIC_URL;
  process.env.CLOUDFLARE_R2_PUBLIC_URL = PUBLIC_BASE;
  context.after(() => {
    if (previous === undefined) delete process.env.CLOUDFLARE_R2_PUBLIC_URL;
    else process.env.CLOUDFLARE_R2_PUBLIC_URL = previous;
  });
}

test("snapshot accepts only the current event's content-addressed R2 poster and strips provider-only references", context => {
  configureR2(context);
  const parsed = parseCityEventSnapshot({ ...snapshot, events: [{ ...snapshot.events[0], imageUrl: poster,
    posterSourceUrl: "https://b6s54eznn8xq.merlincdn.net/Uploads/Films/test.png" }] });
  assert.equal(parsed.events[0].imageUrl, poster);
  assert.equal("posterSourceUrl" in parsed.events[0], false);
});

test("published poster URLs reject provider hotlinks, other hosts/events, credentials and queries", context => {
  configureR2(context);
  for (const imageUrl of [
    "https://b6s54eznn8xq.merlincdn.net/Uploads/Films/test.png",
    poster.replace("media.tikprofil.test", "media.tikprofil.test.evil.example"),
    poster.replace("/123/", "/456/"), poster + "?token=secret", poster + "#fragment",
    poster.replace("https:", "http:"), poster.replace("https://", "https://user:pass@"),
    poster.replace("/events/ordu/", "/covers/ordu/"), poster.replace(".png", ".svg"),
  ]) assert.throws(() => parseCityEventSnapshot({ ...snapshot, events: [{ ...snapshot.events[0], imageUrl }] }), imageUrl);
});

test("legacy null covers remain readable without an R2 configuration", context => {
  configureR2(context);
  delete process.env.CLOUDFLARE_R2_PUBLIC_URL;
  assert.deepEqual(parseCityEventSnapshot(snapshot), snapshot);
  assert.throws(() => parseCityEventSnapshot({ ...snapshot, events: [{ ...snapshot.events[0], imageUrl: poster }] }));
});

const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aE2sAAAAASUVORK5CYII=", "base64");
const SOURCE_POSTER = "https://b6s54eznn8xq.merlincdn.net/Uploads/Films/test.png";
const OBJECT_KEY = "events/ordu/biletinial/123/eab7f21c874fd88a66d95e40d777a2a3b78a9c08675a550672ff3c807e678606.png";
const raw = { ...snapshot, events: [{ ...snapshot.events[0], posterSourceUrl: SOURCE_POSTER }] };

function fakeStorage() {
  const stored = new Map<string, { bytes: Uint8Array; contentType: string; metadata?: Record<string, string> }>();
  let uploads = 0;
  return {
    stored, get uploads() { return uploads; },
    async head(key: string) {
      const entry = stored.get(key);
      if (!entry) throw Object.assign(new Error("not found"), { $metadata: { httpStatusCode: 404 } });
      return { size: entry.bytes.byteLength, contentType: entry.contentType };
    },
    async put(input: { key: string; bytes: Uint8Array; contentType: string; metadata?: Record<string, string> }) {
      uploads++; stored.set(input.key, input);
    },
    publicUrl: (key: string) => `${PUBLIC_BASE}/${key}`,
  };
}

test("poster cache preserves real image bytes in a content-addressed R2 object and reuses unchanged content", async context => {
  configureR2(context);
  const { cacheEventPosters } = await import("./posters.ts");
  const storage = fakeStorage();
  const fetcher: typeof fetch = async (url, options) => {
    assert.equal(String(url), SOURCE_POSTER);
    assert.equal(options?.redirect, "error");
    assert.ok(options?.signal);
    return new Response(PNG, { headers: { "content-type": "image/png" } });
  };
  const first = await cacheEventPosters(raw, { storage, fetch: fetcher });
  const second = await cacheEventPosters(raw, { storage, fetch: fetcher });
  assert.equal(first.events[0].imageUrl, `${PUBLIC_BASE}/${OBJECT_KEY}`);
  assert.deepEqual(second, first);
  assert.equal(storage.uploads, 1);
  assert.deepEqual(storage.stored.get(OBJECT_KEY)?.bytes, PNG);
  assert.equal(storage.stored.get(OBJECT_KEY)?.contentType, "image/png");
  assert.equal(storage.stored.get(OBJECT_KEY)?.metadata?.["source-url"], encodeURIComponent(SOURCE_POSTER));
  assert.equal("posterSourceUrl" in first.events[0], false);
});

test("unsafe poster sources fail before network or R2 writes", async context => {
  configureR2(context);
  const { cacheEventPosters } = await import("./posters.ts");
  for (const source of ["http://127.0.0.1/a.png", "https://evil.example/Uploads/Films/test.png",
    SOURCE_POSTER.replace(".net/", ".net.evil.example/"), SOURCE_POSTER.replace("https://", "https://secret@"),
    SOURCE_POSTER.replace("/Uploads/Films/", "/private/"), SOURCE_POSTER.replace(".png", ".svg"),
    SOURCE_POSTER.replace(".net/", ".net:8443/"), SOURCE_POSTER + "?token=secret"]) {
    let reads = 0;
    const storage = fakeStorage();
    await assert.rejects(cacheEventPosters({ ...raw, events: [{ ...raw.events[0], posterSourceUrl: source }] }, {
      storage, fetch: async () => { reads++; return new Response(PNG); },
    }));
    assert.equal(reads, 0, source); assert.equal(storage.uploads, 0, source);
  }
});

test("poster downloads reject HTML, oversize headers/streams and provider errors without storing", async context => {
  configureR2(context);
  const { cacheEventPosters } = await import("./posters.ts");
  for (const response of [new Response("<html>error</html>"), new Response(PNG, { headers: { "content-length": "9000000" } }),
    new Response(new Uint8Array(8 * 1024 * 1024 + 1)), new Response("unavailable", { status: 503 })]) {
    const storage = fakeStorage();
    await assert.rejects(cacheEventPosters(raw, { storage, fetch: async () => response }));
    assert.equal(storage.uploads, 0);
  }
});

test("R2 authorization failure is not treated as a cache miss or a successful cover", async context => {
  configureR2(context);
  const { cacheEventPosters } = await import("./posters.ts");
  const storage = fakeStorage();
  storage.head = async () => { throw Object.assign(new Error("denied"), { $metadata: { httpStatusCode: 403 } }); };
  await assert.rejects(cacheEventPosters(raw, { storage, fetch: async () => new Response(PNG) }));
  assert.equal(storage.uploads, 0);
});

test("events without source posters need neither remote fetching nor storage configuration", async () => {
  const { cacheEventPosters } = await import("./posters.ts");
  const output = await cacheEventPosters(snapshot, { fetch: async () => { throw new Error("unexpected fetch"); } });
  assert.deepEqual(output, snapshot);
});
