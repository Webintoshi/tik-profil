import { Pressable, Text, View } from "react-native";
import { tokens } from "@/theme/tokens";

interface ChipProps {
  label: string;
  icon?: string;
  selected?: boolean;
  onPress?: () => void;
}

export function Chip({ label, icon, selected, onPress }: ChipProps) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => ({
        borderRadius: tokens.radius.pill,
        borderCurve: "continuous",
        borderWidth: 1,
        borderColor: selected ? tokens.colors.primary : tokens.colors.border,
        backgroundColor: selected ? tokens.colors.primary : tokens.colors.surface,
        opacity: pressed ? 0.9 : 1,
      })}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 8,
          paddingHorizontal: 14,
          paddingVertical: 10,
        }}
      >
        {icon ? <Text style={{ fontSize: 16 }}>{icon}</Text> : null}
        <Text
          style={{
            color: selected ? tokens.colors.white : tokens.colors.text,
            fontSize: 14,
            fontWeight: "600",
          }}
        >
          {label}
        </Text>
      </View>
    </Pressable>
  );
}
