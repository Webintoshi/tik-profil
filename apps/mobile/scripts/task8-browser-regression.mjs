import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import process from "node:process";

import { chromium } from "playwright";
import { cleanupBrowserTestProcesses, getFreePort, spawnManagedNode, waitForUrl } from "./browser-test-processes.mjs";
import { comparePngBuffers, createDiffPngBuffer } from "./task8-visual-diff.mjs";

const fixturePort = await getFreePort();
const expoPort = await getFreePort();
const fixtureUrl = `http://127.0.0.1:${fixturePort}`;
const appUrl = `http://127.0.0.1:${expoPort}`;
const viewport = { width: 390, height: 844 };
const artifactRoot = resolve(process.cwd(), "..", "..", "artifacts", "task-8");
const baselineRoot = join(artifactRoot, "baselines");
const diffRoot = join(artifactRoot, "diffs");
const updateVisualBaselines = process.env.TASK8_UPDATE_BASELINES === "1" || process.argv.includes("--update-baselines");
const visualThreshold = { channelThreshold: 12, maxChangedPixelRatio: 0.005, maxMeanChannelDelta: 1 };
const children = [];
const screenshotCases = [];
let browser;

try {
  children.push(spawnManagedNode(["scripts/task5-fixture-server.mjs"], {
    TASK5_FIXTURE_PORT: String(fixturePort),
    TASK8_BROWSER_FIXTURES: "1"
  }));
  children.push(spawnManagedNode(["node_modules/expo/bin/cli", "start", "--web", "--port", String(expoPort)], {
    CI: "1",
    EXPO_PUBLIC_DISABLE_LOCAL_DISCOVERY_BOOTSTRAP: "1",
    EXPO_PUBLIC_TASK8_BROWSER_FIXTURES: "1",
    EXPO_PUBLIC_TIKPROFIL_API_URL: fixtureUrl
  }));

  await waitForUrl(`${fixtureUrl}/_task7/counts`, 30_000);
  await waitForUrl(`${appUrl}/`, 120_000);
  browser = await chromium.launch({ headless: true });

  const focus = process.env.TASK8_BROWSER_FOCUS;
  await setFixtureScenario("default");
  if (!focus || focus === "surfaces") await verifyLightDarkSurfaceMatrix();
  if (!focus || focus === "geometry") await verifyNavigationGeometry();
  if (!focus || focus === "focus") await verifyKeyboardFocus();
  if (!focus || focus === "motion") await verifyReducedMotion();
  if (!focus || focus === "font") await verifyFontScale();
  if (!focus || focus === "sparse") await verifySparseAndGroupedStates();

  process.stdout.write(`Task 8 screenshot matrix passed ${screenshotCases.length} deterministic cases.\n`);
  process.stdout.write(`${screenshotCases.join("\n")}\n`);
} finally {
  await browser?.close();
  await cleanupBrowserTestProcesses(children, [fixturePort, expoPort]);
}

async function verifyLightDarkSurfaceMatrix() {
  const surfaces = ["home", "explore", "favorites", "account", "account-signed-out", "profile", "menu", "product-modal", "checkout"];
  for (const mode of ["light", "dark"]) {
    for (const surface of surfaces) {
      const state = await openSurface(surface, { favorites: ["task7-business", "task7-list-1"], mode });
      try {
        await assertTheme(state.page, mode);
        await assertSurfaceGeometry(state.page, surface);
        await captureStableScreenshot(state.page, `${mode}-${surface}`);
        await assertPageHealthy(state.page, state.issues);
      } finally {
        await state.context.close();
      }
    }
  }
}

