import { Text, View } from "react-native";
import { resolveApiRuntimeConfig } from "@/api/config";
import { AppScrollScreen } from "@/components/layout/app-scroll-screen";
import { Button } from "@/components/ui/button";
import { SectionHeader } from "@/components/ui/section-header";
import { SurfaceCard } from "@/components/ui/surface-card";
import { useAppSession } from "@/providers/app-session-provider";
import { useCustomerAuth } from "@/providers/customer-auth-provider";
import { tokens } from "@/theme/tokens";

function StatusLine({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 16 }}>
      <Text style={{ color: tokens.colors.textMuted, fontSize: 14 }}>{label}</Text>
      <Text selectable style={{ color: tokens.colors.text, fontSize: 14, fontWeight: "700" }}>
        {value}
      </Text>
    </View>
  );
}

function getSessionStatusLabel(status: string): string {
  switch (status) {
    case "loading":
      return "Hazırlanıyor";
    case "ready":
      return "Tamamlandı";
    case "profile-warning":
      return "Profil bilgileri bekleniyor";
    case "disconnected":
      return "Doğrulanıyor";
    case "error":
      return "Tekrar deneyin";
    default:
      return "Beklemede";
  }
}

export default function SettingsScreen() {
  const { selectedLocation } = useAppSession();
  const {
    accountCompletion,
    backendStatus,
    customerAccount,
    isAuthenticated,
    isBusy,
    isConfigured,
    isGoogleConfigured,
    signOut,
  } = useCustomerAuth();
  const apiConfig = resolveApiRuntimeConfig();

  return (
    <AppScrollScreen
      header={
        <SectionHeader
          title="Ayarlar"
          subtitle="Hesap, oturum ve uygulama durumu."
        />
      }
    >
      <SurfaceCard>
        <Text style={{ color: tokens.colors.text, fontSize: 17, fontWeight: "800" }}>
          Hesap
        </Text>
        <StatusLine label="Giriş" value={isAuthenticated ? "Açık" : "Kapalı"} />
        <StatusLine label="Oturum durumu" value={getSessionStatusLabel(backendStatus)} />
        <StatusLine
          label="Hesap tamamlama"
          value={accountCompletion.isComplete ? "Tamam" : "Eksik"}
        />
        {customerAccount?.email ? <StatusLine label="Mail" value={customerAccount.email} /> : null}
        {isAuthenticated ? (
          <Button disabled={isBusy} onPress={() => void signOut()} variant="secondary">
            {isBusy ? "Çıkış yapılıyor" : "Çıkış yap"}
          </Button>
        ) : null}
      </SurfaceCard>

      <SurfaceCard>
        <Text style={{ color: tokens.colors.text, fontSize: 17, fontWeight: "800" }}>
          Uygulama
        </Text>
        <StatusLine label="API modu" value={apiConfig.mode} />
        <StatusLine label="Mobil auth" value={isConfigured ? "Hazır" : "Eksik"} />
        <StatusLine label="Google giriş" value={isGoogleConfigured ? "Hazır" : "Client ID bekliyor"} />
        <StatusLine label="Konum" value={selectedLocation?.label ?? "Seçilmedi"} />
      </SurfaceCard>

      <SurfaceCard>
        <Text style={{ color: tokens.colors.text, fontSize: 17, fontWeight: "800" }}>
          Destek
        </Text>
        <Text style={{ color: tokens.colors.textMuted, fontSize: 14, lineHeight: 22 }}>
          Yardım merkezi, bildirim tercihleri ve hesap güvenliği bağlantıları v1 sonrası
          ürün akışında tamamlanacak.
        </Text>
      </SurfaceCard>

      <SurfaceCard>
        <Text style={{ color: tokens.colors.text, fontSize: 17, fontWeight: "800" }}>
          Sosyal girişler
        </Text>
        <Text style={{ color: tokens.colors.textMuted, fontSize: 14, lineHeight: 22 }}>
          Google ile devam et native akışa hazırlandı. Apple ile giriş bir sonraki auth
          branch'inde ele alınacak.
        </Text>
      </SurfaceCard>
    </AppScrollScreen>
  );
}
