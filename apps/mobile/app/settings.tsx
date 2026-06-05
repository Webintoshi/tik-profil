import { resolveApiRuntimeConfig } from "@/api/config";
import { AppScrollScreen } from "@/components/layout/app-scroll-screen";
import { SectionHeader } from "@/components/ui/section-header";
import { SurfaceCard } from "@/components/ui/surface-card";
import { useAppSession } from "@/providers/app-session-provider";
import { Text } from "react-native";

export default function SettingsScreen() {
  const { selectedLocation } = useAppSession();
  const config = resolveApiRuntimeConfig();

  return (
    <AppScrollScreen
      header={
        <SectionHeader
          title="Ayarlar placeholder"
          subtitle="Gerçek hesap, bildirim ve kişiselleştirme ayarları sonraki entegrasyonlarda genişletilecek."
        />
      }
    >
      <SurfaceCard>
        <Text style={{ fontSize: 16, fontWeight: "700" }}>Veri kaynağı</Text>
        <Text selectable style={{ fontSize: 14, lineHeight: 22 }}>
          API modu: {config.mode}
        </Text>
        <Text selectable style={{ fontSize: 14, lineHeight: 22 }}>
          API tabanı: {config.baseUrl}
        </Text>
      </SurfaceCard>
      <SurfaceCard>
        <Text style={{ fontSize: 16, fontWeight: "700" }}>Konum</Text>
        <Text selectable style={{ fontSize: 14, lineHeight: 22 }}>
          {selectedLocation?.label ?? "Seçilmedi"}
        </Text>
      </SurfaceCard>
      <SurfaceCard>
        <Text style={{ fontSize: 16, fontWeight: "700" }}>Not</Text>
        <Text style={{ fontSize: 14, lineHeight: 22 }}>
          Customer auth, payment ve production push notifications bu foundation kapsamı dışında bırakıldı.
        </Text>
      </SurfaceCard>
    </AppScrollScreen>
  );
}