async function verifyNavigationGeometry() {
  for (const width of [360, 390, 430]) {
    const state = await createPage({ mode: "light", viewport: { width, height: width === 360 ? 800 : width === 390 ? 844 : 932 } });
    try {
      await state.page.goto(`${appUrl}/business/task5-fixture`, { waitUntil: "domcontentloaded" });
      await state.page.getByTestId("business-profile-primary-action").waitFor();
      await state.page.waitForTimeout(250);
      const tabBar = await requiredBox(state.page.getByTestId("bottom-tab-bar"), "bottom tab bar");
      const tabList = await requiredBox(state.page.getByRole("tablist"), "tab list");
      const viewportState = await state.page.evaluate(() => ({
        bodyWidth: document.body.scrollWidth,
        documentWidth: document.documentElement.scrollWidth,
        innerWidth: window.innerWidth,
        scrollX: window.scrollX
      }));
      const tabs = [];
      for (const route of ["index", "explore", "favorites", "account"]) {
        const locator = state.page.getByTestId(`bottom-tab-${route}`);
        const box = await requiredBox(locator, route);
        tabs.push({ box, route });
      }
      for (const { box, route } of tabs) {
        assert.ok(box.width >= 44 && box.height >= 44, `${width} ${route} is below 44px`);
        assert.ok(
          box.x >= -0.5 && box.x + box.width <= width + 0.5,
          `${width} ${route} is clipped: ${JSON.stringify({ tabBar, tabList, tabs, viewportState })}`
        );
        const iconBox = await requiredBox(state.page.getByTestId(`bottom-tab-icon-${route}`), `${route} icon`);
        const svgBox = await requiredBox(state.page.getByTestId(`bottom-tab-icon-${route}`).locator("svg"), `${route} icon svg`);
        assert.ok(iconBox.width >= 20 && iconBox.height >= 20, `${width} ${route} icon wrapper is below 20px`);
        assert.ok(svgBox.width >= 20 && svgBox.height >= 20, `${width} ${route} rendered icon is below 20px`);
        await assertTabLabelGeometry(state.page, route, route === "index", `${width} ${route}`);
      }
      const selectedTabs = state.page.getByRole("tab", { selected: true });
      assert.equal(
        await selectedTabs.count(),
        1,
        `Home context selection is not exposed: ${JSON.stringify(await state.page.getByRole("tab").evaluateAll((elements) => elements.map((element) => element.outerHTML)))}`
      );
      assert.equal(await selectedTabs.first().getAttribute("data-testid"), "bottom-tab-index");
      const left = tabs[0].box.x;
      const right = tabs.at(-1).box.x + tabs.at(-1).box.width;
      assert.ok(Math.abs((left + right) / 2 - width / 2) <= 1, `${width} tabs are not centered`);
      assert.ok(tabBar.height >= 44, `${width} tab bar height is invalid`);
      await captureStableScreenshot(state.page, `geometry-${width}`);
      await assertPageHealthy(state.page, state.issues);
    } finally {
      await state.context.close();
    }
  }
}

async function verifyKeyboardFocus() {
  const state = await createPage({ favorites: [], mode: "light" });
  try {
    await state.page.goto(`${appUrl}/favorites`, { waitUntil: "domcontentloaded" });
    await state.page.getByTestId("favorites-list").waitFor();
    const target = state.page.getByTestId("bottom-tab-explore");
    await state.page.locator("body").focus();
    for (let index = 0; index < 40; index += 1) {
      await state.page.keyboard.press("Tab");
      if (await target.evaluate((element) => element === document.activeElement)) break;
    }
    assert.equal(await target.evaluate((element) => element === document.activeElement), true, "keyboard could not reach Explore tab");
    await state.page.waitForFunction(() => getComputedStyle(document.activeElement).outlineWidth === "3px");
    const focus = await target.evaluate((element) => {
      const style = getComputedStyle(element);
      return { color: style.outlineColor, offset: style.outlineOffset, style: style.outlineStyle, width: style.outlineWidth };
    });
    assert.deepEqual(focus, { color: "rgb(198, 0, 62)", offset: "2px", style: "solid", width: "3px" });
    assert.notEqual(focus.color, "rgb(255, 191, 65)");
    const targetBox = await requiredBox(target, "focused Explore tab");
    const previousBox = await requiredBox(state.page.getByTestId("bottom-tab-index"), "previous Home tab");
    const nextBox = await requiredBox(state.page.getByTestId("bottom-tab-favorites"), "next Favorites tab");
    const ringInset = Number.parseFloat(focus.width) + Number.parseFloat(focus.offset);
    assert.ok(targetBox.x - ringInset >= 0, "focus ring is clipped on the left");
    assert.ok(targetBox.x + targetBox.width + ringInset <= viewport.width, "focus ring is clipped on the right");
    assert.ok(previousBox.x + previousBox.width <= targetBox.x - ringInset, "focus ring overlaps Home tab");
    assert.ok(targetBox.x + targetBox.width + ringInset <= nextBox.x, "focus ring overlaps Favorites tab");
    await captureStableScreenshot(state.page, "focus-keyboard");
    await assertPageHealthy(state.page, state.issues);
  } finally {
    await state.context.close();
  }
}

