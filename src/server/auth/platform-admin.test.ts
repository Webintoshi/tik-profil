import assert from "node:assert/strict";
import test from "node:test";

import {
    createPlatformAdminGuard,
    requirePlatformAdmin,
} from "./platform-admin.ts";

test("platform admin guard rejects a business session", async () => {
    await assert.rejects(
        () => requirePlatformAdmin({ kind: "business" } as never),
        (error: unknown) => {
            assert.equal((error as { code?: string }).code, "platform_admin_required");
            assert.equal((error as { statusCode?: number }).statusCode, 403);
            return true;
        },
    );
});

test("platform admin guard rejects a missing or inactive admin context", async () => {
    for (const session of [null, { username: "inactive-admin", isActive: false }]) {
        await assert.rejects(
            () => requirePlatformAdmin(session as never),
            (error: unknown) => {
                assert.equal((error as { code?: string }).code, "platform_admin_required");
                return true;
            },
        );
    }
});

test("platform admin guard accepts the legacy dashboard admin session", async () => {
    const session = await requirePlatformAdmin({
        username: "dashboard-admin",
    });

    assert.equal(session.username, "dashboard-admin");
});

test("platform admin guard resolves the legacy session and rejects a deactivated admin", async () => {
    let resolvedUsername = "";
    const requireAdmin = createPlatformAdminGuard({
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
