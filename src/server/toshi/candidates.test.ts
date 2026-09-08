import assert from "node:assert/strict";
import test from "node:test";

import { parseToshiChatRequest } from "./contracts.ts";
import { rankToshiCandidates } from "./candidates.ts";
import type { KesfetPublicBusiness } from "../repositories/businesses.types.ts";

function business(
    id: string,
    overrides: Partial<KesfetPublicBusiness> = {},
): KesfetPublicBusiness {
    return {
        category: "other",
        categoryLabel: "Diğer",
        city: "Ordu",
        coverImage: null,
        createdAt: null,
        distance: null,
        district: "Altınordu",
        id,
        industryId: "other",
        lat: 40.9839,
        lng: 37.8764,
        logoUrl: null,
        name: `İşletme ${id}`,
        rating: null,
        reviewCount: null,
        slug: `isletme-${id}`,
        ...overrides,
    };
}

test("parses a bounded Toshi conversation and normalizes context", () => {
    const result = parseToshiChatRequest({
        context: {
            city: "  Ordu  ",
            coordinates: { lat: 40.9839, lng: 37.8764 },
            radiusKm: 7,
        },
        messages: [
            { role: "assistant", content: "Merhaba" },
            { role: "user", content: "Yakınımda kahve içebileceğim bir yer öner." },
        ],
    });

    assert.equal(result.context.city, "Ordu");
    assert.equal(result.context.radiusKm, 7);
    assert.equal(result.messages.at(-1)?.role, "user");
});

test("rejects empty prompts and conversations longer than eight messages", () => {
    assert.throws(() => parseToshiChatRequest({
        context: { city: "Ordu", radiusKm: 3 },
        messages: [{ role: "user", content: "   " }],
    }));

    assert.throws(() => parseToshiChatRequest({
        context: { city: "Ordu", radiusKm: 3 },
        messages: Array.from({ length: 9 }, (_, index) => ({
            role: index % 2 ? "assistant" : "user",
            content: `Mesaj ${index}`,
        })),
    }));
});

test("ranks Turkish discovery intent, filters city and radius, then bounds candidates", () => {
    const cafe = business("cafe", {
        category: "cafe",
        categoryLabel: "Kahve Shop",
        industryId: "cafe",
        name: "Sahil Kahve",
        rating: 4.8,
    });
    const distantCafe = business("distant", {
        category: "cafe",
        categoryLabel: "Kahve Shop",
        industryId: "cafe",
        lat: 41.15,
        name: "Uzak Kahve",
    });
    const burger = business("burger", {
        category: "fastfood",
        categoryLabel: "Fast Food",
        industryId: "fastfood",
        name: "Bebek Burger",
    });
    const otherCity = business("samsun", {
        city: "Samsun",
        name: "Samsun Kahve",
    });

    const result = rankToshiCandidates(
        [burger, otherCity, distantCafe, cafe],
        {
            city: "Ordu",
            coordinates: { lat: 40.9839, lng: 37.8764 },
            radiusKm: 5,
        },
        "Yakınımda sakin bir kahve içmek istiyorum",
        2,
    );

    assert.deepEqual(result.map((candidate) => candidate.id), ["cafe"]);
    assert.equal(result[0]?.distance, 0);
    assert.ok(result.every((candidate) => candidate.city === "Ordu"));
});

test("keeps businesses without coordinates after located businesses", () => {
    const unknownDistance = business("unknown", {
        lat: null,
        lng: null,
        name: "Ordu Petshop",
        category: "petshop",
        categoryLabel: "Petshop",
    });
    const nearby = business("nearby", {
        name: "Yakın Petshop",
        category: "petshop",
        categoryLabel: "Petshop",
    });

    const result = rankToshiCandidates(
        [unknownDistance, nearby],
        {
            city: "Ordu",
            coordinates: { lat: 40.9839, lng: 37.8764 },
            radiusKm: 3,
        },
        "Evcil hayvanım için petshop",
    );

    assert.deepEqual(result.map((candidate) => candidate.id), ["nearby", "unknown"]);
    assert.equal(result[1]?.distance, null);
});

test("does not substitute an unrelated shop for a missing known category", () => {
 const result=rankToshiCandidates([business("shop",{category:"emlak",categoryLabel:"Emlak",name:"Ev Ofisi",industryId:"emlak"})],{city:"Ordu",radiusKm:5},"Kahve içmek istiyorum");
 assert.deepEqual(result,[]);
});
