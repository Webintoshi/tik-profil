import { Tabs } from "expo-router";

import { MakyajTabBar } from "@/components/navigation/MakyajTabBar";
import { colors } from "@/theme/tokens";
import { useThemeMode } from "@/theme/theme-store";
import { selectionImpact } from "@/utils/haptics";

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
      screenListeners={{
        tabPress: () => selectionImpact()
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Keşfet"
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: "Ara"
        }}
      />
      <Tabs.Screen
        name="favorites"
        options={{
          title: "Favoriler"
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: "Hesabım"
        }}
      />
      <Tabs.Screen
        name="business/[slug]"
        options={{
          href: null,
          title: "İşletme"
        }}
      />
    </Tabs>
  );
}
