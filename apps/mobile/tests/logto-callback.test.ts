jest.mock("@/providers/customer-auth-provider", () => ({
  useCustomerAuth: () => ({
    completeSignInCallback: async () => ({ state: "success" }),
  }),
}));

import LogtoCustomerCallbackScreen from "../app/auth/callback";
import {
  buildLogtoCallbackUrl,
  completeCustomerLogtoCallback,
} from "../src/auth/callback";

describe("mobile Logto callback route", () => {
  it("defines the Expo Router callback route component", () => {
    expect(typeof LogtoCustomerCallbackScreen).toBe("function");
  });
});

describe("buildLogtoCallbackUrl", () => {
  it("reconstructs the native Logto callback URL from Expo Router params", () => {
    expect(
      buildLogtoCallbackUrl({
        baseRedirectUri: "tikprofil://auth/callback",
        params: {
          code: "authorization-code",
          iss: "https://auth.tikprofil.com/oidc",
          state: "callback-state",
        },
      }),
    ).toBe(
      "tikprofil://auth/callback?code=authorization-code&iss=https%3A%2F%2Fauth.tikprofil.com%2Foidc&state=callback-state",
    );
  });

  it("returns null when the route cannot produce a callback URL", () => {
    expect(
      buildLogtoCallbackUrl({
        baseRedirectUri: "",
        params: {
          code: "authorization-code",
          state: "callback-state",
        },
      }),
    ).toBeNull();
  });
});

describe("completeCustomerLogtoCallback", () => {
  it("handles the Logto callback before refreshing the backend customer session", async () => {
    const steps: string[] = [];

    await expect(
      completeCustomerLogtoCallback({
        callbackUrl:
          "tikprofil://auth/callback?code=authorization-code&state=callback-state",
        handleSignInCallback: async () => {
          steps.push("handle-callback");
        },
        markAuthenticated: () => {
          steps.push("mark-authenticated");
        },
        refreshCustomerProfile: async () => {
          steps.push("refresh-profile");
        },
      }),
    ).resolves.toEqual({ state: "success" });

    expect(steps).toEqual([
      "handle-callback",
      "mark-authenticated",
      "refresh-profile",
    ]);
  });

  it("recovers when the native SDK already handled the callback before the route runs", async () => {
    const steps: string[] = [];

    await expect(
      completeCustomerLogtoCallback({
        callbackUrl:
          "tikprofil://auth/callback?code=authorization-code&state=callback-state",
        handleSignInCallback: async () => {
          steps.push("handle-callback");
          throw new Error("sign-in session not found");
        },
        isLogtoSessionAvailable: async () => {
          steps.push("probe-existing-session");
          return true;
        },
        markAuthenticated: () => {
          steps.push("mark-authenticated");
        },
        refreshCustomerProfile: async () => {
          steps.push("refresh-profile");
          return true;
        },
      }),
    ).resolves.toEqual({ recovered: true, state: "success" });

    expect(steps).toEqual([
      "handle-callback",
      "probe-existing-session",
      "mark-authenticated",
      "refresh-profile",
    ]);
  });

  it("returns a retryable safe error when callback succeeds but customer session sync fails", async () => {
    await expect(
      completeCustomerLogtoCallback({
        callbackUrl:
          "tikprofil://auth/callback?code=authorization-code&state=callback-state",
        handleSignInCallback: async () => undefined,
        refreshCustomerProfile: async () => false,
      }),
    ).resolves.toEqual({
      canRetry: true,
      errorMessage: "Musteri giris geri donusu tamamlanamadi.",
      state: "error",
    });
  });

  it("returns a safe error without exposing callback secrets", async () => {
    const consoleErrorSpy = jest
      .spyOn(console, "error")
      .mockImplementation(() => undefined);

    await expect(
      completeCustomerLogtoCallback({
        callbackUrl:
          "tikprofil://auth/callback?code=sensitive-code&state=sensitive-state",
        handleSignInCallback: async () => {
          throw new Error("raw failure with sensitive-code and sensitive-state");
        },
        refreshCustomerProfile: async () => undefined,
      }),
    ).resolves.toEqual({
      canRetry: true,
      errorMessage: "Musteri giris geri donusu tamamlanamadi.",
      state: "error",
    });

    expect(consoleErrorSpy).not.toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });
});
