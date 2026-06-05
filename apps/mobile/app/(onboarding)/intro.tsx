import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import { Compass, QrCode, Star } from "lucide-react-native";
import { Text, View } from "react-native";
import { BrandMark } from "@/components/brand/brand-mark";
import { AppScrollScreen } from "@/components/layout/app-scroll-screen";
import { Button } from "@/components/ui/button";
import { SurfaceCard } from "@/components/ui/surface-card";
import { useAppSession } from "@/providers/app-session-provider";
import { tokens } from "@/theme/tokens";

export default function IntroScreen() {
  const router = useRouter();
  const { setHasSeenIntro } = useAppSession();

  const handleContinue = () => {
    setHasSeenIntro(true);
    router.replace("/(onboarding)/location-permission");
  };

  return (
    <View style={{ flex: 1, backgroundColor: tokens.colors.primaryStrong }}>
      <StatusBar style="light" />
      <LinearGradient
        colors={tokens.gradients.hero}
        style={{
          position: "absolute",
          top: 0,
          right: 0,
          bottom: 0,
          left: 0,
        }}
      />
      <AppScrollScreen
        header={
          <View
            style={{
              gap: tokens.spacing.lg,
              paddingTop: tokens.spacing.xl,
            }}
          >
            <View
              style={{
                width: 92,
                height: 92,
                borderRadius: 28,
                borderCurve: "continuous",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: "rgba(255,255,255,0.16)",
                borderWidth: 1,
                borderColor: "rgba(255,255,255,0.18)",
              }}
            >
              <BrandMark size={52} />
            </View>
            <View style={{ gap: 10 }}>
              <Text
                style={{
                  color: tokens.colors.white,
                  fontSize: 34,
                  fontWeight: "800",
                  lineHeight: 38,
                }}
              >
                Tık Profil ile çevrendeki işletmeleri tek akışta keşfet.
              </Text>
              <Text
                style={{
                  color: "rgba(255,255,255,0.82)",
                  fontSize: 16,
                  lineHeight: 24,
                }}
              >
                İlk sürüm; keşif, kategori, arama ve işletme profili görüntüleme
                odaklıdır. Müşteri girişi ve sipariş akışları henüz bağlı değildir.
              </Text>
            </View>
          </View>
        }
      >
        <SurfaceCard>
          <View style={{ flexDirection: "row", gap: 12 }}>
            <Compass color={tokens.colors.primary} size={20} />
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={{ color: tokens.colors.text, fontSize: 16, fontWeight: "700" }}>
                Konuma göre keşif
              </Text>
              <Text style={{ color: tokens.colors.textMuted, fontSize: 14, lineHeight: 20 }}>
                Şehir ve ilçe seçimiyle mock keşif akışını başlat.
              </Text>
            </View>
          </View>
        </SurfaceCard>
        <SurfaceCard>
          <View style={{ flexDirection: "row", gap: 12 }}>
            <Star color={tokens.colors.primary} size={20} />
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={{ color: tokens.colors.text, fontSize: 16, fontWeight: "700" }}>
                Profil odaklı detaylar
              </Text>
              <Text style={{ color: tokens.colors.textMuted, fontSize: 14, lineHeight: 20 }}>
                Logo, kapak, çalışma saati, iletişim ve profil link alanı hazır.
              </Text>
            </View>
          </View>
        </SurfaceCard>
        <SurfaceCard>
          <View style={{ flexDirection: "row", gap: 12 }}>
            <QrCode color={tokens.colors.primary} size={20} />
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={{ color: tokens.colors.text, fontSize: 16, fontWeight: "700" }}>
                QR ve favoriler temeli
              </Text>
              <Text style={{ color: tokens.colors.textMuted, fontSize: 14, lineHeight: 20 }}>
                Gerçek tarama ve hesap akışları daha sonra bağlanacak şekilde hazırlandı.
              </Text>
            </View>
          </View>
        </SurfaceCard>
        <View style={{ gap: 12, marginTop: tokens.spacing.sm }}>
          <Button onPress={handleContinue}>Konumu ayarla</Button>
          <Button onPress={handleContinue} variant="secondary">
            Önce uygulamayı incele
          </Button>
        </View>
      </AppScrollScreen>
    </View>
  );
}
