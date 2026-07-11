/// <reference types="node" />

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const panelUrl = new URL("../components/business/ReservationPanel.tsx", import.meta.url);
const routeUrl = new URL("../../app/(tabs)/business/[slug].tsx", import.meta.url);
const accountUrl = new URL("../../app/(tabs)/account.tsx", import.meta.url);

test("reservation panel owns loading empty validation submit and confirmation states", async () => {
  const source = await readFile(panelUrl, "utf8").catch(() => "");
  assert.match(source, /export function ReservationPanel/);
  assert.match(source, /ActivityIndicator/);
  assert.match(source, /reservation-panel-empty/);
  assert.match(source, /reservation-panel-success/);
  assert.match(source, /accessibilityRole="alert"/);
  assert.match(source, /runAuthenticated/);
  assert.match(source, /refreshCustomer/);
});

test("business host gates native reservations on canonical options", async () => {
  const source = await readFile(routeUrl, "utf8");
  assert.match(source, /fetchReservationOptions/);
  assert.match(source, /nativeEnabled[\s\S]{0,220}reservation-booking|reservation-booking[\s\S]{0,220}nativeEnabled/);
  assert.match(source, /<ReservationPanel/);
  assert.match(source, /setIsReservationOpen/);
});

test("customer account renders and confirms cancellation of owned reservations", async () => {
  const source = await readFile(accountUrl, "utf8");
  assert.match(source, /cancelReservation/);
  assert.match(source, /reservation\.cancellable/);
  assert.match(source, /Alert\.alert/);
  assert.match(source, /if \(!cancelled\) throw new Error/);
});