async function verifyReducedMotion() {
  const state = await createPage({ mode: "light", reducedMotion: "reduce" });
  try {
    await state.page.goto(appUrl, { waitUntil: "domcontentloaded" });
    await state.page.getByTestId("featured-business-loaded").waitFor();
    assert.equal(await state.page.evaluate(() => matchMedia("(prefers-reduced-motion: reduce)").matches), true);
    const target = state.page.getByTestId("bottom-tab-favorites");
    const box = await requiredBox(target, "favorites tab");
    await state.page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await state.page.mouse.down();
    await state.page.waitForTimeout(30);
    const transform = await target.evaluate((element) => getComputedStyle(element).transform);
    assert.ok(transform === "none" || transform === "matrix(1, 0, 0, 1, 0, 0)", `reduced press transformed: ${transform}`);
    await captureStableScreenshot(state.page, "reduced-motion-pressed");
    await state.page.mouse.up();
    await state.page.waitForTimeout(50);
    if (new URL(state.page.url()).pathname !== "/favorites") await target.click();
    await state.page.waitForFunction(() => window.location.pathname === "/favorites");
    const selected = await requiredBox(state.page.getByTestId("bottom-tab-favorites"), "selected favorites tab");
    await state.page.waitForTimeout(30);
    const settled = await requiredBox(state.page.getByTestId("bottom-tab-favorites"), "settled favorites tab");
    assert.ok(Math.abs(selected.width - settled.width) <= 0.1, "reduced selection kept animating");
    const reducedMotionWarnings = state.issues.filter((issue) => issue.includes("[Reanimated] Reduced motion setting is enabled"));
    assert.equal(reducedMotionWarnings.length, 1, "expected one Reanimated reduced-motion development warning");
    state.issues.splice(state.issues.indexOf(reducedMotionWarnings[0]), 1);
    await assertPageHealthy(state.page, state.issues);
  } finally {
    await state.context.close();
  }
}

