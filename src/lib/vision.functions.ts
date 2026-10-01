import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const ImageInput = z.object({
  image: z.string().startsWith("data:image/").max(4_000_000, "Immagine troppo grande"),
});

async function askVision(image: string, instructions: string): Promise<Record<string, unknown> | null> {
  // Prefer Vercel AI Gateway: on Vercel deployments VERCEL_OIDC_TOKEN is
  // provided automatically when Secure Backend Access / OIDC is enabled,
  // so the photo reader does not need a Lovable-specific secret.
  const gatewayKey = process.env["AI_GATEWAY_API_KEY"] || process.env["VERCEL_OIDC_TOKEN"];
  const lovableKey = process.env["LOVABLE_API_KEY"];
  const key = gatewayKey || lovableKey;

  if (!key) {
    throw new Error("Servizio foto non configurato: abilita OIDC su Vercel o configura AI_GATEWAY_API_KEY");
  }

  const useVercelGateway = !!gatewayKey;
  const endpoint = useVercelGateway
    ? "https://ai-gateway.vercel.sh/v1/chat/completions"
    : "https://ai.gateway.lovable.dev/v1/chat/completions";
  const model = useVercelGateway
    ? "google/gemini-3-flash"
    : "google/gemini-3-flash-preview";

  const res = await fetch(endpoint, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: instructions },
        {
          role: "user",
          content: [
            { type: "text", text: "Analizza questa foto e rispondi solo con JSON." },
            { type: "image_url", image_url: { url: image } },
          ],
        },
      ],
    }),
  });

  if (res.status === 429) throw new Error("Troppe richieste, riprova tra poco");
  if (res.status === 402) throw new Error("Servizio foto temporaneamente non disponibile");
  if (res.status === 401 || res.status === 403) {
    throw new Error("Servizio foto non autorizzato: verifica OIDC/AI Gateway su Vercel");
  }
  if (!res.ok) throw new Error("Analisi della foto non riuscita");

  const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const content = json.choices?.[0]?.message?.content ?? "";
  try {
    const cleaned = content.replace(/^```(json)?/i, "").replace(/```$/, "").trim();
    return JSON.parse(cleaned) as Record<string, unknown>;
  } catch {
    return null;
  }
}

const s = (v: unknown) => (typeof v === "string" ? v.trim() : "");
const stringArray = (v: unknown) => Array.isArray(v) ? v.filter((x): x is string => typeof x === "string").map((x) => x.trim()).filter(Boolean) : [];

export const identifyFront = createServerFn({ method: "POST" })
  .inputValidator((d) => ImageInput.parse(d))
  .handler(async ({ data }) => {
    const out = await askVision(data.image, `Sei un assistente che legge il fronte di prodotti alimentari confezionati.\nRispondi SOLO con JSON: {"recognized": boolean, "name": string, "brand": string, "category": string, "variant": string, "claims": string[]}.\nUsa l'italiano. Se non è un prodotto alimentare o non si legge, recognized=false e stringhe vuote.\nNel campo claims trascrivi SOLO dichiarazioni esplicite realmente visibili sul fronte, per esempio \"senza glutine\", \"gluten free\", \"senza lattosio\", \"senza latte\", oppure certificazioni/simboli chiaramente leggibili. Non dedurre MAI ingredienti, allergeni o assenze non scritte. Se non vedi dichiarazioni esplicite, claims=[].`);
    return {
      recognized: out?.["recognized"] === true && !!s(out?.["name"]),
      name: s(out?.["name"]),
      brand: s(out?.["brand"]),
      category: s(out?.["category"]),
      variant: s(out?.["variant"]),
      claims: stringArray(out?.["claims"]),
    };
  });

export const readLabel = createServerFn({ method: "POST" })
  .inputValidator((d) => ImageInput.parse(d))
  .handler(async ({ data }) => {
    const out = await askVision(data.image, `Trascrivi fedelmente la lista ingredienti presente nella foto dell'etichetta di un alimento.
Rispondi SOLO con JSON: {"readable": boolean, "complete": boolean, "confidence": number, "ingredients": string, "traces": string}.
- "ingredients": il testo completo degli ingredienti così come scritto (tradotto in italiano se in altra lingua), senza inventare nulla.
- "traces": la frase "può contenere..." se presente, altrimenti "".
- "complete": true SOLO se la lista ingredienti è leggibile in modo continuo e sembra completa; false se parole/frasi sono spezzate, deformate, mancanti o dubbie.
- "confidence": numero da 0 a 1 sulla qualità della lettura.
Se l'etichetta non è leggibile o non contiene ingredienti, readable=false, complete=false e confidence bassa.`);
    const ingredients = s(out?.["ingredients"]);
    const confidenceRaw = typeof out?.["confidence"] === "number" ? out["confidence"] : Number(out?.["confidence"]);
    const confidence = Number.isFinite(confidenceRaw) ? Math.max(0, Math.min(1, confidenceRaw)) : 0;
    return {
      readable: out?.["readable"] === true && ingredients.length > 3,
      complete: out?.["complete"] === true,
      confidence,
      ingredients,
      traces: s(out?.["traces"]),
    };
  });
