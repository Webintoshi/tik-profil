import { Text, View } from "react-native";
import { tokens } from "@/theme/tokens";

interface SectionTitleProps {
  eyebrow?: string;
  inverted?: boolean;
  subtitle?: string;
  title: string;
}

export function SectionTitle({
  eyebrow,
  inverted,
  subtitle,
  title,
}: SectionTitleProps) {
  return (
    <View style={{ gap: 5 }}>
      {eyebrow ? (
        <Text
          style={{
            color: inverted ? "rgba(255,255,255,0.68)" : tokens.colors.primarySoft,
            fontSize: 12,
            fontWeight: "900",
            letterSpacing: 0.7,
            textTransform: "uppercase",
          }}
        >
          {eyebrow}
        </Text>
      ) : null}
      <Text
        style={{
          color: inverted ? tokens.colors.white : tokens.colors.text,
          fontSize: tokens.type.section,
          fontWeight: "900",
          letterSpacing: -0.3,
        }}
      >
        {title}
      </Text>
      {subtitle ? (
        <Text
          style={{
            color: inverted ? "rgba(255,255,255,0.74)" : tokens.colors.textMuted,
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

