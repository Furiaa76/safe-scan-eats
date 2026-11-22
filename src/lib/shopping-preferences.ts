import { useSyncExternalStore } from "react";
import { marketKey, type MealSlot, type PlannedRecipe, type ShoppingItemDetails } from "./shopping-organization.ts";

interface ShoppingPreferences {
  details: Record<string, ShoppingItemDetails>;
  meals: Partial<Record<MealSlot, PlannedRecipe[]>>;
}

const KEY = "safe-scan-shopping-organization-v1";
const EMPTY: ShoppingPreferences = { details: {}, meals: {} };
let preferences: ShoppingPreferences | undefined;
const listeners = new Set<() => void>();

export function getShoppingPreferences() {
  if (!preferences) {
    if (typeof window === "undefined") return EMPTY;
    try {
      const saved = window.localStorage.getItem(KEY);
      preferences = saved ? JSON.parse(saved) as ShoppingPreferences : EMPTY;
    } catch {
      preferences = EMPTY;
    }
  }
  return preferences;
}

function write(next: ShoppingPreferences) {
  preferences = next;
  try { window.localStorage.setItem(KEY, JSON.stringify(next)); }
  catch { /* Keep the current session usable if browser storage is unavailable. */ }
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

export function useShoppingPreferences() {
  return useSyncExternalStore(subscribe, getShoppingPreferences, () => EMPTY);
}

export function setShoppingItemDetails(id: string, patch: ShoppingItemDetails) {
  const current = getShoppingPreferences();
  const detail = { ...current.details[id], ...patch };
  const market = detail.market?.trim().replace(/\s+/g, " ").slice(0, 60);
  if (market) {
    detail.market = Object.values(current.details).find((row) => marketKey(row.market) === marketKey(market))?.market ?? market;
  } else {
    delete detail.market;
  }
  const details = { ...current.details };
  if (detail.market || detail.check) details[id] = detail;
  else delete details[id];
  write({ ...current, details });
}

export function forgetShoppingItemDetails(ids: string[]) {
  const current = getShoppingPreferences();
  if (!ids.some((id) => current.details[id])) return;
  const details = { ...current.details };
  for (const id of ids) delete details[id];
  write({ ...current, details });
}

export function setShoppingMealRecipe(slot: MealSlot, recipe: PlannedRecipe, add: boolean) {
  const current = getShoppingPreferences();
  const rest = (current.meals[slot] ?? []).filter(({ key }) => key !== recipe.key);
  const meals = { ...current.meals, [slot]: add ? [...rest, recipe] : rest };
  write({ ...current, meals });
}
