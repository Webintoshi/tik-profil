import { Image } from "expo-image";
import { ScrollView, View, useWindowDimensions } from "react-native";

import type { CityGuidePlace, KesfetBusiness } from "@/api/kesfet";
import { colors, radii, shadows, spacing } from "@/theme/tokens";
import { useThemeMode } from "@/theme/theme-store";

const temporaryVisuals = [
  "https://images.unsplash.com/photo-1625903995874-9f20c4228964?q=80&w=1200&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1688152787884-6997b7188706?q=80&w=1200&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?q=80&w=1200&auto=format&fit=crop"
];

interface DiscoveryBriefProps {
  cityCoverImage?: string | null;
  places?: CityGuidePlace[];
  businesses?: KesfetBusiness[];
  variant?: "default" | "hero";
}

interface VisualBanner {
  id: string;
  image: string;
  label: string;
}

export function DiscoveryBrief({
  cityCoverImage,
  places = [],
  businesses = [],
  variant = "default"
}: DiscoveryBriefProps) {
  const { width } = useWindowDimensions();
  const { isDark } = useThemeMode();
  const isHero = variant === "hero";
  const bannerWidth = Math.max(280, width - spacing.screen * 2);
  const banners = buildVisualBanners({ cityCoverImage, places, businesses });

  return (
    <View style={{ marginHorizontal: spacing.screen }}>
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        snapToInterval={bannerWidth + spacing.md}
        decelerationRate="fast"
        contentContainerStyle={{ gap: spacing.md }}
      >
        {banners.map((banner, index) => (
          <View
            key={banner.id}
            accessible
            accessibilityLabel={banner.label}
            style={{
              aspectRatio: 2.18,
              backgroundColor: isHero ? (isDark ? colors.surfaceRaised : "rgba(255,255,255,0.16)") : colors.brandSoft,
              borderColor: isHero ? (isDark ? colors.border : "rgba(255,255,255,0.24)") : "transparent",
              borderRadius: radii.xxl,
              borderWidth: isHero ? 1 : 0,
              overflow: "hidden",
              position: "relative",
              width: bannerWidth,
              ...(isHero
                ? { boxShadow: "0 16px 30px rgba(0, 0, 0, 0.18)", elevation: 4 }
                : shadows.card)
            }}
          >
            <Image
              source={{ uri: banner.image }}
              style={{ height: "100%", width: "100%" }}
              contentFit="cover"
              transition={220}
            />
            <View style={{
              backgroundColor: isHero ? (isDark ? colors.brand : colors.onBrand) : colors.brand,
              borderRadius: radii.pill,
              bottom: spacing.md,
              height: 8,
              left: spacing.md,
              position: "absolute",
              width: index === 0 ? 42 : 20
            }} />
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

function buildVisualBanners({
  cityCoverImage,
  places,
  businesses
}: {
  cityCoverImage?: string | null;
  places: CityGuidePlace[];
  businesses: KesfetBusiness[];
}): VisualBanner[] {
  const cityBanners = [
    cityCoverImage ? {
      id: "city-cover",
      image: cityCoverImage,
      label: "Şehir rehberi görsel banner"
    } : null,
    ...places
      .filter((place) => Boolean(place.image))
      .slice(0, 3)
      .map((place) => ({
        id: `place-${place.id}`,
        image: place.image,
        label: `Şehir rehberi görsel banner: ${place.name}`
      }))
  ].filter((banner): banner is VisualBanner => Boolean(banner));

  const campaignBanners = businesses
    .filter((business) => Boolean(business.coverImage || business.logoUrl))
    .slice(0, 4)
    .map((business) => ({
      id: `business-${business.id}`,
      image: business.coverImage || business.logoUrl || temporaryVisuals[0],
      label: `Kampanya görsel banner: ${business.name}`
    }));

  const merged = [...campaignBanners, ...cityBanners];

  if (merged.length >= 3) {
    return merged.slice(0, 6);
  }

  return [
    ...merged,
    ...temporaryVisuals.map((image, index) => ({
      id: `temporary-${index}`,
      image,
      label: "Geçici görsel banner"
    }))
  ].slice(0, 6);
}
