import { Redirect } from "expo-router";
import { View } from "react-native";
import { LoadingState } from "@/components/states/loading-state";
import { shouldShowLocationOnboarding } from "@/location/location-onboarding";
import { useAppSession } from "@/providers/app-session-provider";
import { useCustomerAuth } from "@/providers/customer-auth-provider";
import { tokens } from "@/theme/tokens";

export default function IndexRoute() {
  const { isHydrated, locationOnboardingStatus } = useAppSession();
  const { isInitialized } = useCustomerAuth();

  if (!isHydrated) {
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

  if (shouldShowLocationOnboarding({ locationOnboardingStatus })) {
    return <Redirect href="/(onboarding)/location-permission" />;
  }

  if (!isInitialized) {
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

  return <Redirect href="/(tabs)/kesfet" />;
}
