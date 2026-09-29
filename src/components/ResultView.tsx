import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  CheckCircle2,
  CircleX,
  Info,
  Package,
  RotateCcw,
  ShieldAlert,
  TriangleAlert,
} from "lucide-react";
import { productsInCategory, type FoodProduct } from "@/lib/off";
import { analyzeFood, VERDICT_LABEL, type Analysis, type Verdict } from "@/lib/verdict";
import { ALLERGENS, type AllergenId } from "@/lib/allergens";
import { useProfilesState, type Profile } from "@/lib/store";
import { assessSsnCeliac } from "@/lib/ssn";

const VERDICT_STYLE: Record<
  Verdict,
  { bg: string; fg: string; Icon: typeof CheckCircle2; subtitle: string }
> = {
  compatible: {
    bg: "bg-safe",
    fg: "text-safe-foreground",
    Icon: CheckCircle2,
    subtitle: "Non abbiamo trovato i tuoi allergeni in questo prodotto.",
  },
  warning: {
    bg: "bg-caution",
    fg: "text-caution-foreground",
    Icon: TriangleAlert,
    subtitle: "Ci sono dubbi o dati mancanti. Controlla bene l'etichetta.",
  },
  avoid: {
    bg: "bg-danger",
    fg: "text-danger-foreground",
    Icon: CircleX,
    subtitle: "Questo prodotto contiene qualcosa che devi evitare.",
  },
};

const NUTRI_LABEL: Record<string, string> = { a: "A", b: "B", c: "C", d: "D", e: "E" };

const TAG_LABELS: Array<[RegExp, string]> = [
  [/gluten/i, "Glutine"],
  [/milk|lait|latte/i, "Latte"],
  [/egg|oeuf|uov/i, "Uova"],
  [/peanut|arachid/i, "Arachidi"],
  [/tree[- ]?nut|nuts|frutta-a-guscio/i, "Frutta a guscio"],
  [/soy|soia/i, "Soia"],
  [/fish|pesce/i, "Pesce"],
  [/crustacean|crostace/i, "Crostacei"],
  [/sesame|sesamo/i, "Sesamo"],
];

function freeModeFindings(product: FoodProduct) {
  const found = new Set<string>();
  const tags = [...product.allergenTags, ...product.traceTags].join(" ");
  for (const [pattern, label] of TAG_LABELS) if (pattern.test(tags)) found.add(label);

  const ingredients = product.ingredientsText.toLocaleLowerCase("it");
  for (const allergen of ALLERGENS) {
    if (allergen.keywords.some((keyword) => ingredients.includes(keyword.toLocaleLowerCase("it")))) found.add(allergen.label);
  }
  return Array.from(found);
}

