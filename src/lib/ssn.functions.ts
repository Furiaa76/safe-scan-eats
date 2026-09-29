import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const Input = z.object({
  name: z.string().min(1).max(240),
  brand: z.string().max(160).optional().default(""),
});

const REGISTRY_PDF =
  "https://www.salute.gov.it/new/sites/default/files/SG_ORD_PROD_2.pdf";

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function significantTokens(value: string) {
  return normalize(value)
    .split(" ")
    .filter((x) => x.length >= 3 && !["senza", "glutine", "prodotto", "alimento"].includes(x));
}

function looksLikeMatch(registryText: string, name: string, brand: string) {
  const registry = normalize(registryText);
  const nameTokens = significantTokens(name);
  if (nameTokens.length === 0) return false;

  const strongNameTokens = nameTokens.filter((t) => t.length >= 4);
  const nameHits = strongNameTokens.filter((t) => registry.includes(t)).length;
  const enoughName = strongNameTokens.length <= 2
    ? nameHits === strongNameTokens.length
    : nameHits >= Math.max(2, Math.ceil(strongNameTokens.length * 0.7));

  if (!enoughName) return false;

  const brandTokens = significantTokens(brand);
  if (brandTokens.length === 0) return true;
  return brandTokens.some((t) => registry.includes(t));
}

let cachedText: string | null = null;
let cachedAt = 0;
const CACHE_MS = 1000 * 60 * 60 * 12;

async function loadRegistryText() {
  if (cachedText && Date.now() - cachedAt < CACHE_MS) return cachedText;

  const res = await fetch(REGISTRY_PDF, {
    headers: {
      "User-Agent": "SafeFoodScan/1.0 (+registro prodotti erogabili SSN)",
      Accept: "application/pdf,*/*",
    },
  });
  if (!res.ok) throw new Error(`REGISTRY_FETCH_${res.status}`);

  const buffer = Buffer.from(await res.arrayBuffer());
  const mod = await import("pdf-parse");
  const pdfParse = mod.default;
  const parsed = await pdfParse(buffer);
  const text = parsed.text || "";
  if (text.length < 1000) throw new Error("REGISTRY_PARSE_EMPTY");

  cachedText = text;
  cachedAt = Date.now();
  return text;
}

export const checkSsnRegistry = createServerFn({ method: "POST" })
  .inputValidator((d) => Input.parse(d))
  .handler(async ({ data }) => {
    try {
      const text = await loadRegistryText();
      const match = looksLikeMatch(text, data.name, data.brand);
      return {
        status: match ? ("yes" as const) : ("not-found" as const),
        source: "Ministero della Salute",
        registryUrl: REGISTRY_PDF,
      };
    } catch {
      return {
        status: "unavailable" as const,
        source: "Ministero della Salute",
        registryUrl: REGISTRY_PDF,
      };
    }
  });
