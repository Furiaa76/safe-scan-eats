import type { FoodProduct } from "./off";
export interface BrandSupermarket {
  name: string;
  sourceUrl: string;
  brand: string;
  code: string;
}
// Association to the retailer's own brand is guidance, never product-page or stock proof.
const GROUPS = [
  {
    name: "Lidl",
    sourceUrl: "https://www.lidl.it/h/dispensa/h10096095",
    brands: ["baresa"],
  },
  {
    name: "Lidl",
    sourceUrl: "https://www.lidl.it/h/formaggio-latticini/h10071017",
    brands: ["milbona"],
  },
  {
    name: "MD",
    sourceUrl: "https://www.mdspa.it/marchi-md/3-vivo-meglio/",
    brands: ["vivo meglio"],
  },
  {
    name: "Lidl",
    sourceUrl: "https://corporate.lidl.it/la-nostra-promessa",
    brands: [
      "italiamo",
      "vemondo",
      "combino",
      "bellarom",
      "crownfield",
      "alesto",
      "eridanus",
      "primadonna",
      "solevita",
      "freeway",
      "belbake",
      "chef select",
      "dulano",
      "freshona",
      "gelatelli",
      "kania",
      "nonna mia",
      "lord nelson",
      "realforno",
      "maribel",
      "nixe",
      "certossa",
    ],
  },
  {
    name: "Eurospin",
    sourceUrl: "https://www.eurospin.com/it-it/i-nostri-marchi/",
    brands: [
      "tre mulini",
      "pascoli italiani",
      "ondina",
      "land",
      "delizie dal sole",
      "dolciando",
      "il braciere",
      "antica acetaia",
      "best brau",
      "blues",
      "buon pascolo",
      "collina d'oro",
      "amo essere",
    ],
  },
];
const normalized = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
export function supermarketBrandOwners(
  products: Pick<FoodProduct, "source" | "code" | "brand">[],
  country: string,
): BrandSupermarket[] {
  if (country !== "it") return [];
  const found = new Map<string, BrandSupermarket>();
  for (const product of products) {
    if (
      product.source === "manual" ||
      !/^\d{8,14}$/.test(product.code) ||
      !product.brand
    )
      continue;
    const brands = product.brand.split(/[,;]/).map(normalized);
    for (const group of GROUPS) {
      const brand = brands.find((brand) => group.brands.includes(brand));
      if (brand && !found.has(group.name))
        found.set(group.name, {
          name: group.name,
          sourceUrl: group.sourceUrl,
          brand,
          code: product.code,
        });
    }
  }
  return [...found.values()];
}
