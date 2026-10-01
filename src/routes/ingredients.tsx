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
type Crop = { x: number; y: number; w: number; h: number };

async function localOcr(image: string): Promise<string> {
  const { createWorker } = await import("tesseract.js");
  const worker = await createWorker("ita+eng");
  try {
    const result = await worker.recognize(image);
    return result.data.text.trim();
  } finally {
    await worker.terminate();
  }
}

function levenshtein(a: string, b: string): number {
  const prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let diagonal = prev[0];
    prev[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const old = prev[j];
      prev[j] = Math.min(prev[j] + 1, prev[j - 1] + 1, diagonal + (a[i - 1] === b[j - 1] ? 0 : 1));
      diagonal = old;
    }
  }
  return prev[b.length];
}

function fuzzyContains(text: string, target: string, maxDistance = 2): boolean {
  if (text.includes(target)) return true;
  const minLen = Math.max(1, target.length - maxDistance);
  const maxLen = target.length + maxDistance;
  for (let len = minLen; len <= maxLen; len++) {
    for (let i = 0; i + len <= text.length; i++) {
      if (levenshtein(text.slice(i, i + len), target) <= maxDistance) return true;
    }
  }
  return false;
}

function claimsFromText(text: string): string[] {
  const normalized = text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[|!]/g, "i")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const compact = normalized.replace(/\s+/g, "");
  const claims: string[] = [];
  if (/senza\s*glutine|gluten\s*free/.test(normalized) || fuzzyContains(compact, "senzaglutine", 2) || fuzzyContains(compact, "glutenfree", 2)) claims.push("senza glutine");
  if (/senza\s*lattosio|lactose\s*free/.test(normalized) || fuzzyContains(compact, "senzalattosio", 2) || fuzzyContains(compact, "lactosefree", 2)) claims.push("senza lattosio");
  if (/senza\s*latte|milk\s*free/.test(normalized) || fuzzyContains(compact, "senzalatte", 1) || fuzzyContains(compact, "milkfree", 1)) claims.push("senza latte");
  return claims;
}

async function loadImage(image: string): Promise<HTMLImageElement> {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = reject;
    el.src = image;
  });
}

function makeOcrVariant(img: HTMLImageElement, crop: Crop, threshold?: number, invert = false): string {
  const sx = Math.round(img.naturalWidth * crop.x);
  const sy = Math.round(img.naturalHeight * crop.y);
  const sw = Math.max(1, Math.round(img.naturalWidth * crop.w));
  const sh = Math.max(1, Math.round(img.naturalHeight * crop.h));
  const longest = Math.max(sw, sh);
  const scale = Math.max(1, Math.min(4, 2200 / Math.max(1, longest)));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(sw * scale);
  canvas.height = Math.round(sh * scale);
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("canvas-unavailable");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);

  if (threshold !== undefined) {
    const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = pixels.data;
    for (let i = 0; i < data.length; i += 4) {
      const gray = Math.round(data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114);
      let value = gray >= threshold ? 255 : 0;
      if (invert) value = 255 - value;
      data[i] = value;
      data[i + 1] = value;
      data[i + 2] = value;
    }
    ctx.putImageData(pixels, 0, 0);
  }
  return canvas.toDataURL("image/png");
}

