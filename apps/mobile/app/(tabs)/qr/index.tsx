import { CameraOff, QrCode } from "lucide-react-native";
import { Text, View } from "react-native";
import { FullAccessRequiredPanel } from "@/components/auth/customer-auth-panels";
import { AppScrollScreen } from "@/components/layout/app-scroll-screen";
import { SectionHeader } from "@/components/ui/section-header";
import { SurfaceCard } from "@/components/ui/surface-card";
import { useCustomerAuth } from "@/providers/customer-auth-provider";
import { tokens } from "@/theme/tokens";

export default function QrPlaceholderScreen() {
  const { canAccessFullApp, isAuthenticated } = useCustomerAuth();

  if (!canAccessFullApp) {
    return (
      <AppScrollScreen
        header={
          <SectionHeader
            title="QR"
            subtitle="QR deneyimi için önce müşteri hesabı tamamlanmalı."
          />
        }
      >
        <FullAccessRequiredPanel isAuthenticated={isAuthenticated} />
      </AppScrollScreen>
    );
  }

  return (
    <AppScrollScreen
      header={
        <SectionHeader
          title="QR tarayıcı"
          subtitle="Kampanya, menü ve işletme yönlendirmeleri için hazırlanıyor."
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
              borderColor: tokens.colors.primarySoft,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "#EDF4FD",
            }}
          >
            <QrCode color={tokens.colors.primary} size={52} />
          </View>
          <Text style={{ color: tokens.colors.text, fontSize: 18, fontWeight: "800" }}>
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
            Expo Camera entegrasyonu ve QR çözümleme sonraki mobil ürün branch'inde
            eklenecek.
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
    </AppScrollScreen>
  );
}
