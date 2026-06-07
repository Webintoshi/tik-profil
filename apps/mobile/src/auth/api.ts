import { ApiClientError } from "@/api/types";
import { buildApiUrl } from "@/api/url";

export interface CustomerBackendSession {
  actorType: "customer";
  appUserId: string;
  displayName?: null | string;
  email?: null | string;
  logtoSub: string;
  provider: "logto";
  role: "customer";
  success: true;
}

export interface CustomerAccountProfile {
  actorType: "customer";
  appUserId: string;
  addresses?: unknown[];
  createdAt?: string;
  displayName?: null | string;
  email?: null | string;
  isPrime?: boolean;
  phone?: null | string;
  photoURL?: null | string;
  preferences?: {
    language?: string;
    notifications?: Record<string, boolean>;
    theme?: string;
  };
  provider: "logto";
  role: "customer";
  updatedAt?: string;
  uid: string;
  wallet?: {
    balance: number;
    lastUpdated?: string;
    points: number;
  };
}

interface JsonErrorEnvelope {
  code?: string;
  error?: string;
  success?: false;
}

interface JsonSuccessEnvelope<T> {
  data: T;
  success: true;
}

function isJsonErrorEnvelope(payload: unknown): payload is JsonErrorEnvelope {
  return Boolean(payload) && typeof payload === "object";
}

function getErrorCode(payload: null | unknown): string {
  if (
    isJsonErrorEnvelope(payload) &&
    typeof payload.code === "string" &&
    payload.code.trim()
  ) {
    return payload.code;
  }

  return "API_ERROR";
}

function getErrorMessage(payload: null | unknown, fallbackMessage: string): string {
  if (
    isJsonErrorEnvelope(payload) &&
    typeof payload.error === "string" &&
    payload.error.trim()
  ) {
    return payload.error;
  }

  return fallbackMessage;
}

async function readJsonPayload<T>(response: Response): Promise<null | T> {
  try {
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

async function parseJsonResponse<T>(
  response: Response,
  fallbackMessage: string,
): Promise<T> {
  const payload = await readJsonPayload<JsonErrorEnvelope | JsonSuccessEnvelope<T>>(
    response,
  );

  if (!response.ok) {
    throw new ApiClientError(
      getErrorMessage(payload, fallbackMessage),
      getErrorCode(payload),
      response.status,
    );
  }

  if (!payload || !("success" in payload) || payload.success !== true) {
    throw new ApiClientError(fallbackMessage, "API_ERROR", response.status);
  }

  return payload.data;
}

export async function getCurrentSession(input: {
  apiBaseUrl: string;
  fetchImpl?: typeof fetch;
  mePath?: string;
}): Promise<CustomerBackendSession | null> {
  const fetchImpl = input.fetchImpl ?? fetch;
  const response = await fetchImpl(
    buildApiUrl(input.apiBaseUrl, input.mePath ?? "/api/auth/logto/me"),
    {
      credentials: "include",
      method: "GET",
    },
  );

  if (response.status === 401) {
    return null;
  }

  const payload = await readJsonPayload<CustomerBackendSession | JsonErrorEnvelope>(
    response,
  );

  if (!response.ok) {
    throw new ApiClientError(
      getErrorMessage(payload, "Customer backend session could not be loaded."),
      getErrorCode(payload),
      response.status,
    );
  }

  if (
    !payload ||
    typeof payload !== "object" ||
    !("success" in payload) ||
    payload.success !== true ||
    payload.actorType !== "customer" ||
    payload.provider !== "logto" ||
    payload.role !== "customer"
  ) {
    throw new ApiClientError(
      "Customer backend session response was invalid.",
      "API_ERROR",
      response.status,
    );
  }

  return payload;
}

export async function getAccount(input: {
  accountPath?: string;
  apiBaseUrl: string;
  fetchImpl?: typeof fetch;
}): Promise<CustomerAccountProfile> {
  const fetchImpl = input.fetchImpl ?? fetch;

  return await parseJsonResponse<CustomerAccountProfile>(
    await fetchImpl(
      buildApiUrl(input.apiBaseUrl, input.accountPath ?? "/api/account"),
      {
        credentials: "include",
        method: "GET",
      },
    ),
    "Customer account profile could not be loaded.",
  );
}

export async function logout(input: {
  apiBaseUrl: string;
  fetchImpl?: typeof fetch;
  logoutPath?: string;
}): Promise<void> {
  const fetchImpl = input.fetchImpl ?? fetch;
  const response = await fetchImpl(
    buildApiUrl(input.apiBaseUrl, input.logoutPath ?? "/api/auth/logout"),
    {
      body: JSON.stringify({
        postLogoutRedirect: "/kesfet",
      }),
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      method: "POST",
    },
  );

  if (!response.ok) {
    const payload = await readJsonPayload<JsonErrorEnvelope>(response);
    throw new ApiClientError(
      getErrorMessage(payload, "Customer logout could not be completed."),
      getErrorCode(payload),
      response.status,
    );
  }
}

export async function startCustomerLogin(input: {
  redirectUri: string;
  signIn: (redirectUri: string) => Promise<void>;
}): Promise<void> {
  await input.signIn(input.redirectUri);
}
