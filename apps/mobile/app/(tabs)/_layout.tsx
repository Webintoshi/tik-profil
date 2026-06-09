import { Tabs } from "expo-router";
import { View } from "react-native";
import { Compass, Heart, QrCode, Search, UserRound } from "lucide-react-native";
import { tokens } from "@/theme/tokens";

const iconSize = 23;

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        headerStyle: { backgroundColor: tokens.colors.canvas },
        headerTintColor: tokens.colors.text,
        headerShadowVisible: false,
        tabBarActiveTintColor: tokens.colors.accent,
        tabBarInactiveTintColor: tokens.colors.textSoft,
        tabBarStyle: {
          position: "absolute",
          left: 14,
          right: 14,
          bottom: 14,
          height: 66,
          paddingTop: 8,
          paddingBottom: 7,
          borderRadius: 28,
          borderCurve: "continuous",
          backgroundColor: "rgba(7, 24, 45, 0.96)",
          borderTopWidth: 0,
          boxShadow: "0 18px 44px rgba(7, 24, 45, 0.30)",
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "900",
          marginBottom: 0,
        },
        tabBarBackground: () => (
          <View
            style={{
              flex: 1,
              borderRadius: 28,
              borderCurve: "continuous",
              borderWidth: 1,
              borderColor: "rgba(255,255,255,0.10)",
              overflow: "hidden",
            }}
          />
        ),
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
