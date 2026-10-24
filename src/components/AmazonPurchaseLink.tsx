import { useEffect, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { amazonAffiliateSearchUrl } from "@/lib/amazon-affiliate";
import { useAppLanguage } from "@/lib/language";

export function AmazonPurchaseLink({ query, country }: { query: string; country: string }) {
  const { language } = useAppLanguage();
  const [isWeb, setIsWeb] = useState(false);
  useEffect(() => { setIsWeb(!Capacitor.isNativePlatform()); }, []);
  const href = amazonAffiliateSearchUrl(query, country, !isWeb);
  if (!href) return null;
  const en = language === "en";

  return (
    <div className="space-y-2 rounded-xl border border-border bg-card p-3">
      <a
        href={href}
        target="_blank"
        rel="sponsored noopener"
        referrerPolicy="strict-origin-when-cross-origin"
        className="inline-flex min-h-11 items-center rounded-xl bg-secondary px-4 py-3 text-sm font-extrabold text-secondary-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        {en ? "Search Amazon.it · affiliate link" : "Cerca su Amazon.it · link affiliato"}
        <span className="sr-only">{en ? " (opens a new tab)" : " (si apre in una nuova scheda)"}</span>
      </a>
      <p className="text-xs leading-relaxed text-muted-foreground">
        {en
          ? "As an Amazon Associate I earn from qualifying purchases."
          : "In qualità di Affiliato Amazon io ricevo un guadagno dagli acquisti idonei."}
      </p>
      <p className="text-xs leading-relaxed text-muted-foreground">
        {en
          ? "Opens search results on Amazon.it. Availability and suitability are not confirmed: check the exact product, ingredients and allergen information before buying."
          : "Apre risultati di ricerca su Amazon.it. Disponibilità e compatibilità non sono confermate: verifica il prodotto esatto, gli ingredienti e gli allergeni prima di acquistare."}
      </p>
    </div>
  );
}
