import {
  buildCustomerWebSignInPath,
  buildLogtoRedirectUri,
  resolveLogtoMobileRuntimeConfig,
} from "../src/auth/config";

describe("resolveLogtoMobileRuntimeConfig", () => {
  it("stays disabled when the required public Logto env values are missing", () => {
    expect(
      resolveLogtoMobileRuntimeConfig({
        apiBaseUrl: "https://tikprofil.com",
        appId: "",
        endpoint: "",
      }),
    ).toEqual({
      accountPath: "/api/account",
      actor: "customer",
      apiBaseUrl: "https://tikprofil.com",
      appId: null,
      customerSessionBridgePath: "/api/auth/logto/mobile/customer-session",
      enabled: false,
      endpoint: null,
      logoutPath: "/api/auth/logout",
      mePath: "/api/auth/logto/me",
      profilePath: "/api/kesfet/user/profile",
      redirectUri: "tikprofil://auth/callback",
      scopes: ["profile", "email"],
      webSignInPath: "/api/auth/logto/sign-in?actor=customer&callbackUrl=%2Fkesfet",
    });
  });

  it("enables mobile Logto config and keeps the customer web login path available for documented fallback", () => {
    expect(
      resolveLogtoMobileRuntimeConfig({
        apiBaseUrl: "https://tikprofil.com",
        appId: "logto-mobile-app-id",
        endpoint: "https://auth.tikprofil.com",
      }),
    ).toEqual({
      accountPath: "/api/account",
      actor: "customer",
      apiBaseUrl: "https://tikprofil.com",
      appId: "logto-mobile-app-id",
      customerSessionBridgePath: "/api/auth/logto/mobile/customer-session",
      enabled: true,
      endpoint: "https://auth.tikprofil.com",
      logoutPath: "/api/auth/logout",
      mePath: "/api/auth/logto/me",
      profilePath: "/api/kesfet/user/profile",
      redirectUri: "tikprofil://auth/callback",
      scopes: ["profile", "email"],
      webSignInPath: "/api/auth/logto/sign-in?actor=customer&callbackUrl=%2Fkesfet",
    });
  });
});

describe("buildLogtoRedirectUri", () => {
  it("normalizes the app scheme callback path", () => {
    expect(buildLogtoRedirectUri("tikprofil")).toBe("tikprofil://auth/callback");
    expect(buildLogtoRedirectUri("tikprofil://")).toBe("tikprofil://auth/callback");
  });
});

describe("buildCustomerWebSignInPath", () => {
  it("encodes the safe web callback path for the customer actor", () => {
    expect(buildCustomerWebSignInPath()).toBe(
      "/api/auth/logto/sign-in?actor=customer&callbackUrl=%2Fkesfet",
    );
    expect(buildCustomerWebSignInPath("/kesfet/profile")).toBe(
      "/api/auth/logto/sign-in?actor=customer&callbackUrl=%2Fkesfet%2Fprofile",
    );
  });
});
