import assert from "node:assert/strict";
import test from "node:test";

import {
    CHECK_IN_MAX_ACCEPTABLE_ACCURACY_METERS,
    CHECK_IN_RADIUS_METERS,
    DAILY_TIK_POINT_LIMIT,
    REWARD_ACTION_CONFIG,
} from "./reward-config.ts";
import { distanceMeters } from "./reward-geo.ts";
import { getIstanbulDayWindow, getIstanbulWeekWindow } from "./reward-time.ts";
import {
    createInMemoryRewardRepository,
    createRewardEngine,
    type RewardEventInput,
} from "./reward-engine.ts";

const NOW = new Date("2026-08-15T09:00:00.000Z");

function event(overrides: Partial<RewardEventInput> = {}): RewardEventInput {
    return {
        actionType: "DISCOVERY",
        appUserId: "00000000-0000-4000-8000-000000000001",
        businessId: "business-1",
        clientEventId: crypto.randomUUID(),
        ...overrides,
    };
}

function setup() {
    const repository = createInMemoryRewardRepository([
        { city: "Ordu", id: "business-1", latitude: 40.9862, longitude: 37.8797, name: "Bir", status: "active" },
        { city: "Ordu", id: "business-2", latitude: 40.9865, longitude: 37.8800, name: "İki", status: "active" },
        { city: "Ordu", id: "business-3", latitude: 40.9867, longitude: 37.8802, name: "Üç", status: "active" },
        { city: "Ordu", id: "business-4", latitude: 40.9869, longitude: 37.8804, name: "Dört", status: "active" },
        { city: "Giresun", id: "business-5", latitude: 40.9128, longitude: 38.3895, name: "Beş", status: "active" },
        { city: "Ordu", id: "business-no-coords", latitude: null, longitude: null, name: "Koordinatsız", status: "active" },
    ]);
    return { engine: createRewardEngine({ now: () => NOW, repository }), repository };
}

test("central reward config separates points, action limits, cooldowns, and discovery score", () => {
    assert.equal(DAILY_TIK_POINT_LIMIT, 15);
    assert.equal(CHECK_IN_RADIUS_METERS, 150);
    assert.equal(CHECK_IN_MAX_ACCEPTABLE_ACCURACY_METERS, 100);
    assert.deepEqual(REWARD_ACTION_CONFIG.DISCOVERY, { dailyActionLimit: 3, discoveryScore: 10, rewardPoints: 1, sameBusinessCooldownDays: 7 });
    assert.deepEqual(REWARD_ACTION_CONFIG.CONTACT, { dailyActionLimit: 2, discoveryScore: 20, rewardPoints: 2, sameBusinessCooldownDays: 14 });
    assert.deepEqual(REWARD_ACTION_CONFIG.CHECK_IN, { dailyActionLimit: 2, discoveryScore: 50, rewardPoints: 5, sameBusinessCooldownDays: 14 });
});

test("Istanbul daily and weekly windows are independent from server UTC timezone", () => {
    assert.deepEqual(getIstanbulDayWindow(new Date("2026-08-14T21:00:00.000Z")), {
        end: new Date("2026-08-15T21:00:00.000Z"),
        start: new Date("2026-08-14T21:00:00.000Z"),
    });
    assert.deepEqual(getIstanbulWeekWindow(new Date("2026-08-16T20:59:59.000Z")), {
        end: new Date("2026-08-16T21:00:00.000Z"),
        start: new Date("2026-08-09T21:00:00.000Z"),
    });
});

test("Haversine distance uses server coordinates", () => {
    assert.ok(distanceMeters({ latitude: 40.9862, longitude: 37.8797 }, { latitude: 40.9867, longitude: 37.8802 }) < 100);
});

test("DISCOVERY awards once, enforces cooldown, and caps the fourth distinct business", async () => {
    const { engine } = setup();
    const first = await engine.record(event());
    const cooldown = await engine.record(event({ clientEventId: crypto.randomUUID() }));
    await engine.record(event({ businessId: "business-2" }));
    await engine.record(event({ businessId: "business-3" }));
    const fourth = await engine.record(event({ businessId: "business-4" }));

    assert.equal(first.awardedPoints, 1);
    assert.equal(first.discoveryScoreDelta, 10);
    assert.equal(cooldown.reasonCode, "BUSINESS_COOLDOWN");
    assert.equal(fourth.reasonCode, "DAILY_ACTION_LIMIT");
});

