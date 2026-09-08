import { loadKesfetBusinesses } from "@/app/api/kesfet/shared";
import { loadToshiBusinesses } from "@/server/toshi/business-source";
import { createToshiChatHandler } from "@/server/toshi/http-handler";
import { createToshiRateLimiter } from "@/server/toshi/rate-limit";
import { createPilotRuntime } from "@/server/toshi/pilot-runtime";

export const dynamic = "force-dynamic";

const runtimeRateLimiter = createToshiRateLimiter({
    limit: 20,
    windowMs: 60_000,
});

const loadBusinesses = () => loadToshiBusinesses({
        fallbackOrigin: process.env.TOSHI_DISCOVERY_API_ORIGIN
            ?? (process.env.NODE_ENV === "development" ? "https://tikprofil.com" : undefined),
        loadPrimary: () => loadKesfetBusinesses("/api/mobile/toshi/chat"),
        preferFallback: process.env.NODE_ENV === "development",
    });
const runtimeHandler = createToshiChatHandler({
    loadBusinesses,
    handle360: createPilotRuntime(loadBusinesses),
    onError(error) {
        console.error("[Toshi] chat request failed", {
            name: error instanceof Error ? error.name : "UnknownError",
        });
    },
    rateLimiter: runtimeRateLimiter,
});

export async function POST(request: Request): Promise<Response> {
    return runtimeHandler(request);
}
