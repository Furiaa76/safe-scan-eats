import { useAppLanguage } from "@/lib/language";
import { translateText } from "@/lib/translations";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { ArrowLeft, Loader2, Package, Search } from "lucide-react";
import { searchProducts } from "@/lib/off";
import { useProfile, useProfilesState } from "@/lib/store";
import { analyzeFood, VERDICT_LABEL } from "@/lib/verdict";
import { usePurchaseLocation } from "@/lib/purchase";
import { PurchaseCountrySelector } from "@/components/PurchaseCountrySelector";
import { PurchaseLinks } from "@/components/PurchaseLinks";

type ProductSearch = { q: string; buy?: boolean; from?: "recipes" | "shopping" };

export const Route = createFileRoute("/search")({
  validateSearch: (s: Record<string, unknown>): ProductSearch => ({
    q: typeof s["q"] === "string" ? s["q"].slice(0, 120) : "",
    ...(s["buy"] === true || s["buy"] === 1 || s["buy"] === "1" || s["buy"] === "true" ? { buy: true } : {}),
    ...(s["from"] === "recipes" || s["from"] === "shopping" ? { from: s["from"] } : {}),
  }),
  head: () => ({ meta: [{ title: "Cerca prodotto — Safe Scan Eats" }] }),
  component: SearchPage,
});

function SearchPage() {
  const { t, language } = useAppLanguage();
  const { q, buy, from } = Route.useSearch();
  const location = usePurchaseLocation();
  const profile = useProfile();
  const { freeMode } = useProfilesState();
  const navigate = useNavigate({ from: "/search" });
  const catalogQuery = buy && location.country !== "it" ? translateText(q, "en") : q;
  const [value, setValue] = useState(catalogQuery);
  useEffect(() => setValue(catalogQuery), [catalogQuery]);
  const { data, isFetching, isError } = useQuery({
    queryKey: ["off-search", q, buy ? location.country : "world", language],
    queryFn: () => searchProducts(catalogQuery, buy ? location.country : undefined, language),
    enabled: q.trim().length >= 2,
    staleTime: 1000 * 60 * 5,
  });
  const back = buy ? from === "recipes" ? "/recipes" : "/shopping" : "/";

  return <div className="mx-auto flex min-h-screen w-full max-w-md flex-col px-5 pb-10 pt-6">
    <header className="flex items-center gap-3">
      <Link to={back} aria-label={t("Indietro")} className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-secondary text-secondary-foreground"><ArrowLeft className="h-5 w-5" /></Link>
      <h1 className="text-lg font-extrabold text-foreground">{t(buy ? "Dove acquistare" : "Cerca prodotto")}</h1>
    </header>
    {buy && <>
      <p className="mt-3 text-sm text-muted-foreground">{t("Scegli un prodotto del catalogo oppure cercalo direttamente online.")}</p>
      <PurchaseCountrySelector withCity />
    </>}
    <form className="mt-5 flex gap-2" onSubmit={(event) => {
      event.preventDefault();
      const query = value.trim().slice(0, 120);
      if (!buy && /^\d{8,14}$/.test(query)) void navigate({ to: "/product/$code", params: { code: query } });
      else void navigate({ search: { q: query, ...(buy ? { buy: true } : {}), ...(from ? { from } : {}) } });
    }}>
      <input type="search" value={value} onChange={(event) => setValue(event.target.value)} maxLength={120}
        placeholder={t("Nome, marca o codice a barre")} className="min-w-0 flex-1 rounded-2xl border border-border bg-card px-4 py-3.5 text-base text-foreground outline-none focus:border-primary" enterKeyHint="search" />
      <button type="submit" aria-label={t("Cerca")} className="grid w-14 shrink-0 place-items-center rounded-2xl bg-primary text-primary-foreground"><Search className="h-5 w-5" /></button>
    </form>

    {buy && q.trim().length >= 2 && <section className="mt-4 rounded-2xl bg-secondary/50 p-4">
      <h2 className="font-extrabold text-foreground">{t("Cerca questo ingrediente")}: {t(q)}</h2>
      <PurchaseLinks query={catalogQuery} />
      <p className="mt-3 text-xs leading-relaxed text-muted-foreground">{t("I negozi sono segnalati dagli utenti del database, anche in sedi o Paesi diversi. Prezzi, spedizione e disponibilità vanno verificati con il venditore. Controlla sempre l’etichetta prima di acquistare.")}</p>
    </section>}

    <div className="mt-5 flex flex-col gap-3">
      {isFetching && <div className="flex items-center justify-center gap-2 py-6 text-sm font-bold text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" />{t("Cerco…")}</div>}
      {isError && <p className="py-4 text-center text-sm text-muted-foreground">{t("Ricerca non riuscita. Controlla la connessione e riprova.")}</p>}
      {!isFetching && data?.length === 0 && <div className="py-4 text-center">
        <p className="text-sm text-muted-foreground">{t(buy ? "Nessun prodotto registrato per questo Paese. Puoi usare la ricerca online qui sopra." : "Nessun prodotto trovato.")}</p>
        {!buy && <Link to="/ingredients" search={{}} className="mt-4 inline-block rounded-2xl bg-primary px-6 py-3 text-base font-extrabold text-primary-foreground">{t("Fotografa ingredienti")}</Link>}
      </div>}
      {!isFetching && data?.map((product) => {
        const verdict = buy && profile && !freeMode ? analyzeFood(product, profile.allergens, profile.customAllergens).verdict : null;
        return <article key={product.code} className="rounded-2xl border border-border bg-card p-4">
          <Link to="/product/$code" params={{ code: product.code }} className="flex items-center gap-3">
            {product.imageUrl ? <img src={product.imageUrl} alt="" loading="lazy" className="h-14 w-14 shrink-0 rounded-xl object-contain" /> : <div className="grid h-14 w-14 shrink-0 place-items-center rounded-xl bg-secondary"><Package className="h-5 w-5 text-primary" /></div>}
            <div className="min-w-0 flex-1"><p className="text-sm font-extrabold text-foreground">{product.name}</p><p className="mt-1 text-xs text-muted-foreground">{product.brand || product.code}</p></div>
          </Link>
          {verdict && <p className={`mt-3 text-sm font-extrabold ${verdict === "avoid" ? "text-danger" : verdict === "warning" ? "text-caution-foreground" : "text-safe"}`}>{t(VERDICT_LABEL[verdict])}</p>}
          {buy && <>
            <Link to="/product/$code" params={{ code: product.code }} className="mt-2 inline-block text-xs font-bold text-primary underline">{t("Controlla ingredienti e allergeni")}</Link>
            {!(product.stores?.length) && <p className="mt-3 text-xs text-muted-foreground">{t("Negozi non indicati nel database.")}</p>}
            <PurchaseLinks query={[product.name, product.brand, product.code].filter(Boolean).join(" ")} stores={product.stores ?? []} />
          </>}
        </article>;
      })}
      {!!data?.length && <p className="mt-2 text-center text-[11px] text-muted-foreground">{t("Dati prodotto: Open Food Facts")}</p>}
    </div>
  </div>;
}
