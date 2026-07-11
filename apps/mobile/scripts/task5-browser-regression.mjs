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
    TASK5_FIXTURE_PORT: String(fixturePort)
  }));
  children.push(spawnManagedNode(["node_modules/expo/bin/cli", "start", "--web", "--port", String(expoPort)], {
    CI: "1",
    EXPO_PUBLIC_TIKPROFIL_API_URL: fixtureUrl
  }));

  await waitForUrl(`${fixtureUrl}/api/public/profile/task5-fixture`, 30_000);
  await waitForUrl(`${appUrl}/business/task5-fixture`, 120_000);
  browser = await chromium.launch({ headless: true });

  const viewports = [
    { width: 360, height: 800 },
    { width: 390, height: 844 },
    { width: 430, height: 932 }
  ];
  for (const viewport of viewports) {
    await verifyPrimaryLayout(browser, viewport);
    process.stdout.write(`Task 5 primary layout passed at ${viewport.width}x${viewport.height}.\n`);
    await verifyMenuStateMatrix(browser, viewport);
    process.stdout.write(`Task 5 menu state matrix passed at ${viewport.width}x${viewport.height}.\n`);
    await verifySuccessState(browser, viewport);
    process.stdout.write(`Task 5 success state passed at ${viewport.width}x${viewport.height}.\n`);
  }

  await verifyCheckoutTransitionsAndSuccess(browser, { width: 390, height: 844 });
  process.stdout.write("Task 5 checkout transitions and success passed.\n");
  process.stdout.write("Task 5 rendered browser regression passed.\n");
} finally {
  await browser?.close();
  await cleanupBrowserTestProcesses(children, [fixturePort, expoPort]);
}

async function verifyPrimaryLayout(browserInstance, viewport) {
  const page = await browserInstance.newPage({ viewport });
  const health = monitorPage(page);
  try {
    await openMenu(page, "task5-fixture");
    await assertCompactMenu(page, viewport.height);
    assert.equal(await page.getByTestId("sticky-cart-bar").count(), 0, `${viewport.width} normal empty cart rendered sticky`);

    const entranceSamplesPromise = sampleStickyEntrance(page);
    await page.getByRole("button", { name: /Büyük Karışık Menü/ }).click();
    const sticky = page.getByTestId("sticky-cart-bar");
    await sticky.waitFor();
    const entranceSamples = await entranceSamplesPromise;
    assert.ok(entranceSamples.length >= 5, `${viewport.width} entrance produced too few samples`);
    for (const sample of entranceSamples) {
      assert.ok(sample.stickyBottom <= sample.navY + 0.5, `${viewport.width} entrance sticky bottom ${sample.stickyBottom} crossed nav y ${sample.navY}`);
    }
    assert.match(await sticky.innerText(), /₺126(?:,00)?/);

    const stickyBox = await requiredBox(sticky, "sticky cart");
    const navBox = await requiredBox(page.getByTestId("bottom-tab-bar"), "bottom nav");
    assert.ok(stickyBox.y < viewport.height, `${viewport.width} sticky starts below viewport`);
    assert.ok(stickyBox.y + stickyBox.height <= navBox.y, `${viewport.width} sticky overlaps nav`);

    const initialStickyY = stickyBox.y;
    const menuScroll = page.getByTestId("food-menu-scroll");
    const innerOffsets = await changeScrollOffset(menuScroll, 420);
    assert.ok(innerOffsets.after - innerOffsets.before >= 100, `${viewport.width} inner scroll offset did not change meaningfully: ${JSON.stringify(innerOffsets)}`);
    assertWithin(await boxY(sticky), initialStickyY, 1, `${viewport.width} sticky moved after inner scroll`);

    assert.equal(await page.getByTestId("business-profile-scroll").count(), 0, `${viewport.width} nested outer scroll remained active`);
    assert.equal(await page.getByTestId("business-profile-static").count(), 1, `${viewport.width} static order-surface owner missing`);
    assertWithin(await boxY(sticky), initialStickyY, 1, `${viewport.width} sticky moved with the single list owner`);

    const endScroll = await menuScroll.evaluate((element) => {
      element.scrollTop = element.scrollHeight;
      return { clientHeight: element.clientHeight, scrollHeight: element.scrollHeight, scrollTop: element.scrollTop };
    });
    await page.waitForTimeout(50);
    const lastProduct = page.getByRole("button", { name: /Test Ürünü 14/ });
    const lastProductBox = await requiredBox(lastProduct, "last product");
    assert.ok(
      lastProductBox.y + lastProductBox.height <= initialStickyY,
      `${viewport.width} last product bottom ${lastProductBox.y + lastProductBox.height} exceeds sticky y ${initialStickyY}; scroll ${JSON.stringify(endScroll)}`
    );

    await page.getByRole("button", { name: /Büyük Karışık Menü/ }).click();
    assert.match(await sticky.innerText(), /2 ürün/);
    assert.match(await sticky.innerText(), /₺202(?:,00)?/);
    await page.getByRole("button", { name: "Adedi azalt", exact: true }).click();
    assert.match(await sticky.innerText(), /₺126(?:,00)?/);
    await assertPageHealthy(page, health);
  } finally {
    await page.close();
  }
}

