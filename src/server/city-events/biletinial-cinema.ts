import { parse } from "node-html-parser";
import type { CityEvent, CityEventSession } from "./contracts.ts";

const ORIGIN = "https://biletinial.com";
const LISTING_URL = `${ORIGIN}/tr-tr/sinema/ordu`;
const POSTER_HOST = "b6s54eznn8xq.merlincdn.net";
const CITY_ID = "48";
const MAX_FILMS = 100;
const MAX_DATES_PER_FILM = 14;
const MAX_SESSIONS_PER_FILM = 500;
const MAX_RESPONSE_BYTES = 5_000_000;
const REQUEST_TIMEOUT_MS = 20_000;
const LIVE_REQUEST_INTERVAL_MS = 75;

type Options = { fetch?: typeof fetch; now?: Date };
type RecordValue = Record<string, unknown>;
type ListingMovie = { title: string; sourceUrl: string; slug: string };

function asRecord(value: unknown, label: string): RecordValue {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`Invalid ${label} schema`);
  return value as RecordValue;
}

function boundedText(value: unknown, label: string, maximum = 300): string {
  if (typeof value !== "string") throw new Error(`Invalid ${label}`);
  const normalized = value.replace(/\s+/g, " ").trim();
  if (!normalized || normalized.length > maximum) throw new Error(`Invalid ${label}`);
  return normalized;
}

function numericId(value: unknown, label: string): string {
  const normalized = typeof value === "number" && Number.isSafeInteger(value) ? String(value) : value;
  if (typeof normalized !== "string" || !/^\d{1,30}$/.test(normalized)) throw new Error(`Invalid ${label}`);
  return normalized;
}

function safeEventUrl(value: unknown): { url: string; slug: string } {
  const raw = boundedText(value, "Biletinial event URL", 2_048);
  let url: URL;
  try {
    url = new URL(raw, ORIGIN);
  } catch {
    throw new Error("Invalid Biletinial event URL");
  }
  if (url.origin !== ORIGIN || url.username || url.password || url.search || url.hash) throw new Error("Unsafe Biletinial event URL");
  const match = /^\/tr-tr\/sinema\/([a-z0-9]+(?:-[a-z0-9]+)*)$/.exec(url.pathname);
  if (!match) throw new Error("Invalid Biletinial cinema event path");
  return { url: url.toString(), slug: match[1] };
}

function safeCanonicalEventUrl(value: unknown): { url: string; slug: string } {
  const raw = boundedText(value, "Biletinial canonical event URL", 2_048);
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error("Invalid Biletinial canonical event URL");
  }
  if (url.protocol !== "https:" || url.username || url.password || url.port || url.search || url.hash
      || (url.hostname !== "biletinial.com" && url.hostname !== "www.biletinial.com")) {
    throw new Error("Unsafe Biletinial canonical event URL");
  }
  url.hostname = "biletinial.com";
  return safeEventUrl(url.toString());
}

function safeVenueUrl(value: unknown): void {
  const raw = boundedText(value, "Biletinial venue URL", 2_048);
  let url: URL;
  try {
    url = new URL(raw, ORIGIN);
  } catch {
    throw new Error("Invalid Biletinial venue URL");
  }
  if (url.origin !== ORIGIN || url.username || url.password || url.search || url.hash
      || !/^\/tr-tr\/mekan\/[a-z0-9]+(?:-[a-z0-9]+)*$/.test(url.pathname)) {
    throw new Error("Unsafe Biletinial venue URL");
  }
}

function safePosterUrl(value: unknown): string {
  const raw = boundedText(value, "Biletinial poster URL", 2_048);
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error("Invalid Biletinial poster URL");
  }
  if (url.protocol !== "https:" || url.username || url.password || url.port || url.search || url.hash
      || url.hostname !== POSTER_HOST || !url.pathname.startsWith("/Uploads/Films/")
      || !/\.(?:png|jpe?g|webp|avif)$/i.test(url.pathname)) {
    throw new Error("Unsafe Biletinial poster URL");
  }
  return url.toString();
}

