export type EventCategory = "sinema" | "tiyatro" | "konser" | "cocuk";
export type EventSource = "biletinial" | "biletiva";

export interface CityEventSession {
    id: string;
    startsAt: string;
    venueName: string;
    venueAddress: string | null;
    room: string | null;
    ticketUrl: string;
    ticketUrlKind: "session" | "event" | "venue";
    availability: "unknown" | "available" | "sold-out";
}

export interface CityEvent {
    id: string;
    source: EventSource;
    category: EventCategory;
    title: string;
    sourceUrl: string;
    imageUrl: string | null;
    sessions: CityEventSession[];
}

export interface CityEventSnapshot {
    city: "ordu";
    source: EventSource;
    fetchedAt: string;
    events: CityEvent[];
}

export interface CityEventsPage {
    city: "Ordu";
    categories: { slug: EventCategory; label: string; count: number }[];
    events: CityEvent[];
    total: number;
    nextCursor: string | null;
    updatedAt: string | null;
    stale: boolean;
    status: "ready" | "awaiting-sync";
}

const EVENT_SOURCES = new Set<EventSource>(["biletinial", "biletiva"]);
const EVENT_CATEGORIES = new Set<EventCategory>(["sinema", "tiyatro", "konser", "cocuk"]);
const TICKET_URL_KINDS = new Set<CityEventSession["ticketUrlKind"]>(["session", "event", "venue"]);
const AVAILABILITIES = new Set<CityEventSession["availability"]>(["unknown", "available", "sold-out"]);
const MAX_EVENTS_PER_SNAPSHOT = 5_000;
const MAX_SESSIONS_PER_EVENT = 500;

export class CityEventSnapshotValidationError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "CityEventSnapshotValidationError";
    }
}

export function isEventSource(value: unknown): value is EventSource {
    return typeof value === "string" && EVENT_SOURCES.has(value as EventSource);
}

export function isEventCategory(value: unknown): value is EventCategory {
    return typeof value === "string" && EVENT_CATEGORIES.has(value as EventCategory);
}

export function parsePublishedEventSources(value: string | undefined): EventSource[] {
    const sources: EventSource[] = [];
    for (const candidate of value?.split(",") ?? []) {
        const source = candidate.trim().toLowerCase();
        if (isEventSource(source) && !sources.includes(source)) sources.push(source);
    }
    return sources;
}

export const parsePublishedSources = parsePublishedEventSources;

export function parseCityEventSnapshot(input: unknown): CityEventSnapshot {
    const record = asRecord(input, "snapshot");
    if (record.city !== "ordu") fail("snapshot city must be ordu");
    if (!isEventSource(record.source)) fail("snapshot source is not supported");
    const source = record.source;
    const fetchedAt = normalizeTimestamp(record.fetchedAt, "snapshot fetchedAt");
    if (!Array.isArray(record.events) || record.events.length > MAX_EVENTS_PER_SNAPSHOT) {
        fail("snapshot events are invalid or exceed the limit");
    }

    const eventIds = new Set<string>();
    const sessionIds = new Set<string>();
    const events = record.events.map((value, index) => {
        const event = asRecord(value, `event ${index}`);
        const id = sourceId(event.id, source, `event ${index} id`);
        if (eventIds.has(id)) fail(`duplicate event id: ${id}`);
        eventIds.add(id);
        if (event.source !== source) fail(`event ${id} source does not match snapshot`);
        if (!isEventCategory(event.category)) fail(`event ${id} category is not supported`);
        const title = boundedText(event.title, `event ${id} title`, 300);
        const sourceUrl = providerUrl(event.sourceUrl, source, `event ${id} sourceUrl`);
        if (event.imageUrl !== null) fail(`event ${id} imageUrl publication is not enabled`);
        const imageUrl = null;
        if (!Array.isArray(event.sessions) || event.sessions.length > MAX_SESSIONS_PER_EVENT) {
            fail(`event ${id} sessions are invalid or exceed the limit`);
        }
        const sessions = event.sessions.map((sessionValue, sessionIndex) => {
            const session = asRecord(sessionValue, `event ${id} session ${sessionIndex}`);
            const sessionId = sourceId(session.id, source, `event ${id} session id`);
            if (sessionIds.has(sessionId)) fail(`duplicate session id: ${sessionId}`);
            sessionIds.add(sessionId);
            if (!TICKET_URL_KINDS.has(session.ticketUrlKind as CityEventSession["ticketUrlKind"])) {
                fail(`session ${sessionId} ticketUrlKind is invalid`);
            }
            if (!AVAILABILITIES.has(session.availability as CityEventSession["availability"])) {
                fail(`session ${sessionId} availability is invalid`);
            }
            return {
                id: sessionId,
                startsAt: normalizeTimestamp(session.startsAt, `session ${sessionId} startsAt`),
                venueName: boundedText(session.venueName, `session ${sessionId} venueName`, 300),
                venueAddress: nullableBoundedText(session.venueAddress, `session ${sessionId} venueAddress`, 500),
                room: nullableBoundedText(session.room, `session ${sessionId} room`, 120),
                ticketUrl: providerUrl(session.ticketUrl, source, `session ${sessionId} ticketUrl`),
                ticketUrlKind: session.ticketUrlKind as CityEventSession["ticketUrlKind"],
                availability: session.availability as CityEventSession["availability"],
            };
        });
        return { id, source, category: event.category, title, sourceUrl, imageUrl, sessions };
    });

    return { city: "ordu", source, fetchedAt, events };
}

