/** Personal exclusions, never an estimate or certification of nickel content. */
export interface NickelEntry {
  id: string;
  kind: "ingredient" | "product";
  name: string;
  aliases: string[];
  code: string;
  note: string;
}

export interface NickelSettings {
  enabled: boolean;
  startPage: boolean;
  entries: NickelEntry[];
}

export interface NickelAssessment {
  status: "avoid" | "clear" | "incomplete" | "empty";
  matches: Array<{ name: string; term: string; kind: NickelEntry["kind"] }>;
  missing: "ingredients" | "code" | "language" | null;
}

export const emptyNickelSettings = (): NickelSettings => ({ enabled: true, startPage: false, entries: [] });
export const normalizeNickelTerm = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("it-IT").replace(/[^\p{L}\p{N}]+/gu, " ").trim().replace(/\s+/g, " ");
export const splitNickelAliases = (value: string) => Array.from(new Set(value.split(/[,;\n]+/).map((x) => x.trim()).filter(Boolean)));
export const validNickelCode = (value: string) => /^(?:\d{8}|\d{12,14})$/.test(value);

export function normalizeNickelSettings(value: unknown): NickelSettings | undefined {
  if (!value || typeof value !== "object") return undefined;
  const raw = value as Record<string, unknown>;
  const seen = new Set<string>();
  const entries: NickelEntry[] = [];
  for (const item of Array.isArray(raw["entries"]) ? raw["entries"] : []) {
    if (!item || typeof item !== "object") continue;
    const x = item as Record<string, unknown>;
    if (typeof x["id"] !== "string" || !x["id"] || seen.has(x["id"]) || typeof x["name"] !== "string" || !normalizeNickelTerm(x["name"])) continue;
    if (x["kind"] !== "ingredient" && x["kind"] !== "product") continue;
    const code = typeof x["code"] === "string" ? x["code"].trim() : "";
    if (x["kind"] === "product" && !validNickelCode(code)) continue;
    seen.add(x["id"]);
    entries.push({ id: x["id"], kind: x["kind"], name: x["name"].trim(), aliases: Array.from(new Set((Array.isArray(x["aliases"]) ? x["aliases"] : []).filter((a): a is string => typeof a === "string").map((a) => a.trim()).filter(Boolean))), code: x["kind"] === "product" ? code : "", note: typeof x["note"] === "string" ? x["note"].trim() : "" });
  }
  const enabled = raw["enabled"] !== false;
  return { enabled, startPage: enabled && raw["startPage"] === true, entries };
}

export function assessNickel(product: { code: string; ingredientsText: string; source?: string; ingredientsLanguage?: string }, settings?: NickelSettings): NickelAssessment | undefined {
  if (!settings?.enabled) return undefined;
  const text = ` ${normalizeNickelTerm(product.ingredientsText)} `;
  const matches: NickelAssessment["matches"] = [];
  for (const entry of settings.entries) {
    if (entry.kind === "product") {
      if (product.code.trim() && entry.code === product.code.trim()) matches.push({ name: entry.name, term: entry.code, kind: "product" });
    } else {
      const term = [entry.name, ...entry.aliases].find((word) => {
        const needle = normalizeNickelTerm(word);
        return needle && text.includes(` ${needle} `);
      });
      if (term) matches.push({ name: entry.name, term, kind: "ingredient" });
    }
  }
  if (matches.length) return { status: "avoid", matches, missing: null };
  if (!settings.entries.length) return { status: "empty", matches, missing: null };
  if (!normalizeNickelTerm(product.ingredientsText)) return { status: "incomplete", matches, missing: "ingredients" };
  if (settings.entries.some((x) => x.kind === "product") && !product.code.trim()) return { status: "incomplete", matches, missing: "code" };
  if (product.source === "off" && product.ingredientsLanguage && !["it", "en"].includes(product.ingredientsLanguage)) return { status: "incomplete", matches, missing: "language" };
  return { status: "clear", matches, missing: null };
}

/** Suggestions are opt-in spellings/derivatives, never automatic dietary exclusions. */
export const NICKEL_DICTIONARY = [
  { name: "Pomodoro", lookup: ["pomodoro", "pomodori"], aliases: ["pomodori", "passata di pomodoro", "concentrato di pomodoro", "polpa di pomodoro", "tomato", "tomatoes"] },
  { name: "Cipolla", lookup: ["cipolla", "cipolle"], aliases: ["cipolle", "cipolla disidratata", "cipolla in polvere", "onion", "onions"] },
  { name: "Cacao", lookup: ["cacao"], aliases: ["cacao magro", "cacao in polvere", "pasta di cacao", "cocoa", "cocoa powder"] },
  { name: "Cioccolato", lookup: ["cioccolato", "cioccolata"], aliases: ["cioccolata", "cioccolato fondente", "cioccolato al latte", "chocolate"] },
  { name: "Latte", lookup: ["latte"], aliases: ["latte in polvere", "proteine del latte", "caseina", "caseinato di sodio", "caseinato di calcio", "milk", "casein"] },
  { name: "Soia", lookup: ["soia"], aliases: ["farina di soia", "proteine di soia", "soy", "soya", "soybeans"] },
  { name: "Avena", lookup: ["avena"], aliases: ["farina di avena", "fiocchi di avena", "oat", "oats"] },
  { name: "Nocciola", lookup: ["nocciola", "nocciole"], aliases: ["nocciole", "pasta di nocciole", "hazelnut", "hazelnuts"] },
];
