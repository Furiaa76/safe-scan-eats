// Public catalogue evidence only. This endpoint never reports physical-store stock.
export function carrefourCatalogue(html: string, code: string) {
  for (const match of html.matchAll(
    /<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
  )) {
    try {
      const value = JSON.parse(match[1] ?? "");
      const rows = Array.isArray(value)
        ? value
        : Array.isArray(value?.["@graph"])
          ? value["@graph"]
          : [value];
      for (const row of rows) {
        if (row?.["@type"] !== "Product" || typeof row.name !== "string")
          continue;
        // Carrefour's SKU is its EAN; do not match names, brands, or recommendations.
        if (
          ![row.gtin, row.gtin13, row.gtin14, row.sku].some(
            (id) =>
              typeof id === "string" &&
              /^\d{8,14}$/.test(id) &&
              id.padStart(14, "0") === code.padStart(14, "0"),
          )
        )
          continue;
        const offers = Array.isArray(row.offers) ? row.offers : [row.offers];
        for (const offer of offers) {
          if (typeof offer?.url !== "string") continue;
          const url = new URL(offer.url);
          if (
            url.protocol !== "https:" ||
            url.hostname !== "www.carrefour.it" ||
            url.username ||
            url.password ||
            !url.pathname.endsWith(`/${code}.html`)
          )
            continue;
          return {
            name: "Carrefour",
            country: "it",
            verified: true,
            sourceUrl: url.origin + url.pathname,
            checkedAt: new Date().toISOString(),
          };
        }
      }
    } catch {
      /* Malformed or unrelated structured data is not proof. */
    }
  }
  return null;
}
const cache = new Map<
  string,
  {
    expires: number;
    offers: NonNullable<ReturnType<typeof carrefourCatalogue>>[];
  }
>();
const pending = new Map<
  string,
  Promise<NonNullable<ReturnType<typeof carrefourCatalogue>>[]>
>();
let windowStart = 0,
  requests = 0;
async function readPage(response: Response) {
  const reader = response.body?.getReader();
  if (!reader) return "";
  const decoder = new TextDecoder();
  let text = "",
    bytes = 0;
  while (true) {
    const part = await reader.read();
    if (part.done) break;
    bytes += part.value.byteLength;
    if (bytes > 500_000) {
      await reader.cancel();
      return "";
    }
    text += decoder.decode(part.value, { stream: true });
  }
  return text + decoder.decode();
}
async function lookup(code: string) {
  try {
    let url = new URL(
      "https://www.carrefour.it/on/demandware.store/Sites-carrefour-IT-Site/it_IT/Product-Show",
    );
    url.searchParams.set("pid", code);
    const signal = AbortSignal.timeout(8000);
    for (let redirects = 0; redirects <= 3; redirects++) {
      const response = await fetch(url, {
        redirect: "manual",
        signal,
        headers: { Accept: "text/html" },
      });
      if ([301, 302, 303, 307, 308].includes(response.status)) {
        const target = response.headers.get("location");
        if (!target) return [];
        url = new URL(target, url);
        if (
          url.protocol !== "https:" ||
          url.hostname !== "www.carrefour.it" ||
          url.username ||
          url.password
        )
          return [];
        continue;
      }
      if (
        !response.ok ||
        !response.headers.get("content-type")?.includes("text/html")
      )
        return [];
      const offer = carrefourCatalogue(await readPage(response), code);
      return offer ? [offer] : [];
    }
  } catch {
    /* No catalogue badge on timeout, blocked pages, or unknown products. */
  }
  return [];
}
export async function GET(request: Request) {
  const url = new URL(request.url),
    code = url.searchParams.get("code") ?? "";
  const reply = (offers: unknown[], status = 200) =>
    Response.json(
      { offers },
      { status, headers: { "Cache-Control": "no-store" } },
    );
  if (
    !/^\d{8,14}$/.test(code) ||
    !/^[a-z]{2}$/.test(url.searchParams.get("country") ?? "")
  )
    return reply([], 400);
  if (url.searchParams.get("country") !== "it") return reply([]);
  const now = Date.now(),
    hit = cache.get(code);
  if (hit && hit.expires > now) return reply(hit.offers);
  if (pending.has(code)) return reply((await pending.get(code)) ?? []);
  if (now - windowStart >= 60_000) {
    windowStart = now;
    requests = 0;
  }
  if (++requests > 100) return reply([]);
  while (pending.size >= 6) await Promise.race(pending.values());
  // Another queued request may already have started the same barcode.
  if (pending.has(code)) return reply((await pending.get(code)) ?? []);
  const work = lookup(code);
  pending.set(code, work);
  try {
    const offers = await work;
    if (cache.size >= 500) cache.delete(cache.keys().next().value!);
    cache.set(code, {
      offers,
      expires: Date.now() + (offers.length ? 600_000 : 60_000),
    });
    return reply(offers);
  } finally {
    pending.delete(code);
  }
}
