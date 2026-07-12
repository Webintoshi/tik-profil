import type { StoredSession } from "./session-state";

interface PublicEnvironment {
  EXPO_PUBLIC_LOGTO_API_AUDIENCE?: string;
  EXPO_PUBLIC_LOGTO_APP_ID?: string;
  EXPO_PUBLIC_LOGTO_ENDPOINT?: string;
}

export type LogtoConfiguration =
  | { configured: false; error: string }
  | { configured: true; appId: string; audience: string; endpoint: string };

interface TokenResponseShape {
  accessToken: string;
  expiresIn?: number;
  issuedAt: number;
  refreshToken?: string;
}

interface AuthRequestShape {
  codeVerifier?: string;
  makeAuthUrlAsync?(discovery: unknown): Promise<string>;
  promptAsync(discovery: unknown): Promise<{
    params?: Record<string, string>;
    type: string;
  }>;
  state?: string;
}

interface WebAuthRuntime {
  assign(url: string): void;
  getCurrentUrl(): string;
  getItem(key: string): string | null;
  now(): number;
  removeItem(key: string): void;
  replaceUrl(url: string): void;
  setItem(key: string, value: string): void;
}

export interface LogtoAuthSessionDependencies {
  createRequest(config: Record<string, unknown>): AuthRequestShape;
  exchangeCodeAsync(config: Record<string, unknown>, discovery: unknown): Promise<TokenResponseShape>;
  fetchDiscoveryAsync(endpoint: string): Promise<unknown>;
  makeRedirectUri(options: { path?: string; scheme?: string }): string;
  web?: WebAuthRuntime;
}

export type DirectSignIn = "apple" | "google";
export type LogtoAuthPlatform = "native" | "web";

const publicEnvironment: PublicEnvironment = {
  EXPO_PUBLIC_LOGTO_API_AUDIENCE: process.env.EXPO_PUBLIC_LOGTO_API_AUDIENCE,
  EXPO_PUBLIC_LOGTO_APP_ID: process.env.EXPO_PUBLIC_LOGTO_APP_ID,
  EXPO_PUBLIC_LOGTO_ENDPOINT: process.env.EXPO_PUBLIC_LOGTO_ENDPOINT
};

const WEB_AUTH_PENDING_KEY = "tikprofil.logto.pending";
const WEB_AUTH_MAX_AGE_MS = 10 * 60 * 1000;

interface PendingWebAuthorization {
  codeVerifier: string;
  createdAt: number;
  redirectUri: string;
  state: string;
}

export function readLogtoConfiguration(environment: PublicEnvironment = publicEnvironment): LogtoConfiguration {
  const configuredEndpoint = environment.EXPO_PUBLIC_LOGTO_ENDPOINT?.trim().replace(/\/$/, "");
  const appId = environment.EXPO_PUBLIC_LOGTO_APP_ID?.trim();
  const audience = environment.EXPO_PUBLIC_LOGTO_API_AUDIENCE?.trim();
  if (!configuredEndpoint || !appId || !audience) {
    return {
      configured: false,
      error: "Giriş yapılandırması eksik. EXPO_PUBLIC_LOGTO_ENDPOINT, EXPO_PUBLIC_LOGTO_APP_ID ve EXPO_PUBLIC_LOGTO_API_AUDIENCE gerekli."
    };
  }
  const endpoint = configuredEndpoint.endsWith("/oidc") ? configuredEndpoint : `${configuredEndpoint}/oidc`;
  return { appId, audience, configured: true, endpoint };
}

export function toStoredSession(token: TokenResponseShape): StoredSession {
  if (!token.refreshToken) {
    throw new Error("Logto refresh token döndürmedi. Native uygulama ve offline_access ayarlarını kontrol edin.");
  }
  return {
    accessToken: token.accessToken,
    expiresAt: (token.issuedAt + (token.expiresIn ?? 3600)) * 1000,
    refreshToken: token.refreshToken
  };
}

function requireConfiguration(): Extract<LogtoConfiguration, { configured: true }> {
  const configuration = readLogtoConfiguration();
  if (!configuration.configured) throw new Error(configuration.error);
  return configuration;
}

function createWebAuthRuntime(): WebAuthRuntime {
  if (
    typeof globalThis.location === "undefined"
    || typeof globalThis.sessionStorage === "undefined"
    || typeof globalThis.history === "undefined"
  ) {
    throw new Error("Web giriş ortamı kullanılamıyor.");
  }
  return {
    assign: (url) => globalThis.location.assign(url),
    getCurrentUrl: () => globalThis.location.href,
    getItem: (key) => globalThis.sessionStorage.getItem(key),
    now: () => Date.now(),
    removeItem: (key) => globalThis.sessionStorage.removeItem(key),
    replaceUrl: (url) => globalThis.history.replaceState(null, "", url),
    setItem: (key, value) => globalThis.sessionStorage.setItem(key, value)
  };
}

