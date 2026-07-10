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

const INVALIDATED_SESSION = JSON.stringify({ invalidated: true });
const CLEAR_ATTEMPTS = 3;
const CLEANUP_WARNING = "Oturum kapatıldı ancak güvenli cihaz kaydı temizlenemedi; kayıt geçersizleştirildi.";
const CLEANUP_FAILURE = "Oturum cihazdan güvenli biçimde temizlenemedi. Uygulamayı kapatıp tekrar deneyin.";

interface CleanupResult {
  warning: string | null;
}

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
  let cleanupBarrier: Promise<CleanupResult> = Promise.resolve({ warning: null });
  const listeners = new Set<Listener>();

  const emit = (action: SessionAction, expectedGeneration?: number) => {
    if (expectedGeneration !== undefined && expectedGeneration !== generation) return false;
    state = reduceSession(state, action);
    listeners.forEach((listener) => listener(state));
    return true;
  };

  const isCurrent = (expectedGeneration: number) => expectedGeneration === generation;
  const needsRefresh = (value: StoredSession) => shouldRefresh(value, dependencies.now?.() ?? Date.now());

  const performCleanup = async (): Promise<CleanupResult> => {
    let invalidated = false;
    let lastError: unknown;
    try {
      await dependencies.storage.write(INVALIDATED_SESSION);
      invalidated = true;
    } catch (error) {
      lastError = error;
    }

    for (let attempt = 0; attempt < CLEAR_ATTEMPTS; attempt += 1) {
      try {
        await dependencies.storage.clear();
        return { warning: null };
      } catch (error) {
        lastError = error;
      }
    }

    if (invalidated) return { warning: CLEANUP_WARNING };
    throw lastError instanceof Error ? lastError : new Error(CLEANUP_FAILURE);
  };

  const clearStorage = () => {
    const queued = cleanupBarrier
      .catch(() => ({ warning: null }))
      .then(performCleanup);
    cleanupBarrier = queued;
    return queued;
  };

  const persist = async (nextSession: StoredSession, expectedGeneration: number) => {
    await cleanupBarrier;
    if (!isCurrent(expectedGeneration)) return false;
    await dependencies.storage.write(JSON.stringify(nextSession));
    if (!isCurrent(expectedGeneration)) {
      await clearStorage().catch(() => undefined);
      return false;
    }
    return true;
  };

  const expire = async (error: string, expectedGeneration: number) => {
    if (!isCurrent(expectedGeneration)) return;
    generation += 1;
    const cleanupGeneration = generation;
    activeOperation = null;
    session = null;
    emit({ type: "SIGN_OUT_STARTED" });
    try {
      const cleanup = await clearStorage();
      if (!isCurrent(cleanupGeneration)) return;
      emit({ error: cleanup.warning ? `${error} ${cleanup.warning}` : error, type: "SESSION_EXPIRED" });
    } catch {
      if (isCurrent(cleanupGeneration)) emit({ error: CLEANUP_FAILURE, type: "CLEANUP_FAILED" });
    }
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
            try {
              const cleanup = await clearStorage();
              if (cleanup.warning) {
                emit({ error: cleanup.warning, type: "SIGNED_OUT_WARNING" }, expectedGeneration);
              } else {
                emit({ type: "RESTORE_EMPTY" }, expectedGeneration);
              }
            } catch {
              emit({ error: CLEANUP_FAILURE, type: "CLEANUP_FAILED" }, expectedGeneration);
            }
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
      const expectedGeneration = generation;
      activeOperation = null;
      const previous = session;
      session = null;
      emit({ type: "SIGN_OUT_STARTED" });
      try {
        const cleanup = await clearStorage();
        if (isCurrent(expectedGeneration)) {
          emit(cleanup.warning
            ? { error: cleanup.warning, type: "SIGNED_OUT_WARNING" }
            : { type: "SIGNED_OUT" });
        }
      } catch {
        if (isCurrent(expectedGeneration)) emit({ error: CLEANUP_FAILURE, type: "CLEANUP_FAILED" });
      } finally {
        if (previous) await dependencies.revoke(previous).catch(() => undefined);
      }
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
