import { Tabs } from "expo-router";

import { MakyajTabBar } from "@/components/navigation/MakyajTabBar";
import { colors } from "@/theme/tokens";
import { useThemeMode } from "@/theme/theme-store";

export default function TabsLayout() {
  useThemeMode();

  return (
    <Tabs
      tabBar={(props) => <MakyajTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.brandDeep,
        tabBarInactiveTintColor: colors.tabInactive
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Ana Sayfa" }} />
      <Tabs.Screen name="explore" options={{ title: "Ke\u015ffet" }} />
      <Tabs.Screen name="favorites" options={{ title: "Favoriler" }} />
      <Tabs.Screen name="account" options={{ title: "Hesab\u0131m" }} />
      <Tabs.Screen name="business/[slug]" options={{ href: null, title: "\u0130\u015fletme" }} />
    </Tabs>
  );
}
