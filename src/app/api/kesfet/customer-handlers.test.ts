import assert from "node:assert/strict";
import test from "node:test";

import { CustomerAuthenticationError } from "../../../server/auth/customer-session.ts";
import { createCustomerHandlers } from "./customer-handlers.ts";

function createDependencies() {
    const calls: Array<{ args: unknown[]; method: string }> = [];
    const repository = {
        async addFavorite(...args: unknown[]) {
            calls.push({ args, method: "addFavorite" });
            return { businessSlug: args[1], createdAt: "2026-07-11T10:00:00.000Z", id: "favorite-1" };
        },
        async deleteFavorite(...args: unknown[]) {
            calls.push({ args, method: "deleteFavorite" });
            return true;
        },
        async getProfile(...args: unknown[]) {
            calls.push({ args, method: "getProfile" });
            return null;
        },
        async listAddresses(...args: unknown[]) {
            calls.push({ args, method: "listAddresses" });
            return [];
        },
        async listFavorites(...args: unknown[]) {
            calls.push({ args, method: "listFavorites" });
            return [];
        },
        async listOrders(...args: unknown[]) {
            calls.push({ args, method: "listOrders" });
            return [{ createdAt: "2026-07-11", id: "order-1" }];
        },
        async listReservations(...args: unknown[]) {
            calls.push({ args, method: "listReservations" });
            return [{ createdAt: "2026-07-11", id: "reservation-1" }];
        },
        async saveAddress(...args: unknown[]) {
            calls.push({ args, method: "saveAddress" });
            return { ...(args[1] as object), id: "address-1" };
        },
        async upsertProfile(...args: unknown[]) {
            calls.push({ args, method: "upsertProfile" });
            return { ...(args[1] as object), appUserId: args[0] };
        },
    };
    const handlers = createCustomerHandlers({
        repository: repository as never,
        requireCustomer: async () => ({ appUserId: "session-user", email: "customer@example.com" }),
    });
    return { calls, handlers };
}

async function json(response: Response) {
    return await response.json() as Record<string, unknown>;
}

test("GET profile returns the authenticated identity and owned addresses", async () => {
    const { calls, handlers } = createDependencies();

    const response = await handlers.getProfile();

    assert.equal(response.status, 200);
    assert.deepEqual(await json(response), {
        success: true,
        profile: null,
        email: "customer@example.com",
        addresses: [],
    });
    assert.deepEqual(calls.map((call) => call.args), [["session-user"], ["session-user"]]);
});

test("PUT profile ignores client user ids and writes addresses as the authenticated owner", async () => {
    const { calls, handlers } = createDependencies();
    const request = new Request("https://tikprofil.test/api/kesfet/user/profile", {
        body: JSON.stringify({
            appUserId: "attacker-selected-user",
            displayName: "Customer",
            addresses: [{
                appUserId: "attacker-selected-user",
                city: "Ordu",
                district: "Altinordu",
                fullAddress: "Akyazi Mahallesi",
                isDefault: true,
                label: "Home",
            }],
        }),
        headers: { "content-type": "application/json" },
        method: "PUT",
    });

    const response = await handlers.putProfile(request);

    assert.equal(response.status, 200);
    const mutationCalls = calls.filter((call) => call.method === "upsertProfile" || call.method === "saveAddress");
    assert.equal(mutationCalls.length, 2);
    assert.equal(mutationCalls[0].args[0], "session-user");
    assert.equal(mutationCalls[1].args[0], "session-user");
    assert.equal("appUserId" in (mutationCalls[1].args[1] as object), false);
});

test("favorites handlers list, add idempotently, and delete by authenticated owner", async () => {
    const { calls, handlers } = createDependencies();
    const addResponse = await handlers.postFavorite(new Request("https://tikprofil.test/api/kesfet/user/favorites", {
        body: JSON.stringify({ appUserId: "attacker", businessSlug: "coffee-house" }),
        headers: { "content-type": "application/json" },
        method: "POST",
    }));
    const deleteResponse = await handlers.deleteFavorite(
        new Request("https://tikprofil.test/api/kesfet/user/favorites?businessSlug=coffee-house"),
    );
    const listResponse = await handlers.getFavorites();

    assert.equal(addResponse.status, 200);
    assert.equal(deleteResponse.status, 200);
    assert.equal(listResponse.status, 200);
    assert.deepEqual(calls.find((call) => call.method === "addFavorite")?.args, ["session-user", "coffee-house"]);
    assert.deepEqual(calls.find((call) => call.method === "deleteFavorite")?.args, ["session-user", "coffee-house"]);
});

test("orders and reservations handlers list only the authenticated customer's records", async () => {
    const { calls, handlers } = createDependencies();

    assert.equal((await handlers.getOrders()).status, 200);
    assert.equal((await handlers.getReservations()).status, 200);

    assert.deepEqual(calls.find((call) => call.method === "listOrders")?.args, ["session-user"]);
    assert.deepEqual(calls.find((call) => call.method === "listReservations")?.args, ["session-user"]);
});

test("invalid customer payloads return typed 400 responses without repository mutations", async () => {
    const { calls, handlers } = createDependencies();
    const response = await handlers.postFavorite(new Request("https://tikprofil.test/api/kesfet/user/favorites", {
        body: JSON.stringify({ businessSlug: "" }),
        headers: { "content-type": "application/json" },
        method: "POST",
    }));

    assert.equal(response.status, 400);
    assert.equal((await json(response)).code, "VALIDATION_ERROR");
    assert.equal(calls.some((call) => call.method === "addFavorite"), false);
});

test("customer authentication errors return 401 instead of the retired 501 stub", async () => {
    const { handlers } = createDependencies();
    const unauthorizedHandlers = createCustomerHandlers({
        repository: {} as never,
        requireCustomer: async () => { throw new CustomerAuthenticationError(); },
    });

    const response = await unauthorizedHandlers.getOrders();

    assert.equal(response.status, 401);
    assert.equal((await json(response)).code, "UNAUTHORIZED");
    assert.notEqual(response.status, 501);
    assert.ok(handlers);
});
