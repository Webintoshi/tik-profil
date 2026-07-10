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
  promptAsync(discovery: unknown): Promise<{
    params?: Record<string, string>;
    type: string;
  }>;
}

export interface LogtoAuthSessionDependencies {
  createRequest(config: Record<string, unknown>): AuthRequestShape;
  exchangeCodeAsync(config: Record<string, unknown>, discovery: unknown): Promise<TokenResponseShape>;
  fetchDiscoveryAsync(endpoint: string): Promise<unknown>;
  makeRedirectUri(options: { scheme: string }): string;
}

export type DirectSignIn = "apple" | "google";

const publicEnvironment: PublicEnvironment = {
  EXPO_PUBLIC_LOGTO_API_AUDIENCE: process.env.EXPO_PUBLIC_LOGTO_API_AUDIENCE,
  EXPO_PUBLIC_LOGTO_APP_ID: process.env.EXPO_PUBLIC_LOGTO_APP_ID,
  EXPO_PUBLIC_LOGTO_ENDPOINT: process.env.EXPO_PUBLIC_LOGTO_ENDPOINT
};

export function readLogtoConfiguration(environment: PublicEnvironment = publicEnvironment): LogtoConfiguration {
  const endpoint = environment.EXPO_PUBLIC_LOGTO_ENDPOINT?.trim().replace(/\/$/, "");
  const appId = environment.EXPO_PUBLIC_LOGTO_APP_ID?.trim();
  const audience = environment.EXPO_PUBLIC_LOGTO_API_AUDIENCE?.trim();
  if (!endpoint || !appId || !audience) {
    return {
      configured: false,
      error: "Giriş yapılandırması eksik. EXPO_PUBLIC_LOGTO_ENDPOINT, EXPO_PUBLIC_LOGTO_APP_ID ve EXPO_PUBLIC_LOGTO_API_AUDIENCE gerekli."
    };
  }
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

export async function completePendingWebAuthSession(): Promise<void> {
  const WebBrowser = await import("expo-web-browser");
  WebBrowser.maybeCompleteAuthSession();
}

export async function authorizeWithLogto(
  mode: "signIn" | "signUp",
  directSignIn?: DirectSignIn
): Promise<StoredSession | null> {
  const configuration = requireConfiguration();
  const AuthSession = await import("expo-auth-session");
  return authorizeWithAuthSession(configuration, mode, directSignIn, {
    createRequest: (config) => new AuthSession.AuthRequest(config as ConstructorParameters<typeof AuthSession.AuthRequest>[0]),
    exchangeCodeAsync: (config, discovery) => AuthSession.exchangeCodeAsync(
      config as Parameters<typeof AuthSession.exchangeCodeAsync>[0],
      discovery as Parameters<typeof AuthSession.exchangeCodeAsync>[1]
    ),
    fetchDiscoveryAsync: AuthSession.fetchDiscoveryAsync,
    makeRedirectUri: AuthSession.makeRedirectUri
  });
}

export async function authorizeWithAuthSession(
  configuration: Extract<LogtoConfiguration, { configured: true }>,
  mode: "signIn" | "signUp",
  directSignIn: DirectSignIn | undefined,
  dependencies: LogtoAuthSessionDependencies
): Promise<StoredSession | null> {
  const discovery = await dependencies.fetchDiscoveryAsync(configuration.endpoint);
  const redirectUri = dependencies.makeRedirectUri({ scheme: "tikprofil" });
  const extraParams: Record<string, string> = { resource: configuration.audience };
  if (mode === "signUp") extraParams.first_screen = "register";
  if (directSignIn) extraParams.direct_sign_in = `social:${directSignIn}`;

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
