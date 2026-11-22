import { useRouterState } from "@tanstack/react-router";
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { reportClientError } from "@/lib/client-diagnostics";
import { isCloudShoppingConfigured, loadCloudShopping, saveCloudShopping } from "@/lib/cloud-shopping";
import { mergeShoppingChanges } from "@/lib/shopping-sync";
import {
  getPendingShoppingBase,
  getShoppingList,
  replaceShoppingList,
  setPendingShoppingBase,
  subscribeToStore,
} from "@/lib/store";

type ShoppingSyncState = "local" | "syncing" | "synced" | "error";

const ShoppingSyncContext = createContext<ShoppingSyncState>("local");

export function useShoppingSyncState() {
  return useContext(ShoppingSyncContext);
}

export function ShoppingSync({ children }: { children: ReactNode }) {
  const shoppingPath = useRouterState({
    select: ({ location }) =>
      location.pathname === "/shopping" || location.pathname === "/recipes" ? location.pathname : null,
  });
  const [state, setState] = useState<ShoppingSyncState>("local");
  const requestSync = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!isCloudShoppingConfigured()) return;

    let observed = getShoppingList();
    let pendingBase = getPendingShoppingBase();
    let synced = pendingBase ?? observed;
    let disposed = false;
    let running = false;
    let requested = false;

    async function sync() {
      requested = true;
      if (running) return;
      running = true;
      setState("syncing");
      let operation: "shopping-load" | "shopping-save" = "shopping-load";

      try {
        while (requested && !disposed) {
          requested = false;
          operation = "shopping-load";
          const remote = await loadCloudShopping();
          if (disposed || !remote) break;

          const beforeSave = getShoppingList();
          const next = mergeShoppingChanges(synced, beforeSave, remote);
          if (next !== remote) {
            operation = "shopping-save";
            await saveCloudShopping(next);
            if (disposed) return;
          }

          // Reapply edits made while the previous request was being saved.
          synced = next;
          observed = mergeShoppingChanges(beforeSave, getShoppingList(), next);
          replaceShoppingList(observed);
          pendingBase = observed === synced ? null : synced;
          setPendingShoppingBase(pendingBase);
        }
        if (!disposed) setState("synced");
      } catch (error) {
        reportClientError(operation, error);
        if (!disposed) setState("error");
      } finally {
        running = false;
      }
    }

    requestSync.current = () => void sync();
    const unsubscribe = subscribeToStore(() => {
      const current = getShoppingList();
      if (current === observed) return;
      observed = current;
      if (!pendingBase) {
        pendingBase = synced;
        setPendingShoppingBase(pendingBase);
      }
      void sync();
    });

    return () => {
      disposed = true;
      requestSync.current = null;
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!shoppingPath) return;

    const refresh = () => requestSync.current?.();
    refresh();
    window.addEventListener("focus", refresh);
    window.addEventListener("online", refresh);
    return () => {
      window.removeEventListener("focus", refresh);
      window.removeEventListener("online", refresh);
    };
  }, [shoppingPath]);

  return <ShoppingSyncContext.Provider value={state}>{children}</ShoppingSyncContext.Provider>;
}
