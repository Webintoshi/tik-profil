import { useState } from "react";
import * as ImagePicker from "expo-image-picker";
import { Image } from "expo-image";
import { ActivityIndicator, Text, TextInput, View } from "react-native";

import tikLogoWordmarkDarkBrand from "@/assets/brand/tik-logo-wordmark-dark-brand.png";
import tikLogoWordmarkPrimary from "@/assets/brand/tik-logo-wordmark-primary.png";
import { uploadAccountAvatar } from "@/api/account";
import { AnimatedPressable } from "@/components/common/AnimatedPressable";
import { Icon, type IconName } from "@/components/common/Icon";
import { colors, radii, spacing, typography } from "@/theme/tokens";
import { useThemeMode } from "@/theme/theme-store";
import { lightImpact, selectionImpact } from "@/utils/haptics";
import { SocialButton } from "./SocialButton";

type AuthMode = "login" | "register";

export function AuthEntryCard() {
  const { mode: themeMode } = useThemeMode();
  const [mode, setMode] = useState<AuthMode>("login");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [avatar, setAvatar] = useState<ImagePicker.ImagePickerAsset | undefined>();
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>();
  const [error, setError] = useState<string | undefined>();
  const [notice, setNotice] = useState<string | undefined>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  const brandLogo = themeMode === "dark" ? tikLogoWordmarkDarkBrand : tikLogoWordmarkPrimary;
  const isRegister = mode === "register";

  function clearFeedback() {
    if (error) setError(undefined);
    if (notice) setNotice(undefined);
  }

  async function pickAvatar() {
    selectionImpact();
    clearFeedback();

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError("Profil fotoğrafı seçmek için galeri izni gerekli.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      aspect: [1, 1],
      mediaTypes: ["images"],
      quality: 0.86
    });

    if (result.canceled || !result.assets?.[0]) return;

    const selectedAvatar = result.assets[0];
    if (selectedAvatar.fileSize && selectedAvatar.fileSize > 2 * 1024 * 1024) {
      setError("Profil fotoğrafı en fazla 2MB olabilir.");
      return;
    }

    setAvatar(selectedAvatar);
    setAvatarUrl(undefined);
  }

  function removeAvatar() {
    selectionImpact();
    setAvatar(undefined);
    setAvatarUrl(undefined);
    clearFeedback();
  }

  async function submit() {
    if (isSubmitting) return;

    lightImpact();
    clearFeedback();

    if (isRegister && fullName.trim().length < 2) {
      setError("Ad soyad bilgisini kontrol et.");
      return;
    }

    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      setError("Geçerli bir e-posta adresi gir.");
      return;
    }

    if (password.trim().length < 6) {
      setError("Şifre en az 6 karakter olmalı.");
      return;
    }

    setIsSubmitting(true);
    try {
      let uploadedAvatarUrl = avatarUrl;

      if (isRegister && avatar && !uploadedAvatarUrl) {
        setIsUploadingAvatar(true);
        uploadedAvatarUrl = await uploadAccountAvatar({
          uri: avatar.uri,
          file: avatar.file,
          fileName: avatar.fileName,
          fileSize: avatar.fileSize,
          mimeType: avatar.mimeType
        });
        setAvatarUrl(uploadedAvatarUrl);
      }

      if (isRegister) {
        setNotice(
          uploadedAvatarUrl
            ? "Profil fotoğrafı R2'ye yüklendi. Hesap oluşturma adımı bu fotoğrafla devam edecek."
            : "Hesap bilgileri hazır. Profil fotoğrafını daha sonra da ekleyebilirsin."
        );
        return;
      }

      setError("Giriş tamamlanamadı. Lütfen tekrar deneyin.");
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Profil fotoğrafı yüklenemedi.");
    } finally {
      setIsUploadingAvatar(false);
      setIsSubmitting(false);
    }
  }

  return (
    <View style={{
      gap: spacing.md,
      marginHorizontal: spacing.screen,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xl
    }}>
      {!isRegister ? (
        <View style={{ alignItems: "center" }}>
          <Image source={brandLogo} style={{ height: 42, width: 112 }} contentFit="contain" transition={120} />
        </View>
      ) : null}

      {isRegister ? (
        <View style={{ gap: spacing.sm, marginTop: spacing.xs }}>
          <AvatarPicker
            asset={avatar}
            isBusy={isUploadingAvatar}
            onPick={pickAvatar}
            onRemove={removeAvatar}
          />
          <AuthField
            icon="profile"
            label="Ad soyad"
            onChangeText={(value) => {
              setFullName(value);
              clearFeedback();
            }}
            value={fullName}
          />
        </View>
      ) : null}

      <View style={{ gap: spacing.sm }}>
        <AuthField
          icon="mail"
          inputMode="email"
          label="E-posta"
          onChangeText={(value) => {
            setEmail(value);
            clearFeedback();
          }}
          value={email}
        />
        <AuthField
          icon="lock"
          label="Şifre"
          onChangeText={(value) => {
            setPassword(value);
            clearFeedback();
          }}
          secureTextEntry
          value={password}
        />
      </View>

      {!isRegister ? (
        <AnimatedPressable
          accessibilityRole="button"
          onPress={selectionImpact}
          pressScale={0.96}
          style={{ alignSelf: "center" }}
        >
          <Text style={{ ...typography.small, color: colors.brandDeep }}>Şifremi unuttum</Text>
        </AnimatedPressable>
      ) : null}

      {notice ? (
        <Text style={{ ...typography.small, color: colors.accentDeep, textAlign: "center" }}>
          {notice}
        </Text>
      ) : null}

      {error ? (
        <Text style={{ ...typography.small, color: colors.danger, textAlign: "center" }}>
          {error}
        </Text>
      ) : null}

      <AnimatedPressable
        accessibilityRole="button"
        disabled={isSubmitting}
        onPress={submit}
        pressScale={0.97}
        style={({ pressed }) => ({
          alignItems: "center",
          alignSelf: "stretch",
          backgroundColor: colors.brand,
          borderRadius: radii.lg,
          justifyContent: "center",
          minHeight: 50,
          opacity: isSubmitting ? 0.68 : pressed ? 0.92 : 1,
          width: "100%"
        })}
      >
        {isSubmitting ? (
          <ActivityIndicator color={colors.onBrand} />
        ) : (
          <Text style={{ ...typography.button, color: colors.onBrand }}>
            {isRegister ? "Hesabı oluştur" : "Devam et"}
          </Text>
        )}
      </AnimatedPressable>

      <View style={{ alignItems: "center", flexDirection: "row", gap: spacing.sm }}>
        <View style={{ backgroundColor: colors.border, flex: 1, height: 1 }} />
        <Text style={{ ...typography.small, color: colors.muted }}>
          {isRegister ? "Zaten hesabın var mı?" : "Hesabın yok mu?"}
        </Text>
        <View style={{ backgroundColor: colors.border, flex: 1, height: 1 }} />
      </View>

      <AnimatedPressable
        accessibilityRole="button"
        onPress={() => { selectionImpact(); clearFeedback(); setMode(isRegister ? "login" : "register"); }}
        pressScale={0.97}
        style={({ pressed }) => ({
          alignItems: "center",
          alignSelf: "stretch",
          backgroundColor: themeMode === "dark" ? colors.brand : colors.ink,
          borderColor: themeMode === "dark" ? colors.brand : colors.ink,
          borderRadius: radii.lg,
          borderWidth: 1,
          justifyContent: "center",
          minHeight: 48,
          opacity: pressed ? 0.88 : 1,
          width: "100%"
        })}
      >
        <Text style={{
          ...typography.button,
          color: themeMode === "dark" ? colors.onBrand : colors.inverseText
        }}>
          {isRegister ? "Giriş yap" : "Hesap oluştur"}
        </Text>
      </AnimatedPressable>

      {!isRegister ? (
        <View style={{ gap: spacing.sm }}>
          <SocialButton provider="apple" label="Apple ile giriş yap" onPress={selectionImpact} />
          <SocialButton provider="google" label="Google ile giriş yap" onPress={selectionImpact} />
        </View>
      ) : null}
    </View>
  );
}

