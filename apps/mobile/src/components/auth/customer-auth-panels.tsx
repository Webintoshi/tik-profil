import { useState } from "react";
import { Link } from "expo-router";
import { Text, TextInput, View } from "react-native";
import { Button } from "@/components/ui/button";
import { SurfaceCard } from "@/components/ui/surface-card";
import { tokens } from "@/theme/tokens";
import type { AccountCompletionField } from "@/auth/account-completion";

const completionLabels: Record<AccountCompletionField, string> = {
  displayName: "Ad soyad",
  email: "Mail adresi",
  phone: "Telefon numarası",
};

interface AuthLandingPanelProps {
  isBusy: boolean;
  isConfigured: boolean;
  onRegister: () => void;
  onSignIn: () => void;
}

export function AuthLandingPanel({
  isBusy,
  isConfigured,
  onRegister,
  onSignIn,
}: AuthLandingPanelProps) {
  return (
    <SurfaceCard>
      <View style={{ gap: tokens.spacing.md }}>
        <View style={{ gap: 8 }}>
          <Text style={{ color: tokens.colors.text, fontSize: 28, fontWeight: "900" }}>
            Tık Profil'e hoş geldin
          </Text>
          <Text style={{ color: tokens.colors.textMuted, fontSize: 15, lineHeight: 22 }}>
            Yakındaki işletmeleri keşfet, kampanyaları takip et ve hesabını tek müşteri
            profiliyle kullan.
          </Text>
        </View>
        <Button disabled={!isConfigured || isBusy} onPress={onSignIn}>
          {isBusy ? "Güvenli giriş hazırlanıyor" : "Giriş Yap"}
        </Button>
        <Button disabled={!isConfigured || isBusy} onPress={onRegister} variant="secondary">
          Hesap Oluştur
        </Button>
        <View style={{ flexDirection: "row", gap: 10 }}>
          <View style={{ flex: 1 }}>
            <Button disabled variant="secondary">
              Google ile devam et (Yakında)
            </Button>
          </View>
          <View style={{ flex: 1 }}>
            <Button disabled variant="secondary">
              Apple ile devam et (Yakında)
            </Button>
          </View>
        </View>
        <Text style={{ color: tokens.colors.textSoft, fontSize: 13, lineHeight: 19 }}>
          Google ve Apple bağlantıları hazırlanıyor. Bu sürümde gerçek connector
          etkinleştirilmedi.
        </Text>
      </View>
    </SurfaceCard>
  );
}

export function AuthSyncPanel({
  body = "Oturum doğrulanıyor, lütfen bekleyin.",
  title = "Hesabınız hazırlanıyor",
}: {
  body?: string;
  title?: string;
}) {
  return (
    <SurfaceCard>
      <View style={{ gap: 8 }}>
        <Text style={{ color: tokens.colors.text, fontSize: 20, fontWeight: "800" }}>
          {title}
        </Text>
        <Text style={{ color: tokens.colors.textMuted, fontSize: 14, lineHeight: 20 }}>
          {body}
        </Text>
      </View>
    </SurfaceCard>
  );
}

export function ProfileWarningPanel({
  message,
  onRetry,
}: {
  message: null | string;
  onRetry: () => void;
}) {
  return (
    <SurfaceCard>
      <View style={{ gap: tokens.spacing.md }}>
        <Text style={{ color: tokens.colors.warning, fontSize: 18, fontWeight: "800" }}>
          Profil bilgileri şu anda alınamadı
        </Text>
        <Text style={{ color: tokens.colors.textMuted, fontSize: 14, lineHeight: 20 }}>
          {message ??
            "Oturum doğrulandı, ancak profil özeti geçici olarak yüklenemedi."}
        </Text>
        <Button onPress={onRetry} variant="secondary">
          Tekrar dene
        </Button>
      </View>
    </SurfaceCard>
  );
}

export function AccountCompletionPanel({
  email,
  displayName,
  missingFields,
  phone,
}: {
  displayName?: null | string;
  email?: null | string;
  missingFields: AccountCompletionField[];
  phone?: null | string;
}) {
  const [form, setForm] = useState({
    displayName: displayName ?? "",
    email: email ?? "",
    phone: phone ?? "",
  });

  return (
    <SurfaceCard>
      <View style={{ gap: tokens.spacing.md }}>
        <View style={{ gap: 6 }}>
          <Text style={{ color: tokens.colors.text, fontSize: 22, fontWeight: "900" }}>
            Hesabını tamamla
          </Text>
          <Text style={{ color: tokens.colors.textMuted, fontSize: 14, lineHeight: 20 }}>
            Tık Profil'i kullanmaya devam etmek için bilgilerini tamamla. Ad soyad,
            e-posta ve telefon numarası tam erişim için gereklidir.
          </Text>
        </View>
        {(["displayName", "email", "phone"] as AccountCompletionField[]).map((field) => (
          <View key={field} style={{ gap: 6 }}>
            <Text style={{ color: tokens.colors.text, fontSize: 13, fontWeight: "700" }}>
              {completionLabels[field]}
            </Text>
            <TextInput
              autoCapitalize={field === "email" ? "none" : "words"}
              keyboardType={field === "phone" ? "phone-pad" : "default"}
              onChangeText={(value) => setForm((current) => ({ ...current, [field]: value }))}
              placeholder={completionLabels[field]}
              style={{
                minHeight: 52,
                borderRadius: tokens.radius.md,
                borderCurve: "continuous",
                borderWidth: 1,
                borderColor: missingFields.includes(field)
                  ? tokens.colors.warning
                  : tokens.colors.border,
                backgroundColor: tokens.colors.surfaceMuted,
                color: tokens.colors.text,
                paddingHorizontal: tokens.spacing.md,
              }}
              value={form[field]}
            />
          </View>
        ))}
        <Text style={{ color: tokens.colors.warning, fontSize: 13, lineHeight: 19 }}>
          Eksik alanlar:{" "}
          {missingFields.map((field) => completionLabels[field]).join(", ") || "Yok"}
        </Text>
        <Button disabled>
          Profil bilgilerini kaydetme yakında aktif olacak.
        </Button>
      </View>
    </SurfaceCard>
  );
}

export function FullAccessRequiredPanel({
  isAuthenticated,
}: {
  isAuthenticated: boolean;
}) {
  return (
    <SurfaceCard>
      <View style={{ gap: tokens.spacing.md }}>
        <Text style={{ color: tokens.colors.text, fontSize: 20, fontWeight: "900" }}>
          {isAuthenticated ? "Hesabını tamamla" : "Önce giriş yap"}
        </Text>
        <Text style={{ color: tokens.colors.textMuted, fontSize: 14, lineHeight: 20 }}>
          {isAuthenticated
            ? "Keşfet, arama ve favoriler için ad soyad, mail adresi ve telefon numarası tamamlanmalı."
            : "Tık Profil v1 deneyimi müşteri hesabı ile başlar. Giriş yap veya hesap oluştur."}
        </Text>
        <Link href="/(tabs)/profil" asChild>
          <Button>{isAuthenticated ? "Hesabı tamamla" : "Giriş Yap"}</Button>
        </Link>
      </View>
    </SurfaceCard>
  );
}
