import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import type { FoodProduct } from "@/lib/off";
import { analyzeFood } from "@/lib/verdict";
import { addToHistory, useProfile } from "@/lib/store";
import { loadFrontPhoto } from "@/lib/image";
import { ResultView } from "@/components/ResultView";

type AnalysisSearch = {
  text: string;
  code?: string | undefined;
  name?: string | undefined;
  brand?: string | undefined;
  image?: string | undefined;
  claims?: string | undefined;
};

export const Route = createFileRoute("/analysis")({
  validateSearch: (s: Record<string, unknown>): AnalysisSearch => ({
    text: typeof s["text"] === "string" ? (s["text"] as string) : "",
    code: typeof s["code"] === "string" ? (s["code"] as string) : undefined,
    name: typeof s["name"] === "string" ? (s["name"] as string) : undefined,
    brand: typeof s["brand"] === "string" ? (s["brand"] as string) : undefined,
    image: typeof s["image"] === "string" ? (s["image"] as string) : undefined,
    claims: typeof s["claims"] === "string" ? (s["claims"] as string) : undefined,
  }),
  head: () => ({ meta: [{ title: "Analisi ingredienti — SafeFood Scan" }, { name: "description", content: "Risultato dell'analisi degli ingredienti fotografati." }] }),
  component: AnalysisPage,
});

function claimsToLabelTags(claims?: string): string[] {
  if (!claims) return [];
  const values = claims.split("|").map((x) => x.trim().toLowerCase()).filter(Boolean);
  const tags = new Set<string>();
  for (const claim of values) {
    if (/senza\s+glutine|gluten[\s-]*free|no\s+gluten/.test(claim)) tags.add("en:gluten-free");
    if (/senza\s+lattosio|lactose[\s-]*free|no\s+lactose/.test(claim)) tags.add("en:lactose-free");
    if (/specificamente\s+formulat[oa]\s+per\s+celiac|erogabile\s+ssn|registro\s+nazionale|bollino\s+verde\s+ssn/.test(claim)) tags.add("it:ssn-erogabile-celiachia");
  }
  return Array.from(tags);
}

function AnalysisPage() {
  const { text, code, name, brand, image, claims } = Route.useSearch();
  const profile = useProfile();
  const [photo, setPhoto] = useState<string | undefined>(image);
  useEffect(() => { if (!image) setPhoto(loadFrontPhoto() ?? undefined); }, [image]);

  const labelTags = useMemo(() => claimsToLabelTags(claims), [claims]);
  const product: FoodProduct = useMemo(() => ({
    code: code ?? "",
    name: name || "Prodotto fotografato",
    brand: brand || "",
    imageUrl: photo,
    ingredientsText: text,
    allergenTags: [],
    traceTags: [],
    labelTags,
    source: "manual",
  }), [text, code, name, brand, photo, labelTags]);

  const base = analyzeFood(product, profile?.allergens ?? []);
  const sourceText = labelTags.length > 0
    ? "Valutazione basata sugli ingredienti letti dall'etichetta e sulle dichiarazioni esplicite rilevate sul fronte"
    : "Valutazione basata sugli ingredienti letti dall'etichetta";
  const analysis = { ...base, reasons: [...base.reasons, { level: "info" as const, text: sourceText }] };

  useEffect(() => {
    if (!text) return;
    addToHistory({ code, name: product.name, brand: product.brand, imageUrl: image, source: "manual", text, verdict: analysis.verdict, date: new Date().toISOString() });
  }, [text, analysis.verdict]);

  return <ResultView product={product} analysis={analysis} profile={profile} />;
}