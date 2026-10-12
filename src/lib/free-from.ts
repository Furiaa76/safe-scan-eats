import type { AllergenId } from "./allergens";

export interface ProductIdentity { name: string; brand: string; code?: string; source?: "off" | "manual" }
export interface FreeFromClaim {
  allergen: AllergenId;
  description: string;
  sourceUrl?: string;
  verifiedAt?: string;
  manufacturer: boolean;
}
const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim().replace(/\s+/g, " ");
const CHECKED = "2026-10-12";

// Each rule has a bounded scope and an official source. A parent company does
// not inherit the claims of one of its ranges. Never infer other allergen absences.
export function manufacturerFreeFromClaims(product: ProductIdentity): FreeFromClaim[] {
  if (product.source === "manual") return [];
  const brands = product.brand.split(/[,;]/).map(normalize).filter(Boolean);
  const name = normalize(product.name);
  const claims: FreeFromClaim[] = [];
  const scharAliases = ["schar", "schaer", "dr schar", "dr schaer"];
  if (brands.length && brands.every((brand) => scharAliases.includes(brand)) && !/\b(kanso|flavis|mevalia|glutafin)\b/.test(name)) {
    claims.push({ allergen: "glutine", description: "Schär dichiara tutti i prodotti del marchio senza glutine e certificati con spiga barrata.", sourceUrl: "https://www.schaer.com/it-it", verifiedAt: CHECKED, manufacturer: true });
  }

  // The milk and yogurt ranges are documented separately by Parmalat. Do not
  // apply the declaration to unspecified snacks, desserts, or Parmalat products.
  const zymilBrand = brands.length && brands.every((brand) => ["zymil", "parmalat", "parmalat zymil"].includes(brand)) && (brands.includes("zymil") || brands.includes("parmalat zymil") || /\bzymil\b/.test(name));
  if (zymilBrand && /\b(latte|milk)\b/.test(name)) {
    claims.push({ allergen: "lattosio", description: "La linea latte Zymil è dichiarata senza lattosio da Parmalat.", sourceUrl: "https://www.parmalat.it/prodotti/latte/latte-senza-lattosio", verifiedAt: CHECKED, manufacturer: true });
  } else if (zymilBrand && /\b(yogurt|yoghurt|greca)\b/.test(name)) {
    claims.push({ allergen: "lattosio", description: "La linea yogurt Zymil è dichiarata senza lattosio da Parmalat.", sourceUrl: "https://www.parmalat.it/zymil/yogurt", verifiedAt: CHECKED, manufacturer: true });
  }

  // Exact official product names, not a lactose-free whitelist for Nutrifree.
  const nutrifreeNames = ["panfette", "panfette con farina integrale", "panfette ai cereali", "panfette per bruschetta", "panbauletto", "panbauletto con farina integrale", "morbido a fette bianco", "le ciabattine", "il mio panino", "il mio panino con farina integrale", "baguette", "focaccia break", "american sandwich", "panino hamburger", "le sfoglie", "il tarallo", "i grissini", "mix per pane con farina integrale", "mix per pasta fresca", "mix per pasta frolla", "mix per dolci", "mix universale mais free", "farina multiuso", "farina finissima di riso", "farina finissima di mais", "farina di grano saraceno", "pangrattato crispy", "cous cous di mais", "goccefrolla snack golosita al cacao", "goccefrolla snack classica bonta", "muffin", "biscotti del mattino", "biscotti", "goccefrolla con gocce di cioccolato", "frollini con panna", "cornetti classici", "cornetti all albicocca", "cornetti ai frutti di bosco", "fette biscottate", "fette biscottate con farina integrale", "corn flakes", "corn flakes senza zuccheri aggiunti", "pandoro classico", "panettone cioccolato", "panettone classico", "pandoro senza glutine e lattosio", "cantucci", "ciocodelis", "farcitu"];
  const nutrifreeName = name.replace(/\bnutrifree\b/g, " ").replace(/\b\d+(?:\s+\d+)?\s*(?:g|gr|kg|ml|l)\b/g, " ").trim().replace(/\s+/g, " ");
  if (brands.length && brands.every((brand) => brand === "nutrifree") && nutrifreeNames.includes(nutrifreeName)) {
    for (const allergen of ["glutine", "lattosio"] as const) claims.push({ allergen, description: `Questo prodotto Nutrifree è incluso nella selezione ufficiale senza glutine e senza lattosio.`, sourceUrl: "https://nutrifree.it/categoria-prodotti/i-buoni-senza-lattosio/", verifiedAt: CHECKED, manufacturer: true });
  }
  return claims;
}

const LABELS: Partial<Record<AllergenId, string[]>> = {
  glutine: ["en:no-gluten", "en:gluten-free"],
  lattosio: ["en:no-lactose", "en:lactose-free"],
  arachidi: ["en:no-peanuts"], "frutta-guscio": ["en:no-nuts"],
  uova: ["en:no-eggs"], soia: ["en:no-soy"],
};
const DECLARATIONS: Partial<Record<AllergenId, RegExp>> = {
  glutine: /\b(senza glutine|gluten free)\b/,
  lattosio: /\b(senza lattosio|lactose free)\b/,
  arachidi: /\b(senza arachidi|peanut free)\b/,
  "frutta-guscio": /\b(senza frutta a guscio|nut free)\b/,
  uova: /\b(senza uova|egg free)\b/,
  soia: /\b(senza soia|soy free|soya free)\b/,
  sesamo: /\b(senza sesamo|sesame free)\b/,
};
export function freeFromClaim(product: ProductIdentity & { labelTags?: string[] }, allergen: AllergenId): FreeFromClaim | undefined {
  const official = manufacturerFreeFromClaims(product).find((claim) => claim.allergen === allergen);
  if (official) return official;
  const label = (LABELS[allergen] ?? []).some((tag) => product.labelTags?.includes(tag));
  // Names are a catalog declaration, not evidence inferred from ingredients or
  // a recipe. Ignore negative/uncertain names and user-authored manual products.
  const name = normalize(product.name);
  const declaredName = product.source === "off" && !/\b(non|not|no longer)\b/.test(name) && !product.name.includes("?") && DECLARATIONS[allergen]?.test(name);
  if (!label && !declaredName) return undefined;
  const sourceUrl = product.code && /^\d{8,14}$/.test(product.code) ? `https://world.openfoodfacts.org/product/${product.code}` : undefined;
  return { allergen, description: `Dichiarazione senza ${allergen === "frutta-guscio" ? "frutta a guscio" : allergen} presente nella scheda del prodotto.`, ...(sourceUrl ? { sourceUrl } : {}), manufacturer: false };
}
