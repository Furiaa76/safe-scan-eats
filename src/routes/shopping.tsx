import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, CheckCircle2, Plus, ShoppingCart } from "lucide-react";
import { ShoppingAlexa, useShoppingAlexaLink } from "@/components/ShoppingAlexa";
import { ShoppingListItem, ShoppingMarketField } from "@/components/ShoppingListItem";
import { useShoppingSyncState } from "@/components/ShoppingSync";
import { ShoppingWeek } from "@/components/ShoppingWeek";
import { reportClientError } from "@/lib/client-diagnostics";
import { saveCloudAllergenPreferences, saveCloudProfiles } from "@/lib/cloud-shopping";
import { useAppLanguage } from "@/lib/language";
import { getShoppingRecipes } from "@/lib/shopping-recipes";
import {
  groupShoppingByMarket,
  marketKey,
  SHOPPING_MARKETS,
  shoppingProductVerdict,
  shoppingProfileKey,
} from "@/lib/shopping-organization";
import { useShoppingPreferences } from "@/lib/shopping-preferences";
import {
  addShoppingItem,
  clearCheckedShoppingItems,
  clearShoppingList,
  getShoppingCategory,
  SHOPPING_CATEGORIES,
  useProfile,
  useProfilesState,
  useShoppingList,
  type ShoppingItem,
} from "@/lib/store";
import type { Verdict } from "@/lib/verdict";

const VIEWS = [
  { id: "categories", label: "Categorie" },
  { id: "markets", label: "Supermercati" },
  { id: "week", label: "Menu settimanale" },
] as const;

interface ShoppingGroup { key: string; title: string; emoji?: string; items: ShoppingItem[] }

export const Route = createFileRoute("/shopping")({ component: ShoppingPage });

