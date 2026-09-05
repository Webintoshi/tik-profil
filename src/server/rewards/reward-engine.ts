import {
    CHECK_IN_MAX_ACCEPTABLE_ACCURACY_METERS,
    CHECK_IN_RADIUS_METERS,
    DAILY_TIK_POINT_LIMIT,
    IMPOSSIBLE_TRAVEL_SPEED_KMH,
    REWARD_ACTION_CONFIG,
    type RewardActionType,
} from "./reward-config.ts";
import { distanceMeters, isUsableCoordinates } from "./reward-geo.ts";
import { getIstanbulDayWindow, getIstanbulWeekWindow, subtractDays } from "./reward-time.ts";

export type RewardEventStatus = "APPROVED" | "PENDING" | "REJECTED" | "REVERSED";
export type RewardReasonCode =
    | "BUSINESS_COOLDOWN"
    | "BUSINESS_NOT_ELIGIBLE"
    | "CHECK_IN_LOW_ACCURACY"
    | "CHECK_IN_NO_COORDINATES"
    | "CHECK_IN_TOO_FAR"
    | "DAILY_ACTION_LIMIT"
    | "DUPLICATE_EVENT"
    | "GLOBAL_DAILY_POINT_LIMIT";

export interface RewardLocationInput {
    accuracy: number;
    latitude: number;
    longitude: number;
}

export interface RewardEventInput {
    actionType: RewardActionType;
    appUserId: string;
    businessId: string;
    clientEventId: string;
    location?: RewardLocationInput;
    metadata?: Record<string, boolean | number | string | null>;
}

export interface RewardBusiness {
    city: string | null;
    id: string;
    latitude: number | null;
    longitude: number | null;
    name: string;
    status: string | null;
}

export interface RewardLedgerEvent {
    actionType: RewardActionType;
    appUserId: string;
    awardedPoints: number;
    basePoints: number;
    businessId: string;
    city: string | null;
    clientEventId: string;
    createdAt: Date;
    discoveryScoreDelta: number;
    id: string;
    metadata: Record<string, unknown>;
    reasonCode: RewardReasonCode | null;
    rewardGroup: RewardActionType;
    riskFlags: string[];
    status: RewardEventStatus;
}

export interface RewardDailyStats {
    actionCounts: Record<RewardActionType, number>;
    dailyEarned: number;
}

export interface RewardTaskProgress {
    progress: number;
    target: number;
}

export interface RewardEventResult {
    actionType: RewardActionType;
    awardedPoints: number;
    balance: number;
    basePoints: number;
    capped: boolean;
    dailyEarned: number;
    dailyLimit: number;
    discoveryScoreDelta: number;
    eligible: boolean;
    idempotent: boolean;
    reasonCode: RewardReasonCode | null;
    taskProgress: RewardTaskProgress;
}

export interface RewardTaskSummary extends RewardTaskProgress {
    actionType: RewardActionType;
    rewardPoints: number;
    state: "AVAILABLE" | "COMPLETED" | "LIMIT_REACHED";
}

export interface RewardSummary {
    balance: number;
    cityRank: number | null;
    cityScore: number;
    dailyEarned: number;
    dailyLimit: number;
    tasks: RewardTaskSummary[];
}

export interface RewardLeaderboardEntry {
    appUserId: string;
    avatar: string | null;
    displayName: string;
    rank: number;
    score: number;
}

export interface RewardLeaderboard {
    city: string;
    leaders: RewardLeaderboardEntry[];
    me: { rank: number; score: number } | null;
    period: "week";
    periodEnd: string;
    periodStart: string;
}

export interface RewardSummarySnapshot {
    balance: number;
    cityRank: number | null;
    cityScore: number;
    dailyStats: RewardDailyStats;
}

