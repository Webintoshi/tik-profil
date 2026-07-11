import type { BottomTabBarProps } from "expo-router/build/react-navigation/bottom-tabs";
import { useEffect, useRef } from "react";
import { Animated, Easing, Platform, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Icon, type IconName } from "@/components/common/Icon";
import {
  BOTTOM_NAVIGATION_DOCK_HEIGHT,
  getBottomNavigationHeight,
  getBottomNavigationSafeBottom
} from "@/components/navigation/tab-bar-metrics";
import { colors, radii, typography } from "@/theme/tokens";
import { useThemeMode } from "@/theme/theme-store";
import { selectionImpact } from "@/utils/haptics";

const tabIcons: Record<string, IconName> = {
  account: "profile",
  explore: "compass",
  favorites: "heart",
  index: "home"
};

const tabLabels: Record<string, string> = {
  account: "Hesab\u0131m",
  explore: "Keşfet",
  favorites: "Favoriler",
  index: "Ana Sayfa"
};

export function MakyajTabBar({ navigation, state }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { isDark } = useThemeMode();
  const safeBottom = getBottomNavigationSafeBottom(insets.bottom);
  const dockHeight = BOTTOM_NAVIGATION_DOCK_HEIGHT;
  const barHeight = getBottomNavigationHeight(insets.bottom);
  const hiddenTabRoutes = new Set(["business/[slug]", "qr-scan"]);
  const visibleRoutes = state.routes.filter((route) => !hiddenTabRoutes.has(route.name));

  return (
    <View
      testID="bottom-tab-bar"
      style={{
        backgroundColor: colors.surface,
        borderTopColor: colors.border,
        borderTopWidth: 1,
        bottom: 0,
        height: barHeight,
        left: 0,
        pointerEvents: "box-none",
        position: "absolute",
        right: 0,
        boxShadow: isDark
          ? "0 -2px 8px rgba(0, 0, 0, 0.10)"
          : "0 -10px 24px rgba(0, 0, 0, 0.08)"
      }}
    >
      <View
        style={{
          alignItems: "center",
          bottom: safeBottom,
          height: dockHeight,
          justifyContent: "center",
          left: 0,
          position: "absolute",
          right: 0
        }}
      >
        <View
          style={{
            alignItems: "center",
            backgroundColor: "transparent",
            borderWidth: 0,
            flexDirection: "row",
            gap: 12,
            height: dockHeight,
            justifyContent: "space-between",
            paddingHorizontal: 20,
            width: "100%"
          }}
        >
          {visibleRoutes.map((route) => (
            <TabItem
              key={route.key}
              focused={state.routes[state.index]?.key === route.key}
              navigation={navigation}
              route={route}
            />
          ))}
        </View>
      </View>
    </View>
  );
}

function TabItem({
  focused,
  navigation,
  route
}: {
  focused: boolean;
  navigation: BottomTabBarProps["navigation"];
  route: BottomTabBarProps["state"]["routes"][number];
}) {
  const label = tabLabels[route.name] ?? route.name;
  const iconName = tabIcons[route.name] ?? "home";
  const activeWidth = getActiveWidth(route.name);
  const itemSize = 44;
  const progress = useRef(new Animated.Value(focused ? 1 : 0)).current;
  const pressScale = useRef(new Animated.Value(1)).current;

  const animatedWidth = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [itemSize, activeWidth]
  });
  const animatedBackground = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ["rgba(255,255,255,0)", colors.brand]
  });
  const animatedBorder = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ["rgba(255,255,255,0)", colors.brand]
  });
  const labelOpacity = progress.interpolate({
    inputRange: [0, 0.35, 1],
    outputRange: [0, 0.55, 1]
  });
  const labelTranslate = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [7, 0]
  });
  const labelWidth = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, activeWidth - 58]
  });
  const labelMargin = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 6]
  });
  useEffect(() => {
    Animated.timing(progress, {
      duration: 230,
      easing: Easing.bezier(0.2, 0, 0, 1),
      toValue: focused ? 1 : 0,
      useNativeDriver: false
    }).start();
  }, [focused, progress]);

  function animatePress(toValue: number) {
    Animated.spring(pressScale, {
      damping: 18,
      mass: 0.8,
      stiffness: 220,
      toValue,
      useNativeDriver: Platform.OS !== "web"
    }).start();
  }

  function onPress() {
    selectionImpact();
    const event = navigation.emit({
      canPreventDefault: true,
      target: route.key,
      type: "tabPress"
    });

    if (!focused && !event.defaultPrevented) {
      navigation.navigate(route.name);
    }
  }

  return (
    <Animated.View
      style={{
        transform: [{ scale: pressScale }]
      }}
    >
      <Pressable
        accessibilityLabel={label}
        accessibilityRole="button"
        accessibilityState={focused ? { selected: true } : {}}
        onPress={onPress}
        onPressIn={() => animatePress(0.96)}
        onPressOut={() => animatePress(1)}
        style={{
          alignItems: "center",
          borderRadius: radii.pill,
          height: itemSize,
          justifyContent: "center",
          overflow: "hidden",
        }}
      >
        <Animated.View
          style={{
            alignItems: "center",
            backgroundColor: animatedBackground,
            borderColor: animatedBorder,
            borderRadius: radii.pill,
            borderWidth: 1,
            flexDirection: "row",
            height: itemSize,
            justifyContent: "center",
            overflow: "hidden",
            paddingHorizontal: 10,
            width: animatedWidth
          }}
        >
          <Icon
            name={iconName}
            color={focused ? colors.onBrand : colors.mutedStrong}
            size={focused ? 21 : 22}
            strokeWidth={focused ? 2.7 : 2.35}
          />
          <Animated.Text
            numberOfLines={1}
            style={{
              ...typography.tab,
              color: colors.onBrand,
              fontSize: 11,
              lineHeight: 13,
              marginLeft: labelMargin,
              opacity: labelOpacity,
              textAlign: "center",
              transform: [{ translateX: labelTranslate }],
              width: labelWidth
            }}
          >
            {label}
          </Animated.Text>
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}

function getActiveWidth(routeName: string) {
  switch (routeName) {
    case "index":
      return 122;
    case "account":
      return 114;
    case "favorites":
      return 116;
    case "explore":
      return 102;
    default:
      return 88;
  }
}
