import * as Haptics from "expo-haptics";

export function lightImpact() {
  if (process.env.EXPO_OS !== "ios") {
    return;
  }
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
}

export function selectionImpact() {
  if (process.env.EXPO_OS !== "ios") {
    return;
  }
  Haptics.selectionAsync().catch(() => undefined);
}