function asRecord(value: unknown, label: string): Record<string, unknown> {
    if (!value || typeof value !== "object" || Array.isArray(value)) fail(`${label} must be an object`);
    return value as Record<string, unknown>;
}

function sourceId(value: unknown, source: EventSource, label: string): string {
    const id = boundedText(value, label, 300);
    if (!id.startsWith(`${source}:`) || id.length === source.length + 1) fail(`${label} must be source-prefixed`);
    return id;
}

function boundedText(value: unknown, label: string, maximum: number): string {
    if (typeof value !== "string") fail(`${label} must be text`);
    const text = value.trim();
    if (!text || text.length > maximum) fail(`${label} is empty or too long`);
    return text;
}

function nullableBoundedText(value: unknown, label: string, maximum: number): string | null {
    return value === null ? null : boundedText(value, label, maximum);
}

function providerUrl(value: unknown, source: EventSource, label: string): string {
    const url = parseHttpsUrl(value, label);
    const baseHost = source === "biletinial" ? "biletinial.com" : "biletiva.com";
    if (url.hostname !== baseHost && !url.hostname.endsWith(`.${baseHost}`)) fail(`${label} host is not allowlisted`);
    return url.toString();
}

function parseHttpsUrl(value: unknown, label: string): URL {
    if (typeof value !== "string" || value.length > 2_048) fail(`${label} is invalid`);
    let url: URL;
    try {
        url = new URL(value);
    } catch {
        fail(`${label} is invalid`);
    }
    if (url.protocol !== "https:" || url.username || url.password) fail(`${label} must be a safe HTTPS URL`);
    return url;
}

function normalizeTimestamp(value: unknown, label: string): string {
    if (typeof value !== "string") fail(`${label} must be an ISO timestamp`);
    const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,3}))?(Z|[+-]\d{2}:\d{2})$/.exec(value);
    if (!match) fail(`${label} must include a timezone`);
    const [, yearText, monthText, dayText, hourText, minuteText, secondText, , zone] = match;
    const year = Number(yearText);
    const month = Number(monthText);
    const day = Number(dayText);
    const hour = Number(hourText);
    const minute = Number(minuteText);
    const second = Number(secondText);
    if (month < 1 || month > 12 || day < 1 || day > new Date(Date.UTC(year, month, 0)).getUTCDate()
        || hour > 23 || minute > 59 || second > 59) {
        fail(`${label} is not a real calendar timestamp`);
    }
    if (zone !== "Z") {
        const zoneHour = Number(zone.slice(1, 3));
        const zoneMinute = Number(zone.slice(4, 6));
        if (zoneHour > 23 || zoneMinute > 59) fail(`${label} timezone offset is invalid`);
    }
    const parsed = new Date(value);
    if (!Number.isFinite(parsed.getTime())) fail(`${label} is invalid`);
    return parsed.toISOString();
}

function fail(message: string): never {
    throw new CityEventSnapshotValidationError(message);
}
