import type { Coordinates, NearbySupermarket } from "../src/lib/nearby-supermarkets";

const CACHE_MS = 15 * 60_000;
const MAX_RESULTS = 50;
// Include the distance lost when the search is centered on rounded coordinates.
const LOOKUP_RADIUS_KM = 9;
const cache = new Map<string, { stores: NearbySupermarket[]; expires: number }>();
const pending = new Map<string, Promise<NearbySupermarket[]>>();

const record = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" ? value as Record<string, unknown> : {};
const text = (value: unknown, length = 100) => typeof value === "string" ? value.trim().slice(0, length) : "";

function validPosition(latitude: unknown, longitude: unknown): Coordinates | null {
  if (typeof latitude !== "number" || !(Math.abs(latitude) <= 90) ||
      typeof longitude !== "number" || !(Math.abs(longitude) <= 180)) return null;
  return { latitude, longitude };
}

export function readNearbySupermarkets(payload: unknown) {
  const features = record(payload)["features"];
  if (!Array.isArray(features)) throw new Error("Invalid map response");

  const stores = new Map<string, NearbySupermarket>();
  for (const feature of features.slice(0, MAX_RESULTS)) {
    const properties = record(record(feature)["properties"]);
    const geometry = record(record(feature)["geometry"]);
    const coordinates = geometry["coordinates"];
    const type = properties["osm_type"];
    const osmId = properties["osm_id"];
    const name = text(properties["name"]);
    if (
      geometry["type"] !== "Point" || !Array.isArray(coordinates) || !name ||
      properties["osm_key"] !== "shop" || properties["osm_value"] !== "supermarket" ||
      (type !== "N" && type !== "W" && type !== "R") || typeof osmId !== "number" || !Number.isSafeInteger(osmId)
    ) continue;

    const position = validPosition(coordinates[1], coordinates[0]);
    if (!position) continue;

    const id = `${type}:${osmId}`;
    const street = [text(properties["street"]), text(properties["housenumber"], 20)].filter(Boolean).join(" ");
    const locality = [text(properties["postcode"], 20), text(properties["city"] ?? properties["district"])].filter(Boolean).join(" ");
    stores.set(id, { id, name, address: [street, locality].filter(Boolean).join(", "), ...position });
  }
  return [...stores.values()];
}

async function lookupNearby({ latitude, longitude }: Coordinates) {
  const url = new URL("https://photon.komoot.io/reverse");
  url.search = new URLSearchParams({
    lat: String(latitude), lon: String(longitude),
    radius: String(LOOKUP_RADIUS_KM), limit: String(MAX_RESULTS),
    include: "osm.shop.supermarket", dedupe: "0",
  }).toString();
  const response = await fetch(url, {
    headers: { "User-Agent": "SafeScanEats/1.0 (+https://safe-scan-eats.vercel.app)", Accept: "application/json" },
    signal: AbortSignal.timeout(6500),
  });
  if (!response.ok) throw new Error("Map service unavailable");
  return readNearbySupermarkets(await response.json());
}

export async function POST(request: Request) {
  const reply = (body: object, status = 200) =>
    Response.json(body, { status, headers: { "Cache-Control": "no-store" } });

  const input = record(await request.json().catch(() => null));
  const coords = validPosition(input["latitude"], input["longitude"]);
  if (!coords) return reply({ error: "invalid_position" }, 400);

  const position = {
    latitude: Number(coords.latitude.toFixed(2)),
    longitude: Number(coords.longitude.toFixed(2)),
  };
  const key = `${position.latitude},${position.longitude}`;
  const existing = cache.get(key);
  if (existing && existing.expires > Date.now()) return reply({ stores: existing.stores });

  let work = pending.get(key);
  if (!work) {
    if (pending.size >= 8) return reply({ error: "map_unavailable" }, 503);
    work = lookupNearby(position).then((stores) => {
      if (cache.size >= 100) {
        const oldest = cache.keys().next();
        if (!oldest.done) cache.delete(oldest.value);
      }
      cache.set(key, { stores, expires: Date.now() + CACHE_MS });
      return stores;
    }).finally(() => pending.delete(key));
    pending.set(key, work);
  }

  try {
    return reply({ stores: await work });
  } catch {
    return reply({ error: "map_unavailable" }, 503);
  }
}
