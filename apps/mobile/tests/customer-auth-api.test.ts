import {
  bootstrapCustomerSession,
  getAccount,
  getCustomerProfile,
  getCurrentSession,
  logout,
  startCustomerLogin,
  syncCustomerBackendSession,
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

describe("getCustomerProfile", () => {
  it("loads the safe customer profile from the kesfet profile route", async () => {
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
            },
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          },
        ),
      );

    await expect(
      getCustomerProfile({
        apiBaseUrl: "https://tikprofil.com",
        fetchImpl: fetchMock,
      }),
    ).resolves.toMatchObject({
      actorType: "customer",
      appUserId: "app-user-1",
      uid: "app-user-1",
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://tikprofil.com/api/kesfet/user/profile",
      expect.objectContaining({
        credentials: "include",
        method: "GET",
      }),
    );
  });
});

describe("bootstrapCustomerSession", () => {
  it("posts the customer actor and Logto id token to the mobile bridge", async () => {
    const fetchMock = jest
      .fn<Promise<Response>, [RequestInfo | URL, RequestInit?]>()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            success: true,
            data: {
              success: true,
              actorType: "customer",
              appUserId: "app-user-1",
              displayName: "Customer Example",
              email: "customer@example.com",
              logtoSub: "logto|customer-1",
              provider: "logto",
              role: "customer",
            },
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          },
        ),
      );

    await expect(
      bootstrapCustomerSession({
        apiBaseUrl: "https://tikprofil.com",
        fetchImpl: fetchMock,
        idToken: "id-token-1",
      }),
    ).resolves.toMatchObject({
      actorType: "customer",
      appUserId: "app-user-1",
      logtoSub: "logto|customer-1",
      provider: "logto",
      role: "customer",
      success: true,
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://tikprofil.com/api/auth/logto/mobile/customer-session",
      expect.objectContaining({
        body: JSON.stringify({
          actor: "customer",
          idToken: "id-token-1",
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

describe("syncCustomerBackendSession", () => {
  it("bootstraps the backend session and re-reads the customer session cookie before loading profile data", async () => {
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
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            success: true,
            data: {
              success: true,
              actorType: "customer",
              appUserId: "app-user-1",
              displayName: "Customer Example",
              email: "customer@example.com",
              logtoSub: "logto|customer-1",
              provider: "logto",
              role: "customer",
            },
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          },
        ),
      )
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
      )
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
            },
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          },
        ),
      )
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
            },
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          },
        ),
      );

    await expect(
      syncCustomerBackendSession({
        apiBaseUrl: "https://tikprofil.com",
        fetchImpl: fetchMock,
        idToken: "id-token-1",
      }),
    ).resolves.toMatchObject({
      state: "ready",
      usedBridge: true,
      session: {
        actorType: "customer",
        appUserId: "app-user-1",
      },
      account: {
        actorType: "customer",
        appUserId: "app-user-1",
      },
      profile: {
        actorType: "customer",
        appUserId: "app-user-1",
      },
    });
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      "https://tikprofil.com/api/auth/logto/me",
      expect.objectContaining({
        credentials: "include",
        method: "GET",
      }),
    );
  });

  it("reports a disconnected state when the native id token is unavailable", async () => {
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
      syncCustomerBackendSession({
        apiBaseUrl: "https://tikprofil.com",
        fetchImpl: fetchMock,
        idToken: null,
      }),
    ).resolves.toEqual({
      account: null,
      profile: null,
      reason: "missing-id-token",
      session: null,
      state: "disconnected",
      usedBridge: false,
    });
  });

  it("reports a disconnected state when the bridge succeeds but the backend cookie is still missing on the follow-up session read", async () => {
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
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            success: true,
            data: {
              success: true,
              actorType: "customer",
              appUserId: "app-user-1",
              displayName: "Customer Example",
              email: "customer@example.com",
              logtoSub: "logto|customer-1",
              provider: "logto",
              role: "customer",
            },
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          },
        ),
      )
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
      syncCustomerBackendSession({
        apiBaseUrl: "https://tikprofil.com",
        fetchImpl: fetchMock,
        idToken: "id-token-1",
      }),
    ).resolves.toEqual({
      account: null,
      profile: null,
      reason: "session-cookie-missing",
      session: null,
      state: "disconnected",
      usedBridge: true,
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
