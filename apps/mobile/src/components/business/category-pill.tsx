import { Pressable, Text, View } from "react-native";

import type { KesfetCategory } from "@/api/kesfet";
import { colors, radii, spacing, typography } from "@/theme/tokens";
import { selectionImpact } from "@/utils/haptics";

interface CategoryPillProps {
  category: KesfetCategory;
  selected?: boolean;
  onPress: (category: KesfetCategory) => void;
}

export function CategoryPill({ category, selected = false, onPress }: CategoryPillProps) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => {
        selectionImpact();
        onPress(category);
      }}
      style={({ pressed }) => ({
        alignItems: "center",
        backgroundColor: selected ? colors.brand : colors.surface,
        borderColor: selected ? colors.brand : colors.border,
        borderRadius: radii.xl,
        borderWidth: 1,
        flexDirection: "row",
        gap: spacing.sm,
        minHeight: 48,
        opacity: pressed ? 0.88 : 1,
        paddingHorizontal: spacing.md
      })}
    >
      <View style={{
        alignItems: "center",
        backgroundColor: selected ? "rgba(255,255,255,0.16)" : colors.backgroundAlt,
        borderRadius: radii.pill,
        height: 30,
        justifyContent: "center",
        width: 30
      }}>
        <Text style={{ fontSize: 16 }}>{category.emoji}</Text>
      </View>
      <View>
        <Text numberOfLines={1} style={{ ...typography.label, color: selected ? colors.onBrand : colors.ink }}>
          {category.label}
        </Text>
        <Text style={{ ...typography.small, color: selected ? "rgba(255,255,255,0.72)" : colors.muted }}>
          {category.count} işletme
        </Text>
      </View>
    </Pressable>
  );
}
