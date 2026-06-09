import { useState, type ReactNode } from "react";
import { Link } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import {
  AlertCircle,
  CheckCircle2,
  LockKeyhole,
  MessageCircle,
  ShieldCheck,
  UserRound,
} from "lucide-react-native";
import { Text, TextInput, View } from "react-native";
import { Button } from "@/components/ui/button";
import { SurfaceCard } from "@/components/ui/surface-card";
import { tokens } from "@/theme/tokens";
import type { AccountCompletionField } from "@/auth/account-completion";

const completionLabels: Record<AccountCompletionField, string> = {
  displayName: "Ad soyad",
  email: "E-posta",
  phone: "Telefon",
};

interface PendingOtpPanelState {
  maskedPhone: string;
  resendAfterSeconds: number;
}
interface AuthLandingPanelProps {
  isBusy: boolean;
  isConfigured: boolean;
  isGoogleConfigured: boolean;
  onCancelOtp: () => void;
  onGoogleSignIn: () => void;
  onRegister: (phone: string) => void;
  onSignIn: (phone: string) => void;
  onVerifyOtp: (code: string) => void;
  pendingOtp: PendingOtpPanelState | null;
}

function FieldShell({
  children,
  label,
}: {
  children: ReactNode;
  label: string;
}) {
  return (
    <View style={{ gap: 8 }}>
      <Text style={{ color: tokens.colors.text, fontSize: 13, fontWeight: "900" }}>
        {label}
      </Text>
      {children}
    </View>
  );
}

