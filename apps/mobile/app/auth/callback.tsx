import { useURL } from "expo-linking";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Text, View } from "react-native";
import { buildLogtoCallbackUrl } from "@/auth/callback";
import { resolveLogtoMobileRuntimeConfig } from "@/auth/config";
import { AppScrollScreen } from "@/components/layout/app-scroll-screen";
import { Button } from "@/components/ui/button";
import { SectionHeader } from "@/components/ui/section-header";
import { SurfaceCard } from "@/components/ui/surface-card";
import { useCustomerAuth } from "@/providers/customer-auth-provider";
import { tokens } from "@/theme/tokens";

type CallbackStatus = "error" | "loading";

export default function LogtoCustomerCallbackScreen() {
  const currentUrl = useURL();
  const params = useLocalSearchParams<Record<string, string | string[]>>();
  const hasHandledCallback = useRef(false);
  const [canRetry, setCanRetry] = useState(false);
  const [status, setStatus] = useState<CallbackStatus>("loading");
  const [errorMessage, setErrorMessage] = useState<null | string>(null);
  const { completeSignInCallback } = useCustomerAuth();
  const runtimeConfig = useMemo(() => resolveLogtoMobileRuntimeConfig(), []);

  const callbackUrl = useMemo(
    () =>
      currentUrl ??
      buildLogtoCallbackUrl({
        baseRedirectUri: runtimeConfig.redirectUri,
        params,
      }),
    [currentUrl, params, runtimeConfig.redirectUri],
  );

  const runCallbackCompletion = useCallback(async () => {
    setCanRetry(false);
    setErrorMessage(null);
    setStatus("loading");

    await completeSignInCallback(callbackUrl).then((result) => {
      if (result.state === "success") {
        router.replace("/(tabs)/profil");
        return;
      }

      setCanRetry(Boolean(result.canRetry));
      setStatus("error");
      setErrorMessage(result.errorMessage ?? "Giriş tamamlanamadı. Lütfen tekrar deneyin.");
    });
  }, [callbackUrl, completeSignInCallback]);

  useEffect(() => {
    if (hasHandledCallback.current) {
      return;
    }

    hasHandledCallback.current = true;
    void runCallbackCompletion();
  }, [runCallbackCompletion]);

  return (
    <AppScrollScreen
      header={
        <SectionHeader
          title="Giriş tamamlanıyor"
          subtitle="Tık Profil’e dönülüyor."
        />
      }
    >
      <SurfaceCard>
        <View style={{ gap: tokens.spacing.md }}>
          <Text style={{ color: tokens.colors.text, fontSize: 18, fontWeight: "700" }}>
            {status === "loading" ? "Hesabınız hazırlanıyor" : "Giriş tamamlanamadı"}
          </Text>
          <Text style={{ color: tokens.colors.textMuted, fontSize: 14, lineHeight: 20 }}>
            {status === "loading"
              ? "Oturum doğrulanıyor, lütfen bekleyin."
              : errorMessage ?? "Profil sekmesine dönüp tekrar deneyebilirsiniz."}
          </Text>
          {status === "error" && canRetry ? (
            <Button onPress={() => void runCallbackCompletion()}>
              Tekrar dene
            </Button>
          ) : null}
          {status === "error" ? (
            <Button onPress={() => router.replace("/(tabs)/profil")} variant="secondary">
              Profil’e dön
            </Button>
          ) : null}
        </View>
      </SurfaceCard>
    </AppScrollScreen>
  );
}
