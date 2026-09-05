import assert from "node:assert/strict";
import test from "node:test";
import { fetchBiletinialCinemaEvents } from "./biletinial-cinema.ts";

const now = new Date("2026-09-05T09:00:00.000Z");
const origin = "https://biletinial.com";

type Movie = { slug: string; title: string; eventId: number; poster?: string };

const spider: Movie = {
  slug: "orumcek-adam-yepyeni-bir-gun",
  title: "Örümcek-Adam: Yepyeni Bir Gün",
  eventId: 71792,
  poster: "https://b6s54eznn8xq.merlincdn.net/Uploads/Films/orumcek-adam.png",
};

function card(movie: Movie): string {
  return `<li><figure><a href="/tr-tr/sinema/${movie.slug}" title="${movie.title}"><img src="/listing-placeholder.jpg"></a></figure><h3><a href="/tr-tr/sinema/${movie.slug}">${movie.title}</a></h3></li>`;
}

function listing(movies: Movie[], options: { total?: number; pageSize?: number; city?: string; cityId?: string } = {}): string {
  const city = options.city ?? "Ordu";
  const cityId = options.cityId ?? "48";
  return `<!doctype html><html><head><title>${city} Vizyondaki Filmler</title></head><body>
    <ul><li class="select" data-id="${city.toLocaleLowerCase("tr-TR")}" data-name="${city}" data-cityid="${cityId}">${city}</li></ul>
    <ul id="eventListContainer">${movies.map(card).join("")}</ul>
    <input id="categoryPageSize" value="${options.pageSize ?? 50}">
    <input id="categoryListCount" value="${options.total ?? movies.length}">
  </body></html>`;
}

function detail(movie: Movie, overrides = "", canonicalUrl = `${origin}/tr-tr/sinema/${movie.slug}`): string {
  return `<!doctype html><html><head>
    <meta property="og:url" content="${canonicalUrl}">
    ${movie.poster ? `<meta property="og:image" content="${movie.poster}">` : ""}
  </head><body><script>var eventId = ${movie.eventId};</script>${overrides}</body></html>`;
}

function dates(values: string[]): string {
  return `<div class="yn_date" id="yn_dateList">${values.map((value) => `<a data-date="${value}"><h3>${value}</h3></a>`).join("")}</div>`;
}

function seances(): string {
  return `<div class="yn_cinema">
    <div class="yn_cinema_info_title"><h2 class="yn_cinema_info_titleh2"><a href="/tr-tr/mekan/fatsa-premier-sinemalari"><img src="/pin.svg">Fatsa Cinemas</a></h2>
      <meta itemprop="image" content="https://b6s54eznn8xq.merlincdn.net/Uploads/Films/avatar-suyun-yolu.jpg"></div>
    <div class="yn_cinema_salon_info"><div><h2>Salon 4</h2><span>Türkçe Dublaj</span></div><div>
      <button data-title="18554384">14:00</button><button data-title="18554384">14:00</button><button data-title="18554385">17:00</button>
    </div></div>
  </div>
  <div class="yn_cinema">
    <div class="yn_cinema_info_title"><h2 class="yn_cinema_info_titleh2"><a href="/tr-tr/mekan/unye-knk-cinemas">Ünye Knk Cinemas</a></h2></div>
    <div class="yn_cinema_salon_info"><div><h2>Salon 3</h2><span>Altyazılı</span></div><div>
      <button data-title="18546427" title="Tükendi">14:30</button>
    </div></div>
  </div>`;
}

function successfulFetcher(movie = spider, seanceHtml = seances()): typeof fetch {
  return async (input, init) => {
    assert.equal(init?.redirect, "error");
    const url = new URL(String(input));
    if (url.pathname === "/tr-tr/sinema/ordu") return new Response(listing([movie]));
    if (url.pathname === `/tr-tr/sinema/${movie.slug}`) return new Response(detail(movie));
    if (url.pathname === "/tr-tr/details/GetDateListForCity") {
      assert.equal(url.searchParams.get("eventId"), String(movie.eventId));
      assert.equal(url.searchParams.get("cityId"), "48");
      return new Response(dates(["2026-09-05"]));
    }
    if (url.pathname === `/dynamic/get_seances/${movie.eventId}/48/2026-09-05/1/tr`) return new Response(seanceHtml);
    throw new Error(`Unexpected request: ${url}`);
  };
}

