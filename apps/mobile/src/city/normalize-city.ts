export function normalizeCityName(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value
    .trim()
    .normalize("NFKD")
    .toLocaleLowerCase("tr-TR")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[çğıöşü]/g, (character) => ({
      "ç": "c",
      "ğ": "g",
      "ı": "i",
      "ö": "o",
      "ş": "s",
      "ü": "u"
    })[character] ?? character)
    .replace(/\s+/g, " ");

  return normalized || null;
}
