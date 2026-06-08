export interface CustomerLogtoCallbackResult {
  errorMessage?: string;
  state: "error" | "success";
}

interface CompleteCustomerLogtoCallbackInput {
  callbackUrl: null | string | undefined;
  handleSignInCallback: (callbackUrl: string) => Promise<void>;
  markAuthenticated?: () => void;
  refreshCustomerProfile: () => Promise<void>;
}

const CALLBACK_ERROR_MESSAGE = "Musteri giris geri donusu tamamlanamadi.";

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
      errorMessage: CALLBACK_ERROR_MESSAGE,
      state: "error",
    };
  }

  try {
    await input.handleSignInCallback(callbackUrl);
    input.markAuthenticated?.();
    await input.refreshCustomerProfile();

    return { state: "success" };
  } catch {
    return {
      errorMessage: CALLBACK_ERROR_MESSAGE,
      state: "error",
    };
  }
}
