import assert from "node:assert/strict";
import test from "node:test";
import { fetchBiletinialSnapshot } from "./providers.ts";

const now = new Date("2026-09-05T09:00:00.000Z");
const theater = { etkinlikId: 123, etkinlik: "Ordu Sahnesi", seanceId: 456, mekan: "Ordu AKM",
  tip: "Tiyatro", tipForUrl: "tiyatro", url: "ordu-sahnesi", SeanceDate: "2026-09-05T20:30:00", pic: "/Uploads/Films/sahne.jpg" };
const movieUrl = "https://biletinial.com/tr-tr/sinema/film";
const poster = "https://b6s54eznn8xq.merlincdn.net/Uploads/Films/film.png";

function fixture(options: { failCinema?: boolean; overlap?: boolean } = {}): typeof fetch {
  return async input => {
    const url = new URL(String(input));
    assert.equal(url.origin, "https://biletinial.com", "Biletiva must never be contacted");
    if (url.pathname === "/tr-tr/GetAllEventsByCity") return Response.json({ HasMore: false, Data: [theater, ...(options.overlap ? [{
      ...theater, etkinlikId: 71792, seanceId: 18554384, etkinlik: "Film", tip: "Sinema", tipForUrl: "sinema", url: "film", SeanceDate: "2026-09-05T14:00:00",
    }] : [])] });
    if (url.pathname === "/tr-tr/sinema/ordu") {
      if (options.failCinema) return new Response("unavailable", { status: 503 });
      return new Response(`<title>Ordu Sinema</title><li class="select" data-id="ordu" data-cityid="48" data-name="Ordu"></li>
        <input id="categoryPageSize" value="50"><input id="categoryListCount" value="1">
        <ul id="eventListContainer"><li><figure><a href="${movieUrl}"></a></figure><h3><a href="${movieUrl}">Film</a></h3></li></ul>`);
    }
    if (url.toString() === movieUrl) return new Response(`<meta property="og:url" content="${movieUrl}"><meta property="og:image" content="${poster}"><script>var eventId = 71792;</script>`);
    if (url.pathname === "/tr-tr/details/GetDateListForCity") return new Response('<div id="yn_dateList"><a data-date="2026-09-05"></a></div>');
    if (url.pathname === "/dynamic/get_seances/71792/48/2026-09-05/1/tr") return new Response(`<div class="yn_cinema">
      <h2 class="yn_cinema_info_titleh2"><a href="/tr-tr/mekan/fatsa-premier-sinemalari">Fatsa Cinemas</a></h2>
      <div class="yn_cinema_salon_info"><h2>Salon 4</h2><span>Türkçe Dublaj</span><button data-title="18554384">14:00</button></div></div>`);
    throw new Error(`Unexpected provider route ${url.pathname}`);
  };
}

test("the scheduled provider includes both city events and cinema with genuine poster references", async () => {
  const snapshot = await fetchBiletinialSnapshot({ now, fetch: fixture() });
  assert.equal(snapshot.fetchedAt, "2026-09-05T09:00:00.000Z");
  assert.deepEqual(snapshot.events.map(event => event.category), ["tiyatro", "sinema"]);
  assert.deepEqual(snapshot.events.map(event => event.posterSourceUrl), ["https://b6s54eznn8xq.merlincdn.net/Uploads/Films/sahne.jpg", poster]);
  assert.equal(snapshot.events[1].sessions[0].startsAt, "2026-09-05T11:00:00.000Z");
  assert.equal(snapshot.events[1].imageUrl, null, "poster publication is a later R2 step");
});

test("cinema failure rejects the entire provider snapshot, never silently retaining only stage events", async () => {
  await assert.rejects(fetchBiletinialSnapshot({ now, fetch: fixture({ failCinema: true }) }), /503/);
});

test("overlapping city-feed cinema IDs are enriched once with correct poster and room", async () => {
  const snapshot = await fetchBiletinialSnapshot({ now, fetch: fixture({ overlap: true }) });
  const movie = snapshot.events.find(event => event.id === "biletinial:71792")!;
  assert.equal(snapshot.events.length, 2);
  assert.equal(movie.posterSourceUrl, poster);
  assert.equal(movie.sessions.length, 1);
  assert.equal(movie.sessions[0].venueName, "Fatsa Cinemas");
  assert.equal(movie.sessions[0].room, "Salon 4 · Türkçe Dublaj");
});
