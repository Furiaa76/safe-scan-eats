import type { ShoppingItem } from "./store";

export function mergeShoppingChanges(
  previous: ShoppingItem[],
  current: ShoppingItem[],
  remote: ShoppingItem[],
): ShoppingItem[] {
  if (previous === current) return remote;

  const previousById = new Map(previous.map((item) => [item.id, item]));
  const currentIds = new Set(current.map(({ id }) => id));
  const merged = new Map(remote.map((item) => [item.id, item]));
  let changed = false;

  for (const { id } of previous) {
    if (!currentIds.has(id) && merged.delete(id)) changed = true;
  }

  for (const item of current) {
    const before = previousById.get(item.id);
    if (before && item.name === before.name && item.quantity === before.quantity &&
        item.recipe === before.recipe && item.checked === before.checked) continue;

    const remoteItem = merged.get(item.id);
    if (!before || !remoteItem) {
      merged.set(item.id, item);
    } else {
      merged.set(item.id, {
        ...remoteItem,
        name: item.name !== before.name ? item.name : remoteItem.name,
        quantity: item.quantity !== before.quantity ? item.quantity : remoteItem.quantity,
        recipe: item.recipe !== before.recipe ? item.recipe : remoteItem.recipe,
        checked: item.checked !== before.checked ? item.checked : remoteItem.checked,
      });
    }
    changed = true;
  }

  return changed ? [...merged.values()] : remote;
}
