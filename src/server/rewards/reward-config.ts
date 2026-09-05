export const DAILY_TIK_POINT_LIMIT = 15;
export const CHECK_IN_RADIUS_METERS = 150;
export const CHECK_IN_MAX_ACCEPTABLE_ACCURACY_METERS = 100;
export const IMPOSSIBLE_TRAVEL_SPEED_KMH = 300;

export const REWARD_ACTION_TYPES = ["DISCOVERY", "CONTACT", "CHECK_IN"] as const;
export type RewardActionType = (typeof REWARD_ACTION_TYPES)[number];

export interface RewardActionRule {
    dailyActionLimit: number;
    discoveryScore: number;
    rewardPoints: number;
    sameBusinessCooldownDays: number;
}

export const REWARD_ACTION_CONFIG: Readonly<Record<RewardActionType, Readonly<RewardActionRule>>> = {
    DISCOVERY: Object.freeze({
        dailyActionLimit: 3,
        discoveryScore: 10,
        rewardPoints: 1,
        sameBusinessCooldownDays: 7,
    }),
    CONTACT: Object.freeze({
        dailyActionLimit: 2,
        discoveryScore: 20,
        rewardPoints: 2,
        sameBusinessCooldownDays: 14,
    }),
    CHECK_IN: Object.freeze({
        dailyActionLimit: 2,
        discoveryScore: 50,
        rewardPoints: 5,
        sameBusinessCooldownDays: 14,
    }),
};
