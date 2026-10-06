import { useAppLanguage, setAppLanguage } from "@/lib/language";

export function LanguageSelector() {
  const { language } = useAppLanguage();
  return <div className="mt-5 flex items-center justify-between gap-3 rounded-2xl border border-border bg-card px-4 py-3">
    <span className="text-sm font-extrabold text-foreground">Lingua / Language</span>
    <div className="flex gap-1" role="group" aria-label="Lingua dell’app / App language">
      {(["it", "en"] as const).map((code) => <button key={code} type="button" lang={code}
        aria-pressed={language === code} onClick={() => setAppLanguage(code)}
        className={`rounded-full px-3 py-2 text-sm font-bold ${language === code ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}>
        {code === "it" ? "Italiano" : "English"}
      </button>)}
    </div>
  </div>;
}
