import { useAppLanguage } from "@/lib/language";
import { onlinePurchaseUrl, shopMapUrl, usePurchaseLocation } from "@/lib/purchase";

export function PurchaseLinks({ query, exactProduct = false, onlineLabel = "Cerca online" }: { query: string; exactProduct?: boolean; onlineLabel?: string }) {
  const { t, language } = useAppLanguage();
  const location = usePurchaseLocation();
  return <div className="mt-3 space-y-3">
    <div className="flex flex-wrap gap-2">
      <a href={onlinePurchaseUrl(query, location, language, exactProduct)} target="_blank" rel="noopener noreferrer"
        className="rounded-xl bg-primary px-4 py-3 text-sm font-extrabold text-primary-foreground">{t(onlineLabel)}</a>
      <a href={shopMapUrl(undefined, location)} target="_blank" rel="noopener noreferrer"
        className="rounded-xl bg-secondary px-4 py-3 text-sm font-extrabold text-secondary-foreground">{t("Cerca supermercati")}</a>
    </div>
    <p className="text-xs text-muted-foreground">{t("La mappa mostra i supermercati della zona, senza confermare che vendano questo prodotto.")}</p>
  </div>;
}
