import { useSyncExternalStore } from "react";
import type { AllergenId } from "./allergens";

const LEGACY_PROFILE_KEY = "safefood-profile";
const PROFILES_KEY = "safefood-profiles-v2";
const HISTORY_KEY = "safefood-history";
const SHOPPING_KEY = "safefood-shopping-list";

export interface Profile {
  id: string;
  name: string;
  allergens: AllergenId[];
  severe: boolean;
}

export interface ProfilesState {
  profiles: Profile[];
  activeProfileId: string | null;
  freeMode: boolean;
}

export interface ShoppingItem {
  id: string;
  name: string;
  quantity: string;
  recipe?: string | undefined;
  checked: boolean;
  createdAt?: string | undefined;
}

export type ShoppingCategoryId =
  | "produce"
  | "meat"
  | "fish"
  | "dairy"
  | "bakery"
  | "pantry"
  | "frozen"
  | "drinks"
  | "household"
  | "other";

export interface ShoppingCategory {
  id: ShoppingCategoryId;
  label: string;
  emoji: string;
  order: number;
}

export const SHOPPING_CATEGORIES: ShoppingCategory[] = [
  { id: "produce", label: "Frutta e verdura", emoji: "🥬", order: 10 },
  { id: "meat", label: "Carne e salumi", emoji: "🥩", order: 20 },
  { id: "fish", label: "Pesce", emoji: "🐟", order: 30 },
  { id: "dairy", label: "Latticini e uova", emoji: "🥛", order: 40 },
  { id: "bakery", label: "Pane e forno", emoji: "🥖", order: 50 },
  { id: "pantry", label: "Dispensa", emoji: "🛒", order: 60 },
  { id: "frozen", label: "Surgelati", emoji: "❄️", order: 70 },
  { id: "drinks", label: "Bevande", emoji: "🥤", order: 80 },
  { id: "household", label: "Casa e igiene", emoji: "🧻", order: 90 },
  { id: "other", label: "Altro", emoji: "📦", order: 100 },
];

function includesAny(value: string, words: string[]) {
  return words.some((word) => value.includes(word));
}

export function getShoppingCategory(name: string): ShoppingCategory {
  const value = name
    .trim()
    .toLocaleLowerCase("it-IT")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  let id: ShoppingCategoryId = "other";

  if (includesAny(value, [
    "mela", "mele", "pera", "pere", "banana", "arancia", "limone", "fragol", "frutta",
    "pomodor", "patat", "cipoll", "carot", "sedano", "insalat", "lattuga", "zucchin",
    "melanzan", "peperon", "aglio", "prezzemol", "basilic", "rosmarin", "verdura",
    "pisell", "fagiolin", "broccol", "cavolfior", "spinac", "fungh"
  ])) id = "produce";
  else if (includesAny(value, [
    "carne", "macinat", "manzo", "vitello", "maiale", "pollo", "tacchino", "cinghiale",
    "hamburger", "salsic", "prosciutt", "salame", "pancetta", "guanciale", "speck", "bresaola"
  ])) id = "meat";
  else if (includesAny(value, [
    "pesce", "salmone", "tonno", "merluzzo", "orata", "branzino", "gamber", "cozz", "vongol", "calamar"
  ])) id = "fish";
  else if (includesAny(value, [
    "latte", "burro", "yogurt", "formaggio", "mozzarella", "parmigiano", "pecorino",
    "ricotta", "mascarpone", "panna", "uovo", "uova", "besciamella"
  ])) id = "dairy";
  else if (includesAny(value, [
    "pane", "panino", "piadina", "focaccia", "pizza", "savoiard", "biscott", "croissant"
  ])) id = "bakery";
  else if (includesAny(value, [
    "surgel", "gelato", "ghiacciol"
  ])) id = "frozen";
  else if (includesAny(value, [
    "acqua", "vino", "birra", "succo", "cola", "bibita", "caffe", "te ", "tisana"
  ])) id = "drinks";
  else if (includesAny(value, [
    "detersiv", "candeggina", "sapone", "shampoo", "carta igienica", "scottex", "tovagliol",
    "dentifricio", "spugna", "sacchi", "pellicola", "alluminio"
  ])) id = "household";
  else if (includesAny(value, [
    "pasta", "spaghetti", "riso", "farina", "zucchero", "sale", "pepe", "olio", "aceto",
    "passata", "pomodoro pelato", "pangrattato", "lievito", "cacao", "cioccolato", "miele",
    "legumi", "fagioli", "ceci", "lenticch", "mais", "cereali"
  ])) id = "pantry";

  return SHOPPING_CATEGORIES.find((category) => category.id === id) ?? SHOPPING_CATEGORIES[SHOPPING_CATEGORIES.length - 1];
}

