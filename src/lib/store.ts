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

export function addShoppingItems(items: Array<{ name: string; quantity: string; recipe?: string | undefined }>) {
  const existing = getShoppingList();
  const next = [...existing];
  for (const item of items) {
    const match = next.find((x) => !x.checked && x.name.toLowerCase() === item.name.toLowerCase() && x.quantity === item.quantity);
    if (match) continue;
    next.push({ id: makeItemId(), name: item.name, quantity: item.quantity, recipe: item.recipe, checked: false });
  }
  saveShoppingList(next);
}

export function toggleShoppingItem(id: string) {
  saveShoppingList(getShoppingList().map((item) => item.id === id ? { ...item, checked: !item.checked } : item));
}

export function removeShoppingItem(id: string) {
  saveShoppingList(getShoppingList().filter((item) => item.id !== id));
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