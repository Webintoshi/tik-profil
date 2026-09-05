import { query } from "../db/query.ts";
import { withTransaction, type TransactionQuery } from "../db/transaction.ts";
import type {
    RewardActionType,
} from "./reward-config.ts";
import type {
    RewardBusiness,
    RewardDailyStats,
    RewardLeaderboardEntry,
    RewardLedgerEvent,
    RewardReasonCode,
    RewardRepository,
    RewardTransaction,
} from "./reward-engine.ts";

interface EventRow {
    action_type: RewardActionType;
    app_user_id: string;
    awarded_points: number | string;
    base_points: number | string;
    business_id: string;
    city: string | null;
    client_event_id: string;
    created_at: Date | string;
    discovery_score_delta: number | string;
    id: string;
    metadata: Record<string, unknown> | string | null;
    reason_code: RewardReasonCode | null;
    reward_group: RewardActionType;
    risk_flags: string[] | null;
    status: RewardLedgerEvent["status"];
}

function numeric(value: number | string | null | undefined): number {
    const parsed = Number(value ?? 0);
    return Number.isFinite(parsed) ? parsed : 0;
}

function metadata(value: EventRow["metadata"]): Record<string, unknown> {
    if (!value) return {};
    if (typeof value === "string") {
        try { return JSON.parse(value) as Record<string, unknown>; } catch { return {}; }
    }
    return value;
}

function toEvent(row: EventRow): RewardLedgerEvent {
    return {
        actionType: row.action_type,
        appUserId: row.app_user_id,
        awardedPoints: numeric(row.awarded_points),
        basePoints: numeric(row.base_points),
        businessId: row.business_id,
        city: row.city,
        clientEventId: row.client_event_id,
        createdAt: new Date(row.created_at),
        discoveryScoreDelta: numeric(row.discovery_score_delta),
        id: row.id,
        metadata: metadata(row.metadata),
        reasonCode: row.reason_code,
        rewardGroup: row.reward_group,
        riskFlags: row.risk_flags ?? [],
        status: row.status,
    };
}

const eventColumns = `
    id, app_user_id, business_id, city, action_type, reward_group,
    base_points, awarded_points, discovery_score_delta, status,
    reason_code, client_event_id, metadata, risk_flags, created_at
`;

