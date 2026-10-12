import { Store } from "lucide-react";
import { useAppLanguage } from "@/lib/language";
import type { FoodProduct } from "@/lib/off";
import { productRetailers } from "@/lib/product-retailers";
import { usePurchaseLocation } from "@/lib/purchase";

export function ProductRetailers({ product }: { product: FoodProduct }) {
  const { t } = useAppLanguage();
  const location = usePurchaseLocation();
  const retailers = productRetailers(product, location);
  return <span className="inline-flex flex-wrap items-center gap-1.5">
    {retailers.length ? retailers.map((retailer) => <span key={retailer.name} className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-bold ${retailer.verified ? "bg-secondary text-secondary-foreground" : "bg-muted text-muted-foreground"}`}
      title={retailer.verified ? `${t("Scheda venditore verificata il 12/10/2026. Ricontrolla la disponibilità.")}${retailer.pickup ? ` ${retailer.pickup}` : ""}` : t("Venditore segnalato nel catalogo: disponibilità e zona da verificare.")}>
      <Store aria-hidden="true" className="h-3 w-3 shrink-0" />{retailer.name}
      <span className="font-normal">· {t(retailer.verified ? "verificato" : "segnalato")}</span>
    </span>) : <span className="text-[11px] font-normal text-muted-foreground">{t("Supermercato da verificare")}</span>}
  </span>;
}
