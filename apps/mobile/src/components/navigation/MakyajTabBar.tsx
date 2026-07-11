import type { BottomTabBarProps } from "expo-router/build/react-navigation/bottom-tabs";
import { useEffect, useMemo, useState } from "react";
import { Text, View, useWindowDimensions, type ViewStyle } from "react-native";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useReducedMotion } from "@/accessibility/use-reduced-motion";
import { AnimatedPressable } from "@/components/common/AnimatedPressable";
import { Icon, type IconName } from "@/components/common/Icon";
import {
  BOTTOM_NAVIGATION_DOCK_HEIGHT,
  getBottomNavigationHeight,
  getBottomNavigationSafeBottom
} from "@/components/navigation/tab-bar-metrics";
import {
  CORE_TAB_ROUTES,
  getSelectionDuration,
  getTabBarLayout,
  resolveActiveTab,
  type CoreTabRoute
} from "@/components/navigation/tab-bar-state";
import { colors, interaction, radii, typography } from "@/theme/tokens";
import { useThemeMode } from "@/theme/theme-store";
import { selectionImpact } from "@/utils/haptics";

const tabIcons: Record<CoreTabRoute, IconName> = {
  account: "profile",
  explore: "compass",
  favorites: "heart",
  index: "home"
};

export const tabLabels: Record<CoreTabRoute, string> = {
  account: "Hesab\u0131m",
  explore: "Ke\u015ffet",
  favorites: "Favoriler",
  index: "Ana Sayfa"
};

export function MakyajTabBar({ navigation, state }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { width: viewportWidth } = useWindowDimensions();
  const { isDark } = useThemeMode();
  const safeBottom = getBottomNavigationSafeBottom(insets.bottom);
  const activeRoute = resolveActiveTab(state.routes[state.index]?.name);
  const visibleRoutes = useMemo(
    () => CORE_TAB_ROUTES.flatMap((name) => state.routes.filter((route) => route.name === name)),
    [state.routes]
  );

  return (
    <View
      testID="bottom-tab-bar"
      style={{
        backgroundColor: colors.surface,
        borderTopColor: colors.border,
        borderTopWidth: 1,
        bottom: 0,
        boxShadow: isDark ? "0 -2px 8px rgba(0,0,0,0.18)" : "0 -10px 24px rgba(0,0,0,0.08)",
        height: getBottomNavigationHeight(insets.bottom),
        left: 0,
        pointerEvents: "box-none",
        position: "absolute",
        right: 0
      }}
    >
      <View
        style={{
          alignItems: "center",
          bottom: safeBottom,
          height: BOTTOM_NAVIGATION_DOCK_HEIGHT,
          justifyContent: "center",
          left: 0,
          position: "absolute",
          right: 0
        }}
      >
        <View
          accessibilityRole="tablist"
          style={{
            alignItems: "center",
            flexDirection: "row",
            gap: 12,
            height: BOTTOM_NAVIGATION_DOCK_HEIGHT,
            justifyContent: "center",
            paddingHorizontal: 20,
            width: "100%"
          }}
        >
          {visibleRoutes.map((route) => (
            <TabItem
              focused={activeRoute === route.name}
              key={route.key}
              navigation={navigation}
              route={route}
              viewportWidth={viewportWidth}
            />
          ))}
        </View>
      </View>
    </View>
  );
}

