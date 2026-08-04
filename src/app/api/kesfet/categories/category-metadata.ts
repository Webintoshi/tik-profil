type CategoryMetadata = {
    id: string;
    label: string;
    emoji: string;
};

const FALLBACK_EMOJIS: Record<string, string> = {
    fastfood: "\ud83c\udf54",
    restaurant: "\ud83c\udf7d\ufe0f",
    restoran: "\ud83c\udf7d\ufe0f",
    cafe: "\u2615",
    kafe: "\u2615",
    coffee: "\u2615",
    kahve: "\u2615",
    bar: "\ud83c\udf78",
    beauty: "\ud83d\udc85",
    guzellik: "\ud83d\udc85",
    kuafor: "\ud83d\udc87",
    salon: "\ud83d\udc87",
    spa: "\ud83e\uddd6",
    health: "\ud83e\ude7a",
    saglik: "\ud83e\ude7a",
    eczane: "\ud83d\udc8a",
    fitness: "\ud83c\udfcb\ufe0f",
    spor: "\u26bd",
    hotel: "\ud83c\udfe8",
    otel: "\ud83c\udfe8",
    pansiyon: "\ud83c\udfe1",
    apart: "\ud83c\udfe2",
    ecommerce: "\ud83d\uded2",
    market: "\ud83d\uded2",
    magaza: "\ud83d\uded2",
    giyim: "\ud83d\udc57",
    fashion: "\ud83d\udc57",
    moda: "\ud83d\udc57",
    elektronik: "\ud83d\udcf1",
    technology: "\ud83d\udcbb",
    emlak: "\ud83c\udfe0",
    gayrimenkul: "\ud83c\udfe0",
    oto: "\ud83d\ude97",
    auto: "\ud83d\ude97",
    tamir: "\ud83d\udd27",
    servis: "\ud83d\udd27",
    education: "\ud83d\udcda",
    egitim: "\ud83d\udcda",
    hukuk: "\u2696\ufe0f",
    danismanlik: "\ud83d\udcbc",
    entertainment: "\ud83c\udfac",
    eglence: "\ud83c\udf89",
    sinema: "\ud83c\udfac",
    oyun: "\ud83c\udfae",
    other: "\ud83d\udccd",
};

const CANONICAL_CATEGORIES: Record<string, Omit<CategoryMetadata, "id">> = {
    "guzellik_&_kuafor": { label: "G\u00fczellik & Kuaf\u00f6r", emoji: "\ud83d\udc85" },
    "emlak_&_gayrimenkul": { label: "Emlak & Gayrimenkul", emoji: "\ud83c\udfe0" },
    "otel_&_konaklama": { label: "Otel & Konaklama", emoji: "\ud83c\udfe8" },
    arac_kiralama: { label: "Ara\u00e7 Kiralama", emoji: "\ud83d\ude98" },
    "klinik_&_saglik": { label: "Klinik & Sa\u011fl\u0131k", emoji: "\ud83e\ude7a" },
    "market_&_bakkal": { label: "Market & Bakkal", emoji: "\ud83d\uded2" },
    "firin,_pastane_&_tatli": { label: "F\u0131r\u0131n, Pastane & Tatl\u0131", emoji: "\ud83e\udd50" },
    "oto_servis,_bakim_&_lastik": { label: "Oto Servis, Bak\u0131m & Lastik", emoji: "\ud83d\udd27" },
    "kafe_&_kahve": { label: "Kafe & Kahve", emoji: "\u2615" },
    restoran: { label: "Restoran", emoji: "\ud83c\udf7d\ufe0f" },
    oto_galeri: { label: "Oto Galeri", emoji: "\ud83d\ude97" },
};

export function normalizeCategoryId(category: string): string {
    return category
        .trim()
        .toLocaleLowerCase("tr-TR")
        .replaceAll("\u00e7", "c")
        .replaceAll("\u011f", "g")
        .replaceAll("\u0131", "i")
        .replaceAll("\u00f6", "o")
        .replaceAll("\u015f", "s")
        .replaceAll("\u00fc", "u")
        .replace(/\s+/g, "_");
}

export function resolveCategoryMetadata(category: string): CategoryMetadata {
    const id = normalizeCategoryId(category);
    const canonical = CANONICAL_CATEGORIES[id];

    if (canonical) {
        return { id, ...canonical };
    }

    const normalizedLabel = id.replaceAll("_", " ");
    const exactEmoji = FALLBACK_EMOJIS[normalizedLabel];
    const fuzzyEmoji = Object.entries(FALLBACK_EMOJIS).find(([key]) => (
        normalizedLabel.includes(key) || key.includes(normalizedLabel)
    ))?.[1];

    return {
        id,
        label: category,
        emoji: exactEmoji || fuzzyEmoji || FALLBACK_EMOJIS.other,
    };
}
