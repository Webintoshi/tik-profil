import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from "react";
import { ApiClientError } from "@/api/types";
import {
  getAccount,
  getCurrentSession,
  getCustomerProfile,
  logout,
  requestCustomerOtp,
  signInWithGoogleIdToken,
  verifyCustomerOtp,
  type CustomerAccountProfile,
  type CustomerBackendSession,
} from "@/auth/api";
import {
  getAccountCompletionStatus,
  type AccountCompletionStatus,
} from "@/auth/account-completion";
import {
  getAuthFlowDisplayError,
  initialCustomerAuthFlowState,
  reduceCustomerAuthFlow,
  type CustomerAuthFlowStatus,
} from "@/auth/login-flow-state";
import { resolveNativeCustomerAuthRuntimeConfig } from "@/auth/config";
import {
  clearNativeGoogleSession,
  signInWithNativeGoogle,
} from "@/auth/native-google";
import { resolveApiRuntimeConfig } from "@/api/config";

type BackendSyncStatus =
  | "idle"
  | "loading"
  | "ready"
  | "profile-warning"
  | "disconnected"
  | "error";

type CustomerProfileSyncOutcome =
  | "disconnected"
  | "error"
  | "profile-warning"
  | "ready";

const SAFE_LOGIN_FAILURE_MESSAGE = "Giriş tamamlanamadı. Lütfen tekrar deneyin.";

interface PendingOtpChallenge {
  expiresInSeconds: number;
  maskedPhone: string;
  phone: string;
  resendAfterSeconds: number;
}
interface CustomerIdentity {
  displayName: string;
  email: null | string;
  identifier: string;
  logtoSub: null | string;
  phone: null | string;
}

interface CallbackCompatibilityResult {
  canRetry?: boolean;
  errorMessage?: string;
  state: "error" | "success";
}

interface CustomerAuthContextValue {
  accountCompletion: AccountCompletionStatus;
  authFlowStatus: CustomerAuthFlowStatus;
  backendStatus: BackendSyncStatus;
  canAccessFullApp: boolean;
  cancelOtp: () => void;
  completeSignInCallback: (
    callbackUrl: null | string | undefined,
  ) => Promise<CallbackCompatibilityResult>;
  customerAccount: CustomerAccountProfile | null;
  customerIdentity: CustomerIdentity | null;
  customerSession: CustomerBackendSession | null;
  errorMessage: null | string;
  isAuthenticated: boolean;
  isBackendSessionReady: boolean;
  isBusy: boolean;
  isConfigured: boolean;
  isGoogleConfigured: boolean;
  isInitialized: boolean;
  limitationMessage: null | string;
  pendingOtp: PendingOtpChallenge | null;
  profileWarningMessage: null | string;
  register: (phone: string) => Promise<void>;
  refreshCustomerProfile: () => Promise<void>;
  signIn: (phone: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  verifyOtp: (code: string) => Promise<void>;
}

const CustomerAuthContext = createContext<CustomerAuthContextValue | null>(null);

function trimToNull(value: unknown): null | string {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function buildCustomerIdentity(input: {
  account: CustomerAccountProfile | null;
  session: CustomerBackendSession | null;
}): CustomerIdentity | null {
  const email = trimToNull(input.account?.email) ?? trimToNull(input.session?.email);
  const phone = trimToNull(input.account?.phone) ?? trimToNull(input.session?.phone);
  const displayName =
    trimToNull(input.account?.displayName) ??
    trimToNull(input.session?.displayName) ??
    email ??
    phone ??
    "Tık Profil müşterisi";
  const logtoSub = trimToNull(input.session?.logtoSub);

  if (!input.session && !email && !phone) {
    return null;
  }

  return {
    displayName,
    email,
    identifier: email ?? phone ?? logtoSub ?? "customer",
    logtoSub,
    phone,
  };
}

function getSafeErrorMessage(error: unknown): string {
  if (error instanceof ApiClientError) {
    switch (error.code) {
      case "INVALID_PHONE":
        return "Geçerli bir cep telefonu girin.";
      case "OTP_INVALID":
      case "OTP_CODE_INVALID":
      case "OTP_NOT_FOUND":
        return "Kod doğrulanamadı. Tekrar deneyin.";
      case "OTP_RESEND_COOLDOWN":
        return "Yeni kod istemeden önce biraz bekleyin.";
      case "OTP_RATE_LIMITED":
        return "Çok fazla kod istendi. Biraz bekleyip tekrar deneyin.";
      case "GOOGLE_TOKEN_REQUIRED":
      case "GOOGLE_TOKEN_INVALID":
        return "Google girişi tamamlanamadı. Tekrar deneyin.";
      default:
        return SAFE_LOGIN_FAILURE_MESSAGE;
    }
  }

  return SAFE_LOGIN_FAILURE_MESSAGE;
}

function getDisconnectedBackendMessage(): string {
  return "Oturum doğrulanıyor, lütfen bekleyin.";
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
      cancelOtp: () => undefined,
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
      isGoogleConfigured: false,
      isInitialized: true,
      limitationMessage: null,
      pendingOtp: null,
      profileWarningMessage: null,
      register: async () => {
        throw new Error(reason);
      },
      refreshCustomerProfile: async () => undefined,
      signIn: async () => {
        throw new Error(reason);
      },
      signInWithGoogle: async () => {
        throw new Error(reason);
      },
      signOut: async () => undefined,
      verifyOtp: async () => {
        throw new Error(reason);
      },
    }),
    [reason],
  );

  return (
    <CustomerAuthContext.Provider value={value}>
      {children}
    </CustomerAuthContext.Provider>
  );
}

