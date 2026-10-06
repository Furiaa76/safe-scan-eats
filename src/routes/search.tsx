import { useAppLanguage } from "@/lib/language";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowLeft, Loader2, Package, Search } from "lucide-react";
import { searchProducts } from "@/lib/off";

export const Route = createFileRoute("/search")({
  validateSearch: (s: Record<string, unknown>) => ({ q: typeof s["q"] === "string" ? (s["q"] as string) : "" }),
  head: () => ({ meta: [{ title: "Cerca prodotto — SafeFood Scan" }, { name: "description", content: "Cerca un prodotto per nome o marca e controlla gli allergeni." }] }),
  component: SearchPage,
});

function SearchPage() {
  const { t } = useAppLanguage();

  const { q } = Route.useSearch();
  const navigate = useNavigate({ from: "/search" });
  const [value, setValue] = useState(q);
  const { data, isFetching, isError } = useQuery({ queryKey: ["off-search", q], queryFn: () => searchProducts(q), enabled: q.trim().length >= 2, staleTime: 1000 * 60 * 5 });
  return <div className="mx-auto flex min-h-screen w-full max-w-md flex-col px-5 pb-10 pt-6">
    <header className="flex items-center gap-3"><Link to="/" aria-label={t("Torna alla home")} className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-secondary text-secondary-foreground"><ArrowLeft className="h-5 w-5" /></Link><h1 className="truncate text-lg font-extrabold text-foreground">{t("Cerca prodotto")}</h1></header>
    <form className="mt-5 flex gap-2" onSubmit={(e) => { e.preventDefault(); const v = value.trim(); if (/^\d{8,14}$/.test(v)) navigate({ to: "/product/$code", params: { code: v } }); else navigate({ search: { q: v } }); }}><input type="search" value={value} onChange={(e) => setValue(e.target.value)} placeholder={t("Nome, marca o codice a barre")} className="min-w-0 flex-1 rounded-2xl border border-border bg-card px-4 py-3.5 text-base text-foreground outline-none focus:border-primary" autoFocus enterKeyHint="search" /><button type="submit" aria-label={t("Cerca")} className="grid w-14 shrink-0 place-items-center rounded-2xl bg-primary text-primary-foreground"><Search className="h-5 w-5" /></button></form>
    <div className="mt-5 flex flex-col gap-2">{isFetching && <div className="flex items-center justify-center gap-2 py-8 text-sm font-bold text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" /> {t(" Cerco…")}</div>}{isError && <p className="py-6 text-center text-sm text-muted-foreground">{t("Ricerca non riuscita. Controlla la connessione e riprova.")}</p>}{!isFetching && data && data.length === 0 && <div className="py-6 text-center"><p className="text-sm text-muted-foreground">{t("Nessun prodotto trovato.")}</p><Link to="/ingredients" search={{}} className="mt-4 inline-block rounded-2xl bg-primary px-6 py-3 text-base font-extrabold text-primary-foreground">{t("Fotografa ingredienti")}</Link></div>}{!isFetching && data?.map((p) => <Link key={p.code} to="/product/$code" params={{ code: p.code }} className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3 transition-colors active:bg-secondary">{p.imageUrl ? <img src={p.imageUrl} alt={t("")} loading="lazy" className="h-12 w-12 shrink-0 rounded-xl object-contain" /> : <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-secondary"><Package className="h-5 w-5 text-primary" /></div>}<div className="min-w-0 flex-1"><p className="truncate text-sm font-bold text-foreground">{p.name}</p><p className="truncate text-xs text-muted-foreground">{t(p.brand || p.code)}</p></div></Link>)}{data && data.length > 0 && <p className="mt-2 text-center text-[11px] text-muted-foreground">{t("Dati prodotto: Open Food Facts")}</p>}</div>
  </div>;
}
