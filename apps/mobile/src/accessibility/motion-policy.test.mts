import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import test from "node:test";

registerHooks({
  load(url, context, nextLoad) {
    if (url.endsWith(".ts")) return nextLoad(url, { ...context, format: "module-typescript" });
    return nextLoad(url, context);
  }
});

const { getPressMotion }: typeof import("./motion-policy") = await import(new URL("./motion-policy.ts", import.meta.url).href);

test("press feedback uses exact in and out timing without overshoot", () => {
  assert.deepEqual(getPressMotion({ pressScale: 0.98, pressed: true, reducedMotion: false }), {
    duration: 90,
    scale: 0.98
  });
  assert.deepEqual(getPressMotion({ pressScale: 0.98, pressed: false, reducedMotion: false }), {
    duration: 120,
    scale: 1
  });
});

test("reduced motion snaps press scale to one", () => {
  assert.deepEqual(getPressMotion({ pressScale: 0.9, pressed: true, reducedMotion: true }), {
    duration: 0,
    scale: 1
  });
});
