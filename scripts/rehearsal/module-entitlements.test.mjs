import test from "node:test";
import assert from "node:assert/strict";

import {
    getVisiblePanelNavGroups,
    getPanelRouteAccess,
    getVisiblePermissionModuleIds,
} from "../../src/lib/panel/moduleEntitlements.ts";

test("fastfood businesses see core nav plus fastfood group", () => {
    const groups = getVisiblePanelNavGroups({
        enabledModules: ["fastfood"],
    });

    assert.deepEqual(groups.map((group) => group.id), ["core", "fastfood"]);
    assert.deepEqual(
        groups.find((group) => group.id === "fastfood")?.items.map((item) => item.href),
        [
            "/panel/fastfood/tables",
            "/panel/fastfood/categories",
            "/panel/fastfood/products",
            "/panel/fastfood/extras",
            "/panel/fastfood/orders",
            "/panel/fastfood/coupons",
            "/panel/fastfood/settings",
        ],
    );
});

test("businesses without module entitlements only see core nav", () => {
    const groups = getVisiblePanelNavGroups({
        enabledModules: [],
    });

    assert.deepEqual(groups.map((group) => group.id), ["core"]);
    assert.deepEqual(
        groups[0].items.map((item) => item.href),
        ["/panel/profile", "/panel/qr", "/panel/staff"],
    );
});

test("vehicle rental routes stay accessible when the module is entitled", () => {
    const access = getPanelRouteAccess("/panel/vehicle-rental/vehicles", {
        enabledModules: ["vehicle-rental"],
    });

    assert.equal(access.kind, "allowed");
});

test("hidden modules stay out of nav and return a safe frozen notice on direct access", () => {
    const groups = getVisiblePanelNavGroups({
        enabledModules: ["beauty"],
    });
    const access = getPanelRouteAccess("/panel/beauty", {
        enabledModules: ["beauty"],
    });

    assert.deepEqual(groups.map((group) => group.id), ["core"]);
    assert.equal(access.kind, "notice");
    assert.equal(access.reason, "frozen");
});

test("limited restaurant access hides non-MVP pages behind a safe notice", () => {
    const allowed = getPanelRouteAccess("/panel/food/menu", {
        enabledModules: ["restaurant"],
    });
    const blocked = getPanelRouteAccess("/panel/food/analytics", {
        enabledModules: ["restaurant"],
    });

    assert.equal(allowed.kind, "allowed");
    assert.equal(blocked.kind, "notice");
    assert.equal(blocked.reason, "limited");
});

test("staff permission picker stays aligned with visible MVP modules", () => {
    assert.deepEqual(
        getVisiblePermissionModuleIds(["fastfood", "beauty", "vehicle-rental"]),
        ["general", "restaurant", "vehicle-rental"],
    );
});
