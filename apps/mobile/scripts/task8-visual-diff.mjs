import assert from "node:assert/strict";

import pngjs from "pngjs";

const { PNG } = pngjs;

export function comparePngBuffers(expectedBuffer, actualBuffer, { channelThreshold = 12 } = {}) {
  const expected = PNG.sync.read(expectedBuffer);
  const actual = PNG.sync.read(actualBuffer);
  assert.deepEqual(
    { height: actual.height, width: actual.width },
    { height: expected.height, width: expected.width },
    "visual baseline dimensions changed"
  );

  let changedPixelCount = 0;
  let totalChannelDelta = 0;
  for (let offset = 0; offset < expected.data.length; offset += 4) {
    let pixelChanged = false;
    for (let channel = 0; channel < 4; channel += 1) {
      const delta = Math.abs(expected.data[offset + channel] - actual.data[offset + channel]);
      totalChannelDelta += delta;
      if (delta > channelThreshold) pixelChanged = true;
    }
    if (pixelChanged) changedPixelCount += 1;
  }

  const pixelCount = expected.width * expected.height;
  return {
    changedPixelCount,
    changedPixelRatio: changedPixelCount / pixelCount,
    height: expected.height,
    meanChannelDelta: totalChannelDelta / expected.data.length,
    width: expected.width
  };
}

export function createDiffPngBuffer(expectedBuffer, actualBuffer, { channelThreshold = 12 } = {}) {
  const expected = PNG.sync.read(expectedBuffer);
  const actual = PNG.sync.read(actualBuffer);
  assert.deepEqual(
    { height: actual.height, width: actual.width },
    { height: expected.height, width: expected.width },
    "visual diff dimensions changed"
  );
  const diff = new PNG({ height: expected.height, width: expected.width });

  for (let offset = 0; offset < expected.data.length; offset += 4) {
    const changed = [0, 1, 2, 3].some((channel) => (
      Math.abs(expected.data[offset + channel] - actual.data[offset + channel]) > channelThreshold
    ));
    if (changed) {
      diff.data.set([255, 0, 0, 255], offset);
    } else {
      const value = Math.round((expected.data[offset] + expected.data[offset + 1] + expected.data[offset + 2]) / 6);
      diff.data.set([value, value, value, 160], offset);
    }
  }

  return PNG.sync.write(diff);
}
