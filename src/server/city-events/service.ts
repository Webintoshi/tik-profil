import {
    isEventCategory,
    parseCityEventSnapshot,
    type CityEvent,
    type CityEventsPage,
    type CityEventSnapshot,
    type EventCategory,
} from "./contracts";

export interface CityEventsQuery {
    city: string;
    category?: string;
    date?: string;
    cursor?: string;
    limit?: number;
}

const CATEGORY_LABELS: ReadonlyArray<{ slug: EventCategory; label: string }> = [
    { slug: "sinema", label: "Sinema" },
    { slug: "tiyatro", label: "Tiyatro" },
    { slug: "konser", label: "Konser" },
    { slug: "cocuk", label: "Çocuk Etkinlikleri" },
];
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;
const STALE_AFTER_MS = 36 * 60 * 60 * 1_000;

export class CityEventsInputError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "CityEventsInputError";
    }
}

export function parseCityEventsQuery(searchParams: URLSearchParams): CityEventsQuery {
    const rawLimit = searchParams.get("limit");
    let limit: number | undefined;
    if (rawLimit !== null) {
        if (!/^\d+$/.test(rawLimit)) throw new CityEventsInputError("limit must be a positive integer");
        limit = Number(rawLimit);
    }
    return {
        city: searchParams.get("city") ?? "",
        category: optionalParameter(searchParams, "category"),
        date: optionalParameter(searchParams, "date"),
        cursor: optionalParameter(searchParams, "cursor"),
        limit,
    };
}

export function validateCityEventsQuery(query: CityEventsQuery): Required<Pick<CityEventsQuery, "city" | "limit">> & Omit<CityEventsQuery, "city" | "limit"> {
    if (query.city.trim().toLocaleLowerCase("tr-TR") !== "ordu") throw new CityEventsInputError("city must be Ordu");
    if (query.category !== undefined && !isEventCategory(query.category)) throw new CityEventsInputError("category is invalid");
    if (query.date !== undefined && !isCalendarDate(query.date)) throw new CityEventsInputError("date is invalid");
    if (query.limit !== undefined && (!Number.isInteger(query.limit) || query.limit <= 0)) throw new CityEventsInputError("limit is invalid");
    if (query.cursor !== undefined) decodeCursor(query.cursor);
    return { ...query, city: "Ordu", limit: Math.min(query.limit ?? DEFAULT_LIMIT, MAX_LIMIT) };
}

export function buildCityEventsPage(
    snapshots: readonly CityEventSnapshot[],
    query: CityEventsQuery,
    now: Date,
): CityEventsPage {
    const validatedQuery = validateCityEventsQuery(query);
    if (!Number.isFinite(now.getTime())) throw new CityEventsInputError("now is invalid");
    const normalizedSnapshots = snapshots.map(parseCityEventSnapshot);
    ensureDistinctSnapshotsAndEvents(normalizedSnapshots);

    if (normalizedSnapshots.length === 0) {
        return emptyPage();
    }

    const nowTime = now.getTime();
    let events = normalizedSnapshots.flatMap(({ events: sourceEvents }) => sourceEvents)
        .map((event) => ({
            ...event,
            sessions: event.sessions.filter(({ startsAt }) => new Date(startsAt).getTime() > nowTime),
        }))
        .filter(({ sessions }) => sessions.length > 0);

    if (validatedQuery.date) {
        events = events.map((event) => ({
            ...event,
            sessions: event.sessions.filter(({ startsAt }) => istanbulDate(startsAt) === validatedQuery.date),
        })).filter(({ sessions }) => sessions.length > 0);
    }

    const categories = CATEGORY_LABELS.map(({ slug, label }) => ({
        slug,
        label,
        count: events.filter(({ category }) => category === slug).length,
    }));
    if (validatedQuery.category) events = events.filter(({ category }) => category === validatedQuery.category);
    events.sort(compareEvents);

    const total = events.length;
    const cursor = validatedQuery.cursor ? decodeCursor(validatedQuery.cursor) : null;
    const remaining = cursor
        ? events.filter((event) => compareKey(eventKey(event), cursor) > 0)
        : events;
    const pageEvents = remaining.slice(0, validatedQuery.limit);
    const nextCursor = remaining.length > validatedQuery.limit
        ? encodeCursor(eventKey(pageEvents[pageEvents.length - 1]!))
        : null;
    const oldestFetchedAt = normalizedSnapshots.reduce((oldest, current) => (
        current.fetchedAt < oldest ? current.fetchedAt : oldest
    ), normalizedSnapshots[0]!.fetchedAt);

    return {
        city: "Ordu",
        categories,
        events: pageEvents,
        total,
        nextCursor,
        updatedAt: oldestFetchedAt,
        stale: nowTime - new Date(oldestFetchedAt).getTime() > STALE_AFTER_MS,
        status: "ready",
    };
}

