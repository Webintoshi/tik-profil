import { useState, type ReactNode } from "react";
import { Link } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import {
  AlertCircle,
  CheckCircle2,
  LockKeyhole,
  MessageCircle,
  ShieldCheck,
  Sparkles,
  UserRound,
} from "lucide-react-native";
import { Text, TextInput, View } from "react-native";
import {
  formatTurkishPhoneInput,
  isLikelyTurkishMobilePhone,
} from "@/auth/phone-input";
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
  errorMessage?: null | string;
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
  errorMessage,
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
  const canSubmitPhone = isConfigured && !isBusy && isLikelyTurkishMobilePhone(phone);

  return (
    <View style={{ gap: tokens.spacing.lg }}>
      <LinearGradient
        colors={["#07182D", "#0B3A68", "#0E7DB7"]}
        style={{
          minHeight: 250,
          borderRadius: 36,
          borderCurve: "continuous",
          overflow: "hidden",
          padding: 24,
          gap: tokens.spacing.lg,
          justifyContent: "space-between",
          boxShadow: tokens.shadow.strong,
        }}
      >
        <View
          style={{
            position: "absolute",
            right: -44,
            top: -48,
            width: 170,
            height: 170,
            borderRadius: 85,
            backgroundColor: "rgba(22,164,224,0.28)",
          }}
        />
        <View
          style={{
            position: "absolute",
            left: -30,
            bottom: -54,
            width: 190,
            height: 190,
            borderRadius: 95,
            backgroundColor: "rgba(255,194,71,0.20)",
          }}
        />
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <View
            style={{
              width: 62,
              height: 62,
              borderRadius: 24,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "rgba(255,255,255,0.16)",
              borderWidth: 1,
              borderColor: "rgba(255,255,255,0.16)",
            }}
          >
            <LockKeyhole color={tokens.colors.white} size={27} />
          </View>
          <View
            style={{
              borderRadius: tokens.radius.pill,
              backgroundColor: "rgba(255,255,255,0.14)",
              paddingHorizontal: 12,
              paddingVertical: 8,
            }}
          >
            <Text style={{ color: tokens.colors.white, fontSize: 12, fontWeight: "900" }}>
              Güvenli giriş
            </Text>
          </View>
        </View>
        <View style={{ gap: 8 }}>
          <Text
            style={{
              color: tokens.colors.white,
              fontSize: 35,
              fontWeight: "900",
              letterSpacing: -0.9,
              lineHeight: 39,
            }}
          >
            Tık Profil'e hoş geldin
          </Text>
          <Text style={{ color: "rgba(255,255,255,0.80)", fontSize: 16, lineHeight: 23 }}>
            Telefon numaranla uygulamadan çıkmadan güvenli giriş yap. Kod doğrulandıktan sonra hesabın hazırlanır.
          </Text>
        </View>
      </LinearGradient>

      <SurfaceCard>
        {pendingOtp ? (
          <View style={{ gap: tokens.spacing.lg }}>
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
                  minHeight: 62,
                  borderRadius: 24,
                  borderCurve: "continuous",
                  borderWidth: 1.5,
                  borderColor: tokens.colors.accent,
                  backgroundColor: tokens.colors.white,
                  color: tokens.colors.text,
                  fontSize: 24,
                  fontVariant: ["tabular-nums"],
                  fontWeight: "900",
                  letterSpacing: 6,
                  paddingHorizontal: 18,
                }}
                textContentType="oneTimeCode"
                value={code}
              />
            </FieldShell>
            {errorMessage ? (
              <View
                style={{
                  borderRadius: tokens.radius.lg,
                  backgroundColor: tokens.colors.dangerSoft,
                  padding: tokens.spacing.md,
                }}
              >
                <Text style={{ color: tokens.colors.danger, fontSize: 13, fontWeight: "800", lineHeight: 19 }}>
                  {errorMessage}
                </Text>
              </View>
            ) : null}
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
          <View style={{ gap: tokens.spacing.lg }}>
            <View style={{ gap: 6 }}>
              <Text style={{ color: tokens.colors.text, fontSize: 25, fontWeight: "900" }}>
                Telefon ile devam et
              </Text>
              <Text style={{ color: tokens.colors.textMuted, fontSize: 15, lineHeight: 22 }}>
                Şifre gerekmez. Sana gelen tek kullanımlık kodla giriş yap.
              </Text>
            </View>

            <FieldShell label="Cep telefonu">
              <TextInput
                autoCorrect={false}
                editable={!isBusy}
                keyboardType="phone-pad"
                onChangeText={(value) => setPhone(formatTurkishPhoneInput(value))}
                placeholder="05XX XXX XX XX"
                placeholderTextColor={tokens.colors.textSoft}
                style={{
                  minHeight: 62,
                  borderRadius: 24,
                  borderCurve: "continuous",
                  borderWidth: 1.5,
                  borderColor: isLikelyTurkishMobilePhone(phone)
                    ? tokens.colors.accent
                    : tokens.colors.border,
                  backgroundColor: tokens.colors.white,
                  color: tokens.colors.text,
                  fontSize: 20,
                  fontVariant: ["tabular-nums"],
                  fontWeight: "900",
                  letterSpacing: 0.3,
                  paddingHorizontal: 18,
                }}
                textContentType="telephoneNumber"
                value={phone}
              />
            </FieldShell>

            {errorMessage ? (
              <View
                style={{
                  borderRadius: tokens.radius.lg,
                  backgroundColor: tokens.colors.dangerSoft,
                  padding: tokens.spacing.md,
                }}
              >
                <Text style={{ color: tokens.colors.danger, fontSize: 13, fontWeight: "800", lineHeight: 19 }}>
                  {errorMessage}
                </Text>
              </View>
            ) : null}

            <View style={{ gap: tokens.spacing.sm }}>
              <Button disabled={!canSubmitPhone} onPress={() => onSignIn(phone)}>
                {isBusy ? "Kod hazırlanıyor" : "Telefon ile giriş yap"}
              </Button>
              <Button
                disabled={!canSubmitPhone}
                onPress={() => onRegister(phone)}
                variant="secondary"
              >
                Yeni hesap oluştur
              </Button>
              <Button
                disabled={!isConfigured || isBusy || !isGoogleConfigured}
                onPress={onGoogleSignIn}
                variant="secondary"
              >
                {isGoogleConfigured ? "Google ile devam et" : "Google ile devam et (Yakında)"}
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
                  {isGoogleConfigured ? "Hazır" : "Yakında"}
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
      </SurfaceCard>

      <View
        style={{
          borderRadius: tokens.radius.lg,
          backgroundColor: tokens.colors.successSoft,
          flexDirection: "row",
          gap: tokens.spacing.sm,
          padding: tokens.spacing.md,
        }}
      >
        <Sparkles color={tokens.colors.success} size={18} />
        <Text style={{ color: tokens.colors.success, flex: 1, fontSize: 13, fontWeight: "800", lineHeight: 19 }}>
          Çıkış yaptıktan sonra tekrar girişte yeni doğrulama kodu istenir.
        </Text>
      </View>
    </View>
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
