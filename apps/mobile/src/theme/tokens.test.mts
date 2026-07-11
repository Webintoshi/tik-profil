import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import test from "node:test";

registerHooks({
  load(url, context, nextLoad) {
    if (url.endsWith(".ts")) return nextLoad(url, { ...context, format: "module-typescript" });
    return nextLoad(url, context);
  }
});

const {
  getThemeColors,
  getThemeShadows,
  interaction
}: typeof import("./tokens") = await import(new URL("./tokens.ts", import.meta.url).href);

function relativeLuminance(color: string) {
  const match = /^#([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(color);
  assert.ok(match, `Expected an opaque hex color, received ${color}`);
  const channels = match.slice(1).map((channel) => {
    const value = Number.parseInt(channel, 16) / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}

function contrastRatio(foreground: string, background: string) {
  const lighter = Math.max(relativeLuminance(foreground), relativeLuminance(background));
  const darker = Math.min(relativeLuminance(foreground), relativeLuminance(background));
  return (lighter + 0.05) / (darker + 0.05);
}

test("primary amber remains stable and readable across both theme modes", () => {
  const light = getThemeColors("light");
  const dark = getThemeColors("dark");

  assert.deepEqual(
    {
      light: [light.brand, light.brandDeep, light.onBrand, light.brandSoft, light.accent, light.accentDeep, light.onAccent],
      dark: [dark.brand, dark.brandDeep, dark.onBrand, dark.brandSoft, dark.accent, dark.accentDeep, dark.onAccent]
    },
    {
      light: ["#FFB347", "#8A4A00", "#2B1800", "#FFF0CC", "#263A5B", "#17233A", "#FFFFFF"],
      dark: ["#FFC15A", "#FFD58C", "#251500", "rgba(255,193,90,0.16)", "#8FB8FF", "#C6DAFF", "#101722"]
    }
  );
});

test("interactive surface border and focus tokens match the Task 8 contract", () => {
  const light = getThemeColors("light");
  const dark = getThemeColors("dark");

  assert.deepEqual(
    {
      light: [light.surfacePressed, light.surfaceSelected, light.borderStrong, light.borderBrand, light.focusRing],
      dark: [dark.surfacePressed, dark.surfaceSelected, dark.borderStrong, dark.borderBrand, dark.focusRing]
    },
    {
      light: ["#F5F1E9", "#FFF6E3", "#B9B2A7", "#D98A16", "#7A4100"],
      dark: ["#292218", "rgba(255,193,90,0.14)", "#746651", "rgba(255,193,90,0.58)", "#FFC15A"]
    }
  );
});

test("normal text brand accent and focus pairs meet WCAG contrast thresholds", () => {
  for (const mode of ["light", "dark"] as const) {
    const colors = getThemeColors(mode);
    assert.ok(contrastRatio(colors.ink, colors.background) >= 4.5, `${mode} ink/background`);
    assert.ok(contrastRatio(colors.muted, colors.background) >= 4.5, `${mode} muted/background`);
    assert.ok(contrastRatio(colors.onBrand, colors.brand) >= 4.5, `${mode} onBrand/brand`);
    assert.ok(contrastRatio(colors.onAccent, colors.accent) >= 4.5, `${mode} onAccent/accent`);
    for (const surface of [colors.background, colors.surface, colors.surfaceRaised]) {
      assert.ok(contrastRatio(colors.focusRing, surface) >= 3, `${mode} focus ring on ${surface}`);
    }
  }
});

test("status and category colors are not aliases of the primary or accent families", () => {
  for (const mode of ["light", "dark"] as const) {
    const colors = getThemeColors(mode);
    for (const semantic of [colors.teal, colors.coral, colors.violet, colors.blue]) {
      assert.notEqual(semantic, colors.brand);
      assert.notEqual(semantic, colors.accent);
    }
    assert.notEqual(colors.coral, colors.danger);
  }
});

test("interaction constants and two elevation purposes are exact", () => {
  assert.deepEqual(interaction, {
    minTouchTarget: 44,
    focusRingWidth: 3,
    focusRingOffset: 2,
    pressedOpacity: 0.86,
    disabledOpacity: 0.48,
    motion: { pressInMs: 90, pressOutMs: 120, selectionMs: 180 }
  });

  for (const mode of ["light", "dark"] as const) {
    const shadows = getThemeShadows(mode);
    assert.deepEqual(shadows.soft, shadows.card);
    assert.equal(shadows.card.elevation, 2);
    assert.ok((shadows.lifted.elevation ?? 0) > (shadows.card.elevation ?? 0));
    assert.doesNotMatch(shadows.lifted.boxShadow, /255,\s*191,\s*65/);
  }
});
