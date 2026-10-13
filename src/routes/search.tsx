import { useServerFn } from "@tanstack/react-start";
import { checkLocalStock } from "@/lib/local-stock.functions";
import { confirmedLocalStock } from "@/lib/local-stock";
import { useAppLanguage } from "@/lib/language";
import { translateText } from "@/lib/translations";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { ArrowLeft, Loader2, Package, Search } from "lucide-react";
import { fetchProduct, searchProductPage } from "@/lib/off";
import { useProfile, useProfilesState } from "@/lib/store";
import { analyzeFood, purchaseProductGroups, VERDICT_LABEL } from "@/lib/verdict";
import { ingredientPurchaseQuery, productPurchaseQuery, usePurchaseLocation } from "@/lib/purchase";
import { PurchaseCountrySelector } from "@/components/PurchaseCountrySelector";
import { productRetailers } from "@/lib/product-retailers";
import { ProductRetailers } from "@/components/ProductRetailers";
import { PurchaseLinks } from "@/components/PurchaseLinks";

type ProductSearch = { q: string; buy?: boolean; local?: boolean; code?: string; from?: "recipes" | "shopping" };

export const Route = createFileRoute("/search")({
  validateSearch: (s: Record<string, unknown>): ProductSearch => ({
    ...(s["local"] === true || s["local"] === "true" ? { local: true } : {}),
    ...(typeof s["code"] === "string" && /^\d{8,14}$/.test(s["code"]) ? { code: s["code"] } : {}),
    q: typeof s["q"] === "string" ? s["q"].slice(0, 120) : "",
    ...(s["buy"] === true || s["buy"] === 1 || s["buy"] === "1" || s["buy"] === "true" ? { buy: true } : {}),
    ...(s["from"] === "recipes" || s["from"] === "shopping" ? { from: s["from"] } : {}),
  }),
  head: () => ({ meta: [{ title: "Cerca prodotto — Safe Scan Eats" }] }),
  component: SearchPage,
});

