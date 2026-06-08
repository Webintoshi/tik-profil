import { useURL } from "expo-linking";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
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

  useEffect(() => {
    if (hasHandledCallback.current) {
      return;
    }

    hasHandledCallback.current = true;

    void completeSignInCallback(callbackUrl).then((result) => {
      if (result.state === "success") {
        router.replace("/(tabs)/profil");
        return;
      }

      setStatus("error");
      setErrorMessage(result.errorMessage ?? "Musteri girisi tamamlanamadi.");
    });
  }, [callbackUrl, completeSignInCallback]);

  return (
    <AppScrollScreen
      header={
        <SectionHeader
          title="Giris tamamlanıyor"
          subtitle="Logto geri donusu isleniyor ve backend musteri oturumu senkronlanıyor."
        />
      }
    >
      <SurfaceCard>
        <View style={{ gap: tokens.spacing.md }}>
          <Text style={{ color: tokens.colors.text, fontSize: 18, fontWeight: "700" }}>
            {status === "loading" ? "Oturum hazirlaniyor" : "Giris tamamlanamadi"}
          </Text>
          <Text style={{ color: tokens.colors.textMuted, fontSize: 14, lineHeight: 20 }}>
            {status === "loading"
              ? "Bu ekranda callback kodu veya token degerleri gosterilmez."
              : errorMessage ?? "Profil sekmesine donup tekrar deneyebilirsiniz."}
          </Text>
          {status === "error" ? (
            <Button onPress={() => router.replace("/(tabs)/profil")} variant="secondary">
              Profile don
            </Button>
          ) : null}
        </View>
      </SurfaceCard>
    </AppScrollScreen>
  );
}
