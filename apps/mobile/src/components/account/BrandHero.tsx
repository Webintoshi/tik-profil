import { Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Circle, Path } from "react-native-svg";

import { Icon } from "@/components/common/Icon";
import { colors, radii, shadows, spacing, typography } from "@/theme/tokens";

function LocalPattern() {
  return (
    <Svg width="100%" height="100%" viewBox="0 0 360 170" style={{ opacity: 0.62, position: "absolute", top: 128 }}>
      <Path d="M-20 130 C 45 90, 85 158, 150 108 S 260 74, 388 108" fill="none" stroke="rgba(255,255,255,0.14)" strokeWidth="12" />
      <Path d="M-15 116 C 45 78, 95 140, 150 96 S 260 58, 390 94" fill="none" stroke="rgba(255,255,255,0.24)" strokeWidth="2" />
      <Circle cx="74" cy="75" r="5" fill="rgba(255,255,255,0.18)" />
      <Circle cx="236" cy="56" r="5" fill="rgba(255,255,255,0.16)" />
      <Circle cx="286" cy="116" r="5" fill="rgba(255,255,255,0.16)" />
    </Svg>
  );
}

export function BrandHero() {
  return (
    <LinearGradient
      colors={[colors.navy, "#0C315E"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{
        borderBottomLeftRadius: radii.xl,
        borderBottomRightRadius: radii.xl,
        minHeight: 228,
        overflow: "hidden",
        paddingBottom: spacing.xxl,
        paddingHorizontal: spacing.xl,
        paddingTop: 58
      }}
    >
      <LocalPattern />
      <View style={{
        alignItems: "center",
        alignSelf: "flex-start",
        backgroundColor: colors.accent,
        borderRadius: 24,
        height: 54,
        justifyContent: "center",
        marginBottom: spacing.lg,
        transform: [{ rotate: "-8deg" }],
        width: 54,
        ...shadows.soft
      }}>
        <Icon name="mapPin" color={colors.navy} size={30} strokeWidth={2.7} />
      </View>
      <Text style={{
        ...typography.title,
        color: colors.surface,
        marginBottom: spacing.sm
      }}>
        Tık Profil
      </Text>
      <Text style={{
        ...typography.body,
        color: "rgba(255,255,255,0.88)",
        maxWidth: 310
      }}>
        Yakınındaki işletmeleri, fırsatları ve QR profilleri tek yerde keşfet.
      </Text>
    </LinearGradient>
  );
}
