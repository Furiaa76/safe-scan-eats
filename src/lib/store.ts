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
  if (shoppingCache === undefined) shoppingCache = read<ShoppingItem[]>(SHOPPING_KEY) ?? [];
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

function parseShoppingQuantity(quantity: string): ParsedQuantity | null {
  const match = quantity.trim().toLowerCase().replace(",", ".").match(/^(\d+(?:\.\d+)?)\s*(kg|g|l|ml|pz|pezzi|pezzo)?$/);
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

export function addShoppingItems(items: Array<{ name: string; quantity: string; recipe?: string | undefined }>) {
  const next = [...getShoppingList()];
  for (const raw of items) {
    const name = raw.name.trim();
    const quantity = raw.quantity.trim() || "1";
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

export function addShoppingItem(name: string, quantity = "1") {
  addShoppingItems([{ name, quantity }]);
}

export function updateShoppingItem(id: string, patch: Partial<Pick<ShoppingItem, "name" | "quantity" | "recipe" | "checked">>) {
  const next = getShoppingList().map((item) => {
    if (item.id !== id) return item;
    const name = patch.name !== undefined ? patch.name.trim() : item.name;
    const quantity = patch.quantity !== undefined ? patch.quantity.trim() || "1" : item.quantity;
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