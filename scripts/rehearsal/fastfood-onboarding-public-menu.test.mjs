import test from "node:test";
import assert from "node:assert/strict";

import { filterAndMapPublicMenuExtras } from "../../src/lib/fastfood/publicMenu.ts";
import { hasBrowserSupabaseClientConfig } from "../../src/lib/supabase.ts";

test("browser realtime stays disabled unless NEXT_PUBLIC Supabase env is available", () => {
    assert.equal(hasBrowserSupabaseClientConfig({}), false);
    assert.equal(
        hasBrowserSupabaseClientConfig({
            SUPABASE_URL: "https://server-only.example",
            SUPABASE_ANON_KEY: "server-only-anon",
        }),
        false,
    );
    assert.equal(
        hasBrowserSupabaseClientConfig({
            NEXT_PUBLIC_SUPABASE_URL: " https://public.example ",
            NEXT_PUBLIC_SUPABASE_ANON_KEY: " public-anon ",
        }),
        true,
    );
});

test("public fastfood extras stay scoped to the business-owned extra groups", () => {
    const extras = filterAndMapPublicMenuExtras(
        [
            {
                id: "extra-a",
                group_id: "group-a",
                name: "Cheddar",
                price_modifier: "15",
                is_default: true,
                image_url: "https://img.example/cheddar.png",
                sort_order: 2,
                is_active: true,
            },
            {
                id: "extra-b",
                group_id: "group-b",
                name: "Pepper",
                price_modifier: 5,
                is_default: false,
                image_url: null,
                sort_order: 1,
                is_active: true,
            },
            {
                id: "extra-c",
                group_id: "group-a",
                name: "Hidden",
                price_modifier: 0,
                is_default: false,
                image_url: null,
                sort_order: 3,
                is_active: false,
            },
        ],
        ["group-a"],
    );

    assert.deepEqual(extras, [
        {
            id: "extra-a",
            groupId: "group-a",
            name: "Cheddar",
            priceModifier: 15,
            isDefault: true,
            image: "https://img.example/cheddar.png",
            order: 2,
        },
    ]);
});
