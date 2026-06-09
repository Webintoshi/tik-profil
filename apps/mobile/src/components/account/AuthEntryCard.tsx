import { useMemo, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";

import { Icon } from "@/components/common/Icon";
import { colors, radii, shadows, spacing, typography } from "@/theme/tokens";
import { PhoneInputRow } from "./PhoneInputRow";
import { SocialButton } from "./SocialButton";

type AuthMode = "login" | "register";

export function AuthEntryCard() {
  const [mode, setMode] = useState<AuthMode>("login");
  const [phone, setPhone] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | undefined>();

  const digits = useMemo(() => phone.replace(/\D/g, ""), [phone]);

  function handlePhoneChange(value: string) {
    setPhone(value);
    if (error) {
      setError(undefined);
    }
  }

  function submit() {
    if (digits.length < 10) {
      setError("Telefon numarasını kontrol et.");
      return;
    }
    setError("Giriş tamamlanamadı. Lütfen tekrar deneyin.");
  }

  const isRegister = mode === "register";

  return (
    <View style={{
      backgroundColor: colors.surface,
      borderColor: "rgba(255,255,255,0.9)",
      borderRadius: radii.xl,
      borderWidth: 1,
      gap: spacing.lg,
      marginHorizontal: spacing.lg,
      marginTop: -26,
      padding: spacing.xl,
      ...shadows.card
    }}>
      <View style={{ gap: spacing.xs }}>
        <Text style={{ ...typography.sectionTitle, color: colors.navy }}>
          {isRegister ? "Hesap oluştur" : "Hesabına giriş yap"}
        </Text>
        <Text style={{ ...typography.body, color: colors.muted }}>
          {isRegister
            ? "Tam erişim için ad soyad, e-posta ve telefon bilgilerini tamamla."
            : "Fırsatları takip etmek, favorilerini saklamak ve hızlı erişim için hesabını kullan."}
        </Text>
      </View>

      {isRegister ? (
        <View style={{ gap: spacing.sm }}>
          <ProfileInput
            icon="profile"
            label="Ad soyad"
            onChangeText={setFullName}
            value={fullName}
          />
          <ProfileInput
            icon="spark"
            inputMode="email"
            label="E-posta"
            onChangeText={setEmail}
            value={email}
          />
        </View>
      ) : null}

      <PhoneInputRow value={phone} onChangeText={handlePhoneChange} error={error} />

      <Pressable
        accessibilityRole="button"
        onPress={submit}
        style={({ pressed }) => ({
          alignItems: "center",
          backgroundColor: colors.navy,
          borderRadius: radii.md,
          minHeight: 56,
          justifyContent: "center",
          opacity: pressed ? 0.92 : 1
        })}
      >
        <Text style={{ ...typography.button, color: colors.surface }}>
          {isRegister ? "Hesabı oluştur" : "Telefonla devam et"}
        </Text>
      </Pressable>

      <View style={{
        alignItems: "center",
        flexDirection: "row",
        gap: spacing.xs,
        justifyContent: "center"
      }}>
        <Text style={{ ...typography.body, color: colors.muted }}>
          {isRegister ? "Zaten hesabın var mı?" : "Hesabın yok mu?"}
        </Text>
        <Pressable onPress={() => setMode(isRegister ? "login" : "register")}>
          <Text style={{ ...typography.label, color: colors.accentDeep }}>
            {isRegister ? "Giriş Yap" : "Hesap oluştur"}
          </Text>
        </Pressable>
      </View>

      <View style={{ alignItems: "center", flexDirection: "row", gap: spacing.md }}>
        <View style={{ backgroundColor: colors.border, flex: 1, height: 1 }} />
        <Text style={{ ...typography.label, color: colors.muted }}>veya</Text>
        <View style={{ backgroundColor: colors.border, flex: 1, height: 1 }} />
      </View>

      <View style={{ gap: spacing.sm }}>
        <SocialButton provider="google" label="Google ile devam et" disabled />
        <SocialButton provider="apple" label="Apple ile devam et" disabled />
      </View>
    </View>
  );
}

interface ProfileInputProps {
  icon: "profile" | "spark";
  inputMode?: "email";
  label: string;
  value: string;
  onChangeText: (value: string) => void;
}

function ProfileInput({ icon, inputMode, label, value, onChangeText }: ProfileInputProps) {
  return (
    <View style={{
      alignItems: "center",
      backgroundColor: colors.surfaceWarm,
      borderColor: colors.borderStrong,
      borderRadius: radii.md,
      borderWidth: 1,
      flexDirection: "row",
      gap: spacing.sm,
      minHeight: 54,
      paddingHorizontal: spacing.md
    }}>
      <Icon name={icon} color={colors.navySoft} size={18} />
      <TextInput
        accessibilityLabel={label}
        inputMode={inputMode}
        onChangeText={onChangeText}
        placeholder={label}
        placeholderTextColor={colors.muted}
        style={{
          ...typography.body,
          color: colors.navy,
          flex: 1,
          minHeight: 54
        }}
        value={value}
      />
    </View>
  );
}
