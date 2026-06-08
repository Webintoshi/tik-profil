import { Link } from "expo-router";
import { CheckCircle2, ChevronRight, ShieldCheck, UserRound } from "lucide-react-native";
import { Pressable, Text, View } from "react-native";
import {
  AccountCompletionPanel,
  AuthLandingPanel,
  AuthSyncPanel,
  ProfileWarningPanel,
} from "@/components/auth/customer-auth-panels";
import { AppScrollScreen } from "@/components/layout/app-scroll-screen";
import { Button } from "@/components/ui/button";
import { SectionHeader } from "@/components/ui/section-header";
import { SurfaceCard } from "@/components/ui/surface-card";
import { useCustomerAuth } from "@/providers/customer-auth-provider";
import { tokens } from "@/theme/tokens";

export default function ProfileScreen() {
  const {
    accountCompletion,
    backendStatus,
    customerAccount,
    customerIdentity,
    errorMessage,
    isAuthenticated,
    isBackendSessionReady,
    isBusy,
    isConfigured,
    limitationMessage,
    profileWarningMessage,
    refreshCustomerProfile,
    signIn,
    signOut,
  } = useCustomerAuth();

  return (
    <AppScrollScreen
      header={
        <SectionHeader
          title={isAuthenticated ? "Hesabım" : "Giriş Yap"}
          subtitle={
            isAuthenticated
              ? "Müşteri oturumu, profil durumu ve hesap tamamlama akışı."
              : "Tık Profil'i kullanmak için giriş yap veya yeni hesap oluştur."
          }
        />
      }
    >
      {!isAuthenticated ? (
        <AuthLandingPanel
          isBusy={isBusy}
          isConfigured={isConfigured}
          onSignIn={() => void signIn()}
        />
      ) : null}

      {isAuthenticated && backendStatus === "loading" ? (
        <AuthSyncPanel />
      ) : null}

      {isAuthenticated && backendStatus === "profile-warning" ? (
        <ProfileWarningPanel
          message={profileWarningMessage}
          onRetry={() => void refreshCustomerProfile()}
        />
      ) : null}

      {isAuthenticated &&
      backendStatus === "ready" &&
      !accountCompletion.isComplete ? (
        <AccountCompletionPanel
          displayName={customerAccount?.displayName ?? customerIdentity?.displayName}
          email={customerAccount?.email ?? customerIdentity?.email}
          missingFields={accountCompletion.missingFields}
          phone={customerAccount?.phone}
        />
      ) : null}

      {isAuthenticated && backendStatus === "disconnected" ? (
        <SurfaceCard>
          <Text style={{ color: tokens.colors.warning, fontSize: 18, fontWeight: "800" }}>
            Oturum doğrulanıyor
          </Text>
          <Text style={{ color: tokens.colors.textMuted, fontSize: 14, lineHeight: 20 }}>
            {limitationMessage ??
              "Backend müşteri oturumu henüz doğrulanamadı. Birkaç saniye sonra tekrar deneyebilirsin."}
          </Text>
          <Button onPress={() => void refreshCustomerProfile()} variant="secondary">
            Tekrar dene
          </Button>
        </SurfaceCard>
      ) : null}

      {isAuthenticated && isBackendSessionReady ? (
        <SurfaceCard>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
            <View
              style={{
                width: 56,
                height: 56,
                borderRadius: 20,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: "#EAF3FC",
              }}
            >
              <UserRound color={tokens.colors.primary} size={26} />
            </View>
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={{ color: tokens.colors.text, fontSize: 20, fontWeight: "800" }}>
                {customerAccount?.displayName ?? customerIdentity?.displayName ?? "Müşteri"}
              </Text>
              <Text selectable style={{ color: tokens.colors.textMuted, fontSize: 14 }}>
                {customerAccount?.email ?? customerIdentity?.identifier ?? "Mail bekleniyor"}
              </Text>
            </View>
          </View>
        </SurfaceCard>
      ) : null}

      {isAuthenticated && isBackendSessionReady ? (
        <SurfaceCard>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            {accountCompletion.isComplete ? (
              <CheckCircle2 color={tokens.colors.success} size={19} />
            ) : (
              <ShieldCheck color={tokens.colors.warning} size={19} />
            )}
            <Text style={{ color: tokens.colors.text, fontSize: 16, fontWeight: "800" }}>
              Hesap durumu
            </Text>
          </View>
          <Text style={{ color: tokens.colors.textMuted, fontSize: 14, lineHeight: 20 }}>
            {accountCompletion.isComplete
              ? "Hesap tamamlandı. Keşfet, arama ve favori ekranlarına tam erişim açık."
              : "Tam erişim için ad soyad, mail adresi ve telefon numarası tamamlanmalı."}
          </Text>
          <Text selectable style={{ color: tokens.colors.textMuted, fontSize: 14, lineHeight: 20 }}>
            Backend sync: {backendStatus}
          </Text>
          {profileWarningMessage ? (
            <Text style={{ color: tokens.colors.warning, fontSize: 14, lineHeight: 20 }}>
              {profileWarningMessage}
            </Text>
          ) : null}
          {limitationMessage ? (
            <Text style={{ color: tokens.colors.warning, fontSize: 14, lineHeight: 20 }}>
              {limitationMessage}
            </Text>
          ) : null}
          {errorMessage && backendStatus === "error" ? (
            <Text style={{ color: tokens.colors.danger, fontSize: 14, lineHeight: 20 }}>
              {errorMessage}
            </Text>
          ) : null}
        </SurfaceCard>
      ) : null}

      {isAuthenticated ? (
        <SurfaceCard>
          <Text style={{ color: tokens.colors.text, fontSize: 16, fontWeight: "800" }}>
            Oturum
          </Text>
          <Button disabled={isBusy} onPress={() => void signOut()} variant="secondary">
            {isBusy ? "Çıkış yapılıyor" : "Çıkış yap"}
          </Button>
          <Link href="/settings" asChild>
            <Pressable
              style={{
                minHeight: 54,
                borderRadius: tokens.radius.md,
                borderCurve: "continuous",
                borderWidth: 1,
                borderColor: tokens.colors.border,
                backgroundColor: tokens.colors.surfaceMuted,
                justifyContent: "center",
                paddingHorizontal: tokens.spacing.lg,
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  width: "100%",
                }}
              >
                <Text style={{ color: tokens.colors.text, fontSize: 16, fontWeight: "700" }}>
                  Ayarlar
                </Text>
                <ChevronRight color={tokens.colors.textSoft} size={18} />
              </View>
            </Pressable>
          </Link>
        </SurfaceCard>
      ) : null}
    </AppScrollScreen>
  );
}
