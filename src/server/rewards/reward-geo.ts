export interface Coordinates {
    latitude: number;
    longitude: number;
}

const EARTH_RADIUS_METERS = 6_371_000;

function radians(value: number): number {
    return value * (Math.PI / 180);
}

export function distanceMeters(from: Coordinates, to: Coordinates): number {
    const latitudeDelta = radians(to.latitude - from.latitude);
    const longitudeDelta = radians(to.longitude - from.longitude);
    const fromLatitude = radians(from.latitude);
    const toLatitude = radians(to.latitude);
    const haversine = Math.sin(latitudeDelta / 2) ** 2
        + Math.cos(fromLatitude) * Math.cos(toLatitude) * Math.sin(longitudeDelta / 2) ** 2;
    return 2 * EARTH_RADIUS_METERS * Math.asin(Math.min(1, Math.sqrt(haversine)));
}

export function isUsableCoordinates(value: Partial<Coordinates>): value is Coordinates {
    return Number.isFinite(value.latitude)
        && Number.isFinite(value.longitude)
        && Number(value.latitude) >= -90
        && Number(value.latitude) <= 90
        && Number(value.longitude) >= -180
        && Number(value.longitude) <= 180;
}
