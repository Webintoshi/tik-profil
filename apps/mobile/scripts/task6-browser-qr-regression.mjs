import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import net from "node:net";
import process from "node:process";

import { chromium } from "playwright";

const expoPort = await getFreePort();
const appUrl = `http://127.0.0.1:${expoPort}`;
const expoCommand = process.platform === "win32" ? (process.env.ComSpec || "cmd.exe") : "npx";
const expoArgs = process.platform === "win32"
  ? ["/d", "/s", "/c", `npx expo start --web --port ${expoPort}`]
  : ["expo", "start", "--web", "--port", String(expoPort)];
const expoProcess = spawnProcess(expoCommand, expoArgs, { CI: "1" });
let browser;

try {
  await waitForUrl(`${appUrl}/qr-scan`, 120_000);
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ permissions: [], viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));

  await page.goto(`${appUrl}/qr-scan`, { waitUntil: "networkidle" });
  await page.getByText("QR kod okut", { exact: true }).waitFor();

  const askable = page.getByRole("button", { name: "Kamera izni ver" });
  const settings = page.getByRole("button", { name: "Ayarları aç" });
  const cameraError = page.getByRole("button", { name: "Tekrar dene" });
  await Promise.race([
    askable.waitFor(),
    settings.waitFor(),
    cameraError.waitFor()
  ]);

  assert.equal(
    await page.getByText("Kamera ile QR profil açma akışı bu kısa yola bağlanacak.", { exact: true }).count(),
    0
  );
  assert.equal(await page.getByRole("button", { name: "Geri dön" }).count(), 1);
  assert.deepEqual(pageErrors, []);
  await context.close();
  process.stdout.write("Task 6 QR browser fallback regression passed.\n");
} finally {
  await browser?.close();
  await stopProcess(expoProcess);
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
