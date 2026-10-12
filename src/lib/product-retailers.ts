import type { FoodProduct } from "./off";
import type { PurchaseLocation } from "./purchase";

export interface ProductRetailer { name: string; verified: boolean; sourceUrl?: string; checkedAt?: string; pickup?: string }
// Product pages and the Como pickup catalog were opened and checked on this date.
// Match the exact barcode, never infer a seller for every product of a brand.
const VERIFIED: Record<string, string> = {
  "8002580001646": "https://spesaonline.esselunga.it/commerce/nav/drive/store/prodotto/305017/chef-besciamella-senza-lattosio-500-ml",
  "8008698006511": "https://spesaonline.esselunga.it/commerce/nav/drive/store/prodotto/154050/schar-pain-brioche-370-g",
};
export function productRetailers(product: Pick<FoodProduct, "code" | "stores" | "source">, location: PurchaseLocation): ProductRetailer[] {
  const sourceUrl = product.source !== "manual" && location.country === "it" ? VERIFIED[product.code] : undefined;
  const verified: ProductRetailer[] = sourceUrl ? [{ name: "Esselunga", verified: true, sourceUrl, checkedAt: "2026-10-12", ...(location.city.trim().toLowerCase() === "como" ? { pickup: "Como — Ca’ Merlata, via Pasquale Paoli" } : {}) }] : [];
  const seen = new Set(verified.map((store) => store.name.toLowerCase()));
  for (const raw of product.stores ?? []) {
    const name = raw.trim();
    if (!name || seen.has(name.toLowerCase())) continue;
    seen.add(name.toLowerCase());
    verified.push({ name, verified: false });
  }
  return verified;
}
