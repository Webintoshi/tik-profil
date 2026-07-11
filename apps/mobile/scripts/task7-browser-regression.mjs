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
    EXPO_PUBLIC_DISABLE_LOCAL_DISCOVERY_BOOTSTRAP: "1",
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
  if (!focus || focus === "checkout") await verifyCheckoutScrollOwnership(browser);
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
    const homePairs = [
      ["category-grid-skeleton", "category-grid-loaded", "category"],
      ["featured-business-skeleton", "featured-business-loaded", "hero"],
      ["dense-business-skeleton", "dense-business-loaded", "dense row"]
    ];
    await page.getByTestId(homePairs[0][0]).waitFor();
    const skeletonBoxes = {};
    for (const [skeletonId, , label] of homePairs) {
      skeletonBoxes[label] = await requiredScrollableBox(page.getByTestId(skeletonId).first(), `${label} skeleton`);
    }
    for (const [, loadedId] of homePairs) await page.getByTestId(loadedId).first().waitFor();
    for (const [, loadedId, label] of homePairs) {
      const loadedBox = await requiredScrollableBox(page.getByTestId(loadedId).first(), `${label} loaded`);
      assertMatchingBox(loadedBox, skeletonBoxes[label], 1, `${viewport.width} ${label}`);
    }

    const profilePage = await browserInstance.newPage({ viewport });
    const profileIssues = monitorPage(profilePage);
    await profilePage.goto(appUrl, { waitUntil: "domcontentloaded" });
    const profileCard = profilePage.getByRole("button", { name: /Task 7 Test İşletmesi/ }).first();
    await profileCard.waitFor();
    await profileCard.click();
    const profileSkeleton = await requiredBox(profilePage.getByTestId("business-profile-skeleton-cover"), "profile skeleton cover");
    await profilePage.getByTestId("business-profile-cover").waitFor();
    const profileLoaded = await requiredBox(profilePage.getByTestId("business-profile-cover"), "profile loaded cover");
    assertMatchingBox(profileLoaded, profileSkeleton, 1, `${viewport.width} profile`);
    await assertPageHealthy(profilePage, profileIssues);
    await profilePage.close();
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
    await page.getByTestId("bottom-tab-bar").getByRole("tab", { name: "Keşfet", exact: true }).click();
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
    const mountedRowBound = Math.ceil(initialMetrics.clientHeight / 68) + 10;
    const mountedChildBound = mountedRowBound * 24;
    assert.ok(initialRows <= mountedRowBound, `FlashList initially mounted ${initialRows}, bound ${mountedRowBound}: ${JSON.stringify(initialMetrics)}`);
    assert.ok(initialMetrics.childCount <= mountedChildBound, `FlashList initially mounted ${initialMetrics.childCount} children, bound ${mountedChildBound}`);
    const firstPixel = await sampleImageCenterPixel(page.getByTestId("food-product-image-task7-product-1"));
    assert.deepEqual(firstPixel, task7ProductColor(1), "first product image pixels do not match its fixture");

    await list.evaluate((element) => { element.scrollTop = element.scrollHeight; });
    const finalText = page.getByText("Task 7 Ürünü 200", { exact: true });
    await finalText.waitFor();
    assert.equal(await finalText.innerText(), "Task 7 Ürünü 200");
    const postRows = await page.getByText(/Task 7 Ürünü \d+/, { exact: true }).count();
    const postMetrics = await list.evaluate((element) => ({
      childCount: element.querySelectorAll("*").length,
      clientHeight: element.clientHeight,
      scrollHeight: element.scrollHeight,
      scrollTop: element.scrollTop
    }));
    assert.ok(postRows <= mountedRowBound, `FlashList mounted ${postRows} rows after scroll, bound ${mountedRowBound}: ${JSON.stringify(postMetrics)}`);
    assert.ok(postMetrics.childCount <= mountedChildBound, `FlashList mounted ${postMetrics.childCount} children after scroll, bound ${mountedChildBound}`);
    const finalPixel = await sampleImageCenterPixel(page.getByTestId("food-product-image-task7-product-200"));
    assert.deepEqual(finalPixel, task7ProductColor(200), "final recycled product retained the wrong image pixels");
    assert.notDeepEqual(finalPixel, firstPixel, "distinct fixture images recycled to the same color");
    process.stdout.write(`Task 7 200-product list: rows ${initialRows}->${postRows}/${mountedRowBound}, children ${initialMetrics.childCount}->${postMetrics.childCount}/${mountedChildBound}, RGB ${firstPixel.join(",")}->${finalPixel.join(",")}.\n`);
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

