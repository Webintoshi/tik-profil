import test from "node:test";
import assert from "node:assert/strict";

import {
    createCustomerFeatureNotReadyError,
    requireCustomerActorFromSnapshot,
} from "./customerAccess.ts";

test("returns the customer session when a customer actor is present", () => {
    const result = requireCustomerActorFromSnapshot({
        adminSession: null,
        businessSession: null,
        customerSession: {
            appUserId: "app-user-1",
            authProvider: "logto",
            email: "customer@example.com",
            logtoSub: "logto|customer-1",
            role: "customer",
        },
        hasConsultantSession: false,
    });

    assert.equal(result.kind, "customer");
    assert.equal(result.session.role, "customer");
    assert.equal(result.session.appUserId, "app-user-1");
});

test("owner or staff sessions do not become customer access implicitly", () => {
    const result = requireCustomerActorFromSnapshot({
        adminSession: null,
        businessSession: {
            businessId: "biz-1",
            businessName: "Biz 1",
            businessSlug: "biz-1",
            email: "owner@example.com",
            enabledModules: [],
            isStaff: false,
            permissions: [],
            role: "owner",
        },
        customerSession: null,
        hasConsultantSession: false,
    });

    assert.equal(result.kind, "forbidden");
    assert.match(result.message, /musteri oturumu gerekli/i);
});

test("admin and consultant sessions are rejected on customer-only access", () => {
    const adminResult = requireCustomerActorFromSnapshot({
        adminSession: {
            username: "admin",
        },
        businessSession: null,
        customerSession: null,
        hasConsultantSession: false,
    });
    const consultantResult = requireCustomerActorFromSnapshot({
        adminSession: null,
        businessSession: null,
        customerSession: null,
        hasConsultantSession: true,
    });

    assert.equal(adminResult.kind, "forbidden");
    assert.match(adminResult.message, /musteri oturumu gerekli/i);
    assert.equal(consultantResult.kind, "forbidden");
    assert.match(consultantResult.message, /musteri oturumu gerekli/i);
});

test("unauthenticated customer-only access returns unauthorized", () => {
    const result = requireCustomerActorFromSnapshot({
        adminSession: null,
        businessSession: null,
        customerSession: null,
        hasConsultantSession: false,
    });

    assert.equal(result.kind, "unauthorized");
    assert.match(result.message, /oturum bulunamadi|giris yapin/i);
});

test("unfinished customer features produce explicit feature-not-ready errors", () => {
    const error = createCustomerFeatureNotReadyError("favorites");

    assert.equal(error.code, "FEATURE_NOT_READY");
    assert.equal(error.statusCode, 501);
    assert.match(error.message, /favorites/i);
});
