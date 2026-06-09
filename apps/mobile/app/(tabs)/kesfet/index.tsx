import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { useState } from "react";
import { Heart, MapPin, Navigation, QrCode, Search, Settings2, Sparkles } from "lucide-react-native";
import { Pressable, ScrollView, Text, View } from "react-native";
import { FullAccessRequiredPanel } from "@/components/auth/customer-auth-panels";
import { BusinessCard } from "@/components/business/business-card";
import { EmptyState } from "@/components/states/empty-state";
import { ErrorState } from "@/components/states/error-state";
import { LoadingState } from "@/components/states/loading-state";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { ActionTile } from "@/components/v2/action-tile";
import { AppScreen } from "@/components/v2/app-screen";
import { PromoRail } from "@/components/v2/promo-rail";
import { SectionTitle } from "@/components/v2/section-title";
import { useCategories } from "@/hooks/use-categories";
import { useDiscoveryFeed } from "@/hooks/use-discovery-feed";
import { useAppSession } from "@/providers/app-session-provider";
import { useCustomerAuth } from "@/providers/customer-auth-provider";
import { tokens } from "@/theme/tokens";

export default function DiscoverScreen() {
  const router = useRouter();
  const { selectedLocation } = useAppSession();
  const { canAccessFullApp, isAuthenticated } = useCustomerAuth();
  const [selectedCategory, setSelectedCategory] = useState("all");
  const categories = useCategories();
  const discovery = useDiscoveryFeed(selectedLocation, selectedCategory);

  if (!canAccessFullApp) {
    return (
      <AppScreen
        header={
          <LinearGradient
            colors={tokens.gradients.hero}
            style={{
              borderRadius: tokens.radius.xl,
              borderCurve: "continuous",
              overflow: "hidden",
              padding: tokens.spacing.xl,
              gap: tokens.spacing.lg,
              boxShadow: tokens.shadow.strong,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <Sparkles color={tokens.colors.accentGold} size={20} />
              <Text style={{ color: tokens.colors.white, fontSize: 13, fontWeight: "900" }}>
                Tık Profil
              </Text>
            </View>
            <View style={{ gap: 8 }}>
              <Text
                style={{
                  color: tokens.colors.white,
                  fontSize: 32,
                  fontWeight: "900",
                  letterSpacing: -0.8,
                  lineHeight: 36,
                }}
              >
                Yakınındaki işletmeleri tek akışta keşfet.
              </Text>
              <Text style={{ color: "rgba(255,255,255,0.78)", fontSize: 15, lineHeight: 22 }}>
                Kampanyalar, QR profiller ve favoriler için hesabını güvenli şekilde hazırla.
              </Text>
            </View>
          </LinearGradient>
        }
      >
        <FullAccessRequiredPanel isAuthenticated={isAuthenticated} />
        <PromoRail />
      </AppScreen>
    );
  }

  return (
    <AppScreen
      header={
        <LinearGradient
          colors={tokens.gradients.hero}
          style={{
            borderRadius: tokens.radius.xl,
            borderCurve: "continuous",
            overflow: "hidden",
            padding: tokens.spacing.xl,
            gap: tokens.spacing.lg,
            boxShadow: tokens.shadow.strong,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              gap: tokens.spacing.md,
            }}
          >
            <View
              style={{
                flex: 1,
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
              }}
            >
              <MapPin color={tokens.colors.accentGold} size={18} />
              <Text
                numberOfLines={1}
                selectable
                style={{ color: "rgba(255,255,255,0.86)", flex: 1, fontSize: 14, fontWeight: "800" }}
              >
                {selectedLocation?.label ?? "Konum seçilmedi"}
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push("/(onboarding)/manual-location")}
              style={({ pressed }) => ({
                width: 44,
                height: 44,
                borderRadius: 17,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: "rgba(255,255,255,0.16)",
                opacity: pressed ? 0.84 : 1,
              })}
            >
              <Settings2 color={tokens.colors.white} size={19} />
            </Pressable>
          </View>
          <View style={{ gap: 10 }}>
            <Text
              style={{
                color: tokens.colors.white,
                fontSize: 34,
                fontWeight: "900",
                letterSpacing: -1,
                lineHeight: 38,
              }}
            >
              Bugün nereye uğruyoruz?
            </Text>
            <Text style={{ color: "rgba(255,255,255,0.76)", fontSize: 15, lineHeight: 22 }}>
              Restoran, kahve, güzellik ve yerel fırsatları hızlıca keşfet.
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push("/(tabs)/ara")}
            style={({ pressed }) => ({
              minHeight: 56,
              borderRadius: tokens.radius.lg,
              borderCurve: "continuous",
              backgroundColor: tokens.colors.white,
              flexDirection: "row",
              alignItems: "center",
              gap: 10,
              paddingHorizontal: tokens.spacing.md,
              opacity: pressed ? 0.92 : 1,
            })}
          >
            <Search color={tokens.colors.primary} size={20} />
            <Text style={{ color: tokens.colors.textMuted, flex: 1, fontSize: 15, fontWeight: "700" }}>
              İşletme, kategori veya mahalle ara
            </Text>
          </Pressable>
        </LinearGradient>
      }
    >
      <View style={{ flexDirection: "row", gap: tokens.spacing.sm }}>
        <ActionTile
          icon={<Navigation color={tokens.colors.primary} size={18} />}
          label="Yakınımda"
          meta="Konuma göre"
          onPress={() => router.push("/(onboarding)/manual-location")}
        />
        <ActionTile
          icon={<QrCode color={tokens.colors.warning} size={18} />}
          label="QR Profil"
          meta="Hızlı aç"
          onPress={() => router.push("/(tabs)/qr")}
          tone="gold"
        />
        <ActionTile
          icon={<Heart color={tokens.colors.success} size={18} />}
          label="Favoriler"
          meta="Yakında"
          onPress={() => router.push("/(tabs)/favoriler")}
          tone="green"
        />
      </View>

      <View style={{ gap: tokens.spacing.sm }}>
        <SectionTitle
          eyebrow="Kategoriler"
          title="Ne arıyorsun?"
          subtitle="Popüler işletmeleri kategoriye göre hızlıca filtrele."
        />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 10, paddingRight: tokens.spacing.lg }}
        >
          <Chip
            label="Tümü"
            icon="✨"
            onPress={() => setSelectedCategory("all")}
            selected={selectedCategory === "all"}
          />
          {categories.data.map((category) => (
            <Chip
              key={category.slug}
              icon={category.icon}
              label={category.label}
              onPress={() => {
                setSelectedCategory(category.slug);
                router.push(`/category/${category.slug}`);
              }}
              selected={selectedCategory === category.slug}
            />
          ))}
        </ScrollView>
      </View>

      <View style={{ gap: tokens.spacing.sm }}>
        <SectionTitle
          eyebrow="Öne çıkanlar"
          title="Bugünün fırsatları"
          subtitle="Yerel işletmeler için hazırlanan hızlı keşif alanı."
        />
        <PromoRail />
      </View>

      <View style={{ gap: tokens.spacing.md }}>
        <SectionTitle
          eyebrow="Yakınında"
          title="İşletme vitrinleri"
          subtitle="Açık mekanlar, profiller ve iletişim bilgileri tek dokunuşta."
        />
        {!selectedLocation ? (
          <EmptyState
            title="Konumunu seç"
            description="Yakınındaki işletmeleri daha doğru göstermek için şehir ve ilçe seç."
            action={
              <Button
                onPress={() => router.push("/(onboarding)/manual-location")}
                variant="secondary"
              >
                Konumu ayarla
              </Button>
            }
          />
        ) : null}
        {selectedLocation && discovery.isLoading ? (
          <LoadingState label="Yakınındaki işletmeler hazırlanıyor" />
        ) : null}
        {selectedLocation && discovery.isError ? (
          <ErrorState
            description={discovery.error ?? "Keşif akışı şu anda yüklenemedi."}
            action={<Button onPress={discovery.reload}>Tekrar dene</Button>}
          />
        ) : null}
        {selectedLocation && discovery.isSuccess && discovery.data.businesses.length === 0 ? (
          <EmptyState
            title="Bu bölgede vitrin yok"
            description="Başka bir ilçe seçerek daha fazla işletme görebilirsin."
            action={
              <Button
                onPress={() => router.push("/(onboarding)/manual-location")}
                variant="secondary"
              >
                Konumu değiştir
              </Button>
            }
          />
        ) : null}
        {selectedLocation && discovery.isSuccess && discovery.data.businesses.length > 0
          ? discovery.data.businesses.map((business) => (
              <BusinessCard business={business} key={business.id} />
            ))
          : null}
      </View>
    </AppScreen>
  );
}