function parsePendingWebAuthorization(value: string | null): PendingWebAuthorization | null {
  if (!value) return null;
  try {
    const pending: unknown = JSON.parse(value);
    if (
      !pending
      || typeof pending !== "object"
      || !("codeVerifier" in pending)
      || !("createdAt" in pending)
      || !("redirectUri" in pending)
      || !("state" in pending)
      || typeof pending.codeVerifier !== "string"
      || typeof pending.createdAt !== "number"
      || typeof pending.redirectUri !== "string"
      || typeof pending.state !== "string"
    ) return null;
    return pending as PendingWebAuthorization;
  } catch {
    return null;
  }
}

function cleanAuthorizationCallbackUrl(url: URL): string {
  for (const key of ["code", "state", "error", "error_code", "error_description"]) {
    url.searchParams.delete(key);
  }
  return url.toString();
}

export async function completePendingWebAuthSession(): Promise<StoredSession | null> {
  const { Platform } = await import("react-native");
  if (Platform.OS !== "web") {
    const WebBrowser = await import("expo-web-browser");
    WebBrowser.maybeCompleteAuthSession();
    return null;
  }

  const configuration = requireConfiguration();
  const AuthSession = await import("expo-auth-session");
  return completeWebAuthRedirect(configuration, {
    createRequest: (config) => new AuthSession.AuthRequest(config as ConstructorParameters<typeof AuthSession.AuthRequest>[0]),
    exchangeCodeAsync: (config, discovery) => AuthSession.exchangeCodeAsync(
      config as Parameters<typeof AuthSession.exchangeCodeAsync>[0],
      discovery as Parameters<typeof AuthSession.exchangeCodeAsync>[1]
    ),
    fetchDiscoveryAsync: AuthSession.fetchDiscoveryAsync,
    makeRedirectUri: AuthSession.makeRedirectUri,
    web: createWebAuthRuntime()
  });
}

export async function authorizeWithLogto(
  mode: "signIn" | "signUp",
  directSignIn?: DirectSignIn
): Promise<StoredSession | null> {
  const configuration = requireConfiguration();
  const AuthSession = await import("expo-auth-session");
  const { Platform } = await import("react-native");
  return authorizeWithAuthSession(configuration, mode, directSignIn, {
    createRequest: (config) => new AuthSession.AuthRequest(config as ConstructorParameters<typeof AuthSession.AuthRequest>[0]),
    exchangeCodeAsync: (config, discovery) => AuthSession.exchangeCodeAsync(
      config as Parameters<typeof AuthSession.exchangeCodeAsync>[0],
      discovery as Parameters<typeof AuthSession.exchangeCodeAsync>[1]
    ),
    fetchDiscoveryAsync: AuthSession.fetchDiscoveryAsync,
    makeRedirectUri: AuthSession.makeRedirectUri,
    web: Platform.OS === "web" ? createWebAuthRuntime() : undefined
  }, Platform.OS === "web" ? "web" : "native");
}

export function getLogtoRedirectOptions(platform: LogtoAuthPlatform) {
  return platform === "web"
    ? { path: "account" } as const
    : { path: "auth/callback", scheme: "tikprofil" } as const;
}