async function verifyFontScale() {
  for (const fontScale of [1.6, 2]) {
    const state = await createPage({ mode: "light" });
    try {
      await state.page.goto(`${appUrl}/account?task8FontScale=${fontScale}`, { waitUntil: "domcontentloaded" });
      await state.page.getByText("task8@example.test", { exact: true }).waitFor();
      const summaryItems = await Promise.all(["Adres", "Sipariş", "Rezervasyon"].map((label) => (
        requiredBox(state.page.getByTestId(`account-summary-${label}`), label)
      )));
      const summaryState = await state.page.getByTestId("account-summary").evaluate((element) => ({
        direction: getComputedStyle(element).flexDirection,
        search: location.search
      }));
      assert.ok(
        summaryItems[1].y > summaryItems[0].y,
        `${fontScale} summary did not stack: ${JSON.stringify({ summaryItems, summaryState })}`
      );
      assert.ok(summaryItems[2].y > summaryItems[1].y, `${fontScale} summary did not remain stacked`);
      const profileSection = state.page.getByRole("button", { name: /Kişisel bilgiler/ });
      assert.equal(await profileSection.getAttribute("aria-expanded"), "false");
      await profileSection.click();
      assert.equal(await profileSection.getAttribute("aria-expanded"), "true");
      await emulateBrowserFontScale(state.page, fontScale);
      await state.page.waitForTimeout(250);
      for (const input of await state.page.locator("input, textarea").all()) {
        const box = await requiredBox(input, "account input");
        assert.ok(box.height >= 44, `${fontScale} account input is below 44px`);
      }
      assert.ok(
        await state.page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
        `${fontScale} account introduced horizontal page overflow`
      );
      await assertTabLabelGeometry(state.page, "account", true, `${fontScale} account active tab`);
      await captureStableScreenshot(state.page, `font-scale-${String(fontScale).replace(".", "-")}`);
      await assertPageHealthy(state.page, state.issues);
    } finally {
      await state.context.close();
    }
  }

  for (const surface of ["favorites", "explore"]) {
    const state = await createPage({ favorites: ["task7-business", "task7-list-1"], mode: "light" });
    try {
      await state.page.goto(`${appUrl}/${surface}?task8FontScale=2`, { waitUntil: "domcontentloaded" });
      if (surface === "favorites") await state.page.getByTestId("favorites-list").waitFor();
      if (surface === "explore") await state.page.getByTestId("city-hero-loaded").waitFor();
      await emulateBrowserFontScale(state.page, 2);
      await state.page.waitForTimeout(250);
      const title = state.page.getByTestId(`${surface}-title`);
      const subtitle = state.page.getByTestId(surface === "favorites" ? "favorites-count" : "explore-subtitle");
      await assertTextNotClipped(title, `${surface} 200% title`);
      await assertTextNotClipped(subtitle, `${surface} 200% subtitle`);
      await assertVerticalOrder(title, subtitle, `${surface} 200% heading`);
      assert.ok(
        await state.page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
        `${surface} 200% introduced horizontal page overflow`
      );
      await assertTabLabelGeometry(state.page, surface, true, `${surface} 200% active tab`);
      await captureStableScreenshot(state.page, `font-scale-2-${surface}`);
      await assertPageHealthy(state.page, state.issues);
    } finally {
      await state.context.close();
    }
  }
}

async function emulateBrowserFontScale(page, fontScale) {
  await page.evaluate((scale) => {
    for (const element of document.querySelectorAll("div, input, textarea")) {
      const style = getComputedStyle(element);
      const fontSize = Number.parseFloat(style.fontSize);
      const lineHeight = Number.parseFloat(style.lineHeight);
      if (fontSize > 0) element.style.fontSize = `${fontSize * scale}px`;
      if (lineHeight > 0) element.style.lineHeight = `${lineHeight * scale}px`;
    }
  }, fontScale);
}

async function verifySparseAndGroupedStates() {
  for (const mode of ["light", "dark"]) {
    const sparseFavorites = await openSurface("favorites", { favorites: [], mode });
    try {
      const countText = await sparseFavorites.page.getByTestId("favorites-count").textContent();
      assert.equal(
        countText,
        "0 kayıtlı işletme",
        `sparse favorites count mismatch: ${await sparseFavorites.page.locator("body").innerText()}`
      );
      await sparseFavorites.page.waitForTimeout(250);
      const sparseBody = await sparseFavorites.page.locator("body").innerText();
      assert.match(sparseBody, /Henüz favorin yok/, `empty favorite row did not render: ${sparseBody}`);
      assert.ok(await sparseFavorites.page.getByRole("button", { name: /işletmesini aç/ }).count() <= 3);
      await captureStableScreenshot(sparseFavorites.page, `${mode}-favorites-sparse`);
      await assertPageHealthy(sparseFavorites.page, sparseFavorites.issues);
    } finally {
      await sparseFavorites.context.close();
    }

    const groupedFavorites = await openSurface("favorites", {
      favorites: ["task7-business", "task7-list-1", "task7-list-2", "task7-list-3", "task7-list-4", "task7-list-5", "task7-list-6"],
      mode
    });
    try {
      await groupedFavorites.page.getByText("7 kayıtlı işletme", { exact: true }).waitFor();
      for (const heading of ["Kahve Shop", "Klinik & Sağlık", "Diğer"]) {
        await groupedFavorites.page.getByText(heading, { exact: true }).waitFor();
      }
      assert.equal(await groupedFavorites.page.getByText("Keşfetmeye devam et", { exact: true }).count(), 0);
      await captureStableScreenshot(groupedFavorites.page, `${mode}-favorites-grouped`);
      await assertPageHealthy(groupedFavorites.page, groupedFavorites.issues);
    } finally {
      await groupedFavorites.context.close();
    }
  }

  await setFixtureScenario("sparse");
  for (const mode of ["light", "dark"]) {
    const state = await openSurface("explore", { mode });
    try {
      await state.page.getByText("Keşif seçkisi hazırlanıyor", { exact: true }).waitFor();
      assert.equal(await state.page.getByTestId("explore-guide-section").count(), 0);
      assert.equal(await state.page.getByText("Yerel profiller", { exact: true }).count(), 0);
      await captureStableScreenshot(state.page, `${mode}-explore-sparse`);
      await assertPageHealthy(state.page, state.issues);
    } finally {
      await state.context.close();
    }
  }
  await setFixtureScenario("default");
}

