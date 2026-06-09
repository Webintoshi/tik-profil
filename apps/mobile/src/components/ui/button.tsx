import type { PropsWithChildren, ReactNode } from "react";
import { Pressable, Text } from "react-native";
import { tokens } from "@/theme/tokens";

interface ButtonProps {
  children: ReactNode;
  onPress?: () => void;
  variant?: "primary" | "secondary";
  disabled?: boolean;
}

export function Button({
  children,
  onPress,
  variant = "primary",
  disabled,
}: ButtonProps) {
  const isPrimary = variant === "primary";

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: 54,
        borderRadius: tokens.radius.lg,
        borderCurve: "continuous",
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: tokens.spacing.lg,
        backgroundColor: isPrimary ? tokens.colors.accent : tokens.colors.surface,
        borderWidth: isPrimary ? 0 : 1,
        borderColor: tokens.colors.border,
        opacity: disabled ? 0.5 : pressed ? 0.88 : 1,
        boxShadow: isPrimary ? tokens.shadow.glow : "none",
      })}
    >
      {typeof children === "string" ? (
        <Text
          style={{
            color: isPrimary ? tokens.colors.white : tokens.colors.text,
            fontSize: 16,
            fontWeight: "900",
          }}
        >
          {children}
        </Text>
      ) : (
        children
      )}
    </Pressable>
  );
}
