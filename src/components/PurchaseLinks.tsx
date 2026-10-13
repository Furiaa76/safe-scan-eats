import { Link } from "@tanstack/react-router";
import { useAppLanguage } from "@/lib/language";
import { onlinePurchaseUrl, usePurchaseLocation } from "@/lib/purchase";
export function PurchaseLinks({
  query,
  exactProduct = false,
  onlineLabel = "Cerca online",
  productCode,
  from,
}: {
  query: string;
  exactProduct?: boolean;
  onlineLabel?: string;
  productCode?: string;
  from?: "recipes" | "shopping";
}) {
  const { t, language } = useAppLanguage();
  const location = usePurchaseLocation();
  return (
    <div className="mt-3 space-y-3">
      <div className="flex flex-wrap gap-2">
        <a
          href={onlinePurchaseUrl(query, location, language, exactProduct)}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-xl bg-primary px-4 py-3 text-sm font-extrabold text-primary-foreground"
        >
          {t(onlineLabel)}
        </a>
        <Link
          to="/search"
          search={{
            q: query.slice(0, 120),
            buy: true,
            local: true,
            ...(productCode ? { code: productCode } : {}),
            ...(from ? { from } : {}),
          }}
          className="rounded-xl bg-secondary px-4 py-3 text-sm font-extrabold text-secondary-foreground"
        >
          {t("Cerca supermercati")}
        </Link>
      </div>
      <p className="text-xs text-muted-foreground">
        {t(
          "Nei supermercati della zona mostriamo solo disponibilità confermate del prodotto nel punto vendita.",
        )}
      </p>
    </div>
  );
}