function createTransaction(transactionQuery: TransactionQuery): RewardTransaction {
    return {
        async addBalance(appUserId, delta) {
            const result = await transactionQuery<{ balance: number | string }>(
                `UPDATE reward_balances
                 SET balance = GREATEST(0, balance + $2), updated_at = now()
                 WHERE app_user_id = $1
                 RETURNING balance`,
                [appUserId, delta],
            );
            return numeric(result.rows[0]?.balance);
        },

        async findApprovedCooldown(input) {
            const result = await transactionQuery<EventRow>(
                `SELECT ${eventColumns}
                 FROM reward_events
                 WHERE app_user_id = $1
                   AND business_id = $2
                   AND reward_group = $3
                   AND status = 'APPROVED'
                   AND created_at >= $4
                 ORDER BY created_at DESC
                 LIMIT 1`,
                [input.appUserId, input.businessId, input.rewardGroup, input.since],
            );
            return result.rows[0] ? toEvent(result.rows[0]) : null;
        },

        async findBusiness(businessId) {
            const result = await transactionQuery<{
                city: string | null;
                id: string;
                lat: number | string | null;
                lng: number | string | null;
                name: string;
                status: string | null;
            }>(
                `SELECT id, name, status, city, lat, lng
                 FROM businesses
                 WHERE id = $1
                 LIMIT 1`,
                [businessId],
            );
            const row = result.rows[0];
            if (!row) return null;
            return {
                city: row.city,
                id: row.id,
                latitude: row.lat === null ? null : numeric(row.lat),
                longitude: row.lng === null ? null : numeric(row.lng),
                name: row.name,
                status: row.status,
            } satisfies RewardBusiness;
        },

        async findEventByClientEventId(clientEventId) {
            const result = await transactionQuery<EventRow>(
                `SELECT ${eventColumns} FROM reward_events WHERE client_event_id = $1 LIMIT 1`,
                [clientEventId],
            );
            return result.rows[0] ? toEvent(result.rows[0]) : null;
        },

        async findLastApprovedCheckIn(appUserId) {
            const result = await transactionQuery<EventRow>(
                `SELECT ${eventColumns}
                 FROM reward_events
                 WHERE app_user_id = $1
                   AND action_type = 'CHECK_IN'
                   AND status = 'APPROVED'
                 ORDER BY created_at DESC
                 LIMIT 1`,
                [appUserId],
            );
            return result.rows[0] ? toEvent(result.rows[0]) : null;
        },

        async getBalance(appUserId) {
            const result = await transactionQuery<{ balance: number | string }>(
                `SELECT balance FROM reward_balances WHERE app_user_id = $1 FOR UPDATE`,
                [appUserId],
            );
            return numeric(result.rows[0]?.balance);
        },

        async getDailyStats(appUserId, start, end) {
            const result = await transactionQuery<{
                action_type: RewardActionType;
                action_count: number | string;
                awarded_points: number | string;
            }>(
                `SELECT action_type, COUNT(*) AS action_count,
                        COALESCE(SUM(awarded_points), 0) AS awarded_points
                 FROM reward_events
                 WHERE app_user_id = $1
                   AND status = 'APPROVED'
                   AND action_type IN ('DISCOVERY', 'CONTACT', 'CHECK_IN')
                   AND created_at >= $2
                   AND created_at < $3
                 GROUP BY action_type`,
                [appUserId, start, end],
            );
            const stats: RewardDailyStats = {
                actionCounts: { CHECK_IN: 0, CONTACT: 0, DISCOVERY: 0 },
                dailyEarned: 0,
            };
            for (const row of result.rows) {
                stats.actionCounts[row.action_type] = numeric(row.action_count);
                stats.dailyEarned += numeric(row.awarded_points);
            }
            return stats;
        },

        async insertEvent(event) {
            const result = await transactionQuery<EventRow>(
                `INSERT INTO reward_events (
                    app_user_id, business_id, city, action_type, reward_group,
                    base_points, awarded_points, discovery_score_delta, status,
                    reason_code, client_event_id, metadata, risk_flags, created_at, updated_at
                 ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12::jsonb,$13,$14,$14)
                 ON CONFLICT (client_event_id) DO NOTHING
                 RETURNING ${eventColumns}`,
                [
                    event.appUserId, event.businessId, event.city, event.actionType, event.rewardGroup,
                    event.basePoints, event.awardedPoints, event.discoveryScoreDelta, event.status,
                    event.reasonCode, event.clientEventId, JSON.stringify(event.metadata), event.riskFlags,
                    event.createdAt,
                ],
            );
            return result.rows[0] ? toEvent(result.rows[0]) : null;
        },
    };
}

