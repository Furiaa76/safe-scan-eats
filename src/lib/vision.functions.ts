import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const ImageInput = z.object({
  image: z.string().startsWith("data:image/").max(4_000_000, "Immagine troppo grande"),
});

async function askVision(image: string, instructions: string): Promise<Record<string, unknown> | null> {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) throw new Error("Servizio foto non configurato");
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: instructions },
        { role: "user", content: [{ type: "text", text: "Analizza questa foto e rispondi solo con JSON." }, { type: "image_url", image_url: { url: image } }] },
      ],
    }),
  });
  if (res.status === 429) throw new Error("Troppe richieste, riprova tra poco");
  if (res.status === 402) throw new Error("Servizio foto temporaneamente non disponibile");
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

export const identifyFront = createServerFn({ method: "POST" })
  .inputValidator((d) => ImageInput.parse(d))
  .handler(async ({ data }) => {
    const out = await askVision(data.image, `Sei un assistente che riconosce prodotti alimentari confezionati dalla foto del fronte.\nRispondi SOLO con JSON: {"recognized": boolean, "name": string, "brand": string, "category": string, "variant": string}.\nUsa l'italiano. Se non è un prodotto alimentare o non si legge, recognized=false e stringhe vuote.\nNon dedurre MAI ingredienti o allergeni.`);
    return { recognized: out?.["recognized"] === true && !!s(out?.["name"]), name: s(out?.["name"]), brand: s(out?.["brand"]), category: s(out?.["category"]), variant: s(out?.["variant"]) };
  });

export const readLabel = createServerFn({ method: "POST" })
  .inputValidator((d) => ImageInput.parse(d))
  .handler(async ({ data }) => {
    const out = await askVision(data.image, `Trascrivi fedelmente la lista ingredienti presente nella foto dell'etichetta di un alimento.\nRispondi SOLO con JSON: {"readable": boolean, "ingredients": string, "traces": string}.\n- "ingredients": il testo completo degli ingredienti così come scritto (tradotto in italiano se in altra lingua), senza inventare nulla.\n- "traces": la frase "può contenere..." se presente, altrimenti "".\nSe l'etichetta non è leggibile o non contiene ingredienti, readable=false.`);
    return { readable: out?.["readable"] === true && s(out?.["ingredients"]).length > 3, ingredients: s(out?.["ingredients"]), traces: s(out?.["traces"]) };
  });