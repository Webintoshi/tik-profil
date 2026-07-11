/// <reference types="node" />

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const panelUrl = new URL("../components/business/AppointmentPanel.tsx", import.meta.url);
const routeUrl = new URL("../../app/(tabs)/business/[slug].tsx", import.meta.url);
const accountUrl = new URL("../../app/(tabs)/account.tsx", import.meta.url);

test("appointment panel has accessible loading, error, empty, submit, and success states", async () => {
  const source = await readFile(panelUrl, "utf8").catch(() => "");
  assert.match(source, /export function AppointmentPanel/);
  assert.match(source, /ActivityIndicator/);
  assert.match(source, /accessibilityRole="alert"/);
  assert.match(source, /accessibilityState=\{\{[^}]*disabled/);
  assert.match(source, /appointment-panel-empty/);
  assert.match(source, /appointment-panel-success/);
  assert.match(source, /signIn/);
  assert.match(source, /refreshCustomer/);
});

test("business host gates appointment capability on actual options and keeps other panels isolated", async () => {
  const source = await readFile(routeUrl, "utf8");
  assert.match(source, /fetchAppointmentOptions/);
  assert.match(source, /primaryModuleId:\s*profile\?\.primaryModuleId/);
  assert.match(source, /nativeEnabled[\s\S]{0,160}appointment-booking|appointment-booking[\s\S]{0,160}nativeEnabled/);
  assert.match(source, /<AppointmentPanel/);
  assert.match(source, /isStaticOrderSurfaceOpen\s*=\s*Boolean\(openMenuKind\s*\|\|\s*isEcommerceOpen\)/);
  assert.match(source, /<FoodMenuPanel/);
  assert.match(source, /<EcommerceOrderPanel/);
});

test("customer account renders appointment history and cancellable controls", async () => {
  const source = await readFile(accountUrl, "utf8");
  assert.match(source, /customer\.appointments/);
  assert.match(source, /cancelAppointment/);
  assert.match(source, /cancellable/);
  assert.match(source, /Alert\.alert/);
  assert.match(source, /if \(!cancelled\) throw new Error/);
});
