import { NextResponse } from "next/server";
import { hasPostgresDatabaseUrl } from "@/server/db/postgres";
import { query } from "@/server/db/query";

export const dynamic = "force-dynamic";

export async function GET() {
    const basePayload = {
        nodeEnv: process.env.NODE_ENV ?? "development",
        timestamp: new Date().toISOString(),
    };

    if (!hasPostgresDatabaseUrl()) {
        return NextResponse.json({
            ...basePayload,
            status: "ok",
            postgres: {
                status: "skipped",
            },
        });
    }

    try {
        await query("select 1 as ok");

        return NextResponse.json({
            ...basePayload,
            status: "ok",
            postgres: {
                status: "ok",
            },
        });
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
            },
            { status: 503 },
        );
    }
}