export interface RewardTransaction {
    addBalance(appUserId: string, delta: number): Promise<number>;
    findApprovedCooldown(input: { appUserId: string; businessId: string; rewardGroup: RewardActionType; since: Date }): Promise<RewardLedgerEvent | null>;
    findBusiness(businessId: string): Promise<RewardBusiness | null>;
    findEventByClientEventId(clientEventId: string): Promise<RewardLedgerEvent | null>;
    findLastApprovedCheckIn(appUserId: string): Promise<RewardLedgerEvent | null>;
    getBalance(appUserId: string): Promise<number>;
    getDailyStats(appUserId: string, start: Date, end: Date): Promise<RewardDailyStats>;
    insertEvent(event: Omit<RewardLedgerEvent, "id">): Promise<RewardLedgerEvent | null>;
}

export interface RewardRepository {
    getLeaderboardSnapshot(input: { appUserId: string; city: string; end: Date; limit: number; start: Date }): Promise<Pick<RewardLeaderboard, "leaders" | "me">>;
    getSummarySnapshot(input: { appUserId: string; city: string; dayEnd: Date; dayStart: Date; weekEnd: Date; weekStart: Date }): Promise<RewardSummarySnapshot>;
    runInUserTransaction<T>(appUserId: string, operation: (transaction: RewardTransaction) => Promise<T>): Promise<T>;
}

export interface RewardEngine {
    getLeaderboard(input: { appUserId: string; city: string; period: "week" }): Promise<RewardLeaderboard>;
    getSummary(input: { appUserId: string; city: string }): Promise<RewardSummary>;
    record(input: RewardEventInput): Promise<RewardEventResult>;
}

function emptyDailyStats(): RewardDailyStats {
    return { actionCounts: { CHECK_IN: 0, CONTACT: 0, DISCOVERY: 0 }, dailyEarned: 0 };
}

function taskProgress(actionType: RewardActionType, stats: RewardDailyStats): RewardTaskProgress {
    return {
        progress: Math.min(stats.actionCounts[actionType], REWARD_ACTION_CONFIG[actionType].dailyActionLimit),
        target: REWARD_ACTION_CONFIG[actionType].dailyActionLimit,
    };
}

function toTasks(stats: RewardDailyStats): RewardTaskSummary[] {
    return (["DISCOVERY", "CONTACT", "CHECK_IN"] as const).map((actionType) => {
        const progress = taskProgress(actionType, stats);
        return {
            actionType,
            ...progress,
            rewardPoints: REWARD_ACTION_CONFIG[actionType].rewardPoints,
            state: progress.progress >= progress.target ? "COMPLETED" : "AVAILABLE",
        };
    });
}

function rejectedResult(
    input: RewardEventInput,
    reasonCode: RewardReasonCode,
    balance: number,
    stats: RewardDailyStats,
    idempotent = false,
): RewardEventResult {
    return {
        actionType: input.actionType,
        awardedPoints: 0,
        balance,
        basePoints: REWARD_ACTION_CONFIG[input.actionType].rewardPoints,
        capped: false,
        dailyEarned: stats.dailyEarned,
        dailyLimit: DAILY_TIK_POINT_LIMIT,
        discoveryScoreDelta: 0,
        eligible: false,
        idempotent,
        reasonCode,
        taskProgress: taskProgress(input.actionType, stats),
    };
}

function approvedEventMetadata(input: RewardEventInput, distance: number | null) {
    return {
        ...(input.metadata ?? {}),
        ...(input.location ? {
            accuracyMeters: input.location.accuracy,
            latitude: input.location.latitude,
            longitude: input.location.longitude,
        } : {}),
        ...(distance === null ? {} : { distanceMeters: Math.round(distance) }),
    };
}

