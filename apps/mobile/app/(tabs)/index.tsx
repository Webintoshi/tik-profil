import { SafeAreaView, Text, View } from "react-native";

import { Icon } from "@/components/common/Icon";
import { colors, radii, spacing, typography } from "@/theme/tokens";

export default function DiscoverScreen() {
  return (
    <SafeAreaView style={{ backgroundColor: colors.background, flex: 1 }}>
      <View style={{ flex: 1, justifyContent: "center", padding: spacing.xl }}>
        <View style={{
          alignItems: "center",
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderRadius: radii.xl,
          borderWidth: 1,
          gap: spacing.md,
          padding: spacing.xl
        }}>
          <Icon name="compass" color={colors.accentDeep} size={34} />
          <Text style={{ ...typography.sectionTitle, color: colors.navy, textAlign: "center" }}>
            Yakınındaki işletmeleri keşfet
          </Text>
          <Text style={{ ...typography.body, color: colors.muted, textAlign: "center" }}>
            Restoran, kafe, güzellik ve sağlık kategorileri için hızlı keşif alanı.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}
