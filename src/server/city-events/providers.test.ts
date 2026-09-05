import assert from "node:assert/strict";
import test from "node:test";
import { fetchBiletinialSnapshot, fetchBiletivaSnapshot, parseBiletivaHtml } from "./providers.ts";

const now = new Date("2026-09-05T09:00:00.000Z");
const row = {
  etkinlikId: 123, etkinlik: "Test Sahnesi", seanceId: 456, mekanId: 38062,
  mekan: "Ordu Atatürk Kültür Merkezi", tip: "Tiyatro", tipForUrl: "tiyatro",
  url: "test-sahnesi", SeanceDate: "2026-09-05T20:30:00", SaleStatus: 0,
  pic: "/copyrighted-poster.jpg", KoltukKontrol: 12,
};
const theaterId = "https://www.biletiva.com/place/ORDU_CINEVIZYON_SINEMASI/#business";
const movieId = "https://www.biletiva.com/event/TEST123#movie";
function cinemaHtml(overrides: Record<string, unknown> = {}) {
  return `<html><script type="application/ld+json">${JSON.stringify({ "@graph": [
    { "@type": "MovieTheater", "@id": theaterId, name: "Ordu Cinevizyon Sineması", address: { streetAddress: "Test Caddesi", addressLocality: "Ordu" } },
    { "@type": "Movie", "@id": movieId, name: "Test Filmi", image: "https://cdn.biletiva.com/poster.jpg", description: "Not licensed" },
    { "@type": "ScreeningEvent", workPresented: { "@id": movieId },
      location: { name: "SALON3", containedInPlace: { "@id": theaterId } },
      offers: { url: "https://www.biletiva.com/place/ORDU_CINEVIZYON_SINEMASI?scode=ORDU_CINEVIZYON_SINEMASI&lid=42", availability: "https://schema.org/InStock" },
      startDate: "2026-09-05T20:30:00+03:00", eventStatus: "https://schema.org/EventScheduled", ...overrides },
  ] })}</script></html>`;
}

test("Biletinial exhausts pagination and groups stable event IDs without inventing availability or posters", async () => {
  const urls: string[] = [];
  const fetcher: typeof fetch = async (input) => {
    const url = new URL(String(input)); urls.push(url.toString());
    assert.equal(url.pathname, "/tr-tr/GetAllEventsByCity", "use the observed canonical locale route, without automatic redirects");
    assert.equal(url.searchParams.get("cityId"), "48");
    const page = url.searchParams.get("pageNumber");
    return Response.json({ Data: [{ ...row, seanceId: page === "1" ? 456 : 457 }], HasMore: page === "1" });
  };
  const result = await fetchBiletinialSnapshot({ fetch: fetcher, now });
  assert.equal(urls.length, 2);
  assert.equal(result.events.length, 1);
  assert.equal(result.events[0].id, "biletinial:123");
  assert.deepEqual(result.events[0].sessions.map(s => s.id), ["biletinial:456", "biletinial:457"]);
  assert.equal(result.events[0].sessions[0].startsAt, "2026-09-05T17:30:00.000Z");
  assert.equal(result.events[0].sessions[0].availability, "unknown");
  assert.equal(result.events[0].sessions[0].ticketUrlKind, "event");
  assert.equal(result.events[0].sourceUrl, "https://biletinial.com/tr-tr/tiyatro/test-sahnesi");
  assert.equal(result.events[0].imageUrl, null);
});

test("pagination failure never returns a partial Biletinial snapshot", async () => {
  let calls = 0;
  await assert.rejects(fetchBiletinialSnapshot({ now, fetch: async () => ++calls === 1
    ? Response.json({ Data: [row], HasMore: true }) : new Response("unavailable", { status: 503 }) }), /503/);
});

test("repeated Biletinial pages fail boundedly instead of silently truncating", async () => {
  let calls = 0;
  await assert.rejects(fetchBiletinialSnapshot({ now, fetch: async () => {
    calls++; return Response.json({ Data: [row], HasMore: true });
  } }), /repeat|progress/i);
  assert.equal(calls, 2);
});

