import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { ArrowLeft, Camera, Loader2, Search, WifiOff, PackageX } from "lucide-react";
import { fetchProduct } from "@/lib/off";
import { analyzeFood } from "@/lib/verdict";
import { addToHistory, useProfile } from "@/lib/store";
import { ResultView } from "@/components/ResultView";

export const Route = createFileRoute("/product/$code")({
  head: ({ params }) => ({ meta: [{ title: `Prodotto ${params.code} — SafeFood Scan` }, { name: "description", content: "Analisi allergeni del prodotto scansionato." }] }),
  component: ProductPage,
});

function ProductPage() {
  const { code } = Route.useParams();
  const profile = useProfile();
  const { data, isLoading, isError, refetch } = useQuery({ queryKey: ["off-product", code], queryFn: () => fetchProduct(code), staleTime: 1000 * 60 * 10, retry: 1 });
  const usable = data && data.ingredientsText ? data : null;
  const analysis = usable ? analyzeFood(usable, profile?.allergens ?? []) : null;
  useEffect(() => {
    if (!usable || !analysis) return;
    addToHistory({ code: usable.code, name: usable.name, brand: usable.brand, imageUrl: usable.imageUrl, source: "off", verdict: analysis.verdict, date: new Date().toISOString() });
  }, [usable?.code, analysis?.verdict]);

  if (isLoading) return <Shell><div className="flex flex-1 flex-col items-center justify-center text-center"><Loader2 className="h-10 w-10 animate-spin text-primary" /><p className="mt-4 text-base font-bold text-foreground">Cerco il prodotto…</p><p className="mt-1 font-mono text-sm text-muted-foreground">{code}</p></div></Shell>;
  if (isError) return <Shell><div className="flex flex-1 flex-col items-center justify-center text-center"><WifiOff className="h-12 w-12 text-muted-foreground" /><p className="mt-4 text-lg font-extrabold text-foreground">Connessione non riuscita</p><p className="mt-1 text-sm text-muted-foreground">Non riesco a raggiungere il database dei prodotti.</p><button type="button" onClick={() => refetch()} className="mt-6 w-full rounded-2xl bg-primary py-4 text-lg font-extrabold text-primary-foreground">Riprova</button><FallbackActions code={code} /></div></Shell>;
  if (!usable || !analysis) {
    const known = data && data.name !== "Prodotto senza nome" ? data : null;
    return <Shell><div className="flex flex-1 flex-col items-center justify-center text-center">{known?.imageUrl ? <img src={known.imageUrl} alt={known.name} className="h-28 w-28 rounded-2xl bg-secondary object-contain" /> : <PackageX className="h-14 w-14 text-muted-foreground" />}<h1 className="mt-4 text-xl font-extrabold text-foreground">{data ? "Dati del prodotto incompleti" : "Prodotto non trovato nel database"}</h1>{known && <p className="mt-1 text-sm font-bold text-foreground">{known.name}{known.brand ? ` · ${known.brand}` : ""}</p>}<p className="mt-2 text-sm text-muted-foreground">Fotografa fronte ed etichetta per continuare.</p><Link to="/ingredients" search={{ code, name: known?.name, brand: known?.brand || undefined, image: known?.imageUrl }} className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-4 text-lg font-extrabold text-primary-foreground"><Camera className="h-5 w-5" />Fotografa fronte ed etichetta</Link><FallbackActions code={code} /></div></Shell>;
  }
  return <ResultView product={usable} analysis={analysis} profile={profile} />;
}

function FallbackActions({ code }: { code: string }) { return <div className="mt-3 flex w-full flex-col gap-2"><Link to="/search" search={{ q: "" }} className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-primary py-3.5 text-base font-extrabold text-primary"><Search className="h-5 w-5" />Cerca per nome o marca</Link><Link to="/scan" search={{ mode: "barcode" }} className="py-2 text-sm font-bold text-muted-foreground" aria-label={`Scansiona di nuovo, codice precedente ${code}`}>Scansiona di nuovo</Link></div>; }

function Shell({ children }: { children: React.ReactNode }) { return <div className="mx-auto flex min-h-screen w-full max-w-md flex-col px-5 pb-10 pt-6"><header className="flex items-center gap-3"><Link to="/" aria-label="Torna alla home" className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-secondary text-secondary-foreground"><ArrowLeft className="h-5 w-5" /></Link><p className="truncate text-lg font-extrabold text-foreground">Prodotto</p></header>{children}</div>; }