async function sampleImageCenterPixel(locator) {
  await locator.waitFor();
  return locator.evaluate(async (element) => {
    const image = element instanceof HTMLImageElement ? element : element.querySelector("img");
    if (!image) throw new Error("recycled image element was not rendered");
    if (!image.complete) await image.decode();
    const canvas = document.createElement("canvas");
    canvas.width = 3;
    canvas.height = 3;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) throw new Error("2D canvas is unavailable");
    context.drawImage(image, 0, 0, 3, 3);
    return [...context.getImageData(1, 1, 1, 1).data.slice(0, 3)];
  });
}

function task7ProductColor(itemNumber) {
  return [
    32 + (itemNumber * 37) % 192,
    32 + (itemNumber * 67) % 192,
    32 + (itemNumber * 97) % 192
  ];
}

async function verifyCheckoutScrollOwnership(browserInstance) {
  const viewport = { width: 360, height: 640 };
  const page = await browserInstance.newPage({ viewport });
  const issues = monitorPage(page);
  try {
    await page.goto(`${appUrl}/business/task5-fixture`, { waitUntil: "domcontentloaded" });
    await page.getByTestId("business-profile-primary-action").click();
    await page.getByTestId("food-menu-scroll").waitFor();
    const foodProducts = ["Büyük Karışık Menü", "Test Ürünü 3", "Test Ürünü 4", "Test Ürünü 5", "Test Ürünü 6"];
    for (const product of foodProducts) await page.getByRole("button", { name: new RegExp(product) }).click();
    await page.getByRole("button", { name: "Sepete git", exact: true }).click();
    await page.getByLabel("Yeni adres", { exact: true }).fill("Task 7 address");
    await page.getByLabel("Ad Soyad", { exact: true }).fill("Task 7 User");
    await page.getByLabel("Telefon", { exact: true }).fill("05551112233");
    await assertCheckoutReachability(page, "food-order-form-scroll", "food-notes-input", "food-checkout-footer", viewport.height);
    await page.getByRole("button", { name: /Özeti Gör/ }).click();
    for (const product of foodProducts) await page.getByText(new RegExp(`1 x ${product}`)).waitFor();
    await assertCheckoutReachability(page, "food-order-confirm-scroll", "food-confirm-last-row", "food-checkout-footer", viewport.height);
    await page.getByRole("button", { name: /Siparişi Onayla/ }).waitFor();

    await page.goto(`${appUrl}/business/task7-ecommerce`, { waitUntil: "domcontentloaded" });
    await page.getByTestId("business-profile-primary-action").click();
    await page.getByTestId("ecommerce-product-list").waitFor();
    const ecommerceProducts = Array.from({ length: 6 }, (_, index) => `Ecommerce Product ${index + 1}`);
    for (const _product of ecommerceProducts) {
      await page.getByRole("button", { name: "Sepete ekle", exact: true }).first().click();
    }
    await page.getByRole("button", { name: /Sepete Git/ }).first().click();
    await page.getByPlaceholder("Ad Soyad", { exact: true }).fill("Task 7 User");
    await page.getByPlaceholder("Telefon", { exact: true }).fill("05551112233");
    await page.getByPlaceholder("Adres", { exact: true }).fill("Task 7 ecommerce address");
    await assertCheckoutReachability(page, "ecommerce-info-scroll", "ecommerce-coupon-input", "ecommerce-checkout-footer", viewport.height);
    await page.getByRole("button", { name: /Özeti Gör/ }).click();
    for (const product of ecommerceProducts) await page.getByText(`1 x ${product}`, { exact: true }).waitFor();
    await assertCheckoutReachability(page, "ecommerce-confirm-scroll", "ecommerce-confirm-last-row", "ecommerce-checkout-footer", viewport.height);
    await page.getByRole("button", { name: /Siparişi Tamamla/ }).waitFor();
    await assertPageHealthy(page, issues);
  } finally {
    await page.close();
  }
}

