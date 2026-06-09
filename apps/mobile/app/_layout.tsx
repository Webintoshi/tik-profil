import { Stack } from "expo-router";
import { AppSessionProvider } from "@/providers/app-session-provider";
import { CustomerAuthProvider } from "@/providers/customer-auth-provider";
import { NativeAppChrome } from "@/system/app-chrome";
import { tokens } from "@/theme/tokens";

export default function RootLayout() {
  return (
    <CustomerAuthProvider>
      <AppSessionProvider>
        <NativeAppChrome />
        <Stack
          screenOptions={{
            contentStyle: { backgroundColor: tokens.colors.canvas },
            headerStyle: { backgroundColor: tokens.colors.surface },
            headerTintColor: tokens.colors.text,
            headerShadowVisible: false,
          }}
        >
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="auth/callback" options={{ headerShown: false }} />
          <Stack.Screen name="(onboarding)" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="business/[slug]" options={{ title: "Isletme" }} />
          <Stack.Screen name="category/[slug]" options={{ title: "Kategori" }} />
          <Stack.Screen name="settings" options={{ title: "Ayarlar" }} />
        </Stack>
      </AppSessionProvider>
    </CustomerAuthProvider>
  );
}
