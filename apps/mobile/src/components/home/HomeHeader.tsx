import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Icon } from "@/components/common/Icon";
import { colors, fontFamily, radii, shadows, spacing, typography } from "@/theme/tokens";
import { useThemeMode } from "@/theme/theme-store";
import { selectionImpact } from "@/utils/haptics";

interface HomeHeaderProps {
  addressLabel?: string | null;
  onLocationPress?: () => void;
  locating?: boolean;
  variant?: "default" | "hero";
}

export function HomeHeader({ addressLabel, variant = "default" }: HomeHeaderProps) {
  const insets = useSafeAreaInsets();
  const { isDark } = useThemeMode();
  const isHero = variant === "hero";
  const isSoftHero = isHero && colors.brandHero === "#FFD9E6";
  const heroTextColor = isDark ? colors.ink : (isSoftHero ? colors.ink : colors.onBrand);
  const heroMutedColor = isDark ? colors.mutedStrong : (isSoftHero ? colors.mutedStrong : "rgba(255,255,255,0.78)");
  const heroIconColor = isDark ? colors.brand : (isSoftHero ? colors.brand : colors.onBrand);
  const heroGlassBg = isDark ? colors.surfaceRaised : (isSoftHero ? "rgba(255,255,255,0.46)" : "rgba(255,255,255,0.16)");
  const heroGlassInnerBg = isDark ? colors.brandSoft : (isSoftHero ? "rgba(255,255,255,0.64)" : "rgba(255,255,255,0.18)");
  const heroGlassBorder = isDark ? colors.border : (isSoftHero ? "rgba(238,6,80,0.16)" : "rgba(255,255,255,0.28)");
  const heroNotificationBg = isDark ? colors.surface : (isSoftHero ? "rgba(255,255,255,0.76)" : "rgba(255,255,255,0.94)");
  const heroNotificationBorder = isDark ? colors.border : (isSoftHero ? "rgba(238,6,80,0.12)" : "rgba(255,255,255,0.26)");
  const title = addressLabel?.trim() || "Ordu'yu keşfet";

  return (
    <View style={{ backgroundColor: isHero ? "transparent" : colors.background, paddingTop: insets.top }}>
      <View
        style={{
          alignItems: "center",
          flexDirection: "row",
          gap: spacing.md,
          minHeight: 74,
          paddingBottom: spacing.md,
          paddingHorizontal: spacing.screen,
          paddingTop: spacing.sm
        }}
      >
        <View
          style={{
            alignItems: "center",
            backgroundColor: isHero ? heroGlassBg : colors.surface,
            borderColor: isHero ? heroGlassBorder : colors.border,
            borderRadius: radii.pill,
            borderWidth: 1,
            height: 42,
            justifyContent: "center",
            overflow: "hidden",
            width: 42,
            ...shadows.soft
          }}
        >
          <View
            style={{
              alignItems: "center",
              backgroundColor: isHero ? heroGlassInnerBg : colors.brandSoft,
              borderRadius: radii.pill,
              height: 34,
              justifyContent: "center",
              width: 34
            }}
          >
            <Icon name="profile" color={isHero ? heroIconColor : colors.brand} size={18} strokeWidth={2.5} />
          </View>
        </View>

        <View style={{ flex: 1, gap: 1, minWidth: 0 }}>
          <Text style={{ ...typography.small, color: isHero ? heroMutedColor : colors.muted }}>
            Merhaba 👋
          </Text>
          <Text
            numberOfLines={1}
            style={{
              ...typography.label,
              color: isHero ? heroTextColor : colors.ink,
              fontSize: 15,
              lineHeight: 20
            }}
          >
            {title}
          </Text>
        </View>

        <Pressable
          accessibilityLabel="Bildirimler"
          accessibilityRole="button"
          onPress={selectionImpact}
          style={({ pressed }) => ({
            alignItems: "center",
            backgroundColor: isHero ? heroNotificationBg : colors.surface,
            borderColor: isHero ? heroNotificationBorder : colors.border,
            borderRadius: radii.lg,
            borderWidth: 1,
            height: 44,
            justifyContent: "center",
            opacity: pressed ? 0.88 : 1,
            width: 44,
            ...shadows.soft
          })}
        >
          <Icon name="bell" color={isHero ? (isDark ? colors.ink : colors.brandDeep) : colors.ink} size={20} strokeWidth={2.25} />
          <View
            style={{
              alignItems: "center",
              backgroundColor: colors.brand,
              borderColor: isHero ? (isDark ? colors.surface : "rgba(255,255,255,0.94)") : colors.surface,
              borderRadius: radii.pill,
              borderWidth: 2,
              height: 17,
              justifyContent: "center",
              position: "absolute",
              right: 5,
              top: 4,
              width: 17
            }}
          >
            <Text style={{ color: colors.onBrand, fontFamily: fontFamily.extrabold, fontSize: 9, lineHeight: 11 }}>2</Text>
          </View>
        </Pressable>
      </View>
    </View>
  );
}
