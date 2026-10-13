export interface OnlineSupermarket {
  code: string;
  name: string;
  country: string;
  sourceUrl: string;
  checkedAt: string;
  productName: string;
}
const HOSTS: Record<string, string> = {
  Esselunga: "spesaonline.esselunga.it",
  Coop: "www.coopshop.it",
  Conad: "spesaonline.conad.it",
  TIGROS: "www.tigros.it",
  Carrefour: "www.carrefour.it",
  Iper: "iperdrive.iper.it",
  Iperal: "www.iperalspesaonline.it",
  Eurospin: "online.eurospin.com",
  Bennet: "www.bennet.com",
};
export function exactOnlineSupermarkets(
  rows: unknown,
  codes: string[],
  country: string,
  now = Date.now(),
): OnlineSupermarket[] {
  if (!Array.isArray(rows)) return [];
  const wanted = new Set(codes.map((code) => code.padStart(14, "0")));
  return rows.flatMap((row) => {
    if (
      !row ||
      typeof row !== "object" ||
      row.country !== country ||
      row.verified !== true ||
      typeof row.code !== "string" ||
      !/^\d{8,14}$/.test(row.code) ||
      !wanted.has(row.code.padStart(14, "0")) ||
      typeof row.name !== "string" ||
      typeof row.sourceUrl !== "string" ||
      typeof row.checkedAt !== "string"
    )
      return [];
    const checked = Date.parse(row.checkedAt);
    if (!Number.isFinite(checked) || checked > now || now - checked > 600_000)
      return [];
    try {
      const url = new URL(row.sourceUrl);
      if (
        url.protocol !== "https:" ||
        url.username ||
        url.password ||
        url.hostname !== HOSTS[row.name]
      )
        return [];
      return [
        {
          code: row.code,
          name: row.name,
          country: row.country,
          sourceUrl: row.sourceUrl,
          checkedAt: row.checkedAt,
          productName:
            typeof row.productName === "string"
              ? row.productName.slice(0, 200)
              : "",
        },
      ];
    } catch {
      return [];
    }
  });
}
export async function findOnlineSupermarkets(
  codes: string[],
  country: string,
  query: string,
): Promise<OnlineSupermarket[]> {
  const unique = [
    ...new Set(codes.filter((code) => /^\d{8,14}$/.test(code))),
  ].slice(0, 100);
  if (country !== "it" || !unique.length) return [];
  const batches = Array.from(
    { length: Math.ceil(unique.length / 24) },
    (_, index) => unique.slice(index * 24, index * 24 + 24),
  );
  const offers = await Promise.all(
    batches.map(async (batch) => {
      try {
        const params = new URLSearchParams({
          codes: batch.join(","),
          country,
          q: query.slice(0, 120),
        });
        const response = await fetch(`/api/online-retailers?${params}`);
        if (!response.ok) throw new Error("Catalogue lookup failed");
        const data = await response.json();
        return exactOnlineSupermarkets(data.offers, batch, country);
      } catch {
        throw new Error("Catalogue lookup failed");
      }
    }),
  );
  return offers.flat();
}

export function supermarketsBySeller(
  offers: OnlineSupermarket[],
  preferredCodes: string[],
): OnlineSupermarket[] {
  const preferred = new Set(
    preferredCodes.map((code) => code.padStart(14, "0")),
  );
  const sellers = new Map<string, OnlineSupermarket>();
  for (const offer of offers) {
    const existing = sellers.get(offer.name);
    if (
      !existing ||
      (preferred.has(offer.code.padStart(14, "0")) &&
        !preferred.has(existing.code.padStart(14, "0")))
    )
      sellers.set(offer.name, offer);
  }
  return [...sellers.values()];
}
