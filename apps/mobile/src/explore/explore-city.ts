import { normalizeCityName } from "@/city/normalize-city";
import { PILOT_CITY } from "@/data/ordu-discovery";

export interface LatestExploreRequestGuard {
  begin: () => number;
  invalidate: () => void;
  isCurrent: (requestId: number) => boolean;
}

export function resolveExploreCity(
  savedAddressLabel: string | null,
  lastSelectedCity: string | null
): string {
  const normalizedPilotCity = normalizeCityName(PILOT_CITY);
  const normalizedAddress = normalizeCityName(savedAddressLabel);
  const normalizedSelection = normalizeCityName(lastSelectedCity);

  if (normalizedPilotCity && normalizedAddress) {
    const addressParts = normalizedAddress.split(/[,;/|\s]+/);
    if (addressParts.includes(normalizedPilotCity)) {
      return PILOT_CITY;
    }
  }

  const selectedPilotCity = normalizedSelection === normalizedPilotCity ? PILOT_CITY : null;
  return selectedPilotCity ?? PILOT_CITY;
}

export function createLatestExploreRequestGuard(): LatestExploreRequestGuard {
  let generation = 0;

  return {
    begin() {
      generation += 1;
      return generation;
    },
    invalidate() {
      generation += 1;
    },
    isCurrent(requestId) {
      return requestId === generation;
    }
  };
}
