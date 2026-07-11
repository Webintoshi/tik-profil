/// <reference types="node" />

import assert from "node:assert/strict";
import test from "node:test";

const stateModule = await import(new URL("./appointment-state.ts", import.meta.url).href)
  .catch(() => null) as typeof import("./appointment-state") | null;

test("appointment state module exists", () => {
  assert.ok(stateModule, "appointment state module must be implemented");
});

if (stateModule) {
  test("service and staff changes clear dependent slot selection", () => {
    let state = stateModule.createAppointmentState();
    state = stateModule.reduceAppointmentState(state, { type: "select-service", serviceId: "service-1" });
    state = stateModule.reduceAppointmentState(state, { type: "select-staff", staffId: "staff-1" });
    state = stateModule.reduceAppointmentState(state, { type: "select-slot", date: "2026-07-13", time: "10:30" });
    state = stateModule.reduceAppointmentState(state, { type: "select-staff", staffId: "staff-2" });
    assert.equal(state.date, null);
    assert.equal(state.time, null);
  });

  test("submit lifecycle exposes loading, error, and confirmation states", () => {
    let state = stateModule.reduceAppointmentState(stateModule.createAppointmentState(), { type: "submit-start" });
    assert.equal(state.status, "submitting");
    state = stateModule.reduceAppointmentState(state, { type: "submit-error", message: "Slot dolu" });
    assert.equal(state.status, "error");
    assert.equal(state.message, "Slot dolu");
    state = stateModule.reduceAppointmentState(state, { type: "submit-success", appointmentId: "appointment-1" });
    assert.equal(state.status, "success");
    assert.equal(state.appointmentId, "appointment-1");
  });
}
