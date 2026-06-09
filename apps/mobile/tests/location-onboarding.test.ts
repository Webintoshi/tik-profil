jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

import {
  defaultSessionSnapshot,
  normalizeSessionSnapshot,
} from "../src/storage/app-storage";
import {
  createManualLocationSelection,
  LOCATION_ONBOARDING_COPY,
  resolveLocationPermissionStatus,
  shouldShowLocationOnboarding,
} from "../src/location/location-onboarding";

describe("location onboarding state", () => {
  it("shows location onboarding for a first launch snapshot", () => {
    expect(defaultSessionSnapshot.locationOnboardingStatus).toBe("undecided");
    expect(shouldShowLocationOnboarding(defaultSessionSnapshot)).toBe(true);
  });

  it("does not show onboarding again after a permission decision", () => {
    expect(
      shouldShowLocationOnboarding({
        ...defaultSessionSnapshot,
        locationOnboardingStatus: "denied",
      }),
    ).toBe(false);
    expect(
      shouldShowLocationOnboarding({
        ...defaultSessionSnapshot,
        locationOnboardingStatus: "skipped",
      }),
    ).toBe(false);
    expect(
      shouldShowLocationOnboarding({
        ...defaultSessionSnapshot,
        locationOnboardingStatus: "manual",
      }),
    ).toBe(false);
  });

  it("keeps old stored snapshots compatible by defaulting location status", () => {
    expect(
      normalizeSessionSnapshot({
        favoriteSlugs: ["mavi-kahve-kadikoy"],
        hasSeenIntro: true,
        selectedLocation: null,
      }).locationOnboardingStatus,
    ).toBe("undecided");
  });
});

describe("location permission decisions", () => {
  it("maps native permission responses to app states", () => {
    expect(
      resolveLocationPermissionStatus({
        canAskAgain: true,
        status: "granted",
      }),
    ).toBe("granted");
    expect(
      resolveLocationPermissionStatus({
        canAskAgain: true,
        status: "denied",
      }),
    ).toBe("denied");
    expect(
      resolveLocationPermissionStatus({
        canAskAgain: false,
        status: "denied",
      }),
    ).toBe("blocked");
  });

  it("creates a safe manual location placeholder selection", () => {
    expect(
      createManualLocationSelection({
        city: "Istanbul",
        district: "Kadikoy",
        neighborhood: "Moda",
      }),
    ).toEqual({
      city: "Istanbul",
      district: "Kadikoy",
      label: "Kadikoy, Istanbul",
      neighborhood: "Moda",
      source: "manual",
    });
  });
});

describe("location onboarding copy", () => {
  it("uses consumer-facing location copy without technical words", () => {
    const copy = JSON.stringify(LOCATION_ONBOARDING_COPY);

    expect(LOCATION_ONBOARDING_COPY.title).toContain("Konumunu kullanarak");
    expect(LOCATION_ONBOARDING_COPY.primaryCta).toBe("Devam et");
    expect(LOCATION_ONBOARDING_COPY.manualCta).toBe("Konumu elle seç");
    expect(copy).not.toMatch(/mock|debug|backend|callback|Logto|session sync/i);
  });
});
