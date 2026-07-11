/// <reference types="node" />

import assert from "node:assert/strict";
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
