import { Redirect } from "expo-router";
import { View } from "react-native";
import { LoadingState } from "@/components/states/loading-state";
import { useAppSession } from "@/providers/app-session-provider";
import { useCustomerAuth } from "@/providers/customer-auth-provider";
import { tokens } from "@/theme/tokens";

export default function IndexRoute() {
  const { hasSeenIntro, isHydrated, selectedLocation } = useAppSession();
  const { canAccessFullApp, isAuthenticated, isInitialized } = useCustomerAuth();

  if (!isHydrated || !isInitialized) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          paddingHorizontal: tokens.spacing.lg,
          backgroundColor: tokens.colors.canvas,
        }}
      >
        <LoadingState label="Tık Profil hazırlanıyor..." />
      </View>
    );
  }

  if (!isAuthenticated || !canAccessFullApp) {
    return <Redirect href="/(tabs)/profil" />;
  }

  if (!hasSeenIntro) {
    return <Redirect href="/(onboarding)/intro" />;
  }

  if (!selectedLocation) {
    return <Redirect href="/(onboarding)/location-permission" />;
  }

  return <Redirect href="/(tabs)/kesfet" />;
}
