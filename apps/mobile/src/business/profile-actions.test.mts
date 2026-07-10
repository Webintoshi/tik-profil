/// <reference types="node" />

import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import test from "node:test";

registerHooks({
  load(url, context, nextLoad) {
    if (url.endsWith(".ts")) {
      return nextLoad(url, { ...context, format: "module-typescript" });
    }

    return nextLoad(url, context);
  }
});

const {
  PROFILE_ACTION_MODULE_IDS,
  resolvePrimaryProfileAction
}: typeof import("./profile-actions") = await import(new URL("./profile-actions.ts", import.meta.url).href);

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
