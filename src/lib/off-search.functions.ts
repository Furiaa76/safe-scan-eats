import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { purchaseCountry } from "./purchase-countries";

const UA = "SafeFoodScan/1.0 (web app informativa)";
type Raw = Record<string, unknown>;

async function getJson(url: string): Promise<Raw | null> {
  try {
    const res = await fetch(url, { headers: { "User-Agent": UA, Accept: "application/json" }, signal: AbortSignal.timeout(12000) });
    if (!res.ok) return null;
    return (await res.json()) as Raw;
  } catch {
    return null;
  }
}

const text = (v: unknown) => (typeof v === "string" ? v : "");
const strings = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);
const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

function queryVariants(query: string): string[] {
  const q = query.trim();
  const n = normalize(q);
  const variants = new Set<string>([q]);
  const base = q.replace(/senza\s+(glutine|lattosio)|(?:gluten|lactose)[ -]?free/gi, " ").replace(/\s+/g, " ").trim();
  if (base !== q && base) variants.add(base);
  if (/\blasagn[ae]\b/i.test(base)) variants.add("lasagne");

  if (n.includes("schar")) {
    variants.add("Schär");
    variants.add("Schar");
    variants.add("Dr. Schär");
    variants.add("Dr Schar");
  } else {
    const ascii = q.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    if (ascii !== q) variants.add(ascii);
  }

  return [...variants].filter(Boolean);
}

function productKey(p: Raw): string {
  return text(p["code"]) || `${text(p["product_name"])}|${text(p["brands"])}`;
}

function glutenFreeScore(p: Raw, query: string): number {
  const q = normalize(query);
  const brand = normalize(text(p["brands"]));
  const name = normalize(`${text(p["product_name_it"])} ${text(p["product_name"])} ${text(p["generic_name_it"])}`);
  const labels = strings(p["labels_tags"]).map(normalize);
  let score = 0;

  if (q && brand.includes(q)) score += 60;
  if (q && name.includes(q)) score += 35;
  if (q.includes("schar") && (brand.includes("schar") || name.includes("schar"))) score += 80;
  if (labels.some((l) => l.includes("gluten-free") || l.includes("senza-glutine"))) score += 100;
  if (text(p["image_front_small_url"]) || text(p["image_front_url"])) score += 5;
  return score;
}

function mergeAndRank(groups: Raw[][], query: string): Raw[] {
  const merged = new Map<string, Raw>();
  for (const group of groups) {
    for (const p of group) {
      const key = productKey(p);
      if (key && !merged.has(key)) merged.set(key, p);
    }
  }
  return [...merged.values()]
    .filter((product) => matchesProductQuery(product, query))
    .sort((a, b) => glutenFreeScore(b, query) - glutenFreeScore(a, query))
    .slice(0, 30);
}

function matchesProductQuery(product: Raw, query: string): boolean {
  const q = normalize(query);
  const names = normalize([
    product["product_name_it"], product["product_name_en"], product["product_name"],
    product["generic_name_it"], product["generic_name_en"], product["brands"], product["code"],
  ].map(text).join(" "));
  const glutenFree = /senza\s+glutine|gluten[ -]?free/.test(q);
  const lactoseFree = /senza\s+lattosio|lactose[ -]?free/.test(q);
  if (glutenFree) {
    const labels = strings(product["labels_tags"]).map(normalize);
    if (!/senza\s+glutine|gluten[ -]?free/.test(names) &&
      !labels.some((label) => /gluten-free|senza-glutine/.test(label))) return false;
  }
  if (lactoseFree && !/senza\s+lattosio|lactose[ -]?free/.test(names) &&
    !strings(product["labels_tags"]).some((label) => /lactose-free|no-lactose|senza-lattosio/.test(normalize(label)))) return false;
  const terms = q.replace(/senza\s+(glutine|lattosio)|(?:gluten|lactose)[ -]?free/g, " ")
    .split(/[^a-z0-9]+/).filter((term) => term.length > 2 &&
      !["per", "con", "del", "della", "delle", "senza"].includes(term));
  return terms.every((term) => {
    // Lasagne sheets are often catalogued simply as "Lasagne".
    if (term === "sfoglia" && /lasagn/.test(q)) return true;
    const stem = term.length > 4 ? term.replace(/[aeio]$/, "") : term;
    return names.split(/[^a-z0-9]+/).some((word) => word.startsWith(stem));
  });
}

async function searchOne(query: string, fields: string, countryTag?: string): Promise<Raw[] | null> {
  const base = "https://world.openfoodfacts.org/cgi/search.pl?action=process&json=1";
  const countryFilter = countryTag ? `&tagtype_0=countries&tag_contains_0=contains&tag_0=${encodeURIComponent(countryTag)}` : "";
  const url = `${base}&search_simple=1&search_terms=${encodeURIComponent(query)}&page_size=30&fields=${encodeURIComponent(fields)}${countryFilter}`;
  const primary = await getJson(url);
  if (primary && Array.isArray(primary["products"])) return primary["products"] as Raw[];

  const alt = await getJson(`https://search.openfoodfacts.org/search?q=${encodeURIComponent(query)}&page_size=30&fields=${encodeURIComponent(fields)}`);
  if (alt && Array.isArray(alt["hits"])) {
    return (alt["hits"] as Raw[]).map((h) => ({ ...h, brands: Array.isArray(h["brands"]) ? (h["brands"] as string[]).join(", ") : h["brands"] }));
  }
  return null;
}

export const offSearch = createServerFn({ method: "GET" })
  .inputValidator((d) => z.object({ query: z.string().max(120).optional(), category: z.string().max(120).optional(), country: z.string().regex(/^[a-z]{2}$/).refine((code) => !!purchaseCountry(code)).optional(), fields: z.string().max(600) }).parse(d))
  .handler(async ({ data }) => {
    const base = "https://world.openfoodfacts.org/cgi/search.pl?action=process&json=1";
    const f = `&fields=${encodeURIComponent(data.fields)}`;

    if (data.category) {
      const url = `${base}&tagtype_0=categories&tag_contains_0=contains&tag_0=${encodeURIComponent(data.category)}&sort_by=unique_scans_n&page_size=40${f}`;
      const primary = await getJson(url);
      if (primary && Array.isArray(primary["products"])) return { ok: true, json: JSON.stringify(primary["products"]) };
      return { ok: false, json: "[]" };
    }

    const query = data.query?.trim() ?? "";
    if (!query) return { ok: true, json: "[]" };

    const countryTag = data.country ? purchaseCountry(data.country)?.tag : undefined;
    const groups = await Promise.all(queryVariants(query).map((q) => searchOne(q, data.fields, countryTag)));
    // A service failure is not evidence that no matching products exist.
    if (groups.every((group) => group === null)) return { ok: false, json: "[]" };
    const availableGroups = groups.filter((group): group is Raw[] => group !== null);
    // Fallback searches can return worldwide products: require an explicit country match.
    const filtered = countryTag ? availableGroups.map((group) => group.filter((product) => strings(product["countries_tags"]).includes(countryTag))) : availableGroups;
    const products = mergeAndRank(filtered, query);
    return { ok: true, json: JSON.stringify(products) };
  });
