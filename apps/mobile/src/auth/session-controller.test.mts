/// <reference types="node" />

import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import test from "node:test";

registerHooks({
  load(url, context, nextLoad) {
    if (url.endsWith(".ts")) return nextLoad(url, { ...context, format: "module-typescript" });
    return nextLoad(url, context);
  },
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith(".") && !specifier.match(/\.[a-z]+$/i)) {
      return nextResolve(`${specifier}.ts`, context);
    }
    return nextResolve(specifier, context);
  }
});

const { CustomerApiError }: typeof import("../api/customer") = await import(new URL("../api/customer.ts", import.meta.url).href);
const { createSessionController }: typeof import("./session-controller") = await import(new URL("./session-controller.ts", import.meta.url).href);

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej; });
  return { promise, reject, resolve };
}

const flush = () => new Promise<void>((resolve) => setImmediate(resolve));
const token = (name: string, expiresAt = Date.now() + 600_000) => ({ accessToken: `${name}-access`, expiresAt, refreshToken: `${name}-refresh` });
const customer = (email: string) => ({ addresses: [], email, orders: [], profile: null, reservations: [] });

function harness(overrides: Record<string, unknown> = {}) {
  let stored: string | null = null;
  let clearCalls = 0;
  let writeCalls = 0;
  const dependencies = {
    authorize: async () => token("auth"),
    fetchCustomer: async () => customer("auth@example.com"),
    refresh: async () => token("rotated"),
    revoke: async () => undefined,
    storage: {
      clear: async () => { clearCalls += 1; stored = null; },
      read: async () => stored,
      write: async (value: string) => { writeCalls += 1; stored = value; }
    },
    ...overrides
  };
  const controller = createSessionController(dependencies as never);
  return {
    controller,
    get clearCalls() { return clearCalls; },
    get stored() { return stored; },
    set stored(value: string | null) { stored = value; },
    get writeCalls() { return writeCalls; }
  };
}

test("sign-out during storage read suppresses restore completion", async () => {
  const read = deferred<string | null>();
  let fetchCalls = 0;
  const context = harness({
    fetchCustomer: async () => { fetchCalls += 1; return customer("stale@example.com"); },
    storage: { clear: async () => undefined, read: () => read.promise, write: async () => undefined }
  });
  const restoring = context.controller.restore();
  await flush();
  await context.controller.signOut();
  read.resolve(JSON.stringify(token("stale")));
  await restoring;
  assert.equal(context.controller.getState().status, "signed_out");
  assert.equal(fetchCalls, 0);
});

test("sign-out during authorize suppresses token and storage writes", async () => {
  const authorize = deferred<ReturnType<typeof token> | null>();
  const context = harness({ authorize: () => authorize.promise });
  const signingIn = context.controller.signIn();
  await flush();
  await context.controller.signOut();
  authorize.resolve(token("stale"));
  await signingIn;
  assert.equal(context.controller.getState().status, "signed_out");
  assert.equal(context.writeCalls, 0);
});

test("sign-out during refresh suppresses rotated session", async () => {
  const refresh = deferred<ReturnType<typeof token>>();
  const context = harness({ refresh: () => refresh.promise });
  context.stored = JSON.stringify(token("expired", Date.now() - 1));
  const restoring = context.controller.restore();
  await flush();
  await context.controller.signOut();
  refresh.resolve(token("stale-rotated"));
  await restoring;
  assert.equal(context.controller.getState().status, "signed_out");
  assert.equal(context.writeCalls, 0);
});

test("sign-out during customer fetch suppresses stale customer", async () => {
  const fetchCustomer = deferred<ReturnType<typeof customer>>();
  const context = harness({ fetchCustomer: () => fetchCustomer.promise });
  const signingIn = context.controller.signIn();
  await flush();
  await context.controller.signOut();
  fetchCustomer.resolve(customer("stale@example.com"));
  await signingIn;
  assert.equal(context.controller.getState().status, "signed_out");
  assert.equal(context.controller.getState().customer, null);
});

test("sign-out during storage write compensates with a final clear", async () => {
  const write = deferred<void>();
  let persisted: string | null = null;
  let clearCalls = 0;
  const context = harness({
    storage: {
      clear: async () => { clearCalls += 1; persisted = null; },
      read: async () => null,
      write: async (value: string) => { await write.promise; persisted = value; }
    }
  });
  const signingIn = context.controller.signIn();
  await flush();
  const signingOut = context.controller.signOut();
  write.resolve();
  await Promise.all([signingIn, signingOut]);
  assert.equal(persisted, null);
  assert.ok(clearCalls >= 2);
  assert.equal(context.controller.getState().status, "signed_out");
});

test("401 refreshes once, rotates storage, and retries once", async () => {
  let fetchCalls = 0;
  let refreshCalls = 0;
  const context = harness({
    fetchCustomer: async (accessToken: string) => {
      fetchCalls += 1;
      if (fetchCalls === 1) throw new CustomerApiError(401, { code: "UNAUTHORIZED" });
      assert.equal(accessToken, "rotated-access");
      return customer("retry@example.com");
    },
    refresh: async () => { refreshCalls += 1; return token("rotated"); }
  });
  await context.controller.signIn();
  assert.equal(fetchCalls, 2);
  assert.equal(refreshCalls, 1);
  assert.equal(context.controller.getState().accessToken, "rotated-access");
  assert.equal(context.controller.getState().customer?.email, "retry@example.com");
  assert.match(context.stored ?? "", /rotated-access/);
});

