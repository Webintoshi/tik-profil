import { z } from "zod";

import type { RewardEngine } from "./reward-engine.ts";

const metadataValue = z.union([z.string().max(160), z.number().finite(), z.boolean(), z.null()]);
const locationSchema = z.object({
    accuracy: z.number().finite().nonnegative().max(10_000),
    latitude: z.number().finite().min(-90).max(90),
    longitude: z.number().finite().min(-180).max(180),
}).strict();
const eventSchema = z.object({
    actionType: z.enum(["DISCOVERY", "CONTACT", "CHECK_IN"]),
    businessId: z.string().trim().min(1).max(160),
    clientEventId: z.string().uuid(),
    location: locationSchema.optional(),
    metadata: z.record(z.string().max(48), metadataValue).optional(),
}).strip().superRefine((value, context) => {
    if (typeof value.metadata?.channel === "string" && value.metadata.channel.trim().toLowerCase() === "favorite") {
        context.addIssue({ code: "custom", message: "favorite rewards are recorded when a favorite is saved", path: ["metadata", "channel"] });
    }
    if (value.actionType === "CHECK_IN" && !value.location) {
        context.addIssue({ code: "custom", message: "location is required for CHECK_IN", path: ["location"] });
    }
});
const citySchema = z.string().trim().min(1).max(80);
const leaderboardLimitSchema = z.coerce.number().int().min(1).max(50);

type RequireCustomer = (request: Request) => Promise<{ appUserId: string }>;

function json(data: unknown, status = 200) {
    return Response.json(data, { status, headers: { "Cache-Control": "no-store, max-age=0", Pragma: "no-cache" } });
}

function errorResponse(error: unknown) {
    const status = typeof error === "object" && error !== null && "statusCode" in error
        ? Number(error.statusCode)
        : 500;
    if (status === 401 || status === 403) {
        return json({ success: false, error: { code: "AUTH_REQUIRED", message: "Oturum gerekli." } }, status);
    }
    return json({ success: false, error: { code: "REWARD_SERVICE_UNAVAILABLE", message: "Ödül servisi şu anda kullanılamıyor." } }, 503);
}

function cityFrom(request: Request) {
    const city = new URL(request.url).searchParams.get("city") ?? "Ordu";
    return citySchema.safeParse(city);
}

export function createRewardHandlers({
    engine,
    requireCustomer,
}: {
    engine: RewardEngine;
    requireCustomer: RequireCustomer;
}) {
    return {
        async getLeaderboard(request: Request) {
            try {
                const customer = await requireCustomer(request);
                const city = cityFrom(request);
                const searchParams = new URL(request.url).searchParams;
                const period = searchParams.get("period") ?? "week";
                const limit = leaderboardLimitSchema.safeParse(searchParams.get("limit") ?? 3);
                if (!city.success || !limit.success || period !== "week") {
                    return json({ success: false, error: { code: "INVALID_REQUEST", message: "Geçersiz sıralama isteği." } }, 400);
                }
                const data = await engine.getLeaderboard({ appUserId: customer.appUserId, city: city.data, limit: limit.data, period: "week" });
                return json({ success: true, data });
            } catch (error) {
                return errorResponse(error);
            }
        },

        async getSummary(request: Request) {
            try {
                const customer = await requireCustomer(request);
                const city = cityFrom(request);
                if (!city.success) {
                    return json({ success: false, error: { code: "INVALID_REQUEST", message: "Geçersiz şehir." } }, 400);
                }
                const data = await engine.getSummary({ appUserId: customer.appUserId, city: city.data });
                return json({ success: true, data });
            } catch (error) {
                return errorResponse(error);
            }
        },

        async postEvent(request: Request) {
            try {
                const customer = await requireCustomer(request);
                const body = await request.json().catch(() => null);
                const parsed = eventSchema.safeParse(body);
                if (!parsed.success) {
                    return json({ success: false, error: { code: "INVALID_REQUEST", message: "Geçersiz ödül olayı." } }, 400);
                }
                const data = await engine.record({ ...parsed.data, appUserId: customer.appUserId });
                return json({ success: true, data });
            } catch (error) {
                return errorResponse(error);
            }
        },
    };
}
