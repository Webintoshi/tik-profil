import { Tabs } from "expo-router";

import { Icon } from "@/components/common/Icon";
import { colors } from "@/theme/tokens";

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.navy,
        tabBarInactiveTintColor: colors.tabInactive,
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "700"
        },
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          height: 72,
          paddingBottom: 10,
          paddingTop: 8
        }
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Keşfet",
          tabBarIcon: ({ color }) => <Icon name="home" color={String(color)} size={23} />
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: "Arama",
          tabBarIcon: ({ color }) => <Icon name="search" color={String(color)} size={23} />
        }}
      />
      <Tabs.Screen
        name="favorites"
        options={{
          title: "Favoriler",
          tabBarIcon: ({ color }) => <Icon name="heart" color={String(color)} size={23} />
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: "Hesabım",
          tabBarIcon: ({ color }) => <Icon name="profile" color={String(color)} size={23} />
        }}
      />
    </Tabs>
  );
}
