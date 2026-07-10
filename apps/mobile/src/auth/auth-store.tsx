import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, type ReactNode } from "react";
import { Platform } from "react-native";

import { fetchCustomerAccount } from "../api/customer";
import {
  authorizeWithLogto,
  completePendingWebAuthSession,
  refreshLogtoSession,
  revokeLogtoSession,
  type DirectSignIn
} from "./logto-client";
import { createSessionStorage } from "./secure-session-storage";
import {
  createOperationGate,
  initialSessionState,
  parseStoredSession,
  reduceSession,
  shouldRefresh,
  type SessionStatus,
  type StoredSession
} from "./session-state";
import type { CustomerAccount } from "../api/customer";

export { isTokenExpired, parseStoredSession, reduceSession, shouldRefresh } from "./session-state";

export interface CustomerSession {
  status: SessionStatus;
  accessToken: string | null;
  customer: CustomerAccount | null;
  error: string | null;
  signIn(directSignIn?: DirectSignIn): Promise<void>;
  signUp(): Promise<void>;
  signOut(): Promise<void>;
  refreshCustomer(): Promise<void>;
}

const CustomerSessionContext = createContext<CustomerSession | null>(null);

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

export function CustomerSessionProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reduceSession, initialSessionState);
  const sessionRef = useRef<StoredSession | null>(null);
  const operationGate = useRef(createOperationGate());
  const storage = useMemo(() => createSessionStorage(Platform.OS), []);

  const loadCustomer = useCallback(async (session: StoredSession) => {
    if (sessionRef.current !== session) return;
    dispatch({ accessToken: session.accessToken, type: "TOKEN_RESTORED" });
    const customer = await fetchCustomerAccount(session.accessToken);
    if (sessionRef.current !== session) return;
    dispatch({ customer, type: "CUSTOMER_LOADED" });
  }, []);

  useEffect(() => {
    let cancelled = false;
    completePendingWebAuthSession().catch(() => undefined);

    void operationGate.current.run(async () => {
      try {
        const stored = parseStoredSession(await storage.read());
        if (!stored) {
          await storage.clear();
          if (!cancelled) dispatch({ type: "RESTORE_EMPTY" });
          return;
        }

        const session = shouldRefresh(stored) ? await refreshLogtoSession(stored) : stored;
        sessionRef.current = session;
        if (session !== stored) await storage.write(JSON.stringify(session));
        if (!cancelled) await loadCustomer(session);
      } catch (error) {
        sessionRef.current = null;
        await storage.clear().catch(() => undefined);
        if (!cancelled) {
          dispatch({
            error: errorMessage(error, "Oturum yenilenemedi. Yeniden giriş yapın."),
            type: "SESSION_EXPIRED"
          });
        }
      }
    });

    return () => { cancelled = true; };
  }, [loadCustomer, storage]);

  const authenticate = useCallback(async (mode: "signIn" | "signUp", directSignIn?: DirectSignIn) => {
    await operationGate.current.run(async () => {
      dispatch({ type: "AUTH_STARTED" });
      try {
        const session = await authorizeWithLogto(mode, directSignIn);
        if (!session) {
          dispatch({ type: "RESTORE_EMPTY" });
          return;
        }
        sessionRef.current = session;
        await storage.write(JSON.stringify(session));
        await loadCustomer(session);
      } catch (error) {
        sessionRef.current = null;
        await storage.clear().catch(() => undefined);
        dispatch({ error: errorMessage(error, "Giriş tamamlanamadı."), type: "SESSION_EXPIRED" });
      }
    });
  }, [loadCustomer, storage]);

  const signIn = useCallback((directSignIn?: DirectSignIn) => authenticate("signIn", directSignIn), [authenticate]);
  const signUp = useCallback(() => authenticate("signUp"), [authenticate]);

  const signOut = useCallback(async () => {
    const session = sessionRef.current;
    sessionRef.current = null;
    dispatch({ type: "SIGNED_OUT" });
    await storage.clear().catch(() => undefined);
    if (session) await revokeLogtoSession(session).catch(() => undefined);
  }, [storage]);

  const refreshCustomer = useCallback(async () => {
    await operationGate.current.run(async () => {
      const current = sessionRef.current;
      if (!current) {
        dispatch({ type: "RESTORE_EMPTY" });
        return;
      }
      dispatch({ type: "CUSTOMER_REFRESH_STARTED" });
      try {
        const session = shouldRefresh(current) ? await refreshLogtoSession(current) : current;
        sessionRef.current = session;
        if (session !== current) await storage.write(JSON.stringify(session));
        await loadCustomer(session);
      } catch (error) {
        dispatch({ error: errorMessage(error, "Hesap bilgileri yenilenemedi."), type: "FAILED" });
      }
    });
  }, [loadCustomer, storage]);

  const value = useMemo<CustomerSession>(() => ({
    accessToken: state.accessToken,
    customer: state.customer,
    error: state.error,
    refreshCustomer,
    signIn,
    signOut,
    signUp,
    status: state.status
  }), [refreshCustomer, signIn, signOut, signUp, state]);

  return <CustomerSessionContext.Provider value={value}>{children}</CustomerSessionContext.Provider>;
}

export function useCustomerSession(): CustomerSession {
  const session = useContext(CustomerSessionContext);
  if (!session) throw new Error("useCustomerSession must be used inside CustomerSessionProvider");
  return session;
}
