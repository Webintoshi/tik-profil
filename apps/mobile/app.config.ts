import type { ConfigContext, ExpoConfig } from "expo/config";

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: "Tik Profil",
  slug: "tik-profil-mobile",
  scheme: "tikprofil",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/icon.png",
  userInterfaceStyle: "light",
  plugins: [
    "expo-router",
    "expo-status-bar",
    "expo-image",
    "expo-secure-store",
    "expo-web-browser",
    [
      "expo-location",
      {
        locationWhenInUsePermission:
          "Tik Profil, yakindaki isletmeleri gostermek icin konumunu kullanir.",
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
  },
  ios: {
    supportsTablet: true,
    bundleIdentifier: "com.tikprofil.mobile",
  },
  android: {
    package: "com.tikprofil.mobile",
    predictiveBackGestureEnabled: false,
    adaptiveIcon: {
      backgroundColor: "#DCEBFA",
      foregroundImage: "./assets/android-icon-foreground.png",
      backgroundImage: "./assets/android-icon-background.png",
      monochromeImage: "./assets/android-icon-monochrome.png",
    },
  },
  web: {
    bundler: "metro",
    favicon: "./assets/favicon.png",
  },
  extra: {
    apiMode: process.env.EXPO_PUBLIC_API_MODE ?? "mock",
    apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL ?? "https://tikprofil.com",
    logtoAppId: process.env.EXPO_PUBLIC_LOGTO_APP_ID ?? "",
    logtoEndpoint: process.env.EXPO_PUBLIC_LOGTO_ENDPOINT ?? "",
    logtoRedirectUri:
      process.env.EXPO_PUBLIC_LOGTO_REDIRECT_URI ?? "tikprofil://auth/callback",
    publicBusinessProfilePathTemplate:
      process.env.EXPO_PUBLIC_BUSINESS_PROFILE_PATH_TEMPLATE ?? "",
  },
});