test("source schema changes or impossible local dates reject the entire snapshot", async () => {
  for (const data of [ { Data: [row] }, { Data: [{ ...row, SeanceDate: "2026-02-30T20:30:00" }], HasMore: false } ]) {
    await assert.rejects(fetchBiletinialSnapshot({ now, fetch: async () => Response.json(data) }));
  }
});

test("known child event metadata maps to children without guessing from a movie title", async () => {
  const result = await fetchBiletinialSnapshot({ now, fetch: async () => Response.json({ Data: [
    { ...row, tip: "Çocuk Tiyatrosu" },
    { ...row, etkinlikId: 124, seanceId: 458, tip: "Müzik", tipForUrl: "muzik" },
  ], HasMore: false }) });
  assert.deepEqual(result.events.map(e => e.category), ["cocuk", "konser"]);
});

test("Biletiva joins screenings to films and the scoped Ordu venue", () => {
  const result = parseBiletivaHtml(cinemaHtml(), now);
  const event = result.events[0];
  assert.equal(event.id, "biletiva:TEST123");
  assert.equal(event.title, "Test Filmi");
  assert.equal(event.imageUrl, null);
  assert.equal(event.sessions[0].id, "biletiva:42");
  assert.equal(event.sessions[0].startsAt, "2026-09-05T17:30:00.000Z");
  assert.equal(event.sessions[0].venueName, "Ordu Cinevizyon Sineması");
  assert.equal(event.sessions[0].room, "SALON3");
  assert.equal(event.sessions[0].ticketUrlKind, "session");
  assert.equal(event.sessions[0].availability, "available");
  assert.equal("description" in event, false);
});

test("cancelled screenings are omitted; sold out is not guessed available", () => {
  assert.equal(parseBiletivaHtml(cinemaHtml({ eventStatus: "https://schema.org/EventCancelled" }), now).events.length, 0);
  const result = parseBiletivaHtml(cinemaHtml({ offers: {
    url: "https://www.biletiva.com/place/ORDU_CINEVIZYON_SINEMASI?lid=42",
    availability: "https://schema.org/SoldOut",
  } }), now);
  assert.equal(result.events[0].sessions[0].availability, "sold-out");
});

test("Biletiva rejects unrelated venue data, broken film joins and unsafe ticket links", () => {
  for (const overrides of [
    { location: { name: "Salon", containedInPlace: { "@id": "https://www.biletiva.com/place/ISTANBUL/#business" } } },
    { workPresented: { "@id": "missing" } },
    { offers: { url: "https://evil.example/ticket?lid=42" } },
    { startDate: "2026-09-05T20:30:00" },
  ]) assert.throws(() => parseBiletivaHtml(cinemaHtml(overrides), now));
  assert.throws(() => parseBiletivaHtml("<html>Maintenance</html>", now));
});

test("HTTP source fetching refuses redirects and oversized bodies", async () => {
  await assert.rejects(fetchBiletivaSnapshot({ now, fetch: async (_url, options) => {
    assert.equal(options?.redirect, "error");
    return new Response("", { headers: { "content-length": "9000000" } });
  } }), /large|size/i);
});

test("missing category metadata is a schema failure, not a valid empty catalog", async () => {
  await assert.rejects(fetchBiletinialSnapshot({ now, fetch: async () => Response.json({
    Data: [{ ...row, tip: undefined }], HasMore: false,
  }) }), /category|type/i);
});

test("snapshot version records fetch start so an older slow run cannot win by finishing last", async context => {
  context.mock.timers.enable({ apis: ["Date"], now: now.getTime() });
  const result = await fetchBiletinialSnapshot({ fetch: async () => {
    context.mock.timers.setTime(now.getTime() + 10_000);
    return Response.json({ Data: [row], HasMore: false });
  } });
  assert.equal(result.fetchedAt, "2026-09-05T09:00:00.000Z");
});
