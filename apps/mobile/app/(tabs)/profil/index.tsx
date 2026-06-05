import { Link } from "expo-router";
import { ChevronRight, UserRound } from "lucide-react-native";
import { Pressable, Text, View } from "react-native";
import { AppScrollScreen } from "@/components/layout/app-scroll-screen";
import { SectionHeader } from "@/components/ui/section-header";
import { SurfaceCard } from "@/components/ui/surface-card";
import { useAppSession } from "@/providers/app-session-provider";
import { tokens } from "@/theme/tokens";

export default function ProfilePlaceholderScreen() {
  const { favoriteSlugs, selectedLocation } = useAppSession();

  return (
    <AppScrollScreen
      header={
        <SectionHeader
          title="Profil placeholder"
          subtitle="Müşteri auth hazır olmadığı için bu alan hesap kimliği yerine uygulama durumu ve ileride bağlanacak giriş yüzeyi için yer tutar."
        />
      }
    >
      <SurfaceCard>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
          <View
            style={{
              width: 52,
              height: 52,
              borderRadius: 18,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "#EAF3FC",
            }}
          >
            <UserRound color={tokens.colors.primary} size={24} />
          </View>
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={{ color: tokens.colors.text, fontSize: 18, fontWeight: "700" }}>
              Misafir mod
            </Text>
            <Text style={{ color: tokens.colors.textMuted, fontSize: 14 }}>
              Auth hazır olana kadar keşif ve profil görüntüleme odaklı.
            </Text>
          </View>
        </View>
      </SurfaceCard>
      <SurfaceCard>
        <Text style={{ color: tokens.colors.text, fontSize: 16, fontWeight: "700" }}>
          Uygulama durumu
        </Text>
        <Text selectable style={{ color: tokens.colors.textMuted, fontSize: 14, lineHeight: 20 }}>
          Konum: {selectedLocation?.label ?? "Seçilmedi"}
        </Text>
        <Text selectable style={{ color: tokens.colors.textMuted, fontSize: 14, lineHeight: 20 }}>
          Cihaz favorileri: {favoriteSlugs.length}
        </Text>
      </SurfaceCard>
      <Link href="/settings" asChild>
        <Pressable
          style={{
            minHeight: 54,
            borderRadius: tokens.radius.md,
            borderCurve: "continuous",
            borderWidth: 1,
            borderColor: tokens.colors.border,
            backgroundColor: tokens.colors.surface,
            justifyContent: "center",
            paddingHorizontal: tokens.spacing.lg,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              width: "100%",
            }}
          >
            <Text style={{ color: tokens.colors.text, fontSize: 16, fontWeight: "700" }}>
              Ayarlar
            </Text>
            <ChevronRight color={tokens.colors.textSoft} size={18} />
          </View>
        </Pressable>
      </Link>
    </AppScrollScreen>
  );
}
