import assert from "node:assert/strict";
import process from "node:process";

import { chromium } from "playwright";
import { cleanupBrowserTestProcesses, getFreePort, spawnManagedNode, waitForUrl } from "./browser-test-processes.mjs";

const fixturePort = await getFreePort();
const expoPort = await getFreePort();
const fixtureUrl = `http://127.0.0.1:${fixturePort}`;
const appUrl = `http://127.0.0.1:${expoPort}`;
const children = [];
let browser;

try {
  children.push(spawnManagedNode(["scripts/task5-fixture-server.mjs"], {
    TASK5_FIXTURE_PORT: String(fixturePort),
    TASK7_RESPONSE_DELAY_MS: "2000"
  }));
  children.push(spawnManagedNode(["node_modules/expo/bin/cli", "start", "--web", "--port", String(expoPort)], {
    CI: "1",
    EXPO_PUBLIC_TIKPROFIL_API_URL: fixtureUrl
  }));

  await waitForUrl(`${fixtureUrl}/_task7/counts`, 30_000);
  await waitForUrl(`${appUrl}/`, 120_000);
  browser = await chromium.launch({ headless: true });

  const focus = process.env.TASK7_BROWSER_FOCUS;
  if (!focus || focus === "geometry") {
    for (const viewport of [{ width: 360, height: 800 }, { width: 390, height: 844 }, { width: 430, height: 932 }]) {
      await verifyStableGeometry(browser, viewport);
      process.stdout.write(`Task 7 geometry passed at ${viewport.width}x${viewport.height}.\n`);
    }
  }
  if (!focus || focus === "request") await verifyRequestDedupeAndWarnings(browser);
  if (!focus || focus === "profile") await verifyWarmProfile(browser);
  if (!focus || focus === "list") await verifyTwoHundredProductList(browser);
  process.stdout.write("Task 7 rendered request/layout/list/warning regression passed.\n");
} finally {
  await browser?.close();
  await cleanupBrowserTestProcesses(children, [fixturePort, expoPort]);
}

async function verifyStableGeometry(browserInstance, viewport) {
  await resetCounts();
  const page = await browserInstance.newPage({ viewport });
  const issues = monitorPage(page);
  try {
    await page.goto(appUrl, { waitUntil: "domcontentloaded" });
    const targets = ["home-category-section", "featured-business-loaded", "home-business-list-section"];
    await page.getByTestId(targets[0]).waitFor();
    await page.waitForTimeout(600);
    const before = await boxes(page, targets);
    await page.waitForTimeout(1800);
    const after = await boxes(page, targets);
    for (const id of targets) {
      assertWithin(after[id].y, before[id].y, 1, `${viewport.width} ${id} y shifted`);
      assertWithin(after[id].height, before[id].height, 1, `${viewport.width} ${id} height shifted`);
    }
    await assertPageHealthy(page, issues);
  } finally {
    await page.close();
  }
}

async function verifyRequestDedupeAndWarnings(browserInstance) {
  await resetCounts();
  const page = await browserInstance.newPage({ viewport: { width: 390, height: 844 } });
  const issues = monitorPage(page);
  try {
    await page.goto(appUrl, { waitUntil: "domcontentloaded" });
    await page.getByTestId("featured-business-loaded").waitFor();
    await page.waitForTimeout(600);
    await page.getByTestId("bottom-tab-bar").getByRole("button", { name: "Keşfet", exact: true }).click();
    await page.waitForURL(/\/explore$/);
    await page.getByTestId("city-hero-loaded").waitFor();
    await page.waitForTimeout(2200);

    const counts = await getCounts();
    assert.equal(findCount(counts, "/api/cities", "name=Ordu"), 1, "Ordu guide request was not shared");
    assert.equal(findCount(counts, "/api/kesfet", "city=Ordu&limit=16&page=1"), 1, "Ordu discovery request was not shared");
    assert.equal(findCount(counts, "/api/kesfet/categories", ""), 1, "categories request duplicated");
    process.stdout.write("Task 7 request counts: guide=1 discovery=1 categories=1.\n");
    assert.ok(issues.every((issue) => !issue.includes("useNativeDriver is not supported")), issues.join("\n"));
    await assertPageHealthy(page, issues);
  } finally {
    await page.close();
  }
}

