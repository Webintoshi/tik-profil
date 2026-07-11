import * as Location from "expo-location";
import * as React from "react";
import { Pressable, RefreshControl, ScrollView, Text, View, useWindowDimensions } from "react-native";

import {
  fetchCategories,
  fetchCityGuide,
  fetchDiscoveryBusinesses,
  getLocalDiscoveryBootstrap,
  type CityGuideResponse,
  type Coordinates,
  type KesfetBusiness,
  type KesfetCategory
} from "@/api/kesfet";
import { createLatestRequestGuard } from "@/api/request-guard";
import { BusinessCard } from "@/components/business/business-card";
import { EmptyState } from "@/components/business/empty-state";
import { CategoryRail } from "@/components/home/CategoryRail";
import { DiscoveryBrief } from "@/components/home/DiscoveryBrief";
import { FeaturedBusinessesBanner } from "@/components/home/featured-businesses-banner";
import { HomeHeader } from "@/components/home/HomeHeader";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { CategoryGridSkeleton, DenseBusinessListSkeleton, FeaturedBusinessSkeleton } from "@/components/ui/Skeleton";
import { PILOT_CITY, PILOT_DISTRICT } from "@/data/ordu-discovery";
import { useDiscoveryStore } from "@/state/discovery-store";
import { colors, radii, spacing, typography } from "@/theme/tokens";
import { useThemeMode } from "@/theme/theme-store";

const disableLocalBootstrap = process.env.EXPO_PUBLIC_DISABLE_LOCAL_DISCOVERY_BOOTSTRAP === "1";

