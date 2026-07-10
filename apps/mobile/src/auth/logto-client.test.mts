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

const {
  readLogtoConfiguration,
  toStoredSession
}: typeof import("./logto-client") = await import(new URL("./logto-client.ts", import.meta.url).href);

test("missing Logto public settings return an explicit safe configuration error", () => {
  assert.deepEqual(readLogtoConfiguration({}), {
    configured: false,
    error: "Giriş yapılandırması eksik. EXPO_PUBLIC_LOGTO_ENDPOINT, EXPO_PUBLIC_LOGTO_APP_ID ve EXPO_PUBLIC_LOGTO_API_AUDIENCE gerekli."
  });
});

test("Logto configuration trims values and normalizes the issuer URL", () => {
  assert.deepEqual(readLogtoConfiguration({
    EXPO_PUBLIC_LOGTO_API_AUDIENCE: " https://api.example.test ",
    EXPO_PUBLIC_LOGTO_APP_ID: " mobile-app ",
    EXPO_PUBLIC_LOGTO_ENDPOINT: " https://auth.example.test/ "
  }), {
    appId: "mobile-app",
    audience: "https://api.example.test",
    configured: true,
    endpoint: "https://auth.example.test"
  });
});

test("token normalization requires refresh material and computes milliseconds", () => {
  assert.deepEqual(toStoredSession({
    accessToken: "access-token",
    expiresIn: 900,
    issuedAt: 1_000,
    refreshToken: "refresh-token"
  }), {
    accessToken: "access-token",
    expiresAt: 1_900_000,
    refreshToken: "refresh-token"
  });
  assert.throws(
    () => toStoredSession({ accessToken: "access-token", expiresIn: 900, issuedAt: 1_000 }),
    /refresh token/i
  );
});
