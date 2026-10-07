import { Capacitor } from "@capacitor/core";
import { useEffect, useState } from "react";
import { useAppLanguage } from "@/lib/language";

type InstallPrompt = Event & {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export function WebAppInstall() {
  const { t } = useAppLanguage();
  const [platform, setPlatform] = useState<"ios" | "other" | null>(null);
  const [prompt, setPrompt] = useState<InstallPrompt | null>(null);
  const [installing, setInstalling] = useState(false);
  useEffect(() => {
    if (Capacitor.isNativePlatform()) return;
    const standalone = window.matchMedia("(display-mode: standalone)");
    const update = () => setPlatform(standalone.matches || (navigator as Navigator & { standalone?: boolean }).standalone
      ? null : /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1) ? "ios" : "other");
    const capture = (event: Event) => { event.preventDefault(); setPrompt(event as InstallPrompt); };
    const installed = () => { setPlatform(null); setPrompt(null); };
    update();
    window.addEventListener("beforeinstallprompt", capture);
    window.addEventListener("appinstalled", installed);
    standalone.addEventListener("change", update);
    return () => {
      window.removeEventListener("beforeinstallprompt", capture);
      window.removeEventListener("appinstalled", installed);
      standalone.removeEventListener("change", update);
    };
  }, []);
  async function install() {
    if (!prompt || installing) return;
    setInstalling(true);
    try {
      await prompt.prompt();
      if ((await prompt.userChoice).outcome === "accepted") setPlatform(null);
    } finally { setPrompt(null); setInstalling(false); }
  }
  if (!platform) return null;
  return <section className="mt-4 rounded-2xl border border-border bg-card p-4">
    <details>
      <summary className="cursor-pointer font-extrabold text-primary">{t("Aggiungi Safe Scan alla Home")}</summary>
      <p className="mt-3 text-sm text-muted-foreground">{t("Apri l’app dalla sua icona, senza passare dagli store.")}</p>
      <p className="mt-2 text-sm">{platform === "ios"
        ? t("Su iPhone: apri questo sito in Safari, tocca Condividi, poi Aggiungi alla schermata Home e Aggiungi.")
        : t("Nel menu del browser scegli Installa app oppure Aggiungi alla schermata Home.")}</p>
      <p className="mt-2 text-sm text-muted-foreground">{t("Per cercare prodotti e usare Alexa serve una connessione Internet. I profili salvati nell’app precedente non vengono trasferiti automaticamente.")}</p>
    </details>
    {prompt && <button type="button" disabled={installing} onClick={() => { void install().catch(() => undefined); }} className="mt-3 rounded-xl bg-primary px-4 py-3 font-bold text-primary-foreground disabled:opacity-50">{t("Installa app")}</button>}
  </section>;
}
