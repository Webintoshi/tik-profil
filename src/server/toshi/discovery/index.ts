import { z } from "zod";
import { rankToshiCandidates } from "../candidates";
import type { ToshiDiscoveryContext } from "../contracts";
import { normalizeSearchText, type KesfetPublicBusiness } from "../../repositories/businesses.types";
import type { CityEventsPage, EventCategory } from "../../city-events/contracts";
import { isOfficialDiscoveryUrl } from "./official-search";

export interface DiscoveryCard {
    id: string;
    kind: "business" | "event" | "guide" | "category" | "source";
    title: string;
    description?: string;
    type?: "navigation";
    href?: string;
    sourceUrl?: string;
    distanceKm?: number | null;
    imageUrl?: string;
}
export interface DiscoverySavedContext { resultIds: string[]; selectedId?: string; query?: string }
export interface DiscoveryGuide { id: string; slug: string; title: string; excerpt?: string; imageUrl?: string; city?: string; routeStops?: readonly { name: string; note?: string }[] }
export interface DiscoveryCategory { id: string; slug: string; label: string }
export interface DiscoveryMenuItem { id: string; name: string; price?: number; currency?: string }
export interface OfficialSearchResult { status: "ready" | "unavailable"; message: string; sources: { title: string; url: string }[] }
export type OfficialTopic = "events" | "cinema" | "places" | "transport" | "weather";
export interface DiscoveryDependencies {
    loadBusinesses: () => Promise<readonly KesfetPublicBusiness[]>;
    loadEvents?: (query: { city: string; category?: EventCategory; date?: string; limit: number }) => Promise<CityEventsPage>;
    loadGuides?: () => Promise<readonly DiscoveryGuide[]>;
    loadCategories?: () => Promise<readonly DiscoveryCategory[]>;
    loadMenu?: (business: KesfetPublicBusiness) => Promise<readonly DiscoveryMenuItem[]>;
    searchOfficial?: (input: { city: string; topic: OfficialTopic }) => Promise<OfficialSearchResult>;
}
const text = z.string().trim().min(1).max(200);
const searchSchema = z.object({ query: text, sort: z.enum(["relevance", "distance"]).default("relevance") }).strict();
const selectSchema = z.object({ reference: text }).strict();
const eventSchema = z.object({ category: z.enum(["sinema", "tiyatro", "konser", "cocuk"]).nullable(), date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable() }).strict();
const officialSchema = z.object({ topic: z.enum(["events", "cinema", "places", "transport", "weather"]) }).strict();
const emptySchema = z.object({}).strict();
const definition = (name: string, description: string, properties: Record<string, unknown>) => ({
    type: "function" as const, name, description, strict: true,
    parameters: { type: "object", additionalProperties: false, properties, required: Object.keys(properties) },
});
const stringProperty = { type: "string", minLength: 1, maxLength: 200 };
function publicImage(value: string | null | undefined): string | undefined {
    if (!value) return undefined;
    try { const url = new URL(value); return url.protocol === "https:" && !url.username && !url.password ? url.href : undefined; } catch { return undefined; }
}

