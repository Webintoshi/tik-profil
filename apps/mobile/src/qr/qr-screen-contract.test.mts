/// <reference types="node" />

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const mobileRoot = new URL("../../", import.meta.url);

test("QR screen owns focused QR-only camera scanning and fallback permissions", async () => {
  const source = await readFile(new URL("app/qr-scan.tsx", mobileRoot), "utf8");

  assert.match(source, /CameraView/);
  assert.match(source, /useCameraPermissions/);
  assert.match(source, /useFocusEffect/);
  assert.match(source, /barcodeScannerSettings=\{\{\s*barcodeTypes: \["qr"\]\s*\}\}/);
  assert.match(source, /active=\{isScannerActive\}/);
  assert.match(source, /onBarcodeScanned=\{isScannerActive \? handleBarcodeScanned : undefined\}/);
  assert.doesNotMatch(source, /<CameraView[\s\S]*?>[\s\S]*?<\/CameraView>/);
  assert.doesNotMatch(source, /pointerEvents="none"/);
  assert.match(source, /pointerEvents: "none"/);
  assert.match(source, /permission\.canAskAgain/);
  assert.match(source, /requestPermission/);
  assert.match(source, /Linking\.openSettings\(\)/);
  assert.match(source, /scanSessionRef\.current\.begin\(\)/);
  assert.match(source, /processQrScan/);
  assert.match(source, /logQrScan/);
  assert.match(source, /scanSessionRef\.current\.mount\(\)/);
  assert.match(source, /scanSessionRef\.current\.focus\(\)/);
  assert.match(source, /scanSessionRef\.current\.blur\(\)/);
  assert.match(source, /scanSessionRef\.current\.isCurrent\(attemptId\)/);
  assert.match(source, /router\.replace/);
  assert.doesNotMatch(source, /router\.push/);
  assert.doesNotMatch(source, /Kamera ile QR profil açma akışı bu kısa yola bağlanacak\./);

  const replaceStart = source.indexOf("replace: (href) => {");
  const routerReplace = source.indexOf("router.replace(href as never)", replaceStart);
  const markNavigated = source.indexOf("scanSessionRef.current.markNavigated(attemptId)", replaceStart);
  assert.ok(replaceStart >= 0 && routerReplace > replaceStart);
  assert.ok(markNavigated > routerReplace, "navigation must succeed before the gate becomes permanent");

  const callbackStart = source.indexOf("const handleBarcodeScanned");
  const begin = source.indexOf("const attemptId = scanSessionRef.current.begin()", callbackStart);
  const rejectInactive = source.indexOf("if (attemptId === null)", begin);
  const resolving = source.indexOf('setScannerState("resolving")', begin);
  assert.ok(begin > callbackStart && rejectInactive > begin && resolving > rejectInactive);
});

test("business profile never logs QR scans", async () => {
  const source = await readFile(new URL("app/(tabs)/business/[slug].tsx", mobileRoot), "utf8");

  assert.doesNotMatch(source, /\blogQrScan\b/);
});

test("Expo camera dependency and native plugin are configured without microphone access", async () => {
  const packageJson = JSON.parse(await readFile(new URL("package.json", mobileRoot), "utf8"));
  const appConfig = JSON.parse(await readFile(new URL("app.json", mobileRoot), "utf8"));
  const cameraPlugin = appConfig.expo.plugins.find((plugin: unknown) => (
    Array.isArray(plugin) && plugin[0] === "expo-camera"
  ));

  assert.match(packageJson.dependencies["expo-camera"], /^~56\.0\./);
  assert.ok(cameraPlugin);
  assert.equal(cameraPlugin[1].barcodeScannerEnabled, true);
  assert.equal(cameraPlugin[1].recordAudioAndroid, false);
  assert.match(cameraPlugin[1].cameraPermission, /kamera/i);
});

test("browser regression separates denied permission from camera mount errors", async () => {
  const source = await readFile(new URL("scripts/task6-browser-qr-regression.mjs", mobileRoot), "utf8");
  const deniedStart = source.indexOf("async function verifyDeniedPermissionState");
  const mountErrorStart = source.indexOf("async function verifyCameraMountError", deniedStart);

  assert.ok(deniedStart >= 0);
  assert.ok(mountErrorStart > deniedStart);

  const deniedSource = source.slice(deniedStart, mountErrorStart);
  assert.match(deniedSource, /Kamera izni ver/);
  assert.match(deniedSource, /Ayarları aç/);
  assert.match(deniedSource, /getByText\("Kamera açılamadı"[\s\S]*\.count\(\), 0/);
  assert.match(deniedSource, /getByRole\("button", \{ name: "Tekrar dene" \}\)\.count\(\), 0/);
  assert.doesNotMatch(deniedSource, /cameraError|Kamera açılamadı"[\s\S]*\.waitFor\(\)/);

  const mountErrorSource = source.slice(mountErrorStart);
  assert.match(mountErrorSource, /Kamera açılamadı/);
  assert.match(mountErrorSource, /Tekrar dene/);
  assert.match(mountErrorSource, /getUserMedia/);
});
