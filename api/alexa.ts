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
    locale?: string;
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

type RecipeTarget = { dish: string; itemIds: string[] };

function lastRecipeTarget(items: ShoppingItem[], previous: unknown): RecipeTarget | null {
  const context = previous as { dish?: unknown; itemIds?: unknown } | undefined;
  if (context && typeof context.dish === "string" && Array.isArray(context.itemIds) &&
      context.itemIds.length && context.itemIds.every((id) => typeof id === "string")) {
    const ids = new Set(context.itemIds as string[]);
    const selected = items.filter((item) => ids.has(item.id));
    if (selected.length === ids.size && selected.every((item) => recipeMentionsDish(item.recipe, context.dish as string))) {
      return { dish: context.dish, itemIds: context.itemIds as string[] };
    }
    // A stale session must not silently select a different recipe.
    return null;
  }
  const recipes = items.filter((item) => item.recipe);
  if (!recipes.length) return null;
  const labels = Array.from(new Set(recipes.flatMap((item) => (item.recipe ?? "").split("·"))
    .map((label) => cleanDish(label.replace(/\(\d+\s+persone?\)/gi, "")))));
  let dish: string | undefined = labels.length === 1 ? labels[0] : undefined;
  if (!dish) {
    const dated = recipes.filter((item) => Number.isFinite(Date.parse(item.createdAt ?? "")));
    if (dated.length !== recipes.length) return null;
    const latest = Math.max(...dated.map((item) => Date.parse(item.createdAt!)));
    const lastLabels = Array.from(new Set(dated.filter((item) => Date.parse(item.createdAt!) === latest)
      .flatMap((item) => (item.recipe ?? "").split("·"))
      .map((label) => cleanDish(label.replace(/\(\d+\s+persone?\)/gi, "")))));
    if (lastLabels.length !== 1) return null;
    dish = lastLabels[0];
  }
  if (!dish) return null;
  return { dish, itemIds: recipes.filter((item) => recipeMentionsDish(item.recipe, dish!)).map((item) => item.id) };
}

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