export async function authorizeWithAuthSession(
  configuration: Extract<LogtoConfiguration, { configured: true }>,
  mode: "signIn" | "signUp",
  directSignIn: DirectSignIn | undefined,
  dependencies: LogtoAuthSessionDependencies,
  platform: LogtoAuthPlatform = "native"
): Promise<StoredSession | null> {
  const discovery = await dependencies.fetchDiscoveryAsync(configuration.endpoint);
  const redirectUri = dependencies.makeRedirectUri(getLogtoRedirectOptions(platform));
  const extraParams: Record<string, string> = {
    resource: configuration.audience,
    ui_locales: "tr-TR"
  };
  if (directSignIn) {
    if (mode === "signUp") extraParams.first_screen = "register";
    extraParams.direct_sign_in = `social:${directSignIn}`;
  } else {
    extraParams.first_screen = mode === "signUp"
      ? "identifier:register"
      : "identifier:sign-in";
    extraParams.identifier = "phone";
  }

  const request = dependencies.createRequest({
    clientId: configuration.appId,
    codeChallengeMethod: "S256",
    extraParams,
    prompt: "consent",
    redirectUri,
    responseType: "code",
    scopes: ["openid", "profile", "email", "offline_access"],
    usePKCE: true
  });

  if (platform === "web") {
    const runtime = dependencies.web;
    if (!runtime || !request.makeAuthUrlAsync) {
      throw new Error("Web giriş yönlendirmesi kullanılamıyor.");
    }
    const authorizationUrl = await request.makeAuthUrlAsync(discovery);
    if (!request.codeVerifier || !request.state) {
      throw new Error("Web giriş doğrulaması hazırlanamadı.");
    }
    runtime.setItem(WEB_AUTH_PENDING_KEY, JSON.stringify({
      codeVerifier: request.codeVerifier,
      createdAt: runtime.now(),
      redirectUri,
      state: request.state
    } satisfies PendingWebAuthorization));
    runtime.assign(authorizationUrl);
    return null;
  }

  const result = await request.promptAsync(discovery);
  if (result.type === "cancel" || result.type === "dismiss") return null;
  const authorizationCode = result.params?.code;
  if (result.type !== "success" || !authorizationCode || !request.codeVerifier) {
    throw new Error("Logto girişi tamamlanamadı.");
  }

  const token = await dependencies.exchangeCodeAsync({
    clientId: configuration.appId,
    code: authorizationCode,
    extraParams: { code_verifier: request.codeVerifier, resource: configuration.audience },
    redirectUri
  }, discovery);
  return toStoredSession(token);
}

export async function completeWebAuthRedirect(
  configuration: Extract<LogtoConfiguration, { configured: true }>,
  dependencies: LogtoAuthSessionDependencies
): Promise<StoredSession | null> {
  const runtime = dependencies.web;
  if (!runtime) throw new Error("Web giriş yönlendirmesi kullanılamıyor.");

  const callbackUrl = new URL(runtime.getCurrentUrl());
  const authorizationCode = callbackUrl.searchParams.get("code");
  const returnedState = callbackUrl.searchParams.get("state");
  const authorizationError = callbackUrl.searchParams.get("error");
  const authorizationErrorDescription = callbackUrl.searchParams.get("error_description");
  if (!authorizationCode && !authorizationError) return null;

  const pending = parsePendingWebAuthorization(runtime.getItem(WEB_AUTH_PENDING_KEY));
  if (!pending || runtime.now() - pending.createdAt > WEB_AUTH_MAX_AGE_MS) {
    throw new Error("Giriş doğrulaması bulunamadı veya süresi doldu.");
  }
  if (!returnedState || returnedState !== pending.state) {
    throw new Error("Giriş doğrulaması eşleşmedi.");
  }

  const expectedCallback = new URL(pending.redirectUri);
  if (callbackUrl.origin !== expectedCallback.origin || callbackUrl.pathname !== expectedCallback.pathname) {
    throw new Error("Giriş dönüş adresi doğrulanamadı.");
  }

  runtime.removeItem(WEB_AUTH_PENDING_KEY);
  runtime.replaceUrl(cleanAuthorizationCallbackUrl(callbackUrl));

  if (authorizationError) {
    throw new Error(authorizationErrorDescription || "Logto girişi iptal edildi.");
  }
  if (!authorizationCode) {
    throw new Error("Logto giriş kodu bulunamadı.");
  }

  const discovery = await dependencies.fetchDiscoveryAsync(configuration.endpoint);
  const token = await dependencies.exchangeCodeAsync({
    clientId: configuration.appId,
    code: authorizationCode,
    extraParams: { code_verifier: pending.codeVerifier, resource: configuration.audience },
    redirectUri: pending.redirectUri
  }, discovery);
  return toStoredSession(token);
}

export async function refreshLogtoSession(session: StoredSession): Promise<StoredSession> {
  const configuration = requireConfiguration();
  const AuthSession = await import("expo-auth-session");
  const discovery = await AuthSession.fetchDiscoveryAsync(configuration.endpoint);
  const token = await AuthSession.refreshAsync({
    clientId: configuration.appId,
    extraParams: { resource: configuration.audience },
    refreshToken: session.refreshToken,
    scopes: ["openid", "profile", "email", "offline_access"]
  }, discovery);
  return toStoredSession({
    ...token,
    refreshToken: token.refreshToken ?? session.refreshToken
  });
}

export async function revokeLogtoSession(session: StoredSession): Promise<void> {
  const configuration = readLogtoConfiguration();
  if (!configuration.configured) return;
  const AuthSession = await import("expo-auth-session");
  const discovery = await AuthSession.fetchDiscoveryAsync(configuration.endpoint);
  if (!discovery.revocationEndpoint) return;
  await AuthSession.revokeAsync({
    clientId: configuration.appId,
    token: session.refreshToken,
    tokenTypeHint: AuthSession.TokenTypeHint.RefreshToken
  }, discovery);
}
