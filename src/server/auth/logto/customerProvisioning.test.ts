import test from "node:test";
import assert from "node:assert/strict";

import {
    createLogtoCustomerProvisioningService,
    type LogtoCustomerProvisioningRepository,
} from "./customerProvisioning.ts";

type FakeAppUser = {
    displayName: null | string;
    email: null | string;
    id: string;
    status: string;
};

type FakeAuthProviderLink = {
    appUserId: string;
    id: string;
    logtoUserId: null | string;
    provider: string;
    providerEmail: null | string;
    providerMetadata: Record<string, unknown>;
    providerUserId: string;
};

function createFakeRepository(
    overrides?: Partial<{
        appUsers: FakeAppUser[];
        authProviderLinks: FakeAuthProviderLink[];
    }>,
) {
    let nextId = 1;
    const fakeState = {
        appUsers: overrides?.appUsers ?? [],
        authProviderLinks: overrides?.authProviderLinks ?? [],
    };

    const repository: LogtoCustomerProvisioningRepository = {
        async createAppUser(input) {
            const row: FakeAppUser = {
                displayName: input.displayName,
                email: input.email,
                id: `app-user-${nextId++}`,
                status: input.status,
            };
            fakeState.appUsers.push(row);
            return row;
        },
        async createLogtoProviderLink(input) {
            const row: FakeAuthProviderLink = {
                appUserId: input.appUserId,
                id: `provider-link-${nextId++}`,
                logtoUserId: input.logtoSub,
                provider: "logto",
                providerEmail: input.email,
                providerMetadata: input.metadata,
                providerUserId: input.logtoSub,
            };
            fakeState.authProviderLinks.push(row);
            return row;
        },
        async findAppUserByEmail(email) {
            return fakeState.appUsers.find((row) => row.email?.toLowerCase() === email.toLowerCase()) ?? null;
        },
        async findAppUserById(id) {
            return fakeState.appUsers.find((row) => row.id === id) ?? null;
        },
        async findAppUserByLegacyIdentifier(email) {
            return fakeState.appUsers.find((row) => row.email?.toLowerCase() === email.toLowerCase()) ?? null;
        },
        async findLinkedProviderLink(logtoSub) {
            return fakeState.authProviderLinks.find(
                (row) => row.providerUserId === logtoSub || row.logtoUserId === logtoSub,
            ) ?? null;
        },
        async updateLogtoProviderLink(id, input) {
            const row = fakeState.authProviderLinks.find((entry) => entry.id === id);
            if (!row) {
                throw new Error(`Missing provider link ${id}`);
            }

            row.appUserId = input.appUserId;
            row.logtoUserId = input.logtoSub;
            row.providerEmail = input.email;
            row.providerMetadata = input.metadata;
            row.providerUserId = input.logtoSub;
            return row;
        },
    };

    return { fakeState, repository };
}

test("creates an app user and provider link for a new customer identity", async () => {
    const { fakeState, repository } = createFakeRepository();
    const service = createLogtoCustomerProvisioningService({ repository });

    const result = await service.provision({
        email: "customer@example.com",
        logtoSub: "logto|customer-1",
        name: "Customer One",
        username: "customer_one",
    });

    assert.equal(result.appUser.status, "created");
    assert.equal(result.authProviderLink.status, "created");
    assert.deepEqual(result.counts, { created: 2, found: 0, updated: 0 });
    assert.equal(fakeState.appUsers.length, 1);
    assert.equal(fakeState.authProviderLinks.length, 1);
});

test("reuses an existing app user matched by email and links the Logto subject", async () => {
    const { fakeState, repository } = createFakeRepository({
        appUsers: [
            {
                displayName: "Existing Customer",
                email: "customer@example.com",
                id: "app-user-existing",
                status: "active",
            },
        ],
    });
    const service = createLogtoCustomerProvisioningService({ repository });

    const result = await service.provision({
        email: "customer@example.com",
        logtoSub: "logto|customer-1",
        name: "Existing Customer",
        username: "existing_customer",
    });

    assert.equal(result.appUser.id, "app-user-existing");
    assert.equal(result.appUser.status, "found");
    assert.equal(result.authProviderLink.status, "created");
    assert.equal(fakeState.appUsers.length, 1);
    assert.equal(fakeState.authProviderLinks.length, 1);
});

test("is idempotent for the same Logto customer subject", async () => {
    const { fakeState, repository } = createFakeRepository();
    const service = createLogtoCustomerProvisioningService({ repository });
    const input = {
        email: "customer@example.com",
        logtoSub: "logto|customer-1",
        name: "Customer One",
        username: "customer_one",
    };

    const first = await service.provision(input);
    const second = await service.provision(input);

    assert.equal(first.appUser.id, second.appUser.id);
    assert.equal(first.authProviderLink.id, second.authProviderLink.id);
    assert.deepEqual(second.counts, { created: 0, found: 2, updated: 0 });
    assert.equal(fakeState.appUsers.length, 1);
    assert.equal(fakeState.authProviderLinks.length, 1);
});

test("rejects conflicting subject and email mappings", async () => {
    const { repository } = createFakeRepository({
        appUsers: [
            {
                displayName: "Customer Two",
                email: "customer-two@example.com",
                id: "app-user-2",
                status: "active",
            },
        ],
        authProviderLinks: [
            {
                appUserId: "app-user-1",
                id: "provider-link-1",
                logtoUserId: "logto|customer-1",
                provider: "logto",
                providerEmail: "customer-one@example.com",
                providerMetadata: {},
                providerUserId: "logto|customer-1",
            },
        ],
    });
    const service = createLogtoCustomerProvisioningService({ repository });

    await assert.rejects(
        () => service.provision({
            email: "customer-two@example.com",
            logtoSub: "logto|customer-1",
            name: "Customer Two",
            username: "customer_two",
        }),
        /already linked to a different app user/i,
    );
});
