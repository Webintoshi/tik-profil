import { CameraOff, QrCode } from "lucide-react-native";
import { Text, View } from "react-native";
import { FullAccessRequiredPanel } from "@/components/auth/customer-auth-panels";
import { SurfaceCard } from "@/components/ui/surface-card";
import { AppScreen } from "@/components/v2/app-screen";
import { SectionTitle } from "@/components/v2/section-title";
import { useCustomerAuth } from "@/providers/customer-auth-provider";
import { tokens } from "@/theme/tokens";

export default function QrPlaceholderScreen() {
  const { canAccessFullApp, isAuthenticated } = useCustomerAuth();

  if (!canAccessFullApp) {
    return (
      <AppScreen
        header={
          <SectionTitle
            eyebrow="QR"
            title="QR"
            subtitle="QR profil deneyimi için hesabını hazırla."
          />
        }
      >
        <FullAccessRequiredPanel isAuthenticated={isAuthenticated} />
      </AppScreen>
    );
  }

  return (
    <AppScreen
      header={
        <SectionTitle
          eyebrow="QR Profil"
          title="QR tarayıcı"
          subtitle="Kampanya, menü ve işletme profillerini hızlıca açmak için hazırlanıyor."
        />
      }
    >
      <SurfaceCard>
        <View
          style={{
            alignItems: "center",
            justifyContent: "center",
            gap: 16,
            paddingVertical: 24,
          }}
        >
          <View
            style={{
              width: 220,
              height: 220,
              borderRadius: 28,
              borderCurve: "continuous",
              borderWidth: 2,
              borderStyle: "dashed",
              borderColor: tokens.colors.accent,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: tokens.colors.infoSoft,
            }}
          >
            <QrCode color={tokens.colors.primary} size={60} />
          </View>
          <Text style={{ color: tokens.colors.text, fontSize: 21, fontWeight: "900" }}>
            Tarayıcı yakında aktif olacak
          </Text>
          <Text
            style={{
              color: tokens.colors.textMuted,
              fontSize: 14,
              lineHeight: 20,
              textAlign: "center",
            }}
          >
            QR profil, kampanya ve menü bağlantıları için güvenli tarama deneyimi
            hazırlanıyor.
          </Text>
        </View>
      </SurfaceCard>
      <SurfaceCard>
        <View style={{ flexDirection: "row", gap: 12 }}>
          <CameraOff color={tokens.colors.primary} size={20} />
          <Text style={{ color: tokens.colors.textMuted, fontSize: 14, lineHeight: 20, flex: 1 }}>
            Bu ekranda sipariş, ödeme veya rezervasyon verisi oluşturulmaz.
          </Text>
        </View>
      </SurfaceCard>
    </AppScreen>
  );
}
