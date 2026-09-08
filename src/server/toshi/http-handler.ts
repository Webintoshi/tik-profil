import { readToshiJson, toshiClientFingerprint, ToshiBodyLimitError } from "./request-security";

import { ZodError } from "zod";

import type { KesfetPublicBusiness } from "../repositories/businesses.types";
import { parseToshiChatRequest, type ToshiChatRequest, type ToshiChatReply } from "./contracts";
import type { ToshiModel } from "./model";
import type { ToshiRateLimiter } from "./rate-limit";
import { createImmediateToshiReply, createToshiReply } from "./service";

interface ToshiChatHandlerDependencies {
    loadBusinesses: () => Promise<readonly KesfetPublicBusiness[]>;
    model?: ToshiModel;
    onError?: (error: unknown) => void;
    rateLimiter: ToshiRateLimiter;
    handle360?: (input: ToshiChatRequest, request: Request, fingerprint: string) => Promise<ToshiChatReply>;
}

export function createToshiChatHandler(dependencies: ToshiChatHandlerDependencies) {
    return async function handleToshiChat(request: Request): Promise<Response> {
        const fingerprint = toshiClientFingerprint(request);
        const rateLimit = dependencies.rateLimiter.consume(fingerprint);
        const rateHeaders = {
            "X-RateLimit-Limit": "20",
            "X-RateLimit-Remaining": String(rateLimit.remaining),
        };

        if (!rateLimit.allowed) {
            return json({
                error: {
                    code: "TOSHI_RATE_LIMITED",
                    message: "Toshi kısa sürede çok fazla mesaj aldı. Biraz sonra tekrar deneyin.",
                },
            }, 429, {
                ...rateHeaders,
                "Retry-After": String(rateLimit.retryAfterSeconds),
            });
        }

        let input;
        try {
            input = parseToshiChatRequest(await readToshiJson(request));
        } catch (error) {
            return json({
                error: {
                    code: "INVALID_TOSHI_REQUEST",
                    message: error instanceof ZodError
                        ? "Mesaj veya keşif bilgisi geçerli değil."
                        : "Mesaj okunamadı.",
                },
            }, error instanceof ToshiBodyLimitError ? 413 : 400, rateHeaders);
        }

        if (input.protocolVersion === 2 && dependencies.handle360) {
            try {
                return json({ data: await dependencies.handle360(input, request, fingerprint) }, 200, rateHeaders);
            } catch (error) {
                dependencies.onError?.(error);
                const status = error && typeof error === "object" && "statusCode" in error && error.statusCode === 401 ? 401 : 503;
                return json({ error: { code: status === 401 ? "UNAUTHORIZED" : "TOSHI_UNAVAILABLE", message: status === 401 ? "Hesabına tekrar giriş yapmalısın." : "Toshi şu anda yanıt veremiyor. Tekrar deneyebilirsin." } }, status, rateHeaders);
            }
        }
        const immediateReply = createImmediateToshiReply(input);
        if (immediateReply) return json({ data: immediateReply }, 200, rateHeaders);

        try {
            const businesses = await dependencies.loadBusinesses();
            const data = await createToshiReply(input, {
                businesses,
                model: dependencies.model,
                safetyIdentifier: fingerprint,
                onModelError: dependencies.onError,
            });
            return json({ data }, 200, rateHeaders);
        } catch (error) {
            dependencies.onError?.(error);
            return json({
                error: {
                    code: "TOSHI_UNAVAILABLE",
                    message: "Toshi şu anda yanıt veremiyor. Lütfen kısa bir süre sonra tekrar deneyin.",
                },
            }, 503, rateHeaders);
        }
    };
}

function json(body: unknown, status: number, headers: Record<string, string>): Response {
    return Response.json(body, {
        status,
        headers: {
            "Cache-Control": "no-store",
            ...headers,
        },
    });
}
