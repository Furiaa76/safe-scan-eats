import { generateText } from "ai";
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
  recipe?: string;
  checked: boolean;
  createdAt?: string;
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

function scaleRecipeQuantity(quantity: string, servings: number) {
  if (servings === 4 || /q\.b\./i.test(quantity)) return quantity;
  const match = quantity.trim().match(/^(\d+(?:[.,]\d+)?)(.*)$/);
  if (!match) return quantity;
  const base = Number(match[1].replace(",", "."));
  if (!Number.isFinite(base)) return quantity;
  const scaled = Math.round(base * (servings / 4) * 10) / 10;
  return `${String(scaled).replace(".", ",")}${match[2]}`.trim();
}

async function generateIngredients(dish: string, servings = 4) {
  const cleaned = cleanDish(dish);
  const builtIn =
    BUILTIN_RECIPES[cleaned] ??
    Object.entries(BUILTIN_RECIPES).find(([key]) => cleaned.includes(key))?.[1];
  if (builtIn) {
    return builtIn.map((item) => ({
      ...item,
      quantity: scaleRecipeQuantity(item.quantity, servings),
    }));
  }

  try {
    const { text } = await generateText({
      model: "google/gemini-3.6-flash",
      system:
        'Sei il motore ricette di Safe Scan Eats. Ricevi il nome libero di QUALSIASI piatto, dolce, torta, ricetta regionale o internazionale e il numero di persone. Crea la lista della spesa essenziale per prepararlo. Non rinominare il piatto e non sostituirlo con un altro. Se esistono varianti, usa la versione italiana/classica più comune. Rispondi SOLO JSON nel formato {"ingredients":[{"name":string,"quantity":string}]}. Usa nomi e quantità in italiano.',
      prompt: `Piatto richiesto esattamente: ${dish}\nPersone: ${servings}`,
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
  const next = existing.map((item) => ({ ...item }));
  for (const add of additions) {
    const idx = next.findIndex((item) => !item.checked && normalizeName(item.name) === normalizeName(add.name));
    if (idx >= 0) {
      const currentQuantity = next[idx].quantity.trim().toLowerCase();
      const incomingQuantity = add.quantity.trim().toLowerCase();

      if (currentQuantity === incomingQuantity && currentQuantity === "q.b.") {
        next[idx] = {
          ...next[idx],
          recipe: recipe
            ? (next[idx].recipe ? `${next[idx].recipe} · ${recipe}` : recipe)
            : next[idx].recipe,
        };
        continue;
      }

      const a = parseQuantity(next[idx].quantity);
      const b = parseQuantity(add.quantity);
      if (a && b && a.unit === b.unit) {
        next[idx] = {
          ...next[idx],
          quantity: formatQuantity(a.value + b.value, a.unit),
          recipe: recipe
            ? (next[idx].recipe ? `${next[idx].recipe} · ${recipe}` : recipe)
            : next[idx].recipe,
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

async function addDishToCloud(householdKey: string, dish: string, servings = 4) {
  const ingredients = await generateIngredients(dish, servings);
  if (!ingredients) return { ok: false as const, count: 0 };

  const rows = await rpc<Array<Record<string, unknown>>>("safe_scan_get_shopping", {
    p_household_key: householdKey,
  });
  const existing: ShoppingItem[] = (rows ?? []).map((row) => ({
    id: String(row.id),
    name: String(row.name ?? ""),
    quantity: String(row.quantity ?? "1"),
    recipe: typeof row.recipe === "string" ? row.recipe : undefined,
    checked: Boolean(row.checked),
    createdAt: typeof row.created_at === "string" ? row.created_at : undefined,
  }));

  const recipeLabel = servings === 4 ? dish : `${dish} (${servings} persone)`;
  const merged = mergeItems(existing, ingredients, recipeLabel);
  await rpc<null>("safe_scan_replace_shopping", {
    p_household_key: householdKey,
    p_items: merged,
  });

  return { ok: true as const, count: ingredients.length };
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

async function replaceDishInCloud(householdKey: string, dish: string, servings = 4) {
  const ingredients = await generateIngredients(dish, servings);
  if (!ingredients) return { ok: false as const, count: 0 };

  const existing = await loadShoppingFromCloud(householdKey);
  const kept = existing.filter((item) => !recipeMentionsDish(item.recipe, dish));
  const recipeLabel = servings === 4 ? dish : `${dish} (${servings} persone)`;
  const merged = mergeItems(kept, ingredients, recipeLabel);
  await saveShoppingToCloud(householdKey, merged);
  return { ok: true as const, count: ingredients.length };
}


async function loadShoppingFromCloud(householdKey: string) {
  const rows = await rpc<Array<Record<string, unknown>>>("safe_scan_get_shopping", {
    p_household_key: householdKey,
  });
  return (rows ?? []).map((row) => ({
    id: String(row.id),
    name: String(row.name ?? ""),
    quantity: String(row.quantity ?? "1 pz"),
    recipe: typeof row.recipe === "string" ? row.recipe : undefined,
    checked: Boolean(row.checked),
    createdAt: typeof row.created_at === "string" ? row.created_at : undefined,
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

  const name = match[1].trim();
  let quantity = match[2].trim().toLowerCase().replace(",", ".");
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

    if (intent === "CreateShoppingListIntent") {
      const dish = (
        body.request?.intent?.slots?.["dish"]?.value ??
        body.request?.intent?.slots?.["piatto"]?.value
      )?.trim();

      const servingsRaw = (
        body.request?.intent?.slots?.["servings"]?.value ??
        body.request?.intent?.slots?.["persone"]?.value
      )?.trim();
      const parsedServings = servingsRaw ? Number(servingsRaw.replace(",", ".")) : 4;
      const servings =
        Number.isFinite(parsedServings) && parsedServings >= 1 && parsedServings <= 20
          ? Math.round(parsedServings)
          : 4;

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

        const alreadyPresent = await shoppingHasDish(household, dish);
        if (alreadyPresent) {
          return json(
            buildAlexaResponse(
              `${dish} è già presente nella lista. Vuoi aggiungerla a quella esistente oppure sostituirla?`,
              false,
              {
                pendingAction: "duplicateRecipe",
                householdKey: household,
                dish,
                servings,
              },
            ),
          );
        }

        const result = await addDishToCloud(household, dish, servings);
        if (!result.ok) {
          return json(buildAlexaResponse(`Ho capito ${dish}, ma non riesco a creare la lista ingredienti in questo momento.`));
        }

        return json(
          buildAlexaResponse(
            `Fatto. Ho aggiunto ${result.count} ingredienti per ${dish} per ${servings} ${servings === 1 ? "persona" : "persone"} alla lista della spesa di Safe Scan Eats.`,
            false,
          ),
        );
      } catch (error) {
        console.error("[Alexa] shopping add failed", error);
        return json(buildAlexaResponse("Ho avuto un problema nell'aggiornare la lista della spesa. Riprova tra poco."));
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
          const result = await addDishToCloud(householdKey, dish, servings);
          if (!result.ok) {
            return json(buildAlexaResponse("Non sono riuscito ad aggiungere di nuovo la ricetta. Riprova tra poco.", false));
          }
          return json(
            buildAlexaResponse(
              `Va bene. Ho aggiunto un'altra ${dish} per ${servings} ${servings === 1 ? "persona" : "persone"} alla lista.`,
              false,
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
          const result = await replaceDishInCloud(householdKey, dish, servings);
          if (!result.ok) {
            return json(buildAlexaResponse("Non sono riuscito a sostituire la ricetta. Riprova tra poco.", false));
          }
          return json(
            buildAlexaResponse(
              `Fatto. Ho sostituito ${dish} con la versione per ${servings} ${servings === 1 ? "persona" : "persone"}.`,
              false,
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
          "Puoi dirmi: voglio fare la carbonara per due persone, aggiungi latte alla lista, cosa devo comprare, togli il latte dalla lista, segna il latte come comprato, rimetti il latte da comprare, oppure svuota la lista. Se una ricetta è già presente, puoi dire aggiungi oppure sostituisci.",
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