async function openSurface(surface, options) {
  const state = await createPage(options);
  const page = state.page;
  const path = surface === "home" ? "/"
    : surface === "account-signed-out" ? "/account?task8Auth=signed-out"
    : surface === "profile" || ["menu", "product-modal", "checkout"].includes(surface) ? "/business/task5-fixture"
      : `/${surface}`;
  await page.goto(`${appUrl}${path}`, { waitUntil: "domcontentloaded" });

  if (surface === "home") await page.getByTestId("featured-business-loaded").waitFor();
  if (surface === "explore") await page.getByTestId("city-hero-loaded").waitFor();
  if (surface === "favorites") await page.getByTestId("favorites-list").waitFor();
  if (surface === "account") await page.getByText("task8@example.test", { exact: true }).waitFor();
  if (surface === "account-signed-out") await page.getByText("Hesabına giriş yap", { exact: true }).waitFor();
  if (surface === "profile") await page.getByTestId("business-profile-primary-action").waitFor();
  if (["menu", "product-modal", "checkout"].includes(surface)) {
    await page.getByTestId("business-profile-primary-action").click();
    await page.getByTestId("food-menu-panel").waitFor();
  }
  if (surface === "product-modal") {
    await page.getByRole("button", { name: /Test Ürünü 2/ }).click();
    await page.getByTestId("food-product-modal-backdrop").waitFor();
  }
  if (surface === "checkout") {
    await page.getByRole("button", { name: /Büyük Karışık Menü/ }).click();
    await page.getByRole("button", { name: "Sepete git", exact: true }).click();
    await page.getByTestId("food-order-form-scroll").waitFor();
  }
  return state;
}

async function createPage({ favorites = [], mode = "light", reducedMotion = "no-preference", viewport: pageViewport = viewport } = {}) {
  const context = await browser.newContext({ colorScheme: mode, reducedMotion, viewport: pageViewport });
  await context.addInitScript(({ favoriteSlugs, themeMode }) => {
    localStorage.setItem("tikprofil.themeMode", themeMode);
    localStorage.setItem("tikprofil:v2:discovery", JSON.stringify({
      favoriteSlugs,
      lastSelectedCity: null,
      recentSearches: [],
      savedAddressLabel: null
    }));
  }, { favoriteSlugs: favorites, themeMode: mode });
  await context.route("**/*", (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (request.resourceType() === "image" && !["127.0.0.1", "localhost"].includes(url.hostname)) {
      return route.fulfill({
        body: '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><rect width="64" height="64" fill="#e8e8ec"/></svg>',
        contentType: "image/svg+xml",
        status: 200
      });
    }
    return route.continue();
  });
  const page = await context.newPage();
  const issues = monitorPage(page);
  return { context, issues, page };
}

