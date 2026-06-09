import type { ReactNode } from "react";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import { Compass, MapPin, QrCode, Sparkles, Star } from "lucide-react-native";
import { Text, View } from "react-native";
import { BrandMark } from "@/components/brand/brand-mark";
import { Button } from "@/components/ui/button";
import { SurfaceCard } from "@/components/ui/surface-card";
import { AppScreen } from "@/components/v2/app-screen";
import { useAppSession } from "@/providers/app-session-provider";
import { tokens } from "@/theme/tokens";

function IntroFeature({
  body,
  icon,
  title,
}: {
  body: string;
  icon: ReactNode;
  title: string;
}) {
  return (
    <SurfaceCard>
      <View style={{ flexDirection: "row", gap: 13 }}>
        <View
          style={{
            width: 44,
            height: 44,
            borderRadius: 17,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: tokens.colors.infoSoft,
          }}
        >
          {icon}
        </View>
        <View style={{ flex: 1, gap: 5 }}>
          <Text style={{ color: tokens.colors.text, fontSize: 17, fontWeight: "900" }}>
            {title}
          </Text>
          <Text style={{ color: tokens.colors.textMuted, fontSize: 14, lineHeight: 20 }}>
            {body}
          </Text>
        </View>
      </View>
    </SurfaceCard>
  );
}

export default function IntroScreen() {
  const router = useRouter();
  const { setHasSeenIntro } = useAppSession();

  const handleContinue = () => {
    setHasSeenIntro(true);
    router.replace("/(onboarding)/location-permission");
  };

  return (
    <>
      <StatusBar style="light" />
      <AppScreen
        background="dark"
        header={
          <LinearGradient
            colors={tokens.gradients.hero}
            style={{
              borderRadius: tokens.radius.xl,
              borderCurve: "continuous",
              overflow: "hidden",
              padding: tokens.spacing.xl,
              gap: tokens.spacing.xxl,
              boxShadow: tokens.shadow.glow,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <View
                style={{
                  width: 78,
                  height: 78,
                  borderRadius: 28,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: "rgba(255,255,255,0.16)",
                  borderWidth: 1,
                  borderColor: "rgba(255,255,255,0.18)",
                }}
              >
                <BrandMark size={48} />
              </View>
              <View
                style={{
                  borderRadius: tokens.radius.pill,
                  backgroundColor: "rgba(255,255,255,0.16)",
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 7,
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                }}
              >
                <Sparkles color={tokens.colors.accentGold} size={14} />
                <Text style={{ color: tokens.colors.white, fontSize: 12, fontWeight: "900" }}>
                  Yeni mobil deneyim
                </Text>
              </View>
            </View>

            <View style={{ gap: tokens.spacing.md }}>
              <Text
                style={{
                  color: tokens.colors.white,
                  fontSize: 38,
                  fontWeight: "900",
                  letterSpacing: -1.2,
                  lineHeight: 42,
                }}
              >
                Mahallendeki işletmeler tek dokunuş uzağında.
              </Text>
              <Text style={{ color: "rgba(255,255,255,0.78)", fontSize: 16, lineHeight: 24 }}>
                Tık Profil; restoran, kahve, güzellik, otel ve yerel hizmetleri hızlıca
                keşfetmen için tasarlandı.
              </Text>
            </View>

            <View style={{ flexDirection: "row", gap: tokens.spacing.sm }}>
              <View
                style={{
                  flex: 1,
                  borderRadius: tokens.radius.lg,
                  backgroundColor: "rgba(255,255,255,0.14)",
                  padding: tokens.spacing.md,
                  gap: 4,
                }}
              >
                <Text style={{ color: tokens.colors.white, fontSize: 22, fontWeight: "900" }}>
                  4.8
                </Text>
                <Text style={{ color: "rgba(255,255,255,0.72)", fontSize: 12 }}>puan vitrinleri</Text>
              </View>
              <View
                style={{
                  flex: 1,
                  borderRadius: tokens.radius.lg,
                  backgroundColor: "rgba(255,255,255,0.14)",
                  padding: tokens.spacing.md,
                  gap: 4,
                }}
              >
                <Text style={{ color: tokens.colors.white, fontSize: 22, fontWeight: "900" }}>
                  QR
                </Text>
                <Text style={{ color: "rgba(255,255,255,0.72)", fontSize: 12 }}>hızlı profil</Text>
              </View>
            </View>
          </LinearGradient>
        }
      >
        <IntroFeature
          body="Şehir ve ilçene göre yakınındaki işletmeleri daha hızlı bul."
          icon={<MapPin color={tokens.colors.primary} size={21} />}
          title="Konuma göre keşif"
        />
        <IntroFeature
          body="Kategori, kampanya ve favorilerle günlük keşif akışını kişiselleştir."
          icon={<Compass color={tokens.colors.primary} size={21} />}
          title="Canlı yerel akış"
        />
        <IntroFeature
          body="Vitrindeki QR kodları ve profil bağlantılarını telefondan hızlıca aç."
          icon={<QrCode color={tokens.colors.primary} size={21} />}
          title="QR profil deneyimi"
        />
        <IntroFeature
          body="Beğendiğin işletmeleri takip etmek için hesabını güvenli şekilde hazırla."
          icon={<Star color={tokens.colors.primary} size={21} />}
          title="Favoriler ve hesap"
        />
        <View style={{ gap: 12, marginTop: tokens.spacing.sm }}>
          <Button onPress={handleContinue}>Konumu ayarla</Button>
          <Button onPress={handleContinue} variant="secondary">
            Önce uygulamayı incele
          </Button>
        </View>
      </AppScreen>
    </>
  );
}
