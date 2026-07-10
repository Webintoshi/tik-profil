import { CustomerApiError, type CustomerAccount } from "../api/customer";
import type { DirectSignIn } from "./logto-client";
import {
  initialSessionState,
  parseStoredSession,
  reduceSession,
  shouldRefresh,
  type SessionAction,
  type SessionState,
  type StoredSession
} from "./session-state";

interface SessionStorage {
  clear(): Promise<void>;
  read(): Promise<string | null>;
  write(value: string): Promise<void>;
}

export interface SessionControllerDependencies {
  authorize(mode: "signIn" | "signUp", directSignIn?: DirectSignIn): Promise<StoredSession | null>;
  fetchCustomer(accessToken: string): Promise<CustomerAccount>;
  now?: () => number;
  refresh(session: StoredSession): Promise<StoredSession>;
  revoke(session: StoredSession): Promise<void>;
  storage: SessionStorage;
}

type Listener = (state: SessionState) => void;

function message(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

function isUnauthorized(error: unknown): error is CustomerApiError {
  return error instanceof CustomerApiError && error.status === 401;
}

export function createSessionController(dependencies: SessionControllerDependencies) {
  let state = initialSessionState;
  let session: StoredSession | null = null;
  let generation = 0;
  let activeOperation: symbol | null = null;
  let cleanupBarrier: Promise<void> = Promise.resolve();
  const listeners = new Set<Listener>();

  const emit = (action: SessionAction, expectedGeneration?: number) => {
    if (expectedGeneration !== undefined && expectedGeneration !== generation) return false;
    state = reduceSession(state, action);
    listeners.forEach((listener) => listener(state));
    return true;
  };

  const isCurrent = (expectedGeneration: number) => expectedGeneration === generation;
  const needsRefresh = (value: StoredSession) => shouldRefresh(value, dependencies.now?.() ?? Date.now());

  const clearStorage = () => {
    const clearing = dependencies.storage.clear().catch(() => undefined);
    cleanupBarrier = clearing;
    return clearing;
  };

  const persist = async (nextSession: StoredSession, expectedGeneration: number) => {
    await cleanupBarrier;
    if (!isCurrent(expectedGeneration)) return false;
    await dependencies.storage.write(JSON.stringify(nextSession));
    if (!isCurrent(expectedGeneration)) {
      await clearStorage();
      return false;
    }
    return true;
  };

  const expire = async (error: string, expectedGeneration: number) => {
    if (!isCurrent(expectedGeneration)) return;
    generation += 1;
    activeOperation = null;
    session = null;
    emit({ error, type: "SESSION_EXPIRED" });
    await clearStorage();
  };

  const rotate = async (current: StoredSession, expectedGeneration: number) => {
    emit({ type: "CUSTOMER_REFRESH_STARTED" }, expectedGeneration);
    const rotated = await dependencies.refresh(current);
    if (!isCurrent(expectedGeneration)) return null;
    session = rotated;
    emit({ accessToken: rotated.accessToken, type: "TOKEN_RESTORED" }, expectedGeneration);
    return await persist(rotated, expectedGeneration) ? rotated : null;
  };

  const executeAuthorized = async <T>(
    operation: (accessToken: string) => Promise<T>,
    expectedGeneration: number
  ): Promise<T | undefined> => {
    let current = session;
    if (!current || !isCurrent(expectedGeneration)) return undefined;

    if (needsRefresh(current)) {
      try {
        current = await rotate(current, expectedGeneration);
        if (!current) return undefined;
      } catch (error) {
        await expire(message(error, "Oturum yenilenemedi. Yeniden giriş yapın."), expectedGeneration);
        return undefined;
      }
    }

    let retrySession: StoredSession | null = null;
    try {
      const result = await operation(current.accessToken);
      return isCurrent(expectedGeneration) ? result : undefined;
    } catch (error) {
      if (!isUnauthorized(error) || !isCurrent(expectedGeneration)) throw error;
      retrySession = current;
    }

    if (!retrySession) return undefined;
    try {
      current = await rotate(retrySession, expectedGeneration);
    } catch (error) {
      await expire(message(error, "Oturum yenilenemedi. Yeniden giriş yapın."), expectedGeneration);
      return undefined;
    }
    if (!current) return undefined;
    try {
      const result = await operation(current.accessToken);
      return isCurrent(expectedGeneration) ? result : undefined;
    } catch (error) {
      if (isUnauthorized(error)) {
        await expire(message(error, "Oturum yenilenemedi. Yeniden giriş yapın."), expectedGeneration);
        return undefined;
      }
      throw error;
    }
  };

  const loadCustomer = async (expectedGeneration: number) => {
    const customer = await executeAuthorized(dependencies.fetchCustomer, expectedGeneration);
    if (customer && isCurrent(expectedGeneration)) {
      emit({ customer, type: "CUSTOMER_LOADED" }, expectedGeneration);
    }
  };

  const runExclusive = async <T>(operation: (expectedGeneration: number) => Promise<T>) => {
    if (activeOperation) return undefined;
    const operationToken = Symbol("session-operation");
    activeOperation = operationToken;
    const expectedGeneration = generation;
    try {
      return await operation(expectedGeneration);
    } finally {
      if (activeOperation === operationToken) activeOperation = null;
    }
  };

  const authenticate = async (mode: "signIn" | "signUp", directSignIn?: DirectSignIn) => {
    if (activeOperation) return;
    generation += 1;
    const expectedGeneration = generation;
    const operationToken = Symbol("authenticate");
    activeOperation = operationToken;
    emit({ type: "AUTH_STARTED" }, expectedGeneration);
    try {
      await cleanupBarrier;
      if (!isCurrent(expectedGeneration)) return;
      const authorized = await dependencies.authorize(mode, directSignIn);
      if (!isCurrent(expectedGeneration)) return;
      if (!authorized) {
        emit({ type: "RESTORE_EMPTY" }, expectedGeneration);
        return;
      }
      session = authorized;
      emit({ accessToken: authorized.accessToken, type: "TOKEN_RESTORED" }, expectedGeneration);
      if (!await persist(authorized, expectedGeneration)) return;
      await loadCustomer(expectedGeneration);
    } catch (error) {
      await expire(message(error, "Giriş tamamlanamadı."), expectedGeneration);
    } finally {
      if (activeOperation === operationToken) activeOperation = null;
    }
  };

  return {
    getState: () => state,
    subscribe(listener: Listener) {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
    async restore() {
      await runExclusive(async (expectedGeneration) => {
        try {
          await cleanupBarrier;
          if (!isCurrent(expectedGeneration)) return;
          const stored = parseStoredSession(await dependencies.storage.read());
          if (!isCurrent(expectedGeneration)) return;
          if (!stored) {
            await clearStorage();
            emit({ type: "RESTORE_EMPTY" }, expectedGeneration);
            return;
          }
          session = stored;
          emit({ accessToken: stored.accessToken, type: "TOKEN_RESTORED" }, expectedGeneration);
          if (needsRefresh(stored)) {
            const rotated = await rotate(stored, expectedGeneration);
            if (!rotated) return;
          }
          await loadCustomer(expectedGeneration);
        } catch (error) {
          await expire(message(error, "Oturum yenilenemedi. Yeniden giriş yapın."), expectedGeneration);
        }
      });
    },
    signIn: (directSignIn?: DirectSignIn) => authenticate("signIn", directSignIn),
    signUp: () => authenticate("signUp"),
    async signOut() {
      generation += 1;
      activeOperation = null;
      const previous = session;
      session = null;
      emit({ type: "SIGNED_OUT" });
      await clearStorage();
      if (previous) await dependencies.revoke(previous).catch(() => undefined);
    },
    async refreshCustomer() {
      await runExclusive(async (expectedGeneration) => {
        if (!session) {
          emit({ type: "RESTORE_EMPTY" }, expectedGeneration);
          return;
        }
        emit({ type: "CUSTOMER_REFRESH_STARTED" }, expectedGeneration);
        try {
          await loadCustomer(expectedGeneration);
        } catch (error) {
          if (isCurrent(expectedGeneration)) {
            emit({ error: message(error, "Hesap bilgileri yenilenemedi."), type: "FAILED" }, expectedGeneration);
          }
        }
      });
    },
    async runAuthenticated<T>(operation: (accessToken: string) => Promise<T>) {
      return runExclusive((expectedGeneration) => executeAuthorized(operation, expectedGeneration));
    }
  };
}
