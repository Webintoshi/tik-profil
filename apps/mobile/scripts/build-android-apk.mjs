import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const buildRoot = process.env.TIKPROFIL_MOBILE_BUILD_DIR ?? "C:\\temp\\tikprofil-mobile-build";
const sdk = process.env.ANDROID_HOME ?? join(process.env.LOCALAPPDATA ?? "", "Android", "Sdk");
const appConfig = JSON.parse(readFileSync(join(root, "app.json"), "utf8"));
const appVersion = appConfig?.expo?.version ?? "unknown-version";
const versionCode = appConfig?.expo?.android?.versionCode ?? "unknown-code";
const buildVariant = (process.env.TIKPROFIL_ANDROID_VARIANT ?? "release").toLowerCase();
const gradleTask = buildVariant === "debug" ? "assembleDebug" : "assembleRelease";
const apkFolder = buildVariant === "debug" ? "debug" : "release";
const apkName = buildVariant === "debug" ? "app-debug.apk" : "app-release.apk";
const outputApk = resolve(root, "..", "..", `tik-profil-v2-real-test-${buildVariant}-v${appVersion}-vc${versionCode}.apk`);

function run(command, args, cwd) {
  const result = spawnSync(command, args, {
    cwd,
    stdio: "inherit",
    env: {
      ...process.env,
      ANDROID_HOME: sdk,
      EXPO_PUBLIC_TIKPROFIL_API_URL: process.env.EXPO_PUBLIC_TIKPROFIL_API_URL ?? "https://tikprofil.com"
    },
    shell: process.platform === "win32"
  });

  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(" ")} failed`);
  }
}

function copyDirectory(source, destination) {
  mkdirSync(destination, { recursive: true });

  if (process.platform === "win32") {
    const result = spawnSync(
      "robocopy",
      [source, destination, "/E", "/NFL", "/NDL", "/NJH", "/NJS", "/NC", "/NS", "/NP"],
      { stdio: "inherit" }
    );

    if (result.status === null || result.status >= 8) {
      throw new Error(`robocopy failed while copying ${source}`);
    }
    return;
  }

  run("cp", ["-R", `${source}/.`, destination], root);
}

function copyEntry(entry) {
  const source = join(root, entry);
  const destination = join(buildRoot, entry);

  if (statSync(source).isDirectory()) {
    copyDirectory(source, destination);
    return;
  }

  mkdirSync(dirname(destination), { recursive: true });
  copyFileSync(source, destination);
}

if (!existsSync(sdk)) {
  throw new Error(`Android SDK not found at ${sdk}. Set ANDROID_HOME first.`);
}

if (existsSync(buildRoot)) {
  rmSync(buildRoot, { recursive: true, force: true });
}

mkdirSync(buildRoot, { recursive: true });

for (const entry of ["app", "src", "scripts", "tests", ".env", ".gitignore", "app.json", "babel.config.js", "expo-env.d.ts", "metro.config.js", "package-lock.json", "package.json", "tsconfig.json"]) {
  copyEntry(entry);
}

run("npm", ["install"], buildRoot);
run("npx", ["expo", "prebuild", "--platform", "android"], buildRoot);
run("gradlew.bat", [gradleTask, "--no-daemon"], join(buildRoot, "android"));

const builtApk = join(buildRoot, "android", "app", "build", "outputs", "apk", apkFolder, apkName);
if (!existsSync(builtApk)) {
  throw new Error("APK was not produced.");
}

copyFileSync(builtApk, outputApk);
console.log(`APK ready: ${outputApk}`);