function createBodyFetcher(fetcher: typeof fetch, paceLiveRequests: boolean): (url: string) => Promise<string> {
  let lastStartedAt = 0;
  return async (url: string) => {
    if (paceLiveRequests) {
      const wait = LIVE_REQUEST_INTERVAL_MS - (Date.now() - lastStartedAt);
      if (wait > 0) await new Promise<void>((resolve) => setTimeout(resolve, wait));
      lastStartedAt = Date.now();
    }
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const response = await fetcher(url, {
        signal: controller.signal,
        redirect: "error",
        headers: {
          Accept: "application/json,text/html",
          "User-Agent": "TikProfil-Events/1.0 (+https://tikprofil.com)",
        },
      });
      if (!response.ok) throw new Error(`Biletinial HTTP ${response.status}`);
      const declaredLength = response.headers.get("content-length");
      if (declaredLength !== null && Number(declaredLength) > MAX_RESPONSE_BYTES) throw new Error("Biletinial response too large");
      if (!response.body) throw new Error("Empty Biletinial response body");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let body = "";
      let bytes = 0;
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          bytes += value.byteLength;
          if (bytes > MAX_RESPONSE_BYTES) throw new Error("Biletinial response too large");
          body += decoder.decode(value, { stream: true });
        }
        return body + decoder.decode();
      } finally {
        await reader.cancel().catch(() => undefined);
      }
    } finally {
      clearTimeout(timeout);
    }
  };
}

function parseIntegerInput(root: ReturnType<typeof parse>, selector: string, label: string): number {
  const raw = root.querySelector(selector)?.getAttribute("value");
  if (typeof raw !== "string" || !/^\d+$/.test(raw)) throw new Error(`Missing or invalid Biletinial ${label} schema`);
  const value = Number(raw);
  if (!Number.isSafeInteger(value)) throw new Error(`Invalid Biletinial ${label}`);
  return value;
}

function parseInitialCard(node: ReturnType<typeof parse>): ListingMovie {
  const titleLink = node.querySelector("h3 a");
  const posterLink = node.querySelector("figure a");
  if (!titleLink || !posterLink) throw new Error("Invalid Biletinial film card schema");
  const title = boundedText(titleLink.text, "Biletinial film title");
  const titleUrl = safeEventUrl(titleLink.getAttribute("href"));
  const posterUrl = safeEventUrl(posterLink.getAttribute("href"));
  if (titleUrl.url !== posterUrl.url) throw new Error("Conflicting Biletinial film card URLs");
  return { title, sourceUrl: titleUrl.url, slug: titleUrl.slug };
}

function parsePaginationMovie(value: unknown): ListingMovie {
  const row = asRecord(value, "Biletinial pagination item");
  const title = boundedText(row.name, "Biletinial film title");
  if (row.cityName !== "Ordu") throw new Error("Biletinial pagination item is not scoped to Ordu city");
  if (row.organizerUrl !== "sinema") throw new Error("Biletinial pagination item is not a cinema event");
  const slug = boundedText(row.seoUrl, "Biletinial film slug", 300);
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) throw new Error("Invalid Biletinial film slug");
  const parsed = safeEventUrl(`/tr-tr/sinema/${slug}`);
  return { title, sourceUrl: parsed.url, slug: parsed.slug };
}