async function assertTheme(page, mode) {
  const expected = mode === "dark" ? "rgb(7, 18, 15)" : "rgb(250, 250, 250)";
  await page.waitForFunction((background) => (
    [...document.querySelectorAll("div")].some((element) => getComputedStyle(element).backgroundColor === background)
  ), expected);
}

async function assertSurfaceGeometry(page, surface) {
  await page.waitForTimeout(250);
  assert.ok(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    `${surface} introduced horizontal document overflow`
  );
  const activeRoute = surface === "explore" ? "explore"
    : surface === "favorites" ? "favorites"
      : surface === "account" || surface === "account-signed-out" ? "account"
        : "index";
  await assertTabLabelGeometry(page, activeRoute, true, `${surface} active tab`);

  if (surface === "favorites") {
    const title = page.getByTestId("favorites-title");
    const count = page.getByTestId("favorites-count");
    await assertTextNotClipped(title, "favorites title");
    await assertTextNotClipped(count, "favorites count");
    await assertVerticalOrder(title, count, "favorites heading");
  }
  if (surface === "explore") {
    const title = page.getByTestId("explore-title");
    const subtitle = page.getByTestId("explore-subtitle");
    await assertTextNotClipped(title, "explore title");
    await assertTextNotClipped(subtitle, "explore subtitle");
    await assertVerticalOrder(title, subtitle, "explore heading");
  }
  if (surface === "account") {
    const summaryBoxes = await Promise.all(["Adres", "Sipariş", "Rezervasyon"].map((label) => (
      requiredBox(page.getByTestId(`account-summary-${label}`), `account ${label}`)
    )));
    for (let left = 0; left < summaryBoxes.length; left += 1) {
      for (let right = left + 1; right < summaryBoxes.length; right += 1) {
        assert.equal(boxesOverlap(summaryBoxes[left], summaryBoxes[right]), false, `account summary ${left}/${right} overlaps`);
      }
    }
  }
}

async function captureStableScreenshot(page, label) {
  await page.evaluate(() => document.fonts?.ready);
  await page.waitForTimeout(250);
  const options = { animations: "disabled", caret: "hide", fullPage: false };
  if (process.env.TASK8_INJECT_VISUAL_DRIFT === "1" && label === "light-home") {
    await page.evaluate(() => {
      const drift = document.createElement("div");
      drift.dataset.task8VisualDrift = "1";
      Object.assign(drift.style, {
        background: "#00ffff",
        height: "64px",
        left: "0",
        pointerEvents: "none",
        position: "fixed",
        top: "0",
        width: "64px",
        zIndex: "2147483647"
      });
      document.body.appendChild(drift);
    });
  }
  const first = await page.screenshot(options);
  await page.waitForTimeout(60);
  const second = await page.screenshot(options);
  const width = first.readUInt32BE(16);
  const height = first.readUInt32BE(20);
  assert.deepEqual(
    { height: second.readUInt32BE(20), width: second.readUInt32BE(16) },
    { height, width },
    `${label} screenshot geometry changed without interaction`
  );
  const settled = comparePngBuffers(first, second, { channelThreshold: 8 });
  assert.ok(settled.changedPixelRatio <= 0.0005, `${label} pixels did not settle: ${JSON.stringify(settled)}`);
  assert.ok(settled.meanChannelDelta <= 0.1, `${label} channel delta did not settle: ${JSON.stringify(settled)}`);
  const size = page.viewportSize();
  assert.deepEqual({ height, width }, size, `${label} screenshot dimensions changed`);
  assert.ok(first.length > 4_000, `${label} screenshot is unexpectedly blank`);

  const baselinePath = join(baselineRoot, `${label}.png`);
  if (updateVisualBaselines) {
    mkdirSync(baselineRoot, { recursive: true });
    writeFileSync(baselinePath, first);
  } else {
    assert.ok(existsSync(baselinePath), `missing visual baseline: ${baselinePath}`);
    const baseline = readFileSync(baselinePath);
    const comparison = comparePngBuffers(baseline, first, { channelThreshold: visualThreshold.channelThreshold });
    if (
      comparison.changedPixelRatio > visualThreshold.maxChangedPixelRatio
      || comparison.meanChannelDelta > visualThreshold.maxMeanChannelDelta
    ) {
      mkdirSync(diffRoot, { recursive: true });
      writeFileSync(join(diffRoot, `${label}-actual.png`), first);
      writeFileSync(
        join(diffRoot, `${label}-diff.png`),
        createDiffPngBuffer(baseline, first, { channelThreshold: visualThreshold.channelThreshold })
      );
      assert.fail(`visual drift for ${label}: ${JSON.stringify(comparison)}; artifacts: ${diffRoot}`);
    }
  }

  screenshotCases.push(`${label} ${width}x${height} ${createHash("sha256").update(first).digest("hex").slice(0, 12)}`);
}

