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
    </div>}
    <div className="flex flex-wrap gap-2">
      <a href={onlinePurchaseUrl(query, location, language)} target="_blank" rel="noopener noreferrer"
        className="rounded-xl bg-primary px-4 py-3 text-sm font-extrabold text-primary-foreground">{t("Cerca online")}</a>
      <a href={shopMapUrl(undefined, location)} target="_blank" rel="noopener noreferrer"
        className="rounded-xl border border-primary px-4 py-3 text-sm font-extrabold text-primary">{t("Supermercati sulla mappa")}</a>
    </div>
  </div>;
}
