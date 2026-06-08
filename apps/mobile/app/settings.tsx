import { Text } from "react-native";
import { resolveLogtoMobileRuntimeConfig } from "@/auth/config";
import { resolveApiRuntimeConfig } from "@/api/config";
import { AppScrollScreen } from "@/components/layout/app-scroll-screen";
import { Button } from "@/components/ui/button";
import { SectionHeader } from "@/components/ui/section-header";
import { SurfaceCard } from "@/components/ui/surface-card";
import { useAppSession } from "@/providers/app-session-provider";
import { useCustomerAuth } from "@/providers/customer-auth-provider";

export default function SettingsScreen() {
  const { selectedLocation } = useAppSession();
  const {
    backendStatus,
    customerIdentity,
    errorMessage,
    isAuthenticated,
    isBusy,
    isConfigured,
    limitationMessage,
    signOut,
  } = useCustomerAuth();
  const apiConfig = resolveApiRuntimeConfig();
  const logtoConfig = resolveLogtoMobileRuntimeConfig();

  return (
    <AppScrollScreen
      header={
        <SectionHeader
          title="Ayarlar"
          subtitle="Discovery, local Logto ve backend customer session durumu burada birlikte gorunur."
        />
      }
    >
      <SurfaceCard>
        <Text style={{ fontSize: 16, fontWeight: "700" }}>Veri kaynagi</Text>
        <Text selectable style={{ fontSize: 14, lineHeight: 22 }}>
          API modu: {apiConfig.mode}
        </Text>
        <Text selectable style={{ fontSize: 14, lineHeight: 22 }}>
          API tabani: {apiConfig.baseUrl}
        </Text>
      </SurfaceCard>

      <SurfaceCard>
        <Text style={{ fontSize: 16, fontWeight: "700" }}>Logto mobile</Text>
        <Text selectable style={{ fontSize: 14, lineHeight: 22 }}>
          Konfig: {isConfigured ? "hazir" : "eksik"}
        </Text>
        <Text selectable style={{ fontSize: 14, lineHeight: 22 }}>
          Local Logto signed-in: {isAuthenticated ? "evet" : "hayir"}
        </Text>
        <Text selectable style={{ fontSize: 14, lineHeight: 22 }}>
          Backend session synced: {backendStatus === "ready" ? "evet" : "hayir"}
        </Text>
        <Text selectable style={{ fontSize: 14, lineHeight: 22 }}>
          Actor: {isAuthenticated ? "customer" : "misafir"}
        </Text>
        <Text selectable style={{ fontSize: 14, lineHeight: 22 }}>
          Backend sync: {backendStatus}
        </Text>
        <Text selectable style={{ fontSize: 14, lineHeight: 22 }}>
          Bridge path: {logtoConfig.customerSessionBridgePath}
        </Text>
        <Text selectable style={{ fontSize: 14, lineHeight: 22 }}>
          Redirect URI: {logtoConfig.redirectUri}
        </Text>
        <Text selectable style={{ fontSize: 14, lineHeight: 22 }}>
          Web fallback path: {logtoConfig.webSignInPath}
        </Text>
        {customerIdentity?.logtoSub ? (
          <Text selectable style={{ fontSize: 14, lineHeight: 22 }}>
            Logto sub: {customerIdentity.logtoSub}
          </Text>
        ) : null}
        {limitationMessage ? (
          <Text style={{ fontSize: 14, lineHeight: 22 }}>{limitationMessage}</Text>
        ) : null}
        {errorMessage ? (
          <Text style={{ fontSize: 14, lineHeight: 22, color: "#C64D46" }}>
            {errorMessage}
          </Text>
        ) : null}
        {isAuthenticated ? (
          <Button disabled={isBusy} onPress={() => void signOut()} variant="secondary">
            {isBusy ? "Cikis yapiliyor" : "Cikis yap"}
          </Button>
        ) : null}
      </SurfaceCard>

      <SurfaceCard>
        <Text style={{ fontSize: 16, fontWeight: "700" }}>Placeholder baglayicilar</Text>
        <Text style={{ fontSize: 14, lineHeight: 22 }}>
          Google: Yakinda. Logto connector + Expo development build gerekli.
        </Text>
        <Text style={{ fontSize: 14, lineHeight: 22 }}>
          Apple: Yakinda. Apple Developer hesabi, iOS bundle ID ve Android package/SHA gerekli.
        </Text>
      </SurfaceCard>

      <SurfaceCard>
        <Text style={{ fontSize: 16, fontWeight: "700" }}>Konum</Text>
        <Text selectable style={{ fontSize: 14, lineHeight: 22 }}>
          {selectedLocation?.label ?? "Secilmedi"}
        </Text>
      </SurfaceCard>

      <SurfaceCard>
        <Text style={{ fontSize: 16, fontWeight: "700" }}>Not</Text>
        <Text style={{ fontSize: 14, lineHeight: 22 }}>
          Payments, wallet, siparisler, rezervasyonlar ve stateful customer urun akisleri halen bu
          branch kapsami disinda.
        </Text>
      </SurfaceCard>
    </AppScrollScreen>
  );
}
