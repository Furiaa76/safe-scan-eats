import { generateText } from "ai";
// Alexa recipe generation uses Vercel AI SDK OIDC.
import {
  SkillRequestSignatureVerifier,
  TimestampVerifier,
} from "ask-sdk-express-adapter";

type AlexaRequest = {
  session?: { user?: { userId?: string }; attributes?: Record<string, unknown> };
  context?: { System?: { user?: { userId?: string } } };
  request?: {
    type?: string;
    intent?: {
      name?: string;
      slots?: Record<string, { value?: string }>;
    };
  };
};

type ShoppingItem = {
  id: string;
  name: string;
  quantity: string;
  recipe?: string | undefined;
  checked: boolean;
  createdAt?: string | undefined;
};

type AlexaProfile = {
  id: string;
  name: string;
  allergens: string[];
};

const SUPABASE_URL = "https://mqrmdynpcextvjgkkyfj.supabase.co";
const SUPABASE_KEY = "sb_publishable_umpU64DAPwgRiT56fEzvtw_pIo2Wh20";

function buildAlexaResponse(
  text: string,
  shouldEndSession = true,
  sessionAttributes?: Record<string, unknown>,
) {
  return {
    version: "1.0",
    ...(sessionAttributes ? { sessionAttributes } : {}),
    response: {
      outputSpeech: { type: "PlainText", text },
      shouldEndSession,
    },
  };
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

async function rpc<T>(name: string, payload: Record<string, unknown>): Promise<T> {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${name}`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_KEY,
      "content-type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Supabase RPC ${name} failed: ${response.status} ${message}`);
  }
  const text = await response.text();
  return (text ? JSON.parse(text) : null) as T;
}

function getAlexaUserId(body: AlexaRequest) {
  return (
    body.context?.System?.user?.userId ??
    body.session?.user?.userId ??
    ""
  );
}

async function getHouseholdProfiles(householdKey: string): Promise<AlexaProfile[]> {
  try {
    const profiles = await rpc<unknown>("safe_scan_get_profiles", {
      p_household_key: householdKey,
    });
    if (!Array.isArray(profiles)) return [];
    return profiles
      .map((profile) => {
        if (!profile || typeof profile !== "object") return null;
        const row = profile as Record<string, unknown>;
        const name = typeof row["name"] === "string" ? row["name"].trim() : "";
        const id = typeof row["id"] === "string" ? row["id"] : crypto.randomUUID();
        const allergens = Array.isArray(row["allergens"])
          ? row["allergens"].filter((value): value is string => typeof value === "string")
          : [];
        return name ? { id, name, allergens } : null;
      })
      .filter((profile): profile is AlexaProfile => Boolean(profile));
  } catch {
    return [];
  }
}

function normalizeProfileName(value: string) {
  return value
    .trim()
    .toLocaleLowerCase("it-IT")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9 ]/g, "")
    .replace(/\s+/g, " ");
}

function findProfileBySpokenName(profiles: AlexaProfile[], spoken: string) {
  const wanted = normalizeProfileName(spoken);
  if (!wanted) return null;
  const exact = profiles.find((profile) => normalizeProfileName(profile.name) === wanted);
  if (exact) return exact;
  return (
    profiles.find((profile) => normalizeProfileName(profile.name).includes(wanted)) ??
    profiles.find((profile) => wanted.includes(normalizeProfileName(profile.name))) ??
    null
  );
}

async function getHouseholdPreferences(householdKey: string) {
  try {
    const allergens = await rpc<string[] | null>("safe_scan_get_preferences", {
      p_household_key: householdKey,
    });
    return Array.isArray(allergens) ? allergens : [];
  } catch {
    return [];
  }
}

function histamineSaferIngredients(items: Array<{ name: string; quantity: string }>) {
  const substitutions: Array<[RegExp, string]> = [
    [/pecorino romano/gi, "Formaggio fresco non stagionato"],
    [/parmigiano(?: grattugiato)?/gi, "Formaggio fresco non stagionato"],
    [/grana/gi, "Formaggio fresco non stagionato"],
    [/gorgonzola/gi, "Formaggio fresco non stagionato"],
    [/guanciale/gi, "Carne fresca di pollo o tacchino"],
    [/salame|prosciutto crudo|speck|bresaola/gi, "Carne fresca non stagionata"],
    [/tonno(?: in scatola)?|sgombro|sardine|acciughe|alici/gi, "Pesce molto fresco"],
    [/passata di pomodoro|concentrato di pomodoro|pomodoro/gi, "Zucca o crema di verdure tollerate"],
    [/melanzane?/gi, "Zucchine"],
    [/spinaci/gi, "Bietole"],
    [/avocado/gi, "Olio extravergine d'oliva"],
    [/cacao(?: amaro)?|cioccolato/gi, "Carruba"],
    [/aceto/gi, "Succo di limone se tollerato"],
    [/vino|birra/gi, "Acqua o brodo fresco"],
    [/salsa di soia|miso|kimchi|crauti/gi, "Condimento non fermentato"],
  ];

  return items.map((item) => {
    let name = item.name;
    for (const [pattern, replacement] of substitutions) {
      name = name.replace(pattern, replacement);
    }
    return { ...item, name };
  });
}

async function getHouseholdKey(alexaUserId: string) {
  if (!alexaUserId) return null;
  return rpc<string | null>("safe_scan_alexa_household", {
    p_alexa_user_id: alexaUserId,
  });
}

async function makePairingCode(alexaUserId: string) {
  return rpc<string>("safe_scan_alexa_pair", {
    p_alexa_user_id: alexaUserId,
  });
}