async function setFixtureScenario(name) {
  const response = await fetch(`${fixtureUrl}/_task8/scenario?name=${name}`, { method: "POST" });
  assert.equal(response.status, 204, `fixture scenario ${name} failed`);
}

async function requiredBox(locator, label) {
  const box = await locator.boundingBox();
  assert.ok(box, `${label} did not render`);
  return box;
}

async function assertTabLabelGeometry(page, route, active, label) {
  const locator = page.getByTestId(`bottom-tab-label-${route}`);
  const geometry = await locator.evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      clientWidth: element.clientWidth,
      marginLeft: Number.parseFloat(style.marginLeft),
      opacity: Number.parseFloat(style.opacity),
      rectWidth: element.getBoundingClientRect().width,
      scrollWidth: element.scrollWidth
    };
  });
  if (active) {
    assert.ok(geometry.rectWidth > 0, `${label} active label has no width`);
    assert.ok(geometry.opacity >= 0.99, `${label} active label is not opaque`);
    assert.equal(geometry.marginLeft, 6, `${label} active label margin changed`);
    assert.ok(geometry.scrollWidth <= geometry.clientWidth + 1, `${label} active label is clipped`);
  } else {
    assert.ok(geometry.rectWidth <= 0.5, `${label} inactive label consumes width`);
    assert.ok(geometry.opacity <= 0.01, `${label} inactive label is visible`);
    assert.equal(geometry.marginLeft, 0, `${label} inactive label consumes margin`);
  }
}

async function assertTextNotClipped(locator, label) {
  const geometry = await locator.evaluate((element) => ({
    clientHeight: element.clientHeight,
    clientWidth: element.clientWidth,
    scrollHeight: element.scrollHeight,
    scrollWidth: element.scrollWidth
  }));
  assert.ok(geometry.scrollWidth <= geometry.clientWidth + 1, `${label} clips horizontally: ${JSON.stringify(geometry)}`);
  assert.ok(geometry.scrollHeight <= geometry.clientHeight + 4, `${label} clips vertically: ${JSON.stringify(geometry)}`);
}

async function assertVerticalOrder(first, second, label) {
  const firstBox = await requiredBox(first, `${label} first`);
  const secondBox = await requiredBox(second, `${label} second`);
  assert.ok(firstBox.y + firstBox.height <= secondBox.y + 0.5, `${label} overlaps`);
}

function boxesOverlap(first, second) {
  return first.x < second.x + second.width
    && first.x + first.width > second.x
    && first.y < second.y + second.height
    && first.y + first.height > second.y;
}

function monitorPage(page) {
  const issues = [];
  page.on("console", (message) => {
    if (message.type() === "warning" || message.type() === "error") issues.push(`console.${message.type()}: ${message.text()}`);
  });
  page.on("pageerror", (error) => issues.push(`pageerror: ${error.message}`));
  return issues;
}

async function assertPageHealthy(page, issues) {
  const overlayCount = await page.locator([
    "[data-nextjs-dialog-overlay]", "[data-error-overlay]", "[data-expo-error-overlay]", "#webpack-dev-server-client-overlay"
  ].join(",")).count();
  assert.equal(overlayCount, 0, "framework error overlay rendered");
  assert.deepEqual(issues, [], `unexpected browser issues:\n${issues.join("\n")}`);
}
