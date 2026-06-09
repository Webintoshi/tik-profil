declare const __dirname: string;
declare function require(moduleName: string): unknown;

const { existsSync, readFileSync } = require("fs") as {
  existsSync: (path: string) => boolean;
  readFileSync: (path: string, encoding: "utf8") => string;
};
const { join } = require("path") as {
  join: (...parts: string[]) => string;
};

const root = join(__dirname, "..");

const primaryUserFacingFiles = [
  "app/(onboarding)/intro.tsx",
  "app/(tabs)/kesfet/index.tsx",
  "app/(tabs)/profil/index.tsx",
  "src/components/auth/customer-auth-panels.tsx",
];

function readMobileFile(path: string): string {
  return readFileSync(join(root, path), "utf8");
}

function extractStringLiterals(source: string): string[] {
  const matches = source.matchAll(/(["'`])((?:\\.|(?!\1).)*?)\1/gs);
  return Array.from(matches, (match) => match[2] ?? "");
}

describe("mobile v2 product copy", () => {
  it("ships the native v2 component layer used by rebuilt screens", () => {
    const v2Components = [
      "src/components/v2/action-tile.tsx",
      "src/components/v2/app-screen.tsx",
      "src/components/v2/business-showcase-card.tsx",
      "src/components/v2/promo-rail.tsx",
      "src/components/v2/section-title.tsx",
    ];

    for (const file of v2Components) {
      expect(existsSync(join(root, file))).toBe(true);
    }
  });

  it("does not ship mojibake Turkish text in primary screens", () => {
    const badPatterns = [/Ã./, /Ä./, /Å./, /ğŸ/];

    for (const file of primaryUserFacingFiles) {
      const source = readMobileFile(file);
      const hasMojibake = badPatterns.some((pattern) => pattern.test(source));

      expect(hasMojibake).toBe(false);
    }
  });

  it("keeps technical auth wording out of user-facing string literals", () => {
    const technicalPatterns = [
      /\bbackend\b/i,
      /\bbridge\b/i,
      /\bcallback\b/i,
      /\bLogto state\b/i,
      /\bsession sync\b/i,
    ];

    for (const file of primaryUserFacingFiles) {
      const strings = extractStringLiterals(readMobileFile(file));
      const technicalCopy = strings.filter((value) =>
        technicalPatterns.some((pattern) => pattern.test(value)),
      );

      expect(technicalCopy).toEqual([]);
    }
  });
});
