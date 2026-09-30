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

function getClient() {
  const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
  if (!url || !anonKey) return null;
  return createClient(url, anonKey, {
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
