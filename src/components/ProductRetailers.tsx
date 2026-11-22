import { useQuery } from "@tanstack/react-query";
import { Store } from "lucide-react";
import { useAppLanguage } from "@/lib/language";
import type { FoodProduct } from "@/lib/off";
import { matchesShoppingMarket, prioritizeShoppingMarkets, selectedShoppingMarkets } from "@/lib/shopping-organization";
import {
  productRetailers,
  type ProductRetailer,
} from "@/lib/product-retailers";
import {
  onlinePurchaseUrl,
  productPurchaseQuery,
  usePurchaseLocation,
} from "@/lib/purchase";

export function ProductRetailers({
  product,
  query,
  market,
}: {
  product: FoodProduct;
  query?: string;
  market?: string | undefined;
}) {
  const { t, language } = useAppLanguage();
  const location = usePurchaseLocation();
  const catalogue = useQuery({
    queryKey: [
      "online-retailers",
      product.code,
      location.country,
      query ?? product.name,
    ],
    enabled:
      product.source !== "manual" &&
      location.country === "it" &&
      /^\d{8,14}$/.test(product.code),
    queryFn: async (): Promise<ProductRetailer[]> => {
      try {
        const response = await fetch(
          `/api/online-retailers?code=${encodeURIComponent(product.code)}&country=${location.country}&q=${encodeURIComponent(query ?? product.name)}`,
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
  const retailers = Array.from(
    new Map(
      [
        ...productRetailers(product, location),
        ...(product.source !== "manual" && location.country === "it"
          ? (catalogue.data ?? [])
          : []),
      ].map((retailer) => [retailer.name, retailer]),
    ).values(),
  );
  const preferred = selectedShoppingMarkets(market);
  const entries = prioritizeShoppingMarkets([
    ...retailers.map((retailer) => ({ name: retailer.name, retailer })),
    ...preferred.filter((name) => !retailers.some((retailer) => matchesShoppingMarket(retailer.name, name)))
      .map((name) => ({ name, retailer: null })),
  ], preferred, (entry) => entry.name);

  const availabilityLink = (name?: string) => (
    <a
      key={name ?? "unknown-retailer"}
      href={onlinePurchaseUrl(productPurchaseQuery(product), location, language, true, name)}
      target="_blank"
      rel="noopener noreferrer"
      className="text-[11px] font-normal text-muted-foreground underline"
    >
      {name ? `${t("Disponibilità da verificare presso")} ${name}` : t("Nessun venditore verificato nel Paese scelto")}
      {location.city.trim() ? ` · ${t("cerca a")} ${location.city.trim()}` : ""}
    </a>
  );

  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      {entries.length ? (
        entries.map(({ name, retailer }) => retailer ? (
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
        ) : availabilityLink(name))
      ) : availabilityLink()}
    </span>
  );
}
