import assert from "node:assert/strict";
import test from "node:test";
import pg from "pg";

import { rewardRepository } from "./reward.repository.ts";

test("leaderboard repository returns leaders and current rank from one active-account ranked snapshot", async () => {
    const originalDatabaseUrl = process.env.DATABASE_URL;
    const originalPool = globalThis.__tikProfilPostgresPool;
    const calls: Array<{ text: string; values: unknown[] }> = [];
    process.env.DATABASE_URL = "postgres://unused-for-reward-repository-test";
    globalThis.__tikProfilPostgresPool = {
        async query(text: string, values: unknown[] = []) {
            calls.push({ text, values });
            if (text.includes("entry_type")) {
                return {
                    rowCount: 2,
                    rows: [
                        { app_user_id: userId(1), avatar: "ada.png", display_name: "Ada", entry_type: "leader", rank: "1", score: "40" },
                        { app_user_id: userId(51), avatar: null, display_name: null, entry_type: "me", rank: "51", score: "1" },
                    ],
                };
            }
            return calls.length === 1
                ? { rowCount: 1, rows: [{ app_user_id: userId(1), avatar: "ada.png", display_name: "Ada", rank: "1", score: "40" }] }
                : { rowCount: 1, rows: [{ rank: "51", score: "1" }] };
        },
    } as never;

    try {
        const result = await rewardRepository.getLeaderboardSnapshot({
            appUserId: userId(51),
            city: "Ordu",
            end: new Date("2026-08-16T21:00:00.000Z"),
            limit: 50,
            start: new Date("2026-08-09T21:00:00.000Z"),
        });

        assert.deepEqual(result, {
            leaders: [{ appUserId: userId(1), avatar: "ada.png", displayName: "Ada", rank: 1, score: 40 }],
            me: { rank: 51, score: 1 },
        });
        assert.equal(calls.length, 1);
        assert.match(calls[0].text, /WITH scores AS/);
        assert.match(calls[0].text, /account\.status = 'active'/);
        assert.match(calls[0].text, /WHERE ranked\.rank <= \$4[\s\S]*UNION ALL[\s\S]*WHERE ranked\.app_user_id = \$5/);
        assert.deepEqual(calls[0].values, [
            "Ordu",
            new Date("2026-08-09T21:00:00.000Z"),
            new Date("2026-08-16T21:00:00.000Z"),
            50,
            userId(51),
        ]);
    } finally {
        globalThis.__tikProfilPostgresPool = originalPool;
        if (originalDatabaseUrl === undefined) delete process.env.DATABASE_URL;
        else process.env.DATABASE_URL = originalDatabaseUrl;
    }
});

function userId(index: number) {
    return `00000000-0000-4000-8000-${String(index).padStart(12, "0")}`;
}

