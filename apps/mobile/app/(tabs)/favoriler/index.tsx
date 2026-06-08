import { useEffect, useState } from "react";
import { Heart } from "lucide-react-native";
import { Text, View } from "react-native";
import { buildApiUrl } from "@/api/url";
import { resolveApiRuntimeConfig } from "@/api/config";
import { FullAccessRequiredPanel } from "@/components/auth/customer-auth-panels";
import { AppScrollScreen } from "@/components/layout/app-scroll-screen";
import { EmptyState } from "@/components/states/empty-state";
import { LoadingState } from "@/components/states/loading-state";
import { Button } from "@/components/ui/button";
import { SectionHeader } from "@/components/ui/section-header";
import { SurfaceCard } from "@/components/ui/surface-card";
import { useCustomerAuth } from "@/providers/customer-auth-provider";
import { tokens } from "@/theme/tokens";

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
  const { canAccessFullApp, isAuthenticated } = useCustomerAuth();
  const [probeState, setProbeState] = useState<FavoritesProbeState>("idle");
  const [probeMessage, setProbeMessage] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;

    if (!canAccessFullApp) {
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
          setProbeMessage(payload?.error ?? "Favoriler çok yakında aktif olacak.");
          return;
        }

        if (!response.ok) {
          setProbeState("error");
          setProbeMessage(payload?.error ?? "Favoriler şu anda açılamadı.");
          return;
        }

        setProbeState("ready");
      })
      .catch(() => {
        if (active) {
          setProbeState("error");
          setProbeMessage("Favoriler kontrol edilirken beklenmeyen bir hata oluştu.");
        }
      });

    return () => {
      active = false;
    };
  }, [apiConfig.baseUrl, canAccessFullApp, reloadKey]);

  return (
    <AppScrollScreen
      header={
        <SectionHeader
          title="Favoriler"
          subtitle="Kaydettiğin işletmeler ve kampanyalar burada toplanacak."
        />
      }
    >
      {!canAccessFullApp ? (
        <FullAccessRequiredPanel isAuthenticated={isAuthenticated} />
      ) : null}

      {canAccessFullApp && probeState === "loading" ? (
        <LoadingState label="Favoriler hazırlanıyor..." />
      ) : null}

      {canAccessFullApp && probeState === "not-ready" ? (
        <SurfaceCard>
          <View style={{ alignItems: "center", gap: tokens.spacing.md }}>
            <Heart color={tokens.colors.primary} size={42} />
            <Text style={{ color: tokens.colors.text, fontSize: 22, fontWeight: "900" }}>
              Yakında
            </Text>
            <Text
              style={{
                color: tokens.colors.textMuted,
                fontSize: 14,
                lineHeight: 20,
                textAlign: "center",
              }}
            >
              {probeMessage ??
                "Favori işletmeler, kampanyalar ve listeler v1 sonrası aktif edilecek."}
            </Text>
          </View>
        </SurfaceCard>
      ) : null}

      {canAccessFullApp && probeState === "error" ? (
        <EmptyState
          title="Favoriler açılamadı"
          description={probeMessage ?? "Beklenmeyen bir favoriler hatası alındı."}
          action={<Button onPress={() => setReloadKey((value) => value + 1)}>Tekrar dene</Button>}
        />
      ) : null}

      {canAccessFullApp && probeState === "ready" ? (
        <EmptyState
          title="Henüz favori yok"
          description="Beğendiğin işletmeleri kaydettiğinde bu ekran dolacak."
        />
      ) : null}
    </AppScrollScreen>
  );
}