async function fetchListing(fetchBody: (url: string) => Promise<string>): Promise<ListingMovie[]> {
  const root = parse(await fetchBody(LISTING_URL));
  const title = root.querySelector("title")?.text.replace(/\s+/g, " ").trim();
  const selectedCity = root.querySelector('li.select[data-id="ordu"][data-cityid="48"]');
  if (!title?.startsWith("Ordu ") || selectedCity?.getAttribute("data-name") !== "Ordu") {
    throw new Error("Biletinial listing city schema is not scoped to Ordu city ID 48");
  }
  if (!root.querySelector("#eventListContainer")) throw new Error("Missing Biletinial event list schema");
  const pageSize = parseIntegerInput(root, "#categoryPageSize", "page size");
  const total = parseIntegerInput(root, "#categoryListCount", "event count");
  if (pageSize < 1 || pageSize > MAX_FILMS) throw new Error("Biletinial page size exceeds the safe limit");
  if (total > MAX_FILMS) throw new Error(`Biletinial film count exceeds the ${MAX_FILMS} film limit`);

  const movies = root.querySelectorAll("#eventListContainer > li").map(parseInitialCard);
  if (movies.length > pageSize || movies.length > total || (total > 0 && movies.length === 0)) {
    throw new Error("Invalid Biletinial listing count schema");
  }
  const seenUrls = new Set<string>();
  for (const movie of movies) {
    if (seenUrls.has(movie.sourceUrl)) throw new Error("Duplicate Biletinial film listing URL");
    seenUrls.add(movie.sourceUrl);
  }

  for (let page = 1; movies.length < total; page++) {
    if (page > MAX_FILMS) throw new Error("Biletinial pagination exceeded the safe limit");
    const url = new URL("/tr-tr/List/GetMoreItems", ORIGIN);
    url.search = new URLSearchParams({
      region: "tr-tr",
      cityId: CITY_ID,
      cityUrl: "ordu",
      order: "0",
      isKids: "false",
      isCampaign: "false",
      isForeign: "false",
      organizerUrl: "sinema",
      page: String(page),
    }).toString();
    let decoded: unknown;
    try {
      decoded = JSON.parse(await fetchBody(url.toString()));
    } catch (error) {
      throw new Error("Invalid Biletinial pagination JSON", { cause: error });
    }
    const response = asRecord(decoded, "Biletinial pagination response");
    if (!Array.isArray(response.items)) throw new Error("Invalid Biletinial pagination items schema");
    if (response.hasMore !== undefined && typeof response.hasMore !== "boolean") throw new Error("Invalid Biletinial pagination hasMore schema");
    if (response.TotalCount !== undefined && response.TotalCount !== total) throw new Error("Biletinial pagination total changed during fetch");
    if (response.items.length === 0) throw new Error("Biletinial pagination ended before the complete catalog was fetched");
    if (response.items.length > pageSize || movies.length + response.items.length > total) throw new Error("Biletinial pagination count exceeds the declared catalog");
    const projectedCount = movies.length + response.items.length;
    if (response.hasMore === true && projectedCount === total) throw new Error("Biletinial pagination hasMore contradicts the declared catalog count");
    if (response.hasMore === false && projectedCount < total) throw new Error("Biletinial pagination hasMore ended before the declared catalog count");
    for (const item of response.items) {
      const movie = parsePaginationMovie(item);
      if (seenUrls.has(movie.sourceUrl)) throw new Error("Biletinial pagination repeated without progress");
      seenUrls.add(movie.sourceUrl);
      movies.push(movie);
    }
  }
  return movies;
}

function parseDetail(html: string, movie: ListingMovie): { eventId: string; posterSourceUrl: string } {
  const root = parse(html);
  const canonical = safeCanonicalEventUrl(root.querySelector('meta[property="og:url"]')?.getAttribute("content"));
  if (canonical.url !== movie.sourceUrl) throw new Error("Biletinial detail URL does not match the listed film");
  const posterSourceUrl = safePosterUrl(root.querySelector('meta[property="og:image"]')?.getAttribute("content"));
  const eventIds = new Set<string>();
  for (const script of root.querySelectorAll("script")) {
    for (const match of script.innerHTML.matchAll(/\bvar\s+eventId\s*=\s*(\d+)\s*;/g)) eventIds.add(numericId(match[1], "Biletinial event ID"));
  }
  if (eventIds.size !== 1) throw new Error("Missing or ambiguous Biletinial event ID schema");
  return { eventId: [...eventIds][0], posterSourceUrl };
}

function calendarDate(value: unknown): string {
  if (typeof value !== "string") throw new Error("Invalid Biletinial published date");
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) throw new Error("Invalid Biletinial published date");
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  if (date.getUTCFullYear() !== Number(match[1]) || date.getUTCMonth() !== Number(match[2]) - 1 || date.getUTCDate() !== Number(match[3])) {
    throw new Error("Invalid Biletinial calendar date");
  }
  return value;
}

function parseDates(html: string): string[] {
  const root = parse(html);
  const container = root.querySelector("#yn_dateList");
  if (!container) throw new Error("Missing Biletinial published date schema");
  const anchors = container.querySelectorAll("a");
  if (anchors.length > MAX_DATES_PER_FILM) throw new Error(`Biletinial published date count exceeds the ${MAX_DATES_PER_FILM} date limit`);
  const dates = anchors.map((anchor) => calendarDate(anchor.getAttribute("data-date")));
  if (new Set(dates).size !== dates.length) throw new Error("Duplicate Biletinial published date");
  return dates;
}

function startsAt(date: string, value: string): string {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match || Number(match[1]) > 23 || Number(match[2]) > 59) throw new Error("Invalid Biletinial session time");
  const parsed = new Date(`${date}T${value}:00+03:00`);
  if (!Number.isFinite(parsed.getTime())) throw new Error("Invalid Biletinial session timestamp");
  return parsed.toISOString();
}

