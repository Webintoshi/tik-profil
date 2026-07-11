import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const mobileRoot = new URL("../../", import.meta.url);

test("Explore uses quiet reduced-motion editorial and coalesced sparse states", async () => {
  const source = await readFile(new URL("app/(tabs)/explore.tsx", mobileRoot), "utf8");
  assert.doesNotMatch(source, /Son aramalar Pop/);
  assert.match(source, /getExplorePresentation/);
  assert.match(source, /useReducedMotion/);
  assert.match(source, /transition=\{reducedMotion \? 0 : 180\}/);
  assert.match(source, /variant="inline"/);
  assert.match(source, /numberOfLines=\{3\}/);
  const hero = source.slice(source.indexOf("function CityHero"), source.indexOf("function GuideSection"));
  assert.doesNotMatch(hero, /shadows\./);
});

test("Account exposes focus busy wrapping and tab-navigation semantics", async () => {
  const source = await readFile(new URL("app/(tabs)/account.tsx", mobileRoot), "utf8");
  assert.match(source, /getAccountLayout\(fontScale\)/);
  assert.match(source, /resolveAccountFontScale/);
  assert.match(source, /testID="account-summary"/);
  assert.match(source, /testID=\{`account-summary-\$\{item\.label\}`\}/);
  assert.match(source, /minHeight: multiline \? 64 : interaction\.minTouchTarget/);
  assert.match(source, /accessibilityLabel=\{`\$\{title\}, \$\{summary\}`\}/);
  assert.match(source, /accessibilityState=\{\{ busy, disabled: busy \}\}/);
  assert.match(source, /accessibilityState=\{\{ expanded: isOpen \}\} aria-expanded=\{isOpen\}/);
  assert.match(source, /router\.navigate\("\/favorites"/);
  assert.match(source, /outlineColor: focused \? colors\.focusRing/);
  assert.doesNotMatch(source, /outlineStyle: "none"/);
  assert.doesNotMatch(source, /adjustsFontSizeToFit/);
  const support = source.slice(source.indexOf("function SupportLinksSection")).split("function ThemeMode")[0];
  assert.doesNotMatch(support, /AnimatedPressable|accessibilityRole="button"|onPress=/);
  const theme = source.slice(source.indexOf("function ThemeModeFloatingButton"));
  assert.match(theme, /function ThemeModeFloatingButton/);
  assert.match(theme, /function ThemeOrbGraphic/);
  assert.match(theme, /height: 44/);
  assert.match(theme, /width: 44/);
  assert.match(theme, /<ThemeOrbGraphic isDarkMode=\{isDarkMode\} \/>/);
  assert.match(theme, /<Svg width=\{32\} height=\{32\}/);
  assert.match(theme, /const ground = isDarkMode \? colors\.backgroundAlt : colors\.brandSoft/);
  assert.match(theme, /const wave = isDarkMode \? colors\.surfaceRaised : colors\.surface/);
  assert.match(theme, /selectionImpact\(\);\s*setMode\(/s);
  assert.doesNotMatch(theme, /shadows\./);
});

test("tab labels collapse out of flex and icons retain measurable geometry", async () => {
  const source = await readFile(new URL("src/components/navigation/MakyajTabBar.tsx", mobileRoot), "utf8");
  assert.match(source, /const labelWidth = useSharedValue/);
  assert.match(source, /const labelMargin = useSharedValue/);
  assert.match(source, /width: labelWidth\.value/);
  assert.match(source, /marginLeft: labelMargin\.value/);
  assert.match(source, /testID=\{`bottom-tab-label-\$\{routeName\}`\}/);
  assert.match(source, /flexShrink: 0/);
  assert.match(source, /testID=\{`bottom-tab-icon-\$\{routeName\}`\}/);
});
