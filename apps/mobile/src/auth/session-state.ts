import type { CustomerAccount } from "../api/customer";

export type SessionStatus =
  | "loading"
  | "signed_out"
  | "authenticating"
  | "refreshing"
  | "signed_in"
  | "error";

export interface StoredSession {
  accessToken: string;
  expiresAt: number;
  refreshToken: string;
}

export interface SessionState {
  accessToken: string | null;
  customer: CustomerAccount | null;
  error: string | null;
  status: SessionStatus;
}

export type SessionAction =
  | { type: "AUTH_STARTED" }
  | { type: "CUSTOMER_LOADED"; customer: CustomerAccount }
  | { type: "CUSTOMER_REFRESH_STARTED" }
  | { type: "FAILED"; error: string }
  | { type: "RESTORE_EMPTY" }
  | { type: "SESSION_EXPIRED"; error: string }
  | { type: "SIGNED_OUT" }
  | { type: "TOKEN_RESTORED"; accessToken: string };

export const initialSessionState: SessionState = {
  accessToken: null,
  customer: null,
  error: null,
  status: "loading"
};

const signedOutState: SessionState = {
  accessToken: null,
  customer: null,
  error: null,
  status: "signed_out"
};

export function parseStoredSession(value: string | null): StoredSession | null {
  if (!value) return null;

  try {
    const parsed: unknown = JSON.parse(value);
    if (
      !parsed ||
      typeof parsed !== "object" ||
      !("accessToken" in parsed) ||
      !("refreshToken" in parsed) ||
      !("expiresAt" in parsed) ||
      typeof parsed.accessToken !== "string" ||
      typeof parsed.refreshToken !== "string" ||
      typeof parsed.expiresAt !== "number" ||
      !parsed.accessToken ||
      !parsed.refreshToken ||
      !Number.isFinite(parsed.expiresAt)
    ) {
      return null;
    }

    return {
      accessToken: parsed.accessToken,
      expiresAt: parsed.expiresAt,
      refreshToken: parsed.refreshToken
    };
  } catch {
    return null;
  }
}

export function isTokenExpired(session: StoredSession, now = Date.now()): boolean {
  return session.expiresAt <= now;
}

export function shouldRefresh(session: StoredSession, now = Date.now()): boolean {
  return session.expiresAt - now <= 60_000;
}

export function reduceSession(state: SessionState, action: SessionAction): SessionState {
  switch (action.type) {
    case "AUTH_STARTED":
      return { ...state, error: null, status: "authenticating" };
    case "CUSTOMER_LOADED":
      return { ...state, customer: action.customer, error: null, status: "signed_in" };
    case "CUSTOMER_REFRESH_STARTED":
      return { ...state, error: null, status: "refreshing" };
    case "FAILED":
      return { ...state, error: action.error, status: "error" };
    case "RESTORE_EMPTY":
    case "SIGNED_OUT":
      return signedOutState;
    case "SESSION_EXPIRED":
      return { ...signedOutState, error: action.error };
    case "TOKEN_RESTORED":
      return {
        ...state,
        accessToken: action.accessToken,
        error: null,
        status: "refreshing"
      };
  }
}

export function createOperationGate() {
  let active = false;

  return {
    async run<T>(operation: () => Promise<T>): Promise<T | undefined> {
      if (active) return undefined;
      active = true;
      try {
        return await operation();
      } finally {
        active = false;
      }
    }
  };
}
