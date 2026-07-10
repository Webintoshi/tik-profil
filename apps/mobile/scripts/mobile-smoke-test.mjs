import { readFileSync, readdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join, relative } from "node:path";

const root = fileURLToPath(new URL("..", import.meta.url));
const appConfig = JSON.parse(readFileSync(join(root, "app.json"), "utf8"));
const packageJson = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
const bannedConsumerWords = [
  "backend",
  "sync",
  "bridge",
  "endpoint",
  "token",
  "API",
  "Logto",
  "501",
  "FEATURE_NOT_READY",
  "debug"
];
const mojibakeMarkers = ["Ä", "Å", "Ã", "�"];

function listSourceFiles(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      return listSourceFiles(fullPath);
    }
    return /\.(tsx|ts)$/.test(entry.name) ? [fullPath] : [];
  });
}

const files = [
  ...listSourceFiles(join(root, "app")),
  ...listSourceFiles(join(root, "src"))
];
const combined = files.map((file) => readFileSync(file, "utf8")).join("\n");

if (appConfig.expo.name !== "Tık Profil") {
  throw new Error("Expo app name must be Tık Profil.");
}

if (appConfig.expo.slug !== "tik-profil-v2") {
  throw new Error("Expo slug must be tik-profil-v2.");
}

if (appConfig.expo.android?.package !== "com.tikprofil.v2") {
  throw new Error("Android package must be com.tikprofil.v2.");
}

for (const dependency of [
  "expo-location",
  "expo-haptics",
  "expo-image",
  "expo-auth-session",
  "expo-web-browser",
  "expo-secure-store"
]) {
  if (!packageJson.dependencies?.[dependency]) {
    throw new Error(`Expected Expo Go compatible dependency is missing: ${dependency}`);
  }
}

const requiredCopy = [
  "Yakınındaki işletmeleri keşfet",
  "Konumunu kullan",
  "Popüler kategoriler",
  "Öne çıkan işletmeler",
  "İşletme ara",
  "Son aramalar",
  "Giriş yap",
  "Güvenli giriş ekranı tarayıcıda açılır.",
  "Hesap oluştur",
  "Ara",
  "WhatsApp",
  "Konum",
  "Sipariş Ver",
  "Instagram",
  "Yorumlar"
];

for (const copy of requiredCopy) {
  if (!combined.includes(copy)) {
    throw new Error(`Required customer discovery copy is missing: ${copy}`);
  }
}

for (const file of files) {
  const text = readFileSync(file, "utf8");
  for (const marker of mojibakeMarkers) {
    if (text.includes(marker)) {
      throw new Error(`Broken Turkish encoding marker found in ${file}: ${marker}`);
    }
  }
  for (const word of bannedConsumerWords) {
    if (text.includes(`"${word}"`) || text.includes(`'${word}'`) || text.includes(`>${word}<`)) {
      throw new Error(`Banned consumer copy found in ${file}: ${word}`);
    }
  }
}

for (const file of [
  "app/(tabs)/business/[slug].tsx",
  "src/api/kesfet.ts",
  "src/components/business/business-card.tsx",
  "src/components/business/category-pill.tsx",
  "src/components/business/empty-state.tsx",
  "src/components/business/location-banner.tsx",
  "src/business/profile-actions.ts",
  "src/state/discovery-store.tsx",
  "src/theme/tokens.ts",
  "src/components/account/AuthEntryCard.tsx",
  "src/components/account/PhoneInputRow.tsx",
  "src/components/account/SocialButton.tsx",
  "src/components/account/BenefitChip.tsx",
  "src/components/account/BrandHero.tsx"
]) {
  const fullPath = join(root, file);
  if (!statSync(fullPath).isFile()) {
    throw new Error(`Expected mobile source file is missing: ${file}`);
  }
}

for (const expected of [
  "interface KesfetBusiness",
  "interface KesfetCategory",
  "interface PaginatedKesfetResponse",
  "interface SearchResponse",
  "/api/kesfet",
  "/api/kesfet/search",
  "/api/kesfet/categories",
  "/api/qr-scan",
  "toggleFavorite",
  "recentSearches",
  "lastSelectedCity"
]) {
  if (!combined.includes(expected)) {
    throw new Error(`Expected mobile discovery behavior is missing: ${expected}`);
  }
}

