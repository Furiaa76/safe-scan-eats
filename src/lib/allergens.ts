import {
  Wheat,
  Milk,
  Nut,
  Egg,
  Bean,
  Fish,
  Shell,
  type LucideIcon,
} from "lucide-react";

export type AllergenId =
  | "glutine"
  | "lattosio"
  | "arachidi"
  | "frutta-guscio"
  | "uova"
  | "soia"
  | "pesce"
  | "crostacei"
  | "sesamo"
  | "polline-betulla"
  | "polline-graminacee"
  | "polline-ambrosia"
  | "polline-artemisia-asteracee";

export interface Allergen {
  id: AllergenId;
  label: string;
  icon: LucideIcon;
  /** Parole chiave da cercare nella lista ingredienti */
  keywords: string[];
  /** I pollini/piante generano solo avvisi di possibile reattività crociata. */
  group?: "food" | "pollen";
}

export const ALLERGENS: Allergen[] = [
  {
    id: "glutine",
    label: "Glutine",
    icon: Wheat,
    keywords: ["glutine", "frumento", "grano", "farina di grano", "orzo", "segale", "avena", "malto", "kamut"],
  },
  {
    id: "lattosio",
    label: "Lattosio",
    icon: Milk,
    // Per il lattosio usiamo solo termini specifici. Gli ingredienti lattiero-caseari
    // vengono gestiti separatamente nel verdetto come possibile presenza di lattosio.
    keywords: ["lattosio", "lactose", "siero di latte", "siero di latte in polvere", "latte in polvere", "latticello", "whey powder", "milk powder", "buttermilk"],
  },
  {
    id: "arachidi",
    label: "Arachidi",
    icon: Nut,
    keywords: ["arachidi", "arachide", "burro di arachidi"],
  },
  {
    id: "frutta-guscio",
    label: "Frutta a guscio",
    icon: Nut,
    keywords: ["mandorle", "nocciole", "noci", "pistacchi", "anacardi", "noci pecan", "macadamia"],
  },
  {
    id: "uova",
    label: "Uova",
    icon: Egg,
    keywords: ["uovo", "uova", "albume", "tuorlo", "ovoprodotti"],
  },
  {
    id: "soia",
    label: "Soia",
    icon: Bean,
    keywords: ["soia", "lecitina di soia", "tofu", "edamame"],
  },
  {
    id: "pesce",
    label: "Pesce",
    icon: Fish,
    keywords: ["pesce", "acciughe", "sardine", "tonno", "salmone"],
  },
  {
    id: "crostacei",
    label: "Crostacei",
    icon: Shell,
    keywords: ["gamberi", "gamberetti", "scampi", "aragosta", "granchio"],
  },
  {
    id: "sesamo",
    label: "Sesamo",
    icon: Bean,
    keywords: ["sesamo", "semi di sesamo", "tahina"],
  },
  {
    id: "polline-betulla",
    label: "Betulla",
    icon: Bean,
    group: "pollen",
    keywords: [
      "mela", "apple", "albicocca", "apricot", "ciliegia", "cherry", "pesca", "peach",
      "pera", "pear", "prugna", "plum", "carota", "carrot", "sedano", "celery",
      "kiwi", "nocciola", "hazelnut", "arachide", "peanut", "soia", "soybean"
    ],
  },
  {
    id: "polline-graminacee",
    label: "Graminacee",
    icon: Wheat,
    group: "pollen",
    keywords: [
      "pesca", "peach", "anguria", "watermelon", "arancia", "orange",
      "pomodoro", "tomato", "patata", "potato"
    ],
  },
  {
    id: "polline-ambrosia",
    label: "Ambrosia",
    icon: Bean,
    group: "pollen",
    keywords: [
      "melone", "cantalupo", "cantaloupe", "honeydew", "anguria", "watermelon",
      "banana", "cetriolo", "cucumber", "zucchina", "zucchini"
    ],
  },
  {
    id: "polline-artemisia-asteracee",
    label: "Artemisia / Asteraceae",
    icon: Bean,
    group: "pollen",
    keywords: [
      "camomilla", "chamomile", "sedano", "celery", "finocchio", "fennel",
      "carota", "carrot", "prezzemolo", "parsley", "anice", "aniseed",
      "carvi", "caraway", "coriandolo", "coriander", "pepe nero", "black pepper"
    ],
  },
];

export const allergenById = (id: AllergenId) => ALLERGENS.find((a) => a.id === id)!;