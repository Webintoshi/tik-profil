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
  assert.match(source, /permission\.canAskAgain/);
  assert.match(source, /requestPermission/);
  assert.match(source, /Linking\.openSettings\(\)/);
  assert.match(source, /scanGateRef\.current\.acquire\(\)/);
  assert.match(source, /processQrScan/);
  assert.match(source, /logQrScan/);
  assert.match(source, /mountedRef\.current = true/);
  assert.match(source, /scanGateRef\.current\.state\(\) === "locked"[\s\S]*setScannerState\("unresolved"\)/);
  assert.match(source, /router\.replace/);
  assert.doesNotMatch(source, /router\.push/);
  assert.doesNotMatch(source, /Kamera ile QR profil açma akışı bu kısa yola bağlanacak\./);

  const replaceStart = source.indexOf("replace: (href) => {");
  const routerReplace = source.indexOf("router.replace(href as never)", replaceStart);
  const markNavigated = source.indexOf("scanGateRef.current.markNavigated()", replaceStart);
  assert.ok(replaceStart >= 0 && routerReplace > replaceStart);
  assert.ok(markNavigated > routerReplace, "navigation must succeed before the gate becomes permanent");
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
