import { useState } from "react";
import { Image } from "expo-image";
import { ActivityIndicator, Text, View } from "react-native";

import tikLogoWordmarkDarkBrand from "@/assets/brand/tik-logo-wordmark-dark-brand.png";
import tikLogoWordmarkPrimary from "@/assets/brand/tik-logo-wordmark-primary.png";
import { useCustomerSession } from "@/auth/auth-store";
import { readLogtoConfiguration } from "@/auth/logto-client";
import { AnimatedPressable } from "@/components/common/AnimatedPressable";
import { colors, radii, spacing, typography } from "@/theme/tokens";
import { useThemeMode } from "@/theme/theme-store";
import { lightImpact, selectionImpact } from "@/utils/haptics";
import { SocialButton } from "./SocialButton";

type AuthMode = "login" | "register";

export function AuthEntryCard() {
  const { mode: themeMode } = useThemeMode();
  const { error, signIn, signUp, status } = useCustomerSession();
  const [mode, setMode] = useState<AuthMode>("login");
  const configuration = readLogtoConfiguration();
  const isRegister = mode === "register";
  const isBusy = status === "authenticating";
  const displayedError = configuration.configured ? error : configuration.error;
  const brandLogo = themeMode === "dark" ? tikLogoWordmarkDarkBrand : tikLogoWordmarkPrimary;

  const submit = async () => {
    if (isBusy || !configuration.configured) return;
    lightImpact();
    await (isRegister ? signUp() : signIn());
  };

  return (
    <View style={{
      gap: spacing.lg,
      marginHorizontal: spacing.screen,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xl
    }}>
      <View style={{ alignItems: "center", gap: spacing.sm }}>
        <Image source={brandLogo} style={{ height: 42, width: 112 }} contentFit="contain" transition={120} />
        <Text style={{ ...typography.cardTitle, color: colors.ink, textAlign: "center" }}>
          {isRegister ? "Tık Profil hesabını oluştur" : "Hesabına giriş yap"}
        </Text>
        <Text style={{ ...typography.small, color: colors.muted, textAlign: "center" }}>
          {isRegister
            ? "Güvenli kayıt ekranı tarayıcıda açılır. Profil fotoğrafını girişten sonra ekleyebilirsin."
            : "Güvenli giriş ekranı tarayıcıda açılır."}
        </Text>
      </View>

      {displayedError ? (
        <View accessibilityRole="alert" style={{
          backgroundColor: colors.brandSoft,
          borderColor: colors.borderStrong,
          borderRadius: radii.md,
          borderWidth: 1,
          padding: spacing.md
        }}>
          <Text style={{ ...typography.small, color: colors.danger, textAlign: "center" }}>{displayedError}</Text>
        </View>
      ) : null}

      <AnimatedPressable
        accessibilityLabel={isRegister ? "Güvenli hesap oluşturma ekranını aç" : "Güvenli giriş ekranını aç"}
        accessibilityRole="button"
        disabled={isBusy || !configuration.configured}
        onPress={submit}
        pressScale={0.97}
        style={({ pressed }) => ({
          alignItems: "center",
          backgroundColor: colors.brand,
          borderRadius: radii.lg,
          justifyContent: "center",
          minHeight: 50,
          opacity: isBusy || !configuration.configured ? 0.58 : pressed ? 0.9 : 1
        })}
      >
        {isBusy ? <ActivityIndicator color={colors.onBrand} /> : (
          <Text style={{ ...typography.button, color: colors.onBrand }}>
            {isRegister ? "Hesap oluştur" : "Giriş yap"}
          </Text>
        )}
      </AnimatedPressable>

      <AnimatedPressable
        accessibilityRole="button"
        onPress={() => { selectionImpact(); setMode(isRegister ? "login" : "register"); }}
        pressScale={0.97}
        style={({ pressed }) => ({
          alignItems: "center",
          backgroundColor: themeMode === "dark" ? colors.brand : colors.ink,
          borderRadius: radii.lg,
          justifyContent: "center",
          minHeight: 48,
          opacity: pressed ? 0.88 : 1
        })}
      >
        <Text style={{ ...typography.button, color: themeMode === "dark" ? colors.onBrand : colors.inverseText }}>
          {isRegister ? "Zaten hesabım var" : "Yeni hesap oluştur"}
        </Text>
      </AnimatedPressable>

      {!isRegister && configuration.configured ? (
        <View style={{ gap: spacing.sm }}>
          <SocialButton provider="apple" label="Apple ile giriş yap" onPress={() => void signIn("apple")} />
          <SocialButton provider="google" label="Google ile giriş yap" onPress={() => void signIn("google")} />
        </View>
      ) : null}
    </View>
  );
}
