import "react-native-gesture-handler";
import "react-native-reanimated";

import { MaterialSymbols_300Light } from "@expo-google-fonts/material-symbols";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { DiscoveryProvider } from "@/state/discovery-store";
import { colors } from "@/theme/tokens";
import { ThemeProvider, useThemeMode } from "@/theme/theme-store";

SplashScreen.preventAutoHideAsync().catch(() => undefined);

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Jost_400Regular: require("@/assets/fonts/Jost-Regular.ttf"),
    Jost_500Medium: require("@/assets/fonts/Jost-Medium.ttf"),
    Jost_600SemiBold: require("@/assets/fonts/Jost-SemiBold.ttf"),
    Jost_700Bold: require("@/assets/fonts/Jost-Bold.ttf"),
    Jost_800ExtraBold: require("@/assets/fonts/Jost-ExtraBold.ttf"),
    MaterialSymbols_300Light
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync().catch(() => undefined);
    }
  }, [fontError, fontsLoaded]);

  if (!fontsLoaded && !fontError) {
    return (
      <View style={{ alignItems: "center", backgroundColor: colors.background, flex: 1, justifyContent: "center" }}>
        <ActivityIndicator color={colors.brandDeep} size="large" />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <AppShell />
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}

function AppShell() {
  const { isDark } = useThemeMode();

  return (
    <DiscoveryProvider>
      <Stack
        screenOptions={{
          contentStyle: { backgroundColor: colors.background },
          headerShown: false,
          animation: "slide_from_right"
        }}
      />
      <StatusBar style={isDark ? "light" : "dark"} />
    </DiscoveryProvider>
  );
}
