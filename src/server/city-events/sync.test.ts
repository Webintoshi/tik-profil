import assert from "node:assert/strict";
import test from "node:test";
import type { CityEventSnapshot } from "./contracts.ts";
import { parseSyncArguments, syncCityEvents } from "./sync.ts";

const snapshot: CityEventSnapshot = { city: "ordu", source: "biletinial", fetchedAt: "2026-09-05T09:00:00.000Z", events: [] };
test("dry-run reads sources but never writes or needs publication permission", async () => {
  let writes = 0;
  const result = await syncCityEvents({ sources: ["biletinial"], apply: false, publishedSources: [] }, {
    fetchSnapshot: async () => snapshot,
    saveSnapshot: async () => { writes++; },
  });
  assert.equal(result.ok, true);
  assert.equal(result.sources[0].status, "dry-run");
  assert.equal(writes, 0);
});
test("apply permission is validated before any fetching or writes", async () => {
  let reads = 0, writes = 0;
  await assert.rejects(syncCityEvents({ sources: ["biletinial", "biletiva"], apply: true, publishedSources: ["biletinial"] }, {
    fetchSnapshot: async () => { reads++; return snapshot; },
    saveSnapshot: async () => { writes++; },
  }), /permission|published/i);
  assert.equal(reads, 0); assert.equal(writes, 0);
});
test("source failure retains old data while another validated source can update", async () => {
  const writes: CityEventSnapshot[] = [];
  const result = await syncCityEvents({ sources: ["biletinial", "biletiva"], apply: true, publishedSources: ["biletinial", "biletiva"] }, {
    fetchSnapshot: async source => { if (source === "biletinial") throw new Error("HTTP 503"); return { ...snapshot, source }; },
    saveSnapshot: async value => { writes.push(value); },
  });
  assert.equal(result.ok, false);
  assert.deepEqual(result.sources.map(s => s.status), ["failed", "saved"]);
  assert.deepEqual(writes.map(s => s.source), ["biletiva"]);
});
test("a mismatched adapter cannot overwrite a different source", async () => {
  let writes = 0;
  const result = await syncCityEvents({ sources: ["biletiva"], apply: true, publishedSources: ["biletiva"] }, {
    fetchSnapshot: async () => snapshot, saveSnapshot: async () => { writes++; },
  });
  assert.equal(result.ok, false); assert.equal(writes, 0);
});
test("CLI defaults to dry-run, accepts explicit source and rejects unknown arguments", () => {
  assert.deepEqual(parseSyncArguments([]), { apply: false, sources: ["biletinial", "biletiva"] });
  assert.deepEqual(parseSyncArguments(["--apply", "--source=biletiva"]), { apply: true, sources: ["biletiva"] });
  for (const args of [["--force"], ["--source=other"], ["--apply=false"], ["--source="]]) assert.throws(() => parseSyncArguments(args));
});

test("dry-run performs the same full snapshot validation as publication", async () => {
  const invalid = { ...snapshot, events: [{ id: "biletinial:123", source: "biletinial" as const, category: "tiyatro" as const,
    title: "x".repeat(301), sourceUrl: "https://biletinial.com/tr-tr/tiyatro/test", imageUrl: null, sessions: [] }] };
  const result = await syncCityEvents({ sources: ["biletinial"], apply: false, publishedSources: [] }, {
    fetchSnapshot: async () => invalid, saveSnapshot: async () => { throw new Error("must not write"); },
  });
  assert.equal(result.ok, false);
  assert.equal(result.sources[0].status, "failed");
});
