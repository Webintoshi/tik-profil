import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import net from "node:net";
import process from "node:process";

import { chromium } from "playwright";

const fixturePort = await getFreePort();
const expoPort = await getFreePort();
const fixtureUrl = `http://127.0.0.1:${fixturePort}`;
const appUrl = `http://127.0.0.1:${expoPort}`;
const children = [];
let browser;

try {
  children.push(spawnProcess(process.execPath, ["scripts/task5-fixture-server.mjs"], {
    TASK5_FIXTURE_PORT: String(fixturePort)
  }));
  const expoCommand = process.platform === "win32" ? (process.env.ComSpec || "cmd.exe") : "npx";
  const expoArgs = process.platform === "win32"
    ? ["/d", "/s", "/c", `npx expo start --web --port ${expoPort}`]
    : ["expo", "start", "--web", "--port", String(expoPort)];
  children.push(spawnProcess(expoCommand, expoArgs, {
    CI: "1",
    EXPO_PUBLIC_TIKPROFIL_API_URL: fixtureUrl
  }));

  await waitForUrl(`${fixtureUrl}/api/public/profile/task5-fixture`, 30_000);
  await waitForUrl(`${appUrl}/business/task5-fixture`, 120_000);
  browser = await chromium.launch({ headless: true });

  for (const viewport of [
    { width: 360, height: 800 },
    { width: 390, height: 844 },
    { width: 430, height: 932 }
  ]) {
    await verifyPrimaryLayout(browser, viewport);
    process.stdout.write(`Task 5 primary layout passed at ${viewport.width}x${viewport.height}.\n`);
  }

  await verifyMenuStateMatrix(browser, { width: 390, height: 844 });
  process.stdout.write("Task 5 menu state matrix passed.\n");
  await verifyCheckoutTransitionsAndSuccess(browser, { width: 390, height: 844 });
  process.stdout.write("Task 5 checkout transitions and success passed.\n");
  process.stdout.write("Task 5 rendered browser regression passed.\n");
} finally {
  await browser?.close();
  await Promise.all(children.reverse().map(stopProcess));
}

async function verifyPrimaryLayout(browserInstance, viewport) {
  const page = await browserInstance.newPage({ viewport });
  try {
    await openMenu(page, "task5-fixture");
    await assertCompactMenu(page, viewport.height);

    await page.getByRole("button", { name: /Büyük Karışık Menü/ }).click();
    const sticky = page.getByTestId("sticky-cart-bar");
    await sticky.waitFor();
    await page.waitForTimeout(250);
    assert.match(await sticky.innerText(), /₺126(?:,00)?/);

    const stickyBox = await requiredBox(sticky, "sticky cart");
    const navBox = await requiredBox(page.getByTestId("bottom-tab-bar"), "bottom nav");
    assert.ok(stickyBox.y < viewport.height, `${viewport.width} sticky starts below viewport`);
    assert.ok(stickyBox.y + stickyBox.height <= navBox.y, `${viewport.width} sticky overlaps nav`);

    const initialStickyY = stickyBox.y;
    const menuScroll = page.getByTestId("food-menu-scroll");
    await menuScroll.evaluate((element) => element.scrollTo({ top: 420 }));
    assertWithin(await boxY(sticky), initialStickyY, 1, `${viewport.width} sticky moved after inner scroll`);

    await page.mouse.move(4, 180);
    await page.mouse.wheel(0, 180);
    assertWithin(await boxY(sticky), initialStickyY, 1, `${viewport.width} sticky moved after outer scroll`);

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
  } finally {
    await page.close();
  }
}

async function verifyMenuStateMatrix(browserInstance, viewport) {
  for (const state of [
    { slug: "task5-loading", text: "Menü yükleniyor" },
    { slug: "task5-error", text: "Menü açılamadı" },
    { slug: "task5-empty", text: "Bu menüde ürün yok" },
    { slug: "task5-cart-disabled", text: "Büyük Karışık Menü" },
    { slug: "task5-restaurant", text: "Büyük Karışık Menü" }
  ]) {
    const page = await browserInstance.newPage({ viewport });
    try {
      await openMenu(page, state.slug, state.slug === "task5-loading");
      await page.getByText(state.text, { exact: false }).waitFor();
      await assertCompactMenu(page, viewport.height);
      assert.equal(await page.getByTestId("sticky-cart-bar").count(), 0, `${state.slug} rendered sticky`);
    } finally {
      await page.close();
    }
  }
}

async function verifyCheckoutTransitionsAndSuccess(browserInstance, viewport) {
  const page = await browserInstance.newPage({ viewport });
  try {
    await openMenu(page, "task5-fixture");
    await page.getByRole("button", { name: /Büyük Karışık Menü/ }).click();
    const sticky = page.getByTestId("sticky-cart-bar");
    assert.match(await sticky.innerText(), /₺126(?:,00)?/);
    await page.getByRole("button", { name: "Sepete git", exact: true }).click();

    const footerTotal = page.getByTestId("food-checkout-footer-total");
    await page.getByRole("button", { name: /Mağaza teslim/ }).click();
    assert.match(await footerTotal.innerText(), /₺101(?:,00)?/);
    await page.getByRole("button", { name: /Adrese teslim/ }).click();
    assert.match(await footerTotal.innerText(), /₺126(?:,00)?/);

    await page.getByTestId("food-address-input").fill("Test adresi");
    await page.getByTestId("food-name-input").fill("Test Musteri");
    await page.getByTestId("food-phone-input").fill("05551112233");
    await page.getByTestId("food-coupon-input").fill("TASK5");
    await page.getByRole("button", { name: "Uygula", exact: true }).click();
    assert.match(await footerTotal.innerText(), /₺116(?:,00)?/);

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

async function requiredBox(locator, label) {
  const box = await locator.boundingBox();
  assert.ok(box, `${label} has no rendered rectangle`);
  return box;
}

async function boxY(locator) {
  return (await requiredBox(locator, "element")).y;
}

function assertWithin(actual, expected, delta, message) {
  assert.ok(Math.abs(actual - expected) <= delta, `${message}: ${actual} vs ${expected}`);
}

function spawnProcess(command, args, extraEnv) {
  const child = spawn(command, args, {
    cwd: process.cwd(),
    detached: process.platform !== "win32",
    env: { ...process.env, ...extraEnv },
    stdio: ["ignore", "pipe", "pipe"]
  });
  child.stdout.on("data", (chunk) => process.stdout.write(chunk));
  child.stderr.on("data", (chunk) => process.stderr.write(chunk));
  return child;
}

function stopProcess(child) {
  if (!child.pid || child.exitCode !== null) return Promise.resolve();
  if (process.platform === "win32") {
    return new Promise((resolve) => {
      const killer = spawn("taskkill", ["/pid", String(child.pid), "/T", "/F"], { stdio: "ignore" });
      killer.on("error", () => resolve());
      killer.on("exit", () => resolve());
    });
  }
  try {
    process.kill(-child.pid, "SIGTERM");
  } catch {
    child.kill("SIGTERM");
  }
  return Promise.resolve();
}

async function waitForUrl(url, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  let lastError;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`Timed out waiting for ${url}: ${lastError?.message || "not ready"}`);
}

function getFreePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.unref();
    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      server.close(() => resolve(address.port));
    });
  });
}
