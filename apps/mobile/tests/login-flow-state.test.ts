import {
  getAuthFlowDisplayCopy,
  getAuthFlowDisplayError,
  reduceCustomerAuthFlow,
  type CustomerAuthFlowState,
} from "../src/auth/login-flow-state";

describe("reduceCustomerAuthFlow", () => {
  const idle: CustomerAuthFlowState = {
    errorMessage: null,
    status: "idle",
  };

  it("does not turn a recoverable native sign-in handoff error into a failed login", () => {
    expect(
      reduceCustomerAuthFlow(
        reduceCustomerAuthFlow(idle, { type: "START_LOGIN" }),
        {
          recoverableViaCallback: true,
          type: "LOGIN_START_REJECTED",
        },
      ),
    ).toEqual({
      errorMessage: null,
      status: "awaitingCallback",
    });
  });

  it("uses branded native-feeling copy before opening the secure auth surface", () => {
    const state = reduceCustomerAuthFlow(idle, { type: "START_LOGIN" });

    expect(getAuthFlowDisplayCopy(state)).toEqual({
      body: "Tık Profil hesabını güvenli şekilde doğruluyoruz.",
      title: "Güvenli girişe yönlendiriliyorsun",
    });
  });

  it("uses non-technical loading copy while callback and account sync finish", () => {
    const state = reduceCustomerAuthFlow(idle, { type: "CALLBACK_RECEIVED" });

    expect(getAuthFlowDisplayCopy(state)).toEqual({
      body: "Oturum doğrulanıyor, lütfen bekleyin.",
      title: "Hesabınız hazırlanıyor",
    });
  });

  it("clears stale login errors after customer session sync succeeds", () => {
    const failed: CustomerAuthFlowState = {
      errorMessage: "Giriş tamamlanamadı. Lütfen tekrar deneyin.",
      status: "failed",
    };

    expect(
      reduceCustomerAuthFlow(failed, {
        needsAccountCompletion: true,
        type: "SYNC_SUCCEEDED",
      }),
    ).toEqual({
      errorMessage: null,
      status: "needsAccountCompletion",
    });
  });

  it("keeps account completion out of login failure display", () => {
    const state = reduceCustomerAuthFlow(idle, {
      needsAccountCompletion: true,
      type: "SYNC_SUCCEEDED",
    });

    expect(getAuthFlowDisplayError(state)).toBeNull();
  });

  it("shows a safe failure only for permanent callback or bridge failure", () => {
    const state = reduceCustomerAuthFlow(idle, {
      message: "raw sensitive callback details",
      type: "SYNC_FAILED",
    });

    expect(state).toEqual({
      errorMessage: "Giriş tamamlanamadı. Lütfen tekrar deneyin.",
      status: "failed",
    });
    expect(getAuthFlowDisplayError(state)).toBe("Giriş tamamlanamadı. Lütfen tekrar deneyin.");
  });

  it("shows safe cancellation copy when the user cancels sign-in", () => {
    const state = reduceCustomerAuthFlow(idle, { type: "LOGIN_CANCELLED" });

    expect(state).toEqual({
      errorMessage: "Giriş işlemi iptal edildi.",
      status: "cancelled",
    });
    expect(getAuthFlowDisplayError(state)).toBe("Giriş işlemi iptal edildi.");
  });

  it("logout clears auth flow state", () => {
    expect(
      reduceCustomerAuthFlow(
        {
          errorMessage: "Giriş tamamlanamadı. Lütfen tekrar deneyin.",
          status: "failed",
        },
        { type: "LOGOUT" },
      ),
    ).toEqual(idle);
  });
});
