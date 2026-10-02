import type { AllergenId } from "./allergens";
import { allergenById } from "./allergens";
import type { FoodProduct } from "./off";

export type Verdict = "compatible" | "warning" | "avoid";

export interface Reason {
  level: "avoid" | "warning" | "info";
  text: string;
}

export interface Analysis {
  verdict: Verdict;
  reasons: Reason[];
  incomplete: boolean;
}

const OFF_TAGS: Record<AllergenId, string[]> = {
  glutine: ["en:gluten"],
  // Open Food Facts espone soprattutto l'allergene latte, non il lattosio:
  // per il lattosio usiamo una logica dedicata più sotto.
  lattosio: [],
  arachidi: ["en:peanuts"],
  "frutta-guscio": ["en:nuts"],
  uova: ["en:eggs"],
  soia: ["en:soybeans"],
  pesce: ["en:fish"],
  crostacei: ["en:crustaceans"],
  sesamo: ["en:sesame-seeds"],
  "polline-betulla": [],
  "polline-graminacee": [],
  "polline-ambrosia": [],
  "polline-artemisia-asteracee": [],
};

const FREE_LABELS: Partial<Record<AllergenId, string[]>> = {
  glutine: ["en:no-gluten", "en:gluten-free"],
  lattosio: ["en:no-lactose", "en:lactose-free"],
};

const FALSE_FRIENDS = [
  "burro di cacao",
  "latte di cocco",
  "latte di mandorla",
  "latte di soia",
  "latte di riso",
  "latte di avena",
  "senza glutine",
  "senza lattosio",
  "noce moscata",
  "noce di cocco",
];

const EN_KEYWORDS: Record<AllergenId, string[]> = {
  glutine: ["gluten", "wheat", "barley", "rye", "oats", "spelt"],
  lattosio: ["lactose", "whey powder", "milk powder", "buttermilk"],
  arachidi: ["peanut"],
  "frutta-guscio": ["almond", "hazelnut", "walnut", "cashew", "pistachio", "pecan"],
  uova: ["egg"],
  soia: ["soy", "soja"],
  pesce: ["fish", "anchov", "tuna", "salmon"],
  crostacei: ["shrimp", "prawn", "crab", "lobster", "crustacean"],
  sesamo: ["sesame"],
  "polline-betulla": [],
  "polline-graminacee": [],
  "polline-ambrosia": [],
  "polline-artemisia-asteracee": [],
};

const DAIRY_WORDS = [
  "latte",
  "burro",
  "panna",
  "formaggio",
  "yogurt",
  "mascarpone",
  "ricotta",
  "mozzarella",
  "cream",
  "butter",
  "cheese",
  "milk",
  "yoghurt",
  "yogurt",
];

function cleanText(t: string) {
  let s = t.toLowerCase();
  for (const f of FALSE_FRIENDS) s = s.split(f).join(" ");
  return s;
}

function splitTraces(text: string): { main: string; traces: string } {
  const m = text.match(/(pu[oò] contenere|tracce di|may contain|traces? of)/i);
  if (!m || m.index === undefined) return { main: text, traces: "" };
  return { main: text.slice(0, m.index), traces: text.slice(m.index) };
}

function keywordHit(text: string, a: AllergenId): string | null {
  const words = [...allergenById(a).keywords, ...EN_KEYWORDS[a]];
  for (const kw of words) {
    const re = new RegExp(`(^|[^a-zàèéìòù])${kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`, "i");
    if (re.test(text)) return kw;
  }
  return null;
}

function dairyHit(text: string): string | null {
  for (const kw of DAIRY_WORDS) {
    const re = new RegExp(`(^|[^a-zàèéìòù])${kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`, "i");
    if (re.test(text)) return kw;
  }
  return null;
}

const lower = (a: AllergenId) => allergenById(a).label.toLowerCase();

function customAllergenHit(text: string, rawTerm: string): boolean {
  const term = rawTerm.trim().toLocaleLowerCase("it-IT");
  if (term.length < 2) return false;
  const escaped = term.replace(/[.*+?^$()|[\]\\{}]/g, "\\export function analyzeFood(p: FoodProduct, userAllergens: AllergenId[]): Analysis {");
  return new RegExp(`(^|[^a-zàèéìòù])${escaped}([^a-zàèéìòù]|$)`, "i").test(text);
}

