import type { ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import { ChevronRight } from "lucide-react-native";
import { tokens } from "@/theme/tokens";

interface ActionTileProps {
  icon: ReactNode;
  label: string;
  meta?: string;
  onPress?: () => void;
  tone?: "blue" | "gold" | "green";
}

const toneColors = {
  blue: {
    background: tokens.colors.infoSoft,
    text: tokens.colors.primary,
  },
  gold: {
    background: tokens.colors.warningSoft,
    text: tokens.colors.warning,
  },
  green: {
    background: tokens.colors.successSoft,
    text: tokens.colors.success,
  },
} as const;

export function ActionTile({
  icon,
  label,
  meta,
  onPress,
  tone = "blue",
}: ActionTileProps) {
  const colors = toneColors[tone];

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => ({
        flex: 1,
        minHeight: 96,
        borderRadius: tokens.radius.lg,
        borderCurve: "continuous",
        backgroundColor: colors.background,
        padding: tokens.spacing.md,
        justifyContent: "space-between",
        opacity: pressed ? 0.86 : 1,
      })}
    >
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <View
          style={{
            width: 34,
            height: 34,
            borderRadius: 14,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "rgba(255,255,255,0.78)",
          }}
        >
          {icon}
        </View>
        <ChevronRight color={colors.text} size={16} />
      </View>
      <View style={{ gap: 3 }}>
        <Text style={{ color: tokens.colors.text, fontSize: 15, fontWeight: "900" }}>
          {label}
        </Text>
        {meta ? (
          <Text style={{ color: colors.text, fontSize: 12, fontWeight: "800" }}>{meta}</Text>
        ) : null}
      </View>
    </Pressable>
  );
}

