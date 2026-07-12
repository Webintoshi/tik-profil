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
  authorizeWithAuthSession,
  completeWebAuthRedirect,
  getLogtoRedirectOptions,
  readLogtoConfiguration,
  toStoredSession
}: typeof import("./logto-client") = await import(new URL("./logto-client.ts", import.meta.url).href);

test("missing Logto public settings return an explicit safe configuration error", () => {
  assert.deepEqual(readLogtoConfiguration({}), {
    configured: false,
    error: "Giriş yapılandırması eksik. EXPO_PUBLIC_LOGTO_ENDPOINT, EXPO_PUBLIC_LOGTO_APP_ID ve EXPO_PUBLIC_LOGTO_API_AUDIENCE gerekli."
  });
});

const configuredLogto = {
  appId: "mobile-app",
  audience: "https://api.example.test",
  configured: true as const,
  endpoint: "https://auth.example.test"
};

test("Logto redirects match the registered web and native callbacks", () => {
  assert.deepEqual(getLogtoRedirectOptions("native"), {
    path: "auth/callback",
    scheme: "tikprofil"
  });
  assert.deepEqual(getLogtoRedirectOptions("web"), { path: "account" });
});

test("PKCE authorization uses S256, native redirect, API resource, and offline scopes", async () => {
  let requestConfig: Record<string, unknown> | undefined;
  let redirectOptions: unknown;
  const session = await authorizeWithAuthSession(configuredLogto, "signUp", "google", {
    createRequest(config) {
      requestConfig = config;
      return {
        codeVerifier: "pkce-verifier",
        promptAsync: async () => ({ params: { code: "authorization-code" }, type: "success" })
      };
    },
    exchangeCodeAsync: async () => ({ accessToken: "access", expiresIn: 900, issuedAt: 1000, refreshToken: "refresh" }),
    fetchDiscoveryAsync: async () => ({ tokenEndpoint: "https://auth.example.test/oidc/token" }),
    makeRedirectUri(options) { redirectOptions = options; return "tikprofil://auth/callback"; }
  });
  assert.deepEqual(redirectOptions, { path: "auth/callback", scheme: "tikprofil" });
  assert.deepEqual(requestConfig, {
    clientId: "mobile-app",
    codeChallengeMethod: "S256",
    extraParams: {
      direct_sign_in: "social:google",
      first_screen: "register",
      resource: "https://api.example.test"
    },
    prompt: "consent",
    redirectUri: "tikprofil://auth/callback",
    responseType: "code",
    scopes: ["openid", "profile", "email", "offline_access"],
    usePKCE: true
  });
  assert.equal(session?.refreshToken, "refresh");
});

test("web authorization redirects the current tab and preserves PKCE state", async () => {
  let redirectOptions: unknown;
  let requestConfig: Record<string, unknown> | undefined;
  let promptCalls = 0;
  let redirectedTo: string | undefined;
  const pending = new Map<string, string>();
  const result = await authorizeWithAuthSession(configuredLogto, "signIn", undefined, {
    createRequest(config) {
      requestConfig = config;
      return {
        codeVerifier: "pkce-verifier",
        makeAuthUrlAsync: async () => "https://auth.example.test/oidc/auth?state=csrf-state",
        promptAsync: async () => {
          promptCalls += 1;
          return { params: { code: "authorization-code" }, type: "success" };
        },
        state: "csrf-state"
      };
    },
    exchangeCodeAsync: async () => ({ accessToken: "access", issuedAt: 1000, refreshToken: "refresh" }),
    fetchDiscoveryAsync: async () => ({}),
    makeRedirectUri(options) { redirectOptions = options; return "http://localhost:8082/account"; },
    web: {
      assign(url) { redirectedTo = url; },
      getCurrentUrl: () => "http://localhost:8082/account",
      getItem: (key) => pending.get(key) ?? null,
      now: () => 1_000,
      removeItem: (key) => { pending.delete(key); },
      replaceUrl: () => undefined,
      setItem: (key, value) => { pending.set(key, value); }
    }
  }, "web");
  assert.deepEqual(redirectOptions, { path: "account" });
  assert.equal(requestConfig?.redirectUri, "http://localhost:8082/account");
  assert.equal(promptCalls, 0);
  assert.equal(redirectedTo, "https://auth.example.test/oidc/auth?state=csrf-state");
  assert.equal(result, null);
  assert.deepEqual(JSON.parse([...pending.values()][0] ?? "null"), {
    codeVerifier: "pkce-verifier",
    createdAt: 1_000,
    redirectUri: "http://localhost:8082/account",
    state: "csrf-state"
  });
});

