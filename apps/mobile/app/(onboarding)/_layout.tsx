import { Stack } from "expo-router";

export default function OnboardingLayout() {
  return (
    <Stack
      screenOptions={{
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="intro" options={{ headerShown: false }} />
      <Stack.Screen
        name="location-permission"
        options={{ title: "Konum" }}
      />
      <Stack.Screen
        name="manual-location"
        options={{ title: "Konum seç" }}
      />
    </Stack>
  );
}
