import { useRouter } from "expo-router";
import { useState } from "react";
import { MapPin, Settings2 } from "lucide-react-native";
import { Pressable, ScrollView, Text, View } from "react-native";
import { AppScrollScreen } from "@/components/layout/app-scroll-screen";
import { EmptyState } from "@/components/states/empty-state";
import { ErrorState } from "@/components/states/error-state";
import { LoadingState } from "@/components/states/loading-state";
import { BusinessCard } from "@/components/business/business-card";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { SearchField } from "@/components/ui/search-field";
import { SectionHeader } from "@/components/ui/section-header";
import { SurfaceCard } from "@/components/ui/surface-card";
import { useCategories } from "@/hooks/use-categories";
import { useDiscoveryFeed } from "@/hooks/use-discovery-feed";
import { useAppSession } from "@/providers/app-session-provider";
import { tokens } from "@/theme/tokens";

export default function DiscoverScreen() {
  const router = useRouter();
  const { selectedLocation } = useAppSession();
  const [selectedCategory, setSelectedCategory] = useState("all");
  const categories = useCategories();
  const discovery = useDiscoveryFeed(selectedLocation, selectedCategory);

  return (
    <AppScrollScreen
      header={
        <View style={{ gap: tokens.spacing.md }}>
          <SurfaceCard>
            <View style={{ gap: 14 }}>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                }}
              >
                <View style={{ flex: 1, gap: 4 }}>
                  <Text
                    style={{
                      color: tokens.colors.text,
                      fontSize: 22,
                      fontWeight: "800",
                    }}
                  >
                    Bugün nereyi keşfetmek istersin?
                  </Text>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <MapPin color={tokens.colors.primarySoft} size={15} />
                    <Text
                      selectable
                      style={{
                        color: tokens.colors.textMuted,
                        fontSize: 14,
                      }}
                    >
                      {selectedLocation?.label ?? "Konum seçilmedi"}
                    </Text>
                  </View>
                </View>
                <Pressable
                  onPress={() => router.push("/(onboarding)/manual-location")}
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 16,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: tokens.colors.surfaceMuted,
                  }}
                >
                  <Settings2 color={tokens.colors.primary} size={18} />
                </Pressable>
              </View>
              <SearchField
                editable={false}
                onPress={() => router.push("/(tabs)/ara")}
                placeholder="İşletme, kategori veya mahalle ara"
                value=""
              />
            </View>
          </SurfaceCard>
          <View style={{ gap: 10 }}>
            <SectionHeader title="Kategoriler" subtitle="Kategori sonuçları ayrı bir route üzerinden açılır." />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 10, paddingRight: 20 }}
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
        </View>
      }
    >
      <SectionHeader
        title="Yakındaki işletmeler"
        subtitle="Mock mod varsayılan. Gerçek public discovery API geçişi config bayrağı ile açılacak."
      />
      {!selectedLocation ? (
        <EmptyState
          title="Önce konum seç"
          description="Keşif akışını başlatmak için manuel konum seçimine dön."
          action={
            <Button
              onPress={() => router.push("/(onboarding)/manual-location")}
              variant="secondary"
            >
              Konum seç
            </Button>
          }
        />
      ) : null}
      {selectedLocation && discovery.isLoading ? (
        <LoadingState />
      ) : null}
      {selectedLocation && discovery.isError ? (
        <ErrorState
          description={discovery.error ?? "Keşif akışı yüklenemedi."}
          action={<Button onPress={discovery.reload}>Tekrar dene</Button>}
        />
      ) : null}
      {selectedLocation &&
      discovery.isSuccess &&
      discovery.data.businesses.length === 0 ? (
        <EmptyState
          title="Bu bölgede henüz işletme yok"
          description="Başka bir ilçe seçerek empty state senaryosunu da doğrulayabilirsin."
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
      {selectedLocation &&
      discovery.isSuccess &&
      discovery.data.businesses.length > 0
        ? discovery.data.businesses.map((business) => (
            <BusinessCard business={business} key={business.id} />
          ))
        : null}
    </AppScrollScreen>
  );
}
