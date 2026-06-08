import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from "react";
import { LogtoContext, LogtoProvider, useLogto } from "@logto/rn";
import {
  logout,
  startCustomerLogin,
  type CustomerAccountProfile,
  type CustomerBackendSession,
  type CustomerBackendSyncReason,
  syncCustomerBackendSession,
} from "@/auth/api";
import {
  getAccountCompletionStatus,
  type AccountCompletionStatus,
} from "@/auth/account-completion";
import {
  completeCustomerLogtoCallback,
  type CustomerLogtoCallbackResult,
} from "@/auth/callback";
import {
  getAuthFlowDisplayError,
  initialCustomerAuthFlowState,
  reduceCustomerAuthFlow,
  type CustomerAuthFlowStatus,
} from "@/auth/login-flow-state";
import { resolveLogtoMobileRuntimeConfig } from "@/auth/config";
import { resolveApiRuntimeConfig } from "@/api/config";

type BackendSyncStatus =
  | "idle"
  | "loading"
  | "ready"
  | "profile-warning"
  | "disconnected"
  | "error";

const PRE_AUTH_TRANSITION_MS = 450;
const SAFE_LOGIN_FAILURE_MESSAGE = "Giriş tamamlanamadı. Lütfen tekrar deneyin.";

interface CustomerLogtoIdentity {
  displayName: string;
  email: null | string;
  identifier: string;
  logtoSub: null | string;
}

interface CustomerAuthContextValue {
  accountCompletion: AccountCompletionStatus;
  authFlowStatus: CustomerAuthFlowStatus;
  backendStatus: BackendSyncStatus;
  canAccessFullApp: boolean;
  completeSignInCallback: (
    callbackUrl: null | string | undefined,
  ) => Promise<CustomerLogtoCallbackResult>;
  customerAccount: CustomerAccountProfile | null;
  customerIdentity: CustomerLogtoIdentity | null;
  customerSession: CustomerBackendSession | null;
  errorMessage: null | string;
  isAuthenticated: boolean;
  isBackendSessionReady: boolean;
  isBusy: boolean;
  isConfigured: boolean;
  isInitialized: boolean;
  limitationMessage: null | string;
  profileWarningMessage: null | string;
  refreshCustomerProfile: () => Promise<void>;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
}

const CustomerAuthContext = createContext<CustomerAuthContextValue | null>(null);

