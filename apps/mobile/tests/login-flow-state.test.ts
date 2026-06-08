import {
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

  it("clears stale login errors after customer session sync succeeds", () => {
    const failed: CustomerAuthFlowState = {
      errorMessage: "Giriş tamamlanamadı. Tekrar deneyin.",
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
      errorMessage: "Giriş tamamlanamadı. Tekrar deneyin.",
      status: "failed",
    });
    expect(getAuthFlowDisplayError(state)).toBe("Giriş tamamlanamadı. Tekrar deneyin.");
  });

  it("logout clears auth flow state", () => {
    expect(
      reduceCustomerAuthFlow(
        {
          errorMessage: "Giriş tamamlanamadı. Tekrar deneyin.",
          status: "failed",
        },
        { type: "LOGOUT" },
      ),
    ).toEqual(idle);
  });
});
