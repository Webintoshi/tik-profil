import { pathToFileURL } from "node:url";

export const PUBLIC_SECTORS = Object.freeze([
    { id: "guzellik_&_kuafor", label: "G\u00fczellik & Kuaf\u00f6r" },
    { id: "emlak_&_gayrimenkul", label: "Emlak & Gayrimenkul" },
    { id: "otel_&_konaklama", label: "Otel & Konaklama" },
    { id: "arac_kiralama", label: "Ara\u00e7 Kiralama" },
    { id: "klinik_&_saglik", label: "Klinik & Sa\u011fl\u0131k" },
    { id: "market_&_bakkal", label: "Market & Bakkal" },
    { id: "firin,_pastane_&_tatli", label: "F\u0131r\u0131n, Pastane & Tatl\u0131" },
    { id: "oto_servis,_bakim_&_lastik", label: "Oto Servis, Bak\u0131m & Lastik" },
    { id: "eczane", label: "Eczane" },
    { id: "spor_salonu_&_fitness", label: "Spor Salonu & Fitness" },
    { id: "egitim,_kurs_&_surucu_kursu", label: "E\u011fitim, Kurs & S\u00fcr\u00fcc\u00fc Kursu" },
    { id: "giyim,_ayakkabi_&_butik", label: "Giyim, Ayakkab\u0131 & Butik" },
    { id: "mobilya_&_ev_dekorasyonu", label: "Mobilya & Ev Dekorasyonu" },
    { id: "elektronik,_telefon_&_bilgisayar", label: "Elektronik, Telefon & Bilgisayar" },
    { id: "yapi_market_&_insaat_malzemeleri", label: "Yap\u0131 Market & \u0130n\u015faat Malzemeleri" },
    { id: "cicekci,_hediyelik_&_kirtasiye", label: "\u00c7i\u00e7ek\u00e7i, Hediyelik & K\u0131rtasiye" },
    { id: "temizlik,_camasirhane_&_kuru_temizleme", label: "Temizlik, \u00c7ama\u015f\u0131rhane & Kuru Temizleme" },
    { id: "dugun_salonu_&_organizasyon", label: "D\u00fc\u011f\u00fcn Salonu & Organizasyon" },
    { id: "avukat,_muhasebe_&_danismanlik", label: "Avukat, Muhasebe & Dan\u0131\u015fmanl\u0131k" },
    { id: "fotografci_&_produksiyon", label: "Foto\u011fraf\u00e7\u0131 & Prod\u00fcksiyon" },
    { id: "akaryakit_istasyonu", label: "Akaryak\u0131t \u0130stasyonu" },
    { id: "kargo,_kurye_&_lojistik", label: "Kargo, Kurye & Lojistik" },
    { id: "oto_yikama_&_detayli_temizlik", label: "Oto Y\u0131kama & Detayl\u0131 Temizlik" },
]);

async function fetchJson(fetchImpl, url) {
    const response = await fetchImpl(url);
    if (!response.ok) throw new Error(`http_${response.status}:${url}`);
    return response.json();
}

function shouldRetryProfileResponse(status) {
    return status === 408 || status === 429 || status >= 500;
}

async function auditProfiles({
    baseUrl,
    businesses,
    fetchImpl,
    concurrency,
    profileRetries,
    retryDelayMs,
}) {
    let nextIndex = 0;
    let ok = 0;
    const failures = [];
    const workers = Array.from({ length: Math.min(concurrency, businesses.length) }, async () => {
        while (nextIndex < businesses.length) {
            const business = businesses[nextIndex++];
            let lastFailure;
            for (let attempt = 0; attempt <= profileRetries; attempt++) {
                try {
                    const response = await fetchImpl(`${baseUrl}/${encodeURIComponent(business.slug)}`, {
                        method: "HEAD",
                        redirect: "manual",
                    });
                    if (response.status === 200) {
                        ok++;
                        lastFailure = null;
                        break;
                    }
                    lastFailure = { slug: business.slug, status: response.status };
                    if (!shouldRetryProfileResponse(response.status)) break;
                } catch (error) {
                    lastFailure = {
                        slug: business.slug,
                        error: error instanceof Error ? error.message : String(error),
                    };
                }
                if (attempt < profileRetries && retryDelayMs > 0) {
                    await new Promise((resolve) => setTimeout(resolve, retryDelayMs * (attempt + 1)));
                }
            }
            if (lastFailure) failures.push(lastFailure);
        }
    });
    await Promise.all(workers);
    return { ok, failures };
}

export async function auditPublicSectors({
    baseUrl = "https://tikprofil.com",
    sectors = PUBLIC_SECTORS,
    fetchImpl = fetch,
    concurrency = 12,
    profileRetries = 2,
    retryDelayMs = 400,
} = {}) {
    const normalizedBaseUrl = baseUrl.replace(/\/$/, "");
    const categoryData = await fetchJson(
        fetchImpl,
        `${normalizedBaseUrl}/api/kesfet/categories?city=Ordu`,
    );
    const categories = new Map((categoryData.categories || []).map((category) => [category.id, category]));
    const reports = [];

    for (const sector of sectors) {
        const category = categories.get(sector.id);
        if (!category) throw new Error(`missing_public_category:${sector.id}`);
        const query = new URLSearchParams({ city: "Ordu", category: sector.id, limit: "500" });
        const listing = await fetchJson(fetchImpl, `${normalizedBaseUrl}/api/kesfet?${query}`);
        const businesses = Array.isArray(listing.businesses) ? listing.businesses : [];
        const profileAudit = await auditProfiles({
            baseUrl: normalizedBaseUrl,
            businesses,
            fetchImpl,
            concurrency,
            profileRetries,
            retryDelayMs,
        });
        const uniqueIds = new Set(businesses.map((business) => business.id));
        const uniqueSlugs = new Set(businesses.map((business) => business.slug));
        const missingRequiredFields = businesses.filter((business) => (
            !business.id
            || !business.slug
            || !business.name
            || !Number.isFinite(business.lat)
            || !Number.isFinite(business.lng)
        )).length;

        reports.push({
            id: sector.id,
            label: category.label,
            categoryCount: category.count,
            apiTotal: listing.total,
            loaded: businesses.length,
            uniqueIds: uniqueIds.size,
            uniqueSlugs: uniqueSlugs.size,
            withPhoto: businesses.filter((business) => Boolean(business.logoUrl)).length,
            missingRequiredFields,
            profilesOk: profileAudit.ok,
            profileFailures: profileAudit.failures,
        });
    }

    return {
        ok: reports.every((report) => (
            report.categoryCount === report.apiTotal
            && report.apiTotal === report.loaded
            && report.loaded === report.uniqueIds
            && report.loaded === report.uniqueSlugs
            && report.missingRequiredFields === 0
            && report.profilesOk === report.loaded
            && report.profileFailures.length === 0
        )),
        totals: reports.reduce((totals, report) => ({
            businesses: totals.businesses + report.loaded,
            withPhoto: totals.withPhoto + report.withPhoto,
            profilesOk: totals.profilesOk + report.profilesOk,
            profileFailures: totals.profileFailures + report.profileFailures.length,
        }), { businesses: 0, withPhoto: 0, profilesOk: 0, profileFailures: 0 }),
        sectors: reports,
    };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    const report = await auditPublicSectors();
    console.log(JSON.stringify(report));
    if (!report.ok) process.exitCode = 1;
}