test("web callback validates state, exchanges the code, and cleans the callback URL", async () => {
  let exchangeConfig: Record<string, unknown> | undefined;
  let replacedWith: string | undefined;
  const pending = new Map<string, string>([["tikprofil.logto.pending", JSON.stringify({
    codeVerifier: "pkce-verifier",
    createdAt: 1_000,
    redirectUri: "http://localhost:8082/account",
    state: "csrf-state"
  })]]);

  const session = await completeWebAuthRedirect(configuredLogto, {
    createRequest: () => { throw new Error("must not create a second request"); },
    exchangeCodeAsync: async (config) => {
      exchangeConfig = config;
      return { accessToken: "access", expiresIn: 900, issuedAt: 2_000, refreshToken: "refresh" };
    },
    fetchDiscoveryAsync: async () => ({ tokenEndpoint: "https://auth.example.test/oidc/token" }),
    makeRedirectUri: () => "http://localhost:8082/account",
    web: {
      assign: () => undefined,
      getCurrentUrl: () => "http://localhost:8082/account?code=authorization-code&state=csrf-state",
      getItem: (key) => pending.get(key) ?? null,
      now: () => 2_000,
      removeItem: (key) => { pending.delete(key); },
      replaceUrl(url) { replacedWith = url; },
      setItem: (key, value) => { pending.set(key, value); }
    }
  });

  assert.deepEqual(exchangeConfig, {
    clientId: "mobile-app",
    code: "authorization-code",
    extraParams: { code_verifier: "pkce-verifier", resource: "https://api.example.test" },
    redirectUri: "http://localhost:8082/account"
  });
  assert.equal(session?.refreshToken, "refresh");
  assert.equal(pending.size, 0);
  assert.equal(replacedWith, "http://localhost:8082/account");
});

test("web callback rejects mismatched OAuth state before code exchange", async () => {
  let exchangeCalls = 0;
  const pending = new Map<string, string>([["tikprofil.logto.pending", JSON.stringify({
    codeVerifier: "pkce-verifier",
    createdAt: 1_000,
    redirectUri: "http://localhost:8082/account",
    state: "expected-state"
  })]]);

  await assert.rejects(() => completeWebAuthRedirect(configuredLogto, {
    createRequest: () => { throw new Error("must not create a second request"); },
    exchangeCodeAsync: async () => {
      exchangeCalls += 1;
      throw new Error("must not exchange");
    },
    fetchDiscoveryAsync: async () => ({}),
    makeRedirectUri: () => "http://localhost:8082/account",
    web: {
      assign: () => undefined,
      getCurrentUrl: () => "http://localhost:8082/account?code=authorization-code&state=wrong-state",
      getItem: (key) => pending.get(key) ?? null,
      now: () => 2_000,
      removeItem: (key) => { pending.delete(key); },
      replaceUrl: () => undefined,
      setItem: (key, value) => { pending.set(key, value); }
    }
  }), /doğrulama/i);
  assert.equal(exchangeCalls, 0);
  assert.equal(pending.size, 0);
});

test("PKCE cancellation returns null without code exchange", async () => {
  let exchangeCalls = 0;
  const result = await authorizeWithAuthSession(configuredLogto, "signIn", undefined, {
    createRequest: () => ({ codeVerifier: "unused", promptAsync: async () => ({ type: "cancel" }) }),
    exchangeCodeAsync: async () => { exchangeCalls += 1; throw new Error("must not exchange"); },
    fetchDiscoveryAsync: async () => ({}),
    makeRedirectUri: () => "tikprofil://"
  });
  assert.equal(result, null);
  assert.equal(exchangeCalls, 0);
});

test("PKCE verifier and resource reach authorization-code exchange", async () => {
  let exchangeConfig: Record<string, unknown> | undefined;
  await authorizeWithAuthSession(configuredLogto, "signIn", undefined, {
    createRequest: () => ({
      codeVerifier: "exact-verifier",
      promptAsync: async () => ({ params: { code: "exact-code" }, type: "success" })
    }),
    exchangeCodeAsync: async (config) => {
      exchangeConfig = config;
      return { accessToken: "access", expiresIn: 900, issuedAt: 1000, refreshToken: "refresh" };
    },
    fetchDiscoveryAsync: async () => ({ tokenEndpoint: "token-endpoint" }),
    makeRedirectUri: () => "tikprofil://"
  });
  assert.deepEqual(exchangeConfig, {
    clientId: "mobile-app",
    code: "exact-code",
    extraParams: { code_verifier: "exact-verifier", resource: "https://api.example.test" },
    redirectUri: "tikprofil://"
  });
});

test("Logto configuration trims values and normalizes the Logto OIDC issuer URL", () => {
  assert.deepEqual(readLogtoConfiguration({
    EXPO_PUBLIC_LOGTO_API_AUDIENCE: " https://api.example.test ",
    EXPO_PUBLIC_LOGTO_APP_ID: " mobile-app ",
    EXPO_PUBLIC_LOGTO_ENDPOINT: " https://auth.example.test/ "
  }), {
    appId: "mobile-app",
    audience: "https://api.example.test",
    configured: true,
    endpoint: "https://auth.example.test/oidc"
  });
});

test("Logto configuration does not duplicate an explicit OIDC issuer path", () => {
  const configuration = readLogtoConfiguration({
    EXPO_PUBLIC_LOGTO_API_AUDIENCE: "https://api.example.test",
    EXPO_PUBLIC_LOGTO_APP_ID: "mobile-app",
    EXPO_PUBLIC_LOGTO_ENDPOINT: "https://auth.example.test/oidc/"
  });
  assert.equal(configuration.configured && configuration.endpoint, "https://auth.example.test/oidc");
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
