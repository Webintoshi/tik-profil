import { getAccountCompletionStatus } from "../src/auth/account-completion";

describe("getAccountCompletionStatus", () => {
  it("requires full name, email, and phone before full mobile app access", () => {
    expect(
      getAccountCompletionStatus({
        displayName: "Customer Example",
        email: "customer@example.com",
        phone: "+905551112233",
      }),
    ).toEqual({
      isComplete: true,
      missingFields: [],
    });

    expect(
      getAccountCompletionStatus({
        displayName: "Customer Example",
        email: "",
        phone: null,
      }),
    ).toEqual({
      isComplete: false,
      missingFields: ["email", "phone"],
    });
  });
});