export interface HistoryEntry {
  /** Codice a barre (se disponibile) */
  code?: string | undefined;
  name: string;
  brand?: string | undefined;
  imageUrl?: string | undefined;
  source: "off" | "manual";
  /** Ingredienti inseriti a mano / da foto */
  text?: string | undefined;
  verdict: "compatible" | "warning" | "avoid";
  date: string; // ISO
}

let listeners: Array<() => void> = [];

function emit() {
  listeners.forEach((l) => l());
}

// Cache: useSyncExternalStore richiede snapshot stabili tra i render
let profilesCache: ProfilesState | undefined;
let historyCache: HistoryEntry[] | undefined;
let shoppingCache: ShoppingItem[] | undefined;

function read<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function makeItemId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `item-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function makeProfileId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `profile-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeState(state: ProfilesState): ProfilesState {
  const profiles = Array.isArray(state.profiles) ? state.profiles : [];
  const activeExists = profiles.some((p) => p.id === state.activeProfileId);
  return {
    profiles,
    activeProfileId: state.freeMode ? null : activeExists ? state.activeProfileId : profiles[0]?.id ?? null,
    freeMode: !!state.freeMode,
  };
}

function loadProfilesState(): ProfilesState {
  const current = read<ProfilesState>(PROFILES_KEY);
  if (current) return normalizeState(current);

  // Migrazione trasparente dal vecchio profilo singolo.
  const legacy = read<Omit<Profile, "id"> & { id?: string }>(LEGACY_PROFILE_KEY);
  if (legacy) {
    const migrated: Profile = {
      id: legacy.id || makeProfileId(),
      name: legacy.name || "Profilo",
      allergens: Array.isArray(legacy.allergens) ? legacy.allergens : [],
      severe: !!legacy.severe,
    };
    const state: ProfilesState = { profiles: [migrated], activeProfileId: migrated.id, freeMode: false };
    if (typeof window !== "undefined") window.localStorage.setItem(PROFILES_KEY, JSON.stringify(state));
    return state;
  }

  return { profiles: [], activeProfileId: null, freeMode: false };
}

export function getProfilesState(): ProfilesState {
  if (profilesCache === undefined) profilesCache = loadProfilesState();
  return profilesCache;
}

function saveProfilesState(state: ProfilesState) {
  profilesCache = normalizeState(state);
  window.localStorage.setItem(PROFILES_KEY, JSON.stringify(profilesCache));
  emit();
}

export function getProfile(): Profile | null {
  const state = getProfilesState();
  if (state.freeMode || !state.activeProfileId) return null;
  return state.profiles.find((p) => p.id === state.activeProfileId) ?? null;
}

/** Mantiene compatibilità con il vecchio salvataggio e aggiorna/crea il profilo attivo. */
export function saveProfile(p: Omit<Profile, "id"> & { id?: string }) {
  const state = getProfilesState();
  const id = p.id || state.activeProfileId || makeProfileId();
  const nextProfile: Profile = { id, name: p.name, allergens: p.allergens, severe: p.severe };
  const exists = state.profiles.some((profile) => profile.id === id);
  const profiles = exists
    ? state.profiles.map((profile) => (profile.id === id ? nextProfile : profile))
    : [...state.profiles, nextProfile];
  saveProfilesState({ profiles, activeProfileId: id, freeMode: false });
}

export function addProfile(p: Omit<Profile, "id">): Profile {
  const profile: Profile = { ...p, id: makeProfileId() };
  const state = getProfilesState();
  saveProfilesState({ profiles: [...state.profiles, profile], activeProfileId: profile.id, freeMode: false });
  return profile;
}

export function setActiveProfile(id: string) {
  const state = getProfilesState();
  if (!state.profiles.some((p) => p.id === id)) return;
  saveProfilesState({ ...state, activeProfileId: id, freeMode: false });
}

export function enableFreeMode() {
  const state = getProfilesState();
  saveProfilesState({ ...state, activeProfileId: null, freeMode: true });
}

export function removeProfile(id: string) {
  const state = getProfilesState();
  const profiles = state.profiles.filter((p) => p.id !== id);
  const activeProfileId = state.activeProfileId === id ? profiles[0]?.id ?? null : state.activeProfileId;
  saveProfilesState({ profiles, activeProfileId, freeMode: profiles.length === 0 ? true : state.freeMode });
}

export function getHistory(): HistoryEntry[] {
  if (historyCache === undefined) historyCache = read<HistoryEntry[]>(HISTORY_KEY) ?? [];
  return historyCache;
}

