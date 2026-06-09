import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import * as Location from "expo-location";
import { StatusBar } from "expo-status-bar";
import {
  LocateFixed,
  MapPin,
  Navigation,
  SearchCheck,
  ShieldCheck,
  Sparkles,
  Store,
} from "lucide-react-native";
import { useState } from "react";
import { Linking, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button } from "@/components/ui/button";
import {
  LOCATION_ONBOARDING_COPY,
  resolveLocationPermissionStatus,
  type LocationOnboardingStatus,
} from "@/location/location-onboarding";
import { useAppSession } from "@/providers/app-session-provider";
import { tokens } from "@/theme/tokens";

type ScreenMode = "blocked" | "denied" | "intro";

interface BenefitRowProps {
  body: string;
  icon: "campaign" | "nearby" | "speed";
  title: string;
}

const iconByBenefit = {
  campaign: Sparkles,
  nearby: Store,
  speed: SearchCheck,
} as const;

function LocationIllustration() {
  return (
    <View
      style={{
        height: 250,
        borderRadius: 34,
        borderCurve: "continuous",
        overflow: "hidden",
        backgroundColor: "#FFF8E6",
      }}
    >
      <LinearGradient
        colors={["#FFF1BD", "#FFE0A3", "#FFFFFF"]}
        style={{
          position: "absolute",
          top: 0,
          right: 0,
          bottom: 0,
          left: 0,
        }}
      />
      <View
        style={{
          position: "absolute",
          top: 34,
          left: 30,
          right: 30,
          height: 160,
          borderRadius: 30,
          borderCurve: "continuous",
          backgroundColor: "rgba(255,255,255,0.72)",
          borderWidth: 1,
          borderColor: "rgba(11,37,65,0.08)",
          transform: [{ rotate: "-3deg" }],
        }}
      />
      <View
        style={{
          position: "absolute",
          top: 74,
          left: 54,
          right: 54,
          height: 4,
          borderRadius: tokens.radius.pill,
          backgroundColor: "#F6B13D",
          transform: [{ rotate: "12deg" }],
        }}
      />
      <View
        style={{
          position: "absolute",
          top: 124,
          left: 48,
          right: 62,
          height: 4,
          borderRadius: tokens.radius.pill,
          backgroundColor: "#102033",
          opacity: 0.14,
          transform: [{ rotate: "-10deg" }],
        }}
      />
      <View
        style={{
          position: "absolute",
          top: 44,
          right: 52,
          width: 64,
          height: 64,
          borderRadius: 24,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#102033",
          boxShadow: "0 18px 34px rgba(16,32,51,0.22)",
        }}
      >
        <Store color={tokens.colors.white} size={28} />
      </View>
      <View
        style={{
          position: "absolute",
          left: 54,
          bottom: 44,
          width: 58,
          height: 58,
          borderRadius: 22,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: tokens.colors.white,
          borderWidth: 1,
          borderColor: "rgba(16,32,51,0.08)",
        }}
      >
        <Navigation color="#F6A400" size={25} />
      </View>
      <View
        style={{
          position: "absolute",
          left: "50%",
          top: 84,
          width: 86,
          height: 86,
          marginLeft: -43,
          borderRadius: 34,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#F6A400",
          borderWidth: 8,
          borderColor: "rgba(255,255,255,0.82)",
          boxShadow: "0 20px 40px rgba(246,164,0,0.30)",
        }}
      >
        <MapPin color={tokens.colors.white} size={40} />
      </View>
    </View>
  );
}

function BenefitRow({ body, icon, title }: BenefitRowProps) {
  const Icon = iconByBenefit[icon];

  return (
    <View style={{ flexDirection: "row", gap: tokens.spacing.md }}>
      <View
        style={{
          width: 48,
          height: 48,
          borderRadius: 18,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#FFF1C7",
        }}
      >
        <Icon color="#C77700" size={21} />
      </View>
      <View style={{ flex: 1, gap: 4 }}>
        <Text style={{ color: tokens.colors.text, fontSize: 16, fontWeight: "900" }}>
          {title}
        </Text>
        <Text style={{ color: tokens.colors.textMuted, fontSize: 14, lineHeight: 20 }}>
          {body}
        </Text>
      </View>
    </View>
  );
}

