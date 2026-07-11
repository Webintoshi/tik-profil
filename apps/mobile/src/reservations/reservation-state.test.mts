/// <reference types="node" />

import assert from "node:assert/strict";
import test from "node:test";

const stateModule = await import(new URL("./reservation-state.ts", import.meta.url).href)
  .catch(() => null) as typeof import("./reservation-state") | null;

test("reservation state module exists", () => {
  assert.ok(stateModule, "reservation state module must be implemented");
});

if (stateModule) {
  test("resource changes clear availability-dependent selections", () => {
    let state = stateModule.createReservationState();
    state = stateModule.reduceReservationState(state, { type: "select-resource", resourceId: "room-1" });
    state = stateModule.reduceReservationState(state, { type: "select-start", date: "2026-07-12" });
    state = stateModule.reduceReservationState(state, { type: "select-end", date: "2026-07-14" });
    state = stateModule.reduceReservationState(state, { type: "select-resource", resourceId: "room-2" });
    assert.equal(state.startDate, null);
    assert.equal(state.endDate, null);
  });

  test("restaurant reservations keep one date and selected time", () => {
    let state = stateModule.createReservationState();
    state = stateModule.reduceReservationState(state, { type: "select-start", date: "2026-07-12" });
    state = stateModule.reduceReservationState(state, { type: "select-time", time: "19:30" });
    assert.equal(state.startDate, "2026-07-12");
    assert.equal(state.time, "19:30");
  });

  test("restaurant selection becomes a bounded RFC3339 range while date reservations stay date-only", () => {
    assert.deepEqual(stateModule.buildReservationRange("restaurant", "2026-07-12", null, "19:30"), {
      endDate: "2026-07-12T21:30:00+03:00",
      startDate: "2026-07-12T19:30:00+03:00"
    });
    assert.deepEqual(stateModule.buildReservationRange("restaurant", "2026-07-12", null, "23:30"), {
      endDate: "2026-07-13T01:30:00+03:00",
      startDate: "2026-07-12T23:30:00+03:00"
    });
    assert.deepEqual(stateModule.buildReservationRange("hotel", "2026-07-12", "2026-07-14", null), {
      endDate: "2026-07-14",
      startDate: "2026-07-12"
    });
    assert.equal(stateModule.buildReservationRange("restaurant", "2026-07-12", null, null), null);
  });

  test("party size is validated for restaurant and hotel but omitted for vehicle", () => {
    assert.equal(stateModule.getReservationPartySize("restaurant", "4"), 4);
    assert.equal(stateModule.getReservationPartySize("hotel", "2"), 2);
    assert.equal(stateModule.getReservationPartySize("vehicle", "2"), undefined);
    assert.equal(stateModule.getReservationPartySize("hotel", "0"), null);
  });

  test("lost-response retries retain the idempotency key until the draft changes", () => {
    const initial = stateModule.createReservationIdempotencyState();
    const first = stateModule.resolveReservationIdempotency(initial, "hotel|room-1|2026-07-12|2026-07-14");
    const retry = stateModule.resolveReservationIdempotency(first, "hotel|room-1|2026-07-12|2026-07-14");
    const changed = stateModule.resolveReservationIdempotency(retry, "hotel|room-1|2026-07-13|2026-07-14");
    assert.equal(first.key, retry.key);
    assert.notEqual(retry.key, changed.key);
  });
}
