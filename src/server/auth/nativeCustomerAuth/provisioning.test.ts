import test from "node:test";
import assert from "node:assert/strict";

import {
    createNativeCustomerProvisioningService,
    type NativeCustomerProvisioningRepository,
} from "./provisioning.ts";

type FakeAppUser = {
    displayName: null | string;
    email: null | string;
    id: string;
    phone: null | string;
    status: string;
};

type FakeProviderLink = {
    appUserId: string;
    id: string;
    logtoUserId: null | string;
    provider: string;
    providerEmail: null | string;
    providerMetadata: Record<string, unknown>;
    providerUserId: string;
};

function createFakeRepository(seed?: Partial<{
    appUsers: FakeAppUser[];
    providerLinks: FakeProviderLink[];
}>) {
    let nextId = 1;
    const state = {
        appUsers: seed?.appUsers ?? [],
        providerLinks: seed?.providerLinks ?? [],
    };

    const repository: NativeCustomerProvisioningRepository = {
        async createAppUser(input) {
            const row: FakeAppUser = {
                displayName: input.displayName,
                email: input.email,
                id: `app-user-${nextId++}`,
                phone: input.phone,
                status: input.status,
            };
            state.appUsers.push(row);
            return row;
        },
        async createProviderLink(input) {
            const row: FakeProviderLink = {
                appUserId: input.appUserId,
                id: `provider-link-${nextId++}`,
                logtoUserId: null,
                provider: input.provider,
                providerEmail: input.email,
                providerMetadata: input.metadata,
                providerUserId: input.providerUserId,
            };
            state.providerLinks.push(row);
            return row;
        },
        async findAppUserByEmail(email) {
            return state.appUsers.find((row) => row.email?.toLowerCase() === email.toLowerCase()) ?? null;
        },
        async findAppUserById(id) {
            return state.appUsers.find((row) => row.id === id) ?? null;
        },
        async findAppUserByPhone(phone) {
            return state.appUsers.find((row) => row.phone === phone) ?? null;
        },
        async findProviderLink(provider, providerUserId) {
            return state.providerLinks.find(
                (row) => row.provider === provider && row.providerUserId === providerUserId,
            ) ?? null;
        },
        async updateAppUser(id, input) {
            const row = state.appUsers.find((entry) => entry.id === id);
            if (!row) {
                throw new Error(`Missing app user ${id}`);
            }
            row.displayName = input.displayName ?? row.displayName;
            row.email = input.email ?? row.email;
            row.phone = input.phone ?? row.phone;
            return row;
        },
        async updateProviderLink(id, input) {
            const row = state.providerLinks.find((entry) => entry.id === id);
            if (!row) {
                throw new Error(`Missing provider link ${id}`);
            }
            row.appUserId = input.appUserId;
            row.providerEmail = input.email;
            row.providerMetadata = input.metadata;
            return row;
        },
    };

    return { repository, state };
}

test("creates a customer app user and native OTP provider link", async () => {
    const { repository, state } = createFakeRepository();
    const service = createNativeCustomerProvisioningService({ repository });

    const result = await service.provision({
        displayName: null,
        email: null,
        phone: "+905551112233",
        provider: "native_otp",
        providerUserId: "phone:+905551112233",
    });

    assert.equal(result.appUser.status, "created");
    assert.equal(result.authProviderLink.status, "created");
    assert.equal(state.appUsers[0].phone, "+905551112233");
    assert.equal(state.providerLinks[0].provider, "native_otp");
});

test("is idempotent for the same native OTP phone identity", async () => {
    const { repository, state } = createFakeRepository();
    const service = createNativeCustomerProvisioningService({ repository });
    const input = {
        displayName: null,
        email: null,
        phone: "+905551112233",
        provider: "native_otp" as const,
        providerUserId: "phone:+905551112233",
    };

    const first = await service.provision(input);
    const second = await service.provision(input);

    assert.equal(first.appUser.id, second.appUser.id);
    assert.equal(first.authProviderLink.id, second.authProviderLink.id);
    assert.deepEqual(second.counts, { created: 0, found: 2, updated: 0 });
    assert.equal(state.appUsers.length, 1);
    assert.equal(state.providerLinks.length, 1);
});

test("links Google identity to an existing customer matched by email", async () => {
    const { repository } = createFakeRepository({
        appUsers: [
            {
                displayName: "Existing Customer",
                email: "customer@example.com",
                id: "app-user-existing",
                phone: null,
                status: "active",
            },
        ],
    });
    const service = createNativeCustomerProvisioningService({ repository });

    const result = await service.provision({
        displayName: "Google Customer",
        email: "customer@example.com",
        phone: null,
        provider: "google",
        providerUserId: "google-sub-1",
    });

    assert.equal(result.appUser.id, "app-user-existing");
    assert.equal(result.authProviderLink.status, "created");
});

test("rejects a provider link that conflicts with a matched app user", async () => {
    const { repository } = createFakeRepository({
        appUsers: [
            {
                displayName: "Second Customer",
                email: "second@example.com",
                id: "app-user-2",
                phone: null,
                status: "active",
            },
        ],
        providerLinks: [
            {
                appUserId: "app-user-1",
                id: "provider-link-1",
                logtoUserId: null,
                provider: "google",
                providerEmail: "first@example.com",
                providerMetadata: {},
                providerUserId: "google-sub-1",
            },
        ],
    });
    const service = createNativeCustomerProvisioningService({ repository });

    await assert.rejects(
        () => service.provision({
            displayName: "Second Customer",
            email: "second@example.com",
            phone: null,
            provider: "google",
            providerUserId: "google-sub-1",
        }),
        /already linked/i,
    );
});