export function createRewardEngine({
    now = () => new Date(),
    repository,
}: {
    now?: () => Date;
    repository: RewardRepository;
}): RewardEngine {
    return {
        async getLeaderboard(input) {
            const window = getIstanbulWeekWindow(now());
            const snapshot = await repository.getLeaderboardSnapshot({
                appUserId: input.appUserId,
                city: input.city,
                end: window.end,
                limit: 3,
                start: window.start,
            });
            return {
                city: input.city,
                ...snapshot,
                period: "week",
                periodEnd: window.end.toISOString(),
                periodStart: window.start.toISOString(),
            };
        },

        async getSummary(input) {
            const current = now();
            const day = getIstanbulDayWindow(current);
            const week = getIstanbulWeekWindow(current);
            const snapshot = await repository.getSummarySnapshot({
                appUserId: input.appUserId,
                city: input.city,
                dayEnd: day.end,
                dayStart: day.start,
                weekEnd: week.end,
                weekStart: week.start,
            });
            return {
                balance: snapshot.balance,
                cityRank: snapshot.cityRank,
                cityScore: snapshot.cityScore,
                dailyEarned: snapshot.dailyStats.dailyEarned,
                dailyLimit: DAILY_TIK_POINT_LIMIT,
                tasks: toTasks(snapshot.dailyStats),
            };
        },

        async record(input) {
            const current = now();
            const day = getIstanbulDayWindow(current);
            const rule = REWARD_ACTION_CONFIG[input.actionType];

            return repository.runInUserTransaction(input.appUserId, async (transaction) => {
                const existing = await transaction.findEventByClientEventId(input.clientEventId);
                if (existing) {
                    const [balance, stats] = await Promise.all([
                        transaction.getBalance(input.appUserId),
                        transaction.getDailyStats(input.appUserId, day.start, day.end),
                    ]);
                    return rejectedResult(input, "DUPLICATE_EVENT", balance, stats, true);
                }

                const business = await transaction.findBusiness(input.businessId);
                const initialStats = await transaction.getDailyStats(input.appUserId, day.start, day.end);
                const initialBalance = await transaction.getBalance(input.appUserId);

                const reject = async (reasonCode: RewardReasonCode, metadata: Record<string, unknown> = {}) => {
                    await transaction.insertEvent({
                        actionType: input.actionType,
                        appUserId: input.appUserId,
                        awardedPoints: 0,
                        basePoints: rule.rewardPoints,
                        businessId: input.businessId,
                        city: business?.city ?? null,
                        clientEventId: input.clientEventId,
                        createdAt: current,
                        discoveryScoreDelta: 0,
                        metadata: { ...(input.metadata ?? {}), ...metadata },
                        reasonCode,
                        rewardGroup: input.actionType,
                        riskFlags: [],
                        status: "REJECTED",
                    });
                    return rejectedResult(input, reasonCode, initialBalance, initialStats);
                };

                if (!business || business.status !== "active") {
                    return reject("BUSINESS_NOT_ELIGIBLE");
                }

                if (initialStats.actionCounts[input.actionType] >= rule.dailyActionLimit) {
                    return reject("DAILY_ACTION_LIMIT");
                }

                const cooldown = await transaction.findApprovedCooldown({
                    appUserId: input.appUserId,
                    businessId: business.id,
                    rewardGroup: input.actionType,
                    since: subtractDays(current, rule.sameBusinessCooldownDays),
                });
                if (cooldown) {
                    return reject("BUSINESS_COOLDOWN");
                }

                let checkInDistance: number | null = null;
                const riskFlags: string[] = [];
                if (input.actionType === "CHECK_IN") {
                    const businessCoordinates = {
                        latitude: business.latitude ?? Number.NaN,
                        longitude: business.longitude ?? Number.NaN,
                    };
                    if (!isUsableCoordinates(businessCoordinates)) {
                        return reject("CHECK_IN_NO_COORDINATES");
                    }
                    if (!input.location || input.location.accuracy > CHECK_IN_MAX_ACCEPTABLE_ACCURACY_METERS) {
                        return reject("CHECK_IN_LOW_ACCURACY", { accuracyMeters: input.location?.accuracy ?? null });
                    }
                    if (!isUsableCoordinates(input.location)) {
                        return reject("CHECK_IN_TOO_FAR");
                    }
                    checkInDistance = distanceMeters(input.location, businessCoordinates);
                    if (checkInDistance > CHECK_IN_RADIUS_METERS) {
                        return reject("CHECK_IN_TOO_FAR", { distanceMeters: Math.round(checkInDistance) });
                    }

                    const previous = await transaction.findLastApprovedCheckIn(input.appUserId);
                    const previousLatitude = Number(previous?.metadata.latitude);
                    const previousLongitude = Number(previous?.metadata.longitude);
                    if (previous && isUsableCoordinates({ latitude: previousLatitude, longitude: previousLongitude })) {
                        const elapsedHours = (current.getTime() - previous.createdAt.getTime()) / 3_600_000;
                        if (elapsedHours > 0) {
                            const travelKm = distanceMeters(input.location, {
                                latitude: previousLatitude,
                                longitude: previousLongitude,
                            }) / 1000;
                            if (travelKm / elapsedHours > IMPOSSIBLE_TRAVEL_SPEED_KMH) {
                                riskFlags.push("IMPOSSIBLE_TRAVEL");
                            }
                        }
                    }
                }

                const remaining = Math.max(0, DAILY_TIK_POINT_LIMIT - initialStats.dailyEarned);
                const awardedPoints = Math.min(rule.rewardPoints, remaining);
                const capped = awardedPoints < rule.rewardPoints;
                const inserted = await transaction.insertEvent({
                    actionType: input.actionType,
                    appUserId: input.appUserId,
                    awardedPoints,
                    basePoints: rule.rewardPoints,
                    businessId: business.id,
                    city: business.city,
                    clientEventId: input.clientEventId,
                    createdAt: current,
                    discoveryScoreDelta: rule.discoveryScore,
                    metadata: approvedEventMetadata(input, checkInDistance),
                    reasonCode: capped && awardedPoints === 0 ? "GLOBAL_DAILY_POINT_LIMIT" : null,
                    rewardGroup: input.actionType,
                    riskFlags,
                    status: "APPROVED",
                });

                if (!inserted) {
                    const stats = await transaction.getDailyStats(input.appUserId, day.start, day.end);
                    const balance = await transaction.getBalance(input.appUserId);
                    return rejectedResult(input, "DUPLICATE_EVENT", balance, stats, true);
                }

                const balance = awardedPoints > 0
                    ? await transaction.addBalance(input.appUserId, awardedPoints)
                    : initialBalance;
                const stats = await transaction.getDailyStats(input.appUserId, day.start, day.end);
                return {
                    actionType: input.actionType,
                    awardedPoints,
                    balance,
                    basePoints: rule.rewardPoints,
                    capped,
                    dailyEarned: stats.dailyEarned,
                    dailyLimit: DAILY_TIK_POINT_LIMIT,
                    discoveryScoreDelta: rule.discoveryScore,
                    eligible: true,
                    idempotent: false,
                    reasonCode: capped && awardedPoints === 0 ? "GLOBAL_DAILY_POINT_LIMIT" : null,
                    taskProgress: taskProgress(input.actionType, stats),
                };
            });
        },
    };
}

