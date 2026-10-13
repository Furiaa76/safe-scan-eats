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
            code,
            productName: row.name.slice(0, 200),
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
export interface CatalogueOffer {
  code: string;
  name: string;
  country: string;
  verified: boolean;
  sourceUrl: string;
  checkedAt: string;
  productName?: string;
}
const sameCode = (left: unknown, right: string) =>
  typeof left === "string" &&
  /^\d{8,14}$/.test(left) &&
  left.padStart(14, "0") === right.padStart(14, "0");
function safeProductUrl(value: unknown, host: string, prefix: string) {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value, `https://${host}`);
    return url.protocol === "https:" &&
      url.hostname === host &&
      !url.username &&
      !url.password &&
      url.pathname.startsWith(prefix)
      ? url.origin + url.pathname
      : null;
  } catch {
    return null;
  }
}
// These public catalogue rows include actual EANs. Internal IDs never stand in for EANs.
export function digitelematicaCatalogue(
  value: any,
  name: string,
  host: string,
): CatalogueOffer[] {
  const rows =
    value?.data?.products ?? (value?.data?.barcode ? [value.data] : []);
  if (!Array.isArray(rows)) return [];
  return rows.flatMap((row) => {
    if (
      !row ||
      typeof row.name !== "string" ||
      typeof row.barcode !== "string" ||
      !/^\d{8,14}$/.test(row.barcode)
    )
      return [];
    const sourceUrl = safeProductUrl(row.itemUrl, host, "/product/");
    if (!sourceUrl) return [];
    return [
      {
        code: row.barcode,
        name,
        country: "it",
        verified: true,
        sourceUrl,
        checkedAt: new Date().toISOString(),
        productName: [row.name, row.shortDescr, row.description]
          .filter((item) => typeof item === "string")
          .join(" ")
          .slice(0, 200),
      },
    ];
  });
}
export function esselungaCatalogue(value: any): CatalogueOffer[] {
  const row = value?.displayableProduct;
  if (
    !row ||
    typeof row.barcode !== "string" ||
    !/^\d{8,14}$/.test(row.barcode) ||
    !/^\d{1,12}$/.test(row.code ?? "") ||
    typeof row.description !== "string" ||
    typeof row.sanitizeDescription !== "string" ||
    !/^[a-z0-9-]+$/.test(row.sanitizeDescription)
  )
    return [];
  return [
    {
      code: row.barcode,
      name: "Esselunga",
      country: "it",
      verified: true,
      sourceUrl: `https://spesaonline.esselunga.it/commerce/nav/supermercato/store/prodotto/${row.code}/${row.sanitizeDescription}`,
      checkedAt: new Date().toISOString(),
      productName: row.description.slice(0, 200),
    },
  ];
}
export function conadCatalogue(html: string): CatalogueOffer[] {
  const result: CatalogueOffer[] = [];
  for (const match of html.matchAll(
    /<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
  )) {
    try {
      const row = JSON.parse(match[1] ?? "");
      if (
        row?.["@type"] !== "Product" ||
        typeof row.gtin !== "string" ||
        !/^\d{8,14}$/.test(row.gtin) ||
        typeof row.name !== "string"
      )
        continue;
      const sourceUrl = safeProductUrl(
        row.offers?.url,
        "spesaonline.conad.it",
        "/p/",
      );
      if (sourceUrl)
        result.push({
          code: row.gtin,
          name: "Conad",
          country: "it",
          verified: true,
          sourceUrl,
          checkedAt: new Date().toISOString(),
          productName: row.name.slice(0, 200),
        });
    } catch {
      /* Unreadable structured data cannot identify the product. */
    }
  }
  return result;
}
async function publicPage(url: string, options: RequestInit = {}) {
  const host = new URL(url).hostname;
  let target = new URL(url);
  const signal = AbortSignal.timeout(8000);
  for (let redirects = 0; redirects <= 3; redirects++) {
    const response = await fetch(target, {
      ...options,
      signal,
      redirect: "manual",
    });
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get("location");
      if (!location) return "";
      target = new URL(location, target);
      if (
        target.protocol !== "https:" ||
        target.hostname !== host ||
        target.username ||
        target.password
      )
        return "";
      continue;
    }
    if (!response.ok) return "";
    return await readPage(response);
  }
  return "";
}
async function pool<T, R>(
  items: T[],
  task: (item: T) => Promise<R>,
  count = 4,
): Promise<R[]> {
  let next = 0;
  const result: R[] = [];
  await Promise.all(
    Array.from({ length: Math.min(count, items.length) }, async () => {
      while (next < items.length) {
        const index = next++;
        result[index] = await task(items[index]!);
      }
    }),
  );
  return result;
}
const sourceCache = new Map<
  string,
  { expires: number; offers: CatalogueOffer[] }
