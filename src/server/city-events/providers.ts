import { parse } from "node-html-parser";
import type { CityEvent, CityEventSession, CityEventSnapshot, EventCategory } from "./contracts.ts";

const BILETINIAL = "https://biletinial.com";
const BILETIVA = "https://www.biletiva.com";
export const ORDU_CINEMA_URL = `${BILETIVA}/place/ORDU_CINEVIZYON_SINEMASI`;
const MAX_RESPONSE_BYTES = 5_000_000;
const MAX_PAGES = 30;
type RecordValue = Record<string, unknown>;
type Options = { fetch?: typeof fetch; now?: Date };

function record(value: unknown): RecordValue {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Invalid provider object");
  return value as RecordValue;
}
function text(value: unknown, field: string): string {
  if (typeof value !== "string" || !value.trim() || value.length > 1000) throw new Error(`Invalid ${field}`);
  return parse(value).text.trim();
}
function sourceId(value: unknown): string {
  const id = typeof value === "number" && Number.isSafeInteger(value) ? String(value) : value;
  if (typeof id !== "string" || !/^[a-zA-Z0-9_-]{1,100}$/.test(id)) throw new Error("Invalid provider ID");
  return id;
}
function sourceDate(value: unknown, allowLocal: boolean): string {
  if (typeof value !== "string") throw new Error("Invalid session date");
  const parts = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d{1,3})?(Z|[+-]\d{2}:\d{2})?$/.exec(value);
  if (!parts || (!parts[7] && !allowLocal)) throw new Error("Session date requires a timezone");
  const [, year, month, day, hour, minute, second] = parts;
  const calendar = new Date(Date.UTC(+year, +month - 1, +day));
  if (calendar.getUTCFullYear() !== +year || calendar.getUTCMonth() !== +month - 1 || calendar.getUTCDate() !== +day || +hour > 23 || +minute > 59 || +second > 59) {
    throw new Error("Invalid session calendar date");
  }
  const date = new Date(parts[7] ? value : `${value}+03:00`);
  if (!Number.isFinite(date.getTime())) throw new Error("Invalid session date");
  return date.toISOString();
}
function providerUrl(value: unknown, origin: string): URL {
  const url = new URL(text(value, "provider URL"), origin);
  if (url.origin !== origin || url.username || url.password) throw new Error("Unsafe provider URL");
  return url;
}

async function fetchBody(url: string, fetcher: typeof fetch): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);
  try {
    const response = await fetcher(url, {
      signal: controller.signal, redirect: "error",
      headers: { Accept: "application/json,text/html", "User-Agent": "TikProfil-Events/1.0 (+https://tikprofil.com)" },
    });
    if (!response.ok) throw new Error(`Provider HTTP ${response.status}`);
    if (Number(response.headers.get("content-length")) > MAX_RESPONSE_BYTES) throw new Error("Provider response too large");
    if (!response.body) throw new Error("Empty provider response body");
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let content = "", size = 0;
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > MAX_RESPONSE_BYTES) throw new Error("Provider response too large");
        content += decoder.decode(value, { stream: true });
      }
      return content + decoder.decode();
    } finally { await reader.cancel().catch(() => undefined); }
  } finally { clearTimeout(timeout); }
}

function categoryFromType(value: unknown): EventCategory | null {
  const label = text(value, "category type").toLocaleLowerCase("tr");
  if (label.includes("çocuk")) return "cocuk";
  if (label === "sinema") return "sinema";
  if (label === "tiyatro" || label === "stand up" || label === "stand-up") return "tiyatro";
  if (label === "müzik" || label === "muzik" || label === "konser") return "konser";
  return null;
}

export async function fetchBiletinialSnapshot(options: Options = {}): Promise<CityEventSnapshot> {
  const fetchedAt = (options.now ?? new Date()).toISOString();
  const events = new Map<string, CityEvent>();
  const seenSessions = new Set<string>();
  const fetcher = options.fetch ?? fetch;
  for (let page = 1; page <= MAX_PAGES; page++) {
    const url = new URL("/tr-tr/GetAllEventsByCity", BILETINIAL);
    url.search = new URLSearchParams({ cityId: "48", langId: "1", countryId: "3", langCode: "tr", pageNumber: String(page), pageSize: "20", initial: String(page === 1) }).toString();
    const body = record(JSON.parse(await fetchBody(url.toString(), fetcher)));
    if (!Array.isArray(body.Data) || typeof body.HasMore !== "boolean") throw new Error("Invalid Biletinial pagination schema");
    let newSessions = 0;
    for (const item of body.Data) {
      const row = record(item);
      const sessionId = `biletinial:${sourceId(row.seanceId)}`;
      if (seenSessions.has(sessionId)) continue;
      seenSessions.add(sessionId); newSessions++;
      const category = categoryFromType(row.tip);
      // Other provider verticals are outside this explicitly scoped catalog.
      if (!category) continue;
      const id = `biletinial:${sourceId(row.etkinlikId)}`;
      const typeSlug = text(row.tipForUrl, "type slug");
      const eventSlug = text(row.url, "event slug");
      if (!/^[a-z0-9-]+$/.test(typeSlug) || !/^[a-z0-9-]+$/.test(eventSlug)) throw new Error("Invalid Biletinial event path");
      const sourceUrl = `${BILETINIAL}/tr-tr/${typeSlug}/${eventSlug}`;
      const session: CityEventSession = {
        id: sessionId, startsAt: sourceDate(row.SeanceDate, true),
        venueName: text(row.mekan, "venue"), venueAddress: null, room: null,
        ticketUrl: sourceUrl, ticketUrlKind: "event", availability: "unknown",
      };
      const existing = events.get(id);
      if (existing) existing.sessions.push(session);
      else events.set(id, { id, source: "biletinial", category, title: text(row.etkinlik, "event title"), sourceUrl, imageUrl: null, sessions: [session] });
    }
    if (body.HasMore && newSessions === 0) throw new Error("Biletinial pagination repeated without progress");
    if (!body.HasMore) return { city: "ordu", source: "biletinial", fetchedAt, events: [...events.values()] };
  }
  throw new Error("Biletinial pagination exceeded safe limit; snapshot not published");
}

