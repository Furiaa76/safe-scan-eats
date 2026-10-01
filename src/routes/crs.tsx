import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, CreditCard, ExternalLink, Eye, EyeOff, Save, ShieldCheck, Trash2 } from "lucide-react";

export const Route = createFileRoute("/crs")({
  head: () => ({ meta: [{ title: "CRS / Tessera Sanitaria — Safe Scan Eats" }] }),
  component: CrsPage,
});

type SavedCard = {
  holder: string;
  fiscalCode: string;
  lastFive: string;
};

const STORAGE_KEY = "safe-scan-crs-v1";

function sanitizeFiscalCode(value: string) {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 16);
}

function sanitizeLastFive(value: string) {
  return value.replace(/\D/g, "").slice(0, 5);
}

// Code 39: sufficiente per mostrare il codice fiscale a molti lettori ottici.
// Non sostituisce il chip/seriale della TS-CNS quando il punto vendita lo richiede.
const CODE39: Record<string, string> = {
  "0":"nnnwwnwnn","1":"wnnwnnnnw","2":"nnwwnnnnw","3":"wnwwnnnnn","4":"nnnwwnnnw",
  "5":"wnnwwnnnn","6":"nnwwwnnnn","7":"nnnwnnwnw","8":"wnnwnnwnn","9":"nnwwnnwnn",
  "A":"wnnnnwnnw","B":"nnwnnwnnw","C":"wnwnnwnnn","D":"nnnnwwnnw","E":"wnnnwwnnn",
  "F":"nnwnwwnnn","G":"nnnnnwwnw","H":"wnnnnwwnn","I":"nnwnnwwnn","J":"nnnnwwwnn",
  "K":"wnnnnnnww","L":"nnwnnnnww","M":"wnwnnnnwn","N":"nnnnwnnww","O":"wnnnwnnwn",
  "P":"nnwnwnnwn","Q":"nnnnnnwww","R":"wnnnnnwwn","S":"nnwnnnwwn","T":"nnnnwnwwn",
  "U":"wwnnnnnnw","V":"nwwnnnnnw","W":"wwwnnnnnn","X":"nwnnwnnnw","Y":"wwnnwnnnn",
  "Z":"nwwnwnnnn","-":"nwnnnnwnw",".":"wwnnnnwnn"," ":"nwwnnnwnn","*":"nwnnwnwnn"
};

function Barcode({ value }: { value: string }) {
  const encoded = useMemo(() => {
    const full = `*${value}*`;
    const bars: Array<{ x: number; w: number; black: boolean }> = [];
    let x = 8;
    for (const ch of full) {
      const pattern = CODE39[ch];
      if (!pattern) continue;
      for (let i = 0; i < pattern.length; i++) {
        const w = pattern[i] === "w" ? 3 : 1;
        bars.push({ x, w, black: i % 2 === 0 });
        x += w;
      }
      x += 1;
    }
    return { bars, width: Math.max(180, x + 8) };
  }, [value]);

  if (value.length !== 16) return null;

  return (
    <div className="mt-4 overflow-hidden rounded-2xl border border-border bg-white p-4">
      <svg viewBox={`0 0 ${encoded.width} 72`} className="h-28 w-full" role="img" aria-label="Codice a barre del codice fiscale">
        <rect x="0" y="0" width={encoded.width} height="72" fill="white" />
        {encoded.bars.filter((b) => b.black).map((b, i) => <rect key={i} x={b.x} y="4" width={b.w} height="54" fill="black" />)}
      </svg>
      <p className="mt-1 break-all text-center font-mono text-sm font-bold text-black">{value}</p>
    </div>
  );
}

