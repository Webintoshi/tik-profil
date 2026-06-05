import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { AppSessionProvider } from "@/providers/app-session-provider";
import { tokens } from "@/theme/tokens";

export default function RootLayout() {
  return (
    <AppSessionProvider>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          contentStyle: { backgroundColor: tokens.colors.canvas },
          headerStyle: { backgroundColor: tokens.colors.surface },
          headerTintColor: tokens.colors.text,
          headerShadowVisible: false,
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="(onboarding)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="business/[slug]" options={{ title: "İşletme" }} />
        <Stack.Screen name="category/[slug]" options={{ title: "Kategori" }} />
        <Stack.Screen name="settings" options={{ title: "Ayarlar" }} />
      </Stack>
    </AppSessionProvider>
  );
}
