import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DEFAULT_BUILD_ROOT = "C:\\temp\\tikprofil-mobile-build";
const REQUIRED_STAGING_ENTRIES = [
  "app",
  "src",
  "scripts",
  ".gitignore",
  "app.json",
  "babel.config.js",
  "expo-env.d.ts",
  "metro.config.js",
  "package-lock.json",
  "package.json",
  "tsconfig.json"
];
const OPTIONAL_STAGING_ENTRIES = ["tests", ".env"];
const SIGNING_ENV_NAMES = [
  "TIKPROFIL_ANDROID_KEYSTORE_PATH",
  "TIKPROFIL_ANDROID_KEYSTORE_PASSWORD",
  "TIKPROFIL_ANDROID_KEY_ALIAS",
  "TIKPROFIL_ANDROID_KEY_PASSWORD",
  "TIKPROFIL_ANDROID_CERT_SHA256"
];

function copyEntry(sourceRoot, buildRoot, entry) {
  const source = join(sourceRoot, entry);
  const destination = join(buildRoot, entry);

  copyPath(source, destination);
}

function copyPath(source, destination) {
  if (statSync(source).isDirectory()) {
    mkdirSync(destination, { recursive: true });
    for (const child of readdirSync(source)) {
      copyPath(join(source, child), join(destination, child));
    }
    return;
  }

  mkdirSync(dirname(destination), { recursive: true });
  copyFileSync(source, destination);
}

export function stageBuildContext({
  buildRoot,
  optionalEntries = OPTIONAL_STAGING_ENTRIES,
  requiredEntries = REQUIRED_STAGING_ENTRIES,
  sourceRoot = root
}) {
  if (existsSync(buildRoot)) {
    rmSync(buildRoot, { recursive: true, force: true });
  }
  mkdirSync(buildRoot, { recursive: true });

  for (const entry of requiredEntries) {
    if (!existsSync(join(sourceRoot, entry))) {
      throw new Error(`Required mobile build entry is missing: ${entry}`);
    }
    copyEntry(sourceRoot, buildRoot, entry);
  }

  for (const entry of optionalEntries) {
    if (existsSync(join(sourceRoot, entry))) {
      copyEntry(sourceRoot, buildRoot, entry);
    }
  }
}

export function resolveBuildVariant(value) {
  const variant = (value ?? "release").toLowerCase();
  if (variant !== "debug" && variant !== "release") {
    throw new Error(`Unsupported Android build variant: ${value}. Use debug or release.`);
  }
  return variant;
}

export function resolveRequestedBuildVariant(args = process.argv.slice(2), env = process.env) {
  const wantsDebug = args.includes("--debug");
  const wantsRelease = args.includes("--release");
  if (wantsDebug && wantsRelease) {
    throw new Error("Choose only one Android build variant flag: --debug or --release.");
  }
  if (wantsRelease) return "release";
  if (wantsDebug) return "debug";
  return resolveBuildVariant(env.TIKPROFIL_ANDROID_VARIANT);
}

function normalizeCertificateFingerprint(value) {
  const normalized = value.replace(/[^0-9a-f]/gi, "").toUpperCase();
  if (normalized.length !== 64) {
    throw new Error("TIKPROFIL_ANDROID_CERT_SHA256 must contain one SHA-256 certificate fingerprint.");
  }
  return normalized;
}

export function resolveSigningConfig(variant, env = process.env) {
  if (variant === "debug") {
    return { productionSigned: false };
  }

  const missing = SIGNING_ENV_NAMES.filter((name) => !env[name]?.trim());
  if (missing.length > 0) {
    throw new Error(`Production release signing requires ${missing.join(", ")}.`);
  }

  const keystorePath = resolve(env.TIKPROFIL_ANDROID_KEYSTORE_PATH);
  if (!existsSync(keystorePath)) {
    throw new Error(`Production Android keystore not found: ${keystorePath}`);
  }

  return {
    expectedCertificateSha256: normalizeCertificateFingerprint(env.TIKPROFIL_ANDROID_CERT_SHA256),
    keystorePath,
    productionSigned: true
  };
}

export function renderReleaseSigningGradle() {
  return `android {
  signingConfigs {
    release {
      storeFile file(System.getenv("TIKPROFIL_ANDROID_KEYSTORE_PATH"))
      storePassword System.getenv("TIKPROFIL_ANDROID_KEYSTORE_PASSWORD")
      keyAlias System.getenv("TIKPROFIL_ANDROID_KEY_ALIAS")
      keyPassword System.getenv("TIKPROFIL_ANDROID_KEY_PASSWORD")
    }
  }

  buildTypes {
    release {
      signingConfig signingConfigs.release
    }
  }
}
`;
}

export function describeArtifact(variant, outputApk) {
  return variant === "release"
    ? `Production-signed APK ready: ${outputApk}`
    : `DEBUG-SIGNED APK ready (not production signed): ${outputApk}`;
}

export function getDependencyInstallArgs() {
  return ["ci"];
}

export function resolveNodeEnv(variant) {
  return variant === "release" ? "production" : "development";
}

