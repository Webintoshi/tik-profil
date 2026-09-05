import { z } from "zod";

import { NativeAuthError } from "../auth/native-auth/service.ts";
import type { NativeFavoriteRepository } from "./favorite.repository.ts";
import type { RewardEngine, RewardEventResult } from "./reward-engine.ts";

const favoriteSchema = z.object({
    businessSlug: z.string().max(200).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    rewardOnAdd: z.boolean().optional().default(false),
});

export function createFavoriteHandlers({ engine, repository, requireCustomer, respond, errorResponse }: {
    engine: Pick<RewardEngine, "record">;
    repository: NativeFavoriteRepository;
    requireCustomer: (accessToken: string) => Promise<{ appUserId: string }>;
    respond: (body: unknown, status?: number) => Response;
    errorResponse: (error: unknown) => Response;
}) {
    function accessToken(request: Request): string {
        const authorization = request.headers.get("authorization") ?? "";
        const token = authorization.startsWith("Bearer ") ? authorization.slice(7).trim() : "";
        if (!token) throw new NativeAuthError("INVALID_ACCESS_TOKEN", 401);
        return token;
    }

    function parse(value: unknown) {
        const parsed = favoriteSchema.safeParse(value);
        if (!parsed.success) throw new NativeAuthError("INVALID_REQUEST", 400);
        return parsed.data;
    }

    return {
        async getFavorites(request: Request): Promise<Response> {
            try {
                const principal = await requireCustomer(accessToken(request));
                const favorites = await repository.listFavorites(principal.appUserId);
                return respond({ success: true, data: { favorites } });
            } catch (error) {
                return errorResponse(error);
            }
        },

        async postFavorite(request: Request): Promise<Response> {
            try {
                const token = accessToken(request);
                const input = parse(await request.json().catch(() => null));
                const principal = await requireCustomer(token);
                const { created, favorite } = await repository.addFavoriteIfMissing(principal.appUserId, input.businessSlug);
                let reward: RewardEventResult | null = null;
                if (created && input.rewardOnAdd) {
                    try {
                        const businessId = await repository.findFavoriteBusinessId(favorite.businessSlug);
                        if (businessId) {
                            reward = await engine.record({
                                actionType: "DISCOVERY",
                                appUserId: principal.appUserId,
                                businessId,
                                clientEventId: `favorite:${favorite.id}`,
                                metadata: { channel: "favorite" },
                            });
                        }
                    } catch {
                        // A reward outage must not turn an already saved favorite into a failed request.
                    }
                }
                return respond({ success: true, data: { favorite, reward } }, 201);
            } catch (error) {
                return errorResponse(error);
            }
        },

        async deleteFavorite(request: Request): Promise<Response> {
            try {
                const token = accessToken(request);
                const input = parse({ businessSlug: new URL(request.url).searchParams.get("businessSlug")?.trim() ?? "" });
                const principal = await requireCustomer(token);
                await repository.deleteFavorite(principal.appUserId, input.businessSlug);
                return respond({ success: true, data: { deleted: true } });
            } catch (error) {
                return errorResponse(error);
            }
        },
    };
}
