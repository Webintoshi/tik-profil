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
    eczane: { label: "Eczane", emoji: "\ud83d\udc8a" },
    "spor_salonu_&_fitness": { label: "Spor Salonu & Fitness", emoji: "\ud83c\udfcb\ufe0f" },
    "egitim,_kurs_&_surucu_kursu": { label: "E\u011fitim, Kurs & S\u00fcr\u00fcc\u00fc Kursu", emoji: "\ud83d\udcda" },
    "giyim,_ayakkabi_&_butik": { label: "Giyim, Ayakkab\u0131 & Butik", emoji: "\ud83d\udc57" },
    "mobilya_&_ev_dekorasyonu": { label: "Mobilya & Ev Dekorasyonu", emoji: "\ud83d\udecb\ufe0f" },
    "elektronik,_telefon_&_bilgisayar": { label: "Elektronik, Telefon & Bilgisayar", emoji: "\ud83d\udcf1" },
    "yapi_market_&_insaat_malzemeleri": { label: "Yap\u0131 Market & \u0130n\u015faat Malzemeleri", emoji: "\ud83e\uddf1" },
    "cicekci,_hediyelik_&_kirtasiye": { label: "\u00c7i\u00e7ek\u00e7i, Hediyelik & K\u0131rtasiye", emoji: "\ud83c\udf38" },
    "temizlik,_camasirhane_&_kuru_temizleme": { label: "Temizlik, \u00c7ama\u015f\u0131rhane & Kuru Temizleme", emoji: "\ud83e\uddfa" },
    "dugun_salonu_&_organizasyon": { label: "D\u00fc\u011f\u00fcn Salonu & Organizasyon", emoji: "\ud83c\udf89" },
    "avukat,_muhasebe_&_danismanlik": { label: "Avukat, Muhasebe & Dan\u0131\u015fmanl\u0131k", emoji: "\ud83d\udcbc" },
    "fotografci_&_produksiyon": { label: "Foto\u011fraf\u00e7\u0131 & Prod\u00fcksiyon", emoji: "\ud83d\udcf7" },
    akaryakit_istasyonu: { label: "Akaryak\u0131t \u0130stasyonu", emoji: "\u26fd" },
    "kargo,_kurye_&_lojistik": { label: "Kargo, Kurye & Lojistik", emoji: "\ud83d\udce6" },
    "oto_yikama_&_detayli_temizlik": { label: "Oto Y\u0131kama & Detayl\u0131 Temizlik", emoji: "\ud83e\uddfd" },
};

const CATEGORY_ID_ALIASES: Record<string, string> = {
    restaurant: "restoran",
    cafe: "kafe_&_kahve",
    coffee: "kafe_&_kahve",
    kahve_shop: "kafe_&_kahve",
    kahve_dukkani: "kafe_&_kahve",
    "kahve_dukkani_&_kafe": "kafe_&_kahve",
    "kahve_d\ufffdkkani_&_kafe": "kafe_&_kahve",
    beauty: "guzellik_&_kuafor",
    guzellik: "guzellik_&_kuafor",
    kuafor: "guzellik_&_kuafor",
    real_estate: "emlak_&_gayrimenkul",
    emlak: "emlak_&_gayrimenkul",
    emlak_ofisi: "emlak_&_gayrimenkul",
    lodging: "otel_&_konaklama",
    hotel: "otel_&_konaklama",
    car_rental: "arac_kiralama",
    "ara\ufffd_kiralama": "arac_kiralama",
    healthcare: "klinik_&_saglik",
    health: "klinik_&_saglik",
    grocery: "market_&_bakkal",
    bakery: "firin,_pastane_&_tatli",
    auto_service: "oto_servis,_bakim_&_lastik",
    fastfood: "fast_food",
    "fast_food_(burger,pizza_ve_digerleri)": "fast_food",
    pharmacy: "eczane",
    fitness: "spor_salonu_&_fitness",
    education: "egitim,_kurs_&_surucu_kursu",
    fashion: "giyim,_ayakkabi_&_butik",
    furniture: "mobilya_&_ev_dekorasyonu",
    electronics: "elektronik,_telefon_&_bilgisayar",
    construction_supply: "yapi_market_&_insaat_malzemeleri",
    florist_stationery: "cicekci,_hediyelik_&_kirtasiye",
    cleaning_laundry: "temizlik,_camasirhane_&_kuru_temizleme",
    event_wedding: "dugun_salonu_&_organizasyon",
    professional_services: "avukat,_muhasebe_&_danismanlik",
    photography: "fotografci_&_produksiyon",
    gas_station: "akaryakit_istasyonu",
    logistics: "kargo,_kurye_&_lojistik",
    car_wash: "oto_yikama_&_detayli_temizlik",
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
    const normalizedId = normalizeCategoryId(category);
    const id = CATEGORY_ID_ALIASES[normalizedId] || normalizedId;
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
