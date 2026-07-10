/// <reference types="node" />

import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import test from "node:test";

registerHooks({
  load(url, context, nextLoad) {
    if (url.endsWith(".ts")) return nextLoad(url, { ...context, format: "module-typescript" });
    return nextLoad(url, context);
  }
});

const sessionModuleUrl = new URL("./session-state.ts", import.meta.url).href;
const {
  createOperationGate,
  initialSessionState,
  isTokenExpired,
  parseStoredSession,
  reduceSession,
  shouldRefresh
}: typeof import("./session-state") = await import(sessionModuleUrl);

const storedSession = {
  accessToken: "access-token",
  expiresAt: 2_000_000,
  refreshToken: "refresh-token"
};

const customer = {
  addresses: [],
  email: "customer@example.com",
  orders: [],
  profile: null,
  reservations: []
};

test("cold start begins in loading without invented account data", () => {
  assert.deepEqual(initialSessionState, {
    accessToken: null,
    customer: null,
    error: null,
    status: "loading"
  });
  assert.deepEqual(reduceSession(initialSessionState, { type: "RESTORE_EMPTY" }), {
    accessToken: null,
    customer: null,
    error: null,
    status: "signed_out"
  });
});

test("stored session parsing accepts only complete refreshable token material", () => {
  assert.deepEqual(parseStoredSession(JSON.stringify(storedSession)), storedSession);
  assert.equal(parseStoredSession(null), null);
  assert.equal(parseStoredSession("not-json"), null);
  assert.equal(parseStoredSession(JSON.stringify({ accessToken: "token" })), null);
});

test("token expiry and proactive refresh use explicit time boundaries", () => {
  assert.equal(isTokenExpired(storedSession, 2_000_000), true);
  assert.equal(isTokenExpired(storedSession, 1_999_999), false);
  assert.equal(shouldRefresh(storedSession, 1_940_000), true);
  assert.equal(shouldRefresh(storedSession, 1_939_999), false);
});

test("valid restoration and profile refresh become signed in", () => {
  const restored = reduceSession(initialSessionState, {
    accessToken: storedSession.accessToken,
    type: "TOKEN_RESTORED"
  });
  assert.equal(restored.status, "refreshing");
  assert.equal(restored.accessToken, storedSession.accessToken);

  const signedIn = reduceSession(restored, { customer, type: "CUSTOMER_LOADED" });
  assert.deepEqual(signedIn, {
    accessToken: storedSession.accessToken,
    customer,
    error: null,
    status: "signed_in"
  });

  const refreshing = reduceSession(signedIn, { type: "CUSTOMER_REFRESH_STARTED" });
  assert.equal(refreshing.status, "refreshing");
  assert.equal(refreshing.customer, customer);
  assert.equal(reduceSession(refreshing, { customer, type: "CUSTOMER_LOADED" }).status, "signed_in");
});

test("expired refresh failure and sign out clear all account state", () => {
  const signedIn = {
    accessToken: storedSession.accessToken,
    customer,
    error: null,
    status: "signed_in" as const
  };
  const failed = reduceSession(signedIn, { error: "Oturum yenilenemedi.", type: "SESSION_EXPIRED" });
  assert.deepEqual(failed, {
    accessToken: null,
    customer: null,
    error: "Oturum yenilenemedi.",
    status: "signed_out"
  });
  assert.deepEqual(reduceSession(signedIn, { type: "SIGNED_OUT" }), {
    accessToken: null,
    customer: null,
    error: null,
    status: "signed_out"
  });
});

test("operation gate suppresses concurrent auth and refresh operations", async () => {
  const gate = createOperationGate();
  let release!: () => void;
  const pending = new Promise<void>((resolve) => { release = resolve; });
  let calls = 0;
  const first = gate.run(async () => { calls += 1; await pending; return "first"; });
  const second = gate.run(async () => { calls += 1; return "second"; });

  assert.equal(await second, undefined);
  assert.equal(calls, 1);
  release();
  assert.equal(await first, "first");
  assert.equal(await gate.run(async () => "third"), "third");
});
