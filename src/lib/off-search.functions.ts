import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const UA = "SafeFoodScan/1.0 (web app informativa)";
type Raw = Record<string, unknown>;

async function getJson(url: string): Promise<Raw | null> {
  try {
    const res = await fetch(url, { headers: { "User-Agent": UA, Accept: "application/json" } });
    if (!res.ok) return null;
    return (await res.json()) as Raw;
  } catch {
    return null;
  }
}

export const offSearch = createServerFn({ method: "GET" })
  .inputValidator((d) => z.object({ query: z.string().max(120).optional(), category: z.string().max(120).optional(), fields: z.string().max(600) }).parse(d))
  .handler(async ({ data }) => {
    const base = "https://world.openfoodfacts.org/cgi/search.pl?action=process&json=1";
    const f = `&fields=${encodeURIComponent(data.fields)}`;
    const url = data.category
      ? `${base}&tagtype_0=categories&tag_contains_0=contains&tag_0=${encodeURIComponent(data.category)}&sort_by=unique_scans_n&page_size=40${f}`
      : `${base}&search_simple=1&search_terms=${encodeURIComponent(data.query ?? "")}&page_size=24${f}`;
    const primary = await getJson(url);
    if (primary && Array.isArray(primary["products"])) return { ok: true, json: JSON.stringify(primary["products"]) };
    if (data.query) {
      const alt = await getJson(`https://search.openfoodfacts.org/search?q=${encodeURIComponent(data.query)}&page_size=24&fields=${encodeURIComponent(data.fields)}`);
      if (alt && Array.isArray(alt["hits"])) {
        const products = (alt["hits"] as Raw[]).map((h) => ({ ...h, brands: Array.isArray(h["brands"]) ? (h["brands"] as string[]).join(", ") : h["brands"] }));
        return { ok: true, json: JSON.stringify(products) };
      }
    }
    return { ok: false, json: "[]" };
  });