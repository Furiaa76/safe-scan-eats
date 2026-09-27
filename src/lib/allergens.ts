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
  | "sesamo";

export interface Allergen {
  id: AllergenId;
  label: string;
  icon: LucideIcon;
  /** Parole chiave da cercare nella lista ingredienti */
  keywords: string[];
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
    keywords: ["latte", "lattosio", "siero", "burro", "panna", "caseina", "latticello", "whey"],
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
];

export const allergenById = (id: AllergenId) => ALLERGENS.find((a) => a.id === id)!;