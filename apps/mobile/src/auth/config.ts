const DEFAULT_LOGTO_REDIRECT_URI = "tikprofil://auth/callback";
const DEFAULT_WEB_CALLBACK_PATH = "/kesfet";

function trimToNull(value: null | string | undefined): null | string {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function normalizeUrl(value: null | string | undefined): null | string {
  const candidate = trimToNull(value);

  if (!candidate) {
    return null;
  }

  try {
    const url = new URL(candidate);
    url.hash = "";
    url.search = "";
    url.pathname = url.pathname.replace(/\/+$/, "");
    return url.toString().replace(/\/$/, "");
  } catch {
    return null;
  }
}

export function buildLogtoRedirectUri(appScheme = "tikprofil"): string {
  const normalizedScheme = appScheme.replace(/:\/\//g, "").trim() || "tikprofil";
  return `${normalizedScheme}://auth/callback`;
}

export function buildCustomerWebSignInPath(
  callbackPath = DEFAULT_WEB_CALLBACK_PATH,
): string {
  const normalizedCallback =
    callbackPath.startsWith("/") && !callbackPath.startsWith("//")
      ? callbackPath
      : DEFAULT_WEB_CALLBACK_PATH;

  return `/api/auth/logto/sign-in?actor=customer&callbackUrl=${encodeURIComponent(normalizedCallback)}`;
}

export interface LogtoMobileRuntimeConfig {
  accountPath: string;
  actor: "customer";
  apiBaseUrl: string;
  appId: null | string;
  customerSessionBridgePath: string;
  enabled: boolean;
  endpoint: null | string;
  logoutPath: string;
  mePath: string;
  profilePath: string;
  redirectUri: string;
  scopes: string[];
  webSignInPath: string;
}

export function resolveLogtoMobileRuntimeConfig(
  overrides: Partial<{
    apiBaseUrl: string;
    appId: string;
    endpoint: string;
    redirectUri: string;
    scopes: string[];
    webCallbackPath: string;
  }> = {},
): LogtoMobileRuntimeConfig {
  const apiBaseUrl =
    normalizeUrl(overrides.apiBaseUrl ?? process.env.EXPO_PUBLIC_API_BASE_URL) ??
    "https://tikprofil.com";
  const appId = trimToNull(
    overrides.appId ?? process.env.EXPO_PUBLIC_LOGTO_APP_ID,
  );
  const endpoint = normalizeUrl(
    overrides.endpoint ?? process.env.EXPO_PUBLIC_LOGTO_ENDPOINT,
  );
  const redirectUri =
    trimToNull(
      overrides.redirectUri ?? process.env.EXPO_PUBLIC_LOGTO_REDIRECT_URI,
    ) ?? DEFAULT_LOGTO_REDIRECT_URI;
  const scopes = overrides.scopes?.length ? overrides.scopes : ["profile", "email"];
  const webCallbackPath =
    trimToNull(overrides.webCallbackPath) ?? DEFAULT_WEB_CALLBACK_PATH;

  return {
    accountPath: "/api/account",
    actor: "customer",
    apiBaseUrl,
    appId,
    customerSessionBridgePath: "/api/auth/logto/mobile/customer-session",
    enabled: Boolean(appId && endpoint),
    endpoint,
    logoutPath: "/api/auth/logout",
    mePath: "/api/auth/logto/me",
    profilePath: "/api/kesfet/user/profile",
    redirectUri,
    scopes,
    webSignInPath: buildCustomerWebSignInPath(webCallbackPath),
  };
}
