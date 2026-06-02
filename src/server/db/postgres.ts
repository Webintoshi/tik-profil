import { Pool } from "pg";
import { getDatabaseUrl } from "@/lib/env";

declare global {
    var __tikProfilPostgresPool: Pool | undefined;
}

export function hasPostgresDatabaseUrl(): boolean {
    return Boolean(getDatabaseUrl());
}

export function getPostgresPool(): Pool {
    const connectionString = getDatabaseUrl();

    if (!connectionString) {
        throw new Error("DATABASE_URL is required when PostgreSQL helpers are used");
    }

    if (!globalThis.__tikProfilPostgresPool) {
        globalThis.__tikProfilPostgresPool = new Pool({
            connectionString,
        });
    }

    return globalThis.__tikProfilPostgresPool;
}
