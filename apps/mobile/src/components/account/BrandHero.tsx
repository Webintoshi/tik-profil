import { LinearGradient } from "expo-linear-gradient";
import { Text, View } from "react-native";

import { Icon } from "@/components/common/Icon";
import { colors, radii, shadows, spacing, typography } from "@/theme/tokens";

export function BrandHero() {
  return (
    <LinearGradient
      colors={[colors.background, colors.backgroundAlt]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{
        borderBottomLeftRadius: radii.xxl,
        borderBottomRightRadius: radii.xxl,
        minHeight: 232,
        overflow: "hidden",
        paddingBottom: spacing.xxl,
        paddingHorizontal: spacing.xl,
        paddingTop: 58
      }}
    >
      <View style={{
        backgroundColor: colors.brandGlow,
        borderRadius: 120,
        height: 190,
        position: "absolute",
        right: -80,
        top: -70,
        width: 190
      }} />
      <View style={{
        backgroundColor: colors.brandTint,
        borderRadius: 90,
        bottom: -50,
        height: 150,
        left: -62,
        position: "absolute",
        width: 150
      }} />
      <View style={{
        alignItems: "center",
        alignSelf: "flex-start",
        backgroundColor: colors.brand,
        borderRadius: 24,
        height: 54,
        justifyContent: "center",
        marginBottom: spacing.lg,
        transform: [{ rotate: "-8deg" }],
        width: 54,
        ...shadows.soft
      }}>
        <Icon name="tikMark" color={colors.onBrand} size={32} strokeWidth={2.7} />
      </View>
      <Text style={{
        ...typography.hero,
        color: colors.brandDeep,
        marginBottom: spacing.sm
      }}>
        Tık Profil
      </Text>
      <Text style={{
        ...typography.body,
        color: colors.muted,
        maxWidth: 318
      }}>
        Yakınındaki işletmeleri, fırsatları ve QR profilleri tek yerde keşfet.
      </Text>
    </LinearGradient>
  );
}