export function AuthLandingPanel({
  isBusy,
  isConfigured,
  isGoogleConfigured,
  onCancelOtp,
  onGoogleSignIn,
  onRegister,
  onSignIn,
  onVerifyOtp,
  pendingOtp,
}: AuthLandingPanelProps) {
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");

  return (
    <SurfaceCard>
      <View style={{ gap: tokens.spacing.lg }}>
        <LinearGradient
          colors={tokens.gradients.hero}
          style={{
            borderRadius: tokens.radius.xl,
            borderCurve: "continuous",
            overflow: "hidden",
            padding: tokens.spacing.xl,
            gap: tokens.spacing.lg,
          }}
        >
          <View
            style={{
              width: 56,
              height: 56,
              borderRadius: 22,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "rgba(255,255,255,0.16)",
            }}
          >
            <LockKeyhole color={tokens.colors.white} size={25} />
          </View>
          <View style={{ gap: 8 }}>
            <Text style={{ color: tokens.colors.white, fontSize: 30, fontWeight: "900" }}>
              SMS ile güvenli giriş
            </Text>
            <Text style={{ color: "rgba(255,255,255,0.78)", fontSize: 15, lineHeight: 22 }}>
              Telefonunu doğrula, Tık Profil hesabını uygulamadan çıkmadan aç.
            </Text>
          </View>
        </LinearGradient>

        {pendingOtp ? (
          <View style={{ gap: tokens.spacing.md }}>
            <View
              style={{
                borderRadius: tokens.radius.lg,
                backgroundColor: tokens.colors.infoSoft,
                flexDirection: "row",
                gap: tokens.spacing.sm,
                padding: tokens.spacing.md,
              }}
            >
              <MessageCircle color={tokens.colors.primary} size={20} />
              <Text style={{ color: tokens.colors.text, flex: 1, fontSize: 14, lineHeight: 20 }}>
                Kod {pendingOtp.maskedPhone} numarasına gönderildi.
              </Text>
            </View>
            <FieldShell label="Doğrulama kodu">
              <TextInput
                editable={!isBusy}
                keyboardType="number-pad"
                maxLength={6}
                onChangeText={setCode}
                placeholder="123456"
                placeholderTextColor={tokens.colors.textSoft}
                style={{
                  minHeight: 58,
                  borderRadius: tokens.radius.lg,
                  borderCurve: "continuous",
                  borderWidth: 1,
                  borderColor: tokens.colors.border,
                  backgroundColor: tokens.colors.surfaceMuted,
                  color: tokens.colors.text,
                  fontSize: 22,
                  fontVariant: ["tabular-nums"],
                  fontWeight: "900",
                  letterSpacing: 5,
                  paddingHorizontal: tokens.spacing.md,
                }}
                textContentType="oneTimeCode"
                value={code}
              />
            </FieldShell>
            <Button
              disabled={!isConfigured || isBusy || code.trim().length !== 6}
              onPress={() => onVerifyOtp(code)}
            >
              {isBusy ? "Giriş tamamlanıyor" : "Kodu doğrula"}
            </Button>
            <Button disabled={isBusy} onPress={onCancelOtp} variant="secondary">
              Telefonu değiştir
            </Button>
            <Text style={{ color: tokens.colors.textMuted, fontSize: 12, lineHeight: 18 }}>
              Yeni kod istemek için yaklaşık {pendingOtp.resendAfterSeconds} saniye bekle.
            </Text>
          </View>
        ) : (
          <View style={{ gap: tokens.spacing.md }}>
            <FieldShell label="Telefon numarası">
              <TextInput
                autoCorrect={false}
                editable={!isBusy}
                keyboardType="phone-pad"
                onChangeText={setPhone}
                placeholder="05XX XXX XX XX"
                placeholderTextColor={tokens.colors.textSoft}
                style={{
                  minHeight: 58,
                  borderRadius: tokens.radius.lg,
                  borderCurve: "continuous",
                  borderWidth: 1,
                  borderColor: tokens.colors.border,
                  backgroundColor: tokens.colors.surfaceMuted,
                  color: tokens.colors.text,
                  fontSize: 16,
                  fontWeight: "800",
                  paddingHorizontal: tokens.spacing.md,
                }}
                textContentType="telephoneNumber"
                value={phone}
              />
            </FieldShell>

            <View style={{ gap: tokens.spacing.sm }}>
              <Button disabled={!isConfigured || isBusy} onPress={() => onSignIn(phone)}>
                {isBusy ? "Kod hazırlanıyor" : "SMS kodu gönder"}
              </Button>
              <Button
                disabled={!isConfigured || isBusy}
                onPress={() => onRegister(phone)}
                variant="secondary"
              >
                Yeni hesap için kod al
              </Button>
              <Button
                disabled={!isConfigured || isBusy || !isGoogleConfigured}
                onPress={onGoogleSignIn}
                variant="secondary"
              >
                Google ile devam et
              </Button>
            </View>

            <View style={{ flexDirection: "row", gap: tokens.spacing.sm }}>
              <View
                style={{
                  flex: 1,
                  borderRadius: tokens.radius.lg,
                  backgroundColor: tokens.colors.surfaceMuted,
                  padding: tokens.spacing.md,
                  gap: 5,
                }}
              >
                <Text style={{ color: tokens.colors.text, fontSize: 13, fontWeight: "900" }}>
                  Google
                </Text>
                <Text style={{ color: tokens.colors.textMuted, fontSize: 12 }}>
                  {isGoogleConfigured ? "Hazır" : "Kurulum bekliyor"}
                </Text>
              </View>
              <View
                style={{
                  flex: 1,
                  borderRadius: tokens.radius.lg,
                  backgroundColor: tokens.colors.surfaceMuted,
                  padding: tokens.spacing.md,
                  gap: 5,
                }}
              >
                <Text style={{ color: tokens.colors.text, fontSize: 13, fontWeight: "900" }}>
                  Apple
                </Text>
                <Text style={{ color: tokens.colors.textMuted, fontSize: 12 }}>Sonraki adım</Text>
              </View>
            </View>
          </View>
        )}

        <Text style={{ color: tokens.colors.textMuted, fontSize: 13, lineHeight: 19 }}>
          Çıkış yaptıktan sonra tekrar girişte yeni doğrulama kodu istenir.
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
      <View style={{ flexDirection: "row", gap: tokens.spacing.md }}>
        <View
          style={{
            width: 48,
            height: 48,
            borderRadius: 18,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: tokens.colors.infoSoft,
          }}
        >
          <ShieldCheck color={tokens.colors.primary} size={22} />
        </View>
        <View style={{ flex: 1, gap: 7 }}>
          <Text style={{ color: tokens.colors.text, fontSize: 20, fontWeight: "900" }}>
            {title}
          </Text>
          <Text style={{ color: tokens.colors.textMuted, fontSize: 14, lineHeight: 20 }}>
            {body}
          </Text>
        </View>
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
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <AlertCircle color={tokens.colors.warning} size={22} />
          <Text style={{ color: tokens.colors.text, fontSize: 18, fontWeight: "900" }}>
            Profil bilgileri bekleniyor
          </Text>
        </View>
        <Text style={{ color: tokens.colors.textMuted, fontSize: 14, lineHeight: 20 }}>
          {message ?? "Hesabın doğrulandı. Profil bilgilerini tekrar almayı deneyebilirsin."}
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
      <View style={{ gap: tokens.spacing.lg }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <View
            style={{
              width: 54,
              height: 54,
              borderRadius: 20,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: tokens.colors.warningSoft,
            }}
          >
            <UserRound color={tokens.colors.warning} size={24} />
          </View>
          <View style={{ flex: 1, gap: 3 }}>
            <Text style={{ color: tokens.colors.text, fontSize: 22, fontWeight: "900" }}>
              Hesabını tamamla
            </Text>
            <Text style={{ color: tokens.colors.textMuted, fontSize: 13, lineHeight: 18 }}>
              Tam deneyim için birkaç bilgi gerekiyor.
            </Text>
          </View>
        </View>

        {(["displayName", "email", "phone"] as AccountCompletionField[]).map((field) => (
          <FieldShell key={field} label={completionLabels[field]}>
            <TextInput
              autoCapitalize={field === "email" ? "none" : "words"}
              keyboardType={field === "phone" ? "phone-pad" : "default"}
              onChangeText={(value) => setForm((current) => ({ ...current, [field]: value }))}
              placeholder={completionLabels[field]}
              placeholderTextColor={tokens.colors.textSoft}
              style={{
                minHeight: 54,
                borderRadius: tokens.radius.lg,
                borderCurve: "continuous",
                borderWidth: 1,
                borderColor: missingFields.includes(field)
                  ? tokens.colors.warning
                  : tokens.colors.border,
                backgroundColor: tokens.colors.surfaceMuted,
                color: tokens.colors.text,
                fontSize: 15,
                fontWeight: "700",
                paddingHorizontal: tokens.spacing.md,
              }}
              value={form[field]}
            />
          </FieldShell>
        ))}

        <View
          style={{
            borderRadius: tokens.radius.lg,
            backgroundColor: tokens.colors.warningSoft,
            padding: tokens.spacing.md,
          }}
        >
          <Text style={{ color: tokens.colors.warning, fontSize: 13, lineHeight: 19 }}>
            Bekleyen alanlar:{" "}
            {missingFields.map((field) => completionLabels[field]).join(", ") || "Yok"}
          </Text>
        </View>
        <Button disabled>Bilgileri kaydetme yakında aktif olacak</Button>
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
      <View style={{ gap: tokens.spacing.lg }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <View
            style={{
              width: 52,
              height: 52,
              borderRadius: 20,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: isAuthenticated ? tokens.colors.warningSoft : tokens.colors.infoSoft,
            }}
          >
            {isAuthenticated ? (
              <AlertCircle color={tokens.colors.warning} size={23} />
            ) : (
              <CheckCircle2 color={tokens.colors.primary} size={23} />
            )}
          </View>
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={{ color: tokens.colors.text, fontSize: 21, fontWeight: "900" }}>
              {isAuthenticated ? "Hesabını tamamla" : "Giriş yap, keşif açılsın"}
            </Text>
            <Text style={{ color: tokens.colors.textMuted, fontSize: 14, lineHeight: 20 }}>
              {isAuthenticated
                ? "Keşfet, arama ve favoriler için profil bilgilerini tamamla."
                : "Yerel işletmeleri, kampanyaları ve QR profilleri hesabınla takip et."}
            </Text>
          </View>
        </View>
        <Link href="/(tabs)/profil" asChild>
          <Button>{isAuthenticated ? "Hesabı tamamla" : "Giriş Yap"}</Button>
        </Link>
      </View>
    </SurfaceCard>
  );
}
