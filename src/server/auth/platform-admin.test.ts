import assert from "node:assert/strict";
import test from "node:test";

import {
    __testOnlyCreatePlatformAdminGuard,
    requirePlatformAdmin,
} from "./platform-admin.ts";

test("production platform admin guard has no caller-supplied session parameter", () => {
    assert.equal(requirePlatformAdmin.length, 0);
});

test("test-only platform admin guard rejects a business session", async () => {
    const requireAdmin = __testOnlyCreatePlatformAdminGuard({
        getSession: async () => ({ kind: "business" } as never),
        resolveAdmin: async () => "admin-1",
    });

    await assert.rejects(
        requireAdmin,
        (error: unknown) => {
            assert.equal((error as { code?: string }).code, "platform_admin_required");
            assert.equal((error as { statusCode?: number }).statusCode, 403);
            return true;
        },
    );
});

test("test-only platform admin guard rejects a missing or inactive admin context", async () => {
    for (const session of [null, { username: "inactive-admin", isActive: false }]) {
        const requireAdmin = __testOnlyCreatePlatformAdminGuard({
            getSession: async () => session as never,
            resolveAdmin: async () => "admin-1",
        });

        await assert.rejects(
            requireAdmin,
            (error: unknown) => {
                assert.equal((error as { code?: string }).code, "platform_admin_required");
                return true;
            },
        );
    }
});

test("test-only platform admin guard resolves a legacy username to its canonical active app user", async () => {
    const requireAdmin = __testOnlyCreatePlatformAdminGuard({
        getSession: async () => ({ username: "legacy-dashboard-admin" }),
        resolveAdmin: async (username) => username === "legacy-dashboard-admin" ? "a62a4191-4116-4c9d-9374-c60e8e21b2da" : null,
    });
    const session = await requireAdmin();

    assert.equal(session.username, "legacy-dashboard-admin");
    assert.equal(session.appUserId, "a62a4191-4116-4c9d-9374-c60e8e21b2da");
});

test("test-only platform admin guard fails closed for an unmapped or inactive legacy admin", async () => {
    let resolvedUsername = "";
    const requireAdmin = __testOnlyCreatePlatformAdminGuard({
        getSession: async () => ({ username: "dashboard-admin" }),
        resolveAdmin: async (username) => {
            resolvedUsername = username;
            return null;
        },
    });

    await assert.rejects(
        requireAdmin,
        (error: unknown) => {
            assert.equal((error as { code?: string }).code, "platform_admin_required");
            assert.equal((error as { statusCode?: number }).statusCode, 403);
            return true;
        },
    );
    assert.equal(resolvedUsername, "dashboard-admin");
});
