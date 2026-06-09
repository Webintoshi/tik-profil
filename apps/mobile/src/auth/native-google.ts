export interface NativeGoogleSignInResult {
  idToken: string;
}

function readIdToken(result: unknown): null | string {
  if (!result || typeof result !== "object") {
    return null;
  }

  const record = result as Record<string, unknown>;
  const data = record.data;
  const dataToken =
    data && typeof data === "object"
      ? (data as Record<string, unknown>).idToken
      : null;
  const idToken = typeof record.idToken === "string"
    ? record.idToken
    : typeof dataToken === "string"
      ? dataToken
      : null;

  return idToken?.trim() || null;
}

export async function signInWithNativeGoogle(input: {
  webClientId: string;
}): Promise<NativeGoogleSignInResult> {
  const { GoogleSignin } = await import("@react-native-google-signin/google-signin");

  GoogleSignin.configure({
    forceCodeForRefreshToken: false,
    offlineAccess: false,
    webClientId: input.webClientId,
  });
  await GoogleSignin.hasPlayServices({
    showPlayServicesUpdateDialog: true,
  });
  await GoogleSignin.signOut().catch(() => undefined);

  const result = await GoogleSignin.signIn();
  const idToken = readIdToken(result);

  if (!idToken) {
    throw new Error("GOOGLE_ID_TOKEN_MISSING");
  }

  return { idToken };
}

export async function clearNativeGoogleSession(): Promise<void> {
  try {
    const { GoogleSignin } = await import("@react-native-google-signin/google-signin");

    await GoogleSignin.signOut();
  } catch {
    // Google state cleanup is best-effort.
  }
}