function trimToNull(value: unknown): null | string {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function readRecordString(record: null | object | undefined, key: string): null | string {
  if (!record || !(key in record)) {
    return null;
  }

  return trimToNull((record as Record<string, unknown>)[key]);
}

function buildCustomerIdentity(input: {
  claims: null | object;
  userInfo: null | object;
}): CustomerLogtoIdentity | null {
  const email =
    readRecordString(input.userInfo, "email") ??
    readRecordString(input.claims, "email");
  const logtoSub =
    readRecordString(input.userInfo, "sub") ?? readRecordString(input.claims, "sub");
  const displayName =
    readRecordString(input.userInfo, "name") ??
    readRecordString(input.claims, "name") ??
    readRecordString(input.userInfo, "username") ??
    readRecordString(input.userInfo, "preferred_username") ??
    readRecordString(input.claims, "username") ??
    email ??
    "Customer";

  if (!email && !logtoSub) {
    return null;
  }

  return {
    displayName,
    email,
    identifier: email ?? logtoSub ?? "customer",
    logtoSub,
  };
}

function getErrorMessage(_error: unknown): string {
  return "Giriş tamamlanamadı. Lütfen tekrar deneyin.";
}

function getDisconnectedBackendMessage(
  reason: CustomerBackendSyncReason | null,
): string {
  switch (reason) {
    case "missing-id-token":
      return "Oturum doğrulanıyor, lütfen bekleyin.";
    case "session-cookie-missing":
      return "Oturum doğrulanıyor, lütfen bekleyin.";
    default:
      return "Oturum doğrulanıyor, lütfen bekleyin.";
  }
}

async function showPreAuthTransition(): Promise<void> {
  await new Promise((resolve) => {
    setTimeout(resolve, PRE_AUTH_TRANSITION_MS);
  });
}

function CustomerAuthDisabledProvider({
  children,
  reason,
}: PropsWithChildren<{
  reason: string;
}>) {
  const value = useMemo<CustomerAuthContextValue>(
    () => ({
      accountCompletion: getAccountCompletionStatus(null),
      authFlowStatus: "idle",
      backendStatus: "idle",
      canAccessFullApp: false,
      completeSignInCallback: async () => ({
        errorMessage: reason,
        state: "error",
      }),
      customerAccount: null,
      customerIdentity: null,
      customerSession: null,
      errorMessage: reason,
      isAuthenticated: false,
      isBackendSessionReady: false,
      isBusy: false,
      isConfigured: false,
      isInitialized: true,
      limitationMessage: null,
      profileWarningMessage: null,
      refreshCustomerProfile: async () => undefined,
      signIn: async () => {
        throw new Error(reason);
      },
      signOut: async () => undefined,
    }),
    [reason],
  );

  return (
    <CustomerAuthContext.Provider value={value}>
      {children}
    </CustomerAuthContext.Provider>
  );
}

function CustomerAuthBridgeProvider({
  children,
  runtimeConfig,
}: PropsWithChildren<{
  runtimeConfig: ReturnType<typeof resolveLogtoMobileRuntimeConfig>;
}>) {
  const { setIsAuthenticated } = useContext(LogtoContext);
  const {
    client,
    fetchUserInfo,
    getIdToken,
    getIdTokenClaims,
    isAuthenticated,
    isInitialized,
    signIn: logtoSignIn,
    signOut: logtoSignOut,
  } = useLogto();
  const [backendStatus, setBackendStatus] = useState<BackendSyncStatus>("idle");
  const [customerAccount, setCustomerAccount] =
    useState<CustomerAccountProfile | null>(null);
  const [customerIdentity, setCustomerIdentity] =
    useState<CustomerLogtoIdentity | null>(null);
  const [customerSession, setCustomerSession] =
    useState<CustomerBackendSession | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [authFlow, setAuthFlow] = useState(initialCustomerAuthFlowState);
  const [profileWarningMessage, setProfileWarningMessage] =
    useState<string | null>(null);
  const [backendDisconnectReason, setBackendDisconnectReason] =
    useState<CustomerBackendSyncReason | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  const clearCustomerState = useCallback(() => {
    setBackendStatus("idle");
    setCustomerAccount(null);
    setCustomerIdentity(null);
    setCustomerSession(null);
    setBackendDisconnectReason(null);
    setErrorMessage(null);
    setAuthFlow(initialCustomerAuthFlowState);
    setProfileWarningMessage(null);
  }, []);

  const syncAuthenticatedCustomerProfile = useCallback(async () => {
    setIsBusy(true);
    setErrorMessage(null);
    setAuthFlow((current) =>
      reduceCustomerAuthFlow(current, { type: "CALLBACK_RECEIVED" }),
    );
    setProfileWarningMessage(null);
    setBackendStatus("loading");

    try {
      const [userInfoResult, idTokenResult, claimsResult] = await Promise.allSettled([
        fetchUserInfo(),
        getIdToken(),
        getIdTokenClaims(),
      ]);

      const identity = buildCustomerIdentity({
        claims: claimsResult.status === "fulfilled" ? claimsResult.value : null,
        userInfo: userInfoResult.status === "fulfilled" ? userInfoResult.value : null,
      });

      setCustomerIdentity(identity);

      const backendSync = await syncCustomerBackendSession({
        accountPath: runtimeConfig.accountPath,
        apiBaseUrl: runtimeConfig.apiBaseUrl,
        bridgePath: runtimeConfig.customerSessionBridgePath,
        idToken: idTokenResult.status === "fulfilled" ? idTokenResult.value : null,
        mePath: runtimeConfig.mePath,
        profilePath: runtimeConfig.profilePath,
      });

      if (backendSync.state !== "ready") {
        setCustomerSession(backendSync.session);
        setCustomerAccount(backendSync.account);
        setBackendDisconnectReason(backendSync.reason);

        if (backendSync.state === "profile-warning") {
          setBackendStatus("profile-warning");
          setProfileWarningMessage("Profil bilgileri su anda alinamadi.");
          setAuthFlow((current) =>
            reduceCustomerAuthFlow(current, { type: "SYNC_SUCCEEDED", needsAccountCompletion: true }),
          );
          return;
        }

        setCustomerSession(null);
        setCustomerAccount(null);
        setBackendStatus("disconnected");
        setAuthFlow((current) =>
          reduceCustomerAuthFlow(current, { type: "SYNC_FAILED" }),
        );
        return;
      }

      setBackendDisconnectReason(null);
      setProfileWarningMessage(null);
      setCustomerSession(backendSync.session);
      setCustomerAccount(backendSync.account);
      setBackendStatus("ready");
      setAuthFlow((current) =>
        reduceCustomerAuthFlow(current, {
          needsAccountCompletion:
            !getAccountCompletionStatus(backendSync.account).isComplete,
          type: "SYNC_SUCCEEDED",
        }),
      );
    } catch (error) {
      setCustomerSession(null);
      setCustomerAccount(null);
      setBackendDisconnectReason(null);
      setProfileWarningMessage(null);
      setBackendStatus("error");
      setAuthFlow((current) =>
        reduceCustomerAuthFlow(current, { type: "SYNC_FAILED" }),
      );
      setErrorMessage(SAFE_LOGIN_FAILURE_MESSAGE);
      throw error;
    } finally {
      setIsBusy(false);
    }
  }, [
    fetchUserInfo,
    getIdToken,
    getIdTokenClaims,
    runtimeConfig.accountPath,
    runtimeConfig.apiBaseUrl,
    runtimeConfig.customerSessionBridgePath,
    runtimeConfig.mePath,
    runtimeConfig.profilePath,
  ]);

  const refreshCustomerProfile = useCallback(async () => {
    if (!isAuthenticated) {
      clearCustomerState();
      return;
    }

    await syncAuthenticatedCustomerProfile();
  }, [
    clearCustomerState,
    isAuthenticated,
    syncAuthenticatedCustomerProfile,
  ]);

  const completeSignInCallback = useCallback(
    async (callbackUrl: null | string | undefined) => {
      setErrorMessage(null);
      setAuthFlow((current) =>
        reduceCustomerAuthFlow(current, { type: "CALLBACK_RECEIVED" }),
      );
      setIsBusy(true);

      const result = await completeCustomerLogtoCallback({
        callbackUrl,
        handleSignInCallback: async (url) => {
          await client.handleSignInCallback(url);
        },
        markAuthenticated: () => {
          setIsAuthenticated(true);
        },
        refreshCustomerProfile: syncAuthenticatedCustomerProfile,
      });

      if (result.state === "error") {
        setCustomerSession(null);
        setCustomerAccount(null);
        setBackendDisconnectReason(null);
        setProfileWarningMessage(null);
        setBackendStatus("error");
        setAuthFlow((current) =>
          reduceCustomerAuthFlow(current, { type: "SYNC_FAILED" }),
        );
        setErrorMessage(result.errorMessage ?? SAFE_LOGIN_FAILURE_MESSAGE);
      }

      setIsBusy(false);
      return result;
    },
    [client, setIsAuthenticated, syncAuthenticatedCustomerProfile],
  );

  useEffect(() => {
    if (!isInitialized) {
      return;
    }

    if (!isAuthenticated) {
      clearCustomerState();
      return;
    }

    void refreshCustomerProfile().catch(() => undefined);
  }, [clearCustomerState, isAuthenticated, isInitialized, refreshCustomerProfile]);

  const signIn = useCallback(async () => {
    setErrorMessage(null);
    setAuthFlow((current) =>
      reduceCustomerAuthFlow(current, { type: "START_LOGIN" }),
    );
    setIsBusy(true);

    try {
      await startCustomerLogin({
        beforeOpenAuth: showPreAuthTransition,
        redirectUri: runtimeConfig.redirectUri,
        signIn: async (redirectUri) => await logtoSignIn(redirectUri),
      });
    } catch (error) {
      setAuthFlow((current) =>
        reduceCustomerAuthFlow(current, {
          recoverableViaCallback: true,
          type: "LOGIN_START_REJECTED",
        }),
      );
      return;
    } finally {
      setIsBusy(false);
    }
  }, [logtoSignIn, runtimeConfig.redirectUri]);

  const signOut = useCallback(async () => {
    setErrorMessage(null);
    setAuthFlow((current) => reduceCustomerAuthFlow(current, { type: "LOGOUT" }));
    setIsBusy(true);

    try {
      await logout({
        apiBaseUrl: runtimeConfig.apiBaseUrl,
        logoutPath: runtimeConfig.logoutPath,
      });
    } catch {
      // Backend logout is best-effort until mobile cookie bridging exists.
    }

    try {
      await logtoSignOut(runtimeConfig.redirectUri);
      clearCustomerState();
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
      throw error;
    } finally {
      setIsBusy(false);
    }
  }, [
    clearCustomerState,
    logtoSignOut,
    runtimeConfig.apiBaseUrl,
    runtimeConfig.logoutPath,
    runtimeConfig.redirectUri,
  ]);

  const value = useMemo<CustomerAuthContextValue>(
    () => {
      const accountCompletion = getAccountCompletionStatus(customerAccount);
      const flowError = getAuthFlowDisplayError(authFlow);

      return {
        accountCompletion,
        authFlowStatus: authFlow.status,
        backendStatus,
        canAccessFullApp: backendStatus === "ready" && accountCompletion.isComplete,
        completeSignInCallback,
        customerAccount,
        customerIdentity,
        customerSession,
        errorMessage: flowError ?? errorMessage,
        isAuthenticated,
        isBackendSessionReady:
          backendStatus === "ready" || backendStatus === "profile-warning",
        isBusy,
        isConfigured: true,
        isInitialized,
        limitationMessage:
          backendStatus === "disconnected"
            ? getDisconnectedBackendMessage(backendDisconnectReason)
            : null,
        profileWarningMessage,
        refreshCustomerProfile,
        signIn,
        signOut,
      };
    },
    [
      backendStatus,
      authFlow,
      completeSignInCallback,
      customerAccount,
      customerIdentity,
      customerSession,
      errorMessage,
      isAuthenticated,
      isBusy,
      isInitialized,
      backendDisconnectReason,
      profileWarningMessage,
      refreshCustomerProfile,
      signIn,
      signOut,
    ],
  );

  return (
    <CustomerAuthContext.Provider value={value}>
      {children}
    </CustomerAuthContext.Provider>
  );
}

export function CustomerAuthProvider({ children }: PropsWithChildren) {
  const apiConfig = resolveApiRuntimeConfig();
  const runtimeConfig = resolveLogtoMobileRuntimeConfig();

  if (apiConfig.mode !== "real") {
    return (
      <CustomerAuthDisabledProvider reason="Mobile customer auth sadece real API modunda acilir.">
        {children}
      </CustomerAuthDisabledProvider>
    );
  }

  if (!runtimeConfig.enabled || !runtimeConfig.appId || !runtimeConfig.endpoint) {
    return (
      <CustomerAuthDisabledProvider reason="Bu build icin mobile Logto config tanimlanmadi.">
        {children}
      </CustomerAuthDisabledProvider>
    );
  }

  return (
    <LogtoProvider
      config={{
        appId: runtimeConfig.appId,
        endpoint: runtimeConfig.endpoint,
        scopes: runtimeConfig.scopes,
      }}
    >
      <CustomerAuthBridgeProvider runtimeConfig={runtimeConfig}>
        {children}
      </CustomerAuthBridgeProvider>
    </LogtoProvider>
  );
}

export function useCustomerAuth(): CustomerAuthContextValue {
  const context = useContext(CustomerAuthContext);

  if (!context) {
    throw new Error("useCustomerAuth must be used within CustomerAuthProvider");
  }

  return context;
}
