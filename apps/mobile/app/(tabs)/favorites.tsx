import * as React from "react";
import { ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { fetchDiscoveryBusinesses, type KesfetBusiness } from "@/api/kesfet";
import { BusinessCard } from "@/components/business/business-card";
import { EmptyState } from "@/components/business/empty-state";
import { BusinessCardSkeleton } from "@/components/ui/Skeleton";
import { useDiscoveryStore } from "@/state/discovery-store";
import { colors, spacing, typography } from "@/theme/tokens";
import { useThemeMode } from "@/theme/theme-store";

export default function FavoritesScreen() {
  useThemeMode();
  const discovery = useDiscoveryStore();
  const [businesses, setBusinesses] = React.useState<KesfetBusiness[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    fetchDiscoveryBusinesses({ limit: 100 }).then((response) => {
      setBusinesses(response.businesses);
      setIsLoading(false);
    });
  }, []);

  const favorites = businesses.filter((business) => discovery.favoriteSlugs.includes(business.slug));

  return (
    <SafeAreaView edges={["top", "left", "right"]} style={{ backgroundColor: colors.background, flex: 1 }}>
      <ScrollView
        contentContainerStyle={{ gap: spacing.xl, paddingBottom: spacing.tabBar, paddingTop: spacing.lg }}
        showsVerticalScrollIndicator={false}
      >
        {isLoading ? (
          <View style={{ gap: spacing.md, paddingHorizontal: spacing.screen }}>
            <BusinessCardSkeleton compact />
            <BusinessCardSkeleton compact />
          </View>
        ) : favorites.length ? (
          <View style={{ gap: spacing.md, paddingHorizontal: spacing.screen }}>
            <Text style={{ ...typography.label, color: colors.muted }}>
              {favorites.length} kayıtlı işletme
            </Text>
            {favorites.map((business) => (
              <BusinessCard
                key={business.id}
                business={business}
                variant="compact"
                favorite
                onFavoritePress={discovery.toggleFavorite}
              />
            ))}
          </View>
        ) : (
          <View style={{ paddingHorizontal: spacing.screen }}>
            <EmptyState
              icon="heart"
              title="Henüz favorin yok"
              description="Keşfet veya Ara sekmesinde kalp simgesine dokunarak işletmeleri buraya ekleyebilirsin."
            />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
