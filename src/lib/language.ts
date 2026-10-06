import { useSyncExternalStore } from "react";
import { translateValue, type AppLanguage } from "./translations";

const KEY = "safe-scan-eats-language-v1";
const EVENT = "safe-scan-eats-language-change";
let fallback: AppLanguage = "it";

export function getAppLanguage(): AppLanguage {
  if (typeof window === "undefined") return "it";
  try { const saved = window.localStorage.getItem(KEY); return saved === "it" || saved === "en" ? saved : "it"; }
  catch { return fallback; }
}

export function setAppLanguage(language: AppLanguage) {
  fallback = language;
  try { window.localStorage.setItem(KEY, language); } catch { /* Still works when storage is unavailable. */ }
  document.documentElement.lang = language;
  window.dispatchEvent(new Event(EVENT));
}

function subscribe(listener: () => void) {
  window.addEventListener(EVENT, listener);
  const onStorage = (event: StorageEvent) => { if (event.key === KEY || event.key === null) listener(); };
  window.addEventListener("storage", onStorage);
  return () => { window.removeEventListener(EVENT, listener); window.removeEventListener("storage", onStorage); };
}

export function useAppLanguage() {
  const language = useSyncExternalStore(subscribe, getAppLanguage, () => "it" as AppLanguage);
  return { language, t: <T,>(value: T): T => translateValue(value, language) };
}
