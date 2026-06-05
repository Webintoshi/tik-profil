import { useRouter } from "expo-router";
import * as Location from "expo-location";
import { MapPin, Navigation } from "lucide-react-native";
import { useState } from "react";
import { Text, View } from "react-native";
import { AppScrollScreen } from "@/components/layout/app-scroll-screen";
import { ErrorState } from "@/components/states/error-state";
import { Button } from "@/components/ui/button";
import { SectionHeader } from "@/components/ui/section-header";
import { SurfaceCard } from "@/components/ui/surface-card";
import { useAppSession } from "@/providers/app-session-provider";
import { tokens } from "@/theme/tokens";

export default function LocationPermissionScreen() {
  const router = useRouter();
  const { setHasSeenIntro, setSelectedLocation } = useAppSession();
  const [error, setError] = useState<string | null>(null);

  const handlePermission = async () => {
    setError(null);

    const permission = await Location.requestForegroundPermissionsAsync();

    if (permission.status !== "granted") {
      setError("Konum izni verilmedi. Manuel seçim ile devam edebilirsin.");
      return;
    }

    let latitude: number | undefined;
    let longitude: number | undefined;

    try {
      const position = await Location.getCurrentPositionAsync({});
      latitude = position.coords.latitude;
      longitude = position.coords.longitude;
    } catch {
      latitude = undefined;
      longitude = undefined;
    }

    setHasSeenIntro(true);
    setSelectedLocation({
      source: "device",
      city: "İstanbul",
      district: "Kadıköy",
      neighborhood: "Moda",
      label: "Cihaz konumu · demo yakın bölge",
      latitude,
      longitude,
    });
    router.replace("/(tabs)/kesfet");
  };

  return (
    <AppScrollScreen
      header={
        <SectionHeader
          title="Yakındaki işletmeleri göster"
          subtitle="Konum izni verildiğinde keşfet akışı demo bölgeden başlar. Gerçek müşteri oturumu ve stateful keşif uçları henüz bağlı değildir."
        />
      }
    >
      <SurfaceCard>
        <View style={{ flexDirection: "row", gap: 12 }}>
          <View
            style={{
              width: 48,
              height: 48,
              borderRadius: 16,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "#EAF3FC",
            }}
          >
            <Navigation color={tokens.colors.primary} size={20} />
          </View>
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={{ color: tokens.colors.text, fontSize: 16, fontWeight: "700" }}>
              Konum izni
            </Text>
            <Text style={{ color: tokens.colors.textMuted, fontSize: 14, lineHeight: 20 }}>
              Yalnızca keşif listesi ve kategori sonuçlarını bağlamak için kullanılır.
            </Text>
          </View>
        </View>
      </SurfaceCard>
      <SurfaceCard>
        <View style={{ flexDirection: "row", gap: 12 }}>
          <View
            style={{
              width: 48,
              height: 48,
              borderRadius: 16,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "#EAF3FC",
            }}
          >
            <MapPin color={tokens.colors.primary} size={20} />
          </View>
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={{ color: tokens.colors.text, fontSize: 16, fontWeight: "700" }}>
              Manuel seçim alternatifi
            </Text>
            <Text style={{ color: tokens.colors.textMuted, fontSize: 14, lineHeight: 20 }}>
              Mock modda il, ilçe ve mahalle placeholder seçimiyle de ilerleyebilirsin.
            </Text>
          </View>
        </View>
      </SurfaceCard>
      {error ? (
        <ErrorState description={error} />
      ) : null}
      <View style={{ gap: 12 }}>
        <Button onPress={handlePermission}>İzin ver ve devam et</Button>
        <Button
          onPress={() => {
            setHasSeenIntro(true);
            router.push("/(onboarding)/manual-location");
          }}
          variant="secondary"
        >
          Manuel konum seç
        </Button>
      </View>
    </AppScrollScreen>
  );
}