function TabItem({ focused, navigation, route, viewportWidth }: {
  focused: boolean;
  navigation: BottomTabBarProps["navigation"];
  route: BottomTabBarProps["state"]["routes"][number];
  viewportWidth: number;
}) {
  const reducedMotion = useReducedMotion();
  const routeName = route.name as CoreTabRoute;
  const label = tabLabels[routeName];
  const [measuredLabelWidth, setMeasuredLabelWidth] = useState(label.length * 7);
  const layout = getTabBarLayout({ measuredLabelWidth, viewportWidth });
  const width = useSharedValue(focused ? layout.activeWidth : interaction.minTouchTarget);
  const labelWidth = useSharedValue(focused && layout.showActiveLabel ? measuredLabelWidth : 0);
  const labelMargin = useSharedValue(focused && layout.showActiveLabel ? 6 : 0);
  const labelOpacity = useSharedValue(focused && layout.showActiveLabel ? 1 : 0);

  useEffect(() => {
    const duration = getSelectionDuration(reducedMotion);
    const targetWidth = focused && layout.showActiveLabel ? layout.activeWidth : interaction.minTouchTarget;
    const targetLabelWidth = focused && layout.showActiveLabel ? measuredLabelWidth : 0;
    const targetLabelMargin = focused && layout.showActiveLabel ? 6 : 0;
    const targetOpacity = focused && layout.showActiveLabel ? 1 : 0;
    if (duration === 0) {
      width.value = targetWidth;
      labelWidth.value = targetLabelWidth;
      labelMargin.value = targetLabelMargin;
      labelOpacity.value = targetOpacity;
      return;
    }
    const timing = { duration, easing: Easing.out(Easing.cubic) };
    width.value = withTiming(targetWidth, timing);
    labelWidth.value = withTiming(targetLabelWidth, timing);
    labelMargin.value = withTiming(targetLabelMargin, timing);
    labelOpacity.value = withTiming(targetOpacity, timing);
  }, [focused, labelMargin, labelOpacity, labelWidth, layout.activeWidth, layout.showActiveLabel, measuredLabelWidth, reducedMotion, width]);

  const widthStyle = useAnimatedStyle(() => ({ width: width.value }));
  const labelStyle = useAnimatedStyle(() => ({
    marginLeft: labelMargin.value,
    opacity: labelOpacity.value,
    width: labelWidth.value
  }));

  function onPress() {
    const event = navigation.emit({ canPreventDefault: true, target: route.key, type: "tabPress" });
    if (event.defaultPrevented) return;
    selectionImpact();
    if (!focused) navigation.navigate(route.name);
  }

  function onLongPress() {
    navigation.emit({ target: route.key, type: "tabLongPress" });
  }

  return (
    <AnimatedPressable
      accessibilityLabel={label}
      accessibilityRole="tab"
      accessibilityState={{ selected: focused }}
      aria-selected={focused}
      onLongPress={onLongPress}
      onPress={onPress}
      pressScale={0.98}
      style={[
        {
          alignItems: "center",
          borderRadius: radii.pill,
          height: interaction.minTouchTarget,
          justifyContent: "center"
        },
        widthStyle as unknown as ViewStyle
      ]}
      testID={`bottom-tab-${routeName}`}
    >
      <Text
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        onLayout={(event) => setMeasuredLabelWidth(Math.ceil(event.nativeEvent.layout.width))}
        style={{ ...typography.tab, opacity: 0, position: "absolute" }}
      >
        {label}
      </Text>
      <View
        style={{
          alignItems: "center",
          backgroundColor: focused ? colors.brand : "transparent",
          borderColor: focused ? colors.brand : "transparent",
          borderRadius: radii.pill,
          borderWidth: 1,
          flexDirection: "row",
          height: interaction.minTouchTarget,
          justifyContent: "center",
          overflow: "hidden",
          paddingHorizontal: 10,
          width: "100%"
        }}
      >
        <View style={{ flexShrink: 0 }} testID={`bottom-tab-icon-${routeName}`}>
          <Icon
            color={focused ? colors.onBrand : colors.mutedStrong}
            name={tabIcons[routeName]}
            size={focused ? 21 : 22}
            strokeWidth={focused ? 2.7 : 2.35}
          />
        </View>
        <Animated.Text
          numberOfLines={1}
          style={[
            { ...typography.tab, color: colors.onBrand, flexShrink: 1, overflow: "hidden", textAlign: "center" },
            labelStyle
          ]}
          testID={`bottom-tab-label-${routeName}`}
        >
          {label}
        </Animated.Text>
      </View>
    </AnimatedPressable>
  );
}
