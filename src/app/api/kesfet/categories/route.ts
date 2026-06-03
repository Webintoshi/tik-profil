import { NextResponse } from "next/server";
import { loadKesfetBusinesses, logKesfetPublicApiError } from "../shared";

export const dynamic = "force-dynamic";

const CATEGORY_EMOJIS: Record<string, string> = {
    fastfood: "\u{1F354}",
    restaurant: "\u{1F37D}\u{FE0F}",
    restoran: "\u{1F37D}\u{FE0F}",
    cafe: "\u{2615}",
    kafe: "\u{2615}",
    coffee: "\u{2615}",
    kahve: "\u{2615}",
    bar: "\u{1F378}",
    beauty: "\u{1F485}",
    guzellik: "\u{1F485}",
    kuafor: "\u{1F487}",
    salon: "\u{1F487}",
    spa: "\u{1F9D6}",
    health: "\u{1F48A}",
    saglik: "\u{1F48A}",
    eczane: "\u{1F48A}",
    fitness: "\u{1F3CB}\u{FE0F}",
    spor: "\u{26BD}",
    hotel: "\u{1F3E8}",
    otel: "\u{1F3E8}",
    pansiyon: "\u{1F3E1}",
    apart: "\u{1F3E2}",
    ecommerce: "\u{1F6D2}",
    market: "\u{1F6D2}",
    magaza: "\u{1F6CD}\u{FE0F}",
    giyim: "\u{1F457}",
    fashion: "\u{1F457}",
    moda: "\u{1F457}",
    elektronik: "\u{1F4F1}",
    technology: "\u{1F4BB}",
    emlak: "\u{1F3E0}",
    gayrimenkul: "\u{1F3E0}",
    oto: "\u{1F697}",
    auto: "\u{1F697}",
    tamir: "\u{1F527}",
    education: "\u{1F4DA}",
    egitim: "\u{1F4DA}",
    hukuk: "\u{2696}\u{FE0F}",
    danismanlik: "\u{1F4BC}",
    entertainment: "\u{1F3AC}",
    eglence: "\u{1F389}",
    sinema: "\u{1F3AC}",
    oyun: "\u{1F3AE}",
    other: "\u{1F4CD}",
};

function normalizeCategoryKey(category: string): string {
    return category
        .trim()
        .toLocaleLowerCase("tr-TR")
        .replaceAll("\u00E7", "c")
        .replaceAll("\u011F", "g")
        .replaceAll("\u0131", "i")
        .replaceAll("\u00F6", "o")
        .replaceAll("\u015F", "s")
        .replaceAll("\u00FC", "u");
}

function getCategoryEmoji(category: string): string {
    const lower = normalizeCategoryKey(category);

    if (CATEGORY_EMOJIS[lower]) {
        return CATEGORY_EMOJIS[lower];
    }

    for (const [key, emoji] of Object.entries(CATEGORY_EMOJIS)) {
        if (lower.includes(key) || key.includes(lower)) {
            return emoji;
        }
    }

    return CATEGORY_EMOJIS.other;
}

export async function GET() {
    try {
        const activeBusinesses = await loadKesfetBusinesses();
        const categoryCounts: Record<string, { label: string; count: number }> = {};

        activeBusinesses.forEach((business) => {
            const label = business.categoryLabel || business.category || business.industryId || "Diger";
            const key = normalizeCategoryKey(label).replace(/\s+/g, "_");

            if (!categoryCounts[key]) {
                categoryCounts[key] = { label, count: 0 };
            }
            categoryCounts[key].count++;
        });

        const categories = Object.entries(categoryCounts)
            .filter(([, data]) => data.count > 0)
            .map(([id, data]) => ({
                id,
                label: data.label,
                emoji: getCategoryEmoji(data.label),
                count: data.count,
            }))
            .sort((a, b) => b.count - a.count);

        return NextResponse.json({
            success: true,
            categories,
            total: activeBusinesses.length,
        });
    } catch (error) {
        logKesfetPublicApiError("/api/kesfet/categories", error);
        return NextResponse.json({
            success: true,
            categories: [],
            total: 0,
        });
    }
}
