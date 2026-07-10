// @ts-nocheck
import assert from "node:assert/strict";
import test from "node:test";

import {
  PROFILE_ACTION_MODULE_IDS,
  resolvePrimaryProfileAction
} from "./profile-actions.ts";

test("every supported module resolves to a non-empty primary action", () => {
  for (const moduleId of PROFILE_ACTION_MODULE_IDS) {
    const action = resolvePrimaryProfileAction({
      name: "Ordu Isletmesi",
      industry: moduleId,
      industryLabel: moduleId,
      modules: [moduleId],
      phone: "05321234567",
      whatsapp: "05321234567"
    });

    assert.ok(action.label.trim(), `${moduleId} must provide an action label`);
  }
});