function SearchPage() {
  const { t, language } = useAppLanguage();
  const { q, buy, from, local: localFlag, code } = Route.useSearch();
  const location = usePurchaseLocation();
  const local = !!(buy && localFlag);
  const getLocalStock = useServerFn(checkLocalStock);
  const profile = useProfile();
  const { freeMode } = useProfilesState();
  const navigate = useNavigate({ from: "/search" });
  const ingredientQuery = buy ? ingredientPurchaseQuery(q, profile?.allergens ?? []) : q;
  const catalogQuery = buy && location.country !== "it" ? translateText(ingredientQuery, "en") : ingredientQuery;
  const [worldwide, setWorldwide] = useState(false);
  const searchCountry = buy && !worldwide ? location.country : undefined;
  const [value, setValue] = useState(catalogQuery);
  useEffect(() => setValue(catalogQuery), [catalogQuery]);
  const { data, isFetching, isError, refetch, hasNextPage, fetchNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: ["off-search", catalogQuery, searchCountry ?? "world", language, code ?? "", !!buy],
    initialPageParam: 1,
    queryFn: async ({ pageParam }) => {
      if (buy && code) { const product = await fetchProduct(code); return { products: product ? [product] : [], hasMore: false }; }
      return searchProductPage(catalogQuery, searchCountry, language, pageParam);
    },
    getNextPageParam: (lastPage, _pages, page) => lastPage.hasMore ? page + 1 : undefined,
    enabled: q.trim().length >= 2 && (!local || !!location.city.trim()),
    staleTime: 1000 * 60 * 5,
    retry: false,
  });
  const back = buy ? from === "recipes" ? "/recipes" : "/shopping" : "/";
  const filterByProfile = !!(buy && profile && !freeMode);
  const products = Array.from(new Map((data?.pages.flatMap((page) => page.products) ?? []).map((product) => [product.code, product])).values());
  const groups = purchaseProductGroups(products, filterByProfile ? profile : null);
  const catalogProducts = [...groups.compatible, ...groups.review];
  const codes = catalogProducts.map(product => product.code).filter(code => /^\d{8,14}$/.test(code)).slice(0,100);
  const stock = useQuery({
    queryKey: ["confirmed-local-stock", location.country, location.city, codes.join(",")],
    queryFn: () => getLocalStock({ data: { codes, country: location.country, city: location.city.trim() } }),
    enabled: local && !!location.city.trim() && codes.length > 0,
    retry: false, staleTime: 30_000, refetchInterval: local ? 60_000 : false,
  });
  const offers = local && !stock.isFetching && !stock.isError ? confirmedLocalStock(stock.data?.offers, codes, location.country, location.city) : [];
  const visibleProducts = local ? catalogProducts.filter(product => offers.some(offer => offer.code.padStart(14,"0") === product.code.padStart(14,"0"))) : catalogProducts;
  const typedIngredient = buy ? ingredientPurchaseQuery(value.trim(), profile?.allergens ?? []) : value.trim();
  const typedCatalogQuery = buy && location.country !== "it" ? translateText(typedIngredient, "en") : typedIngredient;
  const searchingTypedQuery = isFetching && typedCatalogQuery === catalogQuery;

  return <div className="mx-auto flex min-h-screen w-full max-w-md flex-col px-5 pb-10 pt-6">
    <header className="flex items-center gap-3">
      <Link to={back} aria-label={t("Indietro")} className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-secondary text-secondary-foreground"><ArrowLeft className="h-5 w-5" /></Link>
      <h1 className="text-lg font-extrabold text-foreground">{t(local ? "Disponibilità nei supermercati della zona" : buy ? "Dove acquistare" : "Cerca prodotto")}</h1>
    </header>
    {buy && <>
      <p className="mt-3 text-sm text-muted-foreground">{filterByProfile
        ? t("I risultati compatibili sono separati da quelli da verificare. I prodotti con allergeni rilevati sono esclusi dalle proposte di acquisto.")
        : t(local ? "Nei supermercati della zona mostriamo solo disponibilità confermate del prodotto nel punto vendita." : "Scegli un prodotto del catalogo oppure cercalo direttamente online.")}</p>
      <PurchaseCountrySelector withCity cityRequired={local} />
      {!local && <label className="mt-3 flex items-center gap-2 text-sm text-foreground">
        <input type="checkbox" checked={worldwide} onChange={(event) => setWorldwide(event.target.checked)} />
        {t("Cerca anche nei cataloghi di altri Paesi")}
      </label>}
      {!local && worldwide && <p className="mt-1 text-xs text-muted-foreground">{t("I prodotti esteri possono avere formulazioni diverse e non essere venduti nel tuo Paese. Controlla la confezione esatta.")}</p>}
    </>}
    <form className="mt-5 flex gap-2" onSubmit={(event) => {
      event.preventDefault();
      const query = value.trim().slice(0, 120);
      if (query.length < 2 || searchingTypedQuery) return;
      const ingredient = buy ? ingredientPurchaseQuery(query, profile?.allergens ?? []) : query;
      const nextCatalogQuery = buy && location.country !== "it" ? translateText(ingredient, "en") : ingredient;
      if (!buy && /^\d{8,14}$/.test(query)) void navigate({ to: "/product/$code", params: { code: query } });
      else if (nextCatalogQuery === catalogQuery) void refetch();
      else void navigate({ search: { q: query, ...(buy ? { buy: true } : {}), ...(from ? { from } : {}), ...(local ? { local: true } : {}) } });
    }}>
      <input type="search" value={value} onChange={(event) => setValue(event.target.value)} maxLength={120}
        placeholder={t("Nome, marca o codice a barre")} className="min-w-0 flex-1 rounded-2xl border border-border bg-card px-4 py-3.5 text-base text-foreground outline-none focus:border-primary" enterKeyHint="search" />
      <button type="submit" disabled={searchingTypedQuery || value.trim().length < 2} aria-label={t(searchingTypedQuery ? "Cerco…" : "Cerca")} aria-busy={searchingTypedQuery}
        className="grid w-14 shrink-0 place-items-center rounded-2xl bg-primary text-primary-foreground disabled:opacity-50">{searchingTypedQuery ? <Loader2 className="h-5 w-5 animate-spin" /> : <Search className="h-5 w-5" />}</button>
    </form>

    {buy && !local && !filterByProfile && q.trim().length >= 2 && <section className="mt-4 rounded-2xl bg-secondary/50 p-4">
      <h2 className="font-extrabold text-foreground">{t("Cerca questo ingrediente")}: {t(ingredientQuery)}</h2>
      <PurchaseLinks query={`"${catalogQuery.replace(/["\\]/g, " ").trim()}"`} exactProduct {...(from ? { from } : {})} onlineLabel="Cerca ingrediente online" />
      <p className="mt-3 text-xs leading-relaxed text-muted-foreground">{t("Le schede dei venditori si riferiscono al prodotto esatto nel catalogo online. Prezzi, consegna e disponibilità vanno controllati sul sito del venditore.")}</p>
    </section>}

    <div className="mt-5 flex flex-col gap-3">
      {local && !location.city.trim() && <p className="rounded-xl bg-muted p-4 text-sm">{t("Inserisci la città per cercare disponibilità confermate nei supermercati della zona.")}</p>}
      {local && stock.isFetching && <p className="py-4 text-center text-sm">{t("Verifico la disponibilità nel punto vendita…")}</p>}
      {local && !!location.city.trim() && !isFetching && !stock.isFetching && visibleProducts.length === 0 && <p className="rounded-xl bg-muted p-4 text-sm">{t("Nessuna disponibilità confermata per questo prodotto nei supermercati della zona. I negozi senza conferma non vengono mostrati.")}</p>}
      {local && <p className="text-xs text-muted-foreground">{t("Una scheda online o la presenza di un supermercato in città non conferma le scorte del punto vendita.")}</p>}
      {isFetching && <div className="flex items-center justify-center gap-2 py-6 text-sm font-bold text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" />{t("Cerco…")}</div>}
      {!local && isError && <p className="py-4 text-center text-sm text-muted-foreground">{t("Ricerca non riuscita. Controlla la connessione e riprova.")}</p>}
      {!local && !isFetching && !isError && data && visibleProducts.length === 0 && <div className="py-4 text-center">
        <p className="text-sm text-muted-foreground">{t(filterByProfile ? "Nessun prodotto compatibile trovato per il profilo attivo. Prova un altro nome o una marca." : buy ? "Nessun prodotto registrato per questo Paese. Puoi usare la ricerca online qui sopra." : "Nessun prodotto trovato.")}</p>
        {!buy && <Link to="/ingredients" search={{}} className="mt-4 inline-block rounded-2xl bg-primary px-6 py-3 text-base font-extrabold text-primary-foreground">{t("Fotografa ingredienti")}</Link>}
      </div>}
      {!isFetching && !isError && visibleProducts.length > 0 && buy && <div>
        <h2 className="font-extrabold text-foreground">{t(code ? "Prodotto selezionato" : "Confronta prodotti e marchi")}</h2>
        <p className="mt-1 text-xs text-muted-foreground">{t(code ? "Cerchiamo il codice a barre del prodotto selezionato, mantenendo i controlli del profilo attivo." : "Mostriamo le alternative trovate nel catalogo per questo ingrediente. Il numero dipende dai dati disponibili e dal profilo attivo.")}</p>
      </div>}
      {(!isFetching || isFetchingNextPage) && visibleProducts.map((product, index) => {
        const analysis = buy && profile && !freeMode ? analyzeFood(product, profile.allergens, profile.customAllergens) : null;
        const verdict = analysis?.verdict ?? null;
        const review = verdict === "warning";
        return <div key={product.code}>
          {filterByProfile && index === groups.compatible.length && groups.review.length > 0 && <div className="mb-3 mt-5 rounded-xl bg-caution-soft p-3">
            <h2 className="font-extrabold text-caution-foreground">{t("Da verificare: dati mancanti o avvisi")}</h2>
            <p className="mt-1 text-xs text-caution-foreground">{t("Questi prodotti non sono indicati come compatibili. Apri la scheda e controlla gli ingredienti e le tracce sulla confezione.")}</p>
          </div>}
          <article className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center gap-3">
            <Link to="/product/$code" params={{ code: product.code }} aria-label={product.name} className="shrink-0">{product.imageUrl ? <img src={product.imageUrl} alt="" loading="lazy" className="h-14 w-14 rounded-xl object-contain" /> : <span className="grid h-14 w-14 place-items-center rounded-xl bg-secondary"><Package className="h-5 w-5 text-primary" /></span>}</Link>
            <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-x-2 gap-y-1"><Link to="/product/$code" params={{ code: product.code }} className="text-sm font-extrabold text-foreground">{product.name}</Link>{!local && <ProductRetailers product={product} />}</div><p className="mt-1 text-xs text-muted-foreground">{product.brand || product.code}</p></div>
          </div>
          {verdict && <p className={`mt-3 text-sm font-extrabold ${verdict === "avoid" ? "text-danger" : verdict === "warning" ? "text-caution-foreground" : "text-safe"}`}>{t(VERDICT_LABEL[verdict])}</p>}
          {analysis?.reasons.filter((reason) => reason.sourceUrl && reason.verifiedAt).map((reason) => <div key={reason.sourceUrl + reason.text} className="mt-2 text-xs text-muted-foreground"><p>{t(reason.text)}</p><a href={reason.sourceUrl} target="_blank" rel="noopener noreferrer" className="font-bold text-primary underline">{t("Consulta la fonte della dichiarazione")}</a></div>)}
          {buy && <>
            <Link to="/product/$code" params={{ code: product.code }} className="mt-2 inline-block text-xs font-bold text-primary underline">{t("Controlla ingredienti e allergeni")}</Link>
            {!local && !review && !productRetailers(product, location).length && <p className="mt-3 text-xs text-muted-foreground">{t("Usa la ricerca online per verificare i venditori del prodotto nel Paese e nella città selezionati.")}</p>}
            {review && <p className="mt-2 text-xs text-caution-foreground">{t(analyzeFood(product, profile?.allergens ?? [], profile?.customAllergens).reasons.find((reason) => reason.level === "warning")?.text ?? "Controlla ingredienti e allergeni")}</p>}
            {local && offers.filter(offer => offer.code.padStart(14,"0") === product.code.padStart(14,"0")).map(offer => <a key={offer.storeId} href={offer.sourceUrl} target="_blank" rel="noopener noreferrer" className="mt-3 block rounded-xl bg-safe-soft p-3 text-sm text-safe"><strong>{offer.retailer}</strong> · {offer.address}, {offer.city}<span className="block text-xs">{t("Disponibilità confermata")}: {new Date(offer.checkedAt).toLocaleTimeString(language === "it" ? "it-IT" : "en-GB", {hour:"2-digit",minute:"2-digit"})}</span></a>)}
            {!local && !review && <PurchaseLinks query={productPurchaseQuery(product, filterByProfile ? profile.allergens : [])} productCode={product.code} {...(from ? { from } : {})} exactProduct />}
            {!local && filterByProfile && <p className="mt-3 text-xs text-muted-foreground">{t("La ricerca esterna può mostrare altri prodotti non filtrati. Verifica che nome, marca e codice corrispondano e controlla l’etichetta.")}</p>}
          </>}
        </article></div>;
      })}
      {hasNextPage && <button type="button" disabled={isFetching} onClick={() => void fetchNextPage()}
        className="rounded-2xl bg-secondary px-4 py-3 font-extrabold text-secondary-foreground disabled:opacity-50">{t(isFetchingNextPage ? "Cerco…" : "Mostra altri prodotti")}</button>}
      {!!visibleProducts.length && <p className="mt-2 text-center text-[11px] text-muted-foreground">{t("Dati prodotto: Open Food Facts")}</p>}
    </div>
  </div>;
}
