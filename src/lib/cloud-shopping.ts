import { createClient } from "@supabase/supabase-js";
import type { ShoppingItem } from "./store";

const HOUSEHOLD_KEY = "safe-scan-household-key";

function makeHouseholdKey() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  throw new Error("CRYPTO_UUID_UNAVAILABLE");
}

export function getHouseholdKey() {
  if (typeof window === "undefined") return null;
  let key = window.localStorage.getItem(HOUSEHOLD_KEY);
  if (!key) {
    key = makeHouseholdKey();
    window.localStorage.setItem(HOUSEHOLD_KEY, key);
  }
  return key;
}

const DEFAULT_SUPABASE_URL = "https://mqrmdynpcextvjgkkyfj.supabase.co";
const DEFAULT_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_umpU64DAPwgRiT56fEzvtw_pIo2Wh20";

function getClient() {
  const url = (import.meta.env.VITE_SUPABASE_URL as string | undefined) || DEFAULT_SUPABASE_URL;
  const publishableKey =
    (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined) ||
    (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ||
    DEFAULT_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !publishableKey) return null;
  return createClient(url, publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function isCloudShoppingConfigured() {
  return Boolean(getClient());
}

export async function loadCloudShopping(): Promise<ShoppingItem[] | null> {
  const client = getClient();
  const householdKey = getHouseholdKey();
  if (!client || !householdKey) return null;

  const { data, error } = await client.rpc("safe_scan_get_shopping", {
    p_household_key: householdKey,
  });
  if (error) throw error;

  return (data ?? []).map((row: Record<string, unknown>) => ({
    id: String(row.id),
    name: String(row.name ?? ""),
    quantity: String(row.quantity ?? "1 pz"),
    recipe: typeof row.recipe === "string" ? row.recipe : undefined,
    checked: Boolean(row.checked),
    createdAt: typeof row.created_at === "string" ? row.created_at : undefined,
  }));
}

export async function saveCloudShopping(items: ShoppingItem[]) {
  const client = getClient();
  const householdKey = getHouseholdKey();
  if (!client || !householdKey) return false;

  const payload = items.map((item) => ({
    id: item.id,
    name: item.name,
    quantity: item.quantity,
    recipe: item.recipe ?? "",
    checked: item.checked,
    createdAt: item.createdAt ?? new Date().toISOString(),
  }));

  const { error } = await client.rpc("safe_scan_replace_shopping", {
    p_household_key: householdKey,
    p_items: payload,
  });
  if (error) throw error;
  return true;
}

export async function clearCloudShopping() {
  const client = getClient();
  const householdKey = getHouseholdKey();
  if (!client || !householdKey) return false;

  const { error } = await client.rpc("safe_scan_replace_shopping", {
    p_household_key: householdKey,
    p_items: [],
  });
  if (error) throw error;
  return true;
}

export async function linkAlexaPairingCode(code: string) {
  const client = getClient();
  const householdKey = getHouseholdKey();
  if (!client || !householdKey) throw new Error("CLOUD_NOT_CONFIGURED");

  const cleaned = code.replace(/\D/g, "").slice(0, 6);
  if (cleaned.length !== 6) return false;

  const { data, error } = await client.rpc("safe_scan_link_alexa", {
    p_pairing_code: cleaned,
    p_household_key: householdKey,
  });
  if (error) throw error;
  return data === true;
}


export async function saveCloudAllergenPreferences(allergens: string[]) {
  const client = getClient();
  const householdKey = getHouseholdKey();
  if (!client || !householdKey) return false;

  const { error } = await client.rpc("safe_scan_set_preferences", {
    p_household_key: householdKey,
    p_allergens: Array.from(new Set(allergens)),
  });
  if (error) throw error;
  return true;
}


export async function saveCloudProfiles(
  profiles: Array<{ id: string; name: string; allergens: string[] }>
) {
  const client = getClient();
  const householdKey = getHouseholdKey();
  if (!client || !householdKey) return false;

  const payload = profiles.map((profile) => ({
    id: profile.id,
    name: profile.name.trim() || "Profilo",
    allergens: Array.from(new Set(profile.allergens)),
  }));

  const { error } = await client.rpc("safe_scan_set_profiles", {
    p_household_key: householdKey,
    p_profiles: payload,
  });
  if (error) throw error;
  return true;
}