async function assertCheckoutReachability(page, scrollId, lastContentId, footerId, viewportHeight) {
  const scroll = page.getByTestId(scrollId);
  await scroll.waitFor();
  const metrics = await scroll.evaluate((element) => {
    element.scrollTop = element.scrollHeight;
    return {
      clientHeight: element.clientHeight,
      overflowY: getComputedStyle(element).overflowY,
      scrollHeight: element.scrollHeight,
      scrollTop: element.scrollTop
    };
  });
  await page.waitForTimeout(50);
  assert.ok(metrics.clientHeight > 0 && metrics.clientHeight < viewportHeight, `${scrollId} is not viewport bounded: ${JSON.stringify(metrics)}`);
  assert.ok(["auto", "scroll"].includes(metrics.overflowY), `${scrollId} does not own vertical scrolling: ${JSON.stringify(metrics)}`);
  assert.ok(metrics.scrollHeight > metrics.clientHeight + 1, `${scrollId} fixture did not create real overflow: ${JSON.stringify(metrics)}`);
  assert.ok(metrics.scrollTop > 0, `${scrollId} did not produce a positive scroll offset: ${JSON.stringify(metrics)}`);
  const lastBox = await requiredBox(page.getByTestId(lastContentId), lastContentId);
  const footerBox = await requiredBox(page.getByTestId(footerId), footerId);
  const tabBarBox = await requiredBox(page.getByTestId("bottom-tab-bar"), "bottom tab bar");
  assert.ok(lastBox.y + lastBox.height <= footerBox.y + 1, `${lastContentId} is hidden behind ${footerId}`);
  assert.ok(footerBox.y + footerBox.height <= viewportHeight + 1, `${footerId} is below the ${viewportHeight}px viewport`);
  assert.ok(footerBox.y + footerBox.height <= tabBarBox.y + 1, `${footerId} overlaps the bottom tab bar`);
}

async function boxes(page, ids) {
  const result = {};
  for (const id of ids) result[id] = await requiredBox(page.getByTestId(id), id);
  return result;
}

async function requiredBox(locator, label) {
  const box = await locator.evaluate((element) => new Promise((resolve) => {
    const deadline = performance.now() + 4_000;
    const measure = () => {
      const rect = element.getBoundingClientRect();
      if ((rect.width > 0 && rect.height > 0) || performance.now() >= deadline) {
        resolve({ height: rect.height, width: rect.width, x: rect.x, y: rect.y });
        return;
      }
      requestAnimationFrame(measure);
    };
    measure();
  }));
  assert.ok(box.width > 0 && box.height > 0, `${label} has no box: ${JSON.stringify(box)}`);
  return box;
}

async function requiredScrollableBox(locator, label) {
  await locator.evaluate((element) => element.scrollIntoView({ block: "center" }));
  await locator.page().waitForTimeout(80);
  const box = await locator.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    let owner = element.parentElement;
    while (owner && owner !== document.body) {
      const style = getComputedStyle(owner);
      if (owner.scrollHeight > owner.clientHeight && ["auto", "scroll"].includes(style.overflowY)) break;
      owner = owner.parentElement;
    }
    const ownerRect = owner?.getBoundingClientRect() ?? { x: 0, y: 0 };
    return {
      height: rect.height,
      width: rect.width,
      x: rect.x - ownerRect.x + (owner?.scrollLeft ?? window.scrollX),
      y: rect.y - ownerRect.y + (owner?.scrollTop ?? window.scrollY)
    };
  });
  assert.ok(box.width > 0 && box.height > 0, `${label} has no scroll-content box: ${JSON.stringify(box)}`);
  return box;
}

function assertWithin(actual, expected, delta, message) {
  assert.ok(Math.abs(actual - expected) <= delta, `${message}: ${actual} vs ${expected}`);
}

function assertMatchingBox(actual, expected, delta, label) {
  for (const field of ["x", "y", "width", "height"]) {
    assertWithin(actual[field], expected[field], delta, `${label} ${field} shifted`);
  }
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
