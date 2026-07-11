import assert from "node:assert/strict";
import process from "node:process";

import { chromium } from "playwright";
import { cleanupBrowserTestProcesses, getFreePort, spawnManagedNode, waitForUrl } from "./browser-test-processes.mjs";

const expoPort = await getFreePort();
const appUrl = `http://127.0.0.1:${expoPort}`;
let expoProcess;
let browser;

try {
  expoProcess = spawnManagedNode(["node_modules/expo/bin/cli", "start", "--web", "--port", String(expoPort)], { CI: "1" });
  await waitForUrl(`${appUrl}/qr-scan`, 120_000);
  browser = await chromium.launch({ headless: true });
  await verifyDeniedPermissionState(browser);
  await verifyCameraMountError(browser);
  process.stdout.write("Task 6 QR permission and camera-error browser regressions passed.\n");
} finally {
  await browser?.close();
  await cleanupBrowserTestProcesses(expoProcess ? [expoProcess] : [], [expoPort]);
}

async function verifyDeniedPermissionState(browserInstance) {
  const context = await browserInstance.newContext({
    permissions: [],
    viewport: { width: 390, height: 844 }
  });
  const page = await context.newPage();
  const pageErrors = monitorPageErrors(page);

  try {
    await page.goto(`${appUrl}/qr-scan`, { waitUntil: "networkidle" });
    await page.getByText("QR kod okut", { exact: true }).waitFor();

    const askable = page.getByRole("button", { name: "Kamera izni ver" });
    const settings = page.getByRole("button", { name: "Ayarları aç" });
    await askable.or(settings).waitFor();

    assert.equal(await askable.count() + await settings.count(), 1);
    assert.equal(await page.getByText("Kamera açılamadı", { exact: true }).count(), 0);
    assert.equal(await page.getByRole("button", { name: "Tekrar dene" }).count(), 0);
    await assertHealthyQrPage(page, pageErrors);
  } finally {
    await context.close();
  }
}

async function verifyCameraMountError(browserInstance) {
  const context = await browserInstance.newContext({
    permissions: ["camera"],
    viewport: { width: 390, height: 844 }
  });
  const page = await context.newPage();
  const pageErrors = monitorPageErrors(page);
  await page.addInitScript(() => {
    Object.defineProperty(navigator.mediaDevices, "getUserMedia", {
      configurable: true,
      value: async () => {
        throw new DOMException("No camera is available", "NotFoundError");
      }
    });
  });

  try {
    await page.goto(`${appUrl}/qr-scan`, { waitUntil: "networkidle" });
    await page.getByText("Kamera açılamadı", { exact: true }).waitFor();
    assert.equal(await page.getByRole("button", { name: "Tekrar dene" }).count(), 1);
    assert.equal(await page.getByRole("button", { name: "Kamera izni ver" }).count(), 0);
    assert.equal(await page.getByRole("button", { name: "Ayarları aç" }).count(), 0);
    await assertHealthyQrPage(page, pageErrors);
  } finally {
    await context.close();
  }
}

function monitorPageErrors(page) {
  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  return pageErrors;
}

async function assertHealthyQrPage(page, pageErrors) {
  assert.equal(
    await page.getByText("Kamera ile QR profil açma akışı bu kısa yola bağlanacak.", { exact: true }).count(),
    0
  );
  assert.equal(await page.getByRole("button", { name: "Geri dön" }).count(), 1);
  assert.deepEqual(pageErrors, []);
}
