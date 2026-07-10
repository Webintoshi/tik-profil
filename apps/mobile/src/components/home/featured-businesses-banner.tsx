import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { Text, View } from "react-native";

import type { KesfetBusiness } from "@/api/kesfet";
import { AnimatedPressable } from "@/components/common/AnimatedPressable";
import { Icon } from "@/components/common/Icon";
import { colors, radii, shadows, spacing, typography } from "@/theme/tokens";
import { lightImpact, selectionImpact } from "@/utils/haptics";

interface FeaturedBusinessesBannerProps {
  businesses: KesfetBusiness[];
}

export function FeaturedBusinessesBanner({ businesses }: FeaturedBusinessesBannerProps) {
  const router = useRouter();
  const primary = businesses[0];
  const pageCount = Math.min(Math.max(businesses.length, 1), 5);

  function openBusiness(business: KesfetBusiness) {
    lightImpact();
    router.push(`/business/${business.slug}` as never);
  }

  function openExplore() {
    selectionImpact();
    router.push("/explore" as never);
  }

  if (!primary) {
    return null;
  }

  return (
    <View style={{ gap: spacing.md, marginHorizontal: spacing.screen }}>
      <View style={{ alignItems: "center", flexDirection: "row", justifyContent: "space-between" }}>
        <Text style={{ ...typography.label, color: colors.ink }}>
          Öne çıkan işletmeler
        </Text>
        <AnimatedPressable
          accessibilityRole="button"
          onPress={openExplore}
          pressScale={0.94}
          style={({ pressed }) => ({
            alignItems: "center",
            flexDirection: "row",
            gap: 4,
            opacity: pressed ? 0.72 : 1,
            paddingLeft: spacing.sm,
            paddingVertical: spacing.xs
          })}
        >
          <Text style={{ ...typography.tab, color: colors.brand }}>
            Tümünü gör
          </Text>
          <Icon name="chevron" color={colors.brand} size={13} strokeWidth={2.8} />
        </AnimatedPressable>
      </View>

      <AnimatedPressable
        accessibilityRole="button"
        onPress={() => openBusiness(primary)}
        pressScale={0.985}
        style={({ pressed }) => ({
          borderColor: colors.brandSoft,
          borderRadius: radii.xl,
          borderWidth: 1.2,
          opacity: pressed ? 0.94 : 1,
          overflow: "hidden",
          ...shadows.card
        })}
      >
        <View style={{ backgroundColor: colors.brandSoft, height: 214, position: "relative" }}>
          {primary.coverImage || primary.logoUrl ? (
            <Image
              source={{ uri: primary.coverImage ?? primary.logoUrl ?? undefined }}
              style={{ height: "100%", width: "100%" }}
              contentFit="cover"
              transition={220}
            />
          ) : (
            <LinearGradient
              colors={[colors.brandDeep, colors.brand]}
              style={{ alignItems: "center", flex: 1, justifyContent: "center" }}
            >
              <Icon name="store" color={colors.inverseText} size={44} />
            </LinearGradient>
          )}

          <View
            style={{
              backgroundColor: colors.brand,
              borderRadius: radii.pill,
              left: spacing.sm,
              paddingHorizontal: spacing.md,
              paddingVertical: 7,
              position: "absolute",
              top: spacing.sm
            }}
          >
            <Text style={{ ...typography.tab, color: colors.onBrand }}>
              Öne çıkan
            </Text>
          </View>

          <View
            style={{
              alignItems: "center",
              backgroundColor: "rgba(0,0,0,0.46)",
              borderColor: "rgba(255,255,255,0.24)",
              borderRadius: radii.pill,
              borderWidth: 1,
              height: 34,
              justifyContent: "center",
              position: "absolute",
              right: spacing.sm,
              top: spacing.sm,
              width: 34
            }}
          >
            <Icon name="heart" color={colors.inverseText} size={18} strokeWidth={2.5} />
          </View>

          <LinearGradient
            colors={["rgba(0,0,0,0)", "rgba(0,0,0,0.20)", "rgba(0,0,0,0.76)"]}
            locations={[0, 0.42, 1]}
            style={{
              bottom: 0,
              left: 0,
              padding: spacing.md,
              paddingTop: 54,
              position: "absolute",
              right: 0
            }}
          >
            <View style={{ alignItems: "flex-end", flexDirection: "row", gap: spacing.md }}>
              <BusinessLogo uri={primary.logoUrl} />
              <View style={{ flex: 1, gap: 3, paddingBottom: 2 }}>
                <View style={{ alignItems: "center", flexDirection: "row", gap: 6 }}>
                  <Text
                    numberOfLines={1}
                    style={{ ...typography.sectionTitle, color: colors.inverseText, flexShrink: 1, fontSize: 19, lineHeight: 23 }}
                  >
                    {primary.name}
                  </Text>
                  <Icon name="verified" color={colors.brand} size={16} />
                </View>
                <Text numberOfLines={1} style={{ ...typography.small, color: "rgba(255,255,255,0.76)" }}>
                  {businessMeta(primary)}
                </Text>
              </View>
            </View>
          </LinearGradient>
        </View>
      </AnimatedPressable>

      <View style={{ alignItems: "center", flexDirection: "row", gap: 6, justifyContent: "center" }}>
        {Array.from({ length: pageCount }).map((_, index) => (
          <View
            key={`featured-dot-${index}`}
            style={{
              backgroundColor: index === 0 ? colors.brand : colors.brandSoft,
              borderRadius: radii.pill,
              height: 5,
              opacity: index === 0 ? 1 : 0.72,
              width: index === 0 ? 20 : 7
            }}
          />
        ))}
      </View>
    </View>
  );
}

function BusinessLogo({ uri }: { uri: string | null }) {
  return (
    <View
      style={{
        alignItems: "center",
        backgroundColor: colors.surface,
        borderColor: colors.brandHero,
        borderRadius: radii.pill,
        borderWidth: 3,
        height: 70,
        justifyContent: "center",
        overflow: "hidden",
        width: 70
      }}
    >
      {uri ? (
        <Image source={{ uri }} style={{ height: "100%", width: "100%" }} contentFit="cover" />
      ) : (
        <Icon name="store" color={colors.brand} size={28} />
      )}
    </View>
  );
}

function businessMeta(business: KesfetBusiness) {
  return [business.categoryLabel, business.district || business.city].filter(Boolean).join(" · ");
}