function CrsPage() {
  const [holder, setHolder] = useState("");
  const [fiscalCode, setFiscalCode] = useState("");
  const [lastFive, setLastFive] = useState("");
  const [saved, setSaved] = useState(false);
  const [showData, setShowData] = useState(true);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const data = JSON.parse(raw) as SavedCard;
      setHolder(data.holder || "");
      setFiscalCode(data.fiscalCode || "");
      setLastFive(data.lastFive || "");
      setSaved(true);
    } catch {
      // Ignore dati locali non validi.
    }
  }, []);

  const valid = fiscalCode.length === 16 && lastFive.length === 5;

  const save = () => {
    const data: SavedCard = { holder: holder.trim(), fiscalCode, lastFive };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    setSaved(true);
  };

  const clear = () => {
    if (!window.confirm("Vuoi eliminare i dati della Tessera Sanitaria salvati su questo dispositivo?")) return;
    localStorage.removeItem(STORAGE_KEY);
    setHolder(""); setFiscalCode(""); setLastFive(""); setSaved(false);
  };

  return <div className="mx-auto flex min-h-screen w-full max-w-md flex-col px-5 pb-10 pt-6">
    <header className="flex items-center gap-3">
      <Link to="/" aria-label="Torna alla home" className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-secondary text-secondary-foreground"><ArrowLeft className="h-5 w-5" /></Link>
      <div><h1 className="text-lg font-extrabold text-foreground">CRS / Tessera Sanitaria</h1><p className="text-xs text-muted-foreground">Celiachia · dati utili e lettura ottica</p></div>
    </header>

    <section className="mt-5 rounded-3xl border border-border bg-card p-5">
      <div className="flex items-start gap-3"><CreditCard className="mt-0.5 h-6 w-6 shrink-0 text-primary" /><div><h2 className="font-extrabold text-foreground">La tua tessera</h2><p className="mt-1 text-sm leading-relaxed text-muted-foreground">Salviamo questi dati solo su questo dispositivo. Non inserire PIN, PUK, SPID o password.</p></div></div>

      <label className="mt-5 block text-sm font-extrabold text-foreground">Intestatario</label>
      <input value={holder} onChange={(e) => setHolder(e.target.value)} placeholder="Es. Giusy" className="mt-2 w-full rounded-2xl border border-border bg-background px-4 py-3.5 text-base outline-none focus:border-primary" />

      <label className="mt-4 block text-sm font-extrabold text-foreground">Codice fiscale</label>
      <input value={fiscalCode} onChange={(e) => setFiscalCode(sanitizeFiscalCode(e.target.value))} autoCapitalize="characters" placeholder="16 caratteri" className="mt-2 w-full rounded-2xl border border-border bg-background px-4 py-3.5 font-mono text-base uppercase outline-none focus:border-primary" />

      <label className="mt-4 block text-sm font-extrabold text-foreground">Ultime 5 cifre numero identificativo tessera</label>
      <input value={lastFive} onChange={(e) => setLastFive(sanitizeLastFive(e.target.value))} inputMode="numeric" placeholder="Es. 12345" className="mt-2 w-full rounded-2xl border border-border bg-background px-4 py-3.5 font-mono text-base outline-none focus:border-primary" />
      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">Sono le ultime 5 cifre del “Numero di identificazione” della TS/CRS, richieste anche da alcuni servizi regionali online.</p>

      <button type="button" disabled={!valid} onClick={save} className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-3.5 font-extrabold text-primary-foreground disabled:opacity-40"><Save className="h-5 w-5" />Salva su questo dispositivo</button>
    </section>

    {saved && valid && <section className="mt-5 rounded-3xl border border-border bg-card p-5">
      <div className="flex items-center justify-between gap-3"><div><h2 className="font-extrabold text-foreground">Mostra alla cassa</h2><p className="mt-1 text-xs text-muted-foreground">Per i punti vendita che accettano la lettura ottica del codice fiscale.</p></div><button type="button" onClick={() => setShowData((v) => !v)} className="grid h-10 w-10 place-items-center rounded-full bg-secondary text-secondary-foreground">{showData ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}</button></div>
      {showData ? <><Barcode value={fiscalCode} /><div className="mt-3 rounded-2xl bg-muted p-3"><p className="text-xs font-bold text-muted-foreground">Ultime 5 cifre tessera</p><p className="mt-1 font-mono text-xl font-black tracking-widest text-foreground">{lastFive}</p></div></> : <div className="mt-4 rounded-2xl bg-muted p-6 text-center text-sm font-bold text-muted-foreground">Dati nascosti</div>}
      <p className="mt-3 text-xs leading-relaxed text-muted-foreground">Nota: questa schermata non sostituisce il chip/seriale della TS-CNS nei negozi o POS che richiedono la tessera fisica.</p>
    </section>}

    <section className="mt-5 rounded-3xl border border-border bg-card p-5">
      <div className="flex items-start gap-3"><ShieldCheck className="mt-0.5 h-6 w-6 shrink-0 text-primary" /><div><h2 className="font-extrabold text-foreground">Budget celiachia Lombardia</h2><p className="mt-1 text-sm leading-relaxed text-muted-foreground">Nel Fascicolo Sanitario di Regione Lombardia puoi vedere budget residuo, spese e negozi convenzionati.</p></div></div>
      <a href="https://www.fascicolosanitario.regione.lombardia.it/" target="_blank" rel="noreferrer" className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-3.5 font-extrabold text-primary-foreground">Controlla saldo celiachia <ExternalLink className="h-4 w-4" /></a>
      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">Si apre il Fascicolo Sanitario ufficiale di Regione Lombardia. L’accesso avviene sui sistemi regionali con SPID, CIE oppure Tessera Sanitaria + PIN: Safe Scan Eats non salva queste credenziali.</p>
      <Link to="/stores" className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl border border-border py-3.5 font-extrabold text-foreground">Apri elenco negozi convenzionati <ExternalLink className="h-4 w-4" /></Link>
    </section>

    {saved && <button type="button" onClick={clear} className="mt-5 flex items-center justify-center gap-2 py-3 text-sm font-extrabold text-danger"><Trash2 className="h-4 w-4" />Elimina dati tessera</button>}
  </div>;
}
