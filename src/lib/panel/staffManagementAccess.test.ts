import test from "node:test";
import assert from "node:assert/strict";

import { canAccessStaffManagement } from "./staffManagementAccess.ts";

test("owner can always access staff management", () => {
    assert.equal(canAccessStaffManagement({
        permissions: [],
        role: "owner",
    }), true);
});

test("manager needs the staff-management permission to access staff management", () => {
    assert.equal(canAccessStaffManagement({
        permissions: ["general.staff"],
        role: "manager",
    }), true);

    assert.equal(canAccessStaffManagement({
        permissions: [],
        role: "manager",
    }), false);
});

test("plain staff cannot access staff management even if the permission is present", () => {
    assert.equal(canAccessStaffManagement({
        permissions: ["general.staff"],
        role: "staff",
    }), false);
});