export function parseBiletivaHtml(html: string, now = new Date()): CityEventSnapshot {
  const nodes: RecordValue[] = [];
  for (const script of parse(html).querySelectorAll('script[type="application/ld+json"]')) {
    const parsed = JSON.parse(script.innerHTML);
    const values = Array.isArray(parsed) ? parsed : [parsed];
    for (const value of values) {
      const item = record(value);
      if (Array.isArray(item["@graph"])) nodes.push(...item["@graph"].map(record));
      else nodes.push(item);
    }
  }
  const venue = nodes.find(node => node["@type"] === "MovieTheater" && String(node["@id"]).replace(/\/#/, "#") === `${ORDU_CINEMA_URL}#business`);
  const screenings = nodes.filter(node => node["@type"] === "ScreeningEvent");
  if (!venue || !screenings.length) throw new Error("Biletiva screening/venue schema absent; snapshot not published");
  const movies = new Map(nodes.filter(node => node["@type"] === "Movie").map(node => [node["@id"], node]));
  const events = new Map<string, CityEvent>();
  const seenSessions = new Set<string>();
  for (const screening of screenings) {
    const status = screening.eventStatus;
    if (status === "https://schema.org/EventCancelled" || status === "https://schema.org/EventPostponed") continue;
    if (status && status !== "https://schema.org/EventScheduled" && status !== "https://schema.org/EventRescheduled") throw new Error("Unknown screening status");
    const location = record(screening.location);
    if (record(location.containedInPlace)["@id"] !== venue["@id"]) throw new Error("Unexpected cinema venue");
    const movie = movies.get(record(screening.workPresented)["@id"]);
    if (!movie) throw new Error("Screening has no matching movie");
    const movieUrl = providerUrl(movie["@id"], BILETIVA);
    const match = /^\/event\/([A-Za-z0-9_-]+)$/.exec(movieUrl.pathname);
    if (!match) throw new Error("Invalid Biletiva movie ID");
    movieUrl.hash = "";
    const offers = record(screening.offers);
    const ticket = providerUrl(offers.url, BILETIVA);
    if (ticket.pathname.replace(/\/$/, "") !== "/place/ORDU_CINEVIZYON_SINEMASI" || (ticket.searchParams.has("scode") && ticket.searchParams.get("scode") !== "ORDU_CINEVIZYON_SINEMASI")) throw new Error("Ticket belongs to another venue");
    const sessionId = `biletiva:${sourceId(ticket.searchParams.get("lid"))}`;
    if (seenSessions.has(sessionId)) continue;
    seenSessions.add(sessionId);
    const session: CityEventSession = {
      id: sessionId, startsAt: sourceDate(screening.startDate, false), venueName: text(venue.name, "venue name"),
      venueAddress: venue.address ? text(record(venue.address).streetAddress, "venue address") : null,
      room: location.name ? text(location.name, "room") : null,
      ticketUrl: ticket.toString(), ticketUrlKind: "session",
      availability: offers.availability === "https://schema.org/InStock" ? "available"
        : offers.availability === "https://schema.org/SoldOut" ? "sold-out" : "unknown",
    };
    const id = `biletiva:${match[1]}`;
    const existing = events.get(id);
    if (existing) existing.sessions.push(session);
    else events.set(id, { id, source: "biletiva", category: "sinema", title: text(movie.name, "movie title"), sourceUrl: movieUrl.toString(), imageUrl: null, sessions: [session] });
  }
  return { city: "ordu", source: "biletiva", fetchedAt: now.toISOString(), events: [...events.values()] };
}

export async function fetchBiletivaSnapshot(options: Options = {}): Promise<CityEventSnapshot> {
  const startedAt = options.now ?? new Date();
  return parseBiletivaHtml(await fetchBody(ORDU_CINEMA_URL, options.fetch ?? fetch), startedAt);
}
