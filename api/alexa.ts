import {
  SkillRequestSignatureVerifier,
  TimestampVerifier,
} from "ask-sdk-express-adapter";

type AlexaRequest = {
  session?: { user?: { userId?: string } };
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

function buildAlexaResponse(text: string, shouldEndSession = true) {
  return {
    version: "1.0",
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
};

function cleanDish(input: string) {
  return input
    .toLocaleLowerCase("it-IT")
    .replace(/[!?.,]/g, " ")
    .replace(/\b(voglio|vorrei|fare|preparare|cucinare|la|il|lo|gli|le|i|una|un)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function generateIngredients(dish: string) {
  const cleaned = cleanDish(dish);
  const builtIn =
    BUILTIN_RECIPES[cleaned] ??
    Object.entries(BUILTIN_RECIPES).find(([key]) => cleaned.includes(key))?.[1];
  if (builtIn) return builtIn;

  const gatewayKey = process.env["AI_GATEWAY_API_KEY"] || process.env["VERCEL_OIDC_TOKEN"];
  if (!gatewayKey) return null;

  const response = await fetch("https://ai-gateway.vercel.sh/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${gatewayKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-3-flash",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            'Crea una lista della spesa italiana essenziale per 4 persone. Rispondi SOLO JSON nel formato {"ingredients":[{"name":string,"quantity":string}]}. Usa nomi e quantità in italiano.',
        },
        { role: "user", content: `Piatto: ${dish}` },
      ],
    }),
  });
  if (!response.ok) return null;
  const result = (await response.json()) as { choices?: { message?: { content?: string } }[] };
  const raw = result.choices?.[0]?.message?.content ?? "";
  const parsed = JSON.parse(raw.replace(/^\`\`\`(json)?/i, "").replace(/\`\`\`$/, "").trim()) as {
    ingredients?: Array<{ name?: unknown; quantity?: unknown }>;
  };
  const ingredients = (parsed.ingredients ?? [])
    .map((item) => ({
      name: typeof item.name === "string" ? item.name.trim() : "",
      quantity: typeof item.quantity === "string" ? item.quantity.trim() : "1",
    }))
    .filter((item) => item.name)
    .slice(0, 30);
  return ingredients.length ? ingredients : null;
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

function mergeItems(existing: ShoppingItem[], additions: Array<{ name: string; quantity: string }>, recipe: string) {
  const next = existing.map((item) => ({ ...item }));
  for (const add of additions) {
    const idx = next.findIndex((item) => !item.checked && normalizeName(item.name) === normalizeName(add.name));
    if (idx >= 0) {
      const a = parseQuantity(next[idx].quantity);
      const b = parseQuantity(add.quantity);
      if (a && b && a.unit === b.unit) {
        next[idx] = {
          ...next[idx],
          quantity: formatQuantity(a.value + b.value, a.unit),
          recipe: next[idx].recipe ? `${next[idx].recipe} · ${recipe}` : recipe,
        };
        continue;
      }
    }
    next.push({
      id: crypto.randomUUID(),
      name: add.name,
      quantity: add.quantity,
      recipe,
      checked: false,
      createdAt: new Date().toISOString(),
    });
  }
  return next;
}

async function addDishToCloud(householdKey: string, dish: string) {
  const ingredients = await generateIngredients(dish);
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

  const merged = mergeItems(existing, ingredients, dish);
  await rpc<null>("safe_scan_replace_shopping", {
    p_household_key: householdKey,
    p_items: merged,
  });

  return { ok: true as const, count: ingredients.length };
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

    if (intent === "CreateShoppingListIntent") {
      const dish = (
        body.request?.intent?.slots?.["dish"]?.value ??
        body.request?.intent?.slots?.["piatto"]?.value
      )?.trim();

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

        const result = await addDishToCloud(household, dish);
        if (!result.ok) {
          return json(buildAlexaResponse(`Ho capito ${dish}, ma non riesco a creare la lista ingredienti in questo momento.`));
        }

        return json(
          buildAlexaResponse(
            `Fatto. Ho aggiunto ${result.count} ingredienti per ${dish} alla lista della spesa di Safe Scan Eats.`,
          ),
        );
      } catch (error) {
        console.error("[Alexa] shopping add failed", error);
        return json(buildAlexaResponse("Ho avuto un problema nell'aggiornare la lista della spesa. Riprova tra poco."));
      }
    }

    if (intent === "AMAZON.HelpIntent") {
      return json(
        buildAlexaResponse(
          "Puoi dirmi: voglio fare la carbonara, oppure: preparami la lista per il tiramisù.",
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
