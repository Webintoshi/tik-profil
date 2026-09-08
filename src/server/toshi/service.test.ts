import assert from "node:assert/strict";
import test from "node:test";

import { createToshiReply } from "./service.ts";
import type { ToshiModel } from "./model.ts";
import type { KesfetPublicBusiness } from "../repositories/businesses.types.ts";

const businesses: KesfetPublicBusiness[] = [
    {
        category: "cafe",
        categoryLabel: "Kahve Shop",
        city: "Ordu",
        coverImage: "https://cdn.example.com/sahil.jpg",
        createdAt: null,
        distance: null,
        district: "Altınordu",
        id: "cafe-1",
        industryId: "cafe",
        lat: 40.9839,
        lng: 37.8764,
        logoUrl: "https://cdn.example.com/sahil-logo.jpg",
        name: "Sahil Kahve",
        rating: 4.8,
        reviewCount: 120,
        slug: "sahil-kahve",
    },
    {
        category: "fastfood",
        categoryLabel: "Fast Food",
        city: "Ordu",
        coverImage: null,
        createdAt: null,
        distance: null,
        district: "Altınordu",
        id: "burger-1",
        industryId: "fastfood",
        lat: 40.99,
        lng: 37.88,
        logoUrl: null,
        name: "Ordu Burger",
        rating: 4.5,
        reviewCount: 80,
        slug: "ordu-burger",
    },
];

const request = {
    context: {
        city: "Ordu",
        coordinates: { lat: 40.9839, lng: 37.8764 },
        radiusKm: 5,
    },
    messages: [{ role: "user" as const, content: "Yakınımda kahve içmek istiyorum" }],
};

test("hydrates only authoritative candidate IDs returned by the model", async () => {
    const model: ToshiModel = {
        async generate() {
            return {
                message: "Sana iki seçenek buldum.",
                recommendations: [
                    { id: "cafe-1", reason: "Yakın ve kahve odaklı." },
                    { id: "invented-business", reason: "Gerçekte yok." },
                ],
            };
        },
    };

    const reply = await createToshiReply(request, { businesses, model });

    assert.equal(reply.source, "ai");
    assert.deepEqual(reply.recommendations.map((item) => item.id), ["cafe-1"]);
    assert.equal(reply.recommendations[0]?.name, "Sahil Kahve");
    assert.equal(reply.recommendations[0]?.slug, "sahil-kahve");
    assert.equal(reply.recommendations[0]?.distance, 0);
});

test("falls back to deterministic live candidates when the provider fails", async () => {
    const model: ToshiModel = {
        async generate() {
            throw new Error("provider unavailable");
        },
    };

    const reply = await createToshiReply(request, { businesses, model });

    assert.equal(reply.source, "fallback");
    assert.equal(reply.recommendations[0]?.id, "cafe-1");
    assert.match(reply.message, /Tık Profil/i);
});

test("uses fallback without attempting a provider when no model is configured", async () => {
    const reply = await createToshiReply(request, { businesses });

    assert.equal(reply.source, "fallback");
    assert.ok(reply.recommendations.length > 0);
});

test("keeps unrelated high-stakes advice outside Toshi scope", async () => {
    let modelCalls = 0;
    const model: ToshiModel = {
        async generate() {
            modelCalls += 1;
            return { message: "", recommendations: [] };
        },
    };

    const reply = await createToshiReply({
        ...request,
        messages: [{ role: "user", content: "Hangi hisse senedine yatırım yapmalıyım?" }],
    }, { businesses, model });

    assert.equal(modelCalls, 0);
    assert.equal(reply.recommendations.length, 0);
    assert.match(reply.message, /yerel keşif/i);
});

test("answers common Tık Profil support questions without inventing businesses", async () => {
    const reply = await createToshiReply({
        ...request,
        messages: [{ role: "user", content: "Bir işletmeyi favorilerime nasıl eklerim?" }],
    }, { businesses });

    assert.equal(reply.source, "fallback");
    assert.equal(reply.recommendations.length, 0);
    assert.match(reply.message, /kalp/i);
    assert.match(reply.message, /Favoriler/i);
});
