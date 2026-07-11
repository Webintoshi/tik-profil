export interface CityGuidePlaceRecord {
  id: string;
  name: string;
  image: string;
  category: string;
}

export interface CityGuideRecord {
  id: string;
  name: string;
  plate: number;
  coverImage: string;
  places: CityGuidePlaceRecord[];
  [key: string]: unknown;
}

interface CityFoundResult {
  status: 200;
  body: CityGuideRecord;
}

interface CityNotFoundResult {
  status: 404;
  body: { error: "City not found" };
}

export function normalizeCityName(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value
    .trim()
    .normalize("NFKD")
    .toLocaleLowerCase("tr-TR")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[çğıöşü]/g, (character) => ({
      "ç": "c",
      "ğ": "g",
      "ı": "i",
      "ö": "o",
      "ş": "s",
      "ü": "u"
    })[character] ?? character)
    .replace(/\s+/g, " ");

  return normalized || null;
}

export function findCityByName(cities: unknown, requestedName: unknown): CityGuideRecord | null {
  const normalizedName = normalizeCityName(requestedName);
  if (!normalizedName || !Array.isArray(cities)) {
    return null;
  }

  return cities.find((city): city is CityGuideRecord => (
    isCityGuideRecord(city) && normalizeCityName(city.name) === normalizedName
  )) ?? null;
}

export function resolveCityGet(cities: unknown[], requestedName: null): { status: 200; body: unknown[] };
export function resolveCityGet(cities: unknown[], requestedName: string): CityFoundResult | CityNotFoundResult;
export function resolveCityGet(
  cities: unknown[],
  requestedName: string | null
): { status: 200; body: unknown[] } | CityFoundResult | CityNotFoundResult;
export function resolveCityGet(
  cities: unknown[],
  requestedName: string | null
): { status: 200; body: unknown[] } | CityFoundResult | CityNotFoundResult {
  if (requestedName === null) {
    return { status: 200, body: cities };
  }

  const city = findCityByName(cities, requestedName);
  return city
    ? { status: 200, body: city }
    : { status: 404, body: { error: "City not found" } };
}

function isCityGuideRecord(value: unknown): value is CityGuideRecord {
  if (!isRecord(value)) {
    return false;
  }

  return isNonEmptyString(value.id)
    && isNonEmptyString(value.name)
    && typeof value.plate === "number"
    && Number.isFinite(value.plate)
    && isNonEmptyString(value.coverImage)
    && Array.isArray(value.places)
    && value.places.every(isCityGuidePlaceRecord);
}

function isCityGuidePlaceRecord(value: unknown): value is CityGuidePlaceRecord {
  return isRecord(value)
    && isNonEmptyString(value.id)
    && isNonEmptyString(value.name)
    && isNonEmptyString(value.image)
    && isNonEmptyString(value.category);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}
