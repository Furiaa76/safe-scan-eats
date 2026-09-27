import { useSyncExternalStore } from "react";
import type { AllergenId } from "./allergens";

const PROFILE_KEY = "safefood-profile";
const HISTORY_KEY = "safefood-history";

export interface Profile {
  name: string;
  allergens: AllergenId[];
  severe: boolean;
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
let profileCache: Profile | null | undefined;
let historyCache: HistoryEntry[] | undefined;

function read<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function getProfile(): Profile | null {
  if (profileCache === undefined) profileCache = read<Profile>(PROFILE_KEY);
  return profileCache;
}

export function saveProfile(p: Profile) {
  window.localStorage.setItem(PROFILE_KEY, JSON.stringify(p));
  profileCache = p;
  emit();
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

function subscribe(cb: () => void) {
  listeners.push(cb);
  return () => {
    listeners = listeners.filter((l) => l !== cb);
  };
}

export function useProfile(): Profile | null {
  return useSyncExternalStore(subscribe, getProfile, () => null);
}

export function useHistory(): HistoryEntry[] {
  return useSyncExternalStore(subscribe, getHistory, () => []);
}