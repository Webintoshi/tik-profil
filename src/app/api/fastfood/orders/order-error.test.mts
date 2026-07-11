/// <reference types="node" />

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { registerHooks } from "node:module";
import test from "node:test";

registerHooks({
  load(url, context, nextLoad) {
    if (url.endsWith(".ts")) return nextLoad(url, { ...context, format: "module-typescript" });
    return nextLoad(url, context);
  }
});

const errors: typeof import("./order-error") = await import(new URL("./order-error.ts", import.meta.url).href);

test("atomic checkout errors map coupon price product and payment failures to actionable responses", () => {
  const cases = [
    ["COUPON_INVALID", "Kupon geçersiz veya kullanım koşulları değişti."],
    ["PRICE_MISMATCH", "Ürün fiyatı veya sipariş toplamı değişti."],
    ["PRODUCT_UNAVAILABLE", "Sepetteki bir ürün artık kullanılamıyor."],
    ["PAYMENT_DISABLED", "Seçilen ödeme yöntemi şu anda kullanılamıyor."]
  ] as const;
  for (const [code, message] of cases) {
    assert.deepEqual(errors.mapAtomicOrderError(new Error(`rpc failed: ${code}`)), {
      code,
      message,
      status: 400
    });
  }
  assert.equal(errors.mapAtomicOrderError(new Error("database unavailable")), null);
});

test("unknown database order errors log and return only safe correlation metadata", async () => {
  const safeFailure = (errors as Record<string, unknown>).createSafeUnknownOrderFailure;
  assert.equal(typeof safeFailure, "function");
  if (typeof safeFailure !== "function") return;

  const logged: unknown[] = [];
  const failure = (safeFailure as Function)({
    code: "23505",
    details: "customer Ayse, phone 05551112233, address Secret Street 42",
    hint: "Ayse 05551112233",
    message: "duplicate order for Ayse at Secret Street 42",
  }, "corr-safe-1", (...args: unknown[]) => logged.push(args));

  const serializedLog = JSON.stringify(logged);
  const serializedResponse = JSON.stringify(failure);
  for (const pii of ["Ayse", "05551112233", "Secret Street 42"]) {
    assert.doesNotMatch(serializedLog, new RegExp(pii));
    assert.doesNotMatch(serializedResponse, new RegExp(pii));
  }
  assert.match(serializedLog, /corr-safe-1/);
  assert.match(serializedLog, /23505/);
  assert.deepEqual(failure, {
    body: { code: "SERVER_ERROR", correlationId: "corr-safe-1", error: "Sunucu hatası oluştu.", success: false },
    status: 500,
  });

  const route = await readFile(new URL("./route.ts", import.meta.url), "utf8");
  assert.match(route, /error instanceof AppError[\s\S]*error\.toResponse\(\)/);
  assert.match(route, /createSafeUnknownOrderFailure\(error, correlationId/);
  assert.doesNotMatch(route, /AppError\.toResponse\(error/);
});