function emptyPage(): CityEventsPage {
    return {
        city: "Ordu",
        categories: CATEGORY_LABELS.map(({ slug, label }) => ({ slug, label, count: 0 })),
        events: [],
        total: 0,
        nextCursor: null,
        updatedAt: null,
        stale: false,
        status: "awaiting-sync",
    };
}

function ensureDistinctSnapshotsAndEvents(snapshots: readonly CityEventSnapshot[]): void {
    const sources = new Set<string>();
    const eventIds = new Set<string>();
    for (const snapshot of snapshots) {
        if (sources.has(snapshot.source)) throw new Error(`duplicate source snapshot: ${snapshot.source}`);
        sources.add(snapshot.source);
        for (const event of snapshot.events) {
            if (eventIds.has(event.id)) throw new Error(`duplicate event id: ${event.id}`);
            eventIds.add(event.id);
        }
    }
}

function optionalParameter(searchParams: URLSearchParams, name: string): string | undefined {
    const value = searchParams.get(name);
    return value === null ? undefined : value;
}

function isCalendarDate(value: string): boolean {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    if (!match) return false;
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    return month >= 1 && month <= 12 && day >= 1 && day <= new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function istanbulDate(startsAt: string): string {
    const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Europe/Istanbul",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).formatToParts(new Date(startsAt));
    const value = Object.fromEntries(parts.map(({ type, value: partValue }) => [type, partValue]));
    return `${value.year}-${value.month}-${value.day}`;
}

interface CursorKey {
    startsAt: string;
    id: string;
}

function eventKey(event: CityEvent): CursorKey {
    return {
        startsAt: event.sessions.reduce((earliest, session) => session.startsAt < earliest ? session.startsAt : earliest, event.sessions[0]!.startsAt),
        id: event.id,
    };
}

function compareEvents(left: CityEvent, right: CityEvent): number {
    return compareKey(eventKey(left), eventKey(right));
}

function compareKey(left: CursorKey, right: CursorKey): number {
    return left.startsAt.localeCompare(right.startsAt) || left.id.localeCompare(right.id);
}

function encodeCursor(key: CursorKey): string {
    return Buffer.from(JSON.stringify({ v: 1, ...key }), "utf8").toString("base64url");
}

function decodeCursor(value: string): CursorKey {
    if (!value || value.length > 512 || !/^[A-Za-z0-9_-]+$/.test(value)) throw new CityEventsInputError("cursor is invalid");
    try {
        const parsed = JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as Record<string, unknown>;
        if (parsed.v !== 1 || typeof parsed.startsAt !== "string" || typeof parsed.id !== "string"
            || !isNormalizedTimestamp(parsed.startsAt) || !/^(?:biletinial|biletiva):.{1,280}$/.test(parsed.id)
            || Object.keys(parsed).length !== 3) {
            throw new Error("invalid cursor payload");
        }
        return { startsAt: parsed.startsAt, id: parsed.id };
    } catch (error) {
        if (error instanceof CityEventsInputError) throw error;
        throw new CityEventsInputError("cursor is invalid");
    }
}

function isNormalizedTimestamp(value: string): boolean {
    if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)) return false;
    const parsed = new Date(value);
    return Number.isFinite(parsed.getTime()) && parsed.toISOString() === value;
}
