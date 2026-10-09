import { useAppLanguage } from "@/lib/language";
import { onlinePurchaseUrl, shopMapUrl, usePurchaseLocation } from "@/lib/purchase";

export function PurchaseLinks({ query, stores = [] }: { query: string; stores?: string[] }) {
  const { t, language } = useAppLanguage();
  const location = usePurchaseLocation();
  return <div className="mt-3 space-y-3">
    {stores.length > 0 && <div>
      <p className="text-xs font-bold text-muted-foreground">{t("Negozi segnalati nel database")}</p>
      <div className="mt-2 flex flex-wrap gap-2">{stores.map((store) => <a key={store} href={shopMapUrl(store, location)} target="_blank" rel="noopener noreferrer"
        className="rounded-full bg-secondary px-3 py-2 text-xs font-bold text-secondary-foreground">📍 {store}</a>)}</div>
      <p className="mt-2 text-xs text-muted-foreground">{t("La segnalazione non conferma la disponibilità nella singola sede. Contatta il negozio prima di andare.")}</p>
    </div>}
    <div className="flex flex-wrap gap-2">
      <a href={onlinePurchaseUrl(query, location, language)} target="_blank" rel="noopener noreferrer"
        className="rounded-xl bg-primary px-4 py-3 text-sm font-extrabold text-primary-foreground">{t("Cerca online")}</a>
    </div>
  </div>;
}
