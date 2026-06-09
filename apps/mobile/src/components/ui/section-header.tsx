import { Text, View } from "react-native";
import { tokens } from "@/theme/tokens";

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
}

export function SectionHeader({ title, subtitle }: SectionHeaderProps) {
  return (
    <View style={{ gap: 4 }}>
      <Text
        style={{
          color: tokens.colors.text,
          fontSize: 18,
          fontWeight: "700",
        }}
      >
        {title}
      </Text>
      {subtitle ? (
        <Text
          style={{
            color: tokens.colors.textMuted,
            fontSize: 14,
            lineHeight: 20,
          }}
        >
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
}
