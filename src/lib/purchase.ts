import { useMemo, useSyncExternalStore } from "react";
import { purchaseCountry } from "./purchase-countries";
import { freeFromClaim } from "./free-from";
import type { FoodProduct } from "./off";

export interface PurchaseLocation { country: string; city: string }
const KEY = "safe-scan-purchase-location-v1";
const EVENT = "safe-scan-purchase-location-change";
const DEFAULT = JSON.stringify({ country: "it", city: "" });
let memory = DEFAULT;

function snapshot() {
  if (typeof window === "undefined") return DEFAULT;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return DEFAULT;
    const data = JSON.parse(raw);
    return purchaseCountry(data.country) && typeof data.city === "string" && data.city.length <= 100 ? raw : DEFAULT;
  } catch { return memory; }
}

function subscribe(listener: () => void) {
  const onStorage = (event: StorageEvent) => { if (event.key === KEY || event.key === null) listener(); };
  window.addEventListener(EVENT, listener);
  window.addEventListener("storage", onStorage);
  return () => { window.removeEventListener(EVENT, listener); window.removeEventListener("storage", onStorage); };
}

export function usePurchaseLocation(): PurchaseLocation {
  const raw = useSyncExternalStore(subscribe, snapshot, () => DEFAULT);
  return useMemo(() => JSON.parse(raw) as PurchaseLocation, [raw]);
}

export function setPurchaseLocation(location: PurchaseLocation) {
  if (!purchaseCountry(location.country)) return;
  memory = JSON.stringify({ country: location.country, city: location.city.slice(0, 100) });
  try { window.localStorage.setItem(KEY, memory); } catch { /* Allow use without persistent storage. */ }
  window.dispatchEvent(new Event(EVENT));
}

export function onlinePurchaseUrl(query: string, location: PurchaseLocation, language: "it" | "en", exactProduct = false) {
  const country = purchaseCountry(location.country) ?? purchaseCountry("it")!;
  const params = new URLSearchParams({ q: query.slice(0, 350), gl: country.code, hl: language });
  // Shopping broadens matches. Product links use ordinary search with quoted
  // identity; ingredient links remain category searches.
  if (exactProduct) params.set("udm", "web");
  else params.set("tbm", "shop");
  return `https://www.google.com/search?${params}`;
}

export function productPurchaseQuery(product: FoodProduct, allergens: readonly string[] = []) {
  const quoted = (value: string) => `"${value.replace(/["\\]/g, " ").replace(/\s+/g, " ").trim()}"`;
  const terms = [quoted(product.name)];
  const brands = product.brand.split(/[,;]/).map((brand) => brand.trim()).filter(Boolean);
  if (brands.length) terms.push(quoted(brands[0]!));
  for (const [id, phrase] of [["glutine", "senza glutine"], ["lattosio", "senza lattosio"]] as const) {
    if (allergens.includes(id) || freeFromClaim(product, id)) terms.push(quoted(phrase));
  }
  return terms.join(" ");
}

export function ingredientPurchaseQuery(name: string, allergens: readonly string[]) {
  let query = name;
  if (allergens.includes("glutine") && !/senza glutine|gluten[ -]?free/i.test(query) &&
    /\b(pasta|spaghetti|penne|bucatini|sfoglia|lasagne|farina|pangrattato|savoiardi|besciamella|pane|biscotti)\b/i.test(query)) query += " senza glutine";
  if (allergens.includes("lattosio") && !/senza lattosio|lactose[ -]?free/i.test(query) &&
    /\b(latte|burro|panna|mascarpone|mozzarella|besciamella|ricotta|pecorino|parmigiano)\b/i.test(query)) query += " senza lattosio";
  return query;
}

export function shopMapUrl(store: string | undefined, location: PurchaseLocation) {
  const country = purchaseCountry(location.country) ?? purchaseCountry("it")!;
  const query = [store?.slice(0, 160) || "supermarkets grocery stores", location.city, country.en].filter(Boolean).join(", ");
  return `https://www.google.com/maps/search/?${new URLSearchParams({ api: "1", query })}`;
}