async function verifyWarmProfile(browserInstance) {
  await resetCounts();
  const page = await browserInstance.newPage({ viewport: { width: 390, height: 844 } });
  const issues = monitorPage(page);
  try {
    await page.goto(appUrl, { waitUntil: "domcontentloaded" });
    const card = page.getByRole("button", { name: /Task 7 Test İşletmesi/ }).first();
    await card.waitFor();
    await card.click();
    await page.getByText("Task 7 Test İşletmesi", { exact: true }).first().waitFor();
    await page.getByRole("button", { name: "Geri dön", exact: true }).click();
    await card.waitFor();
    const startedAt = Date.now();
    await card.click();
    await page.getByText("Task 7 Test İşletmesi", { exact: true }).first().waitFor();
    const warmElapsedMs = Date.now() - startedAt;
    assert.ok(warmElapsedMs < 500, `warm profile took ${warmElapsedMs}ms`);
    const counts = await getCounts();
    assert.equal(findCount(counts, "/api/public/profile/task7-business", ""), 1, "warm profile issued a blocking GET");
    process.stdout.write(`Task 7 warm profile reopen: ${warmElapsedMs}ms, profile GETs=1.\n`);
    await assertPageHealthy(page, issues);
  } finally {
    await page.close();
  }
}

async function verifyTwoHundredProductList(browserInstance) {
  const page = await browserInstance.newPage({ viewport: { width: 390, height: 844 } });
  const issues = monitorPage(page);
  try {
    await page.goto(`${appUrl}/business/task7-200`, { waitUntil: "domcontentloaded" });
    await page.getByTestId("business-profile-primary-action").click();
    const list = page.getByTestId("food-menu-scroll");
    await list.waitFor();
    await page.getByText("Task 7 Ürünü 1", { exact: true }).waitFor();
    const initialRows = await page.getByText(/Task 7 Ürünü \d+/, { exact: true }).count();
    const initialMetrics = await list.evaluate((element) => ({
      childCount: element.querySelectorAll("*").length,
      clientHeight: element.clientHeight,
      overflowY: getComputedStyle(element).overflowY,
      scrollHeight: element.scrollHeight
    }));
    assertWithin(initialMetrics.clientHeight, Math.round(844 * 0.65), 1, "FlashList viewport height mismatch");
    assert.ok(initialRows < 60, `FlashList mounted ${initialRows} of 200 products initially: ${JSON.stringify(initialMetrics)}`);
    process.stdout.write(`Task 7 200-product list: initial mounted rows=${initialRows}, viewport=${initialMetrics.clientHeight}px.\n`);

    await list.evaluate((element) => { element.scrollTop = element.scrollHeight; });
    await page.getByText("Task 7 Ürünü 200", { exact: true }).waitFor();
    const lastImage = page.locator('img[src*="task7-image-200"]').first();
    await lastImage.waitFor();
    const beforeCategoryJump = await list.evaluate((element) => element.scrollTop);
    await page.getByRole("button", { name: /İkinci kategori/ }).click();
    await page.waitForTimeout(150);
    const afterCategoryJump = await list.evaluate((element) => element.scrollTop);
    assert.ok(afterCategoryJump < beforeCategoryJump, "category scrollToIndex did not move to its stable section index");
    await assertPageHealthy(page, issues);
  } finally {
    await page.close();
  }
}

async function boxes(page, ids) {
  const result = {};
  for (const id of ids) result[id] = await requiredBox(page.getByTestId(id), id);
  return result;
}

async function requiredBox(locator, label) {
  const box = await locator.boundingBox();
  assert.ok(box, `${label} has no box`);
  return box;
}

function assertWithin(actual, expected, delta, message) {
  assert.ok(Math.abs(actual - expected) <= delta, `${message}: ${actual} vs ${expected}`);
}

function findCount(counts, pathname, search) {
  return counts.find((item) => item.pathname === pathname && item.search === search)?.count ?? 0;
}

async function resetCounts() {
  const response = await fetch(`${fixtureUrl}/_task7/reset`, { method: "POST" });
  assert.equal(response.status, 204);
}

async function getCounts() {
  const response = await fetch(`${fixtureUrl}/_task7/counts`);
  assert.equal(response.status, 200);
  return response.json();
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
