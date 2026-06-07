import test from "node:test";
import assert from "node:assert/strict";

import {
    createLogtoTestOwnerProvisioningService,
    isLogtoTestProvisioningSecretAuthorized,
    type LogtoTestOwnerProvisioningRepository,
} from "./testOwnerProvisioning.ts";

type FakeAppUser = {
    displayName: string | null;
    email: string | null;
    id: string;
    status: string;
};

type FakeAuthProviderLink = {
    appUserId: string;
    id: string;
    logtoUserId: string | null;
    provider: string;
    providerEmail: string | null;
    providerMetadata: Record<string, unknown>;
    providerUserId: string;
};

type FakeBusiness = {
    id: string;
    name: string;
    slug: string;
};

type FakeBusinessRole = {
    businessId: string;
    displayName: string;
    id: string;
    isSystem: boolean;
    roleKey: string;
};

type FakeBusinessMembership = {
    appUserId: string;
    businessId: string;
    id: string;
    membershipStatus: string;
    roleId: string | null;
};

function createFakeRepository(
    overrides?: Partial<{
        appUsers: FakeAppUser[];
        authProviderLinks: FakeAuthProviderLink[];
        businessMemberships: FakeBusinessMembership[];
        businessRoles: FakeBusinessRole[];
        businesses: FakeBusiness[];
    }>,
) {
    let nextId = 1;
    const fakeState = {
        appUsers: overrides?.appUsers ?? [],
        authProviderLinks: overrides?.authProviderLinks ?? [],
        businessMemberships: overrides?.businessMemberships ?? [],
        businessRoles: overrides?.businessRoles ?? [],
        businesses: overrides?.businesses ?? [
            {
                id: "biz-atlas-smoke-fastfood",
                name: "Atlas Smoke Fastfood",
                slug: "atlas-smoke-fastfood-20260605002259",
            },
        ],
        platformAdmins: [] as Array<{ appUserId: string }>,
    };

    const repository: LogtoTestOwnerProvisioningRepository = {
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
        async createBusinessMembership(input) {
            const row: FakeBusinessMembership = {
                appUserId: input.appUserId,
                businessId: input.businessId,
                id: `membership-${nextId++}`,
                membershipStatus: input.membershipStatus,
                roleId: input.roleId,
            };
            fakeState.businessMemberships.push(row);
            return row;
        },
        async createBusinessRole(input) {
            const row: FakeBusinessRole = {
                businessId: input.businessId,
                displayName: input.displayName,
                id: `role-${nextId++}`,
                isSystem: input.isSystem,
                roleKey: input.roleKey,
            };
            fakeState.businessRoles.push(row);
            return row;
        },
        async createLogtoProviderLink(input) {
            const row: FakeAuthProviderLink = {
                appUserId: input.appUserId,
                id: `link-${nextId++}`,
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
        async findBusinessBySlug(slug) {
            return fakeState.businesses.find((row) => row.slug === slug) ?? null;
        },
        async findBusinessMembership(businessId, appUserId) {
            return fakeState.businessMemberships.find(
                (row) => row.businessId === businessId && row.appUserId === appUserId,
            ) ?? null;
        },
        async findBusinessRoleByKey(businessId, roleKey) {
            return fakeState.businessRoles.find(
                (row) => row.businessId === businessId && row.roleKey === roleKey,
            ) ?? null;
        },
        async findLinkedProviderLink(logtoSub) {
            return fakeState.authProviderLinks.find(
                (row) => row.provider === "logto" && (row.providerUserId === logtoSub || row.logtoUserId === logtoSub),
            ) ?? null;
        },
        async updateBusinessMembership(id, input) {
            const row = fakeState.businessMemberships.find((entry) => entry.id === id);
            if (!row) {
                throw new Error(`Missing membership ${id}`);
            }

            row.membershipStatus = input.membershipStatus;
            row.roleId = input.roleId;
            return row;
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

test("rejects non-test identifiers and non-test business slugs", async () => {
    const { repository } = createFakeRepository();
    const service = createLogtoTestOwnerProvisioningService({ repository });

    await assert.rejects(
        () => service.provision({
            businessSlug: "real-customer-business",
            email: "owner@tikprofil.com",
            logtoSub: "logto|real-user",
            role: "owner",
            username: "realowner",
        }),
        /test-only/i,
    );
});

test("creates the required owner mapping rows for a test-only Logto identity", async () => {
    const { fakeState, repository } = createFakeRepository();
    const service = createLogtoTestOwnerProvisioningService({ repository });

    const result = await service.provision({
        businessSlug: "atlas-smoke-fastfood-20260605002259",
        email: "atlas-smoke-fastfood+20260605002259@example.com",
        logtoSub: "logto|atlas-smoke-fastfood",
        role: "owner",
        username: "tikprofil_r2_smoke_6nq0n4",
    });

    assert.equal(result.appUser.status, "created");
    assert.equal(result.authProviderLink.status, "created");
    assert.equal(result.businessRole.status, "created");
    assert.equal(result.businessMembership.status, "created");
    assert.deepEqual(result.counts, { created: 4, found: 0, updated: 0 });
    assert.equal(fakeState.appUsers.length, 1);
    assert.equal(fakeState.authProviderLinks.length, 1);
    assert.equal(fakeState.businessRoles.length, 1);
    assert.equal(fakeState.businessMemberships.length, 1);
    assert.equal(fakeState.platformAdmins.length, 0);
});

test("is idempotent for the same Logto subject and test business", async () => {
    const { fakeState, repository } = createFakeRepository();
    const service = createLogtoTestOwnerProvisioningService({ repository });
    const input = {
        businessSlug: "atlas-smoke-fastfood-20260605002259",
        email: "atlas-smoke-fastfood+20260605002259@example.com",
        logtoSub: "logto|atlas-smoke-fastfood",
        role: "owner" as const,
        username: "tikprofil_r2_smoke_6nq0n4",
    };

    const first = await service.provision(input);
    const second = await service.provision(input);

    assert.equal(first.appUser.id, second.appUser.id);
    assert.equal(first.authProviderLink.id, second.authProviderLink.id);
    assert.equal(first.businessRole.id, second.businessRole.id);
    assert.equal(first.businessMembership.id, second.businessMembership.id);
    assert.deepEqual(second.counts, { created: 0, found: 4, updated: 0 });
    assert.equal(fakeState.appUsers.length, 1);
    assert.equal(fakeState.authProviderLinks.length, 1);
    assert.equal(fakeState.businessRoles.length, 1);
    assert.equal(fakeState.businessMemberships.length, 1);
});

test("authorizes the internal operator secret only on exact match", () => {
    assert.equal(isLogtoTestProvisioningSecretAuthorized("expected-secret", "expected-secret"), true);
    assert.equal(isLogtoTestProvisioningSecretAuthorized("expected-secret", "wrong-secret"), false);
    assert.equal(isLogtoTestProvisioningSecretAuthorized("expected-secret", undefined), false);
    assert.equal(isLogtoTestProvisioningSecretAuthorized(undefined, "expected-secret"), false);
});