/** Per-request read-only tool scope. Never share instances between users. */
export function create360DiscoveryTools(deps: DiscoveryDependencies, input: { context: ToshiDiscoveryContext; saved?: DiscoverySavedContext }) {
    let businessesPromise: Promise<readonly KesfetPublicBusiness[]> | undefined;
    const businesses = () => businessesPromise ??= deps.loadBusinesses();
    const cards = new Map<string, DiscoveryCard>();
    const sources = new Map<string, { title: string; url: string }>();
    const saved: DiscoverySavedContext = { resultIds: input.saved?.resultIds.slice(0, 8) ?? [], selectedId: input.saved?.selectedId ?? input.context.businessSlug, query: input.saved?.query?.slice(0, 200) };
    const remember = (results: DiscoveryCard[]) => {
        for (const card of results) cards.set(card.id, card);
        saved.resultIds = results.map(card => card.id);
        return results;
    };
    const businessCard = (b: KesfetPublicBusiness, distanceKm: number | null = null): DiscoveryCard => ({
        id: b.id, kind: "business", title: b.name,
        description: [b.categoryLabel, b.district].filter(Boolean).join(" · "),
        href: `/business/${encodeURIComponent(b.slug)}`, distanceKm,
        ...(publicImage(b.coverImage) ? { imageUrl: publicImage(b.coverImage) } : {}),
    });
    function requestedReference(reference: string) {
        const normalized = normalizeSearchText(reference);
        const index = /\b(ikinci|ikincisi|2)\b/.test(normalized) ? 1
            : /\b(ucuncu|ucuncusu|3)\b/.test(normalized) ? 2
                : /\b(dorduncu|dorduncusu|4)\b/.test(normalized) ? 3
                    : /\b(ilk|birinci|birincisi|1)\b/.test(normalized) ? 0 : -1;
        return index >= 0 ? saved.resultIds[index]
            : ["bu", "bunun", "orasi", "secili"].includes(normalized) ? saved.selectedId : reference;
    }
    async function resolve(reference: string) {
        const normalized = normalizeSearchText(reference);
        const requestedId = requestedReference(reference);
        const all = await businesses();
        const entity = all.find(b => b.id === requestedId || b.slug === requestedId)
            ?? all.find(b => normalizeSearchText(b.name) === normalized);
        if (!entity) return undefined;
        saved.selectedId = entity.id;
        cards.set(entity.id, businessCard(entity));
        return entity;
    }
    async function resolveCard(reference: string): Promise<DiscoveryCard | undefined> {
        const entity = await resolve(reference);
        if (entity) return cards.get(entity.id);
        const id = requestedReference(reference);
        if (!id) return undefined;
        // Re-read the public source: saved client context never authorizes a fabricated card.
        if (deps.loadGuides) {
            const guide = (await deps.loadGuides()).find(g => g.id === id);
            if (guide) {
                const card: DiscoveryCard = { id: guide.id, kind: "guide", title: guide.title, href: `/guide/${encodeURIComponent(guide.slug)}`, description: guide.excerpt?.slice(0, 300), imageUrl: publicImage(guide.imageUrl) };
                cards.set(card.id, card);
                saved.selectedId = card.id;
                return card;
            }
        }
        if (deps.loadEvents) {
            const page = await deps.loadEvents({ city: input.context.city, limit: 50 });
            const event = page.events.find(e => e.id === id);
            if (event) {
                const card: DiscoveryCard = { id: event.id, kind: "event", title: event.title, href: "/events", sourceUrl: event.sourceUrl, description: event.sessions[0]?.venueName, imageUrl: publicImage(event.imageUrl) };
                cards.set(card.id, card);
                sources.set(event.sourceUrl, { title: event.title, url: event.sourceUrl });
                saved.selectedId = card.id;
                return card;
            }
        }
        return undefined;
    }
    const handlers: Record<string, (args: unknown) => Promise<unknown>> = {
        async search_businesses(args) {
            const parsed = searchSchema.parse(args);
            const alternative = /baska|alternatif|begenmedim|bunlar olmasin|farkli/.test(normalizeSearchText(parsed.query));
            if (alternative && !saved.query) return { status: "not-found", results: [] };
            const query = (alternative || /daha yakin|yakin olan/.test(normalizeSearchText(parsed.query))) && saved.query ? saved.query : parsed.query;
            const results = rankToshiCandidates(await businesses(), input.context, query, 30).filter(b => !alternative || !saved.resultIds.includes(b.id));
            if (parsed.sort === "distance" || /daha yakin/.test(normalizeSearchText(parsed.query))) {
                if (!input.context.coordinates) return { status: "location-needed", message: "Yakınlık karşılaştırması için konum izni gerekli.", results: [] };
                results.sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity));
            }
            saved.query = query;
            const selected = results.slice(0, 3);
            return { status: selected.length ? "ready" : "empty", results: remember(selected.map(b => businessCard(b, b.distance))), facts: selected.map(b => ({ id: b.id, rating: b.rating, reviewCount: b.reviewCount })) };
        },
        async select_result(args) {
            const card = await resolveCard(selectSchema.parse(args).reference);
            return card ? { status: "ready", result: card } : { status: "not-found", message: "Önceki seçimi doğrulayamadım; kaydın adını belirt." };
        },
        async get_menu(args) {
            const entity = await resolve(selectSchema.parse(args).reference);
            if (!entity) return { status: "not-found", message: "Önce bir işletme seç." };
            if (!deps.loadMenu) return { status: "unavailable", message: "Bu işletmenin menüsüne şu anda erişilemiyor.", result: cards.get(entity.id) };
            const items = (await deps.loadMenu(entity)).slice(0, 25).map(item => ({ id: item.id, name: item.name, price: item.price, currency: item.currency }));
            return { status: items.length ? "ready" : "empty", result: cards.get(entity.id), items };
        },
        async get_route(args) {
            const card = await resolveCard(selectSchema.parse(args).reference);
            return card ? { status: "ready", result: card, message: card.kind === "guide" ? "Rehberdeki durakları ve rota bilgisini inceleyebilirsin. Canlı trafik verisi alınmadı." : "Profil veya etkinlik sayfasındaki konum bilgisini kullan. Yolculuk süresi veya trafik verisi alınmadı." } : { status: "not-found" };
        },
        async search_events(args) {
            const parsed = eventSchema.parse(args);
            if (!deps.loadEvents) return { status: "unavailable", message: "Etkinlik kaynağına erişilemiyor." };
            const page = await deps.loadEvents({ city: input.context.city, category: parsed.category ?? undefined, date: parsed.date ?? undefined, limit: 8 });
            for (const event of page.events.slice(0, 8)) sources.set(event.sourceUrl, { title: event.title, url: event.sourceUrl });
            const results = page.events.slice(0, 8).map(event => ({ id: event.id, kind: "event" as const, title: event.title, href: "/events", sourceUrl: event.sourceUrl, description: event.sessions[0]?.venueName, imageUrl: publicImage(event.imageUrl) }));
            return { status: page.status, stale: page.stale, updatedAt: page.updatedAt, results: remember(results), sessions: page.events.slice(0, 8).map(event => ({ id: event.id, sessions: event.sessions.slice(0, 5) })) };
        },
        async search_guides(args) {
            const { reference } = selectSchema.parse(args);
            if (!deps.loadGuides) return { status: "unavailable", message: "Şehir rehberlerine erişilemiyor." };
            const query = normalizeSearchText(reference);
            const allGuides = ["tum", "tumu", "hepsi", "rehber", "sehir rehberi", "gezi", "rota", "gezi rotasi"].includes(query);
            const results = (await deps.loadGuides()).filter(g => (!g.city || normalizeSearchText(g.city) === normalizeSearchText(input.context.city)) && (allGuides || normalizeSearchText(`${g.title} ${g.excerpt ?? ""}`).includes(query))).slice(0, 6);
            return { status: results.length ? "ready" : "empty", results: remember(results.map(g => ({ id: g.id, kind: "guide", title: g.title, href: `/guide/${encodeURIComponent(g.slug)}`, description: g.excerpt?.slice(0, 300), imageUrl: publicImage(g.imageUrl) }))), routes: results.map(g => ({ id: g.id, stops: g.routeStops?.slice(0, 12).map(s => ({ name: s.name, note: s.note?.slice(0, 300) })) })) };
        },
        async list_categories(args) {
            emptySchema.parse(args);
            if (!deps.loadCategories) return { status: "unavailable", message: "Kategorilere erişilemiyor." };
            return { status: "ready", results: remember((await deps.loadCategories()).slice(0, 30).map(c => ({ id: c.id, kind: "category", title: c.label, href: `/category/${encodeURIComponent(c.slug)}` }))) };
        },
        async search_official_sources(args) {
            const { topic } = officialSchema.parse(args);
            if (!deps.searchOfficial) return { status: "unavailable", message: "Resmî dış kaynak araması şu anda kullanılamıyor.", sources: [] };
            const result = await deps.searchOfficial({ city: input.context.city, topic });
            if (result.status !== "ready" || !result.sources.length || result.sources.some(source => !isOfficialDiscoveryUrl(source.url))) {
                return { status: "unavailable", message: "Resmî kaynaklar doğrulanamadı.", sources: [] };
            }
            for (const source of result.sources) {
                sources.set(source.url, source);
                cards.set(source.url, { id: source.url, kind: "source", title: source.title, sourceUrl: source.url, href: source.url });
            }
            return result;
        },
    };
    return {
        definitions: [
            definition("search_businesses", "Şehir ve yarıçap içindeki gerçek işletmeleri bul. Daha yakın isteğinde önceki sorguyu korur.", { query: stringProperty, sort: { type: "string", enum: ["relevance", "distance"] } }),
            definition("select_result", "Önceki sonuçta ikincisi/bu gibi seçimi veya gerçek işletme kimliğini çöz.", { reference: stringProperty }),
            definition("get_menu", "Seçilen gerçek işletmenin mevcut menü verisini oku; sipariş vermez.", { reference: stringProperty }),
            definition("get_route", "Gerçek işletmenin yol tarifine ulaşılacak profil kartını getir.", { reference: stringProperty }),
            definition("search_events", "Yayımlanmış güncel etkinlik ve sinema seanslarını getir.", { category: { type: ["string", "null"], enum: ["sinema", "tiyatro", "konser", "cocuk", null] }, date: { type: ["string", "null"] } }),
            definition("search_guides", "Yayımlanmış şehir rehberleri ve gezi rotalarını başlıkla ara.", { reference: stringProperty }),
            definition("list_categories", "Uygulamadaki gerçek kategori sayfalarını getir.", {}),
            definition("search_official_sources", "Yalnızca resmî kaynaklarda şehir düzeyinde güncel bilgi ara; kişisel veri gönderilmez.", { topic: { type: "string", enum: ["events", "cinema", "places", "transport", "weather"] } }),
        ],
        async execute(name: string, args: unknown): Promise<unknown> {
            if (!Object.hasOwn(handlers, name)) return { status: "unsupported", message: "Bu araç desteklenmiyor." };
            try { return await handlers[name]!(args); }
            catch (error) { return { status: error instanceof z.ZodError ? "invalid-input" : "unavailable", message: "Veri doğrulanamadı veya kaynağa erişilemedi. Sonuç uydurulmadı." }; }
        },
        getCards: () => [...cards.values()].map(card => ({ ...card, type: "navigation" as const })),
        getSources: () => [...sources.values()].slice(0, 12),
        getContext: (displayedIds?: readonly string[]): DiscoverySavedContext => ({ ...saved, resultIds: displayedIds ? [...new Set(displayedIds)].filter(id => cards.has(id)).slice(0, 8) : [...saved.resultIds] }),
    };
}

export { createOfficialDiscoverySearch } from "./official-search";
export { run360DiscoveryModel } from "./orchestrator";