test("maps Ordu cinema dates, rooms and stable sessions while using only the detail poster", async () => {
  const events = await fetchBiletinialCinemaEvents({ fetch: successfulFetcher(), now });

  assert.deepEqual(events, [{
    id: "biletinial:71792",
    source: "biletinial",
    category: "sinema",
    title: "Örümcek-Adam: Yepyeni Bir Gün",
    sourceUrl: "https://biletinial.com/tr-tr/sinema/orumcek-adam-yepyeni-bir-gun",
    imageUrl: null,
    posterSourceUrl: spider.poster,
    sessions: [
      {
        id: "biletinial:18554384",
        startsAt: "2026-09-05T11:00:00.000Z",
        venueName: "Fatsa Cinemas",
        venueAddress: null,
        room: "Salon 4 · Türkçe Dublaj",
        ticketUrl: "https://biletinial.com/tr-tr/sinema/orumcek-adam-yepyeni-bir-gun",
        ticketUrlKind: "event",
        availability: "unknown",
      },
      {
        id: "biletinial:18554385",
        startsAt: "2026-09-05T14:00:00.000Z",
        venueName: "Fatsa Cinemas",
        venueAddress: null,
        room: "Salon 4 · Türkçe Dublaj",
        ticketUrl: "https://biletinial.com/tr-tr/sinema/orumcek-adam-yepyeni-bir-gun",
        ticketUrlKind: "event",
        availability: "unknown",
      },
      {
        id: "biletinial:18546427",
        startsAt: "2026-09-05T11:30:00.000Z",
        venueName: "Ünye Knk Cinemas",
        venueAddress: null,
        room: "Salon 3 · Altyazılı",
        ticketUrl: "https://biletinial.com/tr-tr/sinema/orumcek-adam-yepyeni-bir-gun",
        ticketUrlKind: "event",
        availability: "sold-out",
      },
    ],
  }]);
  assert.notEqual(events[0].posterSourceUrl, "https://b6s54eznn8xq.merlincdn.net/Uploads/Films/avatar-suyun-yolu.jpg");
});

test("loads every listed pagination item before returning a catalog", async () => {
  const second: Movie = { slug: "ikinci-film", title: "İkinci Film", eventId: 80001, poster: "https://b6s54eznn8xq.merlincdn.net/Uploads/Films/ikinci.png" };
  const seenDetails: string[] = [];
  const fetcher: typeof fetch = async (input) => {
    const url = new URL(String(input));
    if (url.pathname === "/tr-tr/sinema/ordu") return new Response(listing([spider], { total: 2, pageSize: 1 }));
    if (url.pathname === "/tr-tr/List/GetMoreItems") {
      assert.equal(url.searchParams.get("page"), "1");
      assert.equal(url.searchParams.get("cityId"), "48");
      assert.equal(url.searchParams.get("cityUrl"), "ordu");
      assert.equal(url.searchParams.get("organizerUrl"), "sinema");
      return Response.json({ hasMore: false, items: [{ name: second.title, seoUrl: second.slug, organizerUrl: "sinema", cityName: "Ordu" }] });
    }
    const movie = [spider, second].find((candidate) => url.pathname === `/tr-tr/sinema/${candidate.slug}`);
    if (movie) { seenDetails.push(movie.slug); return new Response(detail(movie)); }
    if (url.pathname === "/tr-tr/details/GetDateListForCity") return new Response(dates([]));
    throw new Error(`Unexpected request: ${url}`);
  };

  const events = await fetchBiletinialCinemaEvents({ fetch: fetcher, now });
  assert.deepEqual(events.map((event) => event.id), ["biletinial:71792", "biletinial:80001"]);
  assert.deepEqual(seenDetails, [spider.slug, second.slug]);
});