export function analyzeFood(p: FoodProduct, userAllergens: AllergenId[], customAllergens: string[] = []): Analysis {
  const reasons: Reason[] = [];
  const text = cleanText(p.ingredientsText);
  const { main, traces } = splitTraces(text);
  const hasIngredients = p.ingredientsText.trim().length > 3;
  const hasTags = p.allergenTags.length > 0 || p.traceTags.length > 0;

  let avoid = false;
  let warn = false;

  for (const a of userAllergens) {
    const allergen = allergenById(a);

    if (allergen.group === "pollen") {
      const crossKw = keywordHit(main, a);
      if (crossKw) {
        warn = true;
        reasons.push({
          level: "warning",
          text: `Possibile reattività crociata: hai indicato allergia a ${allergen.label} e il prodotto contiene ${crossKw}. Non significa automaticamente allergia a questo alimento: se hai già avuto reazioni, verifica con allergologo/medico.`,
        });
      }
      continue;
    }

    const freeLabel = (FREE_LABELS[a] ?? []).some((l) => p.labelTags.includes(l));

    if (a === "lattosio") {
      const lactoseKw = keywordHit(main, a);
      const dairyKw = dairyHit(main);
      const milkDeclared = p.allergenTags.includes("en:milk");
      const milkTrace = p.traceTags.includes("en:milk") || !!dairyHit(traces) || !!keywordHit(traces, a);

      if (freeLabel) {
        reasons.push({ level: "info", text: "Etichetta \"senza lattosio\" dichiarata dal produttore" });
        if (milkTrace) {
          warn = true;
          reasons.push({ level: "warning", text: "Può contenere tracce di latte: verifica l'etichetta se sei molto sensibile" });
        }
        continue;
      }

      if (lactoseKw) {
        avoid = true;
        reasons.push({ level: "avoid", text: `Contiene ${lactoseKw} (lattosio)` });
      } else if (dairyKw || milkDeclared) {
        warn = true;
        reasons.push({ level: "warning", text: dairyKw ? `Contiene ${dairyKw}: può contenere lattosio` : "Contiene latte: la presenza di lattosio va verificata sull'etichetta" });
      } else if (milkTrace) {
        warn = true;
        reasons.push({ level: "warning", text: "Può contenere tracce di latte/lattosio" });
      }
      continue;
    }

    const tagHit = OFF_TAGS[a].some((t) => p.allergenTags.includes(t));
    const kw = keywordHit(main, a);
    const traceHit = OFF_TAGS[a].some((t) => p.traceTags.includes(t)) || !!keywordHit(traces, a);

    if (freeLabel) {
      reasons.push({ level: "info", text: `Etichetta \"senza ${lower(a)}\" dichiarata dal produttore` });
      if (traceHit) {
        warn = true;
        reasons.push({ level: "warning", text: `Può contenere tracce di ${lower(a)}` });
      }
      continue;
    }

    if (tagHit || kw) {
      avoid = true;
      reasons.push({ level: "avoid", text: kw ? `Contiene ${kw} (${lower(a)})` : `Contiene ${lower(a)} (allergene dichiarato)` });
    } else if (traceHit) {
      warn = true;
      reasons.push({ level: "warning", text: `Può contenere tracce di ${lower(a)}` });
    }
  }

  for (const rawTerm of customAllergens) {
    const term = rawTerm.trim();
    if (!term) continue;

    if (customAllergenHit(main, term)) {
      avoid = true;
      reasons.push({
        level: "avoid",
        text: `Contiene ${term}, che hai indicato manualmente come sostanza/allergia da evitare`,
      });
    } else if (customAllergenHit(traces, term)) {
      warn = true;
      reasons.push({
        level: "warning",
        text: `Può contenere tracce di ${term}, che hai indicato manualmente nel profilo`,
      });
    }
  }

  const incomplete = !hasIngredients;
  if (incomplete) {
    warn = true;
    reasons.push({
      level: "warning",
      text: hasTags ? "Lista ingredienti non disponibile: l'analisi usa solo gli allergeni dichiarati" : "Dati incompleti: ingredienti e allergeni non disponibili",
    });
  }

  if (userAllergens.length === 0 && customAllergens.length === 0) {
    reasons.push({ level: "info", text: "Non hai selezionato allergeni nel tuo profilo" });
  }

  const verdict: Verdict = avoid ? "avoid" : warn ? "warning" : "compatible";
  return { verdict, reasons, incomplete };
}

export const VERDICT_LABEL: Record<Verdict, string> = {
  compatible: "Compatibile",
  warning: "Attenzione",
  avoid: "Da evitare",
};