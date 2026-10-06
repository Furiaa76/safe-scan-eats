import { useAppLanguage } from "@/lib/language";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Camera, CreditCard, ExternalLink, Eye, EyeOff, Images, Loader2, Save, ShieldCheck, Trash2 } from "lucide-react";
import { readHealthCard } from "@/lib/vision.functions";
import { fileToDataUrl } from "@/lib/image";

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

async function readCrsBarcode(image: string): Promise<string> {
  try {
    const { BrowserMultiFormatReader } = await import("@zxing/browser");
    const reader = new BrowserMultiFormatReader();
    const result = await reader.decodeFromImageUrl(image);
    const raw = result.getText().toUpperCase().replace(/[^A-Z0-9]/g, "");
    const cf = raw.match(/[A-Z]{6}[0-9]{2}[A-Z][0-9]{2}[A-Z][0-9]{3}[A-Z]/)?.[0];
    if (cf) return cf;
    if (/^[A-Z0-9]{16}$/.test(raw)) return raw;
    return "";
  } catch {
    return "";
  }
}

async function localCrsOcr(image: string) {
  const { createWorker } = await import("tesseract.js");
  const worker = await createWorker("ita+eng");
  try {
    await worker.setParameters({ tessedit_pageseg_mode: "11" });
    const result = await worker.recognize(image);
    const text = (result.data.text || "").toUpperCase();
    const compact = text.replace(/[^A-Z0-9]/g, "");
    const fiscalCode = compact.match(/[A-Z]{6}[0-9]{2}[A-Z][0-9]{2}[A-Z][0-9]{3}[A-Z]/)?.[0] || "";
    const lines = text.split(/\n+/).map((v) => v.trim()).filter(Boolean);
    const labelled = lines.filter((line) => /IDENTIFIC|TESSER|CARD|NUMERO/.test(line));
    const labelledNumbers = labelled.flatMap((line) => (line.match(/\d(?:[\s.-]*\d){4,}/g) || []).map((v) => v.replace(/\D/g, "")));
    const allNumbers = (text.match(/\d(?:[\s.-]*\d){9,}/g) || []).map((v) => v.replace(/\D/g, ""));
    const cardNumber = [...labelledNumbers, ...allNumbers].filter((v) => v.length >= 5).sort((a, b) => b.length - a.length)[0] || "";
    return { fiscalCode, lastFive: cardNumber.length >= 5 ? cardNumber.slice(-5) : "" };
  } finally {
    await worker.terminate();
  }
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
  const { t } = useAppLanguage();

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
      <svg viewBox={`0 0 ${encoded.width} 72`} className="h-28 w-full" role="img" aria-label={t("Codice a barre del codice fiscale")}>
        <rect x="0" y="0" width={encoded.width} height="72" fill="white" />
        {encoded.bars.filter((b) => b.black).map((b, i) => <rect key={i} x={b.x} y="4" width={b.w} height="54" fill="black" />)}
      </svg>
      <p className="mt-1 break-all text-center font-mono text-sm font-bold text-black">{t(value)}</p>
    </div>
  );
}

