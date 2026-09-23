export type NavigationMode = 'driving' | 'walking';
export type Coordinate = { lat: number; lng: number };

export type NavigationStep = {
  distanceMeters: number;
  durationSeconds: number;
  instruction: string;
  maneuver: { type: string; modifier: string | null; location: [number, number] };
};

export type NavigationRoute = {
  distanceMeters: number;
  durationSeconds: number;
  geometry: { type: 'LineString'; coordinates: [number, number][] };
  steps: NavigationStep[];
};

export function isCoordinate(value: unknown): value is Coordinate {
  if (!value || typeof value !== 'object') return false;
  const point = value as Partial<Coordinate>;
  return typeof point.lat === 'number' && Number.isFinite(point.lat) && point.lat >= -90 && point.lat <= 90
    && typeof point.lng === 'number' && Number.isFinite(point.lng) && point.lng >= -180 && point.lng <= 180;
}

export function isNavigationMode(value: unknown): value is NavigationMode {
  return value === 'driving' || value === 'walking';
}

export function parseMapboxRoute(value: unknown): NavigationRoute | null {
  if (!value || typeof value !== 'object') return null;
  const route = value as Record<string, unknown>;
  const geometry = route.geometry as { type?: unknown; coordinates?: unknown } | undefined;
  if (!isNonnegative(route.distance) || !isNonnegative(route.duration)
    || geometry?.type !== 'LineString' || !Array.isArray(geometry.coordinates)
    || geometry.coordinates.length < 2 || geometry.coordinates.length > 10000) return null;
  const coordinates = geometry.coordinates.filter(isLngLat);
  if (coordinates.length !== geometry.coordinates.length) return null;
  const legs = route.legs;
  if (!Array.isArray(legs)) return null;
  const steps: NavigationStep[] = [];
  for (const leg of legs) {
    if (!leg || typeof leg !== 'object' || !Array.isArray((leg as {steps?: unknown}).steps)) return null;
    for (const raw of (leg as {steps: unknown[]}).steps) {
      if (!raw || typeof raw !== 'object') return null;
      const step = raw as Record<string, unknown>;
      const maneuver = step.maneuver as Record<string, unknown> | undefined;
      if (!isNonnegative(step.distance) || !isNonnegative(step.duration) || !maneuver
        || !isLngLat(maneuver.location) || typeof maneuver.type !== 'string') return null;
      steps.push({
        distanceMeters: step.distance,
        durationSeconds: step.duration,
        instruction: typeof maneuver.instruction === 'string' ? maneuver.instruction.slice(0, 180) : '',
        maneuver: {
          type: maneuver.type.slice(0, 40),
          modifier: typeof maneuver.modifier === 'string' ? maneuver.modifier.slice(0, 40) : null,
          location: maneuver.location
        }
      });
    }
  }
  if (!steps.length || steps.length > 500) return null;
  return { distanceMeters: route.distance, durationSeconds: route.duration,
    geometry: { type: 'LineString', coordinates }, steps };
}

function isNonnegative(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

function isLngLat(value: unknown): value is [number, number] {
  return Array.isArray(value) && value.length === 2
    && typeof value[0] === 'number' && Number.isFinite(value[0]) && value[0] >= -180 && value[0] <= 180
    && typeof value[1] === 'number' && Number.isFinite(value[1]) && value[1] >= -90 && value[1] <= 90;
}
