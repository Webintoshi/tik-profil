import {
    parsePublishedEventSources as parsePublicationConfig,
    type EventSource,
} from "./contracts";
import type { CityEventsRepository } from "./repository";
import {
    buildCityEventsPage,
    CityEventsInputError,
    parseCityEventsQuery,
    validateCityEventsQuery,
} from "./service";

interface CityEventsHandlerDependencies {
    repository: CityEventsRepository;
    publishedSources: readonly EventSource[];
    now?: () => Date;
    onError?: (error: unknown) => void;
}

export const parsePublishedEventSources = parsePublicationConfig;

export function createCityEventsHandler(dependencies: CityEventsHandlerDependencies) {
    const publishedSources = new Set(dependencies.publishedSources);
    const now = dependencies.now ?? (() => new Date());

    return async function handleCityEvents(request: Request): Promise<Response> {
        let query;
        try {
            query = parseCityEventsQuery(new URL(request.url).searchParams);
            validateCityEventsQuery(query);
        } catch (error) {
            if (error instanceof CityEventsInputError) {
                return json({
                    success: false,
                    error: { code: "INVALID_CITY_EVENTS_QUERY", message: "Etkinlik sorgusu geçerli değil." },
                }, 400);
            }
            throw error;
        }

        try {
            const snapshots = publishedSources.size === 0
                ? []
                : (await dependencies.repository.readSnapshots("ordu"))
                    .filter(({ source }) => publishedSources.has(source));
            const page = buildCityEventsPage(snapshots, query, now());
            if (snapshots.length > 0 && snapshots.length < publishedSources.size) page.stale = true;
            return json({ success: true, page }, 200);
        } catch (error) {
            dependencies.onError?.(error);
            return json({
                success: false,
                error: { code: "CITY_EVENTS_UNAVAILABLE", message: "Etkinlikler şu anda yüklenemiyor." },
            }, 503);
        }
    };
}

function json(body: unknown, status: number): Response {
    return Response.json(body, {
        status,
        headers: status === 200 ? {
            "Cache-Control": "public, max-age=15, s-maxage=60",
            "CDN-Cache-Control": "public, max-age=15, s-maxage=60",
        } : { "Cache-Control": "no-store, max-age=0", Pragma: "no-cache" },
    });
}
