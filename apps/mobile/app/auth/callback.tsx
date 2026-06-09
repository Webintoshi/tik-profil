import { router } from "expo-router";
import { useEffect } from "react";
import { Text, View } from "react-native";
import { AppScrollScreen } from "@/components/layout/app-scroll-screen";
import { Button } from "@/components/ui/button";
import { SectionHeader } from "@/components/ui/section-header";
import { SurfaceCard } from "@/components/ui/surface-card";
import { tokens } from "@/theme/tokens";

export default function NativeAuthCompatibilityCallbackScreen() {
  useEffect(() => {
    const timeout = setTimeout(() => {
      router.replace("/(tabs)/profil");
    }, 900);

    return () => clearTimeout(timeout);
  }, []);

  return (
    <AppScrollScreen
      header={
        <SectionHeader
          title="Giriş yöntemi güncellendi"
          subtitle="Telefon doğrulama ile devam edebilirsin."
        />
      }
    >
      <SurfaceCard>
        <View style={{ gap: tokens.spacing.md }}>
          <Text style={{ color: tokens.colors.text, fontSize: 18, fontWeight: "800" }}>
            Profil ekranına dönülüyor
          </Text>
          <Text style={{ color: tokens.colors.textMuted, fontSize: 14, lineHeight: 20 }}>
            Tık Profil artık mobilde SMS doğrulama ve Google girişine hazır native akışı kullanır.
          </Text>
          <Button onPress={() => router.replace("/(tabs)/profil")}>
            Profil’e dön
          </Button>
        </View>
      </SurfaceCard>
    </AppScrollScreen>
  );
}