test("normalizes only the safe www canonical alias while keeping requested event URLs strict", async () => {
  const wwwCanonical = `https://www.biletinial.com/tr-tr/sinema/${spider.slug}`;
  const events = await fetchBiletinialCinemaEvents({ fetch: async (input) => {
    const url = new URL(String(input));
    if (url.pathname === "/tr-tr/sinema/ordu") return new Response(listing([spider]));
    if (url.pathname === `/tr-tr/sinema/${spider.slug}`) return new Response(detail(spider, "", wwwCanonical));
    return new Response(dates([]));
  }, now });
  assert.equal(events[0].sourceUrl, `${origin}/tr-tr/sinema/${spider.slug}`);

  const wwwListing = listing([spider]).replaceAll(`${origin}/tr-tr/sinema/${spider.slug}`, wwwCanonical)
    .replaceAll(`/tr-tr/sinema/${spider.slug}`, wwwCanonical);
  await assert.rejects(fetchBiletinialCinemaEvents({ fetch: async () => new Response(wwwListing), now }), /unsafe|URL/i);
  await assert.rejects(fetchBiletinialCinemaEvents({ fetch: async (input) => {
    const url = new URL(String(input));
    if (url.pathname === "/tr-tr/sinema/ordu") return new Response(listing([spider]));
    return new Response(detail(spider, "", `https://other.biletinial.com/tr-tr/sinema/${spider.slug}`));
  }, now }), /unsafe|URL/i);
});

test("rejects pagination hasMore values that contradict the declared catalog count", async () => {
  const paginationItem = { name: "İkinci Film", seoUrl: "ikinci-film", organizerUrl: "sinema", cityName: "Ordu" };
  for (const scenario of [
    { total: 2, hasMore: true },
    { total: 3, hasMore: false },
  ]) await assert.rejects(fetchBiletinialCinemaEvents({ fetch: async (input) => {
    const url = new URL(String(input));
    if (url.pathname === "/tr-tr/sinema/ordu") return new Response(listing([spider], { total: scenario.total, pageSize: 1 }));
    return Response.json({ items: [paginationItem], hasMore: scenario.hasMore });
  }, now }), /hasMore|pagination|count/i);
});

test("a disabled session stays unknown unless markup positively identifies sold-out status", async () => {
  const disabledOnly = seances().replace('title="Tükendi"', "disabled");
  const events = await fetchBiletinialCinemaEvents({ fetch: successfulFetcher(spider, disabledOnly), now });
  assert.equal(events[0].sessions.find((session) => session.id === "biletinial:18546427")?.availability, "unknown");
});

test("accepts an explicit empty Ordu catalog but rejects missing listing schema", async () => {
  assert.deepEqual(await fetchBiletinialCinemaEvents({ fetch: async () => new Response(listing([], { total: 0 })), now }), []);
  await assert.rejects(fetchBiletinialCinemaEvents({
    fetch: async () => new Response(`<title>Ordu Vizyondaki Filmler</title><ul id="eventListContainer"></ul>`), now,
  }), /schema|count|page/i);
});

test("rejects wrong-city catalogs and pagination rows", async () => {
  await assert.rejects(fetchBiletinialCinemaEvents({ fetch: async () => new Response(listing([], { total: 0, city: "Giresun", cityId: "28" })), now }), /Ordu|city/i);
  await assert.rejects(fetchBiletinialCinemaEvents({ fetch: async (input) => {
    const url = new URL(String(input));
    if (url.pathname === "/tr-tr/sinema/ordu") return new Response(listing([spider], { total: 2, pageSize: 1 }));
    return Response.json({ items: [{ name: "Foreign", seoUrl: "foreign", organizerUrl: "sinema", cityName: "Giresun" }], hasMore: false });
  }, now }), /Ordu|city/i);
});

