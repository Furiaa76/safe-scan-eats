import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const RecipeInput = z.object({
  dish: z.string().min(2).max(120),
  allergens: z.array(z.string()).max(12),
});

export const generateRecipe = createServerFn({ method: "POST" })
  .inputValidator((d) => RecipeInput.parse(d))
  .handler(async ({ data }) => {
    const gatewayKey = process.env["AI_GATEWAY_API_KEY"] || process.env["VERCEL_OIDC_TOKEN"];
    const lovableKey = process.env["LOVABLE_API_KEY"];
    const key = gatewayKey || lovableKey;
    if (!key) throw new Error("AI_RECIPE_NOT_CONFIGURED");

    const useVercelGateway = !!gatewayKey;
    const endpoint = useVercelGateway
      ? "https://ai-gateway.vercel.sh/v1/chat/completions"
      : "https://ai.gateway.lovable.dev/v1/chat/completions";
    const model = useVercelGateway
      ? "google/gemini-3-flash"
      : "google/gemini-3-flash-preview";

    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              'Sei un assistente di cucina italiano. Devi creare una lista ingredienti pratica per il piatto richiesto, adattata alle allergie/intolleranze indicate. Rispondi SOLO JSON nel formato {"title":string,"servings":number,"ingredients":[{"name":string,"quantity":string}],"notes":string}. Non dichiarare mai un ingrediente confezionato sicuramente sicuro: quando serve specifica "senza glutine", "senza lattosio" o "verificare etichetta" nel nome o nelle note. Usa nomi e quantità in italiano.',
          },
          {
            role: "user",
            content: `Piatto: ${data.dish}\nAllergie/intolleranze da evitare: ${data.allergens.length ? data.allergens.join(", ") : "nessuna"}`,
          },
        ],
      }),
    });

    if (res.status === 429) throw new Error("AI_RECIPE_RATE_LIMIT");
    if (res.status === 401 || res.status === 403) throw new Error("AI_RECIPE_NOT_AUTHORIZED");
    if (!res.ok) throw new Error("AI_RECIPE_FAILED");
    const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const raw = json.choices?.[0]?.message?.content ?? "";
    const cleaned = raw.replace(/^\`\`\`(json)?/i, "").replace(/\`\`\`$/, "").trim();
    const out = JSON.parse(cleaned) as {
      title?: unknown;
      servings?: unknown;
      ingredients?: unknown;
      notes?: unknown;
    };

    const ingredients = Array.isArray(out.ingredients)
      ? out.ingredients
          .map((x) => {
            const item = x as Record<string, unknown>;
            return {
              name: typeof item.name === "string" ? item.name.trim() : "",
              quantity: typeof item.quantity === "string" ? item.quantity.trim() : "q.b.",
            };
          })
          .filter((x) => x.name)
          .slice(0, 30)
      : [];

    if (!ingredients.length) throw new Error("AI_RECIPE_EMPTY");

    return {
      title: typeof out.title === "string" && out.title.trim() ? out.title.trim() : data.dish,
      servings: typeof out.servings === "number" && out.servings > 0 ? Math.min(12, Math.round(out.servings)) : 4,
      ingredients,
      notes: typeof out.notes === "string" ? out.notes.trim() : "",
    };
  });
