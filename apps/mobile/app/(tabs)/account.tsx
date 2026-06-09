import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AuthEntryCard } from "@/components/account/AuthEntryCard";
import { BenefitChip } from "@/components/account/BenefitChip";
import { BrandHero } from "@/components/account/BrandHero";
import { colors, radii, spacing, typography } from "@/theme/tokens";

const categories = ["Restoran", "Kafe", "Güzellik", "Sağlık"];

export default function AccountScreen() {
  return (
    <SafeAreaView edges={["left", "right"]} style={{ backgroundColor: colors.background, flex: 1 }}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: spacing.xxl }}
        showsVerticalScrollIndicator={false}
      >
        <BrandHero />
        <AuthEntryCard />

        <View style={{ gap: spacing.md, paddingHorizontal: spacing.lg, paddingTop: spacing.xl }}>
          <View style={{ flexDirection: "row", gap: spacing.sm }}>
            <BenefitChip icon="briefcase" label="Yakındaki işletmeler" />
            <BenefitChip icon="campaign" label="Kampanyalar" />
            <BenefitChip icon="qr" label="QR ile hızlı erişim" />
          </View>

          <View style={{
            backgroundColor: colors.surfaceWarm,
            borderColor: colors.border,
            borderRadius: radii.xl,
            borderWidth: 1,
            padding: spacing.lg
          }}>
            <Text style={{ ...typography.label, color: colors.navy, marginBottom: spacing.md }}>
              Yerel kategoriler
            </Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
              {categories.map((category) => (
                <Pressable
                  accessibilityRole="button"
                  key={category}
                  style={{
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    borderRadius: radii.pill,
                    borderWidth: 1,
                    paddingHorizontal: spacing.md,
                    paddingVertical: spacing.sm
                  }}
                >
                  <Text style={{ ...typography.label, color: colors.navySoft }}>{category}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