export function createInMemoryRewardRepository(initialBusinesses: RewardBusiness[]) {
    const businesses = new Map(initialBusinesses.map((business) => [business.id, business]));
    const balances = new Map<string, number>();
    const events: RewardLedgerEvent[] = [];
    const users = new Map<string, { avatar: string | null; displayName: string }>();
    const locks = new Map<string, Promise<void>>();

    async function withLock<T>(key: string, operation: () => Promise<T>): Promise<T> {
        const previous = locks.get(key) ?? Promise.resolve();
        let release: () => void = () => {};
        const current = new Promise<void>((resolve) => { release = resolve; });
        const queued = previous.then(() => current);
        locks.set(key, queued);
        await previous;
        try {
            return await operation();
        } finally {
            release();
            if (locks.get(key) === queued) locks.delete(key);
        }
    }

    function dailyStats(appUserId: string, start: Date, end: Date): RewardDailyStats {
        return events.reduce((stats, item) => {
            if (item.appUserId !== appUserId || item.status !== "APPROVED" || item.createdAt < start || item.createdAt >= end) return stats;
            stats.actionCounts[item.actionType] += 1;
            stats.dailyEarned += item.awardedPoints;
            return stats;
        }, emptyDailyStats());
    }

    const repository: RewardRepository & {
        seedApproved(input: { appUserId: string; awardedPoints: number; businessId: string; city: string; discoveryScoreDelta: number; now: Date }): void;
        setUser(appUserId: string, displayName: string, avatar: string | null): void;
    } = {
        async getLeaderboardSnapshot(input) {
            const scores = new Map<string, number>();
            for (const item of events) {
                if (item.status !== "APPROVED" || item.createdAt < input.start || item.createdAt >= input.end) continue;
                if ((item.city ?? "").toLocaleLowerCase("tr-TR") !== input.city.toLocaleLowerCase("tr-TR")) continue;
                scores.set(item.appUserId, (scores.get(item.appUserId) ?? 0) + item.discoveryScoreDelta);
            }
            const ranked = [...scores.entries()]
                .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
                .map(([appUserId, score], index) => ({ appUserId, score, rank: index + 1 }));
            const leaders = ranked.slice(0, input.limit).map((entry) => ({
                ...entry,
                avatar: users.get(entry.appUserId)?.avatar ?? null,
                displayName: users.get(entry.appUserId)?.displayName ?? "Tık Profil Kullanıcısı",
            }));
            const current = ranked.find((entry) => entry.appUserId === input.appUserId);
            return { leaders, me: current ? { rank: current.rank, score: current.score } : null };
        },

        async getSummarySnapshot(input) {
            const board = await repository.getLeaderboardSnapshot({
                appUserId: input.appUserId,
                city: input.city,
                end: input.weekEnd,
                limit: Number.MAX_SAFE_INTEGER,
                start: input.weekStart,
            });
            return {
                balance: balances.get(input.appUserId) ?? 0,
                cityRank: board.me?.rank ?? null,
                cityScore: board.me?.score ?? 0,
                dailyStats: dailyStats(input.appUserId, input.dayStart, input.dayEnd),
            };
        },

        async runInUserTransaction(appUserId, operation) {
            return withLock(appUserId, () => operation({
                async addBalance(userId, delta) {
                    const next = Math.max(0, (balances.get(userId) ?? 0) + delta);
                    balances.set(userId, next);
                    return next;
                },
                async findApprovedCooldown(input) {
                    return events.find((item) => item.appUserId === input.appUserId
                        && item.businessId === input.businessId
                        && item.rewardGroup === input.rewardGroup
                        && item.status === "APPROVED"
                        && item.createdAt >= input.since) ?? null;
                },
                async findBusiness(businessId) { return businesses.get(businessId) ?? null; },
                async findEventByClientEventId(clientEventId) { return events.find((item) => item.clientEventId === clientEventId) ?? null; },
                async findLastApprovedCheckIn(userId) {
                    return [...events].reverse().find((item) => item.appUserId === userId && item.actionType === "CHECK_IN" && item.status === "APPROVED") ?? null;
                },
                async getBalance(userId) { return balances.get(userId) ?? 0; },
                async getDailyStats(userId, start, end) { return dailyStats(userId, start, end); },
                async insertEvent(item) {
                    if (events.some((event) => event.clientEventId === item.clientEventId)) return null;
                    const inserted = { ...item, id: crypto.randomUUID() };
                    events.push(inserted);
                    return inserted;
                },
            }));
        },

        seedApproved(input) {
            const actionType: RewardActionType = "DISCOVERY";
            events.push({
                actionType,
                appUserId: input.appUserId,
                awardedPoints: input.awardedPoints,
                basePoints: input.awardedPoints,
                businessId: input.businessId,
                city: input.city,
                clientEventId: crypto.randomUUID(),
                createdAt: input.now,
                discoveryScoreDelta: input.discoveryScoreDelta,
                id: crypto.randomUUID(),
                metadata: {},
                reasonCode: null,
                rewardGroup: actionType,
                riskFlags: [],
                status: "APPROVED",
            });
            balances.set(input.appUserId, (balances.get(input.appUserId) ?? 0) + input.awardedPoints);
        },

        setUser(appUserId, displayName, avatar) {
            users.set(appUserId, { avatar, displayName });
        },
    };
    return repository;
}
