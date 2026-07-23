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
        isSessionActive: async () => true,
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
            isSessionActive: async () => true,
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

test("test-only platform admin guard accepts an active legacy dashboard admin session", async () => {
    const requireAdmin = __testOnlyCreatePlatformAdminGuard({
        getSession: async () => ({ username: "dashboard-admin" }),
        isSessionActive: async () => true,
    });
    const session = await requireAdmin();

    assert.equal(session.username, "dashboard-admin");
});

test("test-only platform admin guard resolves the legacy session and rejects a deactivated admin", async () => {
    let resolvedUsername = "";
    const requireAdmin = __testOnlyCreatePlatformAdminGuard({
        getSession: async () => ({ username: "dashboard-admin" }),
        isSessionActive: async (session) => {
            resolvedUsername = session.username;
            return false;
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