const webModuleRegistryPath = join(root, "..", "..", "src", "lib", "ModuleRegistry.ts");
const mobileProfileActionsPath = join(root, "src", "business", "profile-actions.ts");
const mobileTabBarPath = join(root, "src", "components", "navigation", "MakyajTabBar.tsx");
const mobileTabsLayoutPath = join(root, "app", "(tabs)", "_layout.tsx");
const mobileTabsPath = join(root, "app", "(tabs)");
const webModuleRegistry = readFileSync(webModuleRegistryPath, "utf8");
const registryStart = webModuleRegistry.indexOf("export const MODULE_REGISTRY");
const registryModuleIds = [...webModuleRegistry.slice(registryStart).matchAll(/\{\s*id:\s*"([^"]+)"/g)]
  .map((match) => match[1]);
const profileActionsSource = readFileSync(mobileProfileActionsPath, "utf8");
const actionIdsMatch = /PROFILE_ACTION_MODULE_IDS\s*=\s*\[([\s\S]*?)\]\s*as const/.exec(profileActionsSource);

if (!actionIdsMatch) {
  throw new Error("Mobile profile action module coverage list is missing.");
}

const profileActionModuleIds = [...actionIdsMatch[1].matchAll(/"([^"]+)"/g)].map((match) => match[1]);
const profileActionModuleSet = new Set(profileActionModuleIds);
const missingProfileActions = registryModuleIds.filter((moduleId) => !profileActionModuleSet.has(moduleId));
const duplicateProfileActions = profileActionModuleIds.filter((moduleId, index) => profileActionModuleIds.indexOf(moduleId) !== index);

if (missingProfileActions.length > 0) {
  throw new Error(`Mobile profile action coverage is missing modules: ${missingProfileActions.join(", ")}`);
}

if (duplicateProfileActions.length > 0) {
  throw new Error(`Mobile profile action coverage has duplicate modules: ${[...new Set(duplicateProfileActions)].join(", ")}`);
}

for (const expected of [
  "CustomerSessionProvider",
  "useCustomerSession",
  "EXPO_PUBLIC_LOGTO_ENDPOINT",
  "expo-secure-store",
  "Authorization: `Bearer ${accessToken}`"
]) {
  if (!combined.includes(expected)) {
    throw new Error(`Expected mobile customer session behavior is missing: ${expected}`);
  }
}

function listRouteNames(dir, rootDir = dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      return listRouteNames(fullPath, rootDir);
    }

    const routeName = entry.name.replace(/\.(tsx?|jsx?)$/, "");
    if (routeName === "_layout" || routeName === entry.name) {
      return [];
    }

    return [relative(rootDir, fullPath).replace(/\\/g, "/").replace(/\.(tsx?|jsx?)$/, "")];
  });
}

const mobileTabBarSource = readFileSync(mobileTabBarPath, "utf8");
const mobileTabsLayoutSource = readFileSync(mobileTabsLayoutPath, "utf8");
const hiddenTabRoutesMatch = /const hiddenTabRoutes = new Set\(\[([\s\S]*?)\]\);/.exec(mobileTabBarSource);
const visibleRoutesContract = "const visibleRoutes = state.routes.filter((route) => !hiddenTabRoutes.has(route.name));";
const coreTabRoutes = ["index", "explore", "favorites", "account"];
const expectedHiddenTabRoutes = ["business/[slug]", "qr-scan"];
const tabRouteNames = listRouteNames(mobileTabsPath);

if (!hiddenTabRoutesMatch || !mobileTabBarSource.includes(visibleRoutesContract)) {
  throw new Error("Mobile bottom navigation route filtering is missing.");
}

const hiddenTabRoutes = [...hiddenTabRoutesMatch[1].matchAll(/"([^"]+)"/g)].map((match) => match[1]);
const visibleTabRoutes = tabRouteNames.filter((route) => !hiddenTabRoutes.includes(route));

if (
  hiddenTabRoutes.length !== expectedHiddenTabRoutes.length
  || expectedHiddenTabRoutes.some((route) => !hiddenTabRoutes.includes(route))
  || visibleTabRoutes.length !== coreTabRoutes.length
  || coreTabRoutes.some((route) => !visibleTabRoutes.includes(route))
  || visibleTabRoutes.some((route) => !coreTabRoutes.includes(route))
  || !mobileTabsLayoutSource.includes("tabBar={(props) => <MakyajTabBar {...props} />}")
) {
  throw new Error("Business profiles must render exactly the four core bottom navigation items.");
}

console.log("Mobile customer discovery smoke test passed.");