export const rewardRepository: RewardRepository = {
    async getLeaderboardSnapshot(input) {
        const result = await query<{
            app_user_id: string;
            avatar: string | null;
            display_name: string | null;
            entry_type: "leader" | "me";
            rank: number | string;
            score: number | string;
        }>(
            `WITH scores AS (
                SELECT reward.app_user_id,
                       SUM(reward.discovery_score_delta)::bigint AS score,
                       MIN(reward.created_at) AS first_score_at
                FROM reward_events reward
                INNER JOIN app_users account
                    ON account.id = reward.app_user_id
                   AND account.status = 'active'
                WHERE reward.status = 'APPROVED'
                  AND lower(reward.city) = lower($1)
                  AND reward.created_at >= $2
                  AND reward.created_at < $3
                GROUP BY reward.app_user_id
             ), ranked AS (
                SELECT scores.*,
                       DENSE_RANK() OVER (ORDER BY score DESC, first_score_at ASC, app_user_id ASC) AS rank
                FROM scores
             )
             SELECT 'leader'::text AS entry_type,
                    ranked.app_user_id, ranked.score, ranked.rank,
                    COALESCE(NULLIF(customer.display_name, ''), NULLIF(account.display_name, ''), 'Tık Profil Kullanıcısı') AS display_name,
                    COALESCE(customer.avatar_url, account.avatar_url) AS avatar
             FROM ranked
             INNER JOIN app_users account ON account.id = ranked.app_user_id
             LEFT JOIN customer_profiles customer ON customer.app_user_id = ranked.app_user_id
             WHERE ranked.rank <= $4
             UNION ALL
             SELECT 'me'::text AS entry_type,
                    ranked.app_user_id, ranked.score, ranked.rank,
                    NULL::text AS display_name, NULL::text AS avatar
             FROM ranked
             WHERE ranked.app_user_id = $5
             ORDER BY rank ASC, entry_type ASC`,
            [input.city, input.start, input.end, input.limit, input.appUserId],
        );
        const leaders: RewardLeaderboardEntry[] = result.rows
            .filter((row) => row.entry_type === "leader")
            .map((row) => ({
                appUserId: row.app_user_id,
                avatar: row.avatar,
                displayName: row.display_name ?? "Tık Profil Kullanıcısı",
                rank: numeric(row.rank),
                score: numeric(row.score),
            }));
        const meRow = result.rows.find((row) => row.entry_type === "me");
        const me = meRow
            ? { rank: numeric(meRow.rank), score: numeric(meRow.score) }
            : null;
        return { leaders, me };
    },

    async getSummarySnapshot(input) {
        const [balanceResult, dailyResult, rankResult] = await Promise.all([
            query<{ balance: number | string }>(
                `SELECT balance FROM reward_balances WHERE app_user_id = $1`,
                [input.appUserId],
            ),
            query<{ action_type: RewardActionType; action_count: number | string; awarded_points: number | string }>(
                `SELECT action_type, COUNT(*) AS action_count,
                        COALESCE(SUM(awarded_points), 0) AS awarded_points
                 FROM reward_events
                 WHERE app_user_id = $1 AND status = 'APPROVED'
                   AND action_type IN ('DISCOVERY', 'CONTACT', 'CHECK_IN')
                   AND created_at >= $2 AND created_at < $3
                 GROUP BY action_type`,
                [input.appUserId, input.dayStart, input.dayEnd],
            ),
            query<{ rank: number | string; score: number | string }>(
                `WITH scores AS (
                    SELECT reward.app_user_id, SUM(reward.discovery_score_delta)::bigint AS score,
                           MIN(reward.created_at) AS first_score_at
                    FROM reward_events reward
                    INNER JOIN app_users account
                        ON account.id = reward.app_user_id
                       AND account.status = 'active'
                    WHERE reward.status = 'APPROVED' AND lower(reward.city) = lower($1)
                      AND reward.created_at >= $2 AND reward.created_at < $3
                    GROUP BY reward.app_user_id
                 ), ranked AS (
                    SELECT app_user_id, score,
                           DENSE_RANK() OVER (ORDER BY score DESC, first_score_at ASC, app_user_id ASC) AS rank
                    FROM scores
                 ) SELECT score, rank FROM ranked WHERE app_user_id = $4`,
                [input.city, input.weekStart, input.weekEnd, input.appUserId],
            ),
        ]);
        const dailyStats: RewardDailyStats = {
            actionCounts: { CHECK_IN: 0, CONTACT: 0, DISCOVERY: 0 },
            dailyEarned: 0,
        };
        for (const row of dailyResult.rows) {
            dailyStats.actionCounts[row.action_type] = numeric(row.action_count);
            dailyStats.dailyEarned += numeric(row.awarded_points);
        }
        return {
            balance: numeric(balanceResult.rows[0]?.balance),
            cityRank: rankResult.rows[0] ? numeric(rankResult.rows[0].rank) : null,
            cityScore: numeric(rankResult.rows[0]?.score),
            dailyStats,
        };
    },

    async runInUserTransaction(appUserId, operation) {
        return withTransaction(async ({ query: transactionQuery }) => {
            await transactionQuery(`SELECT pg_advisory_xact_lock(hashtextextended($1, 0))`, [appUserId]);
            await transactionQuery(
                `INSERT INTO reward_balances (app_user_id, balance)
                 VALUES ($1, 0)
                 ON CONFLICT (app_user_id) DO NOTHING`,
                [appUserId],
            );
            return operation(createTransaction(transactionQuery));
        });
    },
};