test("repeated 401 clears session and customer without an infinite retry", async () => {
  let fetchCalls = 0;
  let refreshCalls = 0;
  const context = harness({
    fetchCustomer: async () => { fetchCalls += 1; throw new CustomerApiError(401, null); },
    refresh: async () => { refreshCalls += 1; return token("rotated"); }
  });
  await context.controller.signIn();
  assert.equal(fetchCalls, 2);
  assert.equal(refreshCalls, 1);
  assert.equal(context.controller.getState().status, "signed_out");
  assert.equal(context.stored, null);
});

test("refresh failure after 401 clears secure session and customer", async () => {
  const context = harness({
    fetchCustomer: async () => { throw new CustomerApiError(401, null); },
    refresh: async () => { throw new Error("refresh failed"); }
  });
  await context.controller.signIn();
  assert.equal(context.controller.getState().status, "signed_out");
  assert.equal(context.controller.getState().accessToken, null);
  assert.equal(context.stored, null);
});

test("proactive refresh failure clears an expired signed-in session", async () => {
  const baseTime = Date.now();
  let now = baseTime;
  const context = harness({
    authorize: async () => token("auth", baseTime + 61_000),
    now: () => now,
    refresh: async () => { throw new Error("refresh failed"); }
  });
  await context.controller.signIn();
  now = baseTime + 2_000;
  await context.controller.refreshCustomer();
  assert.equal(context.controller.getState().status, "signed_out");
  assert.equal(context.controller.getState().customer, null);
  assert.equal(context.stored, null);
});

test("token rotation preserves rendered customer until replacement arrives", async () => {
  const replacement = deferred<ReturnType<typeof customer>>();
  let fetchCalls = 0;
  const context = harness({
    fetchCustomer: async () => {
      fetchCalls += 1;
      if (fetchCalls === 1) return customer("current@example.com");
      if (fetchCalls === 2) throw new CustomerApiError(401, null);
      return replacement.promise;
    }
  });
  await context.controller.signIn();
  const refreshing = context.controller.refreshCustomer();
  await flush();
  assert.equal(context.controller.getState().status, "refreshing");
  assert.equal(context.controller.getState().customer?.email, "current@example.com");
  assert.equal(context.controller.getState().accessToken, "rotated-access");
  replacement.resolve(customer("replacement@example.com"));
  await refreshing;
  assert.equal(context.controller.getState().customer?.email, "replacement@example.com");
});

test("stale fetch cannot overwrite a new sign-in after sign-out", async () => {
  const staleFetch = deferred<ReturnType<typeof customer>>();
  let authorizeCalls = 0;
  let fetchCalls = 0;
  const context = harness({
    authorize: async () => token(authorizeCalls++ === 0 ? "old" : "new"),
    fetchCustomer: async () => ++fetchCalls === 1 ? staleFetch.promise : customer("new@example.com")
  });
  const oldSignIn = context.controller.signIn();
  await flush();
  await context.controller.signOut();
  await context.controller.signIn();
  staleFetch.resolve(customer("old@example.com"));
  await oldSignIn;
  assert.equal(context.controller.getState().customer?.email, "new@example.com");
  assert.equal(context.controller.getState().accessToken, "new-access");
});

test("concurrent refresh requests are suppressed", async () => {
  const pending = deferred<ReturnType<typeof customer>>();
  let fetchCalls = 0;
  const context = harness({
    fetchCustomer: async () => ++fetchCalls === 1 ? customer("current@example.com") : pending.promise
  });
  await context.controller.signIn();
  const first = context.controller.refreshCustomer();
  const second = context.controller.refreshCustomer();
  await flush();
  assert.equal(fetchCalls, 2);
  pending.resolve(customer("next@example.com"));
  await Promise.all([first, second]);
  assert.equal(fetchCalls, 2);
});

test("sign-out suppresses profile, avatar, and address mutation completions", async (t) => {
  for (const operationName of ["profile", "avatar", "address"]) {
    await t.test(operationName, async () => {
      const pending = deferred<string>();
      const context = harness();
      await context.controller.signIn();
      const mutation = context.controller.runAuthenticated(() => pending.promise);
      await flush();
      await context.controller.signOut();
      pending.resolve(`${operationName}-saved`);
      assert.equal(await mutation, undefined);
      assert.equal(context.controller.getState().status, "signed_out");
      assert.equal(context.controller.getState().customer, null);
    });
  }
});

test("authenticated mutation receives one 401 refresh and one retry", async () => {
  const context = harness();
  await context.controller.signIn();
  let calls = 0;
  const result = await context.controller.runAuthenticated(async (accessToken) => {
    calls += 1;
    if (calls === 1) throw new CustomerApiError(401, null);
    assert.equal(accessToken, "rotated-access");
    return "saved";
  });
  assert.equal(result, "saved");
  assert.equal(calls, 2);
});
