export interface CustomerLogtoCallbackResult {
  canRetry?: boolean;
  errorMessage?: string;
  recovered?: boolean;
  state: "error" | "success";
}

interface CompleteCustomerLogtoCallbackInput {
  callbackUrl: null | string | undefined;
  debugLog?: (event: string, metadata?: Record<string, string>) => void;
  handleSignInCallback: (callbackUrl: string) => Promise<void>;
  isLogtoSessionAvailable?: () => Promise<boolean>;
  markAuthenticated?: () => void;
  recoveryDelaysMs?: number[];
  refreshCustomerProfile: () => Promise<boolean | void>;
}

const CALLBACK_ERROR_MESSAGE = "Musteri giris geri donusu tamamlanamadi.";
const DEFAULT_RECOVERY_DELAYS_MS = [150, 450];

function buildRetryableCallbackError(): CustomerLogtoCallbackResult {
  return {
    canRetry: true,
    errorMessage: CALLBACK_ERROR_MESSAGE,
    state: "error",
  };
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export function logMobileAuthDebug(
  event: string,
  metadata?: Record<string, string>,
): void {
  const globalWithDev = globalThis as typeof globalThis & { __DEV__?: boolean };
  const isDebugEnabled =
    process.env.EXPO_PUBLIC_MOBILE_AUTH_DEBUG === "1" ||
    globalWithDev.__DEV__ === true;

  if (!isDebugEnabled || process.env.NODE_ENV === "test") {
    return;
  }

  console.info("[mobile-auth]", event, metadata ?? {});
}

function trimToNull(value: unknown): null | string {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function appendParam(url: URL, key: string, value: unknown) {
  if (Array.isArray(value)) {
    for (const entry of value) {
      appendParam(url, key, entry);
    }
    return;
  }

  const trimmedValue = trimToNull(value);

  if (trimmedValue) {
    url.searchParams.append(key, trimmedValue);
  }
}

export function buildLogtoCallbackUrl(input: {
  baseRedirectUri: null | string | undefined;
  params: Record<string, unknown>;
}): null | string {
  const baseRedirectUri = trimToNull(input.baseRedirectUri);

  if (!baseRedirectUri) {
    return null;
  }

  try {
    const url = new URL(baseRedirectUri);

    for (const [key, value] of Object.entries(input.params)) {
      appendParam(url, key, value);
    }

    return url.toString();
  } catch {
    return null;
  }
}

export async function completeCustomerLogtoCallback(
  input: CompleteCustomerLogtoCallbackInput,
): Promise<CustomerLogtoCallbackResult> {
  const callbackUrl = trimToNull(input.callbackUrl);

  if (!callbackUrl) {
    return {
      canRetry: true,
      errorMessage: CALLBACK_ERROR_MESSAGE,
      state: "error",
    };
  }

  const refreshProfile = async () => (await input.refreshCustomerProfile()) !== false;
  const recoverExistingSession = async () => {
    const isLogtoSessionAvailable = input.isLogtoSessionAvailable;

    if (!isLogtoSessionAvailable) {
      return false;
    }

    const delays = [0, ...(input.recoveryDelaysMs ?? DEFAULT_RECOVERY_DELAYS_MS)];

    for (const delay of delays) {
      if (delay > 0) {
        await wait(delay);
      }

      if (await isLogtoSessionAvailable()) {
        input.markAuthenticated?.();
        return await refreshProfile();
      }
    }

    return false;
  };

  try {
    await input.handleSignInCallback(callbackUrl);
    input.markAuthenticated?.();
    const isSynced = await refreshProfile();

    if (!isSynced) {
      input.debugLog?.("callback.profile_sync_failed", {
        phase: "direct",
      });
      return buildRetryableCallbackError();
    }

    return { state: "success" };
  } catch {
    input.debugLog?.("callback.handle_failed");

    if (await recoverExistingSession()) {
      input.debugLog?.("callback.recovered_existing_session");
      return {
        recovered: true,
        state: "success",
      };
    }

    input.debugLog?.("callback.recovery_failed");
    return buildRetryableCallbackError();
  }
}
