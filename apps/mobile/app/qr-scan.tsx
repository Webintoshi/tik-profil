import { useRouter } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Icon } from "@/components/common/Icon";
import { colors, radii, shadows, spacing, typography } from "@/theme/tokens";
import { useThemeMode } from "@/theme/theme-store";
import { lightImpact } from "@/utils/haptics";

export default function QrScanShortcutScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  useThemeMode();

  function goBack() {
    lightImpact();
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace("/" as never);
  }

  return (
    <View style={{ backgroundColor: colors.background, flex: 1, paddingHorizontal: spacing.screen, paddingTop: insets.top + spacing.lg }}>
      <Pressable
        accessibilityLabel="Geri dön"
        accessibilityRole="button"
        onPress={goBack}
        style={{
          alignItems: "center",
          backgroundColor: colors.surface,
          borderRadius: radii.pill,
          height: 44,
          justifyContent: "center",
          marginBottom: spacing.xl,
          width: 44,
          ...shadows.soft
        }}
      >
        <Icon name="arrowLeft" color={colors.ink} size={22} />
      </Pressable>

      <View
        style={{
          alignItems: "center",
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderRadius: radii.xxl,
          borderWidth: 1,
          gap: spacing.lg,
          justifyContent: "center",
          minHeight: 360,
          padding: spacing.xxl,
          ...shadows.card
        }}
      >
        <View
          style={{
            alignItems: "center",
            backgroundColor: colors.brand,
            borderRadius: radii.xxl,
            height: 86,
            justifyContent: "center",
            width: 86
          }}
        >
          <Icon name="qr" color={colors.onBrand} size={42} strokeWidth={2.6} />
        </View>
        <View style={{ gap: spacing.sm }}>
          <Text style={{ ...typography.title, color: colors.ink, textAlign: "center" }}>
            QR kod okut
          </Text>
          <Text style={{ ...typography.body, color: colors.muted, textAlign: "center" }}>
            Kamera ile QR profil açma akışı bu kısa yola bağlanacak.
          </Text>
        </View>
      </View>
    </View>
  );
}
