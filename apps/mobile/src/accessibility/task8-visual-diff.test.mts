import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import test from "node:test";

import pngjs from "pngjs";

registerHooks({
  load(url, context, nextLoad) {
    if (url.endsWith(".ts")) return nextLoad(url, { ...context, format: "module-typescript" });
    return nextLoad(url, context);
  }
});

const { PNG } = pngjs;
const {
  comparePngBuffers,
  createDiffPngBuffer
}: typeof import("../../scripts/task8-visual-diff.mjs") = await import(new URL("../../scripts/task8-visual-diff.mjs", import.meta.url).href);

function pngBuffer(pixels: ReadonlyArray<readonly [number, number, number, number]>) {
  const image = new PNG({ height: 2, width: 2 });
  pixels.forEach((pixel, index) => image.data.set(pixel, index * 4));
  return PNG.sync.write(image);
}

const black = [0, 0, 0, 255] as const;

test("decoded pixel comparison reports exact changed-pixel ratio", () => {
  const baseline = pngBuffer([black, black, black, black]);
  const changed = pngBuffer([black, [255, 0, 0, 255], black, black]);
  assert.deepEqual(comparePngBuffers(baseline, baseline), {
    changedPixelCount: 0,
    changedPixelRatio: 0,
    height: 2,
    meanChannelDelta: 0,
    width: 2
  });
  assert.deepEqual(comparePngBuffers(baseline, changed), {
    changedPixelCount: 1,
    changedPixelRatio: 0.25,
    height: 2,
    meanChannelDelta: 15.9375,
    width: 2
  });
});

test("channel threshold ignores anti-alias noise and diff PNG marks real drift", () => {
  const baseline = pngBuffer([black, black, black, black]);
  const noise = pngBuffer([black, [8, 8, 8, 255], black, black]);
  const drift = pngBuffer([black, [64, 64, 64, 255], black, black]);
  assert.equal(comparePngBuffers(baseline, noise, { channelThreshold: 12 }).changedPixelCount, 0);
  assert.equal(comparePngBuffers(baseline, drift, { channelThreshold: 12 }).changedPixelCount, 1);
  const diff = PNG.sync.read(createDiffPngBuffer(baseline, drift, { channelThreshold: 12 }));
  assert.deepEqual([...diff.data.slice(4, 8)], [255, 0, 0, 255]);
});
