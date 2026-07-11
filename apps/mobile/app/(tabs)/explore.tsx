import * as React from "react";
import { Image } from "expo-image";
import { RefreshControl, ScrollView, Text, View, useWindowDimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useReducedMotion } from "@/accessibility/use-reduced-motion";
import {
  fetchCityGuide,
  fetchDiscoveryBusinesses,
  getLocalDiscoveryBootstrap,
  type CityGuidePlace,
  type CityGuideResponse,
  type KesfetBusiness
} from "@/api/kesfet";
import { BusinessCard } from "@/components/business/business-card";
import { EmptyState } from "@/components/business/empty-state";
import { Icon } from "@/components/common/Icon";
import { BusinessCardSkeleton, CityHeroImageSkeleton, Skeleton } from "@/components/ui/Skeleton";
import { PILOT_CITY } from "@/data/ordu-discovery";
import { createLatestExploreRequestGuard } from "@/explore/explore-city";
import { getExplorePresentation } from "@/explore/explore-presentation";
import { useDiscoveryStore } from "@/state/discovery-store";
import { colors, radii, shadows, spacing, typography } from "@/theme/tokens";
import { useThemeMode } from "@/theme/theme-store";

export default function ExploreScreen() {
  useThemeMode();
  const reducedMotion = useReducedMotion();
  const discovery = useDiscoveryStore();
  const initialDiscovery = React.useMemo(() => getLocalDiscoveryBootstrap(), []);
  const [cityGuide, setCityGuide] = React.useState<CityGuideResponse | null>(initialDiscovery.cityGuide);
  const [businesses, setBusinesses] = React.useState<KesfetBusiness[]>(initialDiscovery.businesses);
  const [isLoading, setIsLoading] = React.useState(false);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const requestGuardRef = React.useRef(createLatestExploreRequestGuard());
  const hasExploreDataRef = React.useRef(true);

  const cityName = PILOT_CITY;

  const loadExplore = React.useCallback(async (refreshing = false) => {
    const requestId = requestGuardRef.current.begin();
    if (refreshing) {
      setIsRefreshing(true);
    } else if (!hasExploreDataRef.current) {
      setIsLoading(true);
    }

    try {
      const [guideResponse, businessResponse] = await Promise.all([
        fetchCityGuide(cityName, { force: refreshing }),
        fetchDiscoveryBusinesses({ city: cityName, limit: 16 }, { force: refreshing })
      ]);

      if (!requestGuardRef.current.isCurrent(requestId)) {
        return;
      }
      setCityGuide(guideResponse);
      setBusinesses(businessResponse.businesses);
      hasExploreDataRef.current = Boolean(guideResponse || businessResponse.businesses.length);
    } catch {
      if (!requestGuardRef.current.isCurrent(requestId)) {
        return;
      }
      // Keep the last successful city data visible during transient failures.
    } finally {
      if (!requestGuardRef.current.isCurrent(requestId)) {
        return;
      }
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [cityName]);

  React.useEffect(() => {
    void loadExplore();
    return () => requestGuardRef.current.invalidate();
  }, [loadExplore]);

  const guidePlaces = cityGuide?.places ?? [];
  const foodBusinesses = React.useMemo(
    () => businesses.filter((business) => isFoodBusiness(business)).slice(0, 8),
    [businesses]
  );
  const featuredBusinesses = React.useMemo(() => {
    const localBusinesses = businesses.filter((business) => !isFoodBusiness(business));
    const withImages = localBusinesses.filter((business) => business.coverImage || business.logoUrl);
    return (withImages.length ? withImages : localBusinesses).slice(0, 6);
  }, [businesses]);
  const presentation = getExplorePresentation({
    businessCount: featuredBusinesses.length,
    foodCount: foodBusinesses.length,
    guidePlaceCount: guidePlaces.length,
    hasGuide: Boolean(cityGuide)
  });

  return (
    <SafeAreaView
      accessibilityLabel={`${cityName} keşfet`}
      edges={["top", "left", "right"]}
      style={{ backgroundColor: colors.background, flex: 1 }}
    >
      <ScrollView
        contentContainerStyle={{ gap: spacing.xl, paddingBottom: spacing.tabBar, paddingTop: spacing.lg }}
        refreshControl={
          <RefreshControl
            colors={[colors.brand]}
            onRefresh={() => loadExplore(true)}
            refreshing={isRefreshing}
            tintColor={colors.brand}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={{ gap: spacing.xs, paddingHorizontal: spacing.screen }}>
          <Text style={{ ...typography.title, color: colors.ink }} testID="explore-title">Keşfet</Text>
          <Text style={{ ...typography.body, color: colors.muted }} testID="explore-subtitle">
            {cityName} için şehir rehberleri, yeme içme önerileri ve yerel profiller.
          </Text>
        </View>

        {isLoading ? (
          <CityHeroSkeleton />
        ) : cityGuide ? (
          <CityHero guide={cityGuide} reducedMotion={reducedMotion} />
        ) : !presentation.combinedSparse ? (
          <View style={{ paddingHorizontal: spacing.screen }}>
            <EmptyState
              description={`${cityName} için rehber içeriği eklendiğinde burada görünecek.`}
              icon="compass"
              title="Şehir rehberi hazırlanıyor"
              variant="inline"
            />
          </View>
        ) : null}

        {presentation.combinedSparse ? (
          <View style={{ paddingHorizontal: spacing.screen }}>
            <EmptyState
              description={`${cityName} için yeni rehber ve işletme seçkileri hazırlanıyor.`}
              icon="compass"
              title="Keşif seçkisi hazırlanıyor"
              variant="inline"
            />
          </View>
        ) : null}

        {!presentation.combinedSparse && presentation.guideState !== "missing-guide" ? (
          <GuideSection
            isLoading={isLoading}
            places={guidePlaces}
            reducedMotion={reducedMotion}
            title="Şehir rehberleri"
            subtitle="Gezilecek yerler, rotalar ve yerel öneriler"
          />
        ) : null}

        {isLoading || presentation.businessState === "food-only" || presentation.businessState === "populated" ? <View style={{ gap: spacing.md }}>
          <SectionTitle
            title="Ne nerede yenir?"
            subtitle={`${cityName} içinde öne çıkan yeme içme profilleri`}
          />
          {isLoading ? (
            <HorizontalSkeletonRow />
          ) : foodBusinesses.length ? (
            <ScrollView
              contentContainerStyle={{ gap: spacing.md, paddingHorizontal: spacing.screen }}
              horizontal
              showsHorizontalScrollIndicator={false}
            >
              {foodBusinesses.map((business) => (
                <BusinessCard
                  business={business}
                  key={business.id}
                  variant="horizontal"
                />
              ))}
            </ScrollView>
          ) : null}
        </View> : null}

        {!presentation.combinedSparse ? <View style={{ gap: spacing.md }}>
          <SectionTitle
            title="Yerel profiller"
            subtitle="Rehber içeriğiyle bağlantılı işletme profilleri"
          />
          {isLoading ? (
            <View style={{ gap: spacing.md, paddingHorizontal: spacing.screen }}>
              <BusinessCardSkeleton compact />
              <BusinessCardSkeleton compact />
            </View>
          ) : featuredBusinesses.length ? (
            <View style={{ gap: spacing.md, paddingHorizontal: spacing.screen }}>
              {featuredBusinesses.map((business) => (
                <BusinessCard
                  business={business}
                  favorite={discovery.isFavorite(business.slug)}
                  key={business.id}
                  onFavoritePress={discovery.toggleFavorite}
                  variant="compact"
                />
              ))}
            </View>
          ) : (
            <View style={{ paddingHorizontal: spacing.screen }}>
              <EmptyState
                description="Yerel profiller eklendiğinde keşfet akışı burada zenginleşecek."
                icon="store"
                title="Profil bekleniyor"
                variant="inline"
              />
            </View>
          )}
        </View> : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function CityHero({ guide, reducedMotion }: { guide: CityGuideResponse; reducedMotion: boolean }) {
  return (
    <View
      testID="city-hero-loaded"
      style={{
        backgroundColor: colors.surface,
        borderColor: colors.border,
        borderRadius: radii.xxl,
        borderWidth: 1,
        marginHorizontal: spacing.screen,
        overflow: "hidden"
      }}
    >
      {getCityCoverImage(guide.coverImage) ? (
        <Image
          contentFit="cover"
          source={{ uri: getCityCoverImage(guide.coverImage) }}
          style={{ aspectRatio: 1.95, width: "100%" }}
          transition={reducedMotion ? 0 : 180}
        />
      ) : (
        <View
          style={{
            alignItems: "center",
            aspectRatio: 1.95,
            backgroundColor: colors.brandSoft,
            justifyContent: "center",
            width: "100%"
          }}
        >
          <Icon name="compass" color={colors.brandDeep} size={40} />
        </View>
      )}

      <View style={{ gap: spacing.sm, padding: spacing.lg }}>
        <View style={{ alignItems: "center", flexDirection: "row", gap: spacing.sm }}>
          <View
            style={{
              alignItems: "center",
              backgroundColor: colors.brandSoft,
              borderRadius: radii.pill,
              flexDirection: "row",
              gap: 6,
              paddingHorizontal: spacing.md,
              paddingVertical: spacing.sm
            }}
          >
            <Icon name="mapPin" color={colors.brandDeep} size={15} strokeWidth={2.5} />
            <Text style={{ ...typography.small, color: colors.brandDeep }}>Şehir rehberi</Text>
          </View>
          {guide.plate ? (
            <Text style={{ ...typography.small, color: colors.muted }}>#{guide.plate}</Text>
          ) : null}
        </View>

        <Text style={{ ...typography.title, color: colors.ink }}>{cleanText(guide.name)}</Text>
        {guide.tagline ? (
          <Text style={{ ...typography.body, color: colors.inkSoft }}>{cleanText(guide.tagline)}</Text>
        ) : null}
        {guide.description ? (
          <Text style={{ ...typography.small, color: colors.muted }}>
            {cleanText(guide.description)}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

function GuideSection({
  isLoading,
  places,
  reducedMotion,
  subtitle,
  title
}: {
  isLoading: boolean;
  places: CityGuidePlace[];
  reducedMotion: boolean;
  subtitle: string;
  title: string;
}) {
  return (
    <View style={{ gap: spacing.md }} testID="explore-guide-section">
      <SectionTitle title={title} subtitle={subtitle} />
      {isLoading ? (
        <HorizontalSkeletonRow />
      ) : places.length ? (
        <ScrollView
          contentContainerStyle={{ gap: spacing.md, paddingHorizontal: spacing.screen }}
          horizontal
          showsHorizontalScrollIndicator={false}
        >
          {places.map((place, index) => (
            <GuideCard index={index} key={place.id} place={place} reducedMotion={reducedMotion} />
          ))}
        </ScrollView>
      ) : (
        <View style={{ paddingHorizontal: spacing.screen }}>
          <EmptyState
            description="Şehir rehberi içerikleri yayına alındığında bu bölüm dolacak."
            icon="compass"
            title="Rehber içeriği bekleniyor"
            variant="inline"
          />
        </View>
      )}
    </View>
  );
}

function GuideCard({ index, place, reducedMotion }: { index: number; place: CityGuidePlace; reducedMotion: boolean }) {
  const category = cleanText(place.category);
  const name = cleanText(place.name);

  return (
    <View
      accessible
      accessibilityLabel={`${category}: ${name}`}
      style={{
        backgroundColor: colors.surface,
        borderColor: colors.border,
        borderRadius: radii.xl,
        borderWidth: 1,
        overflow: "hidden",
        width: 188,
        ...shadows.card
      }}
    >
      <Image
        contentFit="cover"
        source={{ uri: getGuideImage(place, index) }}
        style={{ aspectRatio: 1.1, width: "100%" }}
        transition={reducedMotion ? 0 : 180}
      />
      <View style={{ gap: spacing.xs, padding: spacing.md }}>
        <View
          style={{
            alignSelf: "flex-start",
            backgroundColor: colors.brandSoft,
            borderRadius: radii.pill,
            paddingHorizontal: spacing.sm,
            paddingVertical: 5
          }}
        >
          <Text numberOfLines={1} style={{ ...typography.small, color: colors.brandDeep }}>
            {category}
          </Text>
        </View>
        <Text numberOfLines={3} style={{ ...typography.cardTitle, color: colors.ink }}>
          {name}
        </Text>
      </View>
    </View>
  );
}

function SectionTitle({ subtitle, title }: { subtitle: string; title: string }) {
  return (
    <View style={{ gap: 2, paddingHorizontal: spacing.screen }}>
      <Text style={{ ...typography.sectionTitle, color: colors.ink }}>{title}</Text>
      <Text style={{ ...typography.small, color: colors.muted }}>{subtitle}</Text>
    </View>
  );
}

function CityHeroSkeleton() {
  const { width } = useWindowDimensions();
  return (
    <View
      style={{
        backgroundColor: colors.surface,
        borderColor: colors.border,
        borderRadius: radii.xxl,
        borderWidth: 1,
        marginHorizontal: spacing.screen,
        overflow: "hidden"
      }}
    >
      <CityHeroImageSkeleton contentWidth={width - spacing.screen * 2 - 2} />
      <View style={{ gap: spacing.sm, padding: spacing.lg }}>
        <Skeleton height={28} width="38%" />
        <Skeleton height={22} width="70%" />
        <Skeleton height={14} width="88%" />
      </View>
    </View>
  );
}

function HorizontalSkeletonRow() {
  const { width } = useWindowDimensions();
  return (
    <ScrollView
      contentContainerStyle={{ gap: spacing.md, paddingHorizontal: spacing.screen }}
      horizontal
      showsHorizontalScrollIndicator={false}
    >
      {[0, 1].map((item) => (
        <View
          key={item}
          style={{
            backgroundColor: colors.surface,
            borderColor: colors.border,
            borderRadius: radii.xl,
            borderWidth: 1,
            overflow: "hidden",
            width: Math.min(220, width * 0.48)
          }}
        >
          <Skeleton borderRadius={0} height={150} width="100%" />
          <View style={{ gap: spacing.sm, padding: spacing.md }}>
            <Skeleton height={16} width="52%" />
            <Skeleton height={20} width="80%" />
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

function isFoodBusiness(business: KesfetBusiness) {
  const haystack = `${business.category} ${business.categoryLabel} ${business.name}`.toLocaleLowerCase("tr-TR");
  return ["restoran", "fast", "food", "burger", "kahve", "kafe", "yeme"].some((term) => haystack.includes(term));
}

const cityCoverFallback = "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?q=80&w=1200&auto=format&fit=crop";

const guideImageFallbacks = [
  "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?q=80&w=900&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1509042239860-f550ce710b93?q=80&w=900&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?q=80&w=900&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?q=80&w=900&auto=format&fit=crop"
];

function getCityCoverImage(image?: string | null) {
  if (!image || image.includes("1625903995874")) {
    return cityCoverFallback;
  }
  return image;
}

function getGuideImage(place: CityGuidePlace, index: number) {
  const image = place.image;
  const knownBlankImages = ["1688152787884", "1629833596856", "1596394516093", "1587595431973"];
  if (!image || knownBlankImages.some((marker) => image.includes(marker))) {
    return guideImageFallbacks[index % guideImageFallbacks.length];
  }
  return image;
}

function cleanText(value: string) {
  return value
    .replace(/\u00C5\u009F/g, "ş")
    .replace(/\u00C5\u0178/g, "ş")
    .replace(/\u00C5\u009E/g, "Ş")
    .replace(/\u00C5\u017D/g, "Ş")
    .replace(/\u00C4\u009F/g, "ğ")
    .replace(/\u00C4\u0178/g, "ğ")
    .replace(/\u00C4\u009E/g, "Ğ")
    .replace(/\u00C4\u017D/g, "Ğ")
    .replace(/\u00C4\u00B1/g, "ı")
    .replace(/\u00C4\u00B0/g, "İ")
    .replace(/\u00C3\u00BC/g, "ü")
    .replace(/\u00C3\u009C/g, "Ü")
    .replace(/\u00C3\u00B6/g, "ö")
    .replace(/\u00C3\u0096/g, "Ö")
    .replace(/\u00C3\u00A7/g, "ç")
    .replace(/\u00C3\u0087/g, "Ç");
}