function ShoppingPage() {
  const { t } = useAppLanguage();
  const items = useShoppingList();
  const profile = useProfile();
  const profilesState = useProfilesState();
  const activeProfileKey = shoppingProfileKey(profilesState.freeMode ? null : profile);
  const { details } = useShoppingPreferences();
  const { linked, setLinked, statusError } = useShoppingAlexaLink();
  const cloudState = useShoppingSyncState();
  const [cloudReady, setCloudReady] = useState(cloudState === "synced");
  const [view, setView] = useState<typeof VIEWS[number]["id"]>("categories");
  const [filter, setFilter] = useState<Verdict | "all">("all");
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [market, setMarket] = useState("");

  useEffect(() => {
    if (cloudState === "synced") setCloudReady(true);
  }, [cloudState]);

  useEffect(() => {
    if (!cloudReady) return;
    void saveCloudAllergenPreferences(profile?.allergens ?? []).catch(error => reportClientError("shopping-preferences", error));
  }, [cloudReady, profile?.allergens]);

  useEffect(() => {
    if (!cloudReady) return;
    void saveCloudProfiles(
      profilesState.profiles.map(({ id, name, allergens }) => ({ id, name, allergens })),
    ).catch(error => reportClientError("shopping-profiles", error));
  }, [cloudReady, profilesState.profiles]);

  const markets = useMemo(() => {
    const options = new Map(SHOPPING_MARKETS.map((name) => [marketKey(name), name]));
    for (const item of items) {
      const market = details[item.id]?.market;
      if (market) options.set(marketKey(market), market);
    }
    return [...options.values()].sort((a, b) => a.localeCompare(b, "it"));
  }, [items, details]);
  const pending = items.filter((item) => !item.checked);
  const checked = items.filter((item) => item.checked);
  const recipeGroups = useMemo(() => getShoppingRecipes(items), [items]);
  const matchesFilter = (item: ShoppingItem) => filter === "all" || shoppingProductVerdict(item, details[item.id], activeProfileKey) === filter;
  const visiblePending = pending.filter(matchesFilter);
  const visibleChecked = checked.filter(matchesFilter);

  const groupItems = (rows: ShoppingItem[]): ShoppingGroup[] => view === "markets"
    ? groupShoppingByMarket(rows, details)
    : SHOPPING_CATEGORIES.map(({ id, label, emoji }) => ({
      key: id, title: label, emoji, items: rows.filter((item) => getShoppingCategory(item.name).id === id),
    })).filter(({ items }) => items.length > 0);

  const renderGroups = (groups: ShoppingGroup[]) => <div className="mt-3 space-y-4">
    {groups.map((group) => <div key={group.key}>
      <h3 className="mb-2 flex items-center gap-2 text-sm font-extrabold">
        {group.emoji && <span aria-hidden="true">{group.emoji}</span>}
        {t(group.title)}
        <span className="rounded-full bg-secondary px-2 py-0.5 text-xs">{group.items.length}</span>
      </h3>
      <div className="space-y-2">
        {group.items.map((item) => <ShoppingListItem key={item.id} item={item} details={details[item.id]} activeProfileKey={activeProfileKey} markets={markets} />)}
      </div>
    </div>)}
  </div>;

  const alexaPanel = <ShoppingAlexa linked={linked} statusError={statusError} onLinked={() => setLinked(true)} />;

  return <div className="mx-auto flex min-h-screen w-full max-w-md flex-col px-5 pb-10 pt-6">
    <header className="flex items-start gap-3">
      <Link to="/" aria-label={t("Torna alla home")} className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-secondary text-secondary-foreground">
        <ArrowLeft className="h-5 w-5" />
      </Link>
      <div className="min-w-0 flex-1">
        <h1 className="text-lg font-extrabold text-foreground">{t("Lista della spesa")}</h1>
        <p className="text-xs text-muted-foreground">
          {pending.length} {t("da comprare")} · {checked.length} {t("acquistati")}{t(cloudState === "synced" ? " · ☁️ sincronizzata" : cloudState === "syncing" ? " · sincronizzo…" : cloudState === "error" ? " · sync non disponibile" : "")}
        </p>
        <div aria-live="polite">
          {linked && <a href="#alexa" className="mt-1 inline-flex items-center gap-1 rounded-full bg-safe-soft px-2 py-1 text-xs font-extrabold text-safe">
            <CheckCircle2 className="h-3.5 w-3.5" />{t("Alexa collegata")}
          </a>}
        </div>
      </div>
      <ShoppingCart className="h-6 w-6 shrink-0 text-primary" />
    </header>

    <div className="mt-4 grid grid-cols-3 gap-1 rounded-2xl bg-muted p-1" role="group" aria-label={t("Organizza la lista")}>
      {VIEWS.map(({ id, label }) => <button key={id} type="button" aria-pressed={view === id} onClick={() => setView(id)} className={`min-h-11 rounded-xl px-1.5 py-1.5 text-xs font-extrabold ${view === id ? "bg-primary text-primary-foreground" : "text-foreground"}`}>
        {t(label)}
      </button>)}
    </div>

    {view === "week" ? <ShoppingWeek recipes={recipeGroups} activeProfileKey={activeProfileKey} /> : <>
      {recipeGroups.length > 0 && <section className="mt-4 rounded-3xl border border-border bg-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-xs font-extrabold uppercase tracking-wide text-muted-foreground">
            {t(recipeGroups.length === 1 ? "Ricetta della lista" : "Ricette della lista")}
          </h2>
          <Link to="/recipes" className="text-xs font-extrabold text-primary">{t("Vai alle ricette")}</Link>
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          {recipeGroups.map(({ key, title }) => <span key={key} className="rounded-full bg-secondary px-3 py-1.5 text-sm font-extrabold text-secondary-foreground">{t(title)}</span>)}
        </div>
      </section>}

      {!linked && alexaPanel}

      <form className="mt-4 rounded-3xl border border-border bg-card p-4" onSubmit={(event) => {
        event.preventDefault();
        if (!name.trim()) return;
        addShoppingItem(name.trim(), quantity.trim() || "1", market);
        setName("");
        setQuantity("1");
      }}>
        <h2 className="font-extrabold">{t("Aggiungi un prodotto")}</h2>
        <div className="my-3 grid grid-cols-[minmax(0,1fr)_95px] gap-2">
          <input value={name} onChange={(event) => setName(event.target.value)} aria-label={t("Nome del prodotto")} placeholder={t("Es. Latte")} className="min-w-0 rounded-xl border border-border bg-background px-3 py-2.5 text-base" />
          <input value={quantity} onChange={(event) => setQuantity(event.target.value)} aria-label={t("Qtà")} placeholder={t("Qtà")} className="rounded-xl border border-border bg-background px-2 py-2.5 text-center text-base" />
        </div>
        <ShoppingMarketField markets={markets} value={market} onChange={setMarket} />
        <button type="submit" disabled={!name.trim()} className="mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary px-2 text-sm font-extrabold text-primary-foreground disabled:opacity-40">
          <Plus className="h-4 w-4" />{t("Aggiungi alla lista")}
        </button>
      </form>

      {items.length === 0 ? <section className="mt-4 rounded-3xl border border-border bg-card p-5 text-center">
        <p className="font-extrabold">{t("La lista è vuota")}</p>
        <p className="mt-1 text-sm text-muted-foreground">{t("Aggiungi prodotti a mano oppure da una ricetta.")}</p>
        <Link to="/recipes" className="mt-4 inline-flex rounded-full bg-secondary px-4 py-2 text-sm font-extrabold text-secondary-foreground">{t("Vai alle ricette")}</Link>
      </section> : <>
        <section className="mt-4 rounded-3xl border border-border bg-card p-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-extrabold">{t("Da comprare")} <span className="text-sm text-muted-foreground">({pending.length})</span></h2>
            <button type="button" onClick={() => {
              if (window.confirm(t("Vuoi svuotare tutta la lista della spesa?"))) clearShoppingList();
            }} className="min-h-9 text-xs font-extrabold text-danger">{t("Svuota tutto")}</button>
          </div>
          <label className="mt-2 block text-sm font-bold">
            {t("Filtra per esito")}
            <select value={filter} onChange={(event) => setFilter(event.target.value as typeof filter)} className="mt-1 min-h-11 w-full rounded-xl border border-border bg-background px-2 text-sm">
              <option value="all">{t("Tutti i prodotti")}</option>
              <option value="compatible">{t("Compatibile con il profilo")}</option>
              <option value="warning">{t("Da verificare")}</option>
              <option value="avoid">{t("Da evitare")}</option>
            </select>
          </label>
          <p className="mt-2 text-xs text-muted-foreground">{t("I colori si basano sul profilo attivo e sui dati analizzati. Controlla sempre l’etichetta.")}</p>
          <Link to="/scan" search={{ mode: "barcode" }} className="mt-1 inline-flex min-h-9 items-center text-xs font-extrabold text-primary">
            {t("Scansiona un prodotto per verificarlo")}
          </Link>
          {visiblePending.length ? renderGroups(groupItems(visiblePending)) : <p className="mt-3 text-sm text-muted-foreground">{t(pending.length ? "Nessun prodotto per questo esito." : "Hai già spuntato tutto.")}</p>}
        </section>

        {checked.length > 0 && <section className="mt-4 rounded-3xl border border-border bg-card p-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-extrabold">{t("Acquistati")} <span className="text-sm text-muted-foreground">({checked.length})</span></h2>
            <button type="button" onClick={clearCheckedShoppingItems} className="min-h-9 text-xs font-extrabold text-danger">{t("Elimina acquistati")}</button>
          </div>
          {visibleChecked.length ? renderGroups(groupItems(visibleChecked)) : <p className="mt-3 text-sm text-muted-foreground">{t("Nessun prodotto per questo esito.")}</p>}
        </section>}
      </>}
    </>}

    {(linked || view === "week") && <div id="alexa" className="scroll-mt-4">{alexaPanel}</div>}
  </div>;
}
