import { buildApiUrl } from "../src/api/url";
import { defaultApiConfig } from "../src/api/config";

describe("defaultApiConfig", () => {
  it("uses the live discovery API unless a build explicitly overrides it", () => {
    expect(defaultApiConfig.mode).toBe("real");
    expect(defaultApiConfig.baseUrl).toBe("https://tikprofil.com");
  });
});

describe("buildApiUrl", () => {
  it("joins the base URL and path without duplicate slashes", () => {
    expect(buildApiUrl("https://tikprofil.com/", "/api/kesfet")).toBe(
      "https://tikprofil.com/api/kesfet",
    );
  });

  it("encodes query parameters and skips empty values", () => {
    expect(
      buildApiUrl("https://tikprofil.com", "/api/kesfet/search", {
        q: "Kadıköy kahve",
        city: "İstanbul",
        page: 2,
        empty: "",
        missing: undefined,
      }),
    ).toBe(
      "https://tikprofil.com/api/kesfet/search?q=Kad%C4%B1k%C3%B6y%20kahve&city=%C4%B0stanbul&page=2",
    );
  });
});
