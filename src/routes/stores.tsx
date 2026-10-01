import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ExternalLink, RefreshCw } from "lucide-react";
import { useState } from "react";

const STORES_PDF = "https://www.fascicolosanitario.regione.lombardia.it/documents/130101/130419/Negozi%2Bconvenzionati.pdf/324de6f8-cf5e-3636-ff80-a4a2480a2565";

export const Route = createFileRoute("/stores")({
  head: () => ({ meta: [{ title: "Negozi convenzionati — Safe Scan Eats" }] }),
  component: StoresPage,
});

function StoresPage() {
  const [reloadKey, setReloadKey] = useState(0);

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col bg-background">
      <header className="flex items-center gap-3 px-5 pb-3 pt-6">
        <Link to="/crs" aria-label="Torna a CRS" className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-secondary text-secondary-foreground">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-lg font-extrabold text-foreground">Negozi convenzionati</h1>
          <p className="text-xs text-muted-foreground">Elenco ufficiale Regione Lombardia</p>
        </div>
        <button type="button" onClick={() => setReloadKey((k) => k + 1)} aria-label="Aggiorna elenco" className="grid h-10 w-10 place-items-center rounded-full bg-secondary text-secondary-foreground">
          <RefreshCw className="h-5 w-5" />
        </button>
      </header>

      <div className="px-5 pb-3">
        <div className="rounded-2xl bg-muted p-3 text-xs leading-relaxed text-muted-foreground">
          L’elenco viene caricato direttamente dal documento ufficiale di Regione Lombardia. Quando Regione aggiorna il file, qui vedrai automaticamente la versione più recente.
        </div>
      </div>

      <div className="min-h-0 flex-1 px-3 pb-3">
        <iframe
          key={reloadKey}
          title="Elenco negozi convenzionati celiachia"
          src={STORES_PDF}
          className="h-[72vh] w-full rounded-2xl border border-border bg-white"
        />
      </div>

      <div className="px-5 pb-8">
        <a href={STORES_PDF} target="_blank" rel="noreferrer" className="flex w-full items-center justify-center gap-2 rounded-2xl border border-border py-3.5 font-extrabold text-foreground">
          Apri documento originale <ExternalLink className="h-4 w-4" />
        </a>
      </div>
    </div>
  );
}
