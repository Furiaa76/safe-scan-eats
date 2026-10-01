import { createServerFn } from "@tanstack/react-start";
import pdfParse from "pdf-parse";

const STORES_PDF =
  "https://www.fascicolosanitario.regione.lombardia.it/documents/130101/130419/Negozi%2Bconvenzionati.pdf/324de6f8-cf5e-3636-ff80-a4a2480a2565";

const PROVINCES = new Set(["BG","BS","LC","MB","LO","MI","CO","VA","SO","PV","CR","MN"]);
const CACHE_MS = 1000 * 60 * 60 * 12;

type StoreRow = {
  ats: string;
  province: string;
  text: string;
  otp: "Sì" | "No" | "";
};

let cached: { updated: string; stores: StoreRow[]; fetchedAt: number } | null = null;

function cleanLine(line: string) {
  return line.replace(/\s+/g, " ").trim();
}

function isNoise(line: string) {
  return !line ||
    /^Elenco dei negozi aderenti/i.test(line) ||
    /^Provincia Comune$/i.test(line) ||
    /^Denominazione Punto$/i.test(line) ||
    /^Vendita$/i.test(line) ||
    /^Indirizzo$/i.test(line) ||
    /^Abilitato$/i.test(line) ||
    /^OTP$/i.test(line) ||
    /^Celiachia$/i.test(line) ||
    /^celiachia$/i.test(line) ||
    /^Data ultimo aggiornamento:/i.test(line);
}

async function loadStores() {
  if (cached && Date.now() - cached.fetchedAt < CACHE_MS) return cached;

  const res = await fetch(STORES_PDF, {
    headers: {
      "User-Agent": "SafeScanEats/1.0 (+elenco negozi celiachia Lombardia)",
      Accept: "application/pdf,*/*",
    },
  });
  if (!res.ok) throw new Error(`STORES_FETCH_${res.status}`);

  const buffer = Buffer.from(await res.arrayBuffer());
  const parsed = await pdfParse(buffer);
  const raw = parsed.text || "";
  if (raw.length < 1000) throw new Error("STORES_PARSE_EMPTY");

  const updated = raw.match(/Data ultimo aggiornamento:\s*([^\n]+)/i)?.[1]?.trim() || "non disponibile";
  const lines = raw.split(/\r?\n/).map(cleanLine);

  let ats = "";
  let current: string[] = [];
  let province = "";
  const stores: StoreRow[] = [];

  const flush = () => {
    if (!current.length || !province) return;
    const text = current.join(" ").replace(/\s+/g, " ").trim();
    const otp = /\bSì\s*$/i.test(text) ? "Sì" : /\bNo\s*$/i.test(text) ? "No" : "";
    stores.push({ ats, province, text, otp });
    current = [];
    province = "";
  };

  for (const original of lines) {
    const line = original.replace(/Data ultimo aggiornamento:.*$/i, "").trim();
    if (isNoise(line)) continue;

    if (/^ATS\s+/i.test(line)) {
      flush();
      ats = line;
      continue;
    }

    const first = line.split(" ")[0]?.toUpperCase();
    if (PROVINCES.has(first)) {
      flush();
      province = first;
      current = [line];
    } else if (current.length) {
      current.push(line);
    }
  }
  flush();

  cached = { updated, stores, fetchedAt: Date.now() };
  return cached;
}

export const getCeliacStores = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const data = await loadStores();
    return {
      status: "ok" as const,
      updated: data.updated,
      stores: data.stores,
      sourceUrl: STORES_PDF,
    };
  } catch {
    return {
      status: "unavailable" as const,
      updated: "",
      stores: [] as StoreRow[],
      sourceUrl: STORES_PDF,
    };
  }
});
