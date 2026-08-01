import assert from "node:assert/strict";
import test from "node:test";

import {
    BusinessSelfRegistrationError,
    createBusinessSelfRegistrationService,
    type BusinessSelfRegistrationRepository,
    type BusinessSelfRegistrationResult,
    type NormalizedBusinessSelfRegistrationInput,
} from "./businessSelfRegistration";

function createRepository(existing: BusinessSelfRegistrationResult | null = null) {
    const created: NormalizedBusinessSelfRegistrationInput[] = [];
    const repository: BusinessSelfRegistrationRepository = {
        create: async (input) => {
            created.push(input);
            return {
                appUserId: input.appUserId,
                businessId: "business-1",
                businessName: input.businessName,
                businessSlug: input.baseSlug,
                email: input.email,
                enabledModules: [],
                logtoSub: input.logtoSub,
            };
        },
        findExistingOwner: async () => existing,
    };
    return { created, repository };
}

test("creates a normalized owner business for a new Logto identity", async () => {
    const { created, repository } = createRepository();
    const service = createBusinessSelfRegistrationService({ repository });

    const result = await service.register({
        appUserId: "app-user-1",
        businessName: "  Örnek İşletme  ",
        displayName: "  İşletme Sahibi ",
        email: " OWNER@EXAMPLE.COM ",
        industryId: "petshop",
        industryLabel: " Petshop ",
        logtoSub: "logto|owner-1",
        phone: "+90 (452) 123 45 67",
    });

    assert.equal(result.businessSlug, "ornek-isletme");
    assert.deepEqual(created[0], {
        appUserId: "app-user-1",
        baseSlug: "ornek-isletme",
        businessName: "Örnek İşletme",
        displayName: "İşletme Sahibi",
        email: "owner@example.com",
        industryId: "petshop",
        industryLabel: "Petshop",
        logtoSub: "logto|owner-1",
        phone: "4521234567",
    });
});

test("returns the existing owner membership without creating a duplicate", async () => {
    const existing: BusinessSelfRegistrationResult = {
        appUserId: "app-user-1",
        businessId: "business-existing",
        businessName: "Existing Business",
        businessSlug: "existing-business",
        email: "owner@example.com",
        enabledModules: [],
        logtoSub: "logto|owner-1",
    };
    const { created, repository } = createRepository(existing);
    const service = createBusinessSelfRegistrationService({ repository });

    const result = await service.register({
        appUserId: "app-user-1",
        businessName: "Ignored Business",
        industryId: "other",
        industryLabel: "Diğer",
        logtoSub: "logto|owner-1",
        phone: "04521234567",
    });

    assert.equal(result.businessId, "business-existing");
    assert.equal(result.logtoSub, "logto|owner-1");
    assert.equal(created.length, 0);
});

test("rejects incomplete or malformed business details", async () => {
    const { repository } = createRepository();
    const service = createBusinessSelfRegistrationService({ repository });

    await assert.rejects(
        () => service.register({
            appUserId: "app-user-1",
            businessName: "A",
            industryId: "bad value!",
            industryLabel: "",
            logtoSub: "logto|owner-1",
            phone: "123",
        }),
        (error: unknown) => error instanceof BusinessSelfRegistrationError,
    );
});