export default function DiscoverScreen() {
  const { isDark } = useThemeMode();
  const discovery = useDiscoveryStore();
  const { width } = useWindowDimensions();
  const initialDiscovery = React.useMemo(() => disableLocalBootstrap
    ? { businesses: [], categories: [], cityGuide: null }
    : getLocalDiscoveryBootstrap(), []);
  const [businesses, setBusinesses] = React.useState<KesfetBusiness[]>(initialDiscovery.businesses);
  const [categories, setCategories] = React.useState<KesfetCategory[]>(initialDiscovery.categories);
  const [cityGuide, setCityGuide] = React.useState<CityGuideResponse | null>(initialDiscovery.cityGuide);
  const [selectedCategory, setSelectedCategory] = React.useState<string | null>(null);
  const [categoryPage, setCategoryPage] = React.useState(0);
  const [categoryPageCount, setCategoryPageCount] = React.useState(1);
  const [requestedCategoryPage, setRequestedCategoryPage] = React.useState(0);
  const [requestedCategoryPageKey, setRequestedCategoryPageKey] = React.useState(0);
  const [coordinates, setCoordinates] = React.useState<Coordinates | null>(null);
  const [district, setDistrict] = React.useState<string | null>(PILOT_DISTRICT);
  const [isLoading, setIsLoading] = React.useState(disableLocalBootstrap);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [isLocating, setIsLocating] = React.useState(false);
  const requestGuardRef = React.useRef(createLatestRequestGuard());

  const loadDiscovery = React.useCallback(async (refreshing = false) => {
    const requestId = requestGuardRef.current.begin();
    if (refreshing) {
      setIsRefreshing(true);
    }

    try {
      const [categoryResponse, businessResponse, cityGuideResponse] = await Promise.all([
        fetchCategories({ force: refreshing }),
        fetchDiscoveryBusinesses({
          limit: 16,
          city: PILOT_CITY,
          category: selectedCategory,
          coordinates,
          distance: coordinates ? 30 : null
        }, { force: refreshing }),
        fetchCityGuide(PILOT_CITY, { force: refreshing })
      ]);

      if (!requestGuardRef.current.isCurrent(requestId)) return;

      setCategories((current) => refreshing
        ? categoryResponse.categories
        : categoryResponse.categories.length ? categoryResponse.categories : current);
      setBusinesses(businessResponse.businesses);
      setCityGuide((current) => cityGuideResponse ?? current);
    } catch {
      if (!requestGuardRef.current.isCurrent(requestId)) return;
    } finally {
      if (!requestGuardRef.current.isCurrent(requestId)) return;
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [coordinates, selectedCategory]);

  React.useEffect(() => {
    void loadDiscovery();
    return () => requestGuardRef.current.invalidate();
  }, [loadDiscovery]);

  async function requestLocation() {
    setIsLocating(true);

    try {
      const permission = await Location.requestForegroundPermissionsAsync();

      if (permission.status !== "granted") {
        return;
      }

      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const nextCoordinates = {
        lat: position.coords.latitude,
        lng: position.coords.longitude
      };
      setCoordinates(nextCoordinates);

      const [place] = await Location.reverseGeocodeAsync({
        latitude: nextCoordinates.lat,
        longitude: nextCoordinates.lng
      }).catch(() => []);

      const nextAddressLabel = [
        place?.street || place?.name,
        place?.district ?? place?.subregion,
        place?.city ?? place?.region
      ].filter(Boolean).join(", ");

      setDistrict(place?.district ?? place?.subregion ?? null);
      discovery.setSavedAddressLabel(nextAddressLabel || null);
    } catch {
      setDistrict(null);
    } finally {
      setIsLocating(false);
    }
  }

  const handleCategoryPagePress = React.useCallback((page: number) => {
    setCategoryPage(page);
    setRequestedCategoryPage(page);
    setRequestedCategoryPageKey((current) => current + 1);
  }, []);

  const handleCategoryPageCountChange = React.useCallback((count: number) => {
    setCategoryPageCount(count);
    setCategoryPage((current) => Math.min(current, Math.max(0, count - 1)));
  }, []);

  const selectedCategoryLabel = categories.find((category) => category.id === selectedCategory)?.label ?? null;
  const imageBackedBusinesses = businesses.filter((business) => business.coverImage || business.logoUrl);
  const featured = (imageBackedBusinesses.length ? imageBackedBusinesses : businesses).slice(0, 3);
  const nearby = businesses.slice(0, 16);

  return (
    <View style={{ backgroundColor: colors.background, flex: 1 }}>
      <ScrollView
        contentContainerStyle={{ gap: spacing.xl, paddingBottom: spacing.tabBar, paddingTop: 0 }}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => loadDiscovery(true)}
            tintColor={colors.brand}
            colors={[colors.brand]}
          />
        }
        showsVerticalScrollIndicator={false}
        stickyHeaderIndices={[]}
      >
        <View
          style={{
            backgroundColor: isDark ? colors.surfaceRaised : colors.brandHero,
            borderBottomLeftRadius: 34,
            borderBottomRightRadius: 34,
            overflow: "hidden",
            paddingBottom: spacing.xl,
            position: "relative"
          }}
        >
          <View
            style={{
              backgroundColor: isDark ? colors.brandSoft : "rgba(255,255,255,0.10)",
              bottom: -42,
              position: "absolute",
              right: -36,
              top: 70,
              transform: [{ rotate: "-12deg" }],
              width: 132
            }}
          />
          <View
            style={{
              backgroundColor: isDark ? "rgba(255,191,65,0.08)" : "rgba(0,0,0,0.08)",
              bottom: 42,
              position: "absolute",
              right: 58,
              top: 120,
              transform: [{ rotate: "-12deg" }],
              width: 22
            }}
          />
          <HomeHeader
            addressLabel={discovery.savedAddressLabel}
            locating={isLocating}
            onLocationPress={requestLocation}
            variant="hero"
          />
          <DiscoveryBrief
            cityCoverImage={cityGuide?.coverImage}
            places={cityGuide?.places}
            businesses={featured}
            variant="hero"
          />
        </View>

        <View style={{ gap: spacing.md }} testID="home-category-section">
          <SectionHeader
            title="Kategoriler"
            rightSlot={categoryPageCount > 1 ? (
              <CategoryPageNumbers
                activePage={categoryPage}
                totalPages={categoryPageCount}
                onPagePress={handleCategoryPagePress}
              />
            ) : undefined}
            actionLabel={selectedCategory ? "Tümünü göster" : undefined}
            onAction={selectedCategory ? () => setSelectedCategory(null) : undefined}
          />
          {isLoading && !categories.length ? <CategoryGridSkeleton viewportWidth={width} /> : <CategoryRail
            businesses={businesses}
            categories={categories}
            selectedId={selectedCategory}
            onSelect={(category) => setSelectedCategory(category?.id ?? null)}
            requestedPage={requestedCategoryPage}
            requestedPageKey={requestedCategoryPageKey}
            onPageChange={setCategoryPage}
            onPageCountChange={handleCategoryPageCountChange}
          />}
        </View>

        {isLoading ? (
          <FeaturedBusinessSkeleton />
        ) : (
          <FeaturedBusinessesBanner businesses={featured} />
        )}

        <View style={{ gap: spacing.md }} testID="home-business-list-section">
          <SectionHeader
            title={selectedCategoryLabel ? `${selectedCategoryLabel} işletmeleri` : "Ordu işletmeleri"}
            actionLabel={selectedCategory ? "Filtreyi kaldır" : undefined}
            onAction={selectedCategory ? () => setSelectedCategory(null) : undefined}
          />
          {isLoading ? (
            <View style={{ gap: spacing.md, paddingHorizontal: spacing.screen }}>
              <DenseBusinessListSkeleton />
              <DenseBusinessListSkeleton />
              <DenseBusinessListSkeleton />
            </View>
          ) : nearby.length ? (
            <View style={{ gap: spacing.md, paddingHorizontal: spacing.screen }}>
              {nearby.map((business) => (
                <BusinessCard
                  key={business.id}
                  business={business}
                  variant="compact"
                  favorite={discovery.isFavorite(business.slug)}
                  onFavoritePress={discovery.toggleFavorite}
                />
              ))}
            </View>
          ) : (
            <View style={{ paddingHorizontal: spacing.screen }}>
              <EmptyState
                icon="compass"
                title="Ordu için işletme bulunamadı"
                description="Admin panelinden Ordu işletmeleri eklendiğinde bu alan otomatik dolacak."
              />
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

function CategoryPageNumbers({
  activePage,
  onPagePress,
  totalPages
}: {
  activePage: number;
  onPagePress: (page: number) => void;
  totalPages: number;
}) {
  return (
    <View
      accessibilityLabel="Kategori sayfaları"
      style={{ alignItems: "center", flexDirection: "row", gap: spacing.xs }}
    >
      {Array.from({ length: totalPages }, (_, index) => {
        const active = index === activePage;

        return (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            hitSlop={8}
            key={`category-page-control-${index}`}
            onPress={() => onPagePress(index)}
            style={({ pressed }) => ({
              alignItems: "center",
              minWidth: 18,
              opacity: pressed ? 0.72 : 1,
              paddingHorizontal: 2,
              paddingVertical: 2,
              transform: [{ translateY: active ? -1 : 0 }]
            })}
          >
            <Text
              style={{
                ...typography.tab,
                color: active ? colors.ink : colors.mutedStrong,
                fontSize: 12,
                lineHeight: 14
              }}
            >
              {index + 1}
            </Text>
            <View
              style={{
                backgroundColor: active ? colors.brand : colors.brandSoft,
                borderRadius: radii.pill,
                height: active ? 3 : 2,
                marginTop: 3,
                opacity: active ? 1 : 0.45,
                width: active ? 16 : 12
              }}
            />
          </Pressable>
        );
      })}
    </View>
  );
}
