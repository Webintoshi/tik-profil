export interface ReservationState {
  endDate: string | null;
  message: string | null;
  reservationId: string | null;
  resourceId: string | null;
  startDate: string | null;
  status: "editing" | "error" | "submitting" | "success";
  time: string | null;
}

export type ReservationAction =
  | { type: "select-resource"; resourceId: string }
  | { type: "select-start"; date: string }
  | { type: "select-end"; date: string }
  | { type: "select-time"; time: string }
  | { type: "submit-start" }
  | { type: "submit-error"; message: string }
  | { type: "submit-success"; reservationId: string };

export function createReservationState(): ReservationState {
  return { endDate: null, message: null, reservationId: null, resourceId: null, startDate: null, status: "editing", time: null };
}

export function reduceReservationState(state: ReservationState, action: ReservationAction): ReservationState {
  switch (action.type) {
    case "select-resource":
      return { ...state, endDate: null, message: null, resourceId: action.resourceId, startDate: null, status: "editing", time: null };
    case "select-start":
      return { ...state, endDate: null, message: null, startDate: action.date, status: "editing", time: null };
    case "select-end":
      return { ...state, endDate: action.date, message: null, status: "editing" };
    case "select-time":
      return { ...state, message: null, status: "editing", time: action.time };
    case "submit-start":
      return { ...state, message: null, status: "submitting" };
    case "submit-error":
      return { ...state, message: action.message, status: "error" };
    case "submit-success":
      return { ...state, message: null, reservationId: action.reservationId, status: "success" };
  }
}

export interface ReservationIdempotencyState {
  fingerprint: string | null;
  key: string;
}

export function buildReservationRange(
  vertical: "hotel" | "restaurant" | "vehicle",
  startDate: string | null,
  endDate: string | null,
  time: string | null
): { endDate: string; startDate: string } | null {
  if (!startDate) return null;
  if (vertical !== "restaurant") return endDate ? { endDate, startDate } : null;
  if (!time) return null;
  const start = new Date(`${startDate}T${time}:00+03:00`);
  if (Number.isNaN(start.getTime())) return null;
  return {
    endDate: new Date(start.getTime() + 2 * 60 * 60_000).toISOString(),
    startDate: start.toISOString()
  };
}

export function getReservationPartySize(
  vertical: "hotel" | "restaurant" | "vehicle",
  raw: string
): number | null | undefined {
  if (vertical === "vehicle") return undefined;
  const value = Number(raw);
  return Number.isInteger(value) && value >= 1 ? value : null;
}

function createKey() {
  return `reservation-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 14)}`;
}

export function createReservationIdempotencyState(): ReservationIdempotencyState {
  return { fingerprint: null, key: createKey() };
}

export function resolveReservationIdempotency(state: ReservationIdempotencyState, fingerprint: string): ReservationIdempotencyState {
  return state.fingerprint === fingerprint ? state : { fingerprint, key: createKey() };
}
