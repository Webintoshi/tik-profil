import { CameraView, useCameraPermissions, type BarcodeScanningResult } from "expo-camera";
import { useFocusEffect, useRouter } from "expo-router";
import * as React from "react";
import { ActivityIndicator, Linking, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { fetchPublicProfile, logQrScan } from "@/api/kesfet";
import { Icon } from "@/components/common/Icon";
import { processQrScan } from "@/qr/qr-scan-flow";
import { createScanSession } from "@/qr/scan-session";
import { colors, radii, shadows, spacing, typography } from "@/theme/tokens";
import { useThemeMode } from "@/theme/theme-store";
import { lightImpact } from "@/utils/haptics";

type ScannerState = "camera-error" | "invalid" | "resolving" | "scanning" | "unresolved";

export default function QrScanScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const [cameraGeneration, setCameraGeneration] = React.useState<number | null>(null);
  const [scannerState, setScannerState] = React.useState<ScannerState>("scanning");
  const scanSessionRef = React.useRef(createScanSession());
  useThemeMode();

  React.useEffect(() => {
    scanSessionRef.current.mount();
    return () => scanSessionRef.current.unmount();
  }, []);

  useFocusEffect(React.useCallback(() => {
    const focusGeneration = scanSessionRef.current.focus();
    setCameraGeneration(focusGeneration);

    return () => {
      setCameraGeneration(null);
      if (scanSessionRef.current.blur()) {
        setScannerState("scanning");
      }
    };
  }, []));

  const handleBarcodeScanned = React.useCallback((result: BarcodeScanningResult) => {
    if (cameraGeneration === null) {
      return;
    }

    const attemptId = scanSessionRef.current.begin(cameraGeneration);
    if (attemptId === null) {
      return;
    }

    setScannerState("resolving");

    void processQrScan(result.data, {
      fetchProfile: fetchPublicProfile,
      isCurrent: () => scanSessionRef.current.isCurrent(attemptId),
      logScan: logQrScan,
      replace: (href) => {
        router.replace(href as never);
        scanSessionRef.current.markNavigated(attemptId);
      }
    }).then((outcome) => {
      if (
        outcome.status === "navigated"
        || outcome.status === "stale"
        || !scanSessionRef.current.isCurrent(attemptId)
      ) {
        return;
      }

      setScannerState(outcome.status === "invalid" ? "invalid" : "unresolved");
    });
  }, [cameraGeneration, router]);

  const isScannerActive = Boolean(
    permission?.granted
    && cameraGeneration !== null
    && scannerState === "scanning"
    && scanSessionRef.current.state() === "ready"
  );

  function goBack() {
    lightImpact();
    scanSessionRef.current.blur();
    setCameraGeneration(null);
    try {
      if (router.canGoBack()) {
        router.back();
        return;
      }
    } catch {
      // Direct route entries can lack navigation history.
    }
    router.replace("/" as never);
  }

  function retryScan() {
    const retryGeneration = scanSessionRef.current.retry();
    if (retryGeneration === null) {
      return;
    }
    lightImpact();
    setCameraGeneration(retryGeneration);
    setScannerState("scanning");
  }

  function handleCameraMountError() {
    if (
      cameraGeneration !== null
      && scanSessionRef.current.begin(cameraGeneration) !== null
    ) {
      setScannerState("camera-error");
    }
  }

  return (
    <View style={{ backgroundColor: colors.background, flex: 1 }}>
      <View
        style={{
          alignItems: "center",
          flexDirection: "row",
          justifyContent: "space-between",
          paddingBottom: spacing.md,
          paddingHorizontal: spacing.screen,
          paddingTop: insets.top + spacing.md
        }}
      >
        <Pressable
          accessibilityLabel="Geri dön"
          accessibilityRole="button"
          onPress={goBack}
          style={{
            alignItems: "center",
            backgroundColor: colors.surface,
            borderRadius: radii.pill,
            height: 44,
            justifyContent: "center",
            width: 44,
            ...shadows.soft
          }}
        >
          <Icon name="arrowLeft" color={colors.ink} size={22} />
        </Pressable>
        <Text style={{ ...typography.sectionTitle, color: colors.ink }}>QR kod okut</Text>
        <View style={{ height: 44, width: 44 }} />
      </View>

      <View style={{ flex: 1, overflow: "hidden" }}>
        {permission === null ? (
          <StatusView title="Kamera hazırlanıyor" loading />
        ) : !permission.granted ? (
          <StatusView
            actionLabel={permission.canAskAgain ? "Kamera izni ver" : "Ayarları aç"}
            onAction={permission.canAskAgain
              ? () => { void requestPermission().catch(() => undefined); }
              : () => { void Linking.openSettings().catch(() => undefined); }}
            title={permission.canAskAgain ? "Kamera izni gerekli" : "Kamera erişimi kapalı"}
          />
        ) : isScannerActive ? (
          <View style={{ flex: 1 }}>
            <CameraView
              active={isScannerActive}
              barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
              facing="back"
              onBarcodeScanned={isScannerActive ? handleBarcodeScanned : undefined}
              onMountError={handleCameraMountError}
              style={{ height: "100%", width: "100%" }}
            />
            <View
              style={{
                borderColor: colors.onBrand,
                borderRadius: radii.xl,
                borderWidth: 3,
                height: 250,
                left: "50%",
                marginLeft: -125,
                pointerEvents: "none",
                position: "absolute",
                top: "30%",
                width: 250
              }}
            />
          </View>
        ) : scannerState === "resolving" ? (
          <StatusView title="Profil açılıyor" loading />
        ) : scannerState === "invalid" ? (
          <StatusView actionLabel="Tekrar dene" onAction={retryScan} title="Geçersiz QR kod" />
        ) : scannerState === "unresolved" ? (
          <StatusView actionLabel="Tekrar dene" onAction={retryScan} title="Profil açılamadı" />
        ) : scannerState === "camera-error" ? (
          <StatusView actionLabel="Tekrar dene" onAction={retryScan} title="Kamera açılamadı" />
        ) : (
          <StatusView title="Kamera hazırlanıyor" loading />
        )}
      </View>
    </View>
  );
}

function StatusView({
  actionLabel,
  loading = false,
  onAction,
  title
}: {
  actionLabel?: string;
  loading?: boolean;
  onAction?: () => void;
  title: string;
}) {
  return (
    <View
      style={{
        alignItems: "center",
        flex: 1,
        gap: spacing.lg,
        justifyContent: "center",
        padding: spacing.xxl
      }}
    >
      {loading ? (
        <ActivityIndicator color={colors.brand} size="large" />
      ) : (
        <View
          style={{
            alignItems: "center",
            backgroundColor: colors.brandSoft,
            borderRadius: radii.pill,
            height: 72,
            justifyContent: "center",
            width: 72
          }}
        >
          <Icon name="qr" color={colors.brandDeep} size={34} />
        </View>
      )}
      <Text style={{ ...typography.title, color: colors.ink, textAlign: "center" }}>{title}</Text>
      {actionLabel && onAction ? (
        <Pressable
          accessibilityRole="button"
          onPress={onAction}
          style={{
            alignItems: "center",
            backgroundColor: colors.brand,
            borderRadius: radii.lg,
            minHeight: 48,
            justifyContent: "center",
            paddingHorizontal: spacing.xl,
            paddingVertical: spacing.md
          }}
        >
          <Text style={{ ...typography.button, color: colors.onBrand }}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}