export function addToHistory(entry: HistoryEntry) {
  const last = getHistory()[0];
  if (
    last &&
    last.name === entry.name &&
    last.code === entry.code &&
    last.text === entry.text &&
    Date.now() - new Date(last.date).getTime() < 60_000
  )
    return;
  historyCache = [entry, ...getHistory()].slice(0, 50);
  window.localStorage.setItem(HISTORY_KEY, JSON.stringify(historyCache));
  emit();
}

export function clearHistory() {
  historyCache = [];
  window.localStorage.removeItem(HISTORY_KEY);
  emit();
}

export function getShoppingList(): ShoppingItem[] {
  if (shoppingCache === undefined) {
    const loaded = read<ShoppingItem[]>(SHOPPING_KEY) ?? [];
    const normalized = normalizeExistingShoppingItems(loaded);
    shoppingCache = normalized;
    if (typeof window !== "undefined" && JSON.stringify(normalized) !== JSON.stringify(loaded)) {
      window.localStorage.setItem(SHOPPING_KEY, JSON.stringify(normalized));
    }
  }
  return shoppingCache;
}

function saveShoppingList(items: ShoppingItem[]) {
  shoppingCache = items;
  window.localStorage.setItem(SHOPPING_KEY, JSON.stringify(items));
  emit();
}

function shoppingNameKey(name: string) {
  return name.trim().toLocaleLowerCase("it-IT").replace(/\s+/g, " ");
}

type ParsedQuantity = { value: number; unit: "g" | "ml" | "pz" };

function normalizeShoppingQuantity(quantity: string) {
  const clean = quantity.trim().replace(/[.;:]+$/, "").trim();
  if (/^\d+(?:[.,]\d+)?$/.test(clean)) return `${clean.replace(",", ".")} pz`;
  const compact = clean.match(/^(\d+(?:[.,]\d+)?)\s*(kg|g|l|ml|pz|pezzi|pezzo)$/i);
  if (compact) {
    const value = compact[1].replace(",", ".");
    const unit = compact[2].toLowerCase();
    const normalizedUnit = unit === "pezzi" || unit === "pezzo" ? "pz" : unit;
    return `${value} ${normalizedUnit}`;
  }
  return clean || "1 pz";
}

function parseShoppingQuantity(quantity: string): ParsedQuantity | null {
  const match = normalizeShoppingQuantity(quantity).toLowerCase().replace(",", ".").match(/^(\d+(?:\.\d+)?)\s*(kg|g|l|ml|pz|pezzi|pezzo)?$/);
  if (!match) return null;
  const value = Number(match[1]);
  if (!Number.isFinite(value)) return null;
  const rawUnit = match[2] || "pz";
  if (rawUnit === "kg") return { value: value * 1000, unit: "g" };
  if (rawUnit === "l") return { value: value * 1000, unit: "ml" };
  if (rawUnit === "pezzi" || rawUnit === "pezzo" || rawUnit === "pz") return { value, unit: "pz" };
  return { value, unit: rawUnit as "g" | "ml" };
}

function formatShoppingQuantity(parsed: ParsedQuantity) {
  const value = Math.round(parsed.value * 100) / 100;
  if (parsed.unit === "g" && value >= 1000 && value % 1000 === 0) return `${value / 1000} kg`;
  if (parsed.unit === "ml" && value >= 1000 && value % 1000 === 0) return `${value / 1000} l`;
  if (parsed.unit === "pz") return String(value);
  return `${value} ${parsed.unit}`;
}

function mergeShoppingQuantities(a: string, b: string): string | null {
  if (a.trim().toLowerCase() === b.trim().toLowerCase()) return a.trim();
  const first = parseShoppingQuantity(a);
  const second = parseShoppingQuantity(b);
  if (!first || !second || first.unit !== second.unit) return null;
  return formatShoppingQuantity({ value: first.value + second.value, unit: first.unit });
}

function mergeRecipeLabels(a?: string, b?: string) {
  const labels = [a, b]
    .flatMap((value) => value?.split(" · ") ?? [])
    .map((value) => value.trim())
    .filter(Boolean);
  const unique = Array.from(new Set(labels));
  return unique.length ? unique.join(" · ") : undefined;
}