export default function LocationPermissionScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const {
    setHasSeenIntro,
    setLocationOnboardingStatus,
    setSelectedLocation,
  } = useAppSession();
  const [isRequesting, setIsRequesting] = useState(false);
  const [mode, setMode] = useState<ScreenMode>("intro");

  const continueToApp = () => {
    setHasSeenIntro(true);
    router.replace("/(tabs)/kesfet");
  };

  const openManualLocation = () => {
    setHasSeenIntro(true);
    router.push("/(onboarding)/manual-location");
  };

  const finishWithoutLocation = () => {
    setHasSeenIntro(true);
    setLocationOnboardingStatus("skipped");
    router.replace("/(tabs)/kesfet");
  };

  const finishWithStatus = (status: LocationOnboardingStatus) => {
    setHasSeenIntro(true);
    setLocationOnboardingStatus(status);
  };

  const handleContinue = async () => {
    if (isRequesting) {
      return;
    }

    setIsRequesting(true);

    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      const status = resolveLocationPermissionStatus(permission);
      finishWithStatus(status);

      if (status !== "granted") {
        setMode(status === "blocked" ? "blocked" : "denied");
        return;
      }

      let latitude: number | undefined;
      let longitude: number | undefined;
      let city = "Yakın çevre";
      let district = "Bulunduğun bölge";
      let neighborhood: string | undefined;

      try {
        const position = await Location.getCurrentPositionAsync({});
        latitude = position.coords.latitude;
        longitude = position.coords.longitude;

        const [address] = await Location.reverseGeocodeAsync({
          latitude,
          longitude,
        });

        city = address?.city ?? address?.region ?? city;
        district = address?.district ?? address?.subregion ?? district;
        neighborhood = address?.name ?? address?.street ?? undefined;
      } catch {
        latitude = undefined;
        longitude = undefined;
      }

      setSelectedLocation({
        source: "device",
        city,
        district,
        neighborhood,
        label: `${district}, ${city}`,
        latitude,
        longitude,
      });
      continueToApp();
    } finally {
      setIsRequesting(false);
    }
  };

  const isBlocked = mode === "blocked";
  const isDenied = mode === "denied";

  return (
    <View style={{ flex: 1, backgroundColor: "#FFFDF7" }}>
      <StatusBar style="dark" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: Math.max(insets.top, tokens.spacing.lg) + tokens.spacing.md,
          paddingHorizontal: tokens.spacing.lg,
          paddingBottom: 180,
          gap: tokens.spacing.lg,
        }}
      >
        <LocationIllustration />

        {mode === "intro" ? (
          <View style={{ gap: tokens.spacing.lg }}>
            <View style={{ gap: tokens.spacing.sm }}>
              <Text
                style={{
                  color: tokens.colors.text,
                  fontSize: 32,
                  fontWeight: "900",
                  letterSpacing: -0.8,
                  lineHeight: 37,
                }}
            >
                {LOCATION_ONBOARDING_COPY.title}
              </Text>
              <Text style={{ color: tokens.colors.textMuted, fontSize: 16, lineHeight: 24 }}>
                {LOCATION_ONBOARDING_COPY.subtitle}
              </Text>
            </View>

            <View style={{ gap: tokens.spacing.md }}>
              {LOCATION_ONBOARDING_COPY.benefits.map((benefit) => (
                <BenefitRow
                  key={benefit.title}
                  icon={benefit.icon}
                  title={benefit.title}
                  body={benefit.body}
                />
              ))}
            </View>
          </View>
        ) : (
          <View style={{ gap: tokens.spacing.lg }}>
            <View
              style={{
                width: 56,
                height: 56,
                borderRadius: 22,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: isBlocked ? "#FFF0E8" : "#FFF7D6",
              }}
            >
              {isBlocked ? (
                <ShieldCheck color={tokens.colors.warning} size={25} />
              ) : (
                <LocateFixed color={tokens.colors.warning} size={25} />
              )}
            </View>
            <View style={{ gap: tokens.spacing.sm }}>
              <Text
                style={{
                  color: tokens.colors.text,
                  fontSize: 30,
                  fontWeight: "900",
                  lineHeight: 35,
                }}
              >
                {isBlocked
                  ? LOCATION_ONBOARDING_COPY.blockedTitle
                  : LOCATION_ONBOARDING_COPY.deniedTitle}
              </Text>
              <Text style={{ color: tokens.colors.textMuted, fontSize: 16, lineHeight: 24 }}>
                {isBlocked
                  ? LOCATION_ONBOARDING_COPY.blockedText
                  : LOCATION_ONBOARDING_COPY.deniedText}
              </Text>
            </View>
          </View>
        )}
      </ScrollView>

      <View
        style={{
          position: "absolute",
          right: 0,
          bottom: 0,
          left: 0,
          paddingHorizontal: tokens.spacing.lg,
          paddingTop: tokens.spacing.md,
          paddingBottom: Math.max(insets.bottom, tokens.spacing.md),
          backgroundColor: "rgba(255,253,247,0.96)",
          borderTopWidth: 1,
          borderTopColor: "rgba(16,32,51,0.08)",
          gap: tokens.spacing.sm,
        }}
      >
        {mode === "intro" ? (
          <>
            <Button disabled={isRequesting} onPress={handleContinue}>
              {isRequesting
                ? LOCATION_ONBOARDING_COPY.requestingCta
                : LOCATION_ONBOARDING_COPY.primaryCta}
            </Button>
            <Button disabled={isRequesting} onPress={openManualLocation} variant="secondary">
              {LOCATION_ONBOARDING_COPY.manualCta}
            </Button>
            <Text
              style={{
                color: tokens.colors.textMuted,
                fontSize: 12,
                lineHeight: 18,
                textAlign: "center",
              }}
            >
              {LOCATION_ONBOARDING_COPY.privacyText}
            </Text>
          </>
        ) : (
          <>
            {isBlocked ? (
              <Button onPress={() => void Linking.openSettings()}>Ayarları Aç</Button>
            ) : null}
            <Button onPress={openManualLocation} variant={isDenied ? "primary" : "secondary"}>
              {LOCATION_ONBOARDING_COPY.manualCta}
            </Button>
            {isDenied ? (
              <Button onPress={finishWithoutLocation} variant="secondary">
                {LOCATION_ONBOARDING_COPY.skipCta}
              </Button>
            ) : null}
          </>
        )}
      </View>
    </View>
  );
}