function CrsPage() {
  const { t } = useAppLanguage();

  const [holder, setHolder] = useState("");
  const [fiscalCode, setFiscalCode] = useState("");
  const [lastFive, setLastFive] = useState("");
  const [saved, setSaved] = useState(false);
  const [showData, setShowData] = useState(true);
  const [scanBusy, setScanBusy] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [cardPhoto, setCardPhoto] = useState<string | null>(null);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scannerMessage, setScannerMessage] = useState("Inquadra tutta la CRS");
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanTimerRef = useRef<number | null>(null);
  const scanInFlightRef = useRef(false);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const libraryInputRef = useRef<HTMLInputElement | null>(null);
  const fiscalRef = useRef("");
  const lastFiveRef = useRef("");
  const holderRef = useRef("");
  const frontPhotoRef = useRef<string | null>(null);
  const readCard = useServerFn(readHealthCard);

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

  const stopScanner = () => {
    if (scanTimerRef.current !== null) {
      window.clearTimeout(scanTimerRef.current);
      scanTimerRef.current = null;
    }
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    scanInFlightRef.current = false;
    setScannerOpen(false);
    setScanBusy(false);
  };

  const captureVideoFrame = () => {
    const video = videoRef.current;
    if (!video || video.readyState < 2 || !video.videoWidth || !video.videoHeight) return null;
    const marginX = Math.round(video.videoWidth * 0.05);
    const marginY = Math.round(video.videoHeight * 0.05);
    const sx = marginX, sy = marginY;
    const sw = Math.max(1, video.videoWidth - marginX * 2);
    const sh = Math.max(1, video.videoHeight - marginY * 2);
    const max = 1800;
    const scale = Math.min(1, max / Math.max(sw, sh));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(sw * scale));
    canvas.height = Math.max(1, Math.round(sh * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(video, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.94);
  };

  const scanLiveFrame = async () => {
    if (!streamRef.current || scanInFlightRef.current) return;
    const image = captureVideoFrame();
    if (!image) {
      scanTimerRef.current = window.setTimeout(scanLiveFrame, 700);
      return;
    }

    scanInFlightRef.current = true;
    setScanBusy(true);
    setScannerMessage("Sto leggendo i dati…");

    try {
      let result = { fiscalCode: "", lastFive: "", holder: "" };

      // Sul retro della Tessera Sanitaria il codice a barre contiene il codice fiscale:
      // lo leggiamo prima con ZXing, che è molto più affidabile dell'OCR sui caratteri piccoli.
      const barcodeFiscal = await readCrsBarcode(image);
      if (barcodeFiscal) {
        result.fiscalCode = barcodeFiscal;
        setScannerMessage("Codice a barre letto ✓ Ora leggo il numero tessera…");
      }

      if (!result.fiscalCode || !result.lastFive) {
        try {
          const local = await localCrsOcr(image);
          if (!result.fiscalCode && local.fiscalCode) result.fiscalCode = local.fiscalCode;
          if (!result.lastFive && local.lastFive) result.lastFive = local.lastFive;
        } catch {}
      }

      // Solo se manca ancora qualcosa proviamo la lettura visiva lato server.
      if (!result.fiscalCode || !result.lastFive) {
        try {
          const ai = await readCard({ data: { image } });
          if (!result.fiscalCode && ai.fiscalCode) result.fiscalCode = ai.fiscalCode;
          if (!result.lastFive && ai.lastFive) result.lastFive = ai.lastFive;
          if (ai.holder) result.holder = ai.holder;
        } catch {}
      }

      if (result.fiscalCode.length === 16) {
        fiscalRef.current = result.fiscalCode;
        setFiscalCode(result.fiscalCode);
        if (!frontPhotoRef.current) frontPhotoRef.current = image;
      }
      if (result.holder) {
        holderRef.current = result.holder;
        setHolder(result.holder);
      }
      if (result.lastFive.length === 5) {
        lastFiveRef.current = result.lastFive;
        setLastFive(result.lastFive);
      }

      if (fiscalRef.current.length === 16 && lastFiveRef.current.length === 5) {
        setCardPhoto(frontPhotoRef.current || image);
        setSaved(false);
        setScanError(null);
        setScannerMessage("Tessera letta automaticamente");
        stopScanner();
        return;
      }

      if (fiscalRef.current.length === 16 && lastFiveRef.current.length !== 5) {
        setScannerMessage("Fronte letto ✓ Ora gira la tessera e inquadra il retro");
      } else if (lastFiveRef.current.length === 5 && fiscalRef.current.length !== 16) {
        setScannerMessage("Retro letto ✓ Ora gira la tessera e inquadra il fronte");
      } else {
        setScannerMessage("Inquadra tutta la CRS e tienila ferma");
      }
    } catch {
      setScannerMessage("Non ho ancora letto i caratteri: tieni la tessera ferma dentro il riquadro");
    } finally {
      scanInFlightRef.current = false;
      setScanBusy(false);
    }

    if (streamRef.current) {
      scanTimerRef.current = window.setTimeout(scanLiveFrame, 1400);
    }
  };

  const scanFallbackPhoto = async (file?: File) => {
    if (!file) return;
    setScanError(null);
    setScanBusy(true);
    try {
      const image = await fileToDataUrl(file, 1800, 0.9);
      setCardPhoto(image);
      let result = { readable: false, holder: "", fiscalCode: "", lastFive: "" };
      try { result = await readCard({ data: { image } }); } catch {}
      if (!result.fiscalCode || !result.lastFive) {
        try {
          const local = await localCrsOcr(image);
          if (!result.fiscalCode && local.fiscalCode) result.fiscalCode = local.fiscalCode;
          if (!result.lastFive && local.lastFive) result.lastFive = local.lastFive;
        } catch {}
      }
      if (result.holder) setHolder(result.holder);
      if (result.fiscalCode) setFiscalCode(result.fiscalCode);
      if (result.lastFive) setLastFive(result.lastFive);
      if (!result.fiscalCode && !result.lastFive) {
        setScanError("La foto è stata acquisita, ma non riesco ancora a leggere i caratteri. Fai riempire quasi tutto il riquadro dalla tessera e tienila ferma.");
      }
    } catch {
      setScanError("Non riesco a leggere la foto della CRS. Riprova.");
    } finally {
      setScanBusy(false);
    }
  };

  const openNativeCameraFallback = () => {
    setScannerOpen(false);
    cameraInputRef.current?.click();
  };

  const startScanner = async () => {
    setScanError(null);
    setCardPhoto(null);
    setScannerMessage("Inquadra il RETRO della CRS, soprattutto il codice a barre");
    fiscalRef.current = "";
    lastFiveRef.current = "";
    holderRef.current = "";
    frontPhotoRef.current = null;
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        openNativeCameraFallback();
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });
      streamRef.current = stream;
      setScannerOpen(true);
    } catch {
      stopScanner();
      setScanError("Lo scanner continuo non è disponibile su questo iPhone/browser. Apro la fotocamera del telefono.");
      window.setTimeout(openNativeCameraFallback, 50);
    }
  };

  useEffect(() => {
    if (!scannerOpen || !streamRef.current || !videoRef.current) return;
    const video = videoRef.current;
    video.srcObject = streamRef.current;
    const begin = async () => {
      try { await video.play(); } catch {}
      if (scanTimerRef.current !== null) window.clearTimeout(scanTimerRef.current);
      scanTimerRef.current = window.setTimeout(scanLiveFrame, 900);
    };
    begin();
  }, [scannerOpen]);

  useEffect(() => () => {
    if (scanTimerRef.current !== null) window.clearTimeout(scanTimerRef.current);
    streamRef.current?.getTracks().forEach((track) => track.stop());
  }, []);

  const save = () => {
    const data: SavedCard = { holder: holder.trim(), fiscalCode, lastFive };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    setSaved(true);
  };

  const clear = () => {
    if (!window.confirm(t("Vuoi eliminare i dati della Tessera Sanitaria salvati su questo dispositivo?"))) return;
    localStorage.removeItem(STORAGE_KEY);
    setHolder(""); setFiscalCode(""); setLastFive(""); setSaved(false);
  };

  return <div className="mx-auto flex min-h-screen w-full max-w-md flex-col px-5 pb-10 pt-6">
    <header className="flex items-center gap-3">
      <Link to="/" aria-label={t("Torna alla home")} className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-secondary text-secondary-foreground"><ArrowLeft className="h-5 w-5" /></Link>
      <div><h1 className="text-lg font-extrabold text-foreground">{t("CRS / Tessera Sanitaria")}</h1><p className="text-xs text-muted-foreground">{t("Celiachia · dati utili e lettura ottica")}</p></div>
    </header>

    <section className="mt-5 rounded-3xl border border-border bg-card p-5">
      <div className="flex items-start gap-3"><CreditCard className="mt-0.5 h-6 w-6 shrink-0 text-primary" /><div><h2 className="font-extrabold text-foreground">{t("La tua tessera")}</h2><p className="mt-1 text-sm leading-relaxed text-muted-foreground">{t("Salviamo questi dati solo su questo dispositivo. Non inserire PIN, PUK, SPID o password.")}</p></div></div>

      <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{t("Apri lo scanner e inquadra direttamente il RETRO della CRS/Tessera Sanitaria, dove c’è il codice a barre. Safe Scan Eats legge prima il codice a barre per ricavare il codice fiscale e poi prova a leggere il numero identificativo della tessera. Non serve più partire dal fronte.")}</p>

      <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="sr-only" onChange={(e) => { scanFallbackPhoto(e.target.files?.[0]); e.target.value = ""; }} />
      <input ref={libraryInputRef} type="file" accept="image/*" className="sr-only" onChange={(e) => { scanFallbackPhoto(e.target.files?.[0]); e.target.value = ""; }} />
      <div className="relative mt-4 aspect-[1.58/1] overflow-hidden rounded-3xl border-2 border-primary/40 bg-foreground">
        {scannerOpen ? <>
          <video ref={videoRef} playsInline muted autoPlay className="h-full w-full object-cover" />
          <div className="pointer-events-none absolute inset-[8%] rounded-2xl border-2 border-white/90 shadow-[0_0_0_999px_rgba(0,0,0,0.28)]" />
          <div className="absolute inset-x-3 bottom-3 rounded-2xl bg-black/65 px-3 py-2 text-center text-sm font-extrabold text-white">
            {scanBusy && <Loader2 className="mr-2 inline h-4 w-4 animate-spin" />}{t(scannerMessage)}
          </div>
        </> : cardPhoto ? <img src={cardPhoto} alt={t("CRS acquisita automaticamente")} className="h-full w-full object-cover" /> : <button type="button" onClick={startScanner} className="flex h-full w-full flex-col items-center justify-center bg-secondary px-6 text-center">
          <Camera className="h-12 w-12 text-primary" />
          <p className="mt-3 text-sm font-extrabold text-foreground">{t("Apri scanner CRS")}</p>
          <p className="mt-1 text-xs text-muted-foreground">{t("Inquadra il RETRO con il codice a barre ben visibile")}</p>
        </button>}
      </div>

      {scannerOpen && <button type="button" onClick={stopScanner} className="mt-3 w-full rounded-2xl border border-border py-3 text-sm font-extrabold text-foreground">{t("Chiudi scanner")}</button>}
      {!scannerOpen && cardPhoto && <button type="button" onClick={startScanner} className="mt-3 w-full rounded-2xl border border-border py-3 text-sm font-extrabold text-foreground">{t("Scansiona di nuovo")}</button>}
      {!scannerOpen && <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
        <button type="button" onClick={openNativeCameraFallback} className="flex w-full items-center justify-center gap-2 rounded-2xl border border-border py-3 text-sm font-extrabold text-foreground"><Camera className="h-4 w-4" />{t("Apri fotocamera del telefono")}</button>
        <button type="button" onClick={() => libraryInputRef.current?.click()} className="flex w-full items-center justify-center gap-2 rounded-2xl border border-border py-3 text-sm font-extrabold text-foreground"><Images className="h-4 w-4" />{t("Scegli dalla libreria foto")}</button>
      </div>}

      {scanError && <p className="mt-3 text-sm font-semibold text-danger">{t(scanError)}</p>}

      {(holder || fiscalCode || lastFive) && <div className="mt-4 rounded-2xl bg-muted p-4">
        <p className="text-xs font-extrabold uppercase text-muted-foreground">{t("Dati letti automaticamente")}</p>
        <p className="mt-2 text-sm font-bold text-foreground">{t(holder || "Intestatario non letto")}</p>
        <p className="mt-1 font-mono text-sm font-bold text-foreground">{t(fiscalCode || "Codice fiscale non letto")}</p>
        <p className="mt-1 font-mono text-sm font-bold text-foreground">{t("Ultime 5 cifre: ")}{t(lastFive || "—")}</p>
      </div>}

      <details className="mt-4 rounded-2xl border border-border bg-background p-4">
        <summary className="cursor-pointer text-sm font-extrabold text-foreground">{t("Correggi manualmente se serve")}</summary>
        <label className="mt-4 block text-sm font-extrabold text-foreground">{t("Intestatario")}</label>
        <input value={holder} onChange={(e) => setHolder(e.target.value)} placeholder={t("Nome e cognome")} className="mt-2 w-full rounded-2xl border border-border bg-background px-4 py-3.5 text-base outline-none focus:border-primary" />
        <label className="mt-4 block text-sm font-extrabold text-foreground">{t("Codice fiscale")}</label>
        <input value={fiscalCode} onChange={(e) => setFiscalCode(sanitizeFiscalCode(e.target.value))} autoCapitalize="characters" placeholder={t("16 caratteri")} className="mt-2 w-full rounded-2xl border border-border bg-background px-4 py-3.5 font-mono text-base uppercase outline-none focus:border-primary" />
        <label className="mt-4 block text-sm font-extrabold text-foreground">{t("Ultime 5 cifre numero tessera")}</label>
        <input value={lastFive} onChange={(e) => setLastFive(sanitizeLastFive(e.target.value))} inputMode="numeric" placeholder={t("Es. 12345")} className="mt-2 w-full rounded-2xl border border-border bg-background px-4 py-3.5 font-mono text-base outline-none focus:border-primary" />
      </details>

      <button type="button" disabled={!valid || scanBusy} onClick={save} className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-3.5 font-extrabold text-primary-foreground disabled:opacity-40"><Save className="h-5 w-5" />{t("Salva dati letti su questo dispositivo")}</button>
    </section>

    {saved && valid && <section className="mt-5 rounded-3xl border border-border bg-card p-5">
      <div className="flex items-center justify-between gap-3"><div><h2 className="font-extrabold text-foreground">{t("Mostra alla cassa")}</h2><p className="mt-1 text-xs text-muted-foreground">{t("Per i punti vendita che accettano la lettura ottica del codice fiscale.")}</p></div><button type="button" onClick={() => setShowData((v) => !v)} className="grid h-10 w-10 place-items-center rounded-full bg-secondary text-secondary-foreground">{showData ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}</button></div>
      {showData ? <><Barcode value={fiscalCode} /><div className="mt-3 rounded-2xl bg-muted p-3"><p className="text-xs font-bold text-muted-foreground">{t("Ultime 5 cifre tessera")}</p><p className="mt-1 font-mono text-xl font-black tracking-widest text-foreground">{lastFive}</p></div></> : <div className="mt-4 rounded-2xl bg-muted p-6 text-center text-sm font-bold text-muted-foreground">{t("Dati nascosti")}</div>}
      <p className="mt-3 text-xs leading-relaxed text-muted-foreground">{t("Nota: questa schermata non sostituisce il chip/seriale della TS-CNS nei negozi o POS che richiedono la tessera fisica.")}</p>
    </section>}

    <section className="mt-5 rounded-3xl border border-border bg-card p-5">
      <div className="flex items-start gap-3"><ShieldCheck className="mt-0.5 h-6 w-6 shrink-0 text-primary" /><div><h2 className="font-extrabold text-foreground">{t("Budget celiachia Lombardia")}</h2><p className="mt-1 text-sm leading-relaxed text-muted-foreground">{t("Nel Fascicolo Sanitario di Regione Lombardia puoi vedere budget residuo, spese e negozi convenzionati.")}</p></div></div>
      <a href="https://www.fascicolosanitario.regione.lombardia.it/fascicolo" target="_blank" rel="noreferrer" className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-3.5 font-extrabold text-primary-foreground">{t("Apri saldo celiachia ")}<ExternalLink className="h-4 w-4" /></a>
      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{t("Si apre direttamente l’area di accesso del Fascicolo Sanitario ufficiale di Regione Lombardia. Dopo l’autenticazione con SPID, CIE oppure TS-CNS, apri la sezione “Celiachia” per vedere budget residuo e spese. Safe Scan Eats non salva né vede le credenziali.")}</p>
      <Link to="/stores" className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl border border-border py-3.5 font-extrabold text-foreground">{t("Apri elenco negozi convenzionati ")}<ExternalLink className="h-4 w-4" /></Link>
    </section>

    {saved && <button type="button" onClick={clear} className="mt-5 flex items-center justify-center gap-2 py-3 text-sm font-extrabold text-danger"><Trash2 className="h-4 w-4" />{t("Elimina dati tessera")}</button>}
  </div>;
}
