/// <reference types="node" />

import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import test from "node:test";

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.endsWith("/modules/module-family-registry")) {
      return nextResolve(`${specifier}.ts`, context);
    }

    return nextResolve(specifier, context);
  },
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

const { SUPPORTED_MODULE_IDS }: typeof import("../modules/module-family-registry") = await import(
  new URL("../modules/module-family-registry.ts", import.meta.url).href
);

function profile(overrides: Partial<import("./profile-actions").ProfileActionInput> = {}) {
  return {
    name: "Ordu İşletmesi",
    industry: "default",
    industryLabel: "İşletme",
    modules: [],
    phone: "05321234567",
    whatsapp: "05321234567",
    nativeCapabilities: [],
    ...overrides
  };
}

test("exports the exact registry-owned 68-ID profile coverage", () => {
  assert.deepEqual(PROFILE_ACTION_MODULE_IDS, SUPPORTED_MODULE_IDS);
});

test("resolves every supported module to its exact fallback family action", () => {
  for (const moduleId of PROFILE_ACTION_MODULE_IDS) {
    const action = resolvePrimaryProfileAction(profile({ modules: [moduleId] }));

    assert.equal(action.definition?.id, moduleId, `${moduleId} definition`);
    assert.equal(action.mode, "fallback", `${moduleId} fallback mode`);
    assert.equal(action.nativeCapability, null, `${moduleId} native capability`);
    assert.equal(action.label, action.definition?.label, `${moduleId} label`);
    assert.equal(action.icon, action.definition?.icon, `${moduleId} icon`);
    assert.equal(action.url, action.fallbackUrl, `${moduleId} fallback URL`);
    assert.ok(action.fallbackUrl, `${moduleId} configured fallback`);
  }
});

test("preserves current native panels only when their capability is ready", () => {
  const cases = [
    { moduleId: "fastfood", capability: "fastfood-order", panelKind: "fastfood", menuKind: "fastfood", label: "Sipariş Ver" },
    { moduleId: "ecommerce", capability: "ecommerce-order", panelKind: "ecommerce", menuKind: undefined, label: "Sipariş Ver" },
    { moduleId: "restaurant", capability: "restaurant-menu", panelKind: "restaurant", menuKind: "restaurant", label: "Menü" }
  ] as const;

  for (const item of cases) {
    const fallback = resolvePrimaryProfileAction(profile({ modules: [item.moduleId] }));
    const native = resolvePrimaryProfileAction(profile({
      modules: [item.moduleId],
      nativeCapabilities: [item.capability]
    }));

    assert.equal(fallback.mode, "fallback", `${item.moduleId} requires readiness`);
    assert.equal(native.mode, "native", `${item.moduleId} native mode`);
    assert.equal(native.nativeCapability, item.capability);
    assert.equal(native.panelKind, item.panelKind);
    assert.equal(native.menuKind, item.menuKind);
    assert.equal(native.label, item.label);
    assert.equal(native.url, null);
    assert.ok(native.fallbackUrl, `${item.moduleId} retains its configured fallback`);
  }
});

test("uses configured primary, then native readiness, then stable registry order", () => {
  const configuredPrimary = resolvePrimaryProfileAction(profile({
    primaryModuleId: "ecommerce",
    modules: ["restaurant", "fastfood", "ecommerce"],
    nativeCapabilities: ["restaurant-menu", "fastfood-order", "ecommerce-order"]
  }));
  assert.equal(configuredPrimary.definition?.id, "ecommerce");

  const nativeReady = resolvePrimaryProfileAction(profile({
    modules: ["restaurant", "ecommerce", "construction"],
    nativeCapabilities: ["ecommerce-order"]
  }));
  assert.equal(nativeReady.definition?.id, "ecommerce");

  const forward = resolvePrimaryProfileAction(profile({ modules: ["construction", "clinic"] }));
  const reversed = resolvePrimaryProfileAction(profile({ modules: ["clinic", "construction"] }));
  assert.equal(forward.definition?.id, "clinic");
  assert.equal(reversed.definition?.id, "clinic");
});

test("normalizes aliases without letting input order select the action", () => {
  const action = resolvePrimaryProfileAction(profile({
    modules: ["İNŞAAT-BİLİNMEYEN", "MAĞAZA", "KLİNİK"]
  }));

  assert.equal(action.definition?.id, "clinic");
});

test("uses a safe unknown contact fallback and never invents a URL", () => {
  const contact = resolvePrimaryProfileAction(profile({
    modules: ["---", "future-module"],
    phone: null,
    whatsapp: "05321234567"
  }));
  assert.equal(contact.definition, null);
  assert.equal(contact.label, "İletişime Geç");
  assert.equal(contact.icon, "phone");
  assert.equal(contact.mode, "fallback");
  assert.equal(contact.nativeCapability, null);
  assert.equal(contact.url, "tel:05321234567");
  assert.equal(contact.fallbackUrl, "tel:05321234567");

  const unavailable = resolvePrimaryProfileAction(profile({
    modules: ["future-module"],
    phone: null,
    whatsapp: null
  }));
  assert.equal(unavailable.url, null);
  assert.equal(unavailable.fallbackUrl, null);
});
