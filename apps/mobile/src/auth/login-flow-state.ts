export type CustomerAuthFlowStatus =
  | "idle"
  | "startingLogin"
  | "awaitingCallback"
  | "syncingBackendSession"
  | "authenticated"
  | "needsAccountCompletion"
  | "failed";

export interface CustomerAuthFlowState {
  errorMessage: null | string;
  status: CustomerAuthFlowStatus;
}

export type CustomerAuthFlowEvent =
  | { type: "START_LOGIN" }
  | { recoverableViaCallback: boolean; type: "LOGIN_START_REJECTED" }
  | { type: "CALLBACK_RECEIVED" }
  | { needsAccountCompletion: boolean; type: "SYNC_SUCCEEDED" }
  | { message?: string; type: "SYNC_FAILED" }
  | { type: "LOGOUT" };

const SAFE_LOGIN_FAILURE_MESSAGE = "Giriş tamamlanamadı. Tekrar deneyin.";

export const initialCustomerAuthFlowState: CustomerAuthFlowState = {
  errorMessage: null,
  status: "idle",
};

export function reduceCustomerAuthFlow(
  state: CustomerAuthFlowState,
  event: CustomerAuthFlowEvent,
): CustomerAuthFlowState {
  switch (event.type) {
    case "START_LOGIN":
      return {
        errorMessage: null,
        status: "startingLogin",
      };
    case "LOGIN_START_REJECTED":
      return event.recoverableViaCallback
        ? {
            errorMessage: null,
            status: "awaitingCallback",
          }
        : {
            errorMessage: SAFE_LOGIN_FAILURE_MESSAGE,
            status: "failed",
          };
    case "CALLBACK_RECEIVED":
      return {
        errorMessage: null,
        status: "syncingBackendSession",
      };
    case "SYNC_SUCCEEDED":
      return {
        errorMessage: null,
        status: event.needsAccountCompletion
          ? "needsAccountCompletion"
          : "authenticated",
      };
    case "SYNC_FAILED":
      return {
        errorMessage: SAFE_LOGIN_FAILURE_MESSAGE,
        status: "failed",
      };
    case "LOGOUT":
      return initialCustomerAuthFlowState;
    default:
      return state;
  }
}

export function getAuthFlowDisplayError(
  state: CustomerAuthFlowState,
): null | string {
  return state.status === "failed" ? state.errorMessage : null;
}
