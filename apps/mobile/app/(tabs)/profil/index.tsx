import { Link } from "expo-router";
import { ChevronRight, ShieldCheck, UserRound } from "lucide-react-native";
import { Pressable, Text, View } from "react-native";
import { AppScrollScreen } from "@/components/layout/app-scroll-screen";
import { Button } from "@/components/ui/button";
import { SectionHeader } from "@/components/ui/section-header";
import { SurfaceCard } from "@/components/ui/surface-card";
import { useAppSession } from "@/providers/app-session-provider";
import { useCustomerAuth } from "@/providers/customer-auth-provider";
import { tokens } from "@/theme/tokens";

export default function ProfileScreen() {
  const { selectedLocation } = useAppSession();
  const {
    backendStatus,
    customerAccount,
    customerIdentity,
    customerSession,
    errorMessage,
    isAuthenticated,
    isBackendSessionReady,
    isBusy,
    isConfigured,
    isInitialized,
    limitationMessage,
    signIn,
    signOut,
  } = useCustomerAuth();

  return (
    <AppScrollScreen
      header={
        <SectionHeader
          title={isAuthenticated ? "Profil ve oturum" : "Musteri girisi"}
          subtitle={
            isAuthenticated
              ? "Yerel Logto kimligi ve backend customer session durumu birlikte raporlanir."
              : "Bu sekme Expo customer Logto girisini ve backend customer bridge sonucunu dogrular."
          }
        />
      }
    >
      <SurfaceCard>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
          <View
            style={{
              width: 52,
              height: 52,
              borderRadius: 18,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "#EAF3FC",
            }}
          >
            <UserRound color={tokens.colors.primary} size={24} />
          </View>
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={{ color: tokens.colors.text, fontSize: 18, fontWeight: "700" }}>
              {customerIdentity?.displayName ?? "Misafir mod"}
            </Text>
            <Text style={{ color: tokens.colors.textMuted, fontSize: 14 }}>
              {customerIdentity?.identifier ??
                (isConfigured
                  ? "Customer actor bu cihazda native Logto ile acilabilir."
                  : "Bu build icin mobile auth config henuz hazir degil.")}
            </Text>
          </View>
        </View>
      </SurfaceCard>

      <SurfaceCard>
        <Text style={{ color: tokens.colors.text, fontSize: 16, fontWeight: "700" }}>
          Oturum aksiyonlari
        </Text>
        {!isAuthenticated ? (
          <>
            <Button disabled={!isConfigured || isBusy} onPress={() => void signIn()}>
              {isBusy ? "Giris baslatiliyor" : "Giris Yap"}
            </Button>
            <Button disabled variant="secondary">
              Google ile devam et (Yakinda)
            </Button>
            <Button disabled variant="secondary">
              Apple ile devam et (Yakinda)
            </Button>
            <Text style={{ color: tokens.colors.textMuted, fontSize: 13, lineHeight: 20 }}>
              Google ve Apple connector kurulumu bu branchte sadece placeholder olarak tutuldu.
            </Text>
          </>
        ) : (
          <>
            <Button disabled={isBusy} onPress={() => void signOut()} variant="secondary">
              {isBusy ? "Cikis yapiliyor" : "Cikis yap"}
            </Button>
            <Text style={{ color: tokens.colors.textMuted, fontSize: 13, lineHeight: 20 }}>
              Native Logto oturumu cihazda tutulur. Backend customer cookie oturumu ayni akista
              ayrica dogrulanir.
            </Text>
          </>
        )}
      </SurfaceCard>

      <SurfaceCard>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <ShieldCheck color={tokens.colors.primary} size={18} />
          <Text style={{ color: tokens.colors.text, fontSize: 16, fontWeight: "700" }}>
            Backend senkronu
          </Text>
        </View>
        <Text selectable style={{ color: tokens.colors.textMuted, fontSize: 14, lineHeight: 20 }}>
          Init: {isInitialized ? "tamam" : "bekleniyor"}
        </Text>
        <Text selectable style={{ color: tokens.colors.textMuted, fontSize: 14, lineHeight: 20 }}>
          Local Logto: {isAuthenticated ? "bagli" : "yok"}
        </Text>
        <Text selectable style={{ color: tokens.colors.textMuted, fontSize: 14, lineHeight: 20 }}>
          Backend actor: {isAuthenticated ? "customer" : "misafir"}
        </Text>
        <Text selectable style={{ color: tokens.colors.textMuted, fontSize: 14, lineHeight: 20 }}>
          Backend durum: {backendStatus}
        </Text>
        {customerSession?.appUserId ? (
          <Text selectable style={{ color: tokens.colors.textMuted, fontSize: 14, lineHeight: 20 }}>
            Backend app user: {customerSession.appUserId}
          </Text>
        ) : null}
        {isBackendSessionReady && customerAccount ? (
          <>
            <Text style={{ color: tokens.colors.text, fontSize: 15, fontWeight: "700" }}>
              Hesap ozeti
            </Text>
            <Text style={{ color: tokens.colors.textMuted, fontSize: 14, lineHeight: 20 }}>
              Ad: {customerAccount.displayName ?? "Customer"}
            </Text>
            <Text style={{ color: tokens.colors.textMuted, fontSize: 14, lineHeight: 20 }}>
              E-posta: {customerAccount.email ?? "Yok"}
            </Text>
            <Text style={{ color: tokens.colors.textMuted, fontSize: 14, lineHeight: 20 }}>
              Cuzdan puani: {customerAccount.wallet?.points ?? 0}
            </Text>
          </>
        ) : null}
        {limitationMessage ? (
          <Text style={{ color: tokens.colors.warning, fontSize: 14, lineHeight: 20 }}>
            {limitationMessage}
          </Text>
        ) : null}
        {errorMessage ? (
          <Text style={{ color: tokens.colors.danger, fontSize: 14, lineHeight: 20 }}>
            {errorMessage}
          </Text>
        ) : null}
      </SurfaceCard>

      <SurfaceCard>
        <Text style={{ color: tokens.colors.text, fontSize: 16, fontWeight: "700" }}>
          Uygulama durumu
        </Text>
        <Text selectable style={{ color: tokens.colors.textMuted, fontSize: 14, lineHeight: 20 }}>
          Konum: {selectedLocation?.label ?? "Secilmedi"}
        </Text>
        <Text selectable style={{ color: tokens.colors.textMuted, fontSize: 14, lineHeight: 20 }}>
          Mobile auth hedefi: customer
        </Text>
      </SurfaceCard>

      <Link href="/settings" asChild>
        <Pressable
          style={{
            minHeight: 54,
            borderRadius: tokens.radius.md,
            borderCurve: "continuous",
            borderWidth: 1,
            borderColor: tokens.colors.border,
            backgroundColor: tokens.colors.surface,
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
    </AppScrollScreen>
  );
}
