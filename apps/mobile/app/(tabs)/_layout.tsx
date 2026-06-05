import { Tabs } from "expo-router";
import {
  Compass,
  Heart,
  QrCode,
  Search,
  UserRound,
} from "lucide-react-native";
import { tokens } from "@/theme/tokens";

const iconSize = 20;

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: tokens.colors.surface },
        headerTintColor: tokens.colors.text,
        headerShadowVisible: false,
        tabBarActiveTintColor: tokens.colors.primary,
        tabBarInactiveTintColor: tokens.colors.textSoft,
        tabBarStyle: {
          height: 74,
          paddingTop: 8,
          backgroundColor: tokens.colors.surface,
          borderTopColor: tokens.colors.border,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "700",
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
