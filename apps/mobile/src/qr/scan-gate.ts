export type ScanGateState = "ready" | "locked" | "navigated";

export interface ScanGate {
  acquire: () => boolean;
  markNavigated: () => void;
  resetLocked: () => boolean;
  retry: () => boolean;
  state: () => ScanGateState;
}

export function createScanGate(): ScanGate {
  let currentState: ScanGateState = "ready";

  function resetLocked() {
    if (currentState !== "locked") {
      return false;
    }
    currentState = "ready";
    return true;
  }

  return {
    acquire() {
      if (currentState !== "ready") {
        return false;
      }
      currentState = "locked";
      return true;
    },
    markNavigated() {
      if (currentState === "locked") {
        currentState = "navigated";
      }
    },
    resetLocked,
    retry: resetLocked,
    state() {
      return currentState;
    }
  };
}
