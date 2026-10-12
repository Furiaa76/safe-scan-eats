import type { FoodProduct } from "./off";
import type { PurchaseLocation } from "./purchase";

export interface ProductRetailer { name: string; verified: boolean; sourceUrl: string; checkedAt: string; country: string; pickup?: string }
// Product pages and the Como pickup catalog were opened and checked on this date.
// Match the exact barcode, never infer a seller for every product of a brand.
const VERIFIED: Record<string, ProductRetailer[]> = {
  "8002580001646": [{ name: "Esselunga", country: "it", verified: true, checkedAt: "2026-10-12", sourceUrl: "https://spesaonline.esselunga.it/commerce/nav/drive/store/prodotto/305017/chef-besciamella-senza-lattosio-500-ml" }],
  "8008698006511": [{ name: "Esselunga", country: "it", verified: true, checkedAt: "2026-10-12", sourceUrl: "https://spesaonline.esselunga.it/commerce/nav/drive/store/prodotto/154050/schar-pain-brioche-370-g" }],
};
export function productRetailers(product: Pick<FoodProduct, "code" | "stores" | "source">, location: PurchaseLocation): ProductRetailer[] {
  if (product.source === "manual") return [];
  // OFF stores are global, with no store-to-country or store-to-city mapping.
  // Even a product's countries_tags cannot prove where each reported seller operates.
  return (VERIFIED[product.code] ?? []).filter((retailer) => retailer.country === location.country)
    .map((retailer) => ({ ...retailer, ...(location.country === "it" && location.city.trim().toLowerCase() === "como" ? { pickup: "Como — Ca’ Merlata, via Pasquale Paoli" } : {}) }));
}
