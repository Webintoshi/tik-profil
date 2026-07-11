import { createScanGate, type ScanGateState } from "./scan-gate";

export interface ScanSession {
  begin: () => number | null;
  blur: () => boolean;
  focus: () => boolean;
  isCurrent: (attemptId: number) => boolean;
  markNavigated: (attemptId: number) => boolean;
  mount: () => void;
  retry: () => boolean;
  state: () => ScanGateState;
  unmount: () => void;
}

export function createScanSession(): ScanSession {
  const gate = createScanGate();
  let focused = false;
  let generation = 0;
  let mounted = false;

  function invalidate() {
    generation += 1;
  }

  function isCurrent(attemptId: number) {
    return mounted
      && focused
      && gate.state() === "locked"
      && generation === attemptId;
  }

  return {
    begin() {
      if (!mounted || !focused || !gate.acquire()) {
        return null;
      }
      invalidate();
      return generation;
    },
    blur() {
      focused = false;
      invalidate();
      return gate.resetLocked();
    },
    focus() {
      if (!mounted) {
        return false;
      }
      focused = true;
      return true;
    },
    isCurrent,
    markNavigated(attemptId) {
      if (!isCurrent(attemptId)) {
        return false;
      }
      gate.markNavigated();
      return gate.state() === "navigated";
    },
    mount() {
      mounted = true;
    },
    retry() {
      if (!mounted || !focused || !gate.retry()) {
        return false;
      }
      invalidate();
      return true;
    },
    state() {
      return gate.state();
    },
    unmount() {
      mounted = false;
      focused = false;
      invalidate();
      gate.resetLocked();
    }
  };
}
