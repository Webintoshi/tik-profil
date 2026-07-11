import { FlashList } from "@shopify/flash-list";
import { useRouter } from "expo-router";
import * as React from "react";
import { Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { fetchDiscoveryBusinesses, type KesfetBusiness } from "@/api/kesfet";
import { resolveBusinessCategory } from "@/business/category-catalog";
import { BusinessCard } from "@/components/business/business-card";
import { EmptyState } from "@/components/business/empty-state";
import { AnimatedPressable } from "@/components/common/AnimatedPressable";
import { BusinessCardSkeleton } from "@/components/ui/Skeleton";
import { buildFavoritesListModel, type FavoritesListItem } from "@/favorites/favorites-state";
import { useDiscoveryStore } from "@/state/discovery-store";
import { colors, interaction, radii, spacing, typography } from "@/theme/tokens";
import { useThemeMode } from "@/theme/theme-store";

export default function FavoritesScreen() {
  useThemeMode();
  const router = useRouter();
  const discovery = useDiscoveryStore();
  const [businesses, setBusinesses] = React.useState<KesfetBusiness[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  const loadFavorites = React.useCallback(async () => {
    setError(null);
    setIsLoading(true);
    try {
      const response = await fetchDiscoveryBusinesses({ limit: 100 });
      setBusinesses(response.businesses);
    } catch {
      setError("Favoriler y\u00fcklenemedi. Ba\u011flant\u0131n\u0131 kontrol edip yeniden dene.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void loadFavorites();
  }, [loadFavorites]);

  const model = React.useMemo(() => buildFavoritesListModel(
    businesses,
    discovery.favoriteSlugs,
    (business) => resolveBusinessCategory(business.category, business.categoryLabel, business.industryId).label
  ), [businesses, discovery.favoriteSlugs]);

  return (
    <SafeAreaView edges={["top", "left", "right"]} style={{ backgroundColor: colors.background, flex: 1 }}>
      <View style={{ gap: spacing.xs, paddingHorizontal: spacing.screen, paddingTop: spacing.lg }}>
        <Text style={{ ...typography.title, color: colors.ink }} testID="favorites-title">Favoriler</Text>
        <Text style={{ ...typography.body, color: colors.muted }} testID="favorites-count">
          {isLoading ? "Kay\u0131tl\u0131 i\u015fletmeler y\u00fckleniyor" : `${model.favoriteCount} kay\u0131tl\u0131 i\u015fletme`}
        </Text>
      </View>

      {isLoading ? (
        <View style={{ gap: spacing.md, paddingHorizontal: spacing.screen, paddingTop: spacing.xl }}>
          <BusinessCardSkeleton compact />
          <BusinessCardSkeleton compact />
        </View>
      ) : error ? (
        <View
          accessibilityRole="alert"
          style={{
            alignItems: "center",
            backgroundColor: colors.surface,
            borderColor: colors.border,
            borderRadius: radii.md,
            borderWidth: 1,
            flexDirection: "row",
            gap: spacing.md,
            margin: spacing.screen,
            paddingHorizontal: spacing.md
          }}
        >
          <Text style={{ ...typography.body, color: colors.danger, flex: 1, paddingVertical: spacing.md }}>{error}</Text>
          <AnimatedPressable
            accessibilityLabel="Favorileri tekrar yükle"
            accessibilityRole="button"
            onPress={loadFavorites}
            style={{ justifyContent: "center", minHeight: interaction.minTouchTarget }}
            testID="favorites-retry"
          >
            <Text style={{ ...typography.button, color: colors.brandDeep }}>Tekrar dene</Text>
          </AnimatedPressable>
        </View>
      ) : (
        <FlashList
          contentContainerStyle={{ paddingBottom: spacing.tabBar, paddingHorizontal: spacing.screen, paddingTop: spacing.xl }}
          data={model.items}
          getItemType={(item) => item.kind}
          ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
          keyExtractor={(item) => item.key}
          renderItem={({ item }) => (
            <FavoriteListRow
              item={item}
              onExplore={() => router.navigate("/explore" as never)}
              onFavoritePress={discovery.toggleFavorite}
            />
          )}
          showsVerticalScrollIndicator={false}
          testID="favorites-list"
        />
      )}
    </SafeAreaView>
  );
}

function FavoriteListRow({
  item,
  onExplore,
  onFavoritePress
}: {
  item: FavoritesListItem<KesfetBusiness>;
  onExplore: () => void;
  onFavoritePress: (business: KesfetBusiness) => void;
}) {
  if (item.kind === "group-heading") {
    return (
      <View style={{ alignItems: "baseline", flexDirection: "row", gap: spacing.sm, paddingTop: spacing.sm }}>
        <Text style={{ ...typography.sectionTitle, color: colors.ink, flex: 1 }}>{item.label}</Text>
        <Text style={{ ...typography.label, color: colors.muted }}>{item.count} işletme</Text>
      </View>
    );
  }
  if (item.kind === "recommendation-heading") {
    return (
      <View style={{ gap: spacing.xs, paddingTop: spacing.lg }}>
        <Text style={{ ...typography.sectionTitle, color: colors.ink }}>Keşfetmeye devam et</Text>
        <Text style={{ ...typography.body, color: colors.muted }}>Ordu'dan seçili işletmeler</Text>
      </View>
    );
  }
  if (item.kind === "empty") {
    return (
      <EmptyState
        actionLabel="Keşfet"
        description="Ana Sayfa veya Keşfet sekmesindeki kalp simgesiyle işletmeleri buraya ekleyebilirsin."
        icon="heart"
        onAction={onExplore}
        title="Henüz favorin yok"
        variant="inline"
      />
    );
  }
  return (
    <BusinessCard
      business={item.business}
      favorite={item.kind === "favorite"}
      onFavoritePress={onFavoritePress}
      variant="compact"
    />
  );
}
