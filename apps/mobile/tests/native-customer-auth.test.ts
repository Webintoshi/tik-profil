import {
  requestCustomerOtp,
  signInWithGoogleIdToken,
  verifyCustomerOtp,
} from "../src/auth/api";

describe("native customer auth API", () => {
  it("starts a Netgsm OTP challenge with a phone number only", async () => {
    const fetchMock = jest
      .fn<Promise<Response>, [RequestInfo | URL, RequestInit?]>()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            success: true,
            data: {
              expiresInSeconds: 180,
              maskedPhone: "+90 555 *** ** 33",
              resendAfterSeconds: 60,
            },
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          },
        ),
      );

    await expect(
      requestCustomerOtp({
        apiBaseUrl: "https://tikprofil.com",
        fetchImpl: fetchMock,
        phone: "0555 111 22 33",
      }),
    ).resolves.toEqual({
      expiresInSeconds: 180,
      maskedPhone: "+90 555 *** ** 33",
      resendAfterSeconds: 60,
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://tikprofil.com/api/auth/mobile/customer/otp/start",
      expect.objectContaining({
        body: JSON.stringify({
          phone: "0555 111 22 33",
        }),
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      }),
    );
  });

  it("verifies an OTP code and returns a native customer session", async () => {
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
              displayName: null,
              email: null,
              logtoSub: "phone:+905551112233",
              phone: "+905551112233",
              provider: "native_otp",
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
      verifyCustomerOtp({
        apiBaseUrl: "https://tikprofil.com",
        code: "123456",
        fetchImpl: fetchMock,
        phone: "0555 111 22 33",
      }),
    ).resolves.toMatchObject({
      actorType: "customer",
      appUserId: "app-user-1",
      provider: "native_otp",
      role: "customer",
    });
  });

  it("posts a Google ID token only to the customer Google endpoint", async () => {
    const fetchMock = jest
      .fn<Promise<Response>, [RequestInfo | URL, RequestInit?]>()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            success: true,
            data: {
              success: true,
              actorType: "customer",
              appUserId: "app-user-2",
              displayName: "Google Customer",
              email: "customer@example.com",
              logtoSub: "google-sub-1",
              provider: "google",
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
      signInWithGoogleIdToken({
        apiBaseUrl: "https://tikprofil.com",
        fetchImpl: fetchMock,
        idToken: "google-id-token",
      }),
    ).resolves.toMatchObject({
      actorType: "customer",
      appUserId: "app-user-2",
      provider: "google",
      role: "customer",
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://tikprofil.com/api/auth/mobile/customer/google",
      expect.objectContaining({
        body: JSON.stringify({
          actor: "customer",
          idToken: "google-id-token",
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
