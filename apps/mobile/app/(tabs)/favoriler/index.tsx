import { useEffect, useState } from "react";
import { AppScrollScreen } from "@/components/layout/app-scroll-screen";
import { EmptyState } from "@/components/states/empty-state";
import { LoadingState } from "@/components/states/loading-state";
import { Button } from "@/components/ui/button";
import { SectionHeader } from "@/components/ui/section-header";
import { useCustomerAuth } from "@/providers/customer-auth-provider";
import { buildApiUrl } from "@/api/url";
import { resolveApiRuntimeConfig } from "@/api/config";

interface JsonErrorEnvelope {
  code?: string;
  error?: string;
  success?: false;
}

type FavoritesProbeState = "idle" | "loading" | "not-ready" | "error" | "ready";

async function readJsonPayload<T>(response: Response): Promise<null | T> {
  try {
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

export default function FavoritesScreen() {
  const apiConfig = resolveApiRuntimeConfig();
  const {
    isAuthenticated,
    isBackendSessionReady,
    isBusy,
    isConfigured,
    limitationMessage,
    signIn,
  } = useCustomerAuth();
  const [probeState, setProbeState] = useState<FavoritesProbeState>("idle");
  const [probeMessage, setProbeMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    if (!isAuthenticated || !isBackendSessionReady) {
      setProbeState("idle");
      setProbeMessage(null);
      return () => {
        active = false;
      };
    }

    setProbeState("loading");
    setProbeMessage(null);

    void fetch(buildApiUrl(apiConfig.baseUrl, "/api/kesfet/user/favorites"), {
      credentials: "include",
      method: "GET",
    })
      .then(async (response) => {
        const payload = await readJsonPayload<JsonErrorEnvelope>(response);

        if (!active) {
          return;
        }

        if (
          response.status === 501 ||
          (payload?.code === "FEATURE_NOT_READY" && payload.success === false)
        ) {
          setProbeState("not-ready");
          setProbeMessage(payload?.error ?? "Customer favorites henuz hazir degil.");
          return;
        }

        if (!response.ok) {
          setProbeState("error");
          setProbeMessage(payload?.error ?? "Favorites rotasi su anda acilamadi.");
          return;
        }

        setProbeState("ready");
      })
      .catch(() => {
        if (active) {
          setProbeState("error");
          setProbeMessage("Favorites rotasi kontrol edilirken beklenmeyen bir hata olustu.");
        }
      });

    return () => {
      active = false;
    };
  }, [apiConfig.baseUrl, isAuthenticated, isBackendSessionReady]);

  return (
    <AppScrollScreen
      header={
        <SectionHeader
          title="Favoriler"
          subtitle="Customer actor oturumu olmadan login gerekir; backend session baglaninca guvenli rota probe edilir."
        />
      }
    >
      {!isAuthenticated ? (
        <EmptyState
          title="Giris gerekli"
          description="Gercek musteri favorileri backend customer session ile korunuyor. Devam etmek icin once giris yap."
          action={
            <Button disabled={!isConfigured || isBusy} onPress={() => void signIn()}>
              {isBusy ? "Giris baslatiliyor" : "Giris Yap"}
            </Button>
          }
        />
      ) : null}

      {isAuthenticated && !isBackendSessionReady ? (
        <EmptyState
          title="Backend session bagli degil"
          description={
            limitationMessage ??
            "Native Logto oturumu var, ancak backend musteri cookie oturumu bu cihazda henuz dogrulanmadi."
          }
        />
      ) : null}

      {isAuthenticated && isBackendSessionReady && probeState === "loading" ? (
        <LoadingState label="Favorites rotasi kontrol ediliyor..." />
      ) : null}

      {isAuthenticated && isBackendSessionReady && probeState === "not-ready" ? (
        <EmptyState
          title="Yakinda"
          description={probeMessage ?? "Customer favorites henuz hazir degil."}
        />
      ) : null}

      {isAuthenticated && isBackendSessionReady && probeState === "error" ? (
        <EmptyState
          title="Rota su anda acilamadi"
          description={probeMessage ?? "Beklenmeyen bir favorites hatasi alindi."}
        />
      ) : null}

      {isAuthenticated && isBackendSessionReady && probeState === "ready" ? (
        <EmptyState
          title="Henuz veri yok"
          description="API rotasi acildi, ancak bu branch gercek musteri favorites yazim/okuma akisini henuz genisletmiyor."
        />
      ) : null}
    </AppScrollScreen>
  );
}
