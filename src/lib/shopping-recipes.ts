import type { ShoppingItem } from "./store";

export function getShoppingRecipes(items: readonly ShoppingItem[]) {
  const recipes = new Map<string, { key: string; title: string; items: ShoppingItem[] }>();

  for (const item of items) {
    const seen = new Set<string>();
    for (const label of (item.recipe ?? "").split("·")) {
      const name = label.trim().replace(/^(la|il|lo|gli|le|i)\s+/i, "");
      const key = name.normalize("NFC").toLocaleLowerCase("it-IT").replace(/\s+/g, " ");
      if (!key || seen.has(key)) continue;
      seen.add(key);

      const existing = recipes.get(key);
      if (existing) {
        existing.items.push(item);
      } else {
        recipes.set(key, { key, title: name.charAt(0).toLocaleUpperCase("it-IT") + name.slice(1), items: [item] });
      }
    }
  }

  return [...recipes.values()];
}
