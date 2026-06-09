import { SafeAreaView, Text, View } from "react-native";

import { Icon } from "@/components/common/Icon";
import { colors, radii, spacing, typography } from "@/theme/tokens";

export default function ExploreScreen() {
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
          <Icon name="search" color={colors.accentDeep} size={34} />
          <Text style={{ ...typography.sectionTitle, color: colors.navy, textAlign: "center" }}>
            İşletme ara
          </Text>
          <Text style={{ ...typography.body, color: colors.muted, textAlign: "center" }}>
            İsim, kategori veya konuma göre hızlı arama alanı.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}
