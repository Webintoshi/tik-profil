import { Link } from "expo-router";
import { CheckCircle2, ChevronRight, LogOut, Settings, ShieldCheck, UserRound } from "lucide-react-native";
import { Pressable, Text, View } from "react-native";
import {
  AccountCompletionPanel,
  AuthLandingPanel,
  AuthSyncPanel,
  ProfileWarningPanel,
} from "@/components/auth/customer-auth-panels";
import { Button } from "@/components/ui/button";
import { SurfaceCard } from "@/components/ui/surface-card";
import { ActionTile } from "@/components/v2/action-tile";
import { AppScreen } from "@/components/v2/app-screen";
import { SectionTitle } from "@/components/v2/section-title";
import { useCustomerAuth } from "@/providers/customer-auth-provider";
import { getAuthFlowDisplayCopy } from "@/auth/login-flow-state";
import { tokens } from "@/theme/tokens";

function getAccountStatusLabel(isComplete: boolean): string {
  return isComplete ? "Hazır" : "Tamamlanıyor";
}
export default function ProfileScreen() {
  const {
    accountCompletion,
    authFlowStatus,
    backendStatus,
    customerAccount,
    customerIdentity,
    errorMessage,
    isAuthenticated,
    isBackendSessionReady,
    isBusy,
    isConfigured,
    isGoogleConfigured,
    limitationMessage,
    cancelOtp,
    pendingOtp,
    profileWarningMessage,
    register,
    refreshCustomerProfile,
    signIn,
    signInWithGoogle,
    signOut,
    verifyOtp,
  } = useCustomerAuth();
  const authFlowCopy = getAuthFlowDisplayCopy({
    errorMessage,
    status: authFlowStatus,
  });
  const isPreparingLogin =
    authFlowStatus === "startingLogin" ||
    authFlowStatus === "awaitingCallback" ||
    authFlowStatus === "syncingBackendSession";

  return (
    <AppScreen
      header={
        <View style={{ gap: tokens.spacing.sm }}>
          <SectionTitle
            eyebrow="Hesap"
            title={isAuthenticated ? "Profilin" : "Tık Profil hesabı"}
            subtitle={
              isAuthenticated
                ? "Favoriler, QR ve kişisel ayarlar burada."
                : "Keşif deneyimini kişiselleştirmek için güvenli giriş yap."
            }
          />
        </View>
      }
    >
      {!isAuthenticated && isPreparingLogin ? (
        <AuthSyncPanel body={authFlowCopy?.body} title={authFlowCopy?.title} />
      ) : null}

      {!isAuthenticated && !isPreparingLogin ? (
        <AuthLandingPanel
          isBusy={isBusy}
          isConfigured={isConfigured}
          isGoogleConfigured={isGoogleConfigured}
          onCancelOtp={cancelOtp}
          onGoogleSignIn={() => void signInWithGoogle()}
          onRegister={(identifier) => void register(identifier)}
          onSignIn={(identifier) => void signIn(identifier)}
          onVerifyOtp={(code) => void verifyOtp(code)}
          pendingOtp={pendingOtp}
        />
      ) : null}

      {isAuthenticated && backendStatus === "loading" ? <AuthSyncPanel /> : null}

      {isAuthenticated && backendStatus === "profile-warning" ? (
        <ProfileWarningPanel
          message={profileWarningMessage}
          onRetry={() => void refreshCustomerProfile()}
        />
      ) : null}

      {isAuthenticated && backendStatus === "ready" && !accountCompletion.isComplete ? (
        <AccountCompletionPanel
          displayName={customerAccount?.displayName ?? customerIdentity?.displayName}
          email={customerAccount?.email ?? customerIdentity?.email}
          missingFields={accountCompletion.missingFields}
          phone={customerAccount?.phone}
        />
      ) : null}

      {isAuthenticated && backendStatus === "disconnected" ? (
        <SurfaceCard>
          <View style={{ gap: tokens.spacing.md }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <ShieldCheck color={tokens.colors.warning} size={22} />
              <Text style={{ color: tokens.colors.text, fontSize: 19, fontWeight: "900" }}>
                Oturum doğrulanıyor
              </Text>
            </View>
            <Text style={{ color: tokens.colors.textMuted, fontSize: 14, lineHeight: 20 }}>
              {limitationMessage ?? "Güvenli oturum hazırlanıyor, lütfen bekleyin."}
            </Text>
            <Button onPress={() => void refreshCustomerProfile()} variant="secondary">
              Tekrar dene
            </Button>
          </View>
        </SurfaceCard>
      ) : null}

      {isAuthenticated && isBackendSessionReady ? (
        <SurfaceCard>
          <View style={{ gap: tokens.spacing.lg }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
              <View
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 24,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: tokens.colors.infoSoft,
                }}
              >
                <UserRound color={tokens.colors.primary} size={30} />
              </View>
              <View style={{ flex: 1, gap: 5 }}>
                <Text
                  numberOfLines={1}
                  style={{ color: tokens.colors.text, fontSize: 23, fontWeight: "900" }}
                >
                  {customerAccount?.displayName ?? customerIdentity?.displayName ?? "Tık Profil müşterisi"}
                </Text>
                <Text selectable style={{ color: tokens.colors.textMuted, fontSize: 14 }}>
                  {customerAccount?.email ?? customerIdentity?.identifier ?? "E-posta bekleniyor"}
                </Text>
              </View>
            </View>

            <View
              style={{
                borderRadius: tokens.radius.lg,
                backgroundColor: accountCompletion.isComplete
                  ? tokens.colors.successSoft
                  : tokens.colors.warningSoft,
                flexDirection: "row",
                alignItems: "center",
                gap: 10,
                padding: tokens.spacing.md,
              }}
            >
              {accountCompletion.isComplete ? (
                <CheckCircle2 color={tokens.colors.success} size={20} />
              ) : (
                <ShieldCheck color={tokens.colors.warning} size={20} />
              )}
              <Text
                style={{
                  color: accountCompletion.isComplete
                    ? tokens.colors.success
                    : tokens.colors.warning,
                  fontSize: 14,
                  fontWeight: "900",
                }}
              >
                Hesap durumu: {getAccountStatusLabel(accountCompletion.isComplete)}
              </Text>
            </View>

            <View style={{ flexDirection: "row", gap: tokens.spacing.sm }}>
              <ActionTile
                icon={<Settings color={tokens.colors.primary} size={18} />}
                label="Ayarlar"
                meta="Güvenlik"
                onPress={() => undefined}
              />
              <ActionTile
                icon={<UserRound color={tokens.colors.success} size={18} />}
                label="Profil"
                meta={accountCompletion.isComplete ? "Hazır" : "Eksik bilgi"}
                tone="green"
              />
            </View>
          </View>
        </SurfaceCard>
      ) : null}

      {profileWarningMessage ? (
        <Text style={{ color: tokens.colors.warning, fontSize: 14, lineHeight: 20 }}>
          {profileWarningMessage}
        </Text>
      ) : null}

      {errorMessage && backendStatus === "error" ? (
        <Text style={{ color: tokens.colors.danger, fontSize: 14, lineHeight: 20 }}>
          {errorMessage}
        </Text>
      ) : null}

      {isAuthenticated ? (
        <SurfaceCard>
          <View style={{ gap: tokens.spacing.md }}>
            <Text style={{ color: tokens.colors.text, fontSize: 18, fontWeight: "900" }}>
              Hesap işlemleri
            </Text>
            <Button disabled={isBusy} onPress={() => void signOut()} variant="secondary">
              {isBusy ? "Çıkış yapılıyor" : "Çıkış yap"}
            </Button>
            <Link href="/settings" asChild>
              <Pressable
                style={({ pressed }) => ({
                  minHeight: 56,
                  borderRadius: tokens.radius.lg,
                  borderCurve: "continuous",
                  borderWidth: 1,
                  borderColor: tokens.colors.border,
                  backgroundColor: tokens.colors.surfaceMuted,
                  justifyContent: "center",
                  paddingHorizontal: tokens.spacing.lg,
                  opacity: pressed ? 0.88 : 1,
                })}
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    width: "100%",
                  }}
                >
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                    <LogOut color={tokens.colors.primary} size={18} />
                    <Text style={{ color: tokens.colors.text, fontSize: 16, fontWeight: "900" }}>
                      Ayarlar
                    </Text>
                  </View>
                  <ChevronRight color={tokens.colors.textSoft} size={18} />
                </View>
              </Pressable>
            </Link>
          </View>
        </SurfaceCard>
      ) : null}
    </AppScreen>
  );
}
