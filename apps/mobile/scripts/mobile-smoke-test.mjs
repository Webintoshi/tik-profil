import { readFileSync, readdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

const root = fileURLToPath(new URL("..", import.meta.url));
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
const requiredCopy = [
  "Hesabına giriş yap",
  "Telefonla devam et",
  "Hesap oluştur",
  "Yakındaki işletmeler",
  "Kampanyalar",
  "QR ile hızlı erişim"
];

for (const copy of requiredCopy) {
  if (!combined.includes(copy)) {
    throw new Error(`Required account entry copy is missing: ${copy}`);
  }
}

for (const file of files) {
  const text = readFileSync(file, "utf8");
  for (const word of bannedConsumerWords) {
    if (text.includes(`"${word}"`) || text.includes(`'${word}'`) || text.includes(`>${word}<`)) {
      throw new Error(`Banned consumer copy found in ${file}: ${word}`);
    }
  }
}

for (const file of [
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

console.log("Mobile account entry smoke test passed.");