test("rejects unsafe event and poster URLs", async () => {
  const unsafeListing = listing([spider]).replace(`/tr-tr/sinema/${spider.slug}`, "https://evil.example/movie");
  await assert.rejects(fetchBiletinialCinemaEvents({ fetch: async () => new Response(unsafeListing), now }), /URL|path|unsafe/i);

  for (const poster of [
    "https://evil.example/poster.jpg",
    "https://other.merlincdn.net/Uploads/Films/poster.jpg",
    "https://b6s54eznn8xq.merlincdn.net/dist/logo.svg",
    "https://b6s54eznn8xq.merlincdn.net/Uploads/Films/poster.jpg?token=secret",
  ]) {
    await assert.rejects(fetchBiletinialCinemaEvents({ fetch: async (input) => {
      const url = new URL(String(input));
      if (url.pathname === "/tr-tr/sinema/ordu") return new Response(listing([spider]));
      return new Response(detail({ ...spider, poster }));
    }, now }), /poster/i);
  }
});

test("malformed dates, times and conflicting duplicate session IDs fail closed", async () => {
  for (const html of [
    seances().replace("14:00", "25:00"),
    seances().replace('<button data-title="18554384">14:00</button><button data-title="18554384">14:00</button>', '<button data-title="18554384">14:00</button><button data-title="18554384">15:00</button>'),
  ]) await assert.rejects(fetchBiletinialCinemaEvents({ fetch: successfulFetcher(spider, html), now }), /time|session|duplicate/i);

  await assert.rejects(fetchBiletinialCinemaEvents({ fetch: async (input) => {
    const url = new URL(String(input));
    if (url.pathname === "/tr-tr/sinema/ordu") return new Response(listing([spider]));
    if (url.pathname === `/tr-tr/sinema/${spider.slug}`) return new Response(detail(spider));
    return new Response(dates(["2026-02-30"]));
  }, now }), /date/i);
});

test("missing detail, date and seance schemas are failures rather than empty catalogs", async () => {
  const replacements = [
    { path: `/tr-tr/sinema/${spider.slug}`, body: "<html>maintenance</html>" },
    { path: "/tr-tr/details/GetDateListForCity", body: "<html>maintenance</html>" },
    { path: `/dynamic/get_seances/${spider.eventId}/48/2026-09-05/1/tr`, body: "<html>maintenance</html>" },
  ];
  for (const replacement of replacements) {
    const base = successfulFetcher();
    await assert.rejects(fetchBiletinialCinemaEvents({ fetch: async (input, init) => {
      const url = new URL(String(input));
      if (url.pathname === replacement.path) return new Response(replacement.body);
      return base(input, init);
    }, now }), /schema|event|date|seance|poster/i);
  }
});

test("bounds catalogs and published dates instead of silently truncating them", async () => {
  await assert.rejects(fetchBiletinialCinemaEvents({ fetch: async () => new Response(listing([], { total: 101 })), now }), /limit|100/i);
  const fifteenDates = Array.from({ length: 15 }, (_, index) => `2026-09-${String(index + 5).padStart(2, "0")}`);
  await assert.rejects(fetchBiletinialCinemaEvents({ fetch: async (input) => {
    const url = new URL(String(input));
    if (url.pathname === "/tr-tr/sinema/ordu") return new Response(listing([spider]));
    if (url.pathname === `/tr-tr/sinema/${spider.slug}`) return new Response(detail(spider));
    return new Response(dates(fifteenDates));
  }, now }), /date|14|limit/i);
});

test("HTTP reads reject oversized responses and never return a partial catalog", async () => {
  await assert.rejects(fetchBiletinialCinemaEvents({ fetch: async () => new Response("", { headers: { "content-length": "9000000" } }), now }), /large|size/i);
  let calls = 0;
  await assert.rejects(fetchBiletinialCinemaEvents({ fetch: async (input, init) => {
    calls++;
    if (calls === 1) return new Response(listing([spider]));
    if (calls === 2) return new Response(detail(spider));
    if (calls === 3) return new Response(dates(["2026-09-05"]));
    return new Response("unavailable", { status: 503 });
  }, now }), /503/);
  assert.equal(calls, 4);
});
