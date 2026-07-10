import { Pressable, ScrollView, Text } from "react-native";

import { colors, radii, spacing, typography } from "@/theme/tokens";
import { selectionImpact } from "@/utils/haptics";

const cities = ["İstanbul", "Ankara", "İzmir", "Antalya", "Bursa"];

interface CityChipsProps {
  selected?: string | null;
  onSelect: (city: string | null) => void;
}

export function CityChips({ selected, onSelect }: CityChipsProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: spacing.sm, paddingHorizontal: spacing.screen }}
    >
      {cities.map((city) => {
        const active = selected === city;
        return (
          <Pressable
            accessibilityRole="button"
            key={city}
            onPress={() => {
              selectionImpact();
              onSelect(active ? null : city);
            }}
            style={{
              backgroundColor: active ? colors.brand : colors.surface,
              borderColor: active ? colors.brand : colors.border,
              borderRadius: radii.pill,
              borderWidth: 1,
              paddingHorizontal: spacing.lg,
              paddingVertical: spacing.sm
            }}
          >
            <Text style={{ ...typography.label, color: active ? colors.onBrand : colors.inkSoft }}>
              {city}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
