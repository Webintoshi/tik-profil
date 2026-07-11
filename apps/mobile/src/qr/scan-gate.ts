export type ScanGateState = "ready" | "locked" | "navigated";

export interface ScanGate {
  acquire: () => boolean;
  markNavigated: () => void;
  retry: () => boolean;
  state: () => ScanGateState;
}

export function createScanGate(): ScanGate {
  let currentState: ScanGateState = "ready";

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
    retry() {
      if (currentState !== "locked") {
        return false;
      }
      currentState = "ready";
      return true;
    },
    state() {
      return currentState;
    }
  };
}