async function verifyMenuStateMatrix(browserInstance, viewport) {
  for (const state of [
    { slug: "task5-fixture", text: "Büyük Karışık Menü" },
    { slug: "task5-loading", text: "Menü yükleniyor" },
    { slug: "task5-error", text: "Menü açılamadı" },
    { slug: "task5-empty", text: "Bu menüde ürün yok" },
    { slug: "task5-cart-disabled", text: "Büyük Karışık Menü" },
    { slug: "task5-restaurant", text: "Büyük Karışık Menü" }
  ]) {
    const page = await browserInstance.newPage({ viewport });
    const health = monitorPage(page);
    try {
      await openMenu(page, state.slug, state.slug === "task5-loading");
      await page.getByText(state.text, { exact: false }).waitFor();
      await assertCompactMenu(page, viewport.height);
      assert.equal(await page.getByTestId("sticky-cart-bar").count(), 0, `${state.slug} rendered sticky`);
      await assertPageHealthy(page, health);
    } finally {
      await page.close();
    }
  }
}

async function verifySuccessState(browserInstance, viewport) {
  const page = await browserInstance.newPage({ viewport });
  const health = monitorPage(page);
  try {
    await openMenu(page, "task5-fixture");
    await page.getByRole("button", { name: /Büyük Karışık Menü/ }).click();
    await page.getByRole("button", { name: "Sepete git", exact: true }).click();
    await page.getByRole("button", { name: /Mağaza teslim/ }).click();
    await page.getByLabel("Ad Soyad", { exact: true }).fill("Test Musteri");
    await page.getByLabel("Telefon", { exact: true }).fill("05551112233");
    await page.getByRole("button", { name: /Özeti Gör/ }).click();
    await page.getByRole("button", { name: /Siparişi Onayla/ }).click();
    await page.getByText("Siparişiniz alındı", { exact: true }).waitFor();
    assert.equal(await page.getByTestId("sticky-cart-bar").count(), 0, `${viewport.width} success rendered sticky`);
    await assertCompactMenu(page, viewport.height);
    await assertPageHealthy(page, health);
  } finally {
    await page.close();
  }
}

async function verifyCheckoutTransitionsAndSuccess(browserInstance, viewport) {
  const page = await browserInstance.newPage({ viewport });
  const health = monitorPage(page);
  try {
    await openMenu(page, "task5-fixture");
    await page.getByRole("button", { name: /Test Ürünü 2/ }).click();
    const closeButton = page.getByRole("button", { name: "Ürün detayını kapat", exact: true });
    await closeButton.last().waitFor();
    assert.equal(await closeButton.count(), 2);
    const backdrop = page.getByTestId("food-product-modal-backdrop");
    await expectAccessibleDismiss(backdrop);
    await closeButton.last().click();

    await page.getByRole("button", { name: /Büyük Karışık Menü/ }).click();
    const sticky = page.getByTestId("sticky-cart-bar");
    assert.match(await sticky.innerText(), /₺126(?:,00)?/);
    await page.getByRole("button", { name: "Sepete git", exact: true }).click();

    const footerTotal = page.getByTestId("food-checkout-footer-total");
    await page.getByRole("button", { name: /Mağaza teslim/ }).click();
    assert.match(await footerTotal.innerText(), /₺101(?:,00)?/);
    await page.getByRole("button", { name: /Adrese teslim/ }).click();
    assert.match(await footerTotal.innerText(), /₺126(?:,00)?/);

    await page.getByLabel("Yeni adres", { exact: true }).fill("Test adresi");
    await page.getByLabel("Ad Soyad", { exact: true }).fill("Test Musteri");
    await page.getByLabel("Telefon", { exact: true }).fill("05551112233");
    await page.getByLabel("Kupon kodu", { exact: true }).fill("TASK5");
    await page.getByRole("button", { name: "Uygula", exact: true }).click();
    assert.match(await waitForText(footerTotal, /₺116(?:,00)?/), /₺116(?:,00)?/);

    const formScroll = page.getByTestId("food-order-form-scroll");
    const formEndScroll = await formScroll.evaluate((element) => {
      element.scrollTop = element.scrollHeight;
      return { clientHeight: element.clientHeight, scrollHeight: element.scrollHeight, scrollTop: element.scrollTop };
    });
    await page.waitForTimeout(50);
    const notesBox = await requiredBox(page.getByTestId("food-notes-input"), "notes input");
    const footerBox = await requiredBox(page.getByTestId("food-checkout-footer"), "checkout footer");
    assert.ok(
      notesBox.y + notesBox.height <= footerBox.y,
      `last checkout field bottom ${notesBox.y + notesBox.height} exceeds footer y ${footerBox.y}; scroll ${JSON.stringify(formEndScroll)}`
    );

    await page.getByRole("button", { name: /Özeti Gör/ }).click();
    await page.getByRole("button", { name: /Siparişi Onayla/ }).click();
    await page.getByText("Siparişiniz alındı", { exact: true }).waitFor();
    assert.equal(await page.getByTestId("sticky-cart-bar").count(), 0, "success rendered sticky");
    await assertCompactMenu(page, viewport.height);
    await assertPageHealthy(page, health);
  } finally {
    await page.close();
  }
}

