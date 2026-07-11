export interface AppointmentState {
  appointmentId: string | null;
  date: string | null;
  message: string | null;
  serviceId: string | null;
  staffId: string | null;
  status: "editing" | "error" | "submitting" | "success";
  time: string | null;
}

export type AppointmentAction =
  | { type: "select-service"; serviceId: string }
  | { type: "select-staff"; staffId: string }
  | { type: "select-slot"; date: string; time: string }
  | { type: "submit-start" }
  | { type: "submit-error"; message: string }
  | { type: "submit-success"; appointmentId: string };

export function createAppointmentState(): AppointmentState {
  return { appointmentId: null, date: null, message: null, serviceId: null, staffId: null, status: "editing", time: null };
}

export function reduceAppointmentState(state: AppointmentState, action: AppointmentAction): AppointmentState {
  switch (action.type) {
    case "select-service":
      return { ...state, date: null, message: null, serviceId: action.serviceId, staffId: null, status: "editing", time: null };
    case "select-staff":
      return { ...state, date: null, message: null, staffId: action.staffId, status: "editing", time: null };
    case "select-slot":
      return { ...state, date: action.date, message: null, status: "editing", time: action.time };
    case "submit-start":
      return { ...state, message: null, status: "submitting" };
    case "submit-error":
      return { ...state, message: action.message, status: "error" };
    case "submit-success":
      return { ...state, appointmentId: action.appointmentId, message: null, status: "success" };
  }
}
