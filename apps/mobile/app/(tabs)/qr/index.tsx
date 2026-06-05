import { CameraOff, QrCode } from "lucide-react-native";
import { Text, View } from "react-native";
import { AppScrollScreen } from "@/components/layout/app-scroll-screen";
import { SectionHeader } from "@/components/ui/section-header";
import { SurfaceCard } from "@/components/ui/surface-card";
import { tokens } from "@/theme/tokens";

export default function QrPlaceholderScreen() {
  return (
    <AppScrollScreen
      header={
        <SectionHeader
          title="QR tarayıcı placeholder"
          subtitle="Gerçek kamera ve tarama akışı bu foundation sürümünde deliberately dışarıda bırakıldı."
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
          <Text style={{ color: tokens.colors.text, fontSize: 18, fontWeight: "700" }}>
            Tarayıcı altyapısı hazırlanacak
          </Text>
          <Text
            style={{
              color: tokens.colors.textMuted,
              fontSize: 14,
              lineHeight: 20,
              textAlign: "center",
            }}
          >
            Expo Camera entegrasyonu, QR çözümleme ve işletme yönlendirmesi bir sonraki
            bağlantı aşamasında eklenecek.
          </Text>
        </View>
      </SurfaceCard>
      <SurfaceCard>
        <View style={{ flexDirection: "row", gap: 12 }}>
          <CameraOff color={tokens.colors.primary} size={20} />
          <Text style={{ color: tokens.colors.textMuted, fontSize: 14, lineHeight: 20, flex: 1 }}>
            Bu ekran production push, auth veya stateful müşteri route’larına bağlı değildir.
          </Text>
        </View>
      </SurfaceCard>
    </AppScrollScreen>
  );
}
