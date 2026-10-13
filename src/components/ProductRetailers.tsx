import { useQuery } from "@tanstack/react-query";
import { Store } from "lucide-react";
import { useAppLanguage } from "@/lib/language";
import type { FoodProduct } from "@/lib/off";
import {
  productRetailers,
  type ProductRetailer,
} from "@/lib/product-retailers";
import {
  onlinePurchaseUrl,
  productPurchaseQuery,
  usePurchaseLocation,
} from "@/lib/purchase";

export function ProductRetailers({ product }: { product: FoodProduct }) {
  const { t, language } = useAppLanguage();
  const location = usePurchaseLocation();
  const catalogue = useQuery({
    queryKey: ["online-retailers", product.code, location.country],
    enabled:
      product.source !== "manual" &&
      location.country === "it" &&
      /^\d{8,14}$/.test(product.code),
    queryFn: async (): Promise<ProductRetailer[]> => {
      try {
        const response = await fetch(
          `/api/online-retailers?code=${encodeURIComponent(product.code)}&country=${location.country}`,
        );
        if (!response.ok) return [];
        const data = await response.json();
        return Array.isArray(data.offers) ? data.offers : [];
      } catch {
        return [];
      }
    },
    staleTime: 60_000,
    retry: false,
  });
  const retailers = [
    ...productRetailers(product, location),
    ...(product.source !== "manual" && location.country === "it"
      ? (catalogue.data ?? [])
      : []),
  ];
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      {retailers.length ? (
        retailers.map((retailer) => (
          <a
            href={retailer.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            key={retailer.name}
            className="inline-flex items-center gap-1 rounded-lg bg-secondary px-2 py-1 text-[11px] font-bold text-secondary-foreground"
            title={
              retailer.verified
                ? `${t("Scheda online controllata")}: ${new Date(retailer.checkedAt).toLocaleDateString(language)}. ${t("Disponibilità locale da verificare")}`
                : t(
                    "Venditore segnalato nel catalogo: disponibilità e zona da verificare.",
                  )
            }
          >
            <Store aria-hidden="true" className="h-3 w-3 shrink-0" />
            {retailer.name}
            <span className="font-normal">
              · {t(retailer.verified ? "catalogo online" : "segnalato")}
            </span>
            <span className="font-normal">
              · {t("Disponibilità locale da verificare")}
            </span>
          </a>
        ))
      ) : (
        <a
          href={onlinePurchaseUrl(
            productPurchaseQuery(product),
            location,
            language,
            true,
          )}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[11px] font-normal text-muted-foreground underline"
        >
          {t("Nessun venditore verificato nel Paese scelto")}
          {location.city.trim()
            ? ` · ${t("cerca a")} ${location.city.trim()}`
            : ""}
        </a>
      )}
    </span>
  );
}
