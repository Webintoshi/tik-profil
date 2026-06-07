import {
  getAccount,
  getCurrentSession,
  logout,
  startCustomerLogin,
} from "../src/auth/api";

describe("getCurrentSession", () => {
  it("returns null when the backend customer session is not available", async () => {
    const fetchMock = jest
      .fn<Promise<Response>, [RequestInfo | URL, RequestInit?]>()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            success: false,
            error: "No Logto session",
          }),
          {
            status: 401,
            headers: { "Content-Type": "application/json" },
          },
        ),
      );

    await expect(
      getCurrentSession({
        apiBaseUrl: "https://tikprofil.com",
        fetchImpl: fetchMock,
      }),
    ).resolves.toBeNull();
    expect(fetchMock).toHaveBeenCalledWith(
      "https://tikprofil.com/api/auth/logto/me",
      expect.objectContaining({
        credentials: "include",
        method: "GET",
      }),
    );
  });

  it("parses the authenticated backend customer session", async () => {
    const fetchMock = jest
      .fn<Promise<Response>, [RequestInfo | URL, RequestInit?]>()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            success: true,
            actorType: "customer",
            appUserId: "app-user-1",
            displayName: "Customer Example",
            email: "customer@example.com",
            logtoSub: "logto|customer-1",
            provider: "logto",
            role: "customer",
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          },
        ),
      );

    await expect(
      getCurrentSession({
        apiBaseUrl: "https://tikprofil.com",
        fetchImpl: fetchMock,
      }),
    ).resolves.toEqual({
      success: true,
      actorType: "customer",
      appUserId: "app-user-1",
      displayName: "Customer Example",
      email: "customer@example.com",
      logtoSub: "logto|customer-1",
      provider: "logto",
      role: "customer",
    });
  });
});

describe("getAccount", () => {
  it("loads the safe customer account summary from the backend", async () => {
    const fetchMock = jest
      .fn<Promise<Response>, [RequestInfo | URL, RequestInit?]>()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            success: true,
            data: {
              actorType: "customer",
              appUserId: "app-user-1",
              displayName: "Customer Example",
              email: "customer@example.com",
              provider: "logto",
              role: "customer",
              uid: "app-user-1",
              addresses: [],
              isPrime: false,
              preferences: {
                language: "tr",
                theme: "system",
              },
              wallet: {
                balance: 0,
                points: 0,
              },
            },
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          },
        ),
      );

    await expect(
      getAccount({
        apiBaseUrl: "https://tikprofil.com",
        fetchImpl: fetchMock,
      }),
    ).resolves.toMatchObject({
      actorType: "customer",
      appUserId: "app-user-1",
      uid: "app-user-1",
      wallet: {
        balance: 0,
        points: 0,
      },
    });
  });
});

describe("logout", () => {
  it("posts to the backend logout endpoint with the safe customer redirect", async () => {
    const fetchMock = jest
      .fn<Promise<Response>, [RequestInfo | URL, RequestInit?]>()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );

    await expect(
      logout({
        apiBaseUrl: "https://tikprofil.com",
        fetchImpl: fetchMock,
      }),
    ).resolves.toBeUndefined();
    expect(fetchMock).toHaveBeenCalledWith(
      "https://tikprofil.com/api/auth/logout",
      expect.objectContaining({
        body: JSON.stringify({
          postLogoutRedirect: "/kesfet",
        }),
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      }),
    );
  });
});

describe("startCustomerLogin", () => {
  it("delegates the native callback URI to the provided login adapter", async () => {
    const signIn = jest.fn<Promise<void>, [string]>().mockResolvedValue(undefined);

    await expect(
      startCustomerLogin({
        redirectUri: "tikprofil://auth/callback",
        signIn,
      }),
    ).resolves.toBeUndefined();
    expect(signIn).toHaveBeenCalledWith("tikprofil://auth/callback");
  });
});
