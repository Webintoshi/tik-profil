import test from "node:test";
import assert from "node:assert/strict";

import {
    normalizeHotelPanelOrder,
    normalizeHotelPanelRequest,
} from "../../src/lib/hotel/panelState.ts";
import { getErrorMessage } from "../../src/lib/errorMessage.ts";
import { getPublicMenuFallbackState } from "../../src/lib/public/menuState.ts";

test("hotel request normalization falls back to a safe pending status", () => {
    const request = normalizeHotelPanelRequest({
        id: "req-1",
        roomNumber: "",
        requestType: "maintenance",
        requestLabel: "Teknik Destek",
        status: "brand_new",
        createdAt: "2026-06-06T10:00:00.000Z",
    });

    assert.equal(request.status, "pending");
    assert.equal(request.roomNumber, "-");
});

test("hotel room service order normalization strips invalid items and statuses", () => {
    const order = normalizeHotelPanelOrder({
        id: "order-1",
        roomNumber: undefined,
        status: "queued",
        items: [
            { id: "ok", name: "Tea", price: "25", quantity: 2 },
            { id: "", name: "", price: "oops", quantity: 0 },
            "not-an-item",
        ],
        total: "51.5",
        createdAt: "2026-06-06T10:00:00.000Z",
    });

    assert.equal(order.status, "pending");
    assert.equal(order.roomNumber, "-");
    assert.deepEqual(order.items, [
        { id: "ok", name: "Tea", price: 25, quantity: 2 },
    ]);
    assert.equal(order.total, 51.5);
});

test("public menu fallback hides raw 400 behind a safe not-ready state", () => {
    const fallback = getPublicMenuFallbackState(400, "businessSlug required");

    assert.equal(fallback.kind, "not-ready");
    assert.match(fallback.title, /haz/i);
    assert.doesNotMatch(fallback.message, /\b400\b/);
});

test("public menu fallback keeps server failures generic and retryable", () => {
    const fallback = getPublicMenuFallbackState(500, "database exploded");

    assert.equal(fallback.kind, "error");
    assert.equal(fallback.retryable, true);
    assert.doesNotMatch(fallback.message, /database exploded/i);
});

test("error message helper prefers nested api error text", () => {
    const message = getErrorMessage(
        { error: "Kategori ekleme yetkiniz yok." },
        "Kategori eklenemedi.",
    );

    assert.equal(message, "Kategori ekleme yetkiniz yok.");
});
