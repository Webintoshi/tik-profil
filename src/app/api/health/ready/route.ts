import { NextResponse } from "next/server";
import { probeRedisReadiness } from "@/server/cache/redis-json-cache";
import { hasPostgresDatabaseUrl } from "@/server/db/postgres";
import { query } from "@/server/db/query";

export const dynamic = "force-dynamic";

export async function GET() {
    const basePayload = {
        nodeEnv: process.env.NODE_ENV ?? "development",
        timestamp: new Date().toISOString(),
    };

    const redisPromise = probeRedisReadiness();

    if (!hasPostgresDatabaseUrl()) {
        const redis = await redisPromise;
        const isReady = redis.status !== "error";
        return NextResponse.json({
            ...basePayload,
            status: isReady ? "ok" : "error",
            postgres: {
                status: "skipped",
            },
            redis,
        }, { status: isReady ? 200 : 503 });
    }

    try {
        const [, redis] = await Promise.all([
            query("select 1 as ok"),
            redisPromise,
        ]);
        const isReady = redis.status !== "error";

        return NextResponse.json({
            ...basePayload,
            status: isReady ? "ok" : "error",
            postgres: {
                status: "ok",
            },
            redis,
        }, { status: isReady ? 200 : 503 });
    } catch (error) {
        console.error("[health/ready] PostgreSQL readiness check failed", error);

        return NextResponse.json(
            {
                ...basePayload,
                status: "error",
                postgres: {
                    status: "error",
                    message: "PostgreSQL readiness check failed",
                },
                redis: await redisPromise,
            },
            { status: 503 },
        );
    }
}