export function ResultView({
  product,
  analysis,
  profile,
}: {
  product: FoodProduct;
  analysis: Analysis;
  profile: Profile | null;
}) {
  const { freeMode } = useProfilesState();
  const style = VERDICT_STYLE[analysis.verdict];
  const allergens = profile?.allergens ?? [];
  const findings = freeMode ? freeModeFindings(product) : [];
  const shouldSuggestAlternatives = product.source === "off" && !!product.categoryTag && allergens.length > 0 && analysis.verdict !== "compatible";
  const shouldAskForFrontPhoto = !freeMode && analysis.verdict === "warning" && analysis.incomplete;
  const ssn = assessSsnCeliac(product);

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col pb-10">
      <div className={`${freeMode ? "bg-secondary text-secondary-foreground" : `${style.bg} ${style.fg}`} px-5 pb-8 pt-6`}>
        <header className="flex items-center gap-3">
          <Link to="/" aria-label="Torna alla home" className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-current/10">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <p className="truncate text-sm font-bold opacity-90">Risultato analisi</p>
        </header>
        <div className="mt-6 flex flex-col items-center text-center">
          {freeMode ? <Info className="h-20 w-20" strokeWidth={1.5} /> : <style.Icon className="h-20 w-20" strokeWidth={1.5} />}
          <h1 className="mt-3 text-3xl font-black uppercase tracking-wide">{freeMode ? "Informazioni prodotto" : VERDICT_LABEL[analysis.verdict]}</h1>
          <p className="mt-2 max-w-[300px] text-sm font-semibold opacity-90">{freeMode ? "Modalità libera: nessun profilo applicato. Ti mostro cosa è stato rilevato senza stabilire se il prodotto è adatto a una persona specifica." : style.subtitle}</p>
        </div>
      </div>

      <div className="px-5">
        <div className="-mt-4 flex items-center gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm">
          {product.imageUrl ? (
            <img src={product.imageUrl} alt={product.name} className="h-14 w-14 shrink-0 rounded-xl bg-secondary object-contain" />
          ) : (
            <div className="grid h-14 w-14 shrink-0 place-items-center rounded-xl bg-secondary"><Package className="h-6 w-6 text-primary" /></div>
          )}
          <div className="min-w-0 flex-1">
            <p className="line-clamp-2 text-base font-extrabold text-foreground">{product.name}</p>
            <p className="truncate text-xs text-muted-foreground">{[product.brand, product.code].filter(Boolean).join(" · ")}</p>
          </div>
          {product.nutritionGrade && (
            <div className="shrink-0 text-center">
              <p className="text-[10px] font-bold uppercase text-muted-foreground">Nutri-Score</p>
              <p className="text-xl font-black text-foreground">{NUTRI_LABEL[product.nutritionGrade]}</p>
            </div>
          )}
        </div>

        {freeMode && (
          <section className="mt-5">
            <h2 className="text-base font-extrabold text-foreground">Allergeni e intolleranze rilevati</h2>
            {findings.length > 0 ? <div className="mt-2 flex flex-wrap gap-2">{findings.map((label) => <span key={label} className="rounded-full bg-caution-soft px-3 py-2 text-sm font-bold text-caution-foreground">{label}</span>)}</div> : <p className="mt-2 rounded-2xl bg-muted p-4 text-sm leading-relaxed text-foreground">Non risultano allergeni riconosciuti dai dati disponibili. Questo non garantisce l'assenza: controlla sempre l'etichetta.</p>}
            {product.traceTags.length > 0 && <p className="mt-2 text-xs font-semibold text-muted-foreground">Sono presenti anche indicazioni di possibili tracce: verifica l'etichetta del prodotto.</p>}
          </section>
        )}

        {!freeMode && analysis.reasons.length > 0 && (
          <section className="mt-5">
            <h2 className="text-base font-extrabold text-foreground">Perché?</h2>
            <div className="mt-2 flex flex-col gap-2">
              {analysis.reasons.map((r, i) => {
                const cfg = r.level === "avoid" ? { cls: "bg-danger-soft text-danger", Icon: CircleX } : r.level === "warning" ? { cls: "bg-caution-soft text-caution-foreground", Icon: TriangleAlert } : { cls: "bg-muted text-foreground", Icon: Info };
                return <div key={i} className={`flex items-start gap-3 rounded-2xl p-3.5 ${cfg.cls}`}><cfg.Icon className="mt-0.5 h-5 w-5 shrink-0" /><p className="text-sm font-bold">{r.text}</p></div>;
              })}
            </div>
          </section>
        )}

        {shouldAskForFrontPhoto && (
          <section className="mt-5 rounded-2xl border border-caution/40 bg-caution-soft p-4">
            <h2 className="text-base font-extrabold text-caution-foreground">Dati non sufficienti</h2>
            <p className="mt-1 text-sm leading-relaxed text-caution-foreground">Per ridurre i dubbi, fotografa il fronte della confezione. L'app proverà a riconoscere dichiarazioni visibili come “senza glutine” o “senza lattosio”.</p>
            <Link
              to="/ingredients"
              search={{ code: product.code || undefined, name: product.name || undefined, brand: product.brand || undefined, image: product.imageUrl }}
              className="mt-3 flex w-full items-center justify-center rounded-2xl bg-primary px-4 py-3.5 text-base font-extrabold text-primary-foreground"
            >
              Fai una foto del fronte
            </Link>
          </section>
        )}



        <section className="mt-5 rounded-2xl border border-border bg-card p-4">
          <div className="flex items-start gap-3">
            {ssn.status === "yes" ? <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0 text-safe" /> : <Info className="mt-0.5 h-6 w-6 shrink-0 text-primary" />}
            <div className="min-w-0 flex-1">
              <h2 className="text-base font-extrabold text-foreground">Celiachia · Servizio Sanitario Nazionale</h2>
              <p className={`mt-1 text-sm font-extrabold ${ssn.status === "yes" ? "text-safe" : "text-foreground"}`}>{ssn.status === "yes" ? "EROGABILE SSN: SÌ" : "STATO SSN: DA VERIFICARE"}</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{ssn.detail}</p>
              <a
                href="https://www.salute.gov.it/new/it/tema/alimenti-fini-medici-speciali-ed-integratori/registro-nazionale-alimenti-fini-medici-speciali/"
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-flex rounded-xl bg-secondary px-3 py-2 text-xs font-extrabold text-secondary-foreground"
              >
                Apri Registro ufficiale
              </a>
            </div>
          </div>
        </section>

        <section className="mt-5">
          <h2 className="text-base font-extrabold text-foreground">Ingredienti</h2>
          <p className="mt-2 rounded-2xl bg-muted p-4 text-sm leading-relaxed text-foreground">{product.ingredientsText || "Lista ingredienti non disponibile."}</p>
        </section>

        {shouldSuggestAlternatives && <Alternatives product={product} allergens={allergens} />}
        {product.source === "off" && <p className="mt-4 text-center text-[11px] text-muted-foreground">Dati prodotto: Open Food Facts</p>}

        <Link to="/scan" search={{ mode: "barcode" }} className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-4 text-lg font-extrabold text-primary-foreground"><RotateCcw className="h-5 w-5" />Scansiona un altro prodotto</Link>
        <Disclaimer severe={!!profile?.severe} />
      </div>
    </div>
  );
}

function Alternatives({ product, allergens }: { product: FoodProduct; allergens: AllergenId[] }) {
  const { data, isFetching } = useQuery({
    queryKey: ["alternatives", product.categoryTag, allergens.join(",")],
    queryFn: async () => {
      const list = await productsInCategory(product.categoryTag!);
      return list
        .filter((p) => p.code !== product.code && p.ingredientsText.trim().length > 3)
        .map((p) => ({ product: p, analysis: analyzeFood(p, allergens) }))
        .filter(({ analysis }) => analysis.verdict === "compatible" && !analysis.incomplete)
        .map(({ product }) => product)
        .slice(0, 3);
    },
    staleTime: 1000 * 60 * 30,
    retry: false,
  });

  if (isFetching && !data) {
    return <section className="mt-5"><h2 className="text-base font-extrabold text-foreground">Cerco alternative compatibili…</h2></section>;
  }
  if (!data || data.length === 0) return null;

  return (
    <section className="mt-5">
      <h2 className="text-base font-extrabold text-foreground">Alternative compatibili per te</h2>
      <p className="mt-1 text-xs text-muted-foreground">Suggerimenti della stessa categoria con dati ingredienti completi. Verifica comunque sempre l'etichetta.</p>
      <div className="mt-2 flex flex-col gap-2">
        {data.map((alt) => (
          <Link key={alt.code} to="/product/$code" params={{ code: alt.code }} className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3.5 transition-colors active:bg-secondary">
            {alt.imageUrl ? <img src={alt.imageUrl} alt="" className="h-10 w-10 shrink-0 rounded-xl object-contain" /> : <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-safe-soft"><CheckCircle2 className="h-5 w-5 text-safe" /></div>}
            <div className="min-w-0 flex-1"><p className="truncate text-sm font-bold text-foreground">{alt.name}</p><p className="truncate text-xs text-muted-foreground">{alt.brand}</p></div>
          </Link>
        ))}
      </div>
    </section>
  );
}

export function Disclaimer({ severe }: { severe: boolean }) {
  return (
    <div className="mt-6 rounded-2xl border border-caution/40 bg-caution-soft p-4">
      <div className="flex items-start gap-3">
        <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-caution-foreground" />
        <p className="text-sm leading-relaxed text-caution-foreground">SafeFood Scan è uno strumento informativo e <strong>non sostituisce il parere medico</strong>. I dati possono essere incompleti o non aggiornati: verifica sempre l'etichetta.{severe && <> <strong>Hai indicato allergie gravi: controlla l'etichetta e contatta il produttore.</strong></>}</p>
      </div>
    </div>
  );
}