function AvatarPicker({
  asset,
  isBusy,
  onPick,
  onRemove
}: {
  asset?: ImagePicker.ImagePickerAsset;
  isBusy: boolean;
  onPick: () => void;
  onRemove: () => void;
}) {
  return (
    <View style={{
      alignItems: "center",
      backgroundColor: colors.backgroundAlt,
      borderColor: colors.border,
      borderRadius: radii.xl,
      borderWidth: 1,
      justifyContent: "center",
      paddingVertical: spacing.lg
    }}>
      <AnimatedPressable
        accessibilityLabel="Profil fotoğrafı seç"
        accessibilityRole="button"
        disabled={isBusy}
        onPress={onPick}
        pressScale={0.93}
        style={({ pressed }) => ({
          alignItems: "center",
          height: 92,
          justifyContent: "center",
          opacity: isBusy ? 0.72 : pressed ? 0.88 : 1,
          width: 92
        })}
      >
        <View style={{
          alignItems: "center",
          backgroundColor: asset ? colors.surface : colors.brandSoft,
          borderColor: colors.borderStrong,
          borderRadius: radii.pill,
          borderWidth: 2,
          height: 84,
          justifyContent: "center",
          overflow: "hidden",
          width: 84
        }}>
          {asset ? (
            <Image source={{ uri: asset.uri }} style={{ height: "100%", width: "100%" }} contentFit="cover" transition={160} />
          ) : (
            <Icon name="profile" color={colors.brandDeep} size={36} strokeWidth={2.3} />
          )}
        </View>

        <View style={{
          alignItems: "center",
          backgroundColor: colors.brand,
          borderColor: colors.backgroundAlt,
          borderRadius: radii.pill,
          borderWidth: 3,
          bottom: 2,
          height: 32,
          justifyContent: "center",
          position: "absolute",
          right: 2,
          width: 32
        }}>
          {isBusy ? (
            <ActivityIndicator color={colors.onBrand} size="small" />
          ) : (
            <Icon name="plus" color={colors.onBrand} size={17} strokeWidth={2.8} />
          )}
        </View>
      </AnimatedPressable>

      {asset ? (
        <AnimatedPressable
          accessibilityLabel="Profil fotoğrafını kaldır"
          accessibilityRole="button"
          onPress={onRemove}
          pressScale={0.9}
          style={({ pressed }) => ({
            alignItems: "center",
            backgroundColor: colors.surface,
            borderColor: colors.border,
            borderRadius: radii.pill,
            borderWidth: 1,
            height: 30,
            justifyContent: "center",
            opacity: pressed ? 0.86 : 1,
            position: "absolute",
            right: spacing.lg,
            top: spacing.lg,
            width: 30
          })}
        >
          <Icon name="x" color={colors.mutedStrong} size={14} />
        </AnimatedPressable>
      ) : null}
    </View>
  );
}

function AuthField({
  icon,
  inputMode,
  label,
  value,
  onChangeText,
  secureTextEntry = false
}: {
  icon: IconName;
  inputMode?: "email";
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  secureTextEntry?: boolean;
}) {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View style={{
      alignItems: "center",
      backgroundColor: isFocused ? colors.surface : colors.backgroundAlt,
      borderColor: isFocused ? colors.borderStrong : colors.border,
      borderRadius: radii.lg,
      borderWidth: 1,
      flexDirection: "row",
      gap: spacing.sm,
      minHeight: 50,
      paddingHorizontal: spacing.md
    }}>
      <View style={{
        alignItems: "center",
        backgroundColor: isFocused ? colors.brand : colors.brandSoft,
        borderRadius: radii.sm,
        height: 28,
        justifyContent: "center",
        width: 28
      }}>
        <Icon name={icon} color={isFocused ? colors.onBrand : colors.brandDeep} size={16} />
      </View>
      <TextInput
        accessibilityLabel={label}
        autoCapitalize={inputMode === "email" ? "none" : "sentences"}
        cursorColor={colors.brand}
        inputMode={inputMode}
        onBlur={() => setIsFocused(false)}
        onChangeText={onChangeText}
        onFocus={() => setIsFocused(true)}
        placeholder={label}
        placeholderTextColor={colors.muted}
        selectionColor={colors.brandSoft}
        secureTextEntry={secureTextEntry}
        style={[
          { ...typography.body, color: colors.ink, flex: 1, minHeight: 50 },
          { outlineColor: "transparent", outlineStyle: "none", outlineWidth: 0 } as never
        ]}
        value={value}
      />
    </View>
  );
}
