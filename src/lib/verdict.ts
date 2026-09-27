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
  lattosio: ["en:milk"],
  arachidi: ["en:peanuts"],
  "frutta-guscio": ["en:nuts"],
  uova: ["en:eggs"],
  soia: ["en:soybeans"],
  pesce: ["en:fish"],
  crostacei: ["en:crustaceans"],
  sesamo: ["en:sesame-seeds"],
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
  lattosio: ["milk", "lactose", "butter", "cream", "whey", "cheese"],
  arachidi: ["peanut"],
  "frutta-guscio": ["almond", "hazelnut", "walnut", "cashew", "pistachio", "pecan"],
  uova: ["egg"],
  soia: ["soy", "soja"],
  pesce: ["fish", "anchov", "tuna", "salmon"],
  crostacei: ["shrimp", "prawn", "crab", "lobster", "crustacean"],
  sesamo: ["sesame"],
};

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

const lower = (a: AllergenId) => allergenById(a).label.toLowerCase();

export function analyzeFood(p: FoodProduct, userAllergens: AllergenId[]): Analysis {
  const reasons: Reason[] = [];
  const text = cleanText(p.ingredientsText);
  const { main, traces } = splitTraces(text);
  const hasIngredients = p.ingredientsText.trim().length > 3;
  const hasTags = p.allergenTags.length > 0 || p.traceTags.length > 0;

  let avoid = false;
  let warn = false;

  for (const a of userAllergens) {
    const freeLabel = (FREE_LABELS[a] ?? []).some((l) => p.labelTags.includes(l));
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

  const incomplete = !hasIngredients;
  if (incomplete) {
    warn = true;
    reasons.push({
      level: "warning",
      text: hasTags ? "Lista ingredienti non disponibile: l'analisi usa solo gli allergeni dichiarati" : "Dati incompleti: ingredienti e allergeni non disponibili",
    });
  }

  if (userAllergens.length === 0) {
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