import { LinearGradient } from "expo-linear-gradient";
import { Pressable, Text, View } from "react-native";

import { Icon } from "@/components/common/Icon";
import { colors, radii, shadows, spacing, typography } from "@/theme/tokens";
import { lightImpact } from "@/utils/haptics";

interface LocationBannerProps {
  city?: string | null;
  loading?: boolean;
  onRequestLocation: () => void;
}

export function LocationBanner({ city, loading = false, onRequestLocation }: LocationBannerProps) {
  return (
    <LinearGradient
      colors={[colors.surface, colors.surfaceRaised]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{
        borderRadius: radii.xxl,
        borderColor: colors.border,
        borderWidth: 1,
        gap: spacing.lg,
        overflow: "hidden",
        padding: spacing.xl,
        ...shadows.card
      }}
    >
      <View style={{
        backgroundColor: colors.brandGlow,
        height: 210,
        position: "absolute",
        right: 28,
        top: -78,
        transform: [{ rotate: "24deg" }],
        width: 58
      }} />
      <View style={{
        backgroundColor: colors.brandTint,
        bottom: -46,
        height: 150,
        position: "absolute",
        right: 98,
        transform: [{ rotate: "24deg" }],
        width: 26
      }} />
      <View style={{ gap: spacing.sm }}>
        <View style={{
          alignItems: "center",
          alignSelf: "flex-start",
          backgroundColor: colors.brandSoft,
          borderRadius: radii.pill,
          flexDirection: "row",
          gap: spacing.xs,
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.xs
        }}>
          <Icon name="location" color={colors.brandDeep} size={15} strokeWidth={2.5} />
          <Text style={{ ...typography.label, color: colors.brandDeep }}>
            {city ? city : "Yakın çevre"}
          </Text>
        </View>

        <Text style={{ ...typography.hero, color: colors.ink }}>
          Yakınındaki işletmeleri keşfet
        </Text>
        <Text style={{ ...typography.body, color: colors.muted }}>
          Kafe, restoran, güzellik, sağlık ve yerel fırsatları tek akışta gör.
        </Text>
      </View>

      <Pressable
        accessibilityRole="button"
        onPress={() => {
          lightImpact();
          onRequestLocation();
        }}
        style={({ pressed }) => ({
          alignItems: "center",
          alignSelf: "flex-start",
          backgroundColor: colors.brand,
          borderRadius: radii.md,
          flexDirection: "row",
          gap: spacing.sm,
          minHeight: 48,
          opacity: pressed ? 0.9 : 1,
          paddingHorizontal: spacing.lg
        })}
      >
        <Icon name="mapPin" color={colors.onBrand} size={18} />
        <Text style={{ ...typography.button, color: colors.onBrand }}>
          {loading ? "Konum alınıyor" : "Konumunu kullan"}
        </Text>
      </Pressable>
    </LinearGradient>
  );
}
