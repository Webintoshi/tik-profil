export type CustomerAuthFlowStatus =
  | "idle"
  | "startingLogin"
  | "awaitingOtp"
  | "awaitingCallback"
  | "syncingBackendSession"
  | "authenticated"
  | "needsAccountCompletion"
  | "cancelled"
  | "failed";

export interface CustomerAuthFlowState {
  errorMessage: null | string;
  status: CustomerAuthFlowStatus;
}

export type CustomerAuthFlowEvent =
  | { type: "START_LOGIN" }
  | { type: "OTP_SENT" }
  | { type: "LOGIN_CANCELLED" }
  | { recoverableViaCallback: boolean; type: "LOGIN_START_REJECTED" }
  | { type: "CALLBACK_RECEIVED" }
  | { needsAccountCompletion: boolean; type: "SYNC_SUCCEEDED" }
  | { message?: string; type: "SYNC_FAILED" }
  | { type: "LOGOUT" };

const CANCELLED_LOGIN_MESSAGE = "Giriş işlemi iptal edildi.";
const SAFE_LOGIN_FAILURE_MESSAGE = "Giriş tamamlanamadı. Lütfen tekrar deneyin.";

export interface CustomerAuthFlowDisplayCopy {
  body: string;
  title: string;
}

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
    case "OTP_SENT":
      return {
        errorMessage: null,
        status: "awaitingOtp",
      };
    case "LOGIN_CANCELLED":
      return {
        errorMessage: CANCELLED_LOGIN_MESSAGE,
        status: "cancelled",
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
  return state.status === "failed" || state.status === "cancelled"
    ? state.errorMessage
    : null;
}

export function getAuthFlowDisplayCopy(
  state: CustomerAuthFlowState,
): CustomerAuthFlowDisplayCopy | null {
  switch (state.status) {
    case "startingLogin":
      return {
        body: "Tık Profil hesabını güvenli şekilde doğruluyoruz.",
        title: "Güvenli girişe yönlendiriliyorsun",
      };
    case "awaitingCallback":
      return {
        body: "Oturum doğrulanıyor, lütfen bekleyin.",
        title: "Tık Profil’e dönülüyor",
      };
    case "awaitingOtp":
      return {
        body: "Telefonuna gelen 6 haneli kodu gir.",
        title: "Doğrulama kodu gönderildi",
      };
    case "syncingBackendSession":
      return {
        body: "Oturum doğrulanıyor, lütfen bekleyin.",
        title: "Hesabınız hazırlanıyor",
      };
    case "authenticated":
    case "needsAccountCompletion":
      return {
        body: "Tık Profil’e dönülüyor.",
        title: "Giriş tamamlanıyor",
      };
    case "cancelled":
      return {
        body: "Hazır olduğunuzda tekrar deneyebilirsiniz.",
        title: CANCELLED_LOGIN_MESSAGE,
      };
    case "failed":
      return {
        body: SAFE_LOGIN_FAILURE_MESSAGE,
        title: "Giriş tamamlanamadı",
      };
    default:
      return null;
  }
}
