/// <reference types="node" />

import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import test from "node:test";

registerHooks({
  load(url, context, nextLoad) {
    if (url.endsWith(".ts")) {
      return nextLoad(url, { ...context, format: "module-typescript" });
    }
    return nextLoad(url, context);
  },
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith(".") && !specifier.endsWith(".ts")) {
      return nextResolve(`${specifier}.ts`, context);
    }
    return nextResolve(specifier, context);
  }
});

const { processQrScan }: typeof import("./qr-scan-flow") = await import(
  new URL("./qr-scan-flow.ts", import.meta.url).href
);
const { createScanSession }: typeof import("./scan-session") = await import(
  new URL("./scan-session.ts", import.meta.url).href
);

test("old rendered handler is rejected after blur and refocus while current handler succeeds", () => {
  const session = createScanSession();
  session.mount();
  const oldGeneration = session.focus();
  assert.ok(oldGeneration !== null);
  const oldHandler = () => session.begin(oldGeneration);

  const activeAttempt = oldHandler();
  assert.ok(activeAttempt !== null);
  assert.equal(session.state(), "locked");

  session.blur();
  assert.equal(session.isCurrent(activeAttempt), false);
  assert.equal(session.state(), "ready");
  assert.equal(oldHandler(), null, "queued callback after blur must be ignored");

  const currentGeneration = session.focus();
  assert.ok(currentGeneration !== null);
  const currentHandler = () => session.begin(currentGeneration);
  assert.equal(oldHandler(), null, "old rendered handler must stay stale after refocus");
  const refocusedAttempt = currentHandler();
  assert.ok(refocusedAttempt !== null);
  assert.equal(session.isCurrent(refocusedAttempt), true);
});

test("stale completion after blur cannot log or navigate a refocused session", async () => {
  const session = createScanSession();
  session.mount();
  const generation = session.focus();
  assert.ok(generation !== null);
  const attemptId = session.begin(generation);
  assert.ok(attemptId !== null);

  let resolveProfile: ((value: {
    success: true;
    profile: { id: string; slug: string };
    redirectTarget: null;
  }) => void) | undefined;
  const profileResponse = new Promise<{
    success: true;
    profile: { id: string; slug: string };
    redirectTarget: null;
  }>((resolve) => {
    resolveProfile = resolve;
  });
  let logCount = 0;
  let replaceCount = 0;
  const processing = processQrScan("valid-slug", {
    fetchProfile: () => profileResponse,
    isCurrent: () => session.isCurrent(attemptId),
    logScan: () => { logCount += 1; },
    replace: () => { replaceCount += 1; }
  });

  session.blur();
  const refocusedGeneration = session.focus();
  assert.ok(refocusedGeneration !== null);
  assert.equal(session.state(), "ready");
  resolveProfile?.({
    success: true,
    profile: { id: "business-1", slug: "valid-slug" },
    redirectTarget: null
  });

  assert.deepEqual(await processing, { status: "stale" });
  assert.equal(logCount, 0);
  assert.equal(replaceCount, 0);
  assert.ok(session.begin(refocusedGeneration) !== null, "refocused scanner must accept a new callback");
});

test("successful navigation remains permanent across blur and refocus", () => {
  const session = createScanSession();
  session.mount();
  const generation = session.focus();
  assert.ok(generation !== null);
  const attemptId = session.begin(generation);
  assert.ok(attemptId !== null);
  assert.equal(session.markNavigated(attemptId), true);

  session.blur();
  const refocusedGeneration = session.focus();
  assert.ok(refocusedGeneration !== null);
  assert.equal(session.state(), "navigated");
  assert.equal(session.begin(refocusedGeneration), null);
});

test("remount invalidates handlers captured by the previous mount", () => {
  const session = createScanSession();
  session.mount();
  const oldGeneration = session.focus();
  assert.ok(oldGeneration !== null);
  const oldHandler = () => session.begin(oldGeneration);

  session.unmount();
  session.mount();
  const remountedGeneration = session.focus();
  assert.ok(remountedGeneration !== null);

  assert.equal(oldHandler(), null);
  assert.ok(session.begin(remountedGeneration) !== null);
});
