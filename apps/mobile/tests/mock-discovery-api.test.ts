import { defaultApiConfig } from "../src/api/config";
import { createMockDiscoveryApi } from "../src/api/mock-discovery-api";

describe("createMockDiscoveryApi", () => {
  const api = createMockDiscoveryApi(defaultApiConfig);

  it("filters discovery businesses by city, district, and category", async () => {
    const result = await api.getDiscoveryBusinesses({
      city: "İstanbul",
      district: "Kadıköy",
      category: "kahve",
    });

    expect(result.businesses.length).toBeGreaterThan(0);
    expect(result.businesses.every((business) => business.city === "İstanbul")).toBe(
      true,
    );
    expect(result.businesses.every((business) => business.district === "Kadıköy")).toBe(
      true,
    );
    expect(result.businesses.every((business) => business.category.slug === "kahve")).toBe(
      true,
    );
  });

  it("returns a business detail by slug", async () => {
    const business = await api.getBusinessBySlug("mavi-kahve-kadikoy");

    expect(business?.slug).toBe("mavi-kahve-kadikoy");
    expect(business?.contact.whatsapp).toBe("+905551112233");
  });

  it("surfaces a deterministic mock error for the hata query", async () => {
    await expect(
      api.searchBusinesses({
        query: "hata",
      }),
    ).rejects.toThrow("Mock API search failure");
  });
});
