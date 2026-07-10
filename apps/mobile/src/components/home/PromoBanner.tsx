import { LinearGradient } from "expo-linear-gradient";
import { Pressable, Text, View } from "react-native";

import { Icon } from "@/components/common/Icon";
import { colors, radii, shadows, spacing, typography } from "@/theme/tokens";
import { lightImpact } from "@/utils/haptics";

interface PromoBannerProps {
  onPress?: () => void;
}

export function PromoBanner({ onPress }: PromoBannerProps) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => {
        lightImpact();
        onPress?.();
      }}
      style={({ pressed }) => ({ marginHorizontal: spacing.screen, opacity: pressed ? 0.94 : 1 })}
    >
      <LinearGradient
        colors={[colors.surface, colors.surfaceRaised]}
        end={{ x: 1, y: 1 }}
        start={{ x: 0, y: 0 }}
        style={{
          borderRadius: radii.xl,
          borderColor: colors.border,
          borderWidth: 1,
          gap: spacing.sm,
          overflow: "hidden",
          padding: spacing.lg,
          ...shadows.soft
        }}
      >
        <View style={{
          backgroundColor: colors.brandGlow,
          height: 180,
          position: "absolute",
          right: 22,
          top: -62,
          transform: [{ rotate: "24deg" }],
          width: 54
        }} />
        <View style={{
          backgroundColor: colors.brandTint,
          bottom: -28,
          height: 120,
          position: "absolute",
          right: 82,
          transform: [{ rotate: "24deg" }],
          width: 22
        }} />
        <View style={{ alignItems: "center", flexDirection: "row", gap: spacing.sm }}>
          <View style={{
            alignItems: "center",
            backgroundColor: colors.accent,
            borderRadius: radii.lg,
            height: 40,
            justifyContent: "center",
            width: 40
          }}>
            <Icon name="ticket" color={colors.onAccent} size={20} />
          </View>
          <Text style={{ ...typography.label, color: colors.brandDeep }}>Yakınındaki fırsatlar</Text>
        </View>
        <Text style={{ ...typography.sectionTitle, color: colors.ink, maxWidth: "78%" }}>
          QR ile hızlı erişim
        </Text>
        <Text style={{ ...typography.body, color: colors.muted, maxWidth: "82%" }}>
          Menü, kampanya ve iletişim bilgisi aynı profil kartında.
        </Text>
      </LinearGradient>
    </Pressable>
  );
}