async function localFrontOcr(image: string): Promise<string[]> {
  const { createWorker } = await import("tesseract.js");
  const worker = await createWorker("ita+eng");
  const img = await loadImage(image);
  const texts: string[] = [];
  const crops: Crop[] = [
    { x: 0, y: 0, w: 1, h: 1 },
    { x: 0.35, y: 0.12, w: 0.65, h: 0.76 },
    { x: 0, y: 0.12, w: 0.65, h: 0.76 },
    { x: 0.08, y: 0.28, w: 0.84, h: 0.58 },
    { x: 0, y: 0.45, w: 1, h: 0.55 },
  ];

  try {
    await worker.setParameters({ tessedit_pageseg_mode: "11" });

    for (const crop of crops) {
      const variant = makeOcrVariant(img, crop);
      const result = await worker.recognize(variant);
      texts.push(result.data.text.trim());
      if (claimsFromText(texts.join("\n")).length) return texts;
    }

    const highContrastCrops = [crops[0], crops[1], crops[3], crops[4]];
    for (const crop of highContrastCrops) {
      for (const threshold of [125, 155]) {
        const variant = makeOcrVariant(img, crop, threshold, false);
        const result = await worker.recognize(variant);
        texts.push(result.data.text.trim());
        if (claimsFromText(texts.join("\n")).length) return texts;
      }
    }

    const inverted = makeOcrVariant(img, crops[1], 145, true);
    const invertedResult = await worker.recognize(inverted);
    texts.push(invertedResult.data.text.trim());
    return texts;
  } finally {
    await worker.terminate();
  }
}

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
    const dataUrl = await fileToDataUrl(file);
    setFront(dataUrl);
    saveFrontPhoto(await fileToDataUrl(file, 480, 0.7));
    try {
      const r = await identifyFn({ data: { image: dataUrl } });
      let claims = r.claims;
      if (claims.length === 0) {
        try {
          const ocrTexts = await localFrontOcr(dataUrl);
          claims = claimsFromText(ocrTexts.join("\n"));
        } catch {
          // The product identity from AI is still useful even if local OCR fails.
        }
      }
      const merged = { ...r, claims: Array.from(new Set([...r.claims, ...claims])) };
      setIdentity(merged);
      if (r.recognized) { if (!name) setName(r.name); if (!brand) setBrand(r.brand); }
      if (merged.claims.length === 0) setError("Non ho trovato dichiarazioni leggibili sul fronte. Puoi continuare con l'etichetta ingredienti.");
    } catch {
      try {
        const ocrTexts = await localFrontOcr(dataUrl);
        const claims = claimsFromText(ocrTexts.join("\n"));
        setIdentity({ name: "", brand: "", category: "", recognized: false, claims });
        if (claims.length === 0) setError("Non ho trovato dichiarazioni leggibili sul fronte. Puoi continuare con l'etichetta ingredienti.");
      } catch {
        setError("Non sono riuscito a leggere il fronte. Puoi continuare con l'etichetta ingredienti.");
      }
    } finally { setBusy(null); }
  };

  const onLabel = async (file?: File) => {
    if (!file) return;
    setError(null); setBusy("label");
    const dataUrl = await fileToDataUrl(file, 1600, 0.85);
    setLabel(dataUrl);
    try {
      const r = await readFn({ data: { image: dataUrl } });
      if (!r.readable) throw new Error("not-readable");
      setText([r.ingredients, r.traces].filter(Boolean).join(" "));
    } catch {
      try {
        const ocr = await localOcr(dataUrl);
        if (ocr.length < 4) throw new Error("ocr-empty");
        setText(ocr);
      } catch {
        setError("Non riesco a leggere gli ingredienti. Riprova con più luce oppure scrivili qui sotto.");
      }
    } finally { setBusy(null); }
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
      <PhotoBox photo={front} busy={busy === "front"} busyText="Leggo il prodotto…" hint="Tocca per fotografare il fronte della confezione" icon={<ScanSearch className="h-14 w-14 text-primary-foreground/80" />} onFile={onFront} />
      {identity && <div className="mt-4 rounded-2xl border border-border bg-card p-4"><p className="text-xs font-bold uppercase text-muted-foreground">{identity.recognized ? "Prodotto riconosciuto" : identity.claims.length ? "Dichiarazioni rilevate" : "Prodotto non riconosciuto"}</p>{identity.recognized && <p className="mt-1 text-base font-extrabold text-foreground">{identity.name}{identity.brand ? ` · ${identity.brand}` : ""}</p>}{identity.category && <p className="text-xs text-muted-foreground">{identity.category}</p>}{identity.claims.length > 0 && <div className="mt-3 flex flex-wrap gap-2">{identity.claims.map((claim) => <span key={claim} className="rounded-full bg-secondary px-3 py-1 text-xs font-bold text-secondary-foreground">{claim}</span>)}</div>}</div>}
      <div className="mt-4 grid grid-cols-1 gap-2"><input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome prodotto (correggi se serve)" className="rounded-2xl border border-border bg-card px-4 py-3.5 text-base text-foreground outline-none focus:border-primary" /><input value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="Marca" className="rounded-2xl border border-border bg-card px-4 py-3.5 text-base text-foreground outline-none focus:border-primary" /></div>
      <Note>Se il servizio AI non è disponibile o non trova dichiarazioni sul fronte, l'app usa automaticamente una lettura OCR locale sul dispositivo per cercare scritte come “senza glutine”.</Note>
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