import assert from "node:assert/strict";
import test from "node:test";

import { mapNativeAccountRow, normalizeNativeCustomerUpdate } from "./account.ts";

test("maps an authenticated native customer to the mobile account contract", () => {
    const account = mapNativeAccountRow({
        addresses: [{
            city: "Ordu",
            createdAt: "2026-08-13T10:00:00.000Z",
            district: "Altinordu",
            fullAddress: "Akyazi Mahallesi",
            id: "address-1",
            isDefault: true,
            label: "Ev",
            latitude: 40.983,
            longitude: 37.876,
            updatedAt: "2026-08-13T10:00:00.000Z",
        }],
        app_user_id: "user-1",
        avatar_url: null,
        birth_date: null,
        created_at: new Date("2026-08-13T09:00:00.000Z"),
        display_name: "Test Kullanici",
        email: "customer@example.com",
        hobbies: ["Kahve"],
        marital_status: null,
        occupation: null,
        phone: null,
        preferences: { theme: "light" },
        updated_at: new Date("2026-08-13T09:30:00.000Z"),
    });

    assert.equal(account.email, "customer@example.com");
    assert.equal(account.profile?.appUserId, "user-1");
    assert.equal(account.profile?.displayName, "Test Kullanici");
    assert.equal(account.addresses[0]?.label, "Ev");
    assert.deepEqual(account.orders, []);
    assert.deepEqual(account.reservations, []);
});

test("normalizes an editable native customer profile and one owned address", () => {
    assert.deepEqual(normalizeNativeCustomerUpdate({
        addresses: [{
            city: " Ordu ",
            district: " Altınordu ",
            fullAddress: " Akyazı Mahallesi  ",
            id: "550e8400-e29b-41d4-a716-446655440000",
            isDefault: true,
            label: " Ev ",
            latitude: 40.983,
            longitude: 37.876,
        }],
        birthDate: "1992-05-12",
        displayName: " Tık Profil Kullanıcısı ",
        hobbies: [" Kahve ", "", "Gezi"],
        occupation: " Yazılım ",
        phone: " +90 555 111 22 33 ",
    }), {
        addresses: [{
            city: "Ordu",
            district: "Altınordu",
            fullAddress: "Akyazı Mahallesi",
            id: "550e8400-e29b-41d4-a716-446655440000",
            isDefault: true,
            label: "Ev",
            latitude: 40.983,
            longitude: 37.876,
        }],
        birthDate: "1992-05-12",
        displayName: "Tık Profil Kullanıcısı",
        hobbies: ["Kahve", "Gezi"],
        occupation: "Yazılım",
        phone: "+90 555 111 22 33",
    });
});

test("rejects malformed native profile dates and coordinates", () => {
    assert.throws(() => normalizeNativeCustomerUpdate({ birthDate: "12/05/1992" }), /birthDate/);
    assert.throws(() => normalizeNativeCustomerUpdate({
        addresses: [{
            city: "Ordu",
            district: "Altınordu",
            fullAddress: "Akyazı Mahallesi",
            label: "Ev",
            latitude: 120,
        }],
    }), /latitude/);
});
