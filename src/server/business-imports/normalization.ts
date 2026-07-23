const MOJIBAKE_TURKISH_REPLACEMENTS: ReadonlyArray<readonly [string, string]> = [
    ["\u00C3\u2021", "C"], ["\u00C3\u00A7", "c"], ["\u00C4\u009E", "G"], ["\u00C4\u009F", "g"],
    ["\u00C4\u00B0", "I"], ["\u00C4\u00B1", "i"], ["\u00C3\u0096", "O"], ["\u00C3\u00B6", "o"],
    ["\u00C5\u015F", "s"], ["\u00C3\u009C", "U"], ["\u00C3\u00BC", "u"],
    ["\u00C4\u017E", "G"], ["\u00C4\u0178", "g"],
    ["\u00C5\u017E", "S"], ["\u00C5\u0178", "s"],
    ["\u00C3\u2013", "O"], ["\u00C3\u0153", "U"],
];

const MAX_SLUG_LENGTH = 63;
const MAX_LOGIN_LOCAL_PART_LENGTH = 64;

export function normalizeTurkishText(value: string): string {
    let normalized = value || "";
    for (const [malformed, replacement] of MOJIBAKE_TURKISH_REPLACEMENTS) {
        normalized = normalized.replaceAll(malformed, replacement);
    }

    return normalized
        .toLocaleLowerCase("tr-TR")
        .replaceAll("\u0131", "i")
        .replaceAll("\u011F", "g")
        .replaceAll("\u00FC", "u")
        .replaceAll("\u015F", "s")
        .replaceAll("\u00F6", "o")
        .replaceAll("\u00E7", "c")
        .normalize("NFD")
        .replace(/[\u0300-\u036F]/g, "")
        .replace(/['\u2019]/g, "")
        .replace(/[^a-z0-9\s]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

export function normalizePhone(value: string): string {
    let normalized = (value || "").replace(/\D/g, "");
    if (normalized.startsWith("00")) normalized = normalized.slice(2);
    if (normalized.startsWith("90") && normalized.length === 12) normalized = normalized.slice(2);
    if (normalized.startsWith("0") && normalized.length === 11) normalized = normalized.slice(1);
    return normalized;
}

export function normalizeDomain(value: string): string {
    const trimmed = (value || "").trim();
    if (!trimmed || /\s/.test(trimmed)) return "";

    try {
        const parsed = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`);
        const hostname = parsed.hostname.toLowerCase().replace(/^www\./, "").replace(/\.$/, "");
        return hostname.includes(".") ? hostname : "";
    } catch {
        return "";
    }
}

export function createBusinessSlug(value: string): string {
    const slug = normalizeTurkishText(value).replace(/\s+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
    return (slug || "isletme").slice(0, MAX_SLUG_LENGTH).replace(/-+$/g, "") || "isletme";
}

export function createLoginLocalPart(businessName: string, collisionSuffix: string): string {
    const suffix = createBusinessSlug(collisionSuffix).slice(0, MAX_LOGIN_LOCAL_PART_LENGTH - 2);
    const availableSlugLength = Math.max(1, MAX_LOGIN_LOCAL_PART_LENGTH - suffix.length - 1);
    const slug = createBusinessSlug(businessName).slice(0, availableSlugLength).replace(/-+$/g, "") || "isletme";
    return `${slug}-${suffix}`;
}
