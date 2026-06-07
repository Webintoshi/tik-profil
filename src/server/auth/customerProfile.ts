import type { QueryResultRow } from "pg";
import type { CustomerSession } from "@/lib/customerAuth";
import { hasPostgresDatabaseUrl } from "@/server/db/postgres";
import { query } from "@/server/db/query";

interface CustomerAppUserRow extends QueryResultRow {
    avatar_url: null | string;
    created_at: Date;
    display_name: null | string;
    email: null | string;
    id: string;
    phone: null | string;
    updated_at: Date;
}

const DEFAULT_CUSTOMER_PREFERENCES = {
    language: "tr" as const,
    notifications: {
        orders: true,
        promotions: true,
        reservations: true,
    },
    theme: "system" as const,
};

function toIsoString(value: Date | null | undefined): string {
    if (value instanceof Date) {
        return value.toISOString();
    }

    return new Date().toISOString();
}

async function findCustomerAppUser(appUserId: string): Promise<CustomerAppUserRow | null> {
    if (!hasPostgresDatabaseUrl()) {
        return null;
    }

    const result = await query<CustomerAppUserRow>(
        `
            SELECT
                id,
                email,
                display_name,
                phone,
                avatar_url,
                created_at,
                updated_at
            FROM app_users
            WHERE id = $1
            LIMIT 1
        `,
        [appUserId],
    );

    return result.rows[0] ?? null;
}

export async function loadCustomerAccountProfile(session: CustomerSession) {
    const appUser = await findCustomerAppUser(session.appUserId);
    const displayName = appUser?.display_name ?? session.displayName ?? session.email ?? "Customer";
    const email = appUser?.email ?? session.email ?? "";
    const updatedAt = toIsoString(appUser?.updated_at);
    const createdAt = toIsoString(appUser?.created_at);

    return {
        actorType: "customer" as const,
        appUserId: session.appUserId,
        createdAt,
        displayName,
        email,
        isPrime: false,
        phone: appUser?.phone ?? undefined,
        photoURL: appUser?.avatar_url ?? undefined,
        preferences: DEFAULT_CUSTOMER_PREFERENCES,
        provider: session.authProvider,
        role: session.role,
        uid: session.appUserId,
        updatedAt,
        wallet: {
            balance: 0,
            lastUpdated: updatedAt,
            points: 0,
        },
        addresses: [],
    };
}
