import { matchesShoppingMarket } from "./shopping-organization.ts";

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface NearbySupermarket extends Coordinates {
  id: string;
  name: string;
  address: string;
}

export const NEARBY_RADIUS_KM = 8;

export function isCoordinates(value: unknown): value is Coordinates {
  if (!value || typeof value !== "object") return false;
  const { latitude, longitude } = value as Record<string, unknown>;
  return typeof latitude === "number" && Math.abs(latitude) <= 90 &&
    typeof longitude === "number" && Math.abs(longitude) <= 180;
}

export function approximateCoordinates({ latitude, longitude }: Coordinates): Coordinates {
  return { latitude: Number(latitude.toFixed(2)), longitude: Number(longitude.toFixed(2)) };
}

export function distanceKm(from: Coordinates, to: Coordinates) {
  const radians = (degrees: number) => degrees * Math.PI / 180;
  const lat = radians(to.latitude - from.latitude);
  const lon = radians(to.longitude - from.longitude);
  const arc = Math.sin(lat / 2) ** 2 +
    Math.cos(radians(from.latitude)) * Math.cos(radians(to.latitude)) * Math.sin(lon / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(Math.min(1, arc)));
}

export function rankNearbySupermarkets(stores: NearbySupermarket[], position: Coordinates, preferred: string[]) {
  return stores
    .map((store) => ({
      ...store,
      distance: distanceKm(position, store),
      priority: preferred.findIndex((name) => matchesShoppingMarket(store.name, name)),
    }))
    .filter((store) => store.distance <= NEARBY_RADIUS_KM)
    .sort((a, b) =>
      (a.priority < 0 ? preferred.length : a.priority) -
      (b.priority < 0 ? preferred.length : b.priority) ||
      a.distance - b.distance
    );
}