// Explicit opt-in only. All fixture writes target pg_temp; the transaction is
// rolled back and its connection closed even if a query or assertion fails.
test("PostgreSQL ranking uses the active schema and one consistent weekly order", {
    skip: !process.env.REWARD_REPOSITORY_TEST_DATABASE_URL,
}, async (t) => {
    const databaseUrl = process.env.REWARD_REPOSITORY_TEST_DATABASE_URL!;
    const client = new pg.Client({ connectionString: databaseUrl });
    const originalDatabaseUrl = process.env.DATABASE_URL;
    const originalPool = globalThis.__tikProfilPostgresPool;
    const start = new Date("2026-08-09T21:00:00.000Z");
    const end = new Date("2026-08-16T21:00:00.000Z");
    const current = new Date("2026-08-12T09:00:00.000Z");

    await client.connect();
    try {
        await client.query("BEGIN");
        await client.query("SET LOCAL search_path = pg_temp, public");
        await client.query("SET LOCAL statement_timeout = '10s'");
        await client.query("SET LOCAL lock_timeout = '2s'");
        for (const table of ["app_users", "customer_profiles", "reward_events", "reward_balances"]) {
            await client.query(`CREATE TEMP TABLE ${table} (LIKE public.${table} INCLUDING DEFAULTS) ON COMMIT DROP`);
            const resolved = await client.query("SELECT namespace.nspname FROM pg_class relation JOIN pg_namespace namespace ON namespace.oid = relation.relnamespace WHERE relation.oid = to_regclass($1)", [table]);
            assert.match(resolved.rows[0]?.nspname ?? "", /^pg_temp_/, `${table} must resolve to a private temporary table`);
        }
        process.env.DATABASE_URL = databaseUrl;
        globalThis.__tikProfilPostgresPool = client as never;

        const clear = () => client.query("TRUNCATE pg_temp.reward_events, pg_temp.reward_balances, pg_temp.customer_profiles, pg_temp.app_users");
        const account = (index: number, status = "active", name: string | null = `User ${index}`) => client.query(
            "INSERT INTO pg_temp.app_users (id, status, display_name, avatar_url) VALUES ($1, $2, $3, $4)",
            [userId(index), status, name, `avatar-${index}.png`],
        );
        const credit = (index: number, score: number, createdAt = current, city = "Ordu", status = "APPROVED") => client.query(
            `INSERT INTO pg_temp.reward_events (app_user_id, city, action_type, reward_group, discovery_score_delta, awarded_points, status, client_event_id, created_at)
             VALUES ($1, $2, 'DISCOVERY', 'DISCOVERY', $3, 1, $4, gen_random_uuid()::text, $5)`,
            [userId(index), city, score, status, createdAt],
        );
        const board = (index: number, limit = 50) => rewardRepository.getLeaderboardSnapshot({
            appUserId: userId(index), city: "Ordu", start, end, limit,
        });
        const scenario = (name: string, operation: () => Promise<void>) => t.test(name, async () => {
            await client.query("SAVEPOINT ranking_case");
            try {
                await operation();
            } finally {
                await client.query("ROLLBACK TO SAVEPOINT ranking_case");
                await client.query("RELEASE SAVEPOINT ranking_case");
            }
        });

        for (const count of [0, 1, 3, 50, 51]) {
            await scenario(`returns the first 50 from ${count} participants and preserves overall self rank`, async () => {
                await clear();
                for (let index = 1; index <= count; index += 1) {
                    await account(index);
                    await credit(index, count - index + 1);
                }
                const result = await board(Math.max(1, count));
                assert.equal(result.leaders.length, Math.min(count, 50));
                assert.deepEqual(result.leaders.map((leader) => leader.rank), Array.from({ length: Math.min(count, 50) }, (_, index) => index + 1));
                assert.deepEqual(result.me, count ? { rank: count, score: 1 } : null);
                if (count === 51) assert.equal(result.leaders.some((leader) => leader.appUserId === userId(51)), false);
            });
        }

        await scenario("ties use earliest approved event then UUID and return only public profile fields", async () => {
            await clear();
            for (const index of [1, 2, 3]) await account(index);
            await credit(1, 10, new Date("2026-08-12T09:00:00.000Z"));
            await credit(2, 5, new Date("2026-08-11T09:00:00.000Z"));
            await credit(2, 5, new Date("2026-08-13T09:00:00.000Z"));
            await credit(3, 10, new Date("2026-08-11T09:00:00.000Z"));
            await client.query("INSERT INTO pg_temp.customer_profiles (app_user_id, display_name, avatar_url) VALUES ($1, 'Profile Name', 'profile-avatar.png')", [userId(2)]);
            const result = await board(1);
            assert.deepEqual(result.leaders.map((leader) => [leader.appUserId, leader.rank, leader.score]), [[userId(2), 1, 10], [userId(3), 2, 10], [userId(1), 3, 10]]);
            assert.deepEqual(result.me, { rank: 3, score: 10 });
            assert.deepEqual(Object.keys(result.leaders[0]).sort(), ["appUserId", "avatar", "displayName", "rank", "score"]);
            assert.equal(result.leaders[0].displayName, "Profile Name");
            assert.equal(result.leaders[0].avatar, "profile-avatar.png");
            assert.equal((await board(1, 1)).leaders.length, 1);
            assert.equal((await board(1, 3)).leaders.length, 3);
        });

        await scenario("city, approved status, and Istanbul weekly boundaries determine eligibility", async () => {
            await clear();
            for (let index = 1; index <= 6; index += 1) await account(index);
            await credit(1, 100, new Date(start.getTime() - 1));
            await credit(2, 20, start);
            await credit(3, 10, new Date(end.getTime() - 1), "oRdU");
            await credit(4, 200, end);
            await credit(5, 300, current, "Ankara");
            await credit(6, 400, current, "Ordu", "REJECTED");
            const result = await board(2);
            assert.deepEqual(result.leaders.map((leader) => leader.appUserId), [userId(2), userId(3)]);
            assert.deepEqual(result.me, { rank: 1, score: 20 });
            assert.equal((await board(1)).me, null);
        });

        await scenario("summary and first-50 exclude inactive accounts while retaining personal earned balance", async () => {
            await clear();
            await account(1);
            await account(2, "disabled");
            await account(3, "pending");
            await credit(1, 10);
            await credit(2, 100);
            await credit(3, 200);
            await client.query("INSERT INTO pg_temp.reward_balances (app_user_id, balance) VALUES ($1, 8), ($2, 9)", [userId(1), userId(2)]);
            const summary = (index: number) => rewardRepository.getSummarySnapshot({
                appUserId: userId(index), city: "Ordu", dayStart: start, dayEnd: end, weekStart: start, weekEnd: end,
            });
            const activeBoard = await board(1);
            const activeSummary = await summary(1);
            assert.deepEqual(activeBoard.leaders.map((leader) => leader.appUserId), [userId(1)]);
            assert.deepEqual(activeBoard.me, { rank: 1, score: 10 });
            assert.equal(activeSummary.cityRank, activeBoard.me.rank);
            assert.equal(activeSummary.cityScore, activeBoard.me.score);
            assert.equal(activeSummary.balance, 8);
            assert.equal(activeSummary.dailyStats.dailyEarned, 1);
            assert.equal((await board(2)).me, null);
            const disabledSummary = await summary(2);
            assert.equal(disabledSummary.cityRank, null);
            assert.equal(disabledSummary.cityScore, 0);
            assert.equal(disabledSummary.balance, 9);
            assert.equal(disabledSummary.dailyStats.dailyEarned, 1);
        });
    } finally {
        globalThis.__tikProfilPostgresPool = originalPool;
        if (originalDatabaseUrl === undefined) delete process.env.DATABASE_URL;
        else process.env.DATABASE_URL = originalDatabaseUrl;
        await client.query("ROLLBACK").catch(() => undefined);
        await client.end();
    }
});
