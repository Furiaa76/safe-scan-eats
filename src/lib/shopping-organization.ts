import type { Profile, ShoppingItem } from "./store";
import type { Analysis, Verdict } from "./verdict";

export const SHOPPING_MARKETS = [
  "Aldi", "Bennet", "Carrefour", "Conad", "Coop", "Esselunga", "Eurospin",
  "Il Gigante", "Iper", "Iperal", "Lidl", "MD", "Migros", "Pam", "Tigros", "Unes",
];

export const SHOPPING_DAYS = [
  "Lunedì", "Martedì", "Mercoledì", "Giovedì", "Venerdì", "Sabato", "Domenica",
] as const;
export const SHOPPING_MEALS = ["Pranzo", "Cena"] as const;
export type MealSlot = `${typeof SHOPPING_DAYS[number]}-${typeof SHOPPING_MEALS[number]}`;
export interface PlannedRecipe { key: string; title: string }

export interface ShoppingProductCheck {
  code: string;
  name: string;
  profileKey: string;
  verdict: Verdict;
}

export interface ShoppingItemDetails {
  market?: string | undefined;
  check?: ShoppingProductCheck | undefined;
}

export function marketKey(name?: string) {
  return (name ?? "").trim().replace(/\s+/g, " ").toLocaleLowerCase("it-IT");
}

export function groupShoppingByMarket(items: ShoppingItem[], details: Record<string, ShoppingItemDetails>) {
  const groups = new Map<string, { key: string; title: string; items: ShoppingItem[] }>();
  for (const item of items) {
    const name = details[item.id]?.market ?? "";
    const key = marketKey(name);
    const group = groups.get(key);
    if (group) group.items.push(item);
    else groups.set(key, { key, title: name || "Senza supermercato", items: [item] });
  }
  return [...groups.values()].sort((a, b) => {
    if (!a.key) return 1;
    if (!b.key) return -1;
    return a.title.localeCompare(b.title, "it");
  });
}

export function shoppingProfileKey(profile: Profile | null) {
  if (!profile) return "";
  const nickel = profile.nickel?.enabled ? profile.nickel : null;
  return JSON.stringify([
    1,
    profile.id,
    [...profile.allergens].sort(),
    [...(profile.customAllergens ?? [])].sort(),
    profile.severe,
    nickel?.entries.map(({ kind, name, aliases, code }) => [kind, name, [...aliases].sort(), code]).sort() ?? null,
  ]);
}

export function makeShoppingProductCheck(
  code: string,
  name: string,
  profile: Profile | null,
  analysis: Analysis,
): ShoppingProductCheck {
  const hasFoodRestrictions = profile && (
    profile.allergens.some((allergen) => !allergen.startsWith("polline-")) || profile.customAllergens?.length
  );
  const verdict = !profile || (analysis.verdict === "compatible" && (!hasFoodRestrictions || analysis.incomplete))
    ? "warning"
    : analysis.verdict;
  return { code, name, profileKey: shoppingProfileKey(profile), verdict };
}

export function shoppingProductVerdict(
  item: Pick<ShoppingItem, "name">,
  details: ShoppingItemDetails | undefined,
  activeProfileKey: string,
): Verdict {
  const check = details?.check;
  return activeProfileKey && check?.profileKey === activeProfileKey && check.name === item.name ? check.verdict : "warning";
}
