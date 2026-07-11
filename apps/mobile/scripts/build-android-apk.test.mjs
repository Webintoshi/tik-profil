import assert from "node:assert/strict";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
  configureReleaseSigning,
  describeArtifact,
  getDependencyInstallArgs,
  renderReleaseSigningGradle,
  resolveBuildVariant,
  resolveNodeEnv,
  resolveSigningConfig,
  stageBuildContext
} from "./build-android-apk.mjs";

test("clean Android projects receive a dedicated idempotent release signing hook", () => {
  const fixtureRoot = mkdtempSync(join(tmpdir(), "tikprofil-signing-hook-test-"));
  const appRoot = join(fixtureRoot, "android", "app");
  const appBuildGradle = join(appRoot, "build.gradle");

  try {
    mkdirSync(appRoot, { recursive: true });
    writeFileSync(appBuildGradle, "plugins { id 'com.android.application' }\n");

    configureReleaseSigning(fixtureRoot);
    configureReleaseSigning(fixtureRoot);

    const buildGradle = readFileSync(appBuildGradle, "utf8");
    const hookMatches = buildGradle.match(/apply from: \"\.\/tikprofil-release-signing\.gradle\"/g) ?? [];
    assert.equal(hookMatches.length, 1);
    assert.match(
      readFileSync(join(appRoot, "tikprofil-release-signing.gradle"), "utf8"),
      /signingConfig signingConfigs\.release/
    );
  } finally {
    rmSync(fixtureRoot, { force: true, recursive: true });
  }
});

test("clean staging installs the locked dependency graph reproducibly", () => {
  assert.deepEqual(getDependencyInstallArgs(), ["ci"]);
});

test("native builds provide Expo an explicit environment mode", () => {
  assert.equal(resolveNodeEnv("release"), "production");
  assert.equal(resolveNodeEnv("debug"), "development");
  assert.equal(resolveNodeEnv("release", "test"), "test");
});

test("clean staging replaces old content and skips absent optional entries", () => {
  const fixtureRoot = mkdtempSync(join(tmpdir(), "tikprofil-build-test-"));
  const sourceRoot = join(fixtureRoot, "source");
  const buildRoot = join(fixtureRoot, "stage");

  try {
    mkdirSync(join(sourceRoot, "app"), { recursive: true });
    writeFileSync(join(sourceRoot, "app", "index.tsx"), "export default null;\n");
    writeFileSync(join(sourceRoot, "package.json"), "{}\n");
    mkdirSync(buildRoot, { recursive: true });
    writeFileSync(join(buildRoot, "stale.txt"), "must be removed\n");

    stageBuildContext({
      buildRoot,
      optionalEntries: ["tests", ".env"],
      requiredEntries: ["app", "package.json"],
      sourceRoot
    });

    assert.equal(existsSync(join(buildRoot, "stale.txt")), false);
    assert.equal(readFileSync(join(buildRoot, "app", "index.tsx"), "utf8"), "export default null;\n");
    assert.equal(existsSync(join(buildRoot, "tests")), false);
    assert.equal(existsSync(join(buildRoot, ".env")), false);
  } finally {
    rmSync(fixtureRoot, { force: true, recursive: true });
  }
});

test("clean staging copies optional entries when they exist", () => {
  const fixtureRoot = mkdtempSync(join(tmpdir(), "tikprofil-build-test-"));
  const sourceRoot = join(fixtureRoot, "source");
  const buildRoot = join(fixtureRoot, "stage");

  try {
    mkdirSync(join(sourceRoot, "tests"), { recursive: true });
    writeFileSync(join(sourceRoot, "tests", "smoke.txt"), "fixture\n");
    writeFileSync(join(sourceRoot, ".env"), "EXPO_PUBLIC_TEST=1\n");

    stageBuildContext({
      buildRoot,
      optionalEntries: ["tests", ".env"],
      requiredEntries: [],
      sourceRoot
    });

    assert.equal(readFileSync(join(buildRoot, "tests", "smoke.txt"), "utf8"), "fixture\n");
    assert.equal(readFileSync(join(buildRoot, ".env"), "utf8"), "EXPO_PUBLIC_TEST=1\n");
  } finally {
    rmSync(fixtureRoot, { force: true, recursive: true });
  }
});

test("release builds fail closed without complete production signing credentials", () => {
  assert.throws(
    () => resolveSigningConfig("release", {}),
    /Production release signing requires TIKPROFIL_ANDROID_KEYSTORE_PATH/
  );
  assert.throws(
    () => resolveSigningConfig("release", {
      TIKPROFIL_ANDROID_KEYSTORE_PATH: "missing.jks",
      TIKPROFIL_ANDROID_KEYSTORE_PASSWORD: "store-secret",
      TIKPROFIL_ANDROID_KEY_ALIAS: "upload",
      TIKPROFIL_ANDROID_KEY_PASSWORD: "key-secret"
    }),
    /Production Android keystore not found/
  );
});

test("release signing uses environment-backed Gradle configuration without embedding secrets", () => {
  const fixtureRoot = mkdtempSync(join(tmpdir(), "tikprofil-signing-test-"));
  const keystorePath = join(fixtureRoot, "production.jks");

  try {
    writeFileSync(keystorePath, "fixture");
    const signing = resolveSigningConfig("release", {
      TIKPROFIL_ANDROID_KEYSTORE_PATH: keystorePath,
      TIKPROFIL_ANDROID_KEYSTORE_PASSWORD: "store-secret",
      TIKPROFIL_ANDROID_KEY_ALIAS: "upload",
      TIKPROFIL_ANDROID_KEY_PASSWORD: "key-secret"
    });
    const gradle = renderReleaseSigningGradle();

    assert.equal(signing.productionSigned, true);
    assert.match(gradle, /System\.getenv\("TIKPROFIL_ANDROID_KEYSTORE_PATH"\)/);
    assert.match(gradle, /signingConfig signingConfigs\.release/);
    assert.doesNotMatch(gradle, /store-secret|key-secret|signingConfigs\.debug/);
  } finally {
    rmSync(fixtureRoot, { force: true, recursive: true });
  }
});

test("only debug and release variants are accepted and debug is labeled non-production", () => {
  assert.equal(resolveBuildVariant("DEBUG"), "debug");
  assert.equal(resolveBuildVariant(undefined), "release");
  assert.throws(() => resolveBuildVariant("profile"), /Unsupported Android build variant/);
  assert.match(describeArtifact("debug", "C:\\tmp\\app-debug.apk"), /DEBUG-SIGNED/);
  assert.match(describeArtifact("debug", "C:\\tmp\\app-debug.apk"), /not production signed/i);
  assert.doesNotMatch(describeArtifact("debug", "C:\\tmp\\app-debug.apk"), /Production-signed/);
  assert.match(describeArtifact("release", "C:\\tmp\\app-release.apk"), /Production-signed/);
});
