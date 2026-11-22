import { useEffect, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { reportClientError } from "@/lib/client-diagnostics";
import { linkAlexaPairingCode, loadAlexaLinkStatus } from "@/lib/cloud-shopping";
import { useAppLanguage } from "@/lib/language";

export function useShoppingAlexaLink() {
  const [linked, setLinked] = useState<boolean | null>(null);
  const [statusError, setStatusError] = useState(false);

  useEffect(() => {
    let active = true;
    void loadAlexaLinkStatus().then((result) => {
      if (active) setLinked(result);
    }).catch((error) => {
      reportClientError("alexa-link", error);
      if (active) {
        setStatusError(true);
        setLinked(false);
      }
    });
    return () => { active = false; };
  }, []);

  return { linked, setLinked, statusError };
}

export function ShoppingAlexa({ linked, statusError, onLinked }: {
  linked: boolean | null;
  statusError: boolean;
  onLinked: () => void;
}) {
  const { t } = useAppLanguage();
  const [code, setCode] = useState("");
  const [message, setMessage] = useState("");
  const [linking, setLinking] = useState(false);
  const [showCode, setShowCode] = useState(false);

  return <section className="mt-4 rounded-3xl border border-border bg-card p-4">
    <h2 className="flex items-center gap-2 font-extrabold">
      {linked && <CheckCircle2 className="h-5 w-5 text-safe" />}
      {t(linked ? "Alexa collegata" : linked === null ? "Controllo collegamento Alexa…" : "Collega Alexa")}
    </h2>
    {linked && (
      <p className="mt-1 text-xs text-muted-foreground">{t("Alexa collegata alla tua lista della spesa.")}</p>
    )}
    {linked && !showCode && <button type="button" onClick={() => setShowCode(true)} className="mt-2 min-h-9 text-xs font-extrabold text-primary">{t("Collega un altro account Alexa")}</button>}
    {(linked === false || showCode) && (
      <form onSubmit={async (event) => {
        event.preventDefault();
        if (code.length !== 6 || linking) return;
        setLinking(true);
        setMessage("");
        try {
          const ok = await linkAlexaPairingCode(code);
          if (ok) {
            setCode("");
            setShowCode(false);
            onLinked();
          } else {
            setMessage("Codice non valido o scaduto. Chiedi ad Alexa un nuovo codice.");
          }
        } catch (error) {
          reportClientError("alexa-link", error);
          setMessage("Non riesco a collegare Alexa in questo momento.");
        } finally {
          setLinking(false);
        }
      }}>
        <p className="mt-1 text-xs text-muted-foreground">{t("Apri la skill “Safe Scan” su Alexa. Se non è ancora collegata, Alexa ti dirà un codice di 6 cifre.")}</p>
        {statusError && !linked && <p className="mt-1 text-xs text-muted-foreground">{t("Stato del collegamento non disponibile.")}</p>}
        <div className="mt-3 flex gap-2">
          <input value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" aria-label={t("Codice 6 cifre")} placeholder={t("Codice 6 cifre")} className="min-w-0 flex-1 rounded-2xl border border-border bg-background px-4 py-3 text-center text-lg font-extrabold tracking-widest" />
          <button type="submit" disabled={linking || code.length !== 6} className="rounded-2xl bg-secondary px-4 text-sm font-extrabold text-secondary-foreground disabled:opacity-40">
            {t(linking ? "Collego…" : "Collega")}
          </button>
        </div>
        {message && <p role="status" className="mt-2 text-xs font-semibold text-muted-foreground">{t(message)}</p>}
        {linked && <button type="button" onClick={() => { setShowCode(false); setCode(""); setMessage(""); }} className="mt-2 min-h-9 text-xs font-extrabold">{t("Annulla")}</button>}
      </form>
    )}
  </section>;
}