function rawJson(data: unknown, status = 200) {
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

// Generated from src/lib/recipe-catalog.ts by scripts/sync-recipe-catalog.mjs.
const EXTRA_RECIPES: Array<{ id: string; title: string; englishTitle: string; aliases: string[]; servings: number; ingredients: Array<{ name: string; quantity: string; glutenSwap?: string; lactoseSwap?: string }> }> = [
  {
    "id": "cannelloni-di-carne",
    "title": "Cannelloni di carne",
    "englishTitle": "Meat cannelloni",
    "aliases": [
      "Meat cannelloni",
      "cannelloni",
      "cannelloni al ragù",
      "cannelloni al ragu"
    ],
    "servings": 4,
    "ingredients": [
      {
        "name": "Cannelloni",
        "quantity": "250 g",
        "glutenSwap": "Cannelloni senza glutine"
      },
      {
        "name": "Carne macinata",
        "quantity": "400 g"
      },
      {
        "name": "Passata di pomodoro",
        "quantity": "500 g"
      },
      {
        "name": "Besciamella",
        "quantity": "500 ml",
        "lactoseSwap": "Besciamella senza lattosio",
        "glutenSwap": "Besciamella senza glutine"
      },
      {
        "name": "Parmigiano grattugiato",
        "quantity": "80 g"
      },
      {
        "name": "Cipolla",
        "quantity": "1"
      },
      {
        "name": "Olio extravergine d'oliva",
        "quantity": "2 cucchiai"
      },
      {
        "name": "Sale",
        "quantity": "q.b."
      }
    ]
  },
  {
    "id": "cannelloni-ricotta-e-spinaci",
    "title": "Cannelloni ricotta e spinaci",
    "englishTitle": "Ricotta and spinach cannelloni",
    "aliases": [
      "Ricotta and spinach cannelloni",
      "cannelloni agli spinaci",
      "cannelloni di ricotta e spinaci",
      "spinach cannelloni"
    ],
    "servings": 4,
    "ingredients": [
      {
        "name": "Cannelloni",
        "quantity": "250 g",
        "glutenSwap": "Cannelloni senza glutine"
      },
      {
        "name": "Ricotta",
        "quantity": "400 g",
        "lactoseSwap": "Ricotta senza lattosio"
      },
      {
        "name": "Spinaci",
        "quantity": "500 g"
      },
      {
        "name": "Besciamella",
        "quantity": "500 ml",
        "lactoseSwap": "Besciamella senza lattosio",
        "glutenSwap": "Besciamella senza glutine"
      },
      {
        "name": "Parmigiano grattugiato",
        "quantity": "80 g"
      },
      {
        "name": "Noce moscata",
        "quantity": "q.b."
      },
      {
        "name": "Sale",
        "quantity": "q.b."
      }
    ]
  },
  {
    "id": "lasagne-vegetariane",
    "title": "Lasagne vegetariane",
    "englishTitle": "Vegetarian lasagna",
    "aliases": [
      "Vegetarian lasagna",
      "lasagne alle verdure",
      "vegetable lasagna"
    ],
    "servings": 4,
    "ingredients": [
      {
        "name": "Sfoglia per lasagne",
        "quantity": "250 g",
        "glutenSwap": "Sfoglia per lasagne senza glutine"
      },
      {
        "name": "Zucchine",
        "quantity": "400 g"
      },
      {
        "name": "Carote",
        "quantity": "200 g"
      },
      {
        "name": "Funghi",
        "quantity": "200 g"
      },
      {
        "name": "Besciamella",
        "quantity": "500 ml",
        "lactoseSwap": "Besciamella senza lattosio",
        "glutenSwap": "Besciamella senza glutine"
      },
      {
        "name": "Parmigiano grattugiato",
        "quantity": "80 g"
      },
      {
        "name": "Olio extravergine d'oliva",
        "quantity": "2 cucchiai"
      },
      {
        "name": "Sale",
        "quantity": "q.b."
      }
    ]
  },
  {
    "id": "lasagne-al-pesto",
    "title": "Lasagne al pesto",
    "englishTitle": "Pesto lasagna",
    "aliases": [
      "Pesto lasagna"
    ],
    "servings": 4,
    "ingredients": [
      {
        "name": "Sfoglia per lasagne",
        "quantity": "250 g",
        "glutenSwap": "Sfoglia per lasagne senza glutine"
      },
      {
        "name": "Basilico",
        "quantity": "60 g"
      },
      {
        "name": "Pinoli",
        "quantity": "30 g"
      },
      {
        "name": "Aglio",
        "quantity": "1 spicchio"
      },
      {
        "name": "Olio extravergine d'oliva",
        "quantity": "80 ml"
      },
      {
        "name": "Besciamella",
        "quantity": "500 ml",
        "lactoseSwap": "Besciamella senza lattosio",
        "glutenSwap": "Besciamella senza glutine"
      },
      {
        "name": "Parmigiano grattugiato",
        "quantity": "100 g"
      },
      {
        "name": "Sale",
        "quantity": "q.b."
      }
    ]
  },
  {
    "id": "pasta-al-pomodoro",
    "title": "Pasta al pomodoro",
    "englishTitle": "Pasta with tomato sauce",
    "aliases": [
      "Pasta with tomato sauce",
      "pasta al sugo",
      "spaghetti al pomodoro"
    ],
    "servings": 4,
    "ingredients": [
      {
        "name": "Pasta",
        "quantity": "320 g",
        "glutenSwap": "Pasta senza glutine"
      },
      {
        "name": "Passata di pomodoro",
        "quantity": "500 g"
      },
      {
        "name": "Aglio",
        "quantity": "1 spicchio"
      },
      {
        "name": "Basilico",
        "quantity": "q.b."
      },
      {
        "name": "Olio extravergine d'oliva",
        "quantity": "2 cucchiai"
      },
      {
        "name": "Sale",
        "quantity": "q.b."
      }
    ]
  },
  {
    "id": "pasta-al-rag",
    "title": "Pasta al ragù",
    "englishTitle": "Pasta bolognese",
    "aliases": [
      "Pasta bolognese",
      "pasta al ragu",
      "ragù alla bolognese",
      "ragu alla bolognese",
      "tagliatelle al ragù",
      "spaghetti bolognese"
    ],
    "servings": 4,
    "ingredients": [
      {
        "name": "Pasta",
        "quantity": "320 g",
        "glutenSwap": "Pasta senza glutine"
      },
      {
        "name": "Carne macinata",
        "quantity": "400 g"
      },
      {
        "name": "Passata di pomodoro",
        "quantity": "500 g"
      },
      {
        "name": "Cipolla",
        "quantity": "1"
      },
      {
        "name": "Carota",
        "quantity": "1"
      },
      {
        "name": "Sedano",
        "quantity": "1 costa"
      },
      {
        "name": "Olio extravergine d'oliva",
        "quantity": "2 cucchiai"
      },
      {
        "name": "Sale",
        "quantity": "q.b."
      }
    ]
  },
  {
    "id": "amatriciana",
    "title": "Amatriciana",
    "englishTitle": "Amatriciana",
    "aliases": [
      "Amatriciana",
      "pasta all amatriciana",
      "bucatini all amatriciana"
    ],
    "servings": 4,
    "ingredients": [
      {
        "name": "Bucatini",
        "quantity": "320 g",
        "glutenSwap": "Bucatini senza glutine"
      },
      {
        "name": "Guanciale",
        "quantity": "150 g"
      },
      {
        "name": "Pomodori pelati",
        "quantity": "400 g"
      },
      {
        "name": "Pecorino romano",
        "quantity": "80 g"
      },
      {
        "name": "Peperoncino",
        "quantity": "q.b."
      },
      {
        "name": "Sale",
        "quantity": "q.b."
      }
    ]
  },
  {
    "id": "gricia",
    "title": "Gricia",
    "englishTitle": "Gricia",
    "aliases": [
      "Gricia",
      "pasta alla gricia"
    ],
    "servings": 4,
    "ingredients": [
      {
        "name": "Pasta",
        "quantity": "320 g",
        "glutenSwap": "Pasta senza glutine"
      },
      {
        "name": "Guanciale",
        "quantity": "180 g"
      },
      {
        "name": "Pecorino romano",
        "quantity": "100 g"
      },
      {
        "name": "Pepe nero",
        "quantity": "q.b."
      },
      {
        "name": "Sale",
        "quantity": "q.b."
      }
    ]
  },
  {
    "id": "pasta-al-pesto",
    "title": "Pasta al pesto",
    "englishTitle": "Pasta with pesto",
    "aliases": [
      "Pasta with pesto",
      "pesto alla genovese",
      "pesto pasta"
    ],
    "servings": 4,
    "ingredients": [
      {
        "name": "Pasta",
        "quantity": "320 g",
        "glutenSwap": "Pasta senza glutine"
      },
      {
        "name": "Basilico",
        "quantity": "60 g"
      },
      {
        "name": "Pinoli",
        "quantity": "30 g"
      },
      {
        "name": "Parmigiano grattugiato",
        "quantity": "60 g"
      },
      {
        "name": "Aglio",
        "quantity": "1 spicchio"
      },
      {
        "name": "Olio extravergine d'oliva",
        "quantity": "80 ml"
      },
      {
        "name": "Sale",
        "quantity": "q.b."
      }
    ]
  },
  {
    "id": "pasta-alla-puttanesca",
    "title": "Pasta alla puttanesca",
    "englishTitle": "Puttanesca",
    "aliases": [
      "Puttanesca",
      "spaghetti alla puttanesca"
    ],
    "servings": 4,
    "ingredients": [
      {
        "name": "Spaghetti",
        "quantity": "320 g",
        "glutenSwap": "Spaghetti senza glutine"
      },
      {
        "name": "Pomodori pelati",
        "quantity": "400 g"
      },
      {
        "name": "Olive nere",
        "quantity": "100 g"
      },
      {
        "name": "Capperi",
        "quantity": "30 g"
      },
      {
        "name": "Acciughe",
        "quantity": "30 g"
      },
      {
        "name": "Aglio",
        "quantity": "2 spicchi"
      },
      {
        "name": "Olio extravergine d'oliva",
        "quantity": "2 cucchiai"
      },
      {
        "name": "Sale",
        "quantity": "q.b."
      }
    ]
  },
  {
    "id": "pasta-all-arrabbiata",
    "title": "Pasta all'arrabbiata",
    "englishTitle": "Arrabbiata",
    "aliases": [
      "Arrabbiata",
      "penne all arrabbiata",
      "pasta arrabbiata"
    ],
    "servings": 4,
    "ingredients": [
      {
        "name": "Penne",
        "quantity": "320 g",
        "glutenSwap": "Penne senza glutine"
      },
      {
        "name": "Pomodori pelati",
        "quantity": "400 g"
      },
      {
        "name": "Aglio",
        "quantity": "2 spicchi"
      },
      {
        "name": "Peperoncino",
        "quantity": "q.b."
      },
      {
        "name": "Prezzemolo",
        "quantity": "q.b."
      },
      {
        "name": "Olio extravergine d'oliva",
        "quantity": "2 cucchiai"
      },
      {
        "name": "Sale",
        "quantity": "q.b."
      }
    ]
  },
  {
    "id": "pasta-al-tonno",
    "title": "Pasta al tonno",
    "englishTitle": "Tuna pasta",
    "aliases": [
      "Tuna pasta"
    ],
    "servings": 4,
    "ingredients": [
      {
        "name": "Pasta",
        "quantity": "320 g",
        "glutenSwap": "Pasta senza glutine"
      },
      {
        "name": "Tonno",
        "quantity": "200 g"
      },
      {
        "name": "Passata di pomodoro",
        "quantity": "400 g"
      },
      {
        "name": "Aglio",
        "quantity": "1 spicchio"
      },
      {
        "name": "Olio extravergine d'oliva",
        "quantity": "2 cucchiai"
      },
      {
        "name": "Sale",
        "quantity": "q.b."
      }
    ]
  },
  {
    "id": "pasta-al-salmone",
    "title": "Pasta al salmone",
    "englishTitle": "Salmon pasta",
    "aliases": [
      "Salmon pasta"
    ],
    "servings": 4,
    "ingredients": [
      {
        "name": "Pasta",
        "quantity": "320 g",
        "glutenSwap": "Pasta senza glutine"
      },
      {
        "name": "Salmone",
        "quantity": "250 g"
      },
      {
        "name": "Panna",
        "quantity": "200 ml",
        "lactoseSwap": "Panna senza lattosio"
      },
      {
        "name": "Cipolla",
        "quantity": "1"
      },
      {
        "name": "Olio extravergine d'oliva",
        "quantity": "2 cucchiai"
      },
      {
        "name": "Sale",
        "quantity": "q.b."
      }
    ]
  },
  {
    "id": "pasta-ai-quattro-formaggi",
    "title": "Pasta ai quattro formaggi",
    "englishTitle": "Four cheese pasta",
    "aliases": [
      "Four cheese pasta",
      "pasta quattro formaggi"
    ],
    "servings": 4,
    "ingredients": [
      {
        "name": "Pasta",
        "quantity": "320 g",
        "glutenSwap": "Pasta senza glutine"
      },
      {
        "name": "Gorgonzola",
        "quantity": "100 g",
        "lactoseSwap": "Gorgonzola senza lattosio"
      },
      {
        "name": "Fontina",
        "quantity": "100 g",
        "lactoseSwap": "Fontina senza lattosio"
      },
      {
        "name": "Parmigiano grattugiato",
        "quantity": "60 g"
      },
      {
        "name": "Taleggio",
        "quantity": "100 g",
        "lactoseSwap": "Taleggio senza lattosio"
      },
      {
        "name": "Latte",
        "quantity": "100 ml",
        "lactoseSwap": "Latte senza lattosio"
      },
      {
        "name": "Sale",
        "quantity": "q.b."
      }
    ]
  },
  {
    "id": "spaghetti-alle-vongole",
    "title": "Spaghetti alle vongole",
    "englishTitle": "Spaghetti with clams",
    "aliases": [
      "Spaghetti with clams",
      "pasta alle vongole"
    ],
    "servings": 4,
    "ingredients": [
      {
        "name": "Spaghetti",
        "quantity": "320 g",
        "glutenSwap": "Spaghetti senza glutine"
      },
      {
        "name": "Vongole",
        "quantity": "1000 g"
      },
      {
        "name": "Aglio",
        "quantity": "2 spicchi"
      },
      {
        "name": "Prezzemolo",
        "quantity": "q.b."
      },
      {
        "name": "Olio extravergine d'oliva",
        "quantity": "3 cucchiai"
      },
      {
        "name": "Sale",
        "quantity": "q.b."
      }
    ]
  },
  {
    "id": "pasta-zucchine-e-gamberetti",
    "title": "Pasta zucchine e gamberetti",
    "englishTitle": "Zucchini and shrimp pasta",
    "aliases": [
      "Zucchini and shrimp pasta",
      "pasta gamberi e zucchine"
    ],
    "servings": 4,
    "ingredients": [
      {
        "name": "Pasta",
        "quantity": "320 g",
        "glutenSwap": "Pasta senza glutine"
      },
      {
        "name": "Zucchine",
        "quantity": "300 g"
      },
      {
        "name": "Gamberetti",
        "quantity": "300 g"
      },
      {
        "name": "Aglio",
        "quantity": "1 spicchio"
      },
      {
        "name": "Olio extravergine d'oliva",
        "quantity": "2 cucchiai"
      },
      {
        "name": "Sale",
        "quantity": "q.b."
      }
    ]
  },
  {
    "id": "pasta-e-fagioli",
    "title": "Pasta e fagioli",
    "englishTitle": "Pasta and beans",
    "aliases": [
      "Pasta and beans"
    ],
    "servings": 4,
    "ingredients": [
      {
        "name": "Pasta corta",
        "quantity": "200 g",
        "glutenSwap": "Pasta corta senza glutine"
      },
      {
        "name": "Fagioli cotti",
        "quantity": "500 g"
      },
      {
        "name": "Passata di pomodoro",
        "quantity": "200 g"
      },
      {
        "name": "Cipolla",
        "quantity": "1"
      },
      {
        "name": "Carota",
        "quantity": "1"
      },
      {
        "name": "Sedano",
        "quantity": "1 costa"
      },
      {
        "name": "Olio extravergine d'oliva",
        "quantity": "2 cucchiai"
      },
      {
        "name": "Sale",
        "quantity": "q.b."
      }
    ]
  },
  {
    "id": "pasta-e-ceci",
    "title": "Pasta e ceci",
    "englishTitle": "Pasta and chickpeas",
    "aliases": [
      "Pasta and chickpeas"
    ],
    "servings": 4,
    "ingredients": [
      {
        "name": "Pasta corta",
        "quantity": "200 g",
        "glutenSwap": "Pasta corta senza glutine"
      },
      {
        "name": "Ceci cotti",
        "quantity": "500 g"
      },
      {
        "name": "Rosmarino",
        "quantity": "q.b."
      },
      {
        "name": "Aglio",
        "quantity": "1 spicchio"
      },
      {
        "name": "Passata di pomodoro",
        "quantity": "150 g"
      },
      {
        "name": "Olio extravergine d'oliva",
        "quantity": "2 cucchiai"
      },
      {
        "name": "Sale",
        "quantity": "q.b."
      }
    ]
  },
  {
    "id": "pasta-al-forno",
    "title": "Pasta al forno",
    "englishTitle": "Baked pasta",
    "aliases": [
      "Baked pasta"
    ],
    "servings": 4,
    "ingredients": [
      {
        "name": "Pasta",
        "quantity": "320 g",
        "glutenSwap": "Pasta senza glutine"
      },
      {
        "name": "Carne macinata",
        "quantity": "300 g"
      },
      {
        "name": "Passata di pomodoro",
        "quantity": "500 g"
      },
      {
        "name": "Mozzarella",
        "quantity": "250 g",
        "lactoseSwap": "Mozzarella senza lattosio"
      },
      {
        "name": "Parmigiano grattugiato",
        "quantity": "80 g"
      },
      {
        "name": "Cipolla",
        "quantity": "1"
      },
      {
        "name": "Olio extravergine d'oliva",
        "quantity": "2 cucchiai"
      },
      {
        "name": "Sale",
        "quantity": "q.b."
      }
    ]
  },
  {
    "id": "pasta-fredda",
    "title": "Pasta fredda",
    "englishTitle": "Pasta salad",
    "aliases": [
      "Pasta salad",
      "insalata di pasta"
    ],
    "servings": 4,
    "ingredients": [
      {
        "name": "Pasta",
        "quantity": "320 g",
        "glutenSwap": "Pasta senza glutine"
      },
      {
        "name": "Pomodorini",
        "quantity": "300 g"
      },
      {
        "name": "Mozzarella",
        "quantity": "200 g",
        "lactoseSwap": "Mozzarella senza lattosio"
      },
      {
        "name": "Olive",
        "quantity": "80 g"
      },
      {
        "name": "Basilico",
        "quantity": "q.b."
      },
      {
        "name": "Olio extravergine d'oliva",
        "quantity": "3 cucchiai"
      },
      {
        "name": "Sale",
        "quantity": "q.b."
      }
    ]
  },
  {
    "id": "gnocchi-al-pomodoro",
    "title": "Gnocchi al pomodoro",
    "englishTitle": "Gnocchi with tomato sauce",
    "aliases": [
      "Gnocchi with tomato sauce"
    ],
    "servings": 4,
    "ingredients": [
      {
        "name": "Gnocchi di patate",
        "quantity": "800 g",
        "glutenSwap": "Gnocchi di patate senza glutine"
      },
      {
        "name": "Passata di pomodoro",
        "quantity": "500 g"
      },
      {
        "name": "Basilico",
        "quantity": "q.b."
      },
      {
        "name": "Parmigiano grattugiato",
        "quantity": "60 g"
      },
      {
        "name": "Olio extravergine d'oliva",
        "quantity": "2 cucchiai"
      },
      {
        "name": "Sale",
        "quantity": "q.b."
      }
    ]
  },
  {
    "id": "gnocchi-alla-sorrentina",
    "title": "Gnocchi alla sorrentina",
    "englishTitle": "Sorrentina gnocchi",
    "aliases": [
      "Sorrentina gnocchi"
    ],
    "servings": 4,
    "ingredients": [
      {
        "name": "Gnocchi di patate",
        "quantity": "800 g",
        "glutenSwap": "Gnocchi di patate senza glutine"
      },
      {
        "name": "Passata di pomodoro",
        "quantity": "500 g"
      },
      {
        "name": "Mozzarella",
        "quantity": "250 g",
        "lactoseSwap": "Mozzarella senza lattosio"
      },
      {
        "name": "Parmigiano grattugiato",
        "quantity": "60 g"
      },
      {
        "name": "Basilico",
        "quantity": "q.b."
      },
      {
        "name": "Olio extravergine d'oliva",
        "quantity": "2 cucchiai"
      },
      {
        "name": "Sale",
        "quantity": "q.b."
      }
    ]
  },
  {
    "id": "ravioli-ricotta-e-spinaci",
    "title": "Ravioli ricotta e spinaci",
    "englishTitle": "Ricotta and spinach ravioli",
    "aliases": [
      "Ricotta and spinach ravioli",
      "ravioli agli spinaci"
    ],
    "servings": 4,
    "ingredients": [
      {
        "name": "Farina",
        "quantity": "400 g",
        "glutenSwap": "Farina senza glutine"
      },
      {
        "name": "Uova",
        "quantity": "4"
      },
      {
        "name": "Ricotta",
        "quantity": "300 g",
        "lactoseSwap": "Ricotta senza lattosio"
      },
      {
        "name": "Spinaci",
        "quantity": "400 g"
      },
      {
        "name": "Parmigiano grattugiato",
        "quantity": "60 g"
      },
      {
        "name": "Burro",
        "quantity": "80 g",
        "lactoseSwap": "Burro senza lattosio"
      },
      {
        "name": "Salvia",
        "quantity": "q.b."
      },
      {
        "name": "Sale",
        "quantity": "q.b."
      }
    ]
  },
  {
    "id": "tortellini-in-brodo",
    "title": "Tortellini in brodo",
    "englishTitle": "Tortellini in broth",
    "aliases": [
      "Tortellini in broth"
    ],
    "servings": 4,
    "ingredients": [
      {
        "name": "Tortellini",
        "quantity": "500 g",
        "glutenSwap": "Tortellini senza glutine"
      },
      {
        "name": "Brodo di carne",
        "quantity": "1500 ml"
      },
      {
        "name": "Parmigiano grattugiato",
        "quantity": "60 g"
      }
    ]
  },
  {
    "id": "risotto-alla-milanese",
    "title": "Risotto alla milanese",
    "englishTitle": "Milanese risotto",
    "aliases": [
      "Milanese risotto",
      "risotto allo zafferano",
      "saffron risotto"
    ],
    "servings": 4,
    "ingredients": [
      {
        "name": "Riso per risotti",
        "quantity": "320 g"
      },
      {
        "name": "Zafferano",
        "quantity": "1 bustina"
      },
      {
        "name": "Brodo vegetale",
        "quantity": "1000 ml"
      },
      {
        "name": "Cipolla",
        "quantity": "1"
      },
      {
        "name": "Burro",
        "quantity": "60 g",
        "lactoseSwap": "Burro senza lattosio"
      },
      {
        "name": "Parmigiano grattugiato",
        "quantity": "80 g"
      },
      {
        "name": "Sale",
        "quantity": "q.b."
      }
    ]
  },
  {
    "id": "risotto-ai-funghi",
    "title": "Risotto ai funghi",
    "englishTitle": "Mushroom risotto",
    "aliases": [
      "Mushroom risotto"
    ],
    "servings": 4,
    "ingredients": [
      {
        "name": "Riso per risotti",
        "quantity": "320 g"
      },
      {
        "name": "Funghi",
        "quantity": "400 g"
      },
      {
        "name": "Brodo vegetale",
        "quantity": "1000 ml"
      },
      {
        "name": "Cipolla",
        "quantity": "1"
      },
      {
        "name": "Burro",
        "quantity": "50 g",
        "lactoseSwap": "Burro senza lattosio"
      },
      {
        "name": "Parmigiano grattugiato",
        "quantity": "80 g"
      },
      {
        "name": "Prezzemolo",
        "quantity": "q.b."
      },
      {
        "name": "Sale",
        "quantity": "q.b."
      }
    ]
  },
  {
    "id": "risotto-alla-zucca",
    "title": "Risotto alla zucca",
    "englishTitle": "Pumpkin risotto",
    "aliases": [
      "Pumpkin risotto"
    ],
    "servings": 4,
    "ingredients": [
      {
        "name": "Riso per risotti",
        "quantity": "320 g"
      },
      {
        "name": "Zucca",
        "quantity": "500 g"
      },
      {
        "name": "Brodo vegetale",
        "quantity": "1000 ml"
      },
      {
        "name": "Cipolla",
        "quantity": "1"
      },
      {
        "name": "Burro",
        "quantity": "50 g",
        "lactoseSwap": "Burro senza lattosio"
      },
      {
        "name": "Parmigiano grattugiato",
        "quantity": "80 g"
      },
      {
        "name": "Sale",
        "quantity": "q.b."
      }
    ]
  },
  {
    "id": "risotto-agli-asparagi",
    "title": "Risotto agli asparagi",
    "englishTitle": "Asparagus risotto",
    "aliases": [
      "Asparagus risotto"
    ],
    "servings": 4,
    "ingredients": [
      {
        "name": "Riso per risotti",
        "quantity": "320 g"
      },
      {
        "name": "Asparagi",
        "quantity": "400 g"
      },
      {
        "name": "Brodo vegetale",
        "quantity": "1000 ml"
      },
      {
        "name": "Cipolla",
        "quantity": "1"
      },
      {
        "name": "Burro",
        "quantity": "50 g",
        "lactoseSwap": "Burro senza lattosio"
      },
      {
        "name": "Parmigiano grattugiato",
        "quantity": "80 g"
      },
      {
        "name": "Sale",
        "quantity": "q.b."
      }
    ]
  },
  {
    "id": "risotto-ai-frutti-di-mare",
    "title": "Risotto ai frutti di mare",
    "englishTitle": "Seafood risotto",
    "aliases": [
      "Seafood risotto",
      "risotto alla pescatora"
    ],
    "servings": 4,
    "ingredients": [
      {
        "name": "Riso per risotti",
        "quantity": "320 g"
      },
      {
        "name": "Cozze",
        "quantity": "500 g"
      },
      {
        "name": "Vongole",
        "quantity": "500 g"
      },
      {
        "name": "Gamberetti",
        "quantity": "200 g"
      },
      {
        "name": "Calamari",
        "quantity": "200 g"
      },
      {
        "name": "Brodo di pesce",
        "quantity": "1000 ml"
      },
      {
        "name": "Aglio",
        "quantity": "2 spicchi"
      },
      {
        "name": "Prezzemolo",
        "quantity": "q.b."
      },
      {
        "name": "Olio extravergine d'oliva",
        "quantity": "3 cucchiai"
      },
      {
        "name": "Sale",
        "quantity": "q.b."
      }
    ]
  },
  {
    "id": "insalata-di-riso",
    "title": "Insalata di riso",
    "englishTitle": "Rice salad",
    "aliases": [
      "Rice salad"
    ],
    "servings": 4,
    "ingredients": [
      {
        "name": "Riso",
        "quantity": "320 g"
      },
      {
        "name": "Tonno",
        "quantity": "200 g"
      },
      {
        "name": "Mais",
        "quantity": "150 g"
      },
      {
        "name": "Piselli",
        "quantity": "150 g"
      },
      {
        "name": "Pomodorini",
        "quantity": "200 g"
      },
      {
        "name": "Olive",
        "quantity": "80 g"
      },
      {
        "name": "Olio extravergine d'oliva",
        "quantity": "3 cucchiai"
      },
      {
        "name": "Sale",
        "quantity": "q.b."
      }
    ]
  },
  {
    "id": "polenta",
    "title": "Polenta",
    "englishTitle": "Polenta",
    "aliases": [
      "Polenta"
    ],
    "servings": 4,
    "ingredients": [
      {
        "name": "Farina di mais",
        "quantity": "350 g"
      },
      {
        "name": "Acqua",
        "quantity": "1400 ml"
      },
      {
        "name": "Sale",
        "quantity": "q.b."
      }
    ]
  },
  {
    "id": "polenta-e-funghi",
    "title": "Polenta e funghi",
    "englishTitle": "Polenta with mushrooms",
    "aliases": [
      "Polenta with mushrooms"
    ],
    "servings": 4,
    "ingredients": [
      {
        "name": "Farina di mais",
        "quantity": "350 g"
      },
      {
        "name": "Acqua",
        "quantity": "1400 ml"
      },
      {
        "name": "Funghi",
        "quantity": "500 g"
      },
      {
        "name": "Aglio",
        "quantity": "2 spicchi"
      },
      {
        "name": "Prezzemolo",
        "quantity": "q.b."
      },
      {
        "name": "Olio extravergine d'oliva",
        "quantity": "3 cucchiai"
      },
      {
        "name": "Sale",
        "quantity": "q.b."
      }
    ]
  },
  {
    "id": "minestrone",
    "title": "Minestrone",
    "englishTitle": "Minestrone",
    "aliases": [
      "Minestrone",
      "minestrone di verdure"
    ],
    "servings": 4,
    "ingredients": [
      {
        "name": "Patate",
        "quantity": "300 g"
      },
      {
        "name": "Carote",
        "quantity": "200 g"
      },
      {
        "name": "Zucchine",
        "quantity": "300 g"
      },
      {
        "name": "Fagioli cotti",
        "quantity": "300 g"
      },
      {
        "name": "Cipolla",
        "quantity": "1"
      },
      {
        "name": "Sedano",
        "quantity": "2 coste"
      },
      {
        "name": "Passata di pomodoro",
        "quantity": "200 g"
      },
      {
        "name": "Olio extravergine d'oliva",
        "quantity": "2 cucchiai"
      },
      {
        "name": "Sale",
        "quantity": "q.b."
      }
    ]
  },
  {
    "id": "vellutata-di-zucca",
    "title": "Vellutata di zucca",
    "englishTitle": "Pumpkin soup",
    "aliases": [
      "Pumpkin soup",
      "crema di zucca"
    ],
    "servings": 4,
    "ingredients": [
      {
        "name": "Zucca",
        "quantity": "800 g"
      },
      {
        "name": "Patate",
        "quantity": "300 g"
      },
      {
        "name": "Cipolla",
        "quantity": "1"
      },
      {
        "name": "Brodo vegetale",
        "quantity": "800 ml"
      },
      {
        "name": "Olio extravergine d'oliva",
        "quantity": "2 cucchiai"
      },
      {
        "name": "Sale",
        "quantity": "q.b."
      }
    ]
  },
  {
    "id": "zuppa-di-lenticchie",
    "title": "Zuppa di lenticchie",
    "englishTitle": "Lentil soup",
    "aliases": [
      "Lentil soup"
    ],
    "servings": 4,
    "ingredients": [
      {
        "name": "Lenticchie secche",
        "quantity": "300 g"
      },
      {
        "name": "Carote",
        "quantity": "2"
      },
      {
        "name": "Cipolla",
        "quantity": "1"
      },
      {
        "name": "Sedano",
        "quantity": "1 costa"
      },
      {
        "name": "Passata di pomodoro",
        "quantity": "200 g"
      },
      {
        "name": "Brodo vegetale",
        "quantity": "1000 ml"
      },
      {
        "name": "Olio extravergine d'oliva",
        "quantity": "2 cucchiai"
      },
      {
        "name": "Sale",
        "quantity": "q.b."
      }
    ]
  },
  {
    "id": "ribollita",
    "title": "Ribollita",
    "englishTitle": "Ribollita",
    "aliases": [
      "Ribollita"
    ],
    "servings": 4,
    "ingredients": [
      {
        "name": "Cavolo nero",
        "quantity": "400 g"
      },
      {
        "name": "Fagioli cotti",
        "quantity": "400 g"
      },
      {
        "name": "Pane",
        "quantity": "250 g",
        "glutenSwap": "Pane senza glutine"
      },
      {
        "name": "Carote",
        "quantity": "2"
      },
      {
        "name": "Cipolla",
        "quantity": "1"
      },
      {
        "name": "Sedano",
        "quantity": "1 costa"
      },
      {
        "name": "Passata di pomodoro",
        "quantity": "200 g"
      },
      {
        "name": "Olio extravergine d'oliva",
        "quantity": "3 cucchiai"
      },
      {
        "name": "Sale",
        "quantity": "q.b."
      }
    ]
  },
  {
    "id": "pizza-marinara",
    "title": "Pizza marinara",
    "englishTitle": "Marinara pizza",
    "aliases": [
      "Marinara pizza"
    ],
    "servings": 4,
    "ingredients": [
      {
        "name": "Farina",
        "quantity": "500 g",
        "glutenSwap": "Farina senza glutine"
      },
      {
        "name": "Acqua",
        "quantity": "300 ml"
      },
      {
        "name": "Lievito di birra",
        "quantity": "7 g"
      },
      {
        "name": "Passata di pomodoro",
        "quantity": "300 g"
      },
      {
        "name": "Aglio",
        "quantity": "2 spicchi"
      },
      {
        "name": "Origano",
        "quantity": "q.b."
      },
      {
        "name": "Olio extravergine d'oliva",
        "quantity": "3 cucchiai"
      },
      {
        "name": "Sale",
        "quantity": "10 g"
      }
    ]
  },
  {
    "id": "focaccia",
    "title": "Focaccia",
    "englishTitle": "Focaccia",
    "aliases": [
      "Focaccia",
      "focaccia genovese"
    ],
    "servings": 4,
    "ingredients": [
      {
        "name": "Farina",
        "quantity": "500 g",
        "glutenSwap": "Farina senza glutine"
      },
      {
        "name": "Acqua",
        "quantity": "320 ml"
      },
      {
        "name": "Lievito di birra",
        "quantity": "7 g"
      },
      {
        "name": "Olio extravergine d'oliva",
        "quantity": "80 ml"
      },
      {
        "name": "Sale",
        "quantity": "10 g"
      }
    ]
  },
  {
    "id": "piadina",
    "title": "Piadina",
    "englishTitle": "Piadina",
    "aliases": [
      "Piadina",
      "piadine"
    ],
    "servings": 4,
    "ingredients": [
      {
        "name": "Farina",
        "quantity": "500 g",
        "glutenSwap": "Farina senza glutine"
      },
      {
        "name": "Acqua",
        "quantity": "250 ml"
      },
      {
        "name": "Olio extravergine d'oliva",
        "quantity": "80 ml"
      },
      {
        "name": "Sale",
        "quantity": "8 g"
      }
    ]
  },
  {
    "id": "bruschette-al-pomodoro",
    "title": "Bruschette al pomodoro",
    "englishTitle": "Tomato bruschetta",
    "aliases": [
      "Tomato bruschetta",
      "bruschetta"
    ],
    "servings": 4,
    "ingredients": [
      {
        "name": "Pane",
        "quantity": "300 g",
        "glutenSwap": "Pane senza glutine"
      },
      {
        "name": "Pomodori",
        "quantity": "400 g"
      },
      {
        "name": "Aglio",
        "quantity": "1 spicchio"
      },
      {
        "name": "Basilico",
        "quantity": "q.b."
      },
      {
        "name": "Olio extravergine d'oliva",
        "quantity": "3 cucchiai"
      },
      {
        "name": "Sale",
        "quantity": "q.b."
      }
    ]
  },
  {
    "id": "polpette-al-sugo",
    "title": "Polpette al sugo",
    "englishTitle": "Meatballs in tomato sauce",
    "aliases": [
      "Meatballs in tomato sauce",
      "polpette",
      "meatballs"
    ],
    "servings": 4,
    "ingredients": [
      {
        "name": "Carne macinata",
        "quantity": "500 g"
      },
      {
        "name": "Uova",
        "quantity": "1"
      },
      {
        "name": "Pangrattato",
        "quantity": "80 g",
        "glutenSwap": "Pangrattato senza glutine"
      },
      {
        "name": "Parmigiano grattugiato",
        "quantity": "50 g"
      },
      {
        "name": "Passata di pomodoro",
        "quantity": "500 g"
      },
      {
        "name": "Aglio",
        "quantity": "1 spicchio"
      },
      {
        "name": "Prezzemolo",
        "quantity": "q.b."
      },
      {
        "name": "Olio extravergine d'oliva",
        "quantity": "2 cucchiai"
      },
      {
        "name": "Sale",
        "quantity": "q.b."
      }
    ]
  },
  {
    "id": "polpette-di-zucchine",
    "title": "Polpette di zucchine",
    "englishTitle": "Zucchini patties",
    "aliases": [
      "Zucchini patties"
    ],
    "servings": 4,
    "ingredients": [
      {
        "name": "Zucchine",
        "quantity": "600 g"
      },
      {
        "name": "Uova",
        "quantity": "2"
      },
      {
        "name": "Pangrattato",
        "quantity": "100 g",
        "glutenSwap": "Pangrattato senza glutine"
      },
      {
        "name": "Parmigiano grattugiato",
        "quantity": "60 g"
      },
      {
        "name": "Olio extravergine d'oliva",
        "quantity": "3 cucchiai"
      },
      {
        "name": "Sale",
        "quantity": "q.b."
      }
    ]
  },
  {
    "id": "polpettone",
    "title": "Polpettone",
    "englishTitle": "Meatloaf",
    "aliases": [
      "Meatloaf"
    ],
    "servings": 4,
    "ingredients": [
      {
        "name": "Carne macinata",
        "quantity": "700 g"
      },
      {
        "name": "Uova",
        "quantity": "2"
      },
      {
        "name": "Pangrattato",
        "quantity": "100 g",
        "glutenSwap": "Pangrattato senza glutine"
      },
      {
        "name": "Parmigiano grattugiato",
        "quantity": "60 g"
      },
      {
        "name": "Latte",
        "quantity": "100 ml",
        "lactoseSwap": "Latte senza lattosio"
      },
      {
        "name": "Prezzemolo",
        "quantity": "q.b."
      },
      {
        "name": "Sale",
        "quantity": "q.b."
      }
    ]
  },
  {
    "id": "cotoletta-alla-milanese",
    "title": "Cotoletta alla milanese",
    "englishTitle": "Milanese cutlet",
    "aliases": [
      "Milanese cutlet",
      "cotoletta",
      "cotolette"
    ],
    "servings": 4,
    "ingredients": [
      {
        "name": "Fettine di vitello",
        "quantity": "600 g"
      },
      {
        "name": "Uova",
        "quantity": "2"
      },
      {
        "name": "Pangrattato",
        "quantity": "150 g",
        "glutenSwap": "Pangrattato senza glutine"
      },
      {
        "name": "Burro",
        "quantity": "120 g",
        "lactoseSwap": "Burro senza lattosio"
      },
      {
        "name": "Sale",
        "quantity": "q.b."
      }
    ]
  },
  {
    "id": "scaloppine-al-limone",
    "title": "Scaloppine al limone",
    "englishTitle": "Lemon escalopes",
    "aliases": [
      "Lemon escalopes",
      "scaloppine"
    ],
    "servings": 4,
    "ingredients": [
      {
        "name": "Fettine di vitello",
        "quantity": "600 g"
      },
      {
        "name": "Farina",
        "quantity": "60 g",
        "glutenSwap": "Farina senza glutine"
      },
      {
        "name": "Limone",
        "quantity": "2"
      },
      {
        "name": "Burro",
        "quantity": "50 g",
        "lactoseSwap": "Burro senza lattosio"
      },
      {
        "name": "Sale",
        "quantity": "q.b."
      }
    ]
  },
  {
    "id": "saltimbocca-alla-romana",
    "title": "Saltimbocca alla romana",
    "englishTitle": "Saltimbocca",
    "aliases": [
      "Saltimbocca"
    ],
    "servings": 4,
    "ingredients": [
      {
        "name": "Fettine di vitello",
        "quantity": "600 g"
      },
      {
        "name": "Prosciutto crudo",
        "quantity": "100 g"
      },
      {
        "name": "Salvia",
        "quantity": "q.b."
      },
      {
        "name": "Burro",
        "quantity": "50 g",
        "lactoseSwap": "Burro senza lattosio"
      },
      {
        "name": "Vino bianco",
        "quantity": "100 ml"
      },
      {
        "name": "Sale",
        "quantity": "q.b."
      }
    ]
  },
  {
    "id": "spezzatino-con-patate",
    "title": "Spezzatino con patate",
    "englishTitle": "Beef and potato stew",
    "aliases": [
      "Beef and potato stew",
      "spezzatino"
    ],
    "servings": 4,
    "ingredients": [
      {
        "name": "Carne di manzo",
        "quantity": "700 g"
      },
      {
        "name": "Patate",
        "quantity": "600 g"
      },
      {
        "name": "Carote",
        "quantity": "2"
      },
      {
        "name": "Cipolla",
        "quantity": "1"
      },
      {
        "name": "Sedano",
        "quantity": "1 costa"
      },
      {
        "name": "Passata di pomodoro",
        "quantity": "300 g"
      },
      {
        "name": "Brodo di carne",
        "quantity": "500 ml"
      },
      {
        "name": "Olio extravergine d'oliva",
        "quantity": "3 cucchiai"
      },
      {
        "name": "Sale",
        "quantity": "q.b."
      }
    ]
  },
  {
    "id": "ossobuco",
    "title": "Ossobuco",
    "englishTitle": "Ossobuco",
    "aliases": [
      "Ossobuco",
      "ossobuchi"
    ],
    "servings": 4,
    "ingredients": [
      {
        "name": "Ossobuchi di vitello",
        "quantity": "4"
      },
      {
        "name": "Farina",
        "quantity": "50 g",
        "glutenSwap": "Farina senza glutine"
      },
      {
        "name": "Cipolla",
        "quantity": "1"
      },
      {
        "name": "Carota",
        "quantity": "1"
      },
      {
        "name": "Sedano",
        "quantity": "1 costa"
      },
      {
        "name": "Brodo di carne",
        "quantity": "500 ml"
      },
      {
        "name": "Limone",
        "quantity": "1"
      },
      {
        "name": "Prezzemolo",
        "quantity": "q.b."
      },
      {
        "name": "Burro",
        "quantity": "50 g",
        "lactoseSwap": "Burro senza lattosio"
      },
      {
        "name": "Sale",
        "quantity": "q.b."
      }
    ]
  },
  {
    "id": "brasato",
    "title": "Brasato",
    "englishTitle": "Braised beef",
    "aliases": [
      "Braised beef",
      "brasato al vino rosso"
    ],
    "servings": 4,
    "ingredients": [
      {
        "name": "Carne di manzo",
        "quantity": "800 g"
      },
      {
        "name": "Vino rosso",
        "quantity": "500 ml"
      },
      {
        "name": "Carote",
        "quantity": "2"
      },
      {
        "name": "Cipolla",
        "quantity": "1"
      },
      {
        "name": "Sedano",
        "quantity": "2 coste"
      },
      {
        "name": "Alloro",
        "quantity": "q.b."
      },
      {
        "name": "Olio extravergine d'oliva",
        "quantity": "3 cucchiai"
      },
      {
        "name": "Sale",
        "quantity": "q.b."
      }
    ]
  },
  {
    "id": "arrosto-di-vitello",
    "title": "Arrosto di vitello",
    "englishTitle": "Roast veal",
    "aliases": [
      "Roast veal",
      "arrosto"
    ],
    "servings": 4,
    "ingredients": [
      {
        "name": "Carne di vitello",
        "quantity": "800 g"
      },
      {
        "name": "Rosmarino",
        "quantity": "q.b."
      },
      {
        "name": "Aglio",
        "quantity": "2 spicchi"
      },
      {
        "name": "Brodo di carne",
        "quantity": "300 ml"
      },
      {
        "name": "Olio extravergine d'oliva",
        "quantity": "3 cucchiai"
      },
      {
        "name": "Sale",
        "quantity": "q.b."
      }
    ]
  },
  {
    "id": "pollo-al-forno-con-patate",
    "title": "Pollo al forno con patate",
    "englishTitle": "Roast chicken with potatoes",
    "aliases": [
      "Roast chicken with potatoes",
      "pollo arrosto",
      "roast chicken"
    ],
    "servings": 4,
    "ingredients": [
      {
        "name": "Pollo",
        "quantity": "1000 g"
      },
      {
        "name": "Patate",
        "quantity": "800 g"
      },
      {
        "name": "Rosmarino",
        "quantity": "q.b."
      },
      {
        "name": "Aglio",
        "quantity": "2 spicchi"
      },
      {
        "name": "Olio extravergine d'oliva",
        "quantity": "3 cucchiai"
      },
      {
        "name": "Sale",
        "quantity": "q.b."
      }
    ]
  },
  {
    "id": "pollo-alla-cacciatora",
    "title": "Pollo alla cacciatora",
    "englishTitle": "Chicken cacciatore",
    "aliases": [
      "Chicken cacciatore"
    ],
    "servings": 4,
    "ingredients": [
      {
        "name": "Pollo",
        "quantity": "1000 g"
      },
      {
        "name": "Pomodori pelati",
        "quantity": "400 g"
      },
      {
        "name": "Cipolla",
        "quantity": "1"
      },
      {
        "name": "Carota",
        "quantity": "1"
      },
      {
        "name": "Sedano",
        "quantity": "1 costa"
      },
      {
        "name": "Olive",
        "quantity": "100 g"
      },
      {
        "name": "Vino rosso",
        "quantity": "100 ml"
      },
      {
        "name": "Olio extravergine d'oliva",
        "quantity": "3 cucchiai"
      },
      {
        "name": "Sale",
        "quantity": "q.b."
      }
    ]
  },
  {
    "id": "pollo-al-curry",
    "title": "Pollo al curry",
    "englishTitle": "Chicken curry",
    "aliases": [
      "Chicken curry"
    ],
    "servings": 4,
    "ingredients": [
      {
        "name": "Petto di pollo",
        "quantity": "600 g"
      },
      {
        "name": "Latte di cocco",
        "quantity": "400 ml"
      },
      {
        "name": "Cipolla",
        "quantity": "1"
      },
      {
        "name": "Curry",
        "quantity": "2 cucchiaini"
      },
      {
        "name": "Riso",
        "quantity": "280 g"
      },
      {
        "name": "Olio extravergine d'oliva",
        "quantity": "2 cucchiai"
      },
      {
        "name": "Sale",
        "quantity": "q.b."
      }
    ]
  },
  {
    "id": "pollo-alle-mandorle",
    "title": "Pollo alle mandorle",
    "englishTitle": "Almond chicken",
    "aliases": [
      "Almond chicken"
    ],
    "servings": 4,
    "ingredients": [
      {
        "name": "Petto di pollo",
        "quantity": "600 g"
      },
      {
        "name": "Mandorle",
        "quantity": "100 g"
      },
      {
        "name": "Salsa di soia",
        "quantity": "50 ml",
        "glutenSwap": "Salsa di soia senza glutine"
      },
      {
        "name": "Zenzero",
        "quantity": "q.b."
      },
      {
        "name": "Amido di mais",
        "quantity": "30 g"
      },
      {
        "name": "Olio di semi",
        "quantity": "2 cucchiai"
      }
    ]
  },
  {
    "id": "frittata",
    "title": "Frittata",
    "englishTitle": "Omelette",
    "aliases": [
      "Omelette",
      "omelet",
      "frittata semplice"
    ],
    "servings": 4,
    "ingredients": [
      {
        "name": "Uova",
        "quantity": "8"
      },
      {
        "name": "Parmigiano grattugiato",
        "quantity": "50 g"
      },
      {
        "name": "Olio extravergine d'oliva",
        "quantity": "2 cucchiai"
      },
      {
        "name": "Sale",
        "quantity": "q.b."
      },
      {
        "name": "Pepe nero",
        "quantity": "q.b."
      }
    ]
  },
  {
    "id": "frittata-di-zucchine",
    "title": "Frittata di zucchine",
    "englishTitle": "Zucchini omelette",
    "aliases": [
      "Zucchini omelette"
    ],
    "servings": 4,
    "ingredients": [
      {
        "name": "Uova",
        "quantity": "6"
      },
      {
        "name": "Zucchine",
        "quantity": "400 g"
      },
      {
        "name": "Parmigiano grattugiato",
        "quantity": "50 g"
      },
      {
        "name": "Olio extravergine d'oliva",
        "quantity": "2 cucchiai"
      },
      {
        "name": "Sale",
        "quantity": "q.b."
      }
    ]
  },
  {
    "id": "uova-strapazzate",
    "title": "Uova strapazzate",
    "englishTitle": "Scrambled eggs",
    "aliases": [
      "Scrambled eggs"
    ],
    "servings": 4,
    "ingredients": [
      {
        "name": "Uova",
        "quantity": "8"
      },
      {
        "name": "Burro",
        "quantity": "30 g",
        "lactoseSwap": "Burro senza lattosio"
      },
      {
        "name": "Sale",
        "quantity": "q.b."
      },
      {
        "name": "Pepe nero",
        "quantity": "q.b."
      }
    ]
  },
  {
    "id": "parmigiana-di-melanzane",
    "title": "Parmigiana di melanzane",
    "englishTitle": "Eggplant parmesan",
    "aliases": [
      "Eggplant parmesan",
      "parmigiana",
      "melanzane alla parmigiana"
    ],
    "servings": 4,
    "ingredients": [
      {
        "name": "Melanzane",
        "quantity": "1000 g"
      },
      {
        "name": "Passata di pomodoro",
        "quantity": "700 g"
      },
      {
        "name": "Mozzarella",
        "quantity": "300 g",
        "lactoseSwap": "Mozzarella senza lattosio"
      },
      {
        "name": "Parmigiano grattugiato",
        "quantity": "100 g"
      },
      {
        "name": "Basilico",
        "quantity": "q.b."
      },
      {
        "name": "Olio per friggere",
        "quantity": "q.b."
      },
      {
        "name": "Sale",
        "quantity": "q.b."
      }
    ]
  },
  {
    "id": "peperoni-ripieni",
    "title": "Peperoni ripieni",
    "englishTitle": "Stuffed peppers",
    "aliases": [
      "Stuffed peppers"
    ],
    "servings": 4,
    "ingredients": [
      {
        "name": "Peperoni",
        "quantity": "4"
      },
      {
        "name": "Carne macinata",
        "quantity": "400 g"
      },
      {
        "name": "Pane",
        "quantity": "100 g",
        "glutenSwap": "Pane senza glutine"
      },
      {
        "name": "Uova",
        "quantity": "1"
      },
      {
        "name": "Parmigiano grattugiato",
        "quantity": "50 g"
      },
      {
        "name": "Prezzemolo",
        "quantity": "q.b."
      },
      {
        "name": "Olio extravergine d'oliva",
        "quantity": "2 cucchiai"
      },
      {
        "name": "Sale",
        "quantity": "q.b."
      }
    ]
  },
  {
    "id": "zucchine-ripiene",
    "title": "Zucchine ripiene",
    "englishTitle": "Stuffed zucchini",
    "aliases": [
      "Stuffed zucchini"
    ],
    "servings": 4,
    "ingredients": [
      {
        "name": "Zucchine",
        "quantity": "4"
      },
      {
        "name": "Carne macinata",
        "quantity": "350 g"
      },
      {
        "name": "Pangrattato",
        "quantity": "60 g",
        "glutenSwap": "Pangrattato senza glutine"
      },
      {
        "name": "Uova",
        "quantity": "1"
      },
      {
        "name": "Parmigiano grattugiato",
        "quantity": "50 g"
      },
      {
        "name": "Olio extravergine d'oliva",
        "quantity": "2 cucchiai"
      },
      {
        "name": "Sale",
        "quantity": "q.b."
      }
    ]
  },
  {
    "id": "insalata-caprese",
    "title": "Insalata caprese",
    "englishTitle": "Caprese salad",
    "aliases": [
      "Caprese salad",
      "caprese"
    ],
    "servings": 4,
    "ingredients": [
      {
        "name": "Pomodori",
        "quantity": "600 g"
      },
      {
        "name": "Mozzarella",
        "quantity": "400 g",
        "lactoseSwap": "Mozzarella senza lattosio"
      },
      {
        "name": "Basilico",
        "quantity": "q.b."
      },
      {
        "name": "Olio extravergine d'oliva",
        "quantity": "3 cucchiai"
      },
      {
        "name": "Sale",
        "quantity": "q.b."
      }
    ]
  },
  {
    "id": "insalata-greca",
    "title": "Insalata greca",
    "englishTitle": "Greek salad",
    "aliases": [
      "Greek salad"
    ],
    "servings": 4,
    "ingredients": [
      {
        "name": "Pomodori",
        "quantity": "400 g"
      },
      {
        "name": "Cetrioli",
        "quantity": "2"
      },
      {
        "name": "Feta",
        "quantity": "200 g",
        "lactoseSwap": "Feta senza lattosio"
      },
      {
        "name": "Olive nere",
        "quantity": "100 g"
      },
      {
        "name": "Cipolla rossa",
        "quantity": "1"
      },
      {
        "name": "Origano",
        "quantity": "q.b."
      },
      {
        "name": "Olio extravergine d'oliva",
        "quantity": "3 cucchiai"
      },
      {
        "name": "Sale",
        "quantity": "q.b."
      }
    ]
  },
  {
    "id": "insalata-di-pollo",
    "title": "Insalata di pollo",
    "englishTitle": "Chicken salad",
    "aliases": [
      "Chicken salad"
    ],
    "servings": 4,
    "ingredients": [
      {
        "name": "Petto di pollo",
        "quantity": "500 g"
      },
      {
        "name": "Lattuga",
        "quantity": "200 g"
      },
      {
        "name": "Carote",
        "quantity": "2"
      },
      {
        "name": "Pomodorini",
        "quantity": "200 g"
      },
      {
        "name": "Olio extravergine d'oliva",
        "quantity": "3 cucchiai"
      },
      {
        "name": "Limone",
        "quantity": "1"
      },
      {
        "name": "Sale",
        "quantity": "q.b."
      }
    ]
  },
  {
    "id": "orata-al-forno",
    "title": "Orata al forno",
    "englishTitle": "Baked sea bream",
    "aliases": [
      "Baked sea bream"
    ],
    "servings": 4,
    "ingredients": [
      {
        "name": "Orata",
        "quantity": "1200 g"
      },
      {
        "name": "Patate",
        "quantity": "600 g"
      },
      {
        "name": "Limone",
        "quantity": "1"
      },
      {
        "name": "Aglio",
        "quantity": "2 spicchi"
      },
      {
        "name": "Prezzemolo",
        "quantity": "q.b."
      },
      {
        "name": "Olio extravergine d'oliva",
        "quantity": "3 cucchiai"
      },
      {
        "name": "Sale",
        "quantity": "q.b."
      }
    ]
  },
  {
    "id": "salmone-al-forno",
    "title": "Salmone al forno",
    "englishTitle": "Baked salmon",
    "aliases": [
      "Baked salmon"
    ],
    "servings": 4,
    "ingredients": [
      {
        "name": "Filetti di salmone",
        "quantity": "600 g"
      },
      {
        "name": "Limone",
        "quantity": "1"
      },
      {
        "name": "Olio extravergine d'oliva",
        "quantity": "2 cucchiai"
      },
      {
        "name": "Prezzemolo",
        "quantity": "q.b."
      },
      {
        "name": "Sale",
        "quantity": "q.b."
      }
    ]
  },
  {
    "id": "merluzzo-al-pomodoro",
    "title": "Merluzzo al pomodoro",
    "englishTitle": "Cod in tomato sauce",
    "aliases": [
      "Cod in tomato sauce"
    ],
    "servings": 4,
    "ingredients": [
      {
        "name": "Merluzzo",
        "quantity": "700 g"
      },
      {
        "name": "Passata di pomodoro",
        "quantity": "400 g"
      },
      {
        "name": "Olive",
        "quantity": "80 g"
      },
      {
        "name": "Aglio",
        "quantity": "2 spicchi"
      },
      {
        "name": "Olio extravergine d'oliva",
        "quantity": "3 cucchiai"
      },
      {
        "name": "Sale",
        "quantity": "q.b."
      }
    ]
  },
  {
    "id": "calamari-ripieni",
    "title": "Calamari ripieni",
    "englishTitle": "Stuffed squid",
    "aliases": [
      "Stuffed squid"
    ],
    "servings": 4,
    "ingredients": [
      {
        "name": "Calamari",
        "quantity": "800 g"
      },
      {
        "name": "Pangrattato",
        "quantity": "100 g",
        "glutenSwap": "Pangrattato senza glutine"
      },
      {
        "name": "Uova",
        "quantity": "1"
      },
      {
        "name": "Aglio",
        "quantity": "1 spicchio"
      },
      {
        "name": "Prezzemolo",
        "quantity": "q.b."
      },
      {
        "name": "Olio extravergine d'oliva",
        "quantity": "3 cucchiai"
      },
      {
        "name": "Sale",
        "quantity": "q.b."
      }
    ]
  },
  {
    "id": "frittura-di-pesce",
    "title": "Frittura di pesce",
    "englishTitle": "Fried seafood",
    "aliases": [
      "Fried seafood"
    ],
    "servings": 4,
    "ingredients": [
      {
        "name": "Calamari",
        "quantity": "500 g"
      },
      {
        "name": "Gamberetti",
        "quantity": "400 g"
      },
      {
        "name": "Farina",
        "quantity": "150 g",
        "glutenSwap": "Farina senza glutine"
      },
      {
        "name": "Olio per friggere",
        "quantity": "1000 ml"
      },
      {
        "name": "Limone",
        "quantity": "1"
      },
      {
        "name": "Sale",
        "quantity": "q.b."
      }
    ]
  },
  {
    "id": "cozze-alla-marinara",
    "title": "Cozze alla marinara",
    "englishTitle": "Mussels marinara",
    "aliases": [
      "Mussels marinara"
    ],
    "servings": 4,
    "ingredients": [
      {
        "name": "Cozze",
        "quantity": "1500 g"
      },
      {
        "name": "Aglio",
        "quantity": "2 spicchi"
      },
      {
        "name": "Prezzemolo",
        "quantity": "q.b."
      },
      {
        "name": "Vino bianco",
        "quantity": "150 ml"
      },
      {
        "name": "Olio extravergine d'oliva",
        "quantity": "3 cucchiai"
      }
    ]
  },
  {
    "id": "zuppa-di-pesce",
    "title": "Zuppa di pesce",
    "englishTitle": "Fish soup",
    "aliases": [
      "Fish soup"
    ],
    "servings": 4,
    "ingredients": [
      {
        "name": "Pesce misto per zuppa",
        "quantity": "1000 g"
      },
      {
        "name": "Cozze",
        "quantity": "500 g"
      },
      {
        "name": "Pomodori pelati",
        "quantity": "500 g"
      },
      {
        "name": "Aglio",
        "quantity": "2 spicchi"
      },
      {
        "name": "Prezzemolo",
        "quantity": "q.b."
      },
      {
        "name": "Pane",
        "quantity": "300 g",
        "glutenSwap": "Pane senza glutine"
      },
      {
        "name": "Olio extravergine d'oliva",
        "quantity": "3 cucchiai"
      },
      {
        "name": "Sale",
        "quantity": "q.b."
      }
    ]
  },
  {
    "id": "patate-al-forno",
    "title": "Patate al forno",
    "englishTitle": "Roast potatoes",
    "aliases": [
      "Roast potatoes"
    ],
    "servings": 4,
    "ingredients": [
      {
        "name": "Patate",
        "quantity": "1000 g"
      },
      {
        "name": "Rosmarino",
        "quantity": "q.b."
      },
      {
        "name": "Aglio",
        "quantity": "2 spicchi"
      },
      {
        "name": "Olio extravergine d'oliva",
        "quantity": "4 cucchiai"
      },
      {
        "name": "Sale",
        "quantity": "q.b."
      }
    ]
  },
  {
    "id": "pur-di-patate",
    "title": "Purè di patate",
    "englishTitle": "Mashed potatoes",
    "aliases": [
      "Mashed potatoes",
      "pure di patate"
    ],
    "servings": 4,
    "ingredients": [
      {
        "name": "Patate",
        "quantity": "1000 g"
      },
      {
        "name": "Latte",
        "quantity": "250 ml",
        "lactoseSwap": "Latte senza lattosio"
      },
      {
        "name": "Burro",
        "quantity": "60 g",
        "lactoseSwap": "Burro senza lattosio"
      },
      {
        "name": "Noce moscata",
        "quantity": "q.b."
      },
      {
        "name": "Sale",
        "quantity": "q.b."
      }
    ]
  },
  {
    "id": "verdure-grigliate",
    "title": "Verdure grigliate",
    "englishTitle": "Grilled vegetables",
    "aliases": [
      "Grilled vegetables"
    ],
    "servings": 4,
    "ingredients": [
      {
        "name": "Zucchine",
        "quantity": "400 g"
      },
      {
        "name": "Melanzane",
        "quantity": "400 g"
      },
      {
        "name": "Peperoni",
        "quantity": "2"
      },
      {
        "name": "Olio extravergine d'oliva",
        "quantity": "3 cucchiai"
      },
      {
        "name": "Sale",
        "quantity": "q.b."
      }
    ]
  },
  {
    "id": "caponata",
    "title": "Caponata",
    "englishTitle": "Caponata",
    "aliases": [
      "Caponata"
    ],
    "servings": 4,
    "ingredients": [
      {
        "name": "Melanzane",
        "quantity": "700 g"
      },
      {
        "name": "Passata di pomodoro",
        "quantity": "300 g"
      },
      {
        "name": "Sedano",
        "quantity": "2 coste"
      },
      {
        "name": "Cipolla",
        "quantity": "1"
      },
      {
        "name": "Olive",
        "quantity": "100 g"
      },
      {
        "name": "Capperi",
        "quantity": "30 g"
      },
      {
        "name": "Aceto",
        "quantity": "50 ml"
      },
      {
        "name": "Zucchero",
        "quantity": "20 g"
      },
      {
        "name": "Olio extravergine d'oliva",
        "quantity": "4 cucchiai"
      },
      {
        "name": "Sale",
        "quantity": "q.b."
      }
    ]
  },
  {
    "id": "hummus",
    "title": "Hummus",
    "englishTitle": "Hummus",
    "aliases": [
      "Hummus"
    ],
    "servings": 4,
    "ingredients": [
      {
        "name": "Ceci cotti",
        "quantity": "500 g"
      },
      {
        "name": "Tahina",
        "quantity": "60 g"
      },
      {
        "name": "Limone",
        "quantity": "1"
      },
      {
        "name": "Aglio",
        "quantity": "1 spicchio"
      },
      {
        "name": "Olio extravergine d'oliva",
        "quantity": "3 cucchiai"
      },
      {
        "name": "Cumino",
        "quantity": "q.b."
      },
      {
        "name": "Sale",
        "quantity": "q.b."
      }
    ]
  },
  {
    "id": "falafel",
    "title": "Falafel",
    "englishTitle": "Falafel",
    "aliases": [
      "Falafel"
    ],
    "servings": 4,
    "ingredients": [
      {
        "name": "Ceci secchi",
        "quantity": "300 g"
      },
      {
        "name": "Cipolla",
        "quantity": "1"
      },
      {
        "name": "Aglio",
        "quantity": "2 spicchi"
      },
      {
        "name": "Prezzemolo",
        "quantity": "q.b."
      },
      {
        "name": "Cumino",
        "quantity": "1 cucchiaino"
      },
      {
        "name": "Olio per friggere",
        "quantity": "q.b."
      },
      {
        "name": "Sale",
        "quantity": "q.b."
      }
    ]
  },
  {
    "id": "cous-cous-alle-verdure",
    "title": "Cous cous alle verdure",
    "englishTitle": "Vegetable couscous",
    "aliases": [
      "Vegetable couscous",
      "couscous alle verdure",
      "cous cous"
    ],
    "servings": 4,
    "ingredients": [
      {
        "name": "Cous cous",
        "quantity": "300 g",
        "glutenSwap": "Cous cous senza glutine"
      },
      {
        "name": "Zucchine",
        "quantity": "300 g"
      },
      {
        "name": "Carote",
        "quantity": "200 g"
      },
      {
        "name": "Peperoni",
        "quantity": "2"
      },
      {
        "name": "Ceci cotti",
        "quantity": "300 g"
      },
      {
        "name": "Brodo vegetale",
        "quantity": "350 ml"
      },
      {
        "name": "Olio extravergine d'oliva",
        "quantity": "3 cucchiai"
      },
      {
        "name": "Sale",
        "quantity": "q.b."
      }
    ]
  },
  {
    "id": "paella",
    "title": "Paella",
    "englishTitle": "Paella",
    "aliases": [
      "Paella",
      "paella mista"
    ],
    "servings": 4,
    "ingredients": [
      {
        "name": "Riso",
        "quantity": "320 g"
      },
      {
        "name": "Pollo",
        "quantity": "400 g"
      },
      {
        "name": "Gamberetti",
        "quantity": "300 g"
      },
      {
        "name": "Cozze",
        "quantity": "500 g"
      },
      {
        "name": "Piselli",
        "quantity": "150 g"
      },
      {
        "name": "Peperoni",
        "quantity": "1"
      },
      {
        "name": "Pomodori pelati",
        "quantity": "300 g"
      },
      {
        "name": "Zafferano",
        "quantity": "1 bustina"
      },
      {
        "name": "Brodo vegetale",
        "quantity": "1000 ml"
      },
      {
        "name": "Olio extravergine d'oliva",
        "quantity": "3 cucchiai"
      },
      {
        "name": "Sale",
        "quantity": "q.b."
      }
    ]
  },
  {
    "id": "riso-alla-cantonese",
    "title": "Riso alla cantonese",
    "englishTitle": "Cantonese fried rice",
    "aliases": [
      "Cantonese fried rice",
      "riso cantonese",
      "fried rice"
    ],
    "servings": 4,
    "ingredients": [
      {
        "name": "Riso",
        "quantity": "320 g"
      },
      {
        "name": "Uova",
        "quantity": "3"
      },
      {
        "name": "Piselli",
        "quantity": "150 g"
      },
      {
        "name": "Prosciutto cotto",
        "quantity": "150 g"
      },
      {
        "name": "Salsa di soia",
        "quantity": "40 ml",
        "glutenSwap": "Salsa di soia senza glutine"
      },
      {
        "name": "Olio di semi",
        "quantity": "3 cucchiai"
      }
    ]
  },
  {
    "id": "chili-con-carne",
    "title": "Chili con carne",
    "englishTitle": "Chili con carne",
    "aliases": [
      "Chili con carne"
    ],
    "servings": 4,
    "ingredients": [
      {
        "name": "Carne macinata",
        "quantity": "500 g"
      },
      {
        "name": "Fagioli cotti",
        "quantity": "400 g"
      },
      {
        "name": "Pomodori pelati",
        "quantity": "400 g"
      },
      {
        "name": "Cipolla",
        "quantity": "1"
      },
      {
        "name": "Peperoni",
        "quantity": "1"
      },
      {
        "name": "Cumino",
        "quantity": "1 cucchiaino"
      },
      {
        "name": "Peperoncino",
        "quantity": "q.b."
      },
      {
        "name": "Olio extravergine d'oliva",
        "quantity": "2 cucchiai"
      },
      {
        "name": "Sale",
        "quantity": "q.b."
      }
    ]
  },
  {
    "id": "tacos-di-carne",
    "title": "Tacos di carne",
    "englishTitle": "Beef tacos",
    "aliases": [
      "Beef tacos",
      "tacos"
    ],
    "servings": 4,
    "ingredients": [
      {
        "name": "Tortillas di mais",
        "quantity": "8"
      },
      {
        "name": "Carne macinata",
        "quantity": "500 g"
      },
      {
        "name": "Lattuga",
        "quantity": "150 g"
      },
      {
        "name": "Pomodori",
        "quantity": "300 g"
      },
      {
        "name": "Cipolla",
        "quantity": "1"
      },
      {
        "name": "Avocado",
        "quantity": "1"
      },
      {
        "name": "Lime",
        "quantity": "1"
      },
      {
        "name": "Cumino",
        "quantity": "q.b."
      },
      {
        "name": "Olio extravergine d'oliva",
        "quantity": "2 cucchiai"
      },
      {
        "name": "Sale",
        "quantity": "q.b."
      }
    ]
  },
  {
    "id": "guacamole",
    "title": "Guacamole",
    "englishTitle": "Guacamole",
    "aliases": [
      "Guacamole"
    ],
    "servings": 4,
    "ingredients": [
      {
        "name": "Avocado",
        "quantity": "2"
      },
      {
        "name": "Pomodoro",
        "quantity": "1"
      },
      {
        "name": "Cipolla",
        "quantity": "1"
      },
      {
        "name": "Lime",
        "quantity": "1"
      },
      {
        "name": "Coriandolo",
        "quantity": "q.b."
      },
      {
        "name": "Sale",
        "quantity": "q.b."
      }
    ]
  },
  {
    "id": "hamburger",
    "title": "Hamburger",
    "englishTitle": "Beef burger",
    "aliases": [
      "Beef burger",
      "burger"
    ],
    "servings": 4,
    "ingredients": [
      {
        "name": "Carne macinata",
        "quantity": "600 g"
      },
      {
        "name": "Panini per hamburger",
        "quantity": "4",
        "glutenSwap": "Panini per hamburger senza glutine"
      },
      {
        "name": "Lattuga",
        "quantity": "100 g"
      },
      {
        "name": "Pomodori",
        "quantity": "2"
      },
      {
        "name": "Cipolla",
        "quantity": "1"
      },
      {
        "name": "Sale",
        "quantity": "q.b."
      },
      {
        "name": "Pepe nero",
        "quantity": "q.b."
      }
    ]
  },
  {
    "id": "quiche-lorraine",
    "title": "Quiche lorraine",
    "englishTitle": "Quiche lorraine",
    "aliases": [
      "Quiche lorraine"
    ],
    "servings": 4,
    "ingredients": [
      {
        "name": "Pasta brisée",
        "quantity": "250 g",
        "glutenSwap": "Pasta brisée senza glutine"
      },
      {
        "name": "Uova",
        "quantity": "3"
      },
      {
        "name": "Panna",
        "quantity": "200 ml",
        "lactoseSwap": "Panna senza lattosio"
      },
      {
        "name": "Pancetta",
        "quantity": "200 g"
      },
      {
        "name": "Formaggio grattugiato",
        "quantity": "100 g",
        "lactoseSwap": "Formaggio grattugiato senza lattosio"
      },
      {
        "name": "Sale",
        "quantity": "q.b."
      },
      {
        "name": "Pepe nero",
        "quantity": "q.b."
      }
    ]
  },
  {
    "id": "ratatouille",
    "title": "Ratatouille",
    "englishTitle": "Ratatouille",
    "aliases": [
      "Ratatouille"
    ],
    "servings": 4,
    "ingredients": [
      {
        "name": "Melanzane",
        "quantity": "400 g"
      },
      {
        "name": "Zucchine",
        "quantity": "400 g"
      },
      {
        "name": "Peperoni",
        "quantity": "2"
      },
      {
        "name": "Pomodori",
        "quantity": "500 g"
      },
      {
        "name": "Cipolla",
        "quantity": "1"
      },
      {
        "name": "Aglio",
        "quantity": "2 spicchi"
      },
      {
        "name": "Olio extravergine d'oliva",
        "quantity": "4 cucchiai"
      },
      {
        "name": "Sale",
        "quantity": "q.b."
      }
    ]
  },
  {
    "id": "fish-and-chips",
    "title": "Fish and chips",
    "englishTitle": "Fish and chips",
    "aliases": [
      "Fish and chips"
    ],
    "servings": 4,
    "ingredients": [
      {
        "name": "Merluzzo",
        "quantity": "700 g"
      },
      {
        "name": "Patate",
        "quantity": "800 g"
      },
      {
        "name": "Farina",
        "quantity": "200 g",
        "glutenSwap": "Farina senza glutine"
      },
      {
        "name": "Acqua frizzante",
        "quantity": "250 ml"
      },
      {
        "name": "Olio per friggere",
        "quantity": "1000 ml"
      },
      {
        "name": "Sale",
        "quantity": "q.b."
      }
    ]
  },
  {
    "id": "pancake",
    "title": "Pancake",
    "englishTitle": "Pancakes",
    "aliases": [
      "Pancakes",
      "pancakes"
    ],
    "servings": 4,
    "ingredients": [
      {
        "name": "Farina",
        "quantity": "200 g",
        "glutenSwap": "Farina senza glutine"
      },
      {
        "name": "Latte",
        "quantity": "250 ml",
        "lactoseSwap": "Latte senza lattosio"
      },
      {
        "name": "Uova",
        "quantity": "2"
      },
      {
        "name": "Zucchero",
        "quantity": "40 g"
      },
      {
        "name": "Burro",
        "quantity": "30 g",
        "lactoseSwap": "Burro senza lattosio"
      },
      {
        "name": "Lievito per dolci",
        "quantity": "8 g"
      }
    ]
  },
  {
    "id": "cr-pes",
    "title": "Crêpes",
    "englishTitle": "Crepes",
    "aliases": [
      "Crepes",
      "crepes",
      "crespelle"
    ],
    "servings": 4,
    "ingredients": [
      {
        "name": "Farina",
        "quantity": "200 g",
        "glutenSwap": "Farina senza glutine"
      },
      {
        "name": "Latte",
        "quantity": "400 ml",
        "lactoseSwap": "Latte senza lattosio"
      },
      {
        "name": "Uova",
        "quantity": "3"
      },
      {
        "name": "Burro",
        "quantity": "40 g",
        "lactoseSwap": "Burro senza lattosio"
      }
    ]
  },
  {
    "id": "crespelle-ricotta-e-spinaci",
    "title": "Crespelle ricotta e spinaci",
    "englishTitle": "Ricotta and spinach crepes",
    "aliases": [
      "Ricotta and spinach crepes"
    ],
    "servings": 4,
    "ingredients": [
      {
        "name": "Farina",
        "quantity": "200 g",
        "glutenSwap": "Farina senza glutine"
      },
      {
        "name": "Latte",
        "quantity": "400 ml",
        "lactoseSwap": "Latte senza lattosio"
      },
      {
        "name": "Uova",
        "quantity": "3"
      },
      {
        "name": "Burro",
        "quantity": "40 g",
        "lactoseSwap": "Burro senza lattosio"
      },
      {
        "name": "Ricotta",
        "quantity": "300 g",
        "lactoseSwap": "Ricotta senza lattosio"
      },
      {
        "name": "Spinaci",
        "quantity": "400 g"
      },
      {
        "name": "Besciamella",
        "quantity": "400 ml",
        "lactoseSwap": "Besciamella senza lattosio",
        "glutenSwap": "Besciamella senza glutine"
      },
      {
        "name": "Parmigiano grattugiato",
        "quantity": "60 g"
      },
      {
        "name": "Sale",
        "quantity": "q.b."
      }
    ]
  },
  {
    "id": "torta-al-cioccolato",
    "title": "Torta al cioccolato",
    "englishTitle": "Chocolate cake",
    "aliases": [
      "Chocolate cake"
    ],
    "servings": 4,
    "ingredients": [
      {
        "name": "Farina",
        "quantity": "200 g",
        "glutenSwap": "Farina senza glutine"
      },
      {
        "name": "Cioccolato fondente",
        "quantity": "200 g"
      },
      {
        "name": "Burro",
        "quantity": "120 g",
        "lactoseSwap": "Burro senza lattosio"
      },
      {
        "name": "Zucchero",
        "quantity": "150 g"
      },
      {
        "name": "Uova",
        "quantity": "3"
      },
      {
        "name": "Lievito per dolci",
        "quantity": "8 g"
      }
    ]
  },
  {
    "id": "crostata-alla-marmellata",
    "title": "Crostata alla marmellata",
    "englishTitle": "Jam tart",
    "aliases": [
      "Jam tart",
      "crostata"
    ],
    "servings": 4,
    "ingredients": [
      {
        "name": "Farina",
        "quantity": "300 g",
        "glutenSwap": "Farina senza glutine"
      },
      {
        "name": "Burro",
        "quantity": "150 g",
        "lactoseSwap": "Burro senza lattosio"
      },
      {
        "name": "Zucchero",
        "quantity": "100 g"
      },
      {
        "name": "Uova",
        "quantity": "2"
      },
      {
        "name": "Marmellata",
        "quantity": "300 g"
      }
    ]
  },
  {
    "id": "panna-cotta",
    "title": "Panna cotta",
    "englishTitle": "Panna cotta",
    "aliases": [
      "Panna cotta"
    ],
    "servings": 4,
    "ingredients": [
      {
        "name": "Panna",
        "quantity": "500 ml",
        "lactoseSwap": "Panna senza lattosio"
      },
      {
        "name": "Zucchero",
        "quantity": "80 g"
      },
      {
        "name": "Gelatina alimentare",
        "quantity": "6 g"
      },
      {
        "name": "Vaniglia",
        "quantity": "q.b."
      }
    ]
  },
  {
    "id": "cheesecake",
    "title": "Cheesecake",
    "englishTitle": "Cheesecake",
    "aliases": [
      "Cheesecake",
      "cheesecake fredda"
    ],
    "servings": 4,
    "ingredients": [
      {
        "name": "Biscotti",
        "quantity": "200 g",
        "glutenSwap": "Biscotti senza glutine"
      },
      {
        "name": "Burro",
        "quantity": "80 g",
        "lactoseSwap": "Burro senza lattosio"
      },
      {
        "name": "Formaggio spalmabile",
        "quantity": "400 g",
        "lactoseSwap": "Formaggio spalmabile senza lattosio"
      },
      {
        "name": "Panna",
        "quantity": "200 ml",
        "lactoseSwap": "Panna senza lattosio"
      },
      {
        "name": "Zucchero",
        "quantity": "100 g"
      },
      {
        "name": "Gelatina alimentare",
        "quantity": "8 g"
      }
    ]
  },
  {
    "id": "brownies",
    "title": "Brownies",
    "englishTitle": "Brownies",
    "aliases": [
      "Brownies",
      "brownie"
    ],
    "servings": 4,
    "ingredients": [
      {
        "name": "Cioccolato fondente",
        "quantity": "200 g"
      },
      {
        "name": "Burro",
        "quantity": "120 g",
        "lactoseSwap": "Burro senza lattosio"
      },
      {
        "name": "Zucchero",
        "quantity": "150 g"
      },
      {
        "name": "Uova",
        "quantity": "3"
      },
      {
        "name": "Farina",
        "quantity": "100 g",
        "glutenSwap": "Farina senza glutine"
      },
      {
        "name": "Cacao amaro",
        "quantity": "30 g"
      }
    ]
  },
  {
    "id": "muffin",
    "title": "Muffin",
    "englishTitle": "Muffins",
    "aliases": [
      "Muffins",
      "muffins"
    ],
    "servings": 4,
    "ingredients": [
      {
        "name": "Farina",
        "quantity": "250 g",
        "glutenSwap": "Farina senza glutine"
      },
      {
        "name": "Latte",
        "quantity": "150 ml",
        "lactoseSwap": "Latte senza lattosio"
      },
      {
        "name": "Uova",
        "quantity": "2"
      },
      {
        "name": "Zucchero",
        "quantity": "120 g"
      },
      {
        "name": "Burro",
        "quantity": "80 g",
        "lactoseSwap": "Burro senza lattosio"
      },
      {
        "name": "Lievito per dolci",
        "quantity": "12 g"
      }
    ]
  },
  {
    "id": "ciambellone",
    "title": "Ciambellone",
    "englishTitle": "Ring cake",
    "aliases": [
      "Ring cake",
      "ciambella"
    ],
    "servings": 4,
    "ingredients": [
      {
        "name": "Farina",
        "quantity": "300 g",
        "glutenSwap": "Farina senza glutine"
      },
      {
        "name": "Uova",
        "quantity": "3"
      },
      {
        "name": "Zucchero",
        "quantity": "180 g"
      },
      {
        "name": "Latte",
        "quantity": "200 ml",
        "lactoseSwap": "Latte senza lattosio"
      },
      {
        "name": "Olio di semi",
        "quantity": "100 ml"
      },
      {
        "name": "Lievito per dolci",
        "quantity": "16 g"
      }
    ]
  },
  {
    "id": "torta-allo-yogurt",
    "title": "Torta allo yogurt",
    "englishTitle": "Yogurt cake",
    "aliases": [
      "Yogurt cake"
    ],
    "servings": 4,
    "ingredients": [
      {
        "name": "Farina",
        "quantity": "250 g",
        "glutenSwap": "Farina senza glutine"
      },
      {
        "name": "Yogurt",
        "quantity": "250 g",
        "lactoseSwap": "Yogurt senza lattosio"
      },
      {
        "name": "Uova",
        "quantity": "3"
      },
      {
        "name": "Zucchero",
        "quantity": "150 g"
      },
      {
        "name": "Olio di semi",
        "quantity": "80 ml"
      },
      {
        "name": "Lievito per dolci",
        "quantity": "16 g"
      }
    ]
  },
  {
    "id": "torta-caprese",
    "title": "Torta caprese",
    "englishTitle": "Caprese chocolate almond cake",
    "aliases": [
      "Caprese chocolate almond cake"
    ],
    "servings": 4,
    "ingredients": [
      {
        "name": "Mandorle",
        "quantity": "200 g"
      },
      {
        "name": "Cioccolato fondente",
        "quantity": "200 g"
      },
      {
        "name": "Burro",
        "quantity": "150 g",
        "lactoseSwap": "Burro senza lattosio"
      },
      {
        "name": "Zucchero",
        "quantity": "150 g"
      },
      {
        "name": "Uova",
        "quantity": "4"
      }
    ]
  },
  {
    "id": "biscotti-al-burro",
    "title": "Biscotti al burro",
    "englishTitle": "Butter biscuits",
    "aliases": [
      "Butter biscuits",
      "biscotti"
    ],
    "servings": 4,
    "ingredients": [
      {
        "name": "Farina",
        "quantity": "300 g",
        "glutenSwap": "Farina senza glutine"
      },
      {
        "name": "Burro",
        "quantity": "150 g",
        "lactoseSwap": "Burro senza lattosio"
      },
      {
        "name": "Zucchero",
        "quantity": "100 g"
      },
      {
        "name": "Uova",
        "quantity": "1"
      }
    ]
  },
  {
    "id": "crema-pasticcera",
    "title": "Crema pasticcera",
    "englishTitle": "Pastry cream",
    "aliases": [
      "Pastry cream"
    ],
    "servings": 4,
    "ingredients": [
      {
        "name": "Latte",
        "quantity": "500 ml",
        "lactoseSwap": "Latte senza lattosio"
      },
      {
        "name": "Tuorli",
        "quantity": "4"
      },
      {
        "name": "Zucchero",
        "quantity": "100 g"
      },
      {
        "name": "Amido di mais",
        "quantity": "40 g"
      },
      {
        "name": "Vaniglia",
        "quantity": "q.b."
      }
    ]
  },
  {
    "id": "profiteroles",
    "title": "Profiteroles",
    "englishTitle": "Profiteroles",
    "aliases": [
      "Profiteroles"
    ],
    "servings": 4,
    "ingredients": [
      {
        "name": "Bignè",
        "quantity": "200 g",
        "glutenSwap": "Bignè senza glutine"
      },
      {
        "name": "Panna",
        "quantity": "500 ml",
        "lactoseSwap": "Panna senza lattosio"
      },
      {
        "name": "Cioccolato fondente",
        "quantity": "200 g"
      },
      {
        "name": "Zucchero",
        "quantity": "60 g"
      }
    ]
  },
  {
    "id": "zabaione",
    "title": "Zabaione",
    "englishTitle": "Zabaglione",
    "aliases": [
      "Zabaglione"
    ],
    "servings": 4,
    "ingredients": [
      {
        "name": "Tuorli",
        "quantity": "4"
      },
      {
        "name": "Zucchero",
        "quantity": "80 g"
      },
      {
        "name": "Marsala",
        "quantity": "80 ml"
      }
    ]
  },
  {
    "id": "macedonia",
    "title": "Macedonia",
    "englishTitle": "Fruit salad",
    "aliases": [
      "Fruit salad",
      "macedonia di frutta"
    ],
    "servings": 4,
    "ingredients": [
      {
        "name": "Mele",
        "quantity": "2"
      },
      {
        "name": "Banane",
        "quantity": "2"
      },
      {
        "name": "Kiwi",
        "quantity": "2"
      },
      {
        "name": "Fragole",
        "quantity": "250 g"
      },
      {
        "name": "Arancia",
        "quantity": "1"
      },
      {
        "name": "Limone",
        "quantity": "1"
      }
    ]
  },
  {
    "id": "aglio-olio-peperoncino",
    "title": "Spaghetti aglio, olio e peperoncino",
    "aliases": [
      "spaghetti aglio olio e peperoncino",
      "aglio olio peperoncino",
      "Spaghetti with garlic oil and chili"
    ],
    "servings": 4,
    "ingredients": [
      {
        "name": "Spaghetti",
        "quantity": "320 g",
        "glutenSwap": "Spaghetti senza glutine"
      },
      {
        "name": "Aglio",
        "quantity": "3 spicchi"
      },
      {
        "name": "Olio extravergine d'oliva",
        "quantity": "6 cucchiai"
      },
      {
        "name": "Peperoncino",
        "quantity": "q.b."
      },
      {
        "name": "Prezzemolo",
        "quantity": "q.b."
      },
      {
        "name": "Sale",
        "quantity": "q.b."
      }
    ],
    "englishTitle": "Spaghetti with garlic oil and chili"
  },
  {
    "id": "cannoli",
    "title": "Cannoli siciliani",
    "aliases": [
      "cannoli",
      "cannoli siciliani",
      "cannolo",
      "Sicilian cannoli"
    ],
    "servings": 4,
    "ingredients": [
      {
        "name": "Farina",
        "quantity": "125 g",
        "glutenSwap": "Farina senza glutine per dolci"
      },
      {
        "name": "Ricotta",
        "quantity": "250 g",
        "lactoseSwap": "Ricotta senza lattosio"
      },
      {
        "name": "Zucchero",
        "quantity": "75 g"
      },
      {
        "name": "Cacao amaro",
        "quantity": "10 g"
      },
      {
        "name": "Gocce di cioccolato",
        "quantity": "40 g"
      },
      {
        "name": "Olio per friggere",
        "quantity": "q.b."
      }
    ],
    "englishTitle": "Sicilian cannoli"
  },
  {
    "id": "cinghiale",
    "title": "Spaghetti al sugo di cinghiale",
    "aliases": [
      "spaghetti al sugo di cinghiale",
      "pasta al cinghiale",
      "sugo di cinghiale",
      "Pasta with wild boar sauce"
    ],
    "servings": 4,
    "ingredients": [
      {
        "name": "Spaghetti",
        "quantity": "320 g",
        "glutenSwap": "Spaghetti senza glutine"
      },
      {
        "name": "Carne di cinghiale",
        "quantity": "400 g"
      },
      {
        "name": "Passata di pomodoro",
        "quantity": "500 g"
      },
      {
        "name": "Cipolla",
        "quantity": "1"
      },
      {
        "name": "Carota",
        "quantity": "1"
      },
      {
        "name": "Sedano",
        "quantity": "1 costa"
      },
      {
        "name": "Vino rosso",
        "quantity": "150 ml"
      },
      {
        "name": "Olio extravergine d'oliva",
        "quantity": "2 cucchiai"
      },
      {
        "name": "Rosmarino",
        "quantity": "q.b."
      },
      {
        "name": "Sale e pepe",
        "quantity": "q.b."
      }
    ],
    "englishTitle": "Pasta with wild boar sauce"
  },
  {
    "id": "pizza",
    "title": "Pizza margherita",
    "aliases": [
      "pizza",
      "margherita",
      "pizza margherita",
      "Margherita pizza"
    ],
    "servings": 4,
    "ingredients": [
      {
        "name": "Farina",
        "quantity": "500 g",
        "glutenSwap": "Mix farina per pizza senza glutine"
      },
      {
        "name": "Acqua",
        "quantity": "325 ml"
      },
      {
        "name": "Lievito di birra",
        "quantity": "5 g"
      },
      {
        "name": "Passata di pomodoro",
        "quantity": "400 g"
      },
      {
        "name": "Mozzarella",
        "quantity": "300 g",
        "lactoseSwap": "Mozzarella senza lattosio"
      },
      {
        "name": "Olio extravergine d'oliva",
        "quantity": "2 cucchiai"
      },
      {
        "name": "Sale",
        "quantity": "10 g"
      }
    ],
    "englishTitle": "Margherita pizza"
  },
  {
    "id": "pizzoccheri",
    "title": "Pizzoccheri",
    "englishTitle": "Pizzoccheri",
    "aliases": [
      "pizzoccheri della valtellina",
      "pizzoccheri valtellinesi"
    ],
    "servings": 4,
    "ingredients": [
      {
        "name": "Pizzoccheri",
        "quantity": "320 g",
        "glutenSwap": "Pizzoccheri senza glutine"
      },
      {
        "name": "Patate",
        "quantity": "300 g"
      },
      {
        "name": "Verza",
        "quantity": "300 g"
      },
      {
        "name": "Formaggio Casera",
        "quantity": "200 g",
        "lactoseSwap": "Alternativa al Casera senza lattosio"
      },
      {
        "name": "Parmigiano grattugiato",
        "quantity": "80 g"
      },
      {
        "name": "Burro",
        "quantity": "80 g",
        "lactoseSwap": "Burro senza lattosio"
      },
      {
        "name": "Aglio",
        "quantity": "2 spicchi"
      },
      {
        "name": "Salvia",
        "quantity": "q.b."
      },
      {
        "name": "Sale",
        "quantity": "q.b."
      }
    ]
  }
];

function cleanDish(input: string) {
  return input
    .toLocaleLowerCase("it-IT")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[!?.,'’]/g, " ")
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

async function generateIngredients(dish: string, servings = 4, avoidHistamine = false, preferences: string[] = []) {
  const cleaned = cleanDish(dish);
  // Match the whole dish: a requested variant must not silently become its generic recipe.
  const extra = EXTRA_RECIPES.find((recipe) =>
    [recipe.title, ...recipe.aliases].some((alias) => cleanDish(alias) === cleaned));
  const builtIn = extra?.ingredients ??
    Object.entries(BUILTIN_RECIPES).find(([key]) => cleanDish(key) === cleaned)?.[1];
  if (builtIn) {
    const scaled = builtIn.map((item) => {
      const options = item as { name: string; quantity: string; glutenSwap?: string; lactoseSwap?: string };
      let name = options.name;
      const glutenSwap = options.glutenSwap ?? (/\b(pasta|spaghetti|penne|bucatini|sfoglia|farina|pangrattato|savoiardi|besciamella)\b/i.test(name) ? `${name} senza glutine` : undefined);
      const lactoseSwap = options.lactoseSwap ?? (/\b(latte|burro|panna|mascarpone|mozzarella|besciamella|ricotta|pecorino|parmigiano)\b/i.test(name) ? `${name} senza lattosio` : undefined);
      if (preferences.includes("glutine") && glutenSwap) name = glutenSwap;
      if (preferences.includes("lattosio") && lactoseSwap) {
        name = lactoseSwap;
        if (preferences.includes("glutine") && glutenSwap) name += " e senza glutine";
      }
      return { name, quantity: scaleRecipeQuantity(item.quantity, servings) };
    });
    return avoidHistamine ? histamineSaferIngredients(scaled) : scaled;
  }

  try {
    const { text } = await generateText({
      model: "google/gemini-3.6-flash",
      system:
        'Sei il motore ricette di Safe Scan Eats. Ricevi il nome libero di QUALSIASI piatto, dolce, torta, ricetta regionale o internazionale e il numero di persone. Crea la lista della spesa essenziale per prepararlo. Non rinominare il piatto e non sostituirlo con un altro. Se esistono varianti, usa la versione italiana/classica più comune. Se viene richiesto di evitare alimenti problematici per sensibilità all istamina, preferisci ingredienti freschi e non stagionati, non fermentati e non conservati, ed evita per quanto possibile salumi, formaggi stagionati, pesce in scatola o affumicato, fermentati, pomodoro, spinaci, melanzane, avocado, cacao/cioccolato, vino e birra. Rispondi SOLO JSON nel formato {"ingredients":[{"name":string,"quantity":string}]}. Usa nomi e quantità in italiano.',
      prompt: `Piatto richiesto esattamente: ${dish}\nPersone: ${servings}\nAllergeni/intolleranze da evitare: ${preferences.join(", ") || "nessuno"}. Sostituisci gli ingredienti incompatibili e indica esplicitamente senza glutine o senza lattosio nei nomi quando richiesto.\n${avoidHistamine ? "Profilo: sensibilità all istamina, evita o sostituisci gli ingredienti tipicamente problematici." : ""}`,
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
  const ingredients = await generateIngredients(dish, servings, avoidHistamine, preferences);
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
  previous?: unknown,
) {
  const existing = await loadShoppingFromCloud(householdKey);
  const alreadyPresent = existing.some((item) => recipeMentionsDish(item.recipe, dish));
  const replacementTarget = !alreadyPresent ? lastRecipeTarget(existing, previous) : null;
  if (alreadyPresent || replacementTarget) {
    return {
      duplicate: true as const,
      response: buildAlexaResponse(
        alreadyPresent
          ? `${dish} è già presente nella lista. Vuoi aggiungerla a quella esistente oppure sostituirla?`
          : `Vuoi aggiungere ${dish} oppure sostituire l'ultima ricetta, ${replacementTarget!.dish}, con ${dish}? Rispondi aggiungi oppure sostituisci.`,
        false,
        {
          pendingAction: "duplicateRecipe",
          householdKey,
          dish,
          servings,
          profileName: profile?.name ?? "",
          profileAllergens: profile?.allergens ?? [],
          ...(replacementTarget ? { replacementTarget } : {}),
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
    .some((part) => part === wanted);
}

function parseServings(value: unknown): number | null {
  if (typeof value !== "string" && typeof value !== "number") return null;
  const words = ["zero", "uno", "due", "tre", "quattro", "cinque", "sei", "sette", "otto", "nove", "dieci", "undici", "dodici", "tredici", "quattordici", "quindici", "sedici", "diciassette", "diciotto", "diciannove", "venti"];
  const text = String(value).trim().toLocaleLowerCase("it-IT");
  const word = text === "una" ? 1 : words.indexOf(text);
  const englishWords = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen", "twenty"];
  const englishWord = englishWords.indexOf(text);
  const count = word >= 0 ? word : englishWord >= 0 ? englishWord : Number(text.replace(",", "."));
  return Number.isInteger(count) && count >= 1 && count <= 20 ? count : null;
}

async function continueRecipeRequest(
  householdKey: string,
  dish: string,
  servings: number,
  previous?: unknown,
) {
  const profiles = await getHouseholdProfiles(householdKey);
  if (profiles.length > 1) {
    return buildAlexaResponse(
      `Per quale profilo vuoi preparare ${dish}? Puoi scegliere: ${profiles.map((profile) => profile.name).join(", ")}.`,
      false,
      { pendingAction: "recipeProfileSelection", dish, servings, ...(previous ? { lastRecipe: previous } : {}) },
    );
  }
  return (await addRecipeForProfile(householdKey, dish, servings, profiles[0] ?? null, previous)).response;
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
  target?: RecipeTarget,
) {
  const existing = await loadShoppingFromCloud(householdKey);
  const oldDish = target?.dish ?? dish;
  const targetIds = target ? new Set(target.itemIds) : null;
  const selected = existing.filter((item) => targetIds ? targetIds.has(item.id) : recipeMentionsDish(item.recipe, oldDish));
  if (targetIds && (selected.length !== targetIds.size || selected.some((item) => !recipeMentionsDish(item.recipe, oldDish)))) {
    return { ok: false as const, reason: "staleTarget" as const, count: 0 };
  }
  const shared = selected.some((item) =>
    (item.recipe ?? "").split("·").some((part) =>
      cleanDish(part.replace(/\(\d+\s+persone?\)/gi, "")) !== cleanDish(oldDish)));
  if (shared) {
    // Old rows contain only a combined quantity, not each recipe's contribution.
    return { ok: false as const, reason: "sharedIngredients" as const, count: 0 };
  }
  const preferences = profileAllergens ?? await getHouseholdPreferences(householdKey);
  const avoidHistamine = preferences.includes("istamina");
  const ingredients = await generateIngredients(dish, servings, avoidHistamine, preferences);
  if (!ingredients) return { ok: false as const, reason: "generationFailed" as const, count: 0 };
  const selectedIds = new Set(selected.map((item) => item.id));
  const kept = existing.filter((item) => !selectedIds.has(item.id));
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
  return rawJson({
    ok: true,
    service: "Safe Scan Eats Alexa endpoint",
    verification: "signature-and-timestamp-enabled",
    cloudShopping: true,
  });
}

export async function POST(request: Request) {
  let english = false;
  // Locale is local to this request: concurrent Italian and English sessions
  // cannot change each other's response language.
  const json = (data: unknown, status = 200) => rawJson(localizeAlexaResponse(data, english), status);
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
  english = body.request?.locale?.startsWith("en-") ?? false;
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
    const recognizedIntent = body.request?.intent?.name;
    // Bare numbers can be classified as profile names by Alexa. The question
    // currently pending determines what that answer means.
    const isServingsAnswer = body.session?.attributes?.["pendingAction"] === "recipeServingsSelection" &&
      (recognizedIntent === "SelectProfileIntent" || recognizedIntent === "SelectProfileNameIntent");
    const isSeparateRecipeAnswer = body.session?.attributes?.["pendingAction"] === "duplicateRecipe" &&
      recognizedIntent === "AddShoppingItemIntent" &&
      /^(?:(?:la|it|the)\s+)?(?:(?:ricetta|recipe)\s+)?(?:separatamente|separately)$/i.test(body.request?.intent?.slots?.["item"]?.value?.trim() ?? "");
    const rawProfileItem = body.request?.intent?.slots?.["item"]?.value?.trim() ?? "";
    // Voice recognition can classify an answer to the profile question as a grocery.
    // Explicit profile expressions must never be written to the shopping list.
    const isProfileItemAnswer = recognizedIntent === "AddShoppingItemIntent" && (
      body.session?.attributes?.["pendingAction"] === "recipeProfileSelection" ||
      /(?:\bcome\s+profilo\b|\bas\s+(?:a\s+)?profile\b|^(?:il\s+)?profilo\s+|^profile\s+)/i.test(rawProfileItem));
    const profileItemName = rawProfileItem
      .replace(/^(?:(?:il\s+)?profilo|profile)\s+/i, "")
      .replace(/\s+(?:come\s+profilo|as\s+(?:a\s+)?profile)\s*$/i, "").trim();
    const intent = isServingsAnswer ? "ChangeServingsIntent" :
      isSeparateRecipeAnswer ? "AddDuplicateRecipeIntent" :
      isProfileItemAnswer ? "SelectProfileIntent" : recognizedIntent;
    console.log("[Alexa] intent", {
      intent,
      recognizedIntent,
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
      if (english && dish) dish = englishDish(dish);
      const suffix = dish?.match(/\s+(?:per|for)\s+(\d+(?:[.,]\d+)?|[a-z]+)\s+(?:person[ae]|people|persons?|servings?)\s*$/i);
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
            { pendingAction: "recipeServingsSelection", dish,
              ...(body.session?.attributes?.["lastRecipe"] ? { lastRecipe: body.session.attributes["lastRecipe"] } : {}) },
          ));
        }
        return json(await continueRecipeRequest(household, dish, servings, body.session?.attributes?.["lastRecipe"]));
      } catch (error) {
        console.error("[Alexa] shopping add failed", error);
        return json(buildAlexaResponse("Ho avuto un problema nell'aggiornare la lista della spesa. Riprova tra poco."));
      }
    }

    if (intent === "ChangeServingsIntent") {
      const attributes = body.session?.attributes ?? {};
      const servings = parseServings(isServingsAnswer
        ? body.request?.intent?.slots?.["profile"]?.value ?? body.request?.intent?.slots?.["profilo"]?.value
        : body.request?.intent?.slots?.["servings"]?.value);
      if (servings === null) {
        return json(buildAlexaResponse("Dimmi un numero intero di persone da uno a venti.", false, attributes));
      }
      try {
        const household = await getHouseholdKey(alexaUserId);
        if (!household) return json(buildAlexaResponse("Prima collega Alexa alla lista della spesa nell'app Safe Scan Eats."));
        if (attributes["pendingAction"] === "recipeServingsSelection" && typeof attributes["dish"] === "string") {
          return json(await continueRecipeRequest(household, attributes["dish"], servings, attributes["lastRecipe"]));
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
        body.request?.intent?.slots?.["profilo"]?.value ??
        (isProfileItemAnswer ? profileItemName : undefined)
      )?.trim();

      if (
        pendingAction !== "recipeProfileSelection" ||
        typeof householdKey !== "string" ||
        typeof dish !== "string"
      ) {
        return json(buildAlexaResponse("Per scegliere il profilo di una ricetta, prima dimmi: voglio fare i pizzoccheri. Ti chiederò le persone e poi il profilo. Per creare un nuovo profilo usa l'app Safe Scan Eats.", false));
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

        const result = await addRecipeForProfile(householdKey, dish, servings, profile, body.session?.attributes?.["lastRecipe"]);
        return json(result.response);
      } catch (error) {
        console.error("[Alexa] profile selection failed", error);
        return json(buildAlexaResponse("Non riesco a usare quel profilo in questo momento. Riprova tra poco.", false));
      }
    }

    if (intent === "AddShoppingItemIntent") {
      let rawItem = (
        body.request?.intent?.slots?.["item"]?.value ??
        body.request?.intent?.slots?.["prodotto"]?.value
      )?.trim();

      if (english && rawItem) rawItem = englishItem(rawItem);

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
      let rawItem = (
        body.request?.intent?.slots?.["item"]?.value ??
        body.request?.intent?.slots?.["prodotto"]?.value
      )?.trim();

      if (english && rawItem) rawItem = englishItem(rawItem);

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
      let rawItem = (
        body.request?.intent?.slots?.["item"]?.value ??
        body.request?.intent?.slots?.["prodotto"]?.value
      )?.trim();

      if (english && rawItem) rawItem = englishItem(rawItem);

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
      const replacementTarget = body.session?.attributes?.["replacementTarget"] as RecipeTarget | undefined;

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
          if (replacementTarget && (typeof replacementTarget.dish !== "string" ||
              !Array.isArray(replacementTarget.itemIds) || !replacementTarget.itemIds.length ||
              !replacementTarget.itemIds.every((id) => typeof id === "string"))) {
            return json(buildAlexaResponse("Non riesco a individuare la ricetta da sostituire. Non ho modificato la lista.", false));
          }
          const result = await replaceDishInCloud(
            householdKey,
            dish,
            servings,
            Array.isArray(profileAllergens)
              ? profileAllergens.filter((value): value is string => typeof value === "string")
              : undefined,
            replacementTarget,
          );
          console.log("[Alexa] recipe replacement result", { outcome: result.ok ? "success" : result.reason });
          if (!result.ok) {
            return json(buildAlexaResponse(
              result.reason === "sharedIngredients"
                ? "Gli ingredienti della vecchia ricetta sono sommati a quelli di altre ricette. Non posso separarli senza cambiare le altre quantità. Non ho modificato nulla. Puoi dire aggiungi per inserire la nuova ricetta separatamente, oppure annulla."
                : result.reason === "staleTarget"
                  ? "La ricetta da sostituire è stata modificata o rimossa. Non ho cambiato la lista. Chiedimi di nuovo quale ricetta vuoi preparare."
                  : "Non riesco a generare gli ingredienti della nuova versione in questo momento. La lista non è stata modificata. Puoi riprovare dicendo sostituisci, oppure annulla.",
              false,
              body.session?.attributes,
            ));
          }
          return json(
            buildAlexaResponse(
              replacementTarget
                ? `Fatto. Ho sostituito ${replacementTarget.dish} con ${dish} per ${servings} ${servings === 1 ? "persona" : "persone"}.`
                : `Fatto. Ho sostituito ${dish} con la versione per ${servings} ${servings === 1 ? "persona" : "persone"}.`,
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
      let rawItem = (
        body.request?.intent?.slots?.["item"]?.value ??
        body.request?.intent?.slots?.["prodotto"]?.value
      )?.trim();

      if (english && rawItem) rawItem = englishItem(rawItem);

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

// Keep language helpers in the server entry point so deployment needs no local ESM import.
// Deterministic localisation: no translation service or additional API cost.
const ENGLISH_TEXT: Record<string, string> = {
  "Per scegliere il profilo di una ricetta, prima dimmi: voglio fare i pizzoccheri. Ti chiederò le persone e poi il profilo. Per creare un nuovo profilo usa l'app Safe Scan Eats.": "To choose a recipe profile, first say: I want to make pizzoccheri. I will ask how many people and then which profile. To create a new profile, use the Safe Scan Eats app.",
  "Quale piatto vuoi preparare?": "What would you like to cook?",
  "Dimmi un numero intero di persone da uno a venti.": "How many people? Please say a whole number from one to twenty.",
  "Prima collega Alexa alla lista della spesa nell'app Safe Scan Eats.": "First, link Alexa to your shopping list in the Safe Scan Eats app.",
  "Non c'è una ricetta in attesa di scelta del profilo.": "There is no recipe waiting for a profile. Tell me what you would like to cook.",
  "Dimmi il nome del profilo da usare.": "Please say the name of the profile to use.",
  "Che prodotto vuoi aggiungere alla lista?": "What item would you like to add to the list?",
  "Quale prodotto vuoi togliere dalla lista?": "What item would you like to remove from the list?",
  "Quale prodotto devo segnare come comprato?": "What item would you like to mark as bought?",
  "Quale prodotto devo rimettere tra quelli da comprare?": "What item would you like to mark as still needed?",
  "La lista della spesa è vuota.": "Your shopping list is empty.",
  "Vuoi davvero svuotare tutta la lista della spesa? Rispondi sì oppure no.": "Do you want to clear the entire shopping list? Say yes or no.",
  "Fatto. Ho svuotato tutta la lista della spesa.": "Done. I cleared the entire shopping list.",
  "Non c'è nessuna operazione da confermare.": "There is nothing waiting for confirmation.",
  "Va bene, non ho cancellato nulla.": "OK. I haven't deleted anything.",
  "Va bene.": "OK.",
  "Va bene, a presto.": "OK. Goodbye.",
  "Non c'è nessuna ricetta da aggiungere di nuovo.": "There is no recipe waiting to be added again.",
  "Non c'è nessuna ricetta da sostituire.": "There is no recipe waiting to be replaced. Tell me what you would like to cook first.",
  "Non riesco a individuare la ricetta da sostituire. Non ho modificato la lista.": "I couldn't identify the recipe to replace. I haven't changed your list.",
  "Non riesco a generare gli ingredienti della nuova versione in questo momento. La lista non è stata modificata. Puoi riprovare dicendo sostituisci, oppure annulla.": "I can't generate the new ingredients right now. Your list hasn't changed. Say replace to try again, or cancel.",
  "La ricetta da sostituire è stata modificata o rimossa. Non ho cambiato la lista. Chiedimi di nuovo quale ricetta vuoi preparare.": "The recipe to replace has been changed or removed. I haven't changed the list. Please tell me again what you would like to cook.",
  "Gli ingredienti della vecchia ricetta sono sommati a quelli di altre ricette. Non posso separarli senza cambiare le altre quantità. Non ho modificato nulla. Puoi dire aggiungi per inserire la nuova ricetta separatamente, oppure annulla.": "The old recipe's ingredients are combined with other recipes. I can't separate their quantities safely. I haven't changed anything. Say add to add the new recipe separately, or cancel.",
  "Quale ricetta vuoi preparare? Dimmi, per esempio: voglio fare la carbonara per due persone.": "What would you like to cook? For example, say: I want to make carbonara for two people.",
  "La ricetta è stata modificata o rimossa dalla lista. Chiedimi di prepararla di nuovo con il numero di persone desiderato.": "The recipe has been changed or removed from the list. Please request it again with the number of people you need.",
  "Questa ricetta contiene quantità che non posso ricalcolare con precisione. Non ho modificato la lista.": "This recipe has quantities I can't rescale accurately. I haven't changed the list.",
  "Benvenuto in Safe Scan. Dimmi quale piatto vuoi preparare, per esempio: voglio fare la carbonara.": "Welcome to Safe Scan. Tell me what you would like to cook. For example: I want to make carbonara.",
  "Non ho capito. Prova a dirmi quale piatto vuoi preparare.": "I didn't understand. Please tell me what you would like to cook.",
  "Puoi dirmi: voglio fare la carbonara per due persone. Se non indichi le persone, te le chiederò. Per cambiare l'ultima ricetta durante la conversazione puoi dire: anzi, falla per due persone. Puoi anche aggiungere o togliere prodotti dalla lista. Quando hai più profili ti chiederò quale usare. Se una ricetta è già presente, puoi dire aggiungi oppure sostituisci.": "Say: I want to make carbonara for two people. If you don't give a number, I'll ask how many people. During the conversation, say: make it for two people instead. You can add or remove shopping items. If you have multiple profiles, I'll ask which one to use. When I offer to add or replace a recipe, say add or replace.",
};

const ENGLISH_ERRORS: Record<string, string> = {
  "Ho avuto un problema nell'aggiornare la lista della spesa. Riprova tra poco.": "I couldn't update your shopping list. Please try again shortly.",
  "Ho avuto un problema nel modificare la lista della spesa. Riprova tra poco.": "I couldn't change your shopping list. Please try again shortly.",
  "Ho avuto un problema con la lista della spesa. Riprova tra poco.": "There was a problem with your shopping list. Please try again shortly.",
  "Ho avuto un problema nell'aggiornare la lista. Riprova tra poco.": "I couldn't update your list. Please try again shortly.",
  "Non sono riuscito ad aggiornare le porzioni. Riprova tra poco.": "I couldn't update the servings. Please try again shortly.",
  "Non riesco a usare quel profilo in questo momento. Riprova tra poco.": "I can't use that profile right now. Please try again shortly.",
  "Non sono riuscito ad aggiungere quel prodotto. Riprova.": "I couldn't add that item. Please try again.",
  "Non riesco a leggere la lista della spesa in questo momento. Riprova tra poco.": "I can't read your shopping list right now. Please try again shortly.",
  "Non sono riuscito a svuotare la lista. Riprova tra poco.": "I couldn't clear the list. Please try again shortly.",
  "Non sono riuscito ad aggiungere di nuovo la ricetta. Riprova tra poco.": "I couldn't add the recipe again. Please try again shortly.",
};

// Generated food translations from src/lib/recipe-catalog.ts.
const CATALOG_FOOD_EN: Record<string, string> = {
  "verza": "savoy cabbage",
  "formaggio casera": "Casera cheese",
  "alternativa al casera senza lattosio": "lactose-free alternative to Casera cheese",
  "pizzoccheri senza glutine": "gluten-free pizzoccheri",
  "cannelloni": "cannelloni",
  "ricotta": "ricotta",
  "spinaci": "spinach",
  "noce moscata": "nutmeg",
  "carote": "carrots",
  "funghi": "mushrooms",
  "pinoli": "pine nuts",
  "bucatini": "bucatini",
  "pomodori pelati": "peeled tomatoes",
  "olive nere": "black olives",
  "capperi": "capers",
  "acciughe": "anchovies",
  "penne": "penne",
  "tonno": "tuna",
  "salmone": "salmon",
  "panna": "cream",
  "gorgonzola": "gorgonzola",
  "fontina": "fontina",
  "taleggio": "taleggio",
  "vongole": "clams",
  "gamberetti": "shrimp",
  "pasta corta": "short pasta",
  "fagioli cotti": "cooked beans",
  "ceci cotti": "cooked chickpeas",
  "pomodorini": "cherry tomatoes",
  "olive": "olives",
  "gnocchi di patate": "potato gnocchi",
  "salvia": "sage",
  "tortellini": "tortellini",
  "brodo di carne": "meat stock",
  "zafferano": "saffron",
  "brodo vegetale": "vegetable stock",
  "zucca": "pumpkin",
  "asparagi": "asparagus",
  "cozze": "mussels",
  "calamari": "squid",
  "brodo di pesce": "fish stock",
  "mais": "sweetcorn",
  "farina di mais": "cornmeal",
  "patate": "potatoes",
  "lenticchie secche": "dried lentils",
  "cavolo nero": "Tuscan kale",
  "pane": "bread",
  "origano": "oregano",
  "fettine di vitello": "veal escalopes",
  "prosciutto crudo": "cured ham",
  "vino bianco": "white wine",
  "carne di manzo": "beef",
  "ossobuchi di vitello": "veal shanks",
  "alloro": "bay leaves",
  "carne di vitello": "veal",
  "pollo": "chicken",
  "petto di pollo": "chicken breast",
  "latte di cocco": "coconut milk",
  "curry": "curry powder",
  "mandorle": "almonds",
  "salsa di soia": "soy sauce",
  "zenzero": "ginger",
  "amido di mais": "cornstarch",
  "olio di semi": "vegetable oil",
  "peperoni": "bell peppers",
  "cetrioli": "cucumbers",
  "feta": "feta",
  "cipolla rossa": "red onion",
  "lattuga": "lettuce",
  "orata": "sea bream",
  "filetti di salmone": "salmon fillets",
  "merluzzo": "cod",
  "pesce misto per zuppa": "mixed fish for soup",
  "aceto": "vinegar",
  "tahina": "tahini",
  "cumino": "cumin",
  "ceci secchi": "dried chickpeas",
  "cous cous": "couscous",
  "prosciutto cotto": "cooked ham",
  "tortillas di mais": "corn tortillas",
  "avocado": "avocado",
  "lime": "lime",
  "coriandolo": "coriander",
  "panini per hamburger": "burger buns",
  "pasta brisée": "shortcrust pastry",
  "formaggio grattugiato": "grated cheese",
  "acqua frizzante": "sparkling water",
  "cioccolato fondente": "dark chocolate",
  "marmellata": "jam",
  "gelatina alimentare": "gelatine",
  "vaniglia": "vanilla",
  "biscotti": "biscuits",
  "formaggio spalmabile": "cream cheese",
  "yogurt": "yogurt",
  "tuorli": "egg yolks",
  "bignè": "choux pastry puffs",
  "marsala": "Marsala wine",
  "banane": "bananas",
  "kiwi": "kiwi",
  "fragole": "strawberries",
  "arancia": "orange",
  "carne di cinghiale": "wild boar meat",
  "vino rosso": "red wine",
  "rosmarino": "rosemary",
  "peperoncino": "chili",
  "olio per friggere": "frying oil",
  "lievito di birra": "baker's yeast",
  "cannelloni senza glutine": "gluten-free cannelloni",
  "cannelloni senza lattosio": "lactose-free cannelloni",
  "ricotta senza glutine": "gluten-free ricotta",
  "ricotta senza lattosio": "lactose-free ricotta",
  "spinaci senza glutine": "gluten-free spinach",
  "spinaci senza lattosio": "lactose-free spinach",
  "noce moscata senza glutine": "gluten-free nutmeg",
  "noce moscata senza lattosio": "lactose-free nutmeg",
  "carote senza glutine": "gluten-free carrots",
  "carote senza lattosio": "lactose-free carrots",
  "funghi senza glutine": "gluten-free mushrooms",
  "funghi senza lattosio": "lactose-free mushrooms",
  "pinoli senza glutine": "gluten-free pine nuts",
  "pinoli senza lattosio": "lactose-free pine nuts",
  "bucatini senza glutine": "gluten-free bucatini",
  "bucatini senza lattosio": "lactose-free bucatini",
  "pomodori pelati senza glutine": "gluten-free peeled tomatoes",
  "pomodori pelati senza lattosio": "lactose-free peeled tomatoes",
  "olive nere senza glutine": "gluten-free black olives",
  "olive nere senza lattosio": "lactose-free black olives",
  "capperi senza glutine": "gluten-free capers",
  "capperi senza lattosio": "lactose-free capers",
  "acciughe senza glutine": "gluten-free anchovies",
  "acciughe senza lattosio": "lactose-free anchovies",
  "penne senza glutine": "gluten-free penne",
  "penne senza lattosio": "lactose-free penne",
  "tonno senza glutine": "gluten-free tuna",
  "tonno senza lattosio": "lactose-free tuna",
  "salmone senza glutine": "gluten-free salmon",
  "salmone senza lattosio": "lactose-free salmon",
  "panna senza glutine": "gluten-free cream",
  "panna senza lattosio": "lactose-free cream",
  "gorgonzola senza glutine": "gluten-free gorgonzola",
  "gorgonzola senza lattosio": "lactose-free gorgonzola",
  "fontina senza glutine": "gluten-free fontina",
  "fontina senza lattosio": "lactose-free fontina",
  "taleggio senza glutine": "gluten-free taleggio",
  "taleggio senza lattosio": "lactose-free taleggio",
  "vongole senza glutine": "gluten-free clams",
  "vongole senza lattosio": "lactose-free clams",
  "gamberetti senza glutine": "gluten-free shrimp",
  "gamberetti senza lattosio": "lactose-free shrimp",
  "pasta corta senza glutine": "gluten-free short pasta",
  "pasta corta senza lattosio": "lactose-free short pasta",
  "fagioli cotti senza glutine": "gluten-free cooked beans",
  "fagioli cotti senza lattosio": "lactose-free cooked beans",
  "ceci cotti senza glutine": "gluten-free cooked chickpeas",
  "ceci cotti senza lattosio": "lactose-free cooked chickpeas",
  "pomodorini senza glutine": "gluten-free cherry tomatoes",
  "pomodorini senza lattosio": "lactose-free cherry tomatoes",
  "olive senza glutine": "gluten-free olives",
  "olive senza lattosio": "lactose-free olives",
  "gnocchi di patate senza glutine": "gluten-free potato gnocchi",
  "gnocchi di patate senza lattosio": "lactose-free potato gnocchi",
  "salvia senza glutine": "gluten-free sage",
  "salvia senza lattosio": "lactose-free sage",
  "tortellini senza glutine": "gluten-free tortellini",
  "tortellini senza lattosio": "lactose-free tortellini",
  "brodo di carne senza glutine": "gluten-free meat stock",
  "brodo di carne senza lattosio": "lactose-free meat stock",
  "zafferano senza glutine": "gluten-free saffron",
  "zafferano senza lattosio": "lactose-free saffron",
  "brodo vegetale senza glutine": "gluten-free vegetable stock",
  "brodo vegetale senza lattosio": "lactose-free vegetable stock",
  "zucca senza glutine": "gluten-free pumpkin",
  "zucca senza lattosio": "lactose-free pumpkin",
  "asparagi senza glutine": "gluten-free asparagus",
  "asparagi senza lattosio": "lactose-free asparagus",
  "cozze senza glutine": "gluten-free mussels",
  "cozze senza lattosio": "lactose-free mussels",
  "calamari senza glutine": "gluten-free squid",
  "calamari senza lattosio": "lactose-free squid",
  "brodo di pesce senza glutine": "gluten-free fish stock",
  "brodo di pesce senza lattosio": "lactose-free fish stock",
  "mais senza glutine": "gluten-free sweetcorn",
  "mais senza lattosio": "lactose-free sweetcorn",
  "farina di mais senza glutine": "gluten-free cornmeal",
  "farina di mais senza lattosio": "lactose-free cornmeal",
  "patate senza glutine": "gluten-free potatoes",
  "patate senza lattosio": "lactose-free potatoes",
  "lenticchie secche senza glutine": "gluten-free dried lentils",
  "lenticchie secche senza lattosio": "lactose-free dried lentils",
  "cavolo nero senza glutine": "gluten-free Tuscan kale",
  "cavolo nero senza lattosio": "lactose-free Tuscan kale",
  "pane senza glutine": "gluten-free bread",
  "pane senza lattosio": "lactose-free bread",
  "origano senza glutine": "gluten-free oregano",
  "origano senza lattosio": "lactose-free oregano",
  "fettine di vitello senza glutine": "gluten-free veal escalopes",
  "fettine di vitello senza lattosio": "lactose-free veal escalopes",
  "prosciutto crudo senza glutine": "gluten-free cured ham",
  "prosciutto crudo senza lattosio": "lactose-free cured ham",
  "vino bianco senza glutine": "gluten-free white wine",
  "vino bianco senza lattosio": "lactose-free white wine",
  "carne di manzo senza glutine": "gluten-free beef",
  "carne di manzo senza lattosio": "lactose-free beef",
  "ossobuchi di vitello senza glutine": "gluten-free veal shanks",
  "ossobuchi di vitello senza lattosio": "lactose-free veal shanks",
  "alloro senza glutine": "gluten-free bay leaves",
  "alloro senza lattosio": "lactose-free bay leaves",
  "carne di vitello senza glutine": "gluten-free veal",
  "carne di vitello senza lattosio": "lactose-free veal",
  "pollo senza glutine": "gluten-free chicken",
  "pollo senza lattosio": "lactose-free chicken",
  "petto di pollo senza glutine": "gluten-free chicken breast",
  "petto di pollo senza lattosio": "lactose-free chicken breast",
  "latte di cocco senza glutine": "gluten-free coconut milk",
  "latte di cocco senza lattosio": "lactose-free coconut milk",
  "curry senza glutine": "gluten-free curry powder",
  "curry senza lattosio": "lactose-free curry powder",
  "mandorle senza glutine": "gluten-free almonds",
  "mandorle senza lattosio": "lactose-free almonds",
  "salsa di soia senza glutine": "gluten-free soy sauce",
  "salsa di soia senza lattosio": "lactose-free soy sauce",
  "zenzero senza glutine": "gluten-free ginger",
  "zenzero senza lattosio": "lactose-free ginger",
  "amido di mais senza glutine": "gluten-free cornstarch",
  "amido di mais senza lattosio": "lactose-free cornstarch",
  "olio di semi senza glutine": "gluten-free vegetable oil",
  "olio di semi senza lattosio": "lactose-free vegetable oil",
  "peperoni senza glutine": "gluten-free bell peppers",
  "peperoni senza lattosio": "lactose-free bell peppers",
  "cetrioli senza glutine": "gluten-free cucumbers",
  "cetrioli senza lattosio": "lactose-free cucumbers",
  "feta senza glutine": "gluten-free feta",
  "feta senza lattosio": "lactose-free feta",
  "cipolla rossa senza glutine": "gluten-free red onion",
  "cipolla rossa senza lattosio": "lactose-free red onion",
  "lattuga senza glutine": "gluten-free lettuce",
  "lattuga senza lattosio": "lactose-free lettuce",
  "orata senza glutine": "gluten-free sea bream",
  "orata senza lattosio": "lactose-free sea bream",
  "filetti di salmone senza glutine": "gluten-free salmon fillets",
  "filetti di salmone senza lattosio": "lactose-free salmon fillets",
  "merluzzo senza glutine": "gluten-free cod",
  "merluzzo senza lattosio": "lactose-free cod",
  "pesce misto per zuppa senza glutine": "gluten-free mixed fish for soup",
  "pesce misto per zuppa senza lattosio": "lactose-free mixed fish for soup",
  "aceto senza glutine": "gluten-free vinegar",
  "aceto senza lattosio": "lactose-free vinegar",
  "tahina senza glutine": "gluten-free tahini",
  "tahina senza lattosio": "lactose-free tahini",
  "cumino senza glutine": "gluten-free cumin",
  "cumino senza lattosio": "lactose-free cumin",
  "ceci secchi senza glutine": "gluten-free dried chickpeas",
  "ceci secchi senza lattosio": "lactose-free dried chickpeas",
  "cous cous senza glutine": "gluten-free couscous",
  "cous cous senza lattosio": "lactose-free couscous",
  "prosciutto cotto senza glutine": "gluten-free cooked ham",
  "prosciutto cotto senza lattosio": "lactose-free cooked ham",
  "tortillas di mais senza glutine": "gluten-free corn tortillas",
  "tortillas di mais senza lattosio": "lactose-free corn tortillas",
  "avocado senza glutine": "gluten-free avocado",
  "avocado senza lattosio": "lactose-free avocado",
  "lime senza glutine": "gluten-free lime",
  "lime senza lattosio": "lactose-free lime",
  "coriandolo senza glutine": "gluten-free coriander",
  "coriandolo senza lattosio": "lactose-free coriander",
  "panini per hamburger senza glutine": "gluten-free burger buns",
  "panini per hamburger senza lattosio": "lactose-free burger buns",
  "pasta brisée senza glutine": "gluten-free shortcrust pastry",
  "pasta brisée senza lattosio": "lactose-free shortcrust pastry",
  "formaggio grattugiato senza glutine": "gluten-free grated cheese",
  "formaggio grattugiato senza lattosio": "lactose-free grated cheese",
  "acqua frizzante senza glutine": "gluten-free sparkling water",
  "acqua frizzante senza lattosio": "lactose-free sparkling water",
  "cioccolato fondente senza glutine": "gluten-free dark chocolate",
  "cioccolato fondente senza lattosio": "lactose-free dark chocolate",
  "marmellata senza glutine": "gluten-free jam",
  "marmellata senza lattosio": "lactose-free jam",
  "gelatina alimentare senza glutine": "gluten-free gelatine",
  "gelatina alimentare senza lattosio": "lactose-free gelatine",
  "vaniglia senza glutine": "gluten-free vanilla",
  "vaniglia senza lattosio": "lactose-free vanilla",
  "biscotti senza glutine": "gluten-free biscuits",
  "biscotti senza lattosio": "lactose-free biscuits",
  "formaggio spalmabile senza glutine": "gluten-free cream cheese",
  "formaggio spalmabile senza lattosio": "lactose-free cream cheese",
  "yogurt senza glutine": "gluten-free yogurt",
  "yogurt senza lattosio": "lactose-free yogurt",
  "tuorli senza glutine": "gluten-free egg yolks",
  "tuorli senza lattosio": "lactose-free egg yolks",
  "bignè senza glutine": "gluten-free choux pastry puffs",
  "bignè senza lattosio": "lactose-free choux pastry puffs",
  "marsala senza glutine": "gluten-free Marsala wine",
  "marsala senza lattosio": "lactose-free Marsala wine",
  "banane senza glutine": "gluten-free bananas",
  "banane senza lattosio": "lactose-free bananas",
  "kiwi senza glutine": "gluten-free kiwi",
  "kiwi senza lattosio": "lactose-free kiwi",
  "fragole senza glutine": "gluten-free strawberries",
  "fragole senza lattosio": "lactose-free strawberries",
  "arancia senza glutine": "gluten-free orange",
  "arancia senza lattosio": "lactose-free orange",
  "carne di cinghiale senza glutine": "gluten-free wild boar meat",
  "carne di cinghiale senza lattosio": "lactose-free wild boar meat",
  "vino rosso senza glutine": "gluten-free red wine",
  "vino rosso senza lattosio": "lactose-free red wine",
  "rosmarino senza glutine": "gluten-free rosemary",
  "rosmarino senza lattosio": "lactose-free rosemary",
  "peperoncino senza glutine": "gluten-free chili",
  "peperoncino senza lattosio": "lactose-free chili",
  "olio per friggere senza glutine": "gluten-free frying oil",
  "olio per friggere senza lattosio": "lactose-free frying oil",
  "lievito di birra senza glutine": "gluten-free baker's yeast",
  "lievito di birra senza lattosio": "lactose-free baker's yeast"
};

const FOOD_EN: Record<string, string> = {
  ...Object.fromEntries(EXTRA_RECIPES.map((recipe) => [recipe.title.toLowerCase(), recipe.englishTitle])),
  ...CATALOG_FOOD_EN,
  "pasta alla norma": "pasta alla Norma", "lasagne": "lasagna", "tiramisu": "tiramisu",
  "pasta senza glutine": "gluten free pasta", "sfoglia per lasagne senza glutine": "gluten free lasagna sheets",
  "sfoglia per lasagne": "lasagna sheets", "carne macinata": "minced meat", "passata di pomodoro": "tomato passata",
  "besciamella senza glutine": "gluten free bechamel", "besciamella": "bechamel",
  "parmigiano grattugiato": "grated parmesan", "olio extravergine d'oliva": "extra virgin olive oil",
  "pecorino romano": "pecorino romano", "ricotta salata": "salted ricotta", "pepe nero": "black pepper",
  "uova": "eggs", "cipolla": "onion", "carota": "carrot", "sedano": "celery", "sale": "salt",
  "latte": "milk", "burro": "butter", "zucchero": "sugar", "farina": "flour", "melanzane": "aubergines",
  "basilico": "basil", "aglio": "garlic", "zucchine": "courgettes", "acqua": "water",
  "riso": "rice", "q.b.": "as needed", "cucchiai": "tablespoons", "costa": "stalk",
  "olio extravergine di oliva": "extra virgin olive oil", "savoiardi": "ladyfinger biscuits",
  "caffè": "coffee", "cacao amaro": "unsweetened cocoa", "piselli": "peas", "pangrattato": "breadcrumbs",
  "mele": "apples", "lievito per dolci": "baking powder", "torta di mele": "apple cake",
  "formaggio fresco non stagionato": "fresh unaged cheese", "carne fresca di pollo o tacchino": "fresh chicken or turkey",
  "carne fresca non stagionata": "fresh uncured meat", "pesce molto fresco": "very fresh fish",
  "zucca o crema di verdure tollerate": "pumpkin or a puree of tolerated vegetables", "bietole": "chard",
  "carruba": "carob", "succo di limone se tollerato": "lemon juice if tolerated",
  "acqua o brodo fresco": "water or fresh stock", "condimento non fermentato": "unfermented seasoning",
};

function englishFood(text: string): string {
  let result = text;
  for (const [it, en] of Object.entries(FOOD_EN).sort((a, b) => b[0].length - a[0].length)) {
    const escaped = it.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    result = result.replace(new RegExp(`(?<![a-z])${escaped}(?![a-z])`, "gi"), en);
  }
  return result;
}

function englishDish(input: string): string {
  const aliases: Record<string, string> = {
    "lasagna": "lasagne", "lasagne": "lasagne", "apple cake": "torta di mele", "apple pie": "torta di mele",
    "carbonara pasta": "carbonara", "pasta carbonara": "carbonara", "margherita pizza": "pizza margherita",
    "pasta alla norma": "pasta alla norma", "rice balls": "arancini",
  };
  const match = input.trim().match(/^(.*?)(\s+for\s+(?:\d+(?:[.,]\d+)?|[a-z]+)\s+(?:people|persons?|servings?)\s*)?$/i);
  const base = (match?.[1] ?? input).trim().replace(/^(?:the|a|an)\s+/i, "");
  return `${aliases[base.toLowerCase()] ?? base}${match?.[2] ?? ""}`;
}

function englishItem(input: string): string {
  // Keep manually entered quantities and match English item names to Italian cloud rows.
  let result = input;
  for (const [it, en] of Object.entries(FOOD_EN).sort((a, b) => b[1].length - a[1].length)) {
    if (it === "q.b." || it === "costa" || it === "cucchiai") continue;
    const escaped = en.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    result = result.replace(new RegExp(`(?<![a-z])${escaped}(?![a-z])`, "gi"), it);
  }
  return result;
}

function englishAlexaText(text: string): string {
  const exact = ENGLISH_TEXT[text] ?? ENGLISH_ERRORS[text];
  if (exact) return exact;
  const rules: Array<[RegExp, (...args: string[]) => string]> = [
    [/^Per quante persone vuoi preparare (.+)\?$/, (_m, dish) => `For how many people would you like to make ${dish}?`],
    [/^Per quale profilo vuoi preparare (.+)\? Puoi scegliere: (.+)\.$/, (_m, dish, profiles) => `Which profile should I use for ${dish}? You can choose: ${profiles}.`],
    [/^Non trovo il profilo (.+)\. Puoi scegliere: (.+)\.$/, (_m, name, profiles) => `I couldn't find the profile ${name}. You can choose: ${profiles}.`],
    [/^(.+) è già presente nella lista\. Vuoi aggiungerla a quella esistente oppure sostituirla\?$/, (_m, dish) => `${dish} is already in your list. Would you like to add it again or replace it?`],
    [/^Vuoi aggiungere (.+) oppure sostituire l'ultima ricetta, (.+), con (.+)\? Rispondi aggiungi oppure sostituisci\.$/, (_m, dish, old) => `Would you like to add ${dish}, or replace your last recipe, ${old}, with ${dish}? Say add or replace.`],
    [/^Ho capito (.+), ma non riesco a creare la lista ingredienti in questo momento\.$/, (_m, dish) => `I understood ${dish}, but I can't generate its ingredients right now.`],
    [/^Fatto\. Ho aggiunto (\d+) ingredienti per (.+) per (\d+) person[ae](?: per il profilo (.+?))? alla lista della spesa di Safe Scan Eats\.(.*)$/, (_m, count, dish, n, profile, note) => `Done. I added ${count} ingredients for ${dish} for ${n} ${n === "1" ? "person" : "people"}${profile ? ` using the ${profile} profile` : ""} to your Safe Scan Eats shopping list.${note ? " I adapted the ingredients to avoid foods typically problematic for histamine sensitivity where possible." : ""}`],
    [/^Fatto\. Ho aggiornato (.+) per (\d+) person[ae], senza aggiungere altri ingredienti\.$/, (_m, dish, n) => `Done. I updated ${dish} for ${n} ${n === "1" ? "person" : "people"}, without adding more ingredients.`],
    [/^Va bene, per (\d+) persone\. Quale profilo vuoi usare\?$/, (_m, n) => `OK, for ${n} ${n === "1" ? "person" : "people"}. Which profile should I use?`],
    [/^Va bene, per (\d+) persone\. Vuoi aggiungere la ricetta oppure sostituirla\?$/, (_m, n) => `OK, for ${n} ${n === "1" ? "person" : "people"}. Would you like to add the recipe or replace it?`],
    [/^Fatto\. Ho sostituito (.+) con la versione per (\d+) person[ae]\.$/, (_m, dish, n) => `Done. I replaced ${dish} with the version for ${n} ${n === "1" ? "person" : "people"}.`],
    [/^Fatto\. Ho sostituito (.+) con (.+) per (\d+) person[ae]\.$/, (_m, old, dish, n) => `Done. I replaced ${old} with ${dish} for ${n} ${n === "1" ? "person" : "people"}.`],
    [/^Va bene\. Ho aggiunto un'altra (.+) per (\d+) person[ae] alla lista\.$/, (_m, dish, n) => `OK. I added another ${dish} for ${n} ${n === "1" ? "person" : "people"} to the list.`],
    [/^Fatto\. Ho aggiunto (.+), (.+), alla lista della spesa\.$/, (_m, name, qty) => `Done. I added ${name}, ${qty}, to the shopping list.`],
    [/^Fatto\. Ho tolto (.+) dalla lista della spesa\.$/, (_m, name) => `Done. I removed ${name} from the shopping list.`],
    [/^Fatto\. Ho segnato (.+) come comprato\.$/, (_m, name) => `Done. I marked ${name} as bought.`],
    [/^Fatto\. Ho rimesso (.+) tra i prodotti da comprare\.$/, (_m, name) => `Done. I marked ${name} as still needed.`],
    [/^Non trovo (.+) (?:nella lista della spesa|tra i prodotti da comprare|tra i prodotti acquistati)\.$/, (_m, name) => `I couldn't find ${name} in that part of the shopping list.`],
    [/^Hai (\d+) prodotti da comprare\. I primi sono: (.+)\. E altri (\d+)\.$/, (_m, n, list, rest) => `You have ${n} items to buy. The first are: ${list}. And ${rest} more.`],
    [/^Hai (\d+) prodotti da comprare: (.+)\.$/, (_m, n, list) => `You have ${n} items to buy: ${list}.`],
    [/^Prima (?:devo collegarmi alla tua lista|colleghiamo la tua lista della spesa)\. Apri Safe Scan Eats(?:, entra nella lista della spesa)? e inserisci il codice (.+?)(?: nella sezione Collega Alexa)?\.(?: Il codice dura dieci minuti\.)?$/, (_m, code) => `First, link your shopping list. Open Safe Scan Eats and enter the code ${code} in Link Alexa. The code lasts ten minutes.`],
  ];
  for (const [pattern, replace] of rules) {
    const match = text.match(pattern);
    if (match) return englishFood(replace(...match));
  }
  console.error("[Alexa] missing English response translation");
  return "Sorry, I couldn't complete that request. Please try again.";
}

function localizeAlexaResponse(data: unknown, english: boolean): unknown {
  if (!english || !data || typeof data !== "object") return data;
  const response = data as { response?: { outputSpeech?: { type?: string; text?: string } } };
  if (response.response?.outputSpeech?.type !== "PlainText" || !response.response.outputSpeech.text) return data;
  return { ...data, response: { ...response.response, outputSpeech: {
    ...response.response.outputSpeech, text: englishAlexaText(response.response.outputSpeech.text),
  } } };
}
