import type { QueryResultRow } from "pg";

import { query as postgresQuery } from "../db/query";
import {
    parseCityEventSnapshot,
    parsePublishedEventSources,
    type CityEventSnapshot,
    type EventSource,
} from "./contracts";

interface QueryResultLike {
    rows: QueryResultRow[];
    rowCount?: number | null;
}

export type CityEventsQueryExecutor = (
    text: string,
    values?: readonly unknown[],
) => Promise<QueryResultLike>;

export interface CityEventsRepository {
    readSnapshots(city: "ordu"): Promise<CityEventSnapshot[]>;
    saveSnapshot(snapshot: CityEventSnapshot): Promise<void>;
}

interface CityEventsRepositoryOptions {
    query?: CityEventsQueryExecutor;
    publishedSources?: readonly EventSource[];
}

export function createCityEventsRepository(options: CityEventsRepositoryOptions = {}): CityEventsRepository {
    const execute = options.query ?? defaultExecutor;
    const publishedSources = [...new Set(options.publishedSources
        ?? parsePublishedEventSources(process.env.CITY_EVENTS_PUBLISHED_SOURCES))];

    return {
        async readSnapshots(city) {
            if (publishedSources.length === 0) return [];
            const result = await execute(
                `SELECT snapshot
                 FROM city_event_snapshots
                 WHERE city = $1
                   AND source = ANY($2::text[])
                 ORDER BY source ASC`,
                [city, publishedSources],
            );
            return result.rows.map((row) => parseCityEventSnapshot(parseStoredSnapshot(row.snapshot)));
        },

        async saveSnapshot(snapshot) {
            const normalized = parseCityEventSnapshot(snapshot);
            await execute(
                `INSERT INTO city_event_snapshots (city, source, fetched_at, snapshot)
                 VALUES ($1, $2, $3::timestamptz, $4::jsonb)
                 ON CONFLICT (city, source) DO UPDATE
                 SET fetched_at = EXCLUDED.fetched_at,
                     snapshot = EXCLUDED.snapshot,
                     updated_at = NOW()
                 WHERE city_event_snapshots.fetched_at <= EXCLUDED.fetched_at`,
                [normalized.city, normalized.source, normalized.fetchedAt, JSON.stringify(normalized)],
            );
        },
    };
}

function parseStoredSnapshot(value: unknown): unknown {
    if (typeof value !== "string") return value;
    try {
        return JSON.parse(value);
    } catch {
        throw new Error("stored city event snapshot is not valid JSON");
    }
}

async function defaultExecutor(text: string, values?: readonly unknown[]): Promise<QueryResultLike> {
    return postgresQuery(text, values);
}