test("CONTACT treats call, WhatsApp, and location as one reward group", async () => {
    const { engine } = setup();
    const call = await engine.record(event({ actionType: "CONTACT", metadata: { channel: "call" } }));
    const whatsapp = await engine.record(event({ actionType: "CONTACT", metadata: { channel: "whatsapp" } }));
    const location = await engine.record(event({ actionType: "CONTACT", metadata: { channel: "location" } }));
    const second = await engine.record(event({ actionType: "CONTACT", businessId: "business-2" }));
    const third = await engine.record(event({ actionType: "CONTACT", businessId: "business-3" }));

    assert.equal(call.awardedPoints, 2);
    assert.equal(whatsapp.reasonCode, "BUSINESS_COOLDOWN");
    assert.equal(location.reasonCode, "BUSINESS_COOLDOWN");
    assert.equal(second.awardedPoints, 2);
    assert.equal(third.reasonCode, "DAILY_ACTION_LIMIT");
});

test("CHECK_IN validates distance, accuracy, coordinates, cooldown, and daily limit", async () => {
    const validLocation = { accuracy: 18, latitude: 40.98625, longitude: 37.87975 };
    const { engine } = setup();
    const valid = await engine.record(event({ actionType: "CHECK_IN", location: validLocation }));
    const cooldown = await engine.record(event({ actionType: "CHECK_IN", location: validLocation }));
    const poorAccuracy = await engine.record(event({ actionType: "CHECK_IN", businessId: "business-2", location: { ...validLocation, accuracy: 150 } }));
    const tooFar = await engine.record(event({ actionType: "CHECK_IN", businessId: "business-2", location: { accuracy: 20, latitude: 41.01, longitude: 37.90 } }));
    const noCoordinates = await engine.record(event({ actionType: "CHECK_IN", businessId: "business-no-coords", location: validLocation }));
    const second = await engine.record(event({ actionType: "CHECK_IN", businessId: "business-2", location: validLocation }));
    const third = await engine.record(event({ actionType: "CHECK_IN", businessId: "business-3", location: validLocation }));

    assert.equal(valid.awardedPoints, 5);
    assert.equal(valid.discoveryScoreDelta, 50);
    assert.equal(cooldown.reasonCode, "BUSINESS_COOLDOWN");
    assert.equal(poorAccuracy.reasonCode, "CHECK_IN_LOW_ACCURACY");
    assert.equal(tooFar.reasonCode, "CHECK_IN_TOO_FAR");
    assert.equal(noCoordinates.reasonCode, "CHECK_IN_NO_COORDINATES");
    assert.equal(second.awardedPoints, 5);
    assert.equal(third.reasonCode, "DAILY_ACTION_LIMIT");
});

test("global daily cap partially awards points while preserving valid discovery score", async () => {
    const { engine, repository } = setup();
    repository.seedApproved({ appUserId: event().appUserId, awardedPoints: 14, businessId: "seed", city: "Ordu", discoveryScoreDelta: 0, now: NOW });
    const result = await engine.record(event({ actionType: "CONTACT" }));
    assert.equal(result.basePoints, 2);
    assert.equal(result.awardedPoints, 1);
    assert.equal(result.capped, true);
    assert.equal(result.dailyEarned, 15);
    assert.equal(result.discoveryScoreDelta, 20);
});

test("duplicate event ids and concurrent requests cannot double-award", async () => {
    const { engine } = setup();
    const input = event();
    const results = await Promise.all([engine.record(input), engine.record(input)]);
    assert.equal(results.reduce((sum, result) => sum + result.awardedPoints, 0), 1);
    assert.equal(results.filter((result) => result.idempotent).length, 1);
});

test("weekly leaderboard is city-scoped, score-based, and returns current rank", async () => {
    const { engine, repository } = setup();
    await engine.record(event());
    await engine.record(event({ actionType: "CONTACT", businessId: "business-2" }));
    await engine.record(event({ actionType: "DISCOVERY", appUserId: "00000000-0000-4000-8000-000000000002", businessId: "business-3" }));
    await engine.record(event({ actionType: "CHECK_IN", appUserId: "00000000-0000-4000-8000-000000000003", businessId: "business-5", location: { accuracy: 10, latitude: 40.9128, longitude: 38.3895 } }));
    repository.setUser("00000000-0000-4000-8000-000000000001", "Ada", null);
    repository.setUser("00000000-0000-4000-8000-000000000002", "Ece", null);

    const board = await engine.getLeaderboard({ appUserId: event().appUserId, city: "Ordu", period: "week" });
    assert.deepEqual(board.leaders.map(({ displayName, score }) => [displayName, score]), [["Ada", 30], ["Ece", 10]]);
    assert.deepEqual(board.me, { rank: 1, score: 30 });
    assert.equal(board.leaders.some((leader) => leader.score === 50), false);
});