async function openMenu(page, slug, loadingOnly = false) {
  await page.goto(`${appUrl}/business/${slug}`, { waitUntil: "domcontentloaded" });
  await page.getByTestId("business-profile-primary-action").waitFor();
  await page.getByTestId("business-profile-primary-action").click();
  await page.getByTestId("food-menu-panel").waitFor();
  if (!loadingOnly) await page.waitForLoadState("networkidle");
}

async function assertCompactMenu(page, viewportHeight) {
  const panelBox = await requiredBox(page.getByTestId("food-menu-panel"), "food menu panel");
  assert.ok(panelBox.height >= Math.round(viewportHeight * 0.65), `panel height ${panelBox.height} is below 65vh`);
  assert.equal(await page.getByTestId("business-profile-compact-identity").count(), 1);
  assert.equal(await page.getByTestId("business-profile-cover").count(), 0);
  assert.equal(await page.getByTestId("business-profile-support-actions").count(), 0);
  assert.equal(await page.getByTestId("business-profile-primary-action").count(), 1);
  assert.equal(await page.getByTestId("bottom-tab-bar").count(), 1);
}

async function expectAccessibleDismiss(locator) {
  assert.equal(await locator.getAttribute("role"), "button");
  assert.equal(await locator.getAttribute("aria-label"), "Ürün detayını kapat");
}

async function requiredBox(locator, label) {
  const box = await locator.boundingBox();
  assert.ok(box, `${label} has no rendered rectangle`);
  return box;
}

async function sampleStickyEntrance(page) {
  return page.evaluate(async () => {
    const samples = [];
    const startedAt = performance.now();
    do {
      const sticky = document.querySelector('[data-testid="sticky-cart-bar"]');
      const nav = document.querySelector('[data-testid="bottom-tab-bar"]');
      if (sticky && nav) {
        const stickyRect = sticky.getBoundingClientRect();
        const navRect = nav.getBoundingClientRect();
        samples.push({ elapsed: performance.now() - startedAt, navY: navRect.y, stickyBottom: stickyRect.bottom });
      }
      await new Promise((resolve) => requestAnimationFrame(resolve));
    } while (performance.now() - startedAt <= 190);
    return samples;
  });
}

async function changeScrollOffset(locator, delta) {
  return locator.evaluate((element, change) => {
    const before = element.scrollTop;
    const maximum = Math.max(0, element.scrollHeight - element.clientHeight);
    element.scrollTop = Math.min(maximum, before + change);
    return { after: element.scrollTop, before, clientHeight: element.clientHeight, maximum, scrollHeight: element.scrollHeight };
  }, delta);
}

function monitorPage(page) {
  const issues = [];
  page.on("console", (message) => {
    if (message.type() === "warning" || message.type() === "error") {
      issues.push(`console.${message.type()}: ${message.text()}`);
    }
  });
  page.on("pageerror", (error) => issues.push(`pageerror: ${error.message}`));
  return issues;
}

async function assertPageHealthy(page, issues) {
  const overlayCount = await page.locator([
    "[data-nextjs-dialog-overlay]",
    "[data-error-overlay]",
    "[data-expo-error-overlay]",
    "#webpack-dev-server-client-overlay"
  ].join(",")).count();
  assert.equal(overlayCount, 0, "framework error overlay rendered");
  assert.deepEqual(issues, [], `unexpected browser issues:\n${issues.join("\n")}`);
}

async function boxY(locator) {
  return (await requiredBox(locator, "element")).y;
}

function assertWithin(actual, expected, delta, message) {
  assert.ok(Math.abs(actual - expected) <= delta, `${message}: ${actual} vs ${expected}`);
}

async function waitForText(locator, pattern, timeoutMs = 5_000) {
  const deadline = Date.now() + timeoutMs;
  let text = "";
  while (Date.now() < deadline) {
    text = await locator.innerText();
    if (pattern.test(text)) return text;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  return text;
}
