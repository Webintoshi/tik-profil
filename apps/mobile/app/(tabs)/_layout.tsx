import { Tabs } from "expo-router";
import { Compass, Heart, QrCode, Search, UserRound } from "lucide-react-native";
import { tokens } from "@/theme/tokens";

const iconSize = 21;

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: tokens.colors.canvas },
        headerTintColor: tokens.colors.text,
        headerShadowVisible: false,
        tabBarActiveTintColor: tokens.colors.accent,
        tabBarInactiveTintColor: tokens.colors.textSoft,
        tabBarStyle: {
          height: 80,
          paddingTop: 10,
          backgroundColor: tokens.colors.surfaceInk,
          borderTopWidth: 0,
          boxShadow: "0 -16px 34px rgba(7, 24, 45, 0.16)",
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "900",
          marginBottom: 6,
        },
      }}
    >
      <Tabs.Screen
        name="kesfet"
        options={{
          title: "Keşfet",
          tabBarIcon: ({ color }) => <Compass color={color} size={iconSize} />,
        }}
      />
      <Tabs.Screen
        name="ara"
        options={{
          title: "Ara",
          tabBarIcon: ({ color }) => <Search color={color} size={iconSize} />,
        }}
      />
      <Tabs.Screen
        name="qr"
        options={{
          title: "QR",
          tabBarIcon: ({ color }) => <QrCode color={color} size={iconSize} />,
        }}
      />
      <Tabs.Screen
        name="favoriler"
        options={{
          title: "Favoriler",
          tabBarIcon: ({ color }) => <Heart color={color} size={iconSize} />,
        }}
      />
      <Tabs.Screen
        name="profil"
        options={{
          title: "Profil",
          tabBarIcon: ({ color }) => <UserRound color={color} size={iconSize} />,
        }}
      />
    </Tabs>
  );
}