>();
const sourcePending = new Map<string, Promise<CatalogueOffer[]>>();
async function sourceSearch(
  name: string,
  query: string,
): Promise<CatalogueOffer[]> {
  const key = `${name}:${query}`,
    hit = sourceCache.get(key);
  if (hit && hit.expires > Date.now()) return hit.offers;
  if (sourcePending.has(key)) return (await sourcePending.get(key)) ?? [];
  const work = (async () => {
    try {
      if (name === "TIGROS" || name === "Coop") {
        const host = name === "TIGROS" ? "www.tigros.it" : "www.coopshop.it";
        const url = new URL(`https://${host}/ebsn/api/products`);
        url.searchParams.set("q", query);
        return digitelematicaCatalogue(
          JSON.parse(await publicPage(url.href)),
          name,
          host,
        );
      }
      if (name === "Esselunga") {
        const headers = {
          "Content-Type": "application/json",
          "X-PAGE-PATH": "supermercato",
        };
        const search = JSON.parse(
          await publicPage(
            "https://spesaonline.esselunga.it/commerce/resources/search/facet",
            {
              method: "POST",
              headers,
              body: JSON.stringify({ query, start: 0, length: 20 }),
            },
          ),
        );
        const rows = search?.displayables?.entities;
        if (!Array.isArray(rows)) return [];
        const codes = Array.from(
          new Set(
            rows
              .filter((row) => /^\d{1,12}$/.test(row?.code ?? ""))
              .map((row) => String(row.code)),
          ),
        ).slice(0, 20);
        return (
          await pool(codes, async (code) => {
            try {
              return esselungaCatalogue(
                JSON.parse(
                  await publicPage(
                    `https://spesaonline.esselunga.it/commerce/resources/displayable/detail/code/${code}`,
                    { headers },
                  ),
                ),
              );
            } catch {
              return [];
            }
          })
        ).flat();
      }
      if (name === "Conad") {
        const url = new URL(
          "https://spesaonline.conad.it/api/ecommerce/it-it.suggestions.json",
        );
        url.searchParams.set("query", query);
        const search = JSON.parse(await publicPage(url.href));
        const rows = search?.data?.suggestedProducts;
        if (!Array.isArray(rows)) return [];
        const urls = Array.from(
          new Set(
            rows
              .map((row) =>
                safeProductUrl(row?.url, "spesaonline.conad.it", "/p/"),
              )
              .filter((url): url is string => !!url),
          ),
        ).slice(0, 10);
        return (
          await pool(urls, async (url) => {
            try {
              return conadCatalogue(await publicPage(url));
            } catch {
              return [];
            }
          })
        ).flat();
      }
    } catch {
      /* Public page failures do not manufacture sellers. */
    }
    return [];
  })();
  sourcePending.set(key, work);
  try {
    const offers = await work;
    if (sourceCache.size >= 200)
      sourceCache.delete(sourceCache.keys().next().value!);
    sourceCache.set(key, {
      offers,
      expires: Date.now() + (offers.length ? 300_000 : 60_000),
    });
    return offers;
  } finally {
    sourcePending.delete(key);
  }
}

const cache = new Map<
  string,
  {
    expires: number;
    offers: CatalogueOffer[];
  }
>();
const pending = new Map<string, Promise<CatalogueOffer[]>>();
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
  const codes = [
    ...new Set((url.searchParams.get("codes") ?? code).split(",")),
  ];
  // Broad discovery is safe because final inclusion still requires the exact EAN.
  const query = (url.searchParams.get("q") ?? "")
    .slice(0, 120)
    .replace(
      /\b(?:senza|free from)\s+(?:glutine|lattosio|latte|uova|soia)\b/gi,
      " ",
    )
    .replace(/["\\]/g, " ")
    .split(/\s+/)
    .filter(
      (word) =>
        word.length > 2 &&
        !/^(?:con|per|del|della|dei|degli|delle)$/i.test(word),
    )
    .slice(0, 2)
    .join(" ");
  const reply = (offers: unknown[], status = 200) =>
    Response.json(
      { offers },
      { status, headers: { "Cache-Control": "no-store" } },
    );
  if (
    codes.length > 24 ||
    codes.some((code) => !/^\d{8,14}$/.test(code)) ||
    !/^[a-z]{2}$/.test(url.searchParams.get("country") ?? "")
  )
    return reply([], 400);
  if (url.searchParams.get("country") !== "it") return reply([]);
  const key = `${codes.join(",")}:${query}`;
  const now = Date.now(),
    hit = cache.get(key);
  if (hit && hit.expires > now) return reply(hit.offers);
  if (pending.has(key)) return reply((await pending.get(key)) ?? []);
  if (now - windowStart >= 60_000) {
    windowStart = now;
    requests = 0;
  }
  if (++requests > 100) return reply([]);
  while (pending.size >= 6) await Promise.race(pending.values());
  // Another queued request may already have started the same barcode.
  if (pending.has(key)) return reply((await pending.get(key)) ?? []);
  const work = (async () => {
    const tasks: Promise<CatalogueOffer[]>[] = [
      pool(codes, lookup, 4).then((rows) => rows.flat()),
    ];
    if (query.length >= 2)
      for (const name of ["Esselunga", "Coop", "Conad", "TIGROS"])
        tasks.push(sourceSearch(name, query));
    const rows = (await Promise.all(tasks))
      .flat()
      .filter((offer) => codes.some((code) => sameCode(offer.code, code)));
    return Array.from(
      new Map(
        rows.map((row) => [`${row.name}:${row.code.padStart(14, "0")}`, row]),
      ).values(),
    );
  })();
  pending.set(key, work);
  try {
    const offers = await work;
    if (cache.size >= 500) cache.delete(cache.keys().next().value!);
    cache.set(key, {
      offers,
      expires: Date.now() + 60_000,
    });
    return reply(offers);
  } finally {
    pending.delete(key);
  }
}
