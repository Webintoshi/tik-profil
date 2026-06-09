import {
  formatTurkishPhoneInput,
  getPhoneDigits,
  isLikelyTurkishMobilePhone,
} from "../src/auth/phone-input";

describe("phone input helpers", () => {
  it("formats Turkish mobile phone numbers while typing", () => {
    expect(formatTurkishPhoneInput("05551112233")).toBe("0555 111 22 33");
    expect(formatTurkishPhoneInput("+905551112233")).toBe("+90 555 111 22 33");
    expect(formatTurkishPhoneInput("5551112233")).toBe("555 111 22 33");
  });

  it("accepts only likely Turkish mobile phone formats for OTP submission", () => {
    expect(isLikelyTurkishMobilePhone("0555 111 22 33")).toBe(true);
    expect(isLikelyTurkishMobilePhone("+90 555 111 22 33")).toBe(true);
    expect(isLikelyTurkishMobilePhone("555 111 22 33")).toBe(true);
    expect(isLikelyTurkishMobilePhone("0212 111 22 33")).toBe(false);
    expect(isLikelyTurkishMobilePhone("555")).toBe(false);
  });

  it("strips non-digits before sending to validators", () => {
    expect(getPhoneDigits("+90 (555) 111-22-33")).toBe("905551112233");
  });
});
