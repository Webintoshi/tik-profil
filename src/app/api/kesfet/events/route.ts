import { createCityEventsHandler, parsePublishedEventSources } from "@/server/city-events/http-handler";
import { createCityEventsRepository } from "@/server/city-events/repository";

export const dynamic = "force-dynamic";

const publishedSources = parsePublishedEventSources(process.env.CITY_EVENTS_PUBLISHED_SOURCES);
const repository = createCityEventsRepository({ publishedSources });
const handler = createCityEventsHandler({
    repository,
    publishedSources,
    onError: () => console.error("City events read failed"),
});

export async function GET(request: Request): Promise<Response> {
    return handler(request);
}
