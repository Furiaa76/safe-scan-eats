/** Client Open Food Facts (lettura pubblica, nessuna chiave richiesta). */
import { offSearch } from "./off-search.functions";
import type { AppLanguage } from "./translations";

export interface FoodProduct {
  code: string;
  name: string;
  brand: string;
  imageUrl?: string | undefined;
  ingredientsText: string;
  allergenTags: string[];
  traceTags: string[];
  labelTags: string[];
  nutritionGrade?: string | undefined;
  categoryTag?: string | undefined;
  source: "off" | "manual";
  stores?: string[];
  countryTags?: string[];
}

const BASE = "https://world.openfoodfacts.org";
const FIELDS = [
  "code","product_name","product_name_it","product_name_en","generic_name_it","generic_name_en","brands","image_front_small_url","image_front_url","ingredients_text","ingredients_text_it","ingredients_text_en","allergens_tags","traces_tags","labels_tags","nutrition_grades","categories_tags","stores","stores_tags","countries_tags",
].join(",");

type Raw = Record<string, unknown>;
const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
const arr = (v: unknown) => (Array.isArray(v) ? (v.filter((x) => typeof x === "string") as string[]) : []);

function map(raw: Raw, code?: string, language: AppLanguage = "it"): FoodProduct {
  const grade = str(raw["nutrition_grades"]);
  const cats = arr(raw["categories_tags"]);
  return {
    code: str(raw["code"]) || code || "",
    name: str(raw[`product_name_${language}`]) || str(raw["product_name"]) || str(raw[`generic_name_${language}`]) || (language === "en" ? "Unnamed product" : "Prodotto senza nome"),
    brand: str(raw["brands"]).split(",")[0]?.trim() ?? "",
    imageUrl: str(raw["image_front_small_url"]) || str(raw["image_front_url"]) || undefined,
    ingredientsText: str(raw[`ingredients_text_${language}`]) || str(raw["ingredients_text"]),
    allergenTags: arr(raw["allergens_tags"]),
    traceTags: arr(raw["traces_tags"]),
    labelTags: arr(raw["labels_tags"]),
    nutritionGrade: /^[a-e]$/.test(grade) ? grade : undefined,
    categoryTag: cats[cats.length - 1],
    source: "off",
    stores: Array.from(new Set((str(raw["stores"]) ? str(raw["stores"]).split(/[,;]/) : arr(raw["stores_tags"]).map((store) => store.replace(/^[a-z]{2}:/, "").replace(/-/g, " "))).map((store) => store.trim()).filter(Boolean))).slice(0, 8),
    countryTags: arr(raw["countries_tags"]),
  };
}

export class OffError extends Error {}

export async function fetchProduct(code: string): Promise<FoodProduct | null> {
  let res: Response;
  try {
    res = await fetch(`${BASE}/api/v2/product/${encodeURIComponent(code)}?fields=${FIELDS}`);
  } catch {
    throw new OffError("Connessione assente");
  }
  if (res.status === 404) return null;
  if (!res.ok) throw new OffError(`Errore ${res.status}`);
  const json = (await res.json()) as { status?: number; product?: Raw };
  if (json.status !== 1 || !json.product) return null;
  return map(json.product, code);
}

export async function searchProducts(query: string, country?: string, language: AppLanguage = "it"): Promise<FoodProduct[]> {
  const res = await offSearch({ data: { query, fields: FIELDS, ...(country ? { country } : {}) } });
  if (!res.ok) throw new OffError("Ricerca non disponibile");
  return (JSON.parse(res.json) as Raw[]).map((p) => map(p, undefined, language)).filter((p) => p.code);
}

export async function productsInCategory(categoryTag: string): Promise<FoodProduct[]> {
  const res = await offSearch({ data: { category: categoryTag, fields: FIELDS } });
  return (JSON.parse(res.json) as Raw[]).map((p) => map(p)).filter((p) => p.code);
}
