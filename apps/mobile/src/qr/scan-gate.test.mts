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
  }
});

const { createScanGate }: typeof import("./scan-gate") = await import(
  new URL("./scan-gate.ts", import.meta.url).href
);

test("scan gate acquires synchronously and rejects repeated callbacks", () => {
  const gate = createScanGate();

  assert.equal(gate.acquire(), true);
  assert.equal(gate.acquire(), false);
  assert.equal(gate.state(), "locked");
});

test("scan errors stay locked until explicit retry", () => {
  const gate = createScanGate();
  gate.acquire();

  assert.equal(gate.acquire(), false);
  assert.equal(gate.retry(), true);
  assert.equal(gate.state(), "ready");
  assert.equal(gate.acquire(), true);
});

test("successful navigation can never release back into the scanner", () => {
  const gate = createScanGate();
  gate.acquire();
  gate.markNavigated();

  assert.equal(gate.retry(), false);
  assert.equal(gate.acquire(), false);
  assert.equal(gate.state(), "navigated");
});
