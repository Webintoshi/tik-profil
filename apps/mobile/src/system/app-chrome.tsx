import { useEffect } from "react";
import { NavigationBar } from "expo-navigation-bar";
import { Platform, StatusBar } from "react-native";
import { androidAppChromeConfig } from "@/system/app-chrome-config";

export function NativeAppChrome() {
  useEffect(() => {
    if (Platform.OS !== "android") {
      return;
    }

    NavigationBar.setStyle(androidAppChromeConfig.navigationBarStyle);
    NavigationBar.setHidden(androidAppChromeConfig.navigationBarHidden);
    StatusBar.setBarStyle(androidAppChromeConfig.statusBarStyle, true);
    StatusBar.setBackgroundColor(
      androidAppChromeConfig.statusBarBackgroundColor,
      true,
    );
    StatusBar.setTranslucent(androidAppChromeConfig.statusBarTranslucent);
  }, []);

  return (
    <StatusBar
      backgroundColor={androidAppChromeConfig.statusBarBackgroundColor}
      barStyle={androidAppChromeConfig.statusBarStyle}
      translucent={androidAppChromeConfig.statusBarTranslucent}
    />
  );
}
