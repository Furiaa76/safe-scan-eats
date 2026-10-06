import { useAppLanguage } from "@/lib/language";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ExternalLink, Loader2, RefreshCw, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { getCeliacStores } from "@/lib/stores.functions";

export const Route = createFileRoute("/stores")({
  head: () => ({ meta: [{ title: "Negozi convenzionati — Safe Scan Eats" }] }),
  component: StoresPage,
});

function StoresPage() {
  const { t } = useAppLanguage();

  const getStores = useServerFn(getCeliacStores);
  const [query, setQuery] = useState("");

  const { data, isFetching, refetch } = useQuery({
    queryKey: ["celiac-stores-lombardia"],
    queryFn: () => getStores(),
    staleTime: 1000 * 60 * 60 * 6,
    retry: false,
  });

  const stores = useMemo(() => {
    const q = query.trim().toLocaleLowerCase("it");
    const list = data?.stores ?? [];
    if (!q) return list;
    return list.filter((s) =>
      `${s.ats} ${s.province} ${s.text}`.toLocaleLowerCase("it").includes(q)
    );
  }, [data, query]);

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col px-5 pb-10 pt-6">
      <header className="flex items-center gap-3">
        <Link to="/crs" aria-label={t("Torna a CRS")} className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-secondary text-secondary-foreground">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-lg font-extrabold text-foreground">{t("Negozi convenzionati")}</h1>
          <p className="text-xs text-muted-foreground">{t("Elenco ufficiale Regione Lombardia")}</p>
        </div>
        <button type="button" onClick={() => refetch()} aria-label={t("Aggiorna elenco")} className="grid h-10 w-10 place-items-center rounded-full bg-secondary text-secondary-foreground">
          <RefreshCw className={`h-5 w-5 ${isFetching ? "animate-spin" : ""}`} />
        </button>
      </header>

      <div className="mt-5 rounded-2xl bg-muted p-3 text-xs leading-relaxed text-muted-foreground">
        {t("I dati vengono letti direttamente dal documento ufficiale di Regione Lombardia e aggiornati automaticamente. Ultimo aggiornamento fonte:")}<strong>{t(data?.updated || "controllo in corso…")}</strong>
      </div>

      <div className="relative mt-4">
        <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("Cerca comune, negozio, provincia…")}
          className="w-full rounded-2xl border border-border bg-card py-3.5 pl-12 pr-4 text-base text-foreground outline-none focus:border-primary"
        />
      </div>

      {isFetching && !data ? (
        <div className="grid flex-1 place-items-center py-20 text-center">
          <div><Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" /><p className="mt-3 text-sm font-bold text-muted-foreground">{t("Carico l’elenco ufficiale…")}</p></div>
        </div>
      ) : data?.status === "unavailable" ? (
        <div className="mt-5 rounded-2xl border border-caution/40 bg-caution-soft p-4">
          <p className="font-extrabold text-caution-foreground">{t("Elenco temporaneamente non disponibile")}</p>
          <p className="mt-1 text-sm text-caution-foreground">{t("Puoi comunque aprire il documento originale di Regione Lombardia.")}</p>
        </div>
      ) : (
        <>
          <p className="mt-4 text-sm font-bold text-muted-foreground">{stores.length} {t(" risultati")}</p>
          <div className="mt-3 flex flex-col gap-3">
            {stores.map((store, i) => (
              <article key={`${store.province}-${i}-${store.text}`} className="rounded-2xl border border-border bg-card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-extrabold uppercase tracking-wide text-primary">{t(store.ats || "Regione Lombardia")} {t(" · ")}{t(store.province)}</p>
                    <p className="mt-1 text-sm font-bold leading-relaxed text-foreground">{t(store.text.replace(/^\w{2}\s+/, "").replace(/\s+(Sì|No)\s*$/i, ""))}</p>
                  </div>
                  {store.otp && <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-extrabold ${store.otp === "Sì" ? "bg-safe-soft text-safe" : "bg-muted text-muted-foreground"}`}>{t("OTP ")}{t(store.otp)}</span>}
                </div>
              </article>
            ))}
            {stores.length === 0 && <div className="rounded-2xl bg-muted p-5 text-center text-sm font-bold text-muted-foreground">{t("Nessun negozio trovato con questa ricerca.")}</div>}
          </div>
        </>
      )}

      <a href={data?.sourceUrl || "https://www.fascicolosanitario.regione.lombardia.it/"} target="_blank" rel="noreferrer" className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl border border-border py-3.5 font-extrabold text-foreground">
        {t("Apri documento originale")}<ExternalLink className="h-4 w-4" />
      </a>
    </div>
  );
}