const BUILTIN_RECIPES: Record<string, Array<{ name: string; quantity: string }>> = {
  carbonara: [
    { name: "Pasta", quantity: "320 g" },
    { name: "Guanciale", quantity: "150 g" },
    { name: "Uova", quantity: "4" },
    { name: "Pecorino romano", quantity: "100 g" },
    { name: "Pepe nero", quantity: "q.b." },
  ],
  lasagne: [
    { name: "Sfoglia per lasagne", quantity: "250 g" },
    { name: "Carne macinata", quantity: "400 g" },
    { name: "Passata di pomodoro", quantity: "500 g" },
    { name: "Cipolla", quantity: "1" },
    { name: "Carota", quantity: "1" },
    { name: "Sedano", quantity: "1 costa" },
    { name: "Besciamella", quantity: "500 ml" },
    { name: "Parmigiano grattugiato", quantity: "100 g" },
  ],
  "tiramisù": [
    { name: "Savoiardi", quantity: "300 g" },
    { name: "Mascarpone", quantity: "500 g" },
    { name: "Uova", quantity: "4" },
    { name: "Zucchero", quantity: "100 g" },
    { name: "Caffè", quantity: "300 ml" },
    { name: "Cacao amaro", quantity: "30 g" },
  ],
  tiramisu: [
    { name: "Savoiardi", quantity: "300 g" },
    { name: "Mascarpone", quantity: "500 g" },
    { name: "Uova", quantity: "4" },
    { name: "Zucchero", quantity: "100 g" },
    { name: "Caffè", quantity: "300 ml" },
    { name: "Cacao amaro", quantity: "30 g" },
  ],
  "cacio e pepe": [
    { name: "Spaghetti", quantity: "320 g" },
    { name: "Pecorino romano", quantity: "180 g" },
    { name: "Pepe nero", quantity: "q.b." },
  ],
  "pasta cacio e pepe": [
    { name: "Spaghetti", quantity: "320 g" },
    { name: "Pecorino romano", quantity: "180 g" },
    { name: "Pepe nero", quantity: "q.b." },
  ],
  "pasta alla norma": [
    { name: "Pasta", quantity: "320 g" },
    { name: "Melanzane", quantity: "2" },
    { name: "Passata di pomodoro", quantity: "500 g" },
    { name: "Ricotta salata", quantity: "120 g" },
    { name: "Basilico", quantity: "q.b." },
    { name: "Olio extravergine di oliva", quantity: "q.b." },
  ],
  arancini: [
    { name: "Riso", quantity: "320 g" },
    { name: "Passata di pomodoro", quantity: "300 g" },
    { name: "Carne macinata", quantity: "250 g" },
    { name: "Piselli", quantity: "100 g" },
    { name: "Mozzarella", quantity: "150 g" },
    { name: "Uova", quantity: "2" },
    { name: "Pangrattato", quantity: "200 g" },
    { name: "Farina", quantity: "100 g" },
  ],
  "torta di mele": [
    { name: "Mele", quantity: "4" },
    { name: "Farina", quantity: "250 g" },
    { name: "Zucchero", quantity: "150 g" },
    { name: "Uova", quantity: "3" },
    { name: "Burro", quantity: "100 g" },
    { name: "Latte", quantity: "100 ml" },
    { name: "Lievito per dolci", quantity: "16 g" },
  ],
};

