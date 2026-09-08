import type { KesfetPublicBusiness } from "../repositories/businesses.types";
import { normalizeSearchText } from "../repositories/businesses.types";
import { rankToshiCandidates, type ToshiCandidate } from "./candidates";
import type { ToshiChatReply, ToshiChatRequest, ToshiRecommendation } from "./contracts";
import type { ToshiModel, ToshiModelResult } from "./model";

interface ToshiServiceDependencies {
    businesses: readonly KesfetPublicBusiness[];
    model?: ToshiModel;
    safetyIdentifier?: string;
    onModelError?: (error: unknown) => void;
}

const OUT_OF_SCOPE_PATTERNS = [
    "yatirim tavsiyesi",
    "hangi hisse",
    "hangi kripto",
    "ilac dozu",
    "hangi ilaci",
    "teshis koy",
    "hukuki gorus ver",
];

export async function createToshiReply(
    input: ToshiChatRequest,
    dependencies: ToshiServiceDependencies,
): Promise<ToshiChatReply> {
    const immediateReply = createImmediateToshiReply(input);
    if (immediateReply) return immediateReply;

    const latestQuery = input.messages.at(-1)?.content ?? "";

    const candidates = rankToshiCandidates(
        dependencies.businesses,
        input.context,
        latestQuery,
    );

    if (!dependencies.model) return createFallbackReply(candidates, input.context.city);

    try {
        const modelResult = await dependencies.model.generate({
            candidates,
            context: input.context,
            messages: input.messages,
            safetyIdentifier: dependencies.safetyIdentifier ?? "anonymous",
        });
        return hydrateModelReply(modelResult, candidates);
    } catch (error) {
        dependencies.onModelError?.(error);
        return createFallbackReply(candidates, input.context.city);
    }
}

export function createImmediateToshiReply(input: ToshiChatRequest): ToshiChatReply | null {
    const latestQuery = input.messages.at(-1)?.content ?? "";
    const supportReply = getBuiltInSupportReply(latestQuery);
    if (supportReply) return supportReply;

    return isClearlyOutOfScope(latestQuery)
        ? {
            message: "Ben yerel keşif ve Tık Profil desteği için buradayım. İşletme, rota, sipariş veya rezervasyon konusunda yardımcı olabilirim.",
            recommendations: [],
            source: "fallback",
        }
        : null;
}

function hydrateModelReply(
    result: ToshiModelResult,
    candidates: readonly ToshiCandidate[],
): ToshiChatReply {
    const candidateById = new Map(candidates.map((candidate) => [candidate.id, candidate]));
    const seen = new Set<string>();
    const recommendations: ToshiRecommendation[] = [];

    for (const selection of result.recommendations) {
        const candidate = candidateById.get(selection.id);
        if (!candidate || seen.has(candidate.id)) continue;
        seen.add(candidate.id);
        recommendations.push(toRecommendation(candidate, selection.reason));
    }

    return {
        message: result.message,
        recommendations,
        source: "ai",
    };
}

function createFallbackReply(
    candidates: readonly ToshiCandidate[],
    city: string,
): ToshiChatReply {
    if (!candidates.length) {
        return {
            message: `${city} içinde bu isteğe uygun bir Tık Profil işletmesi bulamadım. Kategori veya mesafeyi değiştirip tekrar deneyebilirsin.`,
            recommendations: [],
            source: "fallback",
        };
    }

    return {
        message: "Tık Profil'deki güncel işletmeler arasından sana uygun seçenekleri buldum.",
        recommendations: candidates.slice(0, 3).map((candidate) => toRecommendation(
            candidate,
            candidate.distance === null
                ? `${candidate.categoryLabel} kategorisinde öne çıkan seçenek.`
                : `${candidate.distance.toLocaleString("tr-TR")} km mesafede bir seçenek.`,
        )),
        source: "fallback",
    };
}

function toRecommendation(candidate: ToshiCandidate, reason: string): ToshiRecommendation {
    return {
        categoryLabel: candidate.categoryLabel,
        city: candidate.city,
        coverImage: candidate.coverImage,
        distance: candidate.distance,
        district: candidate.district,
        id: candidate.id,
        logoUrl: candidate.logoUrl,
        name: candidate.name,
        rating: candidate.rating,
        reason,
        reviewCount: candidate.reviewCount,
        slug: candidate.slug,
    };
}

function isClearlyOutOfScope(query: string): boolean {
    const normalized = normalizeSearchText(query);
    return OUT_OF_SCOPE_PATTERNS.some((pattern) => normalized.includes(pattern));
}

function getBuiltInSupportReply(query: string): ToshiChatReply | null {
    const normalized = normalizeSearchText(query);
    let message: string | null = null;

    if (normalized.includes("favori")) {
        message = "Bir işletmeyi favorilerine eklemek için profilindeki kalp simgesine dokun. Kaydettiklerin alt menüdeki Favoriler sekmesinde görünür.";
    } else if (normalized.includes("siparis")) {
        message = "Sipariş özelliği açık bir işletmenin profilinde Sipariş Ver alanını aç, ürünlerini seç ve sepetten teslimat adımını tamamla.";
    } else if (normalized.includes("rezervasyon")) {
        message = "Rezervasyon destekleyen işletmenin profilinde Rezervasyon Yap seçeneğine dokun; tarih, saat ve gerekli bilgileri seçerek talebini gönder.";
    } else if (normalized.includes("konum") && (
        normalized.includes("izin")
        || normalized.includes("degistir")
        || normalized.includes("nasil")
    )) {
        message = "Ana sayfadaki konum alanından şehri seçebilirsin. Yakındaki işletmeleri görmek için cihaz ayarlarından Tık Profil'e konum izni ver.";
    } else if (
        normalized.includes("giris")
        || normalized.includes("hesap olustur")
        || normalized.includes("kayit ol")
    ) {
        message = "Alt menüdeki Hesabım sekmesini aç. Buradan giriş yapabilir veya yeni hesabını oluşturabilirsin.";
    }

    return message ? { message, recommendations: [], source: "fallback" } : null;
}