function normalizeExistingShoppingItems(items: ShoppingItem[]) {
  const normalized = items.map((item) => {
    const parsed = splitNameAndQuantity(item.name, item.quantity);
    return {
      ...item,
      name: parsed.name,
      quantity: normalizeShoppingQuantity(parsed.quantity),
    };
  });

  const merged: ShoppingItem[] = [];
  for (const item of normalized) {
    const index = merged.findIndex((current) =>
      current.checked === item.checked &&
      shoppingNameKey(current.name) === shoppingNameKey(item.name) &&
      (current.recipe ?? "") === (item.recipe ?? "")
    );

    if (index >= 0) {
      const current = merged[index];
      const quantity = mergeShoppingQuantities(current.quantity, item.quantity);
      if (quantity) {
        merged[index] = { ...current, quantity };
        continue;
      }
    }

    merged.push(item);
  }

  return merged;
}

export function addShoppingItems(items: Array<{ name: string; quantity: string; recipe?: string | undefined }>) {
  const next = [...getShoppingList()];
  for (const raw of items) {
    const name = raw.name.trim();
    const quantity = normalizeShoppingQuantity(raw.quantity);
    if (!name) continue;

    const index = next.findIndex((item) => !item.checked && shoppingNameKey(item.name) === shoppingNameKey(name));
    if (index >= 0) {
      const current = next[index];
      const mergedQuantity = mergeShoppingQuantities(current.quantity, quantity);
      if (mergedQuantity) {
        next[index] = {
          ...current,
          quantity: mergedQuantity,
          recipe: mergeRecipeLabels(current.recipe, raw.recipe),
        };
        continue;
      }
      if (current.quantity.trim().toLowerCase() === quantity.toLowerCase()) {
        next[index] = { ...current, recipe: mergeRecipeLabels(current.recipe, raw.recipe) };
        continue;
      }
    }

    next.push({
      id: makeItemId(),
      name,
      quantity,
      recipe: raw.recipe,
      checked: false,
      createdAt: new Date().toISOString(),
    });
  }
  saveShoppingList(next);
}

function splitNameAndQuantity(name: string, quantity: string) {
  const cleanName = name.trim();
  const cleanQuantity = quantity.trim();
  const defaultQuantity = !cleanQuantity || /^1(?:[.,]0+)?(?:\s*pz)?$/i.test(cleanQuantity);

  if (defaultQuantity) {
    const match = cleanName.match(/^(.*?)[\s-]*(\d+(?:[.,]\d+)?)\s*(kg|g|l|ml|pz|pezzi|pezzo)\.?$/i);
    if (match) {
      const parsedName = match[1]?.trim();
      const parsedQuantity = `${match[2]} ${match[3]}`;
      if (parsedName) return { name: parsedName, quantity: parsedQuantity };
    }
  }

  return { name: cleanName, quantity: cleanQuantity || "1" };
}

export function addShoppingItem(name: string, quantity = "1") {
  const parsed = splitNameAndQuantity(name, quantity);
  addShoppingItems([{ name: parsed.name, quantity: normalizeShoppingQuantity(parsed.quantity) }]);
}

export function updateShoppingItem(id: string, patch: Partial<Pick<ShoppingItem, "name" | "quantity" | "recipe" | "checked">>) {
  const next = getShoppingList().map((item) => {
    if (item.id !== id) return item;
    const name = patch.name !== undefined ? patch.name.trim() : item.name;
    const quantity = patch.quantity !== undefined ? normalizeShoppingQuantity(patch.quantity) : item.quantity;
    return { ...item, ...patch, name: name || item.name, quantity };
  });
  saveShoppingList(next);
}

export function toggleShoppingItem(id: string) {
  saveShoppingList(getShoppingList().map((item) => item.id === id ? { ...item, checked: !item.checked } : item));
}

export function removeShoppingItem(id: string) {
  saveShoppingList(getShoppingList().filter((item) => item.id !== id));
}

export function clearCheckedShoppingItems() {
  saveShoppingList(getShoppingList().filter((item) => !item.checked));
}

export function replaceShoppingList(items: ShoppingItem[]) {
  saveShoppingList(items);
}

export function clearShoppingList() {
  shoppingCache = [];
  window.localStorage.removeItem(SHOPPING_KEY);
  emit();
}

function subscribe(cb: () => void) {
  listeners.push(cb);
  return () => {
    listeners = listeners.filter((l) => l !== cb);
  };
}

export function useProfile(): Profile | null {
  return useSyncExternalStore(subscribe, getProfile, () => null);
}

export function useProfilesState(): ProfilesState {
  return useSyncExternalStore(subscribe, getProfilesState, () => ({ profiles: [], activeProfileId: null, freeMode: false }));
}

export function useHistory(): HistoryEntry[] {
  return useSyncExternalStore(subscribe, getHistory, () => []);
}

export function useShoppingList(): ShoppingItem[] {
  return useSyncExternalStore(subscribe, getShoppingList, () => []);
}