function cleanDish(input: string) {
  return input
    .toLocaleLowerCase("it-IT")
    .replace(/[!?.,]/g, " ")
    .replace(/\b(voglio|vorrei|fare|preparare|cucinare|la|il|lo|gli|le|i|una|un)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function scaleRecipeQuantity(quantity: string, servings: number, baseServings = 4) {
  if (servings === baseServings || /q\.b\./i.test(quantity)) return quantity;
  const match = quantity.trim().match(/^(\d+(?:[.,]\d+)?)(.*)$/);
  if (!match) return quantity;
  const base = Number(match[1]!.replace(",", "."));
  if (!Number.isFinite(base)) return quantity;
  const scaled = Math.round(base * (servings / baseServings) * 10) / 10;
  return `${String(scaled).replace(".", ",")}${match[2]}`.trim();
}

async function generateIngredients(dish: string, servings = 4, avoidHistamine = false) {
  const cleaned = cleanDish(dish);
  const builtIn =
    BUILTIN_RECIPES[cleaned] ??
    Object.entries(BUILTIN_RECIPES).find(([key]) => cleaned.includes(key))?.[1];
  if (builtIn) {
    const scaled = builtIn.map((item) => ({
      ...item,
      quantity: scaleRecipeQuantity(item.quantity, servings),
    }));
    return avoidHistamine ? histamineSaferIngredients(scaled) : scaled;
  }

  try {
    const { text } = await generateText({
      model: "google/gemini-3.6-flash",
      system:
        'Sei il motore ricette di Safe Scan Eats. Ricevi il nome libero di QUALSIASI piatto, dolce, torta, ricetta regionale o internazionale e il numero di persone. Crea la lista della spesa essenziale per prepararlo. Non rinominare il piatto e non sostituirlo con un altro. Se esistono varianti, usa la versione italiana/classica più comune. Se viene richiesto di evitare alimenti problematici per sensibilità all istamina, preferisci ingredienti freschi e non stagionati, non fermentati e non conservati, ed evita per quanto possibile salumi, formaggi stagionati, pesce in scatola o affumicato, fermentati, pomodoro, spinaci, melanzane, avocado, cacao/cioccolato, vino e birra. Rispondi SOLO JSON nel formato {"ingredients":[{"name":string,"quantity":string}]}. Usa nomi e quantità in italiano.',
      prompt: `Piatto richiesto esattamente: ${dish}\nPersone: ${servings}\n${avoidHistamine ? "Profilo: sensibilità all istamina, evita o sostituisci gli ingredienti tipicamente problematici." : ""}`,
    });

    const parsed = JSON.parse(
      text.replace(/^\`\`\`(json)?/i, "").replace(/\`\`\`$/, "").trim(),
    ) as { ingredients?: Array<{ name?: unknown; quantity?: unknown }> };

    const ingredients = (parsed.ingredients ?? [])
      .map((item) => ({
        name: typeof item.name === "string" ? item.name.trim() : "",
        quantity: typeof item.quantity === "string" ? item.quantity.trim() : "1",
      }))
      .filter((item) => item.name)
      .slice(0, 30);

    return ingredients.length ? ingredients : null;
  } catch (error) {
    console.error("[Alexa] AI recipe generation failed", error);
    return null;
  }
}

function normalizeName(name: string) {
  return name.trim().toLocaleLowerCase("it-IT").replace(/\s+/g, " ");
}

function parseQuantity(quantity: string) {
  const match = quantity.trim().toLowerCase().replace(",", ".").match(/^(\d+(?:\.\d+)?)\s*(kg|g|l|ml|pz)?$/);
  if (!match) return null;
  const value = Number(match[1]);
  const rawUnit = match[2] || "pz";
  if (rawUnit === "kg") return { value: value * 1000, unit: "g" };
  if (rawUnit === "l") return { value: value * 1000, unit: "ml" };
  return { value, unit: rawUnit };
}

function formatQuantity(value: number, unit: string) {
  if (unit === "g" && value >= 1000 && value % 1000 === 0) return `${value / 1000} kg`;
  if (unit === "ml" && value >= 1000 && value % 1000 === 0) return `${value / 1000} l`;
  if (unit === "pz") return `${value} pz`;
  return `${value} ${unit}`;
}

function mergeItems(existing: ShoppingItem[], additions: Array<{ name: string; quantity: string }>, recipe = "") {
  const next: ShoppingItem[] = existing.map((item) => ({ ...item }));
  for (const add of additions) {
    const idx = next.findIndex((item) => !item.checked && normalizeName(item.name) === normalizeName(add.name));
    const current = next[idx];
    if (idx >= 0 && current) {
      const currentQuantity = current.quantity.trim().toLowerCase();
      const incomingQuantity = add.quantity.trim().toLowerCase();

      if (currentQuantity === incomingQuantity && currentQuantity === "q.b.") {
        next[idx] = {
          ...current,
          recipe: recipe
            ? (current.recipe ? `${current.recipe} · ${recipe}` : recipe)
            : current.recipe,
        };
        continue;
      }

      const a = parseQuantity(current.quantity);
      const b = parseQuantity(add.quantity);
      if (a && b && a.unit === b.unit) {
        next[idx] = {
          ...current,
          quantity: formatQuantity(a.value + b.value, a.unit),
          recipe: recipe
            ? (current.recipe ? `${current.recipe} · ${recipe}` : recipe)
            : current.recipe,
        };
        continue;
      }
    }
    next.push({
      id: crypto.randomUUID(),
      name: add.name,
      quantity: add.quantity,
      recipe: recipe || undefined,
      checked: false,
      createdAt: new Date().toISOString(),
    });
  }
  return next;
}

async function addDishToCloud(
  householdKey: string,
  dish: string,
  servings = 4,
  profileAllergens?: string[],
) {
  const preferences = profileAllergens ?? await getHouseholdPreferences(householdKey);
  const avoidHistamine = preferences.includes("istamina");
  const ingredients = await generateIngredients(dish, servings, avoidHistamine);
  if (!ingredients) return { ok: false as const, count: 0 };

  const rows = await rpc<Array<Record<string, unknown>>>("safe_scan_get_shopping", {
    p_household_key: householdKey,
  });
  const existing: ShoppingItem[] = (rows ?? []).map((row) => ({
    id: String(row["id"]),
    name: String(row["name"] ?? ""),
    quantity: String(row["quantity"] ?? "1"),
    recipe: typeof row["recipe"] === "string" ? row["recipe"] : undefined,
    checked: Boolean(row["checked"]),
    createdAt: typeof row["created_at"] === "string" ? row["created_at"] : undefined,
  }));

  const recipeLabel = servings === 4 ? dish : `${dish} (${servings} persone)`;
  // Keep each recipe contribution separate so changing its servings cannot
  // remove quantities belonging to other recipes or manually added groceries.
  const additions: ShoppingItem[] = ingredients.map((item) => ({
    ...item,
    id: crypto.randomUUID(),
    recipe: recipeLabel,
    checked: false,
    createdAt: new Date().toISOString(),
  }));
  const merged = [...existing, ...additions];
  await rpc<null>("safe_scan_replace_shopping", {
    p_household_key: householdKey,
    p_items: merged,
  });

  return {
    ok: true as const,
    count: ingredients.length,
    lastRecipe: { dish, servings, itemIds: additions.map((item) => item.id) },
  };
}


async function addRecipeForProfile(
  householdKey: string,
  dish: string,
  servings: number,
  profile: AlexaProfile | null,
) {
  const alreadyPresent = await shoppingHasDish(householdKey, dish);
  if (alreadyPresent) {
    return {
      duplicate: true as const,
      response: buildAlexaResponse(
        `${dish} è già presente nella lista. Vuoi aggiungerla a quella esistente oppure sostituirla?`,
        false,
        {
          pendingAction: "duplicateRecipe",
          householdKey,
          dish,
          servings,
          profileName: profile?.name ?? "",
          profileAllergens: profile?.allergens ?? [],
        },
      ),
    };
  }

  const result = await addDishToCloud(
    householdKey,
    dish,
    servings,
    profile?.allergens,
  );
  if (!result.ok) {
    return {
      duplicate: false as const,
      response: buildAlexaResponse(
        `Ho capito ${dish}, ma non riesco a creare la lista ingredienti in questo momento.`,
      ),
    };
  }

  const histamineNote = profile?.allergens.includes("istamina")
    ? " Ho adattato gli ingredienti per evitare, per quanto possibile, quelli tipicamente problematici per sensibilità all'istamina."
    : "";
  const profileNote = profile ? ` per il profilo ${profile.name}` : "";

  return {
    duplicate: false as const,
    response: buildAlexaResponse(
      `Fatto. Ho aggiunto ${result.count} ingredienti per ${dish} per ${servings} ${servings === 1 ? "persona" : "persone"}${profileNote} alla lista della spesa di Safe Scan Eats.${histamineNote}`,
      false,
      { lastRecipe: result.lastRecipe },
    ),
  };
}

function recipeMentionsDish(recipe: string | undefined, dish: string) {
  if (!recipe) return false;
  const wanted = cleanDish(dish);
  return recipe
    .split("·")
    .map((part) => cleanDish(part.replace(/\(\d+\s+persone?\)/gi, "")))
    .some((part) => part === wanted || part.includes(wanted) || wanted.includes(part));
}

async function shoppingHasDish(householdKey: string, dish: string) {
  const items = await loadShoppingFromCloud(householdKey);
  return items.some((item) => recipeMentionsDish(item.recipe, dish));
}

function parseServings(value: unknown): number | null {
  if (typeof value !== "string" && typeof value !== "number") return null;
  const words = ["zero", "uno", "due", "tre", "quattro", "cinque", "sei", "sette", "otto", "nove", "dieci", "undici", "dodici", "tredici", "quattordici", "quindici", "sedici", "diciassette", "diciotto", "diciannove", "venti"];
  const text = String(value).trim().toLocaleLowerCase("it-IT");
  const word = text === "una" ? 1 : words.indexOf(text);
  const count = word >= 0 ? word : Number(text.replace(",", "."));
  return Number.isInteger(count) && count >= 1 && count <= 20 ? count : null;
}

async function continueRecipeRequest(
  householdKey: string,
  dish: string,
  servings: number,
) {
  const profiles = await getHouseholdProfiles(householdKey);
  if (profiles.length > 1) {
    return buildAlexaResponse(
      `Per quale profilo vuoi preparare ${dish}? Puoi scegliere: ${profiles.map((profile) => profile.name).join(", ")}.`,
      false,
      { pendingAction: "recipeProfileSelection", dish, servings },
    );
  }
  return (await addRecipeForProfile(householdKey, dish, servings, profiles[0] ?? null)).response;
}

async function changeLastRecipeServings(
  householdKey: string,
  attributes: Record<string, unknown>,
  servings: number,
) {
  const context = attributes["lastRecipe"] as
    | { dish?: unknown; servings?: unknown; itemIds?: unknown }
    | undefined;
  if (!context || typeof context.dish !== "string" ||
      typeof context.servings !== "number" || !parseServings(context.servings) ||
      !Array.isArray(context.itemIds) || !context.itemIds.length ||
      !context.itemIds.every((id) => typeof id === "string")) {
    return buildAlexaResponse("Quale ricetta vuoi preparare? Dimmi, per esempio: voglio fare la carbonara per due persone.", false, attributes);
  }
  const ids = new Set(context.itemIds as string[]);
  const existing = await loadShoppingFromCloud(householdKey);
  const selected = existing.filter((item) => ids.has(item.id));
  if (selected.length !== ids.size || selected.some((item) => !recipeMentionsDish(item.recipe, context.dish as string))) {
    return buildAlexaResponse("La ricetta è stata modificata o rimossa dalla lista. Chiedimi di prepararla di nuovo con il numero di persone desiderato.", false, attributes);
  }
  // Ambiguous ranges and prose quantities must never be guessed.
  if (selected.some((item) => !/^\d+(?:[.,]\d+)?(?:\s+[^\d]*)?$/.test(item.quantity.trim()) && !/^(?:q\.b\.|quanto basta)$/i.test(item.quantity.trim()))) {
    return buildAlexaResponse("Questa ricetta contiene quantità che non posso ricalcolare con precisione. Non ho modificato la lista.", false, attributes);
  }
  const recipeLabel = servings === 4 ? context.dish : `${context.dish} (${servings} persone)`;
  const next = existing.map((item) => ids.has(item.id) ? {
    ...item,
    quantity: /quanto basta/i.test(item.quantity) ? item.quantity : scaleRecipeQuantity(item.quantity, servings, context.servings as number),
    recipe: recipeLabel,
  } : item);
  await saveShoppingToCloud(householdKey, next);
  return buildAlexaResponse(
    `Fatto. Ho aggiornato ${context.dish} per ${servings} ${servings === 1 ? "persona" : "persone"}, senza aggiungere altri ingredienti.`,
    false,
    { lastRecipe: { ...context, servings } },
  );
}

async function replaceDishInCloud(
  householdKey: string,
  dish: string,
  servings = 4,
  profileAllergens?: string[],
) {
  const existing = await loadShoppingFromCloud(householdKey);
  const shared = existing.some((item) => recipeMentionsDish(item.recipe, dish) &&
    (item.recipe ?? "").split("·").some((part) =>
      cleanDish(part.replace(/\(\d+\s+persone?\)/gi, "")) !== cleanDish(dish)));
  if (shared) {
    // Old rows contain only a combined quantity, not each recipe's contribution.
    return { ok: false as const, reason: "sharedIngredients" as const, count: 0 };
  }
  const preferences = profileAllergens ?? await getHouseholdPreferences(householdKey);
  const avoidHistamine = preferences.includes("istamina");
  const ingredients = await generateIngredients(dish, servings, avoidHistamine);
  if (!ingredients) return { ok: false as const, reason: "generationFailed" as const, count: 0 };
  const kept = existing.filter((item) => !recipeMentionsDish(item.recipe, dish));
  const recipeLabel = servings === 4 ? dish : `${dish} (${servings} persone)`;
  const additions: ShoppingItem[] = ingredients.map((item) => ({
    ...item, id: crypto.randomUUID(), recipe: recipeLabel,
    checked: false, createdAt: new Date().toISOString(),
  }));
  const merged = [...kept, ...additions];
  await saveShoppingToCloud(householdKey, merged);
  return {
    ok: true as const, count: ingredients.length,
    lastRecipe: { dish, servings, itemIds: additions.map((item) => item.id) },
  };
}


async function loadShoppingFromCloud(householdKey: string) {
  const rows = await rpc<Array<Record<string, unknown>>>("safe_scan_get_shopping", {
    p_household_key: householdKey,
  });
  return (rows ?? []).map((row) => ({
    id: String(row["id"]),
    name: String(row["name"] ?? ""),
    quantity: String(row["quantity"] ?? "1 pz"),
    recipe: typeof row["recipe"] === "string" ? row["recipe"] : undefined,
    checked: Boolean(row["checked"]),
    createdAt: typeof row["created_at"] === "string" ? row["created_at"] : undefined,
  })) satisfies ShoppingItem[];
}

async function saveShoppingToCloud(householdKey: string, items: ShoppingItem[]) {
  await rpc<null>("safe_scan_replace_shopping", {
    p_household_key: householdKey,
    p_items: items,
  });
}

function splitItemAndQuantity(input: string) {
  const cleaned = input.trim().replace(/[.,;!?]+$/, "");
  const match = cleaned.match(/^(.*?)(?:\s+)(\d+(?:[.,]\d+)?\s*(?:kg|g|l|ml|pz|pezzi?|confezioni?)?)$/i);
  if (!match) return { name: cleaned, quantity: "1 pz" };

  const name = match[1]!.trim();
  let quantity = match[2]!.trim().toLowerCase().replace(",", ".");
  quantity = quantity
    .replace(/\bpezzi?\b/i, "pz")
    .replace(/\bconfezioni?\b/i, "pz");

  return {
    name: name || cleaned,
    quantity: quantity || "1 pz",
  };
}

async function addSingleItemToCloud(householdKey: string, rawItem: string) {
  const { name, quantity } = splitItemAndQuantity(rawItem);
  if (!name) return { ok: false as const, name: "", quantity: "" };

  const existing = await loadShoppingFromCloud(householdKey);
  const merged = mergeItems(existing, [{ name, quantity }]);
  await saveShoppingToCloud(householdKey, merged);
  return { ok: true as const, name, quantity };
}

function spokenShoppingList(items: ShoppingItem[]) {
  const pending = items.filter((item) => !item.checked);
  if (pending.length === 0) {
    return "La lista della spesa è vuota.";
  }

  const first = pending.slice(0, 8);
  const spoken = first
    .map((item) => `${item.name}, ${item.quantity}`)
    .join("; ");

  const remaining = pending.length - first.length;
  return remaining > 0
    ? `Hai ${pending.length} prodotti da comprare. I primi sono: ${spoken}. E altri ${remaining}.`
    : `Hai ${pending.length} prodotti da comprare: ${spoken}.`;
}


function cleanRequestedItemName(input: string) {
  return normalizeName(
    input
      .replace(/[!?.,;:]+$/g, "")
      .replace(/\b(dalla|dalla mia|dalla lista|della spesa|dalla lista della spesa)\b/gi, " ")
      .replace(/\s+/g, " ")
      .trim(),
  );
}

function findShoppingItem(items: ShoppingItem[], rawItem: string) {
  const wanted = cleanRequestedItemName(rawItem);
  if (!wanted) return null;

  const exact = items.find((item) => normalizeName(item.name) === wanted);
  if (exact) return exact;

  return (
    items.find((item) => normalizeName(item.name).includes(wanted)) ??
    items.find((item) => wanted.includes(normalizeName(item.name))) ??
    null
  );
}

async function removeSingleItemFromCloud(householdKey: string, rawItem: string) {
  const items = await loadShoppingFromCloud(householdKey);
  const found = findShoppingItem(items, rawItem);
  if (!found) return { ok: false as const, name: rawItem.trim() };

  const next = items.filter((item) => item.id !== found.id);
  await saveShoppingToCloud(householdKey, next);
  return { ok: true as const, name: found.name };
}

async function markSingleItemPurchased(householdKey: string, rawItem: string) {
  const items = await loadShoppingFromCloud(householdKey);
  const found = findShoppingItem(items.filter((item) => !item.checked), rawItem);
  if (!found) return { ok: false as const, name: rawItem.trim() };

  const next = items.map((item) =>
    item.id === found.id ? { ...item, checked: true } : item,
  );
  await saveShoppingToCloud(householdKey, next);
  return { ok: true as const, name: found.name };
}


async function restoreSingleItemToBuy(householdKey: string, rawItem: string) {
  const items = await loadShoppingFromCloud(householdKey);
  const found = findShoppingItem(items.filter((item) => item.checked), rawItem);
  if (!found) return { ok: false as const, name: rawItem.trim() };

  const next = items.map((item) =>
    item.id === found.id ? { ...item, checked: false } : item,
  );
  await saveShoppingToCloud(householdKey, next);
  return { ok: true as const, name: found.name };
}

export async function GET() {
  return json({
    ok: true,
    service: "Safe Scan Eats Alexa endpoint",
    verification: "signature-and-timestamp-enabled",
    cloudShopping: true,
  });
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  const headers = Object.fromEntries(request.headers.entries());

  console.log("[Alexa] incoming", {
    method: request.method,
    url: request.url,
    hasSignature: Boolean(request.headers.get("signature") || request.headers.get("signature-256")),
    hasCertUrl: Boolean(request.headers.get("signaturecertchainurl")),
  });

  try {
    await new SkillRequestSignatureVerifier().verify(rawBody, headers);
    await new TimestampVerifier().verify(rawBody);
  } catch (error) {
    console.error("[Alexa] verification failed", error);
    return json({ error: "Alexa request verification failed" }, 400);
  }

  let body: AlexaRequest;
  try {
    body = JSON.parse(rawBody) as AlexaRequest;
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  const alexaUserId = getAlexaUserId(body);
  const type = body.request?.type;

  if (type === "LaunchRequest") {
    try {
      const household = await getHouseholdKey(alexaUserId);
      if (!household) {
        const code = await makePairingCode(alexaUserId);
        return json(
          buildAlexaResponse(
            `Prima colleghiamo la tua lista della spesa. Apri Safe Scan Eats, entra nella lista della spesa e inserisci il codice ${code.split("").join(" ")}. Il codice dura dieci minuti.`,
          ),
        );
      }
    } catch (error) {
      console.error("[Alexa] pairing lookup failed", error);
    }

    return json(
      buildAlexaResponse(
        "Benvenuto in Safe Scan. Dimmi quale piatto vuoi preparare, per esempio: voglio fare la carbonara.",
        false,
      ),
    );
  }

  if (type === "IntentRequest") {
    const intent = body.request?.intent?.name;
    console.log("[Alexa] intent", {
      intent,
      slots: Object.fromEntries(
        Object.entries(body.request?.intent?.slots ?? {}).map(([name, slot]) => [
          name,
          slot?.value ?? "",
        ]),
      ),
    });

    if (intent === "CreateShoppingListIntent" || intent === "CreateRecipeIntent") {
      let dish = (
        body.request?.intent?.slots?.["dish"]?.value ??
        body.request?.intent?.slots?.["piatto"]?.value
      )?.trim();

      const servingsRaw = (
        body.request?.intent?.slots?.["servings"]?.value ??
        body.request?.intent?.slots?.["persone"]?.value
      )?.trim();
      const suffix = dish?.match(/\s+per\s+(\d+(?:[.,]\d+)?|[a-z]+)\s+person[ae]\s*$/i);
      const requestedServings = servingsRaw ?? suffix?.[1];
      // The old voice model has no number intent. Keep its four-person default
      // until the new model is imported; only the new intent starts the dialog.
      const servings = requestedServings === undefined && intent === "CreateShoppingListIntent"
        ? 4 : parseServings(requestedServings);
      if (suffix) dish = dish!.slice(0, suffix.index).trim();

      if (!dish) {
        return json(buildAlexaResponse("Quale piatto vuoi preparare?", false));
      }

      try {
        const household = await getHouseholdKey(alexaUserId);
        if (!household) {
          const code = await makePairingCode(alexaUserId);
          return json(
            buildAlexaResponse(
              `Prima devo collegarmi alla tua lista. Apri Safe Scan Eats e inserisci il codice ${code.split("").join(" ")} nella sezione Collega Alexa.`,
            ),
          );
        }

        if (servings === null) {
          return json(buildAlexaResponse(
            requestedServings ? "Dimmi un numero intero di persone da uno a venti." : `Per quante persone vuoi preparare ${dish}?`,
            false,
            { pendingAction: "recipeServingsSelection", dish },
          ));
        }
        return json(await continueRecipeRequest(household, dish, servings));
      } catch (error) {
        console.error("[Alexa] shopping add failed", error);
        return json(buildAlexaResponse("Ho avuto un problema nell'aggiornare la lista della spesa. Riprova tra poco."));
      }
    }

    if (intent === "ChangeServingsIntent") {
      const attributes = body.session?.attributes ?? {};
      const servings = parseServings(body.request?.intent?.slots?.["servings"]?.value);
      if (servings === null) {
        return json(buildAlexaResponse("Dimmi un numero intero di persone da uno a venti.", false, attributes));
      }
      try {
        const household = await getHouseholdKey(alexaUserId);
        if (!household) return json(buildAlexaResponse("Prima collega Alexa alla lista della spesa nell'app Safe Scan Eats."));
        if (attributes["pendingAction"] === "recipeServingsSelection" && typeof attributes["dish"] === "string") {
          return json(await continueRecipeRequest(household, attributes["dish"], servings));
        }
        if (attributes["pendingAction"] === "recipeProfileSelection" || attributes["pendingAction"] === "duplicateRecipe") {
          return json(buildAlexaResponse(
            attributes["pendingAction"] === "recipeProfileSelection"
              ? `Va bene, per ${servings} persone. Quale profilo vuoi usare?`
              : `Va bene, per ${servings} persone. Vuoi aggiungere la ricetta oppure sostituirla?`,
            false,
            { ...attributes, servings },
          ));
        }
        return json(await changeLastRecipeServings(household, attributes, servings));
      } catch (error) {
        console.error("[Alexa] servings update failed", error);
        return json(buildAlexaResponse("Non sono riuscito ad aggiornare le porzioni. Riprova tra poco.", false, attributes));
      }
    }

    if (intent === "SelectProfileIntent" || intent === "SelectProfileNameIntent") {
      const pendingAction = body.session?.attributes?.["pendingAction"];
      const householdKey = await getHouseholdKey(alexaUserId);
      const dish = body.session?.attributes?.["dish"];
      const servingsValue = body.session?.attributes?.["servings"];
      const spokenProfile = (
        body.request?.intent?.slots?.["profile"]?.value ??
        body.request?.intent?.slots?.["profilo"]?.value
      )?.trim();

      if (
        pendingAction !== "recipeProfileSelection" ||
        typeof householdKey !== "string" ||
        typeof dish !== "string"
      ) {
        return json(buildAlexaResponse("Non c'è una ricetta in attesa di scelta del profilo.", false));
      }

      if (!spokenProfile) {
        return json(buildAlexaResponse("Dimmi il nome del profilo da usare.", false, body.session?.attributes));
      }

      const servings =
        typeof servingsValue === "number" && Number.isFinite(servingsValue)
          ? servingsValue
          : 4;

      try {
        const profiles = await getHouseholdProfiles(householdKey);
        const profile = findProfileBySpokenName(profiles, spokenProfile);
        if (!profile) {
          const names = profiles.map((item) => item.name).join(", ");
          return json(
            buildAlexaResponse(
              `Non trovo il profilo ${spokenProfile}. Puoi scegliere: ${names}.`,
              false,
              body.session?.attributes,
            ),
          );
        }

        const result = await addRecipeForProfile(householdKey, dish, servings, profile);
        return json(result.response);
      } catch (error) {
        console.error("[Alexa] profile selection failed", error);
        return json(buildAlexaResponse("Non riesco a usare quel profilo in questo momento. Riprova tra poco.", false));
      }
    }

    if (intent === "AddShoppingItemIntent") {
      const rawItem = (
        body.request?.intent?.slots?.["item"]?.value ??
        body.request?.intent?.slots?.["prodotto"]?.value
      )?.trim();

      if (!rawItem) {
        return json(buildAlexaResponse("Che prodotto vuoi aggiungere alla lista?", false));
      }

      try {
        const household = await getHouseholdKey(alexaUserId);
        if (!household) {
          const code = await makePairingCode(alexaUserId);
          return json(
            buildAlexaResponse(
              `Prima devo collegarmi alla tua lista. Apri Safe Scan Eats e inserisci il codice ${code.split("").join(" ")} nella sezione Collega Alexa.`,
            ),
          );
        }

        const result = await addSingleItemToCloud(household, rawItem);
        if (!result.ok) {
          return json(buildAlexaResponse("Non sono riuscito ad aggiungere quel prodotto. Riprova."));
        }

        return json(
          buildAlexaResponse(
            `Fatto. Ho aggiunto ${result.name}, ${result.quantity}, alla lista della spesa.`,
            false,
          ),
        );
      } catch (error) {
        console.error("[Alexa] single item add failed", error);
        return json(buildAlexaResponse("Ho avuto un problema nell'aggiornare la lista della spesa. Riprova tra poco."));
      }
    }

    if (intent === "ReadShoppingListIntent") {
      try {
        const household = await getHouseholdKey(alexaUserId);
        if (!household) {
          const code = await makePairingCode(alexaUserId);
          return json(
            buildAlexaResponse(
              `Prima devo collegarmi alla tua lista. Apri Safe Scan Eats e inserisci il codice ${code.split("").join(" ")} nella sezione Collega Alexa.`,
            ),
          );
        }

        const items = await loadShoppingFromCloud(household);
        return json(buildAlexaResponse(spokenShoppingList(items), false));
      } catch (error) {
        console.error("[Alexa] shopping list read failed", error);
        return json(buildAlexaResponse("Non riesco a leggere la lista della spesa in questo momento. Riprova tra poco."));
      }
    }

    if (intent === "RemoveShoppingItemIntent") {
      const rawItem = (
        body.request?.intent?.slots?.["item"]?.value ??
        body.request?.intent?.slots?.["prodotto"]?.value
      )?.trim();

      if (!rawItem) {
        return json(buildAlexaResponse("Quale prodotto vuoi togliere dalla lista?", false));
      }

      try {
        const household = await getHouseholdKey(alexaUserId);
        if (!household) {
          const code = await makePairingCode(alexaUserId);
          return json(
            buildAlexaResponse(
              `Prima devo collegarmi alla tua lista. Apri Safe Scan Eats e inserisci il codice ${code.split("").join(" ")} nella sezione Collega Alexa.`,
            ),
          );
        }

        const result = await removeSingleItemFromCloud(household, rawItem);
        if (!result.ok) {
          return json(buildAlexaResponse(`Non trovo ${rawItem} nella lista della spesa.`));
        }

        return json(buildAlexaResponse(`Fatto. Ho tolto ${result.name} dalla lista della spesa.`, false));
      } catch (error) {
        console.error("[Alexa] shopping remove failed", error);
        return json(buildAlexaResponse("Ho avuto un problema nel modificare la lista della spesa. Riprova tra poco."));
      }
    }

    if (intent === "MarkShoppingItemPurchasedIntent") {
      const rawItem = (
        body.request?.intent?.slots?.["item"]?.value ??
        body.request?.intent?.slots?.["prodotto"]?.value
      )?.trim();

      if (!rawItem) {
        return json(buildAlexaResponse("Quale prodotto devo segnare come comprato?", false));
      }

      try {
        const household = await getHouseholdKey(alexaUserId);
        if (!household) {
          const code = await makePairingCode(alexaUserId);
          return json(
            buildAlexaResponse(
              `Prima devo collegarmi alla tua lista. Apri Safe Scan Eats e inserisci il codice ${code.split("").join(" ")} nella sezione Collega Alexa.`,
            ),
          );
        }

        const result = await markSingleItemPurchased(household, rawItem);
        if (!result.ok) {
          return json(buildAlexaResponse(`Non trovo ${rawItem} tra i prodotti da comprare.`));
        }

        return json(buildAlexaResponse(`Fatto. Ho segnato ${result.name} come comprato.`, false));
      } catch (error) {
        console.error("[Alexa] shopping purchased failed", error);
        return json(buildAlexaResponse("Ho avuto un problema nel modificare la lista della spesa. Riprova tra poco."));
      }
    }

    if (intent === "ClearShoppingListIntent") {
      try {
        const household = await getHouseholdKey(alexaUserId);
        if (!household) {
          const code = await makePairingCode(alexaUserId);
          return json(
            buildAlexaResponse(
              `Prima devo collegarmi alla tua lista. Apri Safe Scan Eats e inserisci il codice ${code.split("").join(" ")} nella sezione Collega Alexa.`,
            ),
          );
        }

        return json(
          buildAlexaResponse(
            "Vuoi davvero svuotare tutta la lista della spesa? Rispondi sì oppure no.",
            false,
            { pendingAction: "clearShoppingList", householdKey: household },
          ),
        );
      } catch (error) {
        console.error("[Alexa] clear confirmation failed", error);
        return json(buildAlexaResponse("Ho avuto un problema con la lista della spesa. Riprova tra poco."));
      }
    }

    if (intent === "AMAZON.YesIntent") {
      const pendingAction = body.session?.attributes?.["pendingAction"];
      const householdKey = body.session?.attributes?.["householdKey"];

      if (pendingAction === "clearShoppingList" && typeof householdKey === "string") {
        try {
          await saveShoppingToCloud(householdKey, []);
          return json(buildAlexaResponse("Fatto. Ho svuotato tutta la lista della spesa.", false));
        } catch (error) {
          console.error("[Alexa] shopping clear failed", error);
          return json(buildAlexaResponse("Non sono riuscito a svuotare la lista. Riprova tra poco.", false));
        }
      }

      return json(buildAlexaResponse("Non c'è nessuna operazione da confermare.", false));
    }

    if (intent === "AMAZON.NoIntent") {
      const pendingAction = body.session?.attributes?.["pendingAction"];
      if (pendingAction === "clearShoppingList") {
        return json(buildAlexaResponse("Va bene, non ho cancellato nulla.", false));
      }
      return json(buildAlexaResponse("Va bene.", false));
    }

    if (intent === "AddDuplicateRecipeIntent") {
      const pendingAction = body.session?.attributes?.["pendingAction"];
      const householdKey = body.session?.attributes?.["householdKey"];
      const dish = body.session?.attributes?.["dish"];
      const servingsValue = body.session?.attributes?.["servings"];
      const profileAllergens = body.session?.attributes?.["profileAllergens"];

      if (
        pendingAction === "duplicateRecipe" &&
        typeof householdKey === "string" &&
        typeof dish === "string"
      ) {
        const servings =
          typeof servingsValue === "number" && Number.isFinite(servingsValue)
            ? servingsValue
            : 4;
        try {
          const result = await addDishToCloud(
            householdKey,
            dish,
            servings,
            Array.isArray(profileAllergens)
              ? profileAllergens.filter((value): value is string => typeof value === "string")
              : undefined,
          );
          if (!result.ok) {
            return json(buildAlexaResponse("Non sono riuscito ad aggiungere di nuovo la ricetta. Riprova tra poco.", false));
          }
          return json(
            buildAlexaResponse(
              `Va bene. Ho aggiunto un'altra ${dish} per ${servings} ${servings === 1 ? "persona" : "persone"} alla lista.`,
              false,
              { lastRecipe: result.lastRecipe },
            ),
          );
        } catch (error) {
          console.error("[Alexa] duplicate recipe add failed", error);
          return json(buildAlexaResponse("Ho avuto un problema nell'aggiornare la lista. Riprova tra poco.", false));
        }
      }

      return json(buildAlexaResponse("Non c'è nessuna ricetta da aggiungere di nuovo.", false));
    }

    if (intent === "ReplaceDuplicateRecipeIntent") {
      const pendingAction = body.session?.attributes?.["pendingAction"];
      const householdKey = body.session?.attributes?.["householdKey"];
      const dish = body.session?.attributes?.["dish"];
      const servingsValue = body.session?.attributes?.["servings"];
      const profileAllergens = body.session?.attributes?.["profileAllergens"];

      if (
        pendingAction === "duplicateRecipe" &&
        typeof householdKey === "string" &&
        typeof dish === "string"
      ) {
        const servings =
          typeof servingsValue === "number" && Number.isFinite(servingsValue)
            ? servingsValue
            : 4;
        try {
          const result = await replaceDishInCloud(
            householdKey,
            dish,
            servings,
            Array.isArray(profileAllergens)
              ? profileAllergens.filter((value): value is string => typeof value === "string")
              : undefined,
          );
          if (!result.ok) {
            return json(buildAlexaResponse(
              result.reason === "sharedIngredients"
                ? "Gli ingredienti della vecchia ricetta sono sommati a quelli di altre ricette. Non posso separarli senza cambiare le altre quantità. Non ho modificato nulla. Puoi dire aggiungi per inserire la nuova ricetta separatamente, oppure annulla."
                : "Non riesco a generare gli ingredienti della nuova versione in questo momento. La lista non è stata modificata. Puoi riprovare dicendo sostituisci, oppure annulla.",
              false,
              body.session?.attributes,
            ));
          }
          return json(
            buildAlexaResponse(
              `Fatto. Ho sostituito ${dish} con la versione per ${servings} ${servings === 1 ? "persona" : "persone"}.`,
              false,
              { lastRecipe: result.lastRecipe },
            ),
          );
        } catch (error) {
          console.error("[Alexa] duplicate recipe replace failed", error);
          return json(buildAlexaResponse("Ho avuto un problema nell'aggiornare la lista. Riprova tra poco.", false));
        }
      }

      return json(buildAlexaResponse("Non c'è nessuna ricetta da sostituire.", false));
    }

    if (intent === "RestoreShoppingItemIntent") {
      const rawItem = (
        body.request?.intent?.slots?.["item"]?.value ??
        body.request?.intent?.slots?.["prodotto"]?.value
      )?.trim();

      if (!rawItem) {
        return json(buildAlexaResponse("Quale prodotto devo rimettere tra quelli da comprare?", false));
      }

      try {
        const household = await getHouseholdKey(alexaUserId);
        if (!household) {
          const code = await makePairingCode(alexaUserId);
          return json(
            buildAlexaResponse(
              `Prima devo collegarmi alla tua lista. Apri Safe Scan Eats e inserisci il codice ${code.split("").join(" ")} nella sezione Collega Alexa.`,
            ),
          );
        }

        const result = await restoreSingleItemToBuy(household, rawItem);
        if (!result.ok) {
          return json(buildAlexaResponse(`Non trovo ${rawItem} tra i prodotti acquistati.`, false));
        }

        return json(buildAlexaResponse(`Fatto. Ho rimesso ${result.name} tra i prodotti da comprare.`, false));
      } catch (error) {
        console.error("[Alexa] shopping restore failed", error);
        return json(buildAlexaResponse("Ho avuto un problema nel modificare la lista della spesa. Riprova tra poco."));
      }
    }

    if (intent === "AMAZON.HelpIntent") {
      return json(
        buildAlexaResponse(
          "Puoi dirmi: voglio fare la carbonara per due persone. Se non indichi le persone, te le chiederò. Per cambiare l'ultima ricetta durante la conversazione puoi dire: anzi, falla per due persone. Puoi anche aggiungere o togliere prodotti dalla lista. Quando hai più profili ti chiederò quale usare. Se una ricetta è già presente, puoi dire aggiungi oppure sostituisci.",
          false,
        ),
      );
    }

    if (intent === "AMAZON.CancelIntent" || intent === "AMAZON.StopIntent") {
      return json(buildAlexaResponse("Va bene, a presto."));
    }
  }

  return json(
    buildAlexaResponse(
      "Non ho capito. Prova a dirmi quale piatto vuoi preparare.",
      false,
    ),
  );
}