function soldOut(button: ReturnType<typeof parse>): boolean {
  const marker = [button.getAttribute("class"), button.getAttribute("title"), button.getAttribute("data-status"), button.getAttribute("aria-label")]
    .filter((value): value is string => typeof value === "string")
    .join(" ")
    .toLocaleLowerCase("tr-TR");
  return marker.includes("sold-out") || marker.includes("sold out") || marker.includes("tükendi") || marker.includes("tukendi") || marker.includes("dolu");
}

function parseSeances(html: string, date: string, movie: ListingMovie): CityEventSession[] {
  const root = parse(html);
  const cinemas = root.querySelectorAll(".yn_cinema");
  if (cinemas.length === 0) throw new Error("Missing Biletinial seance schema for a published date");
  const sessions: CityEventSession[] = [];
  for (const cinema of cinemas) {
    const venueLink = cinema.querySelector(".yn_cinema_info_titleh2 a");
    if (!venueLink) throw new Error("Missing Biletinial cinema venue schema");
    safeVenueUrl(venueLink.getAttribute("href"));
    const venueName = boundedText(venueLink.text, "Biletinial venue name");
    const rooms = cinema.querySelectorAll(".yn_cinema_salon_info");
    if (rooms.length === 0) throw new Error("Missing Biletinial cinema room schema");
    for (const roomNode of rooms) {
      const roomName = boundedText(roomNode.querySelector("h2")?.text, "Biletinial room name", 120);
      const language = boundedText(roomNode.querySelector("span")?.text, "Biletinial room language", 120);
      const room = boundedText(`${roomName} · ${language}`, "Biletinial room", 120);
      const buttons = roomNode.querySelectorAll("button");
      if (buttons.length === 0) throw new Error("Missing Biletinial session buttons schema");
      for (const button of buttons) {
        const sourceSessionId = numericId(button.getAttribute("data-title"), "Biletinial session ID");
        const time = boundedText(button.text, "Biletinial session time", 20);
        sessions.push({
          id: `biletinial:${sourceSessionId}`,
          startsAt: startsAt(date, time),
          venueName,
          venueAddress: null,
          room,
          ticketUrl: movie.sourceUrl,
          ticketUrlKind: "event",
          availability: soldOut(button) ? "sold-out" : "unknown",
        });
      }
    }
  }
  return sessions;
}

export async function fetchBiletinialCinemaEvents(options: Options = {}): Promise<Array<CityEvent & { posterSourceUrl?: string | null }>> {
  const referenceTime = options.now ?? new Date();
  if (!Number.isFinite(referenceTime.getTime())) throw new Error("Invalid cinema provider reference time");
  const fetcher = options.fetch ?? fetch;
  const fetchBody = createBodyFetcher(fetcher, options.fetch === undefined);
  const movies = await fetchListing(fetchBody);
  const events: Array<CityEvent & { posterSourceUrl?: string | null }> = [];
  const eventIds = new Set<string>();
  const allSessions = new Map<string, CityEventSession>();

  for (const movie of movies) {
    const detail = parseDetail(await fetchBody(movie.sourceUrl), movie);
    const eventId = `biletinial:${detail.eventId}`;
    if (eventIds.has(eventId)) throw new Error("Duplicate Biletinial cinema event ID");
    eventIds.add(eventId);

    const dateUrl = new URL("/tr-tr/details/GetDateListForCity", ORIGIN);
    dateUrl.search = new URLSearchParams({ eventId: detail.eventId, langId: "1", cityId: CITY_ID }).toString();
    const publishedDates = parseDates(await fetchBody(dateUrl.toString()));
    const sessions: CityEventSession[] = [];
    for (const date of publishedDates) {
      const seanceUrl = `${ORIGIN}/dynamic/get_seances/${detail.eventId}/${CITY_ID}/${date}/1/tr`;
      for (const session of parseSeances(await fetchBody(seanceUrl), date, movie)) {
        const prior = allSessions.get(session.id);
        if (prior) {
          if (JSON.stringify(prior) !== JSON.stringify(session)) throw new Error(`Conflicting duplicate Biletinial session ID: ${session.id}`);
          continue;
        }
        allSessions.set(session.id, session);
        sessions.push(session);
        if (sessions.length > MAX_SESSIONS_PER_FILM) throw new Error("Biletinial session count exceeds the safe limit");
      }
    }
    events.push({
      id: eventId,
      source: "biletinial",
      category: "sinema",
      title: movie.title,
      sourceUrl: movie.sourceUrl,
      imageUrl: null,
      posterSourceUrl: detail.posterSourceUrl,
      sessions,
    });
  }
  return events;
}