function CustomerAuthNativeProvider({ children }: PropsWithChildren) {
  const runtimeConfig = useMemo(() => resolveNativeCustomerAuthRuntimeConfig(), []);
  const [backendStatus, setBackendStatus] = useState<BackendSyncStatus>("idle");
  const [customerAccount, setCustomerAccount] =
    useState<CustomerAccountProfile | null>(null);
  const [customerIdentity, setCustomerIdentity] =
    useState<CustomerIdentity | null>(null);
  const [customerSession, setCustomerSession] =
    useState<CustomerBackendSession | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [authFlow, setAuthFlow] = useState(initialCustomerAuthFlowState);
  const [profileWarningMessage, setProfileWarningMessage] =
    useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pendingOtp, setPendingOtp] = useState<PendingOtpChallenge | null>(null);

  const clearCustomerState = useCallback(() => {
    setBackendStatus("idle");
    setCustomerAccount(null);
    setCustomerIdentity(null);
    setCustomerSession(null);
    setErrorMessage(null);
    setAuthFlow(initialCustomerAuthFlowState);
    setProfileWarningMessage(null);
    setPendingOtp(null);
    setIsAuthenticated(false);
  }, []);

  const syncAuthenticatedCustomerProfile =
    useCallback(async (knownSession?: CustomerBackendSession | null): Promise<CustomerProfileSyncOutcome> => {
      setIsBusy(true);
      setErrorMessage(null);
      setProfileWarningMessage(null);
      setBackendStatus("loading");

      try {
        const session = knownSession ?? await getCurrentSession({
          apiBaseUrl: runtimeConfig.apiBaseUrl,
          mePath: runtimeConfig.mePath,
        });

        if (!session) {
          setCustomerSession(null);
          setCustomerAccount(null);
          setCustomerIdentity(null);
          setBackendStatus("disconnected");
          setIsAuthenticated(false);
          return "disconnected";
        }

        setCustomerSession(session);
        setIsAuthenticated(true);

        const [accountResult, profileResult] = await Promise.allSettled([
          getAccount({
            accountPath: runtimeConfig.accountPath,
            apiBaseUrl: runtimeConfig.apiBaseUrl,
          }),
          getCustomerProfile({
            apiBaseUrl: runtimeConfig.apiBaseUrl,
            profilePath: runtimeConfig.profilePath,
          }),
        ]);
        const account =
          accountResult.status === "fulfilled" ? accountResult.value : null;

        setCustomerAccount(account);
        setCustomerIdentity(buildCustomerIdentity({ account, session }));

        if (accountResult.status === "rejected" || profileResult.status === "rejected") {
          setBackendStatus("profile-warning");
          setProfileWarningMessage("Profil bilgileri şu anda alınamadı.");
          setAuthFlow((current) =>
            reduceCustomerAuthFlow(current, {
              needsAccountCompletion: true,
              type: "SYNC_SUCCEEDED",
            }),
          );
          return "profile-warning";
        }

        setBackendStatus("ready");
        setProfileWarningMessage(null);
        setAuthFlow((current) =>
          reduceCustomerAuthFlow(current, {
            needsAccountCompletion:
              !getAccountCompletionStatus(account).isComplete,
            type: "SYNC_SUCCEEDED",
          }),
        );
        return "ready";
      } catch {
        setCustomerSession(null);
        setCustomerAccount(null);
        setCustomerIdentity(null);
        setBackendStatus("error");
        setIsAuthenticated(false);
        setAuthFlow((current) =>
          reduceCustomerAuthFlow(current, { type: "SYNC_FAILED" }),
        );
        setErrorMessage(SAFE_LOGIN_FAILURE_MESSAGE);
        return "error";
      } finally {
        setIsBusy(false);
      }
    }, [
      runtimeConfig.accountPath,
      runtimeConfig.apiBaseUrl,
      runtimeConfig.mePath,
      runtimeConfig.profilePath,
    ]);

  const refreshCustomerProfile = useCallback(async () => {
    await syncAuthenticatedCustomerProfile();
  }, [syncAuthenticatedCustomerProfile]);

  const startOtp = useCallback(async (phone: string) => {
    setErrorMessage(null);
    setProfileWarningMessage(null);
    setAuthFlow((current) =>
      reduceCustomerAuthFlow(current, { type: "START_LOGIN" }),
    );
    setIsBusy(true);

    try {
      const result = await requestCustomerOtp({
        apiBaseUrl: runtimeConfig.apiBaseUrl,
        phone,
        startPath: runtimeConfig.otpStartPath,
      });

      setPendingOtp({
        ...result,
        phone,
      });
      setAuthFlow((current) =>
        reduceCustomerAuthFlow(current, { type: "OTP_SENT" }),
      );
    } catch (error) {
      setPendingOtp(null);
      setAuthFlow((current) =>
        reduceCustomerAuthFlow(current, { type: "SYNC_FAILED" }),
      );
      setErrorMessage(getSafeErrorMessage(error));
    } finally {
      setIsBusy(false);
    }
  }, [runtimeConfig.apiBaseUrl, runtimeConfig.otpStartPath]);

  const verifyOtp = useCallback(async (code: string) => {
    if (!pendingOtp) {
      setErrorMessage("Önce telefon numaranı girip kod iste.");
      return;
    }

    setErrorMessage(null);
    setAuthFlow((current) =>
      reduceCustomerAuthFlow(current, { type: "CALLBACK_RECEIVED" }),
    );
    setIsBusy(true);

    try {
      const session = await verifyCustomerOtp({
        apiBaseUrl: runtimeConfig.apiBaseUrl,
        code,
        phone: pendingOtp.phone,
        verifyPath: runtimeConfig.otpVerifyPath,
      });

      setPendingOtp(null);
      await syncAuthenticatedCustomerProfile(session);
    } catch (error) {
      setAuthFlow((current) =>
        reduceCustomerAuthFlow(current, { type: "SYNC_FAILED" }),
      );
      setErrorMessage(getSafeErrorMessage(error));
    } finally {
      setIsBusy(false);
    }
  }, [
    pendingOtp,
    runtimeConfig.apiBaseUrl,
    runtimeConfig.otpVerifyPath,
    syncAuthenticatedCustomerProfile,
  ]);

  const signInWithGoogle = useCallback(async () => {
    if (!runtimeConfig.googleWebClientId) {
      setErrorMessage("Google ile giriş için uygulama ayarı eksik.");
      return;
    }

    setErrorMessage(null);
    setAuthFlow((current) =>
      reduceCustomerAuthFlow(current, { type: "START_LOGIN" }),
    );
    setIsBusy(true);

    try {
      const google = await signInWithNativeGoogle({
        webClientId: runtimeConfig.googleWebClientId,
      });
      setAuthFlow((current) =>
        reduceCustomerAuthFlow(current, { type: "CALLBACK_RECEIVED" }),
      );
      const session = await signInWithGoogleIdToken({
        apiBaseUrl: runtimeConfig.apiBaseUrl,
        googlePath: runtimeConfig.googlePath,
        idToken: google.idToken,
      });

      setPendingOtp(null);
      await syncAuthenticatedCustomerProfile(session);
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      if (/cancel/i.test(message)) {
        setAuthFlow((current) =>
          reduceCustomerAuthFlow(current, { type: "LOGIN_CANCELLED" }),
        );
        setErrorMessage("Giriş işlemi iptal edildi.");
      } else {
        setAuthFlow((current) =>
          reduceCustomerAuthFlow(current, { type: "SYNC_FAILED" }),
        );
        setErrorMessage(getSafeErrorMessage(error));
      }
    } finally {
      setIsBusy(false);
    }
  }, [
    runtimeConfig.apiBaseUrl,
    runtimeConfig.googlePath,
    runtimeConfig.googleWebClientId,
    syncAuthenticatedCustomerProfile,
  ]);

  const cancelOtp = useCallback(() => {
    setPendingOtp(null);
    setErrorMessage(null);
    setAuthFlow(initialCustomerAuthFlowState);
  }, []);

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
      // Logout is best-effort; local state must still be cleared.
    }

    await clearNativeGoogleSession();
    clearCustomerState();
    setIsBusy(false);
  }, [
    clearCustomerState,
    runtimeConfig.apiBaseUrl,
    runtimeConfig.logoutPath,
  ]);

  useEffect(() => {
    void refreshCustomerProfile().catch(() => undefined);
  }, [refreshCustomerProfile]);

  const value = useMemo<CustomerAuthContextValue>(
    () => {
      const accountCompletion = getAccountCompletionStatus(customerAccount);
      const flowError = getAuthFlowDisplayError(authFlow);

      return {
        accountCompletion,
        authFlowStatus: authFlow.status,
        backendStatus,
        canAccessFullApp: backendStatus === "ready" && accountCompletion.isComplete,
        cancelOtp,
        completeSignInCallback: async () => ({
          errorMessage: "Bu sürümde giriş telefon doğrulama ile yapılır.",
          state: "error",
        }),
        customerAccount,
        customerIdentity,
        customerSession,
        errorMessage: flowError ?? errorMessage,
        isAuthenticated,
        isBackendSessionReady:
          backendStatus === "ready" || backendStatus === "profile-warning",
        isBusy,
        isConfigured: true,
        isGoogleConfigured: runtimeConfig.isGoogleConfigured,
        isInitialized: true,
        limitationMessage:
          backendStatus === "disconnected"
            ? getDisconnectedBackendMessage()
            : null,
        pendingOtp,
        profileWarningMessage,
        register: startOtp,
        refreshCustomerProfile,
        signIn: startOtp,
        signInWithGoogle,
        signOut,
        verifyOtp,
      };
    },
    [
      authFlow,
      backendStatus,
      cancelOtp,
      customerAccount,
      customerIdentity,
      customerSession,
      errorMessage,
      isAuthenticated,
      isBusy,
      pendingOtp,
      profileWarningMessage,
      refreshCustomerProfile,
      runtimeConfig.isGoogleConfigured,
      signInWithGoogle,
      signOut,
      startOtp,
      verifyOtp,
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

  if (apiConfig.mode !== "real") {
    return (
      <CustomerAuthDisabledProvider reason="Mobil müşteri girişi real API modunda açılır.">
        {children}
      </CustomerAuthDisabledProvider>
    );
  }

  return <CustomerAuthNativeProvider>{children}</CustomerAuthNativeProvider>;
}

export function useCustomerAuth(): CustomerAuthContextValue {
  const context = useContext(CustomerAuthContext);

  if (!context) {
    throw new Error("useCustomerAuth must be used within CustomerAuthProvider");
  }

  return context;
}
