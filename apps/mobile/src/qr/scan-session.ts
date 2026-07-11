import { createScanGate, type ScanGateState } from "./scan-gate";

export interface ScanSession {
  begin: (expectedGeneration: number) => number | null;
  blur: () => boolean;
  focus: () => number | null;
  isCurrent: (attemptId: number) => boolean;
  markNavigated: (attemptId: number) => boolean;
  mount: () => number;
  retry: () => number | null;
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
    return generation;
  }

  function isCurrent(attemptId: number) {
    return mounted
      && focused
      && gate.state() === "locked"
      && generation === attemptId;
  }

  return {
    begin(expectedGeneration) {
      if (
        expectedGeneration !== generation
        || !mounted
        || !focused
        || !gate.acquire()
      ) {
        return null;
      }
      return invalidate();
    },
    blur() {
      focused = false;
      invalidate();
      return gate.resetLocked();
    },
    focus() {
      if (!mounted) {
        return null;
      }
      focused = true;
      return invalidate();
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
      return invalidate();
    },
    retry() {
      if (!mounted || !focused || !gate.retry()) {
        return null;
      }
      return invalidate();
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