function run(command, args, cwd, env = process.env) {
  const result = spawnSync(command, args, {
    cwd,
    stdio: "inherit",
    env,
    shell: process.platform === "win32"
  });

  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(" ")} failed`);
  }
}

function runCapture(command, args, cwd, env = process.env) {
  const result = spawnSync(command, args, {
    cwd,
    encoding: "utf8",
    env,
    shell: process.platform === "win32"
  });
  const output = `${result.stdout ?? ""}${result.stderr ?? ""}`;
  if (output) process.stdout.write(output);
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(" ")} failed`);
  }
  return output;
}

export function verifySignerCertificateOutput(output, expectedFingerprint) {
  const signerCount = Number(output.match(/Number of signers:\s*(\d+)/i)?.[1]);
  if (signerCount !== 1) {
    throw new Error("Production APK must contain exactly one signer.");
  }
  const actualFingerprint = output.match(/certificate SHA-256 digest:\s*([0-9a-f:]+)/i)?.[1];
  if (!actualFingerprint) {
    throw new Error("apksigner did not report a signer certificate SHA-256 digest.");
  }
  if (normalizeCertificateFingerprint(actualFingerprint) !== normalizeCertificateFingerprint(expectedFingerprint)) {
    throw new Error("APK signer certificate does not match TIKPROFIL_ANDROID_CERT_SHA256.");
  }
}

export function configureReleaseSigning(buildRoot) {
  const appBuildGradle = join(buildRoot, "android", "app", "build.gradle");
  const signingHookName = "tikprofil-release-signing.gradle";
  const signingHook = join(buildRoot, "android", "app", signingHookName);
  const applyDirective = `apply from: "./${signingHookName}"`;
  const appBuildSource = readFileSync(appBuildGradle, "utf8");

  if (!appBuildSource.includes(applyDirective)) {
    writeFileSync(appBuildGradle, `${appBuildSource.trimEnd()}\n\n${applyDirective}\n`, "utf8");
  }

  writeFileSync(signingHook, renderReleaseSigningGradle(), "utf8");
}

function findApkSigner(sdk) {
  const buildToolsRoot = join(sdk, "build-tools");
  if (!existsSync(buildToolsRoot)) {
    throw new Error(`Android build-tools not found at ${buildToolsRoot}.`);
  }

  const executable = process.platform === "win32" ? "apksigner.bat" : "apksigner";
  const candidates = readdirSync(buildToolsRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => ({
      name: entry.name,
      path: join(buildToolsRoot, entry.name, executable)
    }))
    .filter(({ path }) => existsSync(path))
    .sort((left, right) => right.name.localeCompare(left.name, undefined, { numeric: true }));

  if (candidates.length === 0) {
    throw new Error(`apksigner was not found under ${buildToolsRoot}.`);
  }
  return candidates[0].path;
}

function main() {
  const buildRoot = resolve(process.env.TIKPROFIL_MOBILE_BUILD_DIR ?? DEFAULT_BUILD_ROOT);
  const sdk = resolve(process.env.ANDROID_HOME ?? join(process.env.LOCALAPPDATA ?? "", "Android", "Sdk"));
  const appConfig = JSON.parse(readFileSync(join(root, "app.json"), "utf8"));
  const appVersion = appConfig?.expo?.version ?? "unknown-version";
  const versionCode = appConfig?.expo?.android?.versionCode ?? "unknown-code";
  const buildVariant = resolveRequestedBuildVariant();
  const signing = resolveSigningConfig(buildVariant);
  const gradleTask = buildVariant === "debug" ? "assembleDebug" : "assembleRelease";
  const apkFolder = buildVariant === "debug" ? "debug" : "release";
  const apkName = buildVariant === "debug" ? "app-debug.apk" : "app-release.apk";
  const outputLabel = buildVariant === "debug" ? "debug-test" : "production-signed";
  const outputApk = resolve(root, "..", "..", `tik-profil-v2-${outputLabel}-v${appVersion}-vc${versionCode}.apk`);

  if (!existsSync(sdk)) {
    throw new Error(`Android SDK not found at ${sdk}. Set ANDROID_HOME first.`);
  }

  stageBuildContext({ buildRoot });

  const buildEnv = {
    ...process.env,
    ANDROID_HOME: sdk,
    EXPO_PUBLIC_TIKPROFIL_API_URL: process.env.EXPO_PUBLIC_TIKPROFIL_API_URL ?? "https://tikprofil.com",
    NODE_ENV: resolveNodeEnv(buildVariant),
    ...(signing.productionSigned
      ? { TIKPROFIL_ANDROID_KEYSTORE_PATH: signing.keystorePath }
      : {})
  };

  run("npm", getDependencyInstallArgs(), buildRoot, buildEnv);
  run("npx", ["expo", "prebuild", "--platform", "android"], buildRoot, buildEnv);

  if (signing.productionSigned) {
    configureReleaseSigning(buildRoot);
  }

  run("gradlew.bat", [gradleTask, "--no-daemon"], join(buildRoot, "android"), buildEnv);

  const builtApk = join(buildRoot, "android", "app", "build", "outputs", "apk", apkFolder, apkName);
  if (!existsSync(builtApk)) {
    throw new Error("APK was not produced.");
  }

  const signerOutput = runCapture(
    findApkSigner(sdk),
    ["verify", "--verbose", "--print-certs", builtApk],
    buildRoot,
    buildEnv
  );
  if (signing.productionSigned) {
    verifySignerCertificateOutput(signerOutput, signing.expectedCertificateSha256);
  }
  copyFileSync(builtApk, outputApk);
  console.log(describeArtifact(buildVariant, outputApk));
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
