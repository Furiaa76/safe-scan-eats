import assert from "node:assert/strict";
import { test } from "node:test";
import { readNearbySupermarkets, POST } from "../api/nearby-supermarkets.ts";
import { approximateCoordinates, distanceKm, rankNearbySupermarkets } from "../src/lib/nearby-supermarkets.ts";

const position = { latitude: 45.63, longitude: 9.15 };
const branch = (id, name, longitude) => ({ id, name, longitude, latitude: position.latitude, address: "" });

test("GPS ranking keeps each chosen supermarket ahead of closer unselected brands", () => {
  const rows = [
    branch("coop", "Coop", 9.151),
    branch("lidl-far", "Lidl", 9.175),
    branch("esselunga", "Esselunga", 9.152),
    branch("lidl-near", "LIDL", 9.168),
    branch("lidl-remote", "Lidl", 9.4),
  ];
  assert.deepEqual(rankNearbySupermarkets(rows, position, ["Lidl", "Esselunga"]).map(({ id }) => id), [
    "lidl-near", "lidl-far", "esselunga", "coop",
  ]);
  assert.deepEqual(rankNearbySupermarkets(rows, position, []).map(({ id }) => id), [
    "coop", "esselunga", "lidl-near", "lidl-far",
  ]);
  assert.equal(distanceKm(position, position), 0);
});

test("only an approximate position is shared and invalid coordinates are rejected", async () => {
  assert.deepEqual(approximateCoordinates({ latitude: 45.631238, longitude: 9.149867 }), position);
  const response = await POST(new Request("https://example.com/api/nearby-supermarkets", {
    method: "POST", body: JSON.stringify({ latitude: "45.63", longitude: 9.15 }),
  }));
  assert.equal(response.status, 400);
});

test("store lookup uses only geolocated supermarket records and retains their real addresses", () => {
  const feature = {
    geometry: { type: "Point", coordinates: [9.15, 45.63] },
    properties: {
      osm_type: "W", osm_id: 777, osm_key: "shop", osm_value: "supermarket",
      name: "Lidl", street: "Via Nazionale", housenumber: "41", city: "Cesano Maderno",
    },
  };
  assert.deepEqual(readNearbySupermarkets({ features: [
    feature, feature, { ...feature, properties: { ...feature.properties, osm_value: "bakery" } },
    { ...feature, geometry: { type: "Point", coordinates: [272, 45.63] } },
  ] }), [{ id: "W:777", name: "Lidl", address: "Via Nazionale 41, Cesano Maderno", ...position }]);
});
