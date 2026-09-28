import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { ArrowLeft, Camera, Check, Info, Loader2, ScanSearch, Tag } from "lucide-react";
import { identifyFront, readLabel } from "@/lib/vision.functions";
import { fileToDataUrl, saveFrontPhoto } from "@/lib/image";

type IngSearch = { code?: string; name?: string; brand?: string; image?: string };

export const Route = createFileRoute("/ingredients")({
  validateSearch: (s: Record<string, unknown>): IngSearch => ({
    code: typeof s["code"] === "string" ? s["code"] : undefined,
    name: typeof s["name"] === "string" ? s["name"] : undefined,
    brand: typeof s["brand"] === "string" ? s["brand"] : undefined,
    image: typeof s["image"] === "string" ? s["image"] : undefined,
  }),
  head: () => ({ meta: [{ title: "Fotografa fronte ed etichetta — SafeFood Scan" }, { name: "description", content: "Fotografa il prodotto e la lista ingredienti per controllare gli allergeni." }] }),
  component: GuidedFlow,
});

type Identity = { name: string; brand: string; category: string; recognized: boolean; claims: string[] };

function GuidedFlow() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const identifyFn = useServerFn(identifyFront);
  const readFn = useServerFn(readLabel);
  const [step, setStep] = useState<1 | 2>(1);
  const [front, setFront] = useState<string | null>(null);
  const [identity, setIdentity] = useState<Identity | null>(null);
  const [name, setName] = useState(search.name ?? "");
  const [brand, setBrand] = useState(search.brand ?? "");
  const [label, setLabel] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState<null | "front" | "label">(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => saveFrontPhoto(null), []);

  const onFront = async (file?: File) => {
    if (!file) return;
    setError(null); setBusy("front");
    try {
      const dataUrl = await fileToDataUrl(file);
      setFront(dataUrl);
      saveFrontPhoto(await fileToDataUrl(file, 480, 0.7));
      const r = await identifyFn({ data: { image: dataUrl } });
      setIdentity(r);
      if (r.recognized) { if (!name) setName(r.name); if (!brand) setBrand(r.brand); }
    } catch (e) { setError((e as Error).message || "Non sono riuscito a riconoscere il prodotto."); }
    finally { setBusy(null); }
  };

  const onLabel = async (file?: File) => {
    if (!file) return;
    setError(null); setBusy("label");
    try {
      const dataUrl = await fileToDataUrl(file, 1600, 0.85);
      setLabel(dataUrl);
      const r = await readFn({ data: { image: dataUrl } });
      if (!r.readable) setError("Non riesco a leggere gli ingredienti. Riprova con più luce oppure scrivili qui sotto.");
      else setText([r.ingredients, r.traces].filter(Boolean).join(" "));
    } catch (e) { setError((e as Error).message || "Lettura non riuscita. Scrivi gli ingredienti qui sotto."); }
    finally { setBusy(null); }
  };

  const analyze = () => navigate({
    to: "/analysis",
    search: {
      text: text.trim(),
      code: search.code,
      name: name.trim() || undefined,
      brand: brand.trim() || undefined,
      image: search.image,
      claims: identity?.claims?.length ? identity.claims.join("|") : undefined,
    },
  });

  return <div className="mx-auto flex min-h-screen w-full max-w-md flex-col px-5 pb-10 pt-6">
    <header className="flex items-center gap-3"><Link to="/" aria-label="Torna alla home" className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-secondary text-secondary-foreground"><ArrowLeft className="h-5 w-5" /></Link><h1 className="truncate text-lg font-extrabold text-foreground">Fotografa il prodotto</h1></header>
    <ol className="mt-5 grid grid-cols-2 gap-2">{[{ n: 1, t: "Fronte" }, { n: 2, t: "Etichetta ingredienti" }].map((s) => <li key={s.n} className={`flex items-center gap-2 rounded-2xl px-3 py-2.5 text-sm font-bold ${step === s.n ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}><span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-background/30 text-xs">{step > s.n ? <Check className="h-3.5 w-3.5" /> : s.n}</span><span className="truncate">{s.t}</span></li>)}</ol>
    {search.code && <p className="mt-3 text-xs text-muted-foreground">Codice a barre: <span className="font-mono">{search.code}</span></p>}
    {step === 1 ? <>
      <p className="mt-4 text-base font-extrabold text-foreground">1. Fotografa la PARTE FRONTALE del prodotto</p><p className="mt-1 text-sm text-muted-foreground">Ci serve per capire di quale prodotto si tratta e leggere eventuali dichiarazioni esplicite come “senza glutine”.</p>
      <PhotoBox photo={front} busy={busy === "front"} busyText="Riconosco il prodotto…" hint="Tocca per fotografare il fronte della confezione" icon={<ScanSearch className="h-14 w-14 text-primary-foreground/80" />} onFile={onFront} />
      {identity && <div className="mt-4 rounded-2xl border border-border bg-card p-4"><p className="text-xs font-bold uppercase text-muted-foreground">{identity.recognized ? "Prodotto riconosciuto" : "Prodotto non riconosciuto"}</p>{identity.recognized && <p className="mt-1 text-base font-extrabold text-foreground">{identity.name}{identity.brand ? ` · ${identity.brand}` : ""}</p>}{identity.category && <p className="text-xs text-muted-foreground">{identity.category}</p>}{identity.claims.length > 0 && <div className="mt-3 flex flex-wrap gap-2">{identity.claims.map((claim) => <span key={claim} className="rounded-full bg-secondary px-3 py-1 text-xs font-bold text-secondary-foreground">{claim}</span>)}</div>}</div>}
      <div className="mt-4 grid grid-cols-1 gap-2"><input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome prodotto (correggi se serve)" className="rounded-2xl border border-border bg-card px-4 py-3.5 text-base text-foreground outline-none focus:border-primary" /><input value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="Marca" className="rounded-2xl border border-border bg-card px-4 py-3.5 text-base text-foreground outline-none focus:border-primary" /></div>
      <Note>La foto frontale serve a riconoscere il prodotto e a leggere solo dichiarazioni esplicite visibili, come “senza glutine”. La compatibilità viene comunque verificata anche sugli ingredienti dell'etichetta.</Note>
      {error && <p className="mt-3 text-sm font-semibold text-danger">{error}</p>}
      <button type="button" disabled={busy !== null} onClick={() => { setError(null); setStep(2); }} className="mt-5 w-full rounded-2xl bg-primary py-4 text-lg font-extrabold text-primary-foreground disabled:opacity-50">{front ? "Avanti: etichetta ingredienti" : "Salta e fotografa l'etichetta"}</button>
    </> : <>
      <p className="mt-4 text-base font-extrabold text-foreground">2. Fotografa l'ETICHETTA INGREDIENTI</p><p className="mt-1 text-sm text-muted-foreground">Inquadra bene tutta la lista, compresa la frase “può contenere tracce di…”.</p>
      {(name || brand) && <p className="mt-3 flex items-center gap-2 text-sm font-bold text-foreground"><Tag className="h-4 w-4 text-primary" />{[name, brand].filter(Boolean).join(" · ")}</p>}
      {identity?.claims?.length ? <div className="mt-3 flex flex-wrap gap-2">{identity.claims.map((claim) => <span key={claim} className="rounded-full bg-secondary px-3 py-1 text-xs font-bold text-secondary-foreground">{claim}</span>)}</div> : null}
      <PhotoBox photo={label} busy={busy === "label"} busyText="Leggo gli ingredienti…" hint="Tocca per fotografare la lista ingredienti" icon={<Camera className="h-14 w-14 text-primary-foreground/80" />} onFile={onLabel} />
      {error && <p className="mt-3 text-sm font-semibold text-danger">{error}</p>}
      <label className="mt-5 text-sm font-extrabold text-foreground" htmlFor="ing">Ingredienti letti (controlla e correggi)</label><textarea id="ing" value={text} onChange={(e) => setText(e.target.value)} rows={6} placeholder="Es. farina di grano tenero, zucchero, burro, uova…" className="mt-2 rounded-2xl border border-border bg-card p-4 text-base text-foreground outline-none focus:border-primary" />
      <button type="button" disabled={text.trim().length < 3 || busy !== null} onClick={analyze} className="mt-5 w-full rounded-2xl bg-primary py-4 text-lg font-extrabold text-primary-foreground disabled:opacity-50">Analizza ingredienti</button><button type="button" onClick={() => setStep(1)} className="mt-2 py-2 text-sm font-bold text-muted-foreground">Torna alla foto frontale</button>
    </>}
  </div>;
}

function PhotoBox({ photo, busy, busyText, hint, icon, onFile }: { photo: string | null; busy: boolean; busyText: string; hint: string; icon: React.ReactNode; onFile: (f?: File) => void }) {
  return <label className="relative mt-4 flex aspect-[4/3] cursor-pointer flex-col items-center justify-center overflow-hidden rounded-3xl bg-foreground">{photo ? <img src={photo} alt="" className="h-full w-full object-cover" /> : <>{icon}<p className="mt-3 max-w-[240px] text-center text-sm font-semibold text-primary-foreground/80">{hint}</p></>}{busy && <div className="absolute inset-0 grid place-items-center bg-foreground/70"><div className="text-center"><Loader2 className="mx-auto h-9 w-9 animate-spin text-primary-foreground" /><p className="mt-2 text-sm font-bold text-primary-foreground">{busyText}</p></div></div>}<input type="file" accept="image/*" capture="environment" className="sr-only" disabled={busy} onChange={(e) => { onFile(e.target.files?.[0]); e.target.value = ""; }} /></label>;
}

function Note({ children }: { children: React.ReactNode }) { return <div className="mt-4 flex items-start gap-2 rounded-2xl bg-muted p-3 text-xs text-muted-foreground"><Info className="mt-0.5 h-4 w-4 shrink-0" /><p>{children}</p></div>; }