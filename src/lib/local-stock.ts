export interface LocalStockOffer {
  code: string;
  retailer: string;
  storeId: string;
  address: string;
  city: string;
  country: string;
  sourceUrl: string;
  evidence: "store-inventory";
  availability: "in-stock";
  checkedAt: string;
  expiresAt: string;
}
const locality = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
const gtin = (value: string) =>
  /^\d{8,14}$/.test(value) ? value.padStart(14, "0") : "";
// A chain's online catalogue, a map, or OFF's stores field is never stock proof.
export function confirmedLocalStock(
  rows: unknown,
  codes: string[],
  country: string,
  city: string,
  now = Date.now(),
): LocalStockOffer[] {
  if (!city.trim() || !Array.isArray(rows)) return [];
  const wanted = new Set(codes.map(gtin).filter(Boolean));
  const found = new Set<string>();
  return rows
    .filter((row): row is LocalStockOffer => {
      if (!row || typeof row !== "object") return false;
      for (const key of [
        "code",
        "retailer",
        "storeId",
        "address",
        "city",
        "country",
        "sourceUrl",
        "checkedAt",
        "expiresAt",
      ])
        if (
          typeof row[key] !== "string" ||
          !row[key].trim() ||
          row[key].length > 400
        )
          return false;
      if (
        row.evidence !== "store-inventory" ||
        row.availability !== "in-stock" ||
        !wanted.has(gtin(row.code)) ||
        row.country.toLowerCase() !== country.toLowerCase() ||
        locality(row.city) !== locality(city)
      )
        return false;
      const checked = Date.parse(row.checkedAt),
        expires = Date.parse(row.expiresAt);
      if (
        !Number.isFinite(checked) ||
        !Number.isFinite(expires) ||
        checked > now ||
        now - checked > 600_000 ||
        expires <= now ||
        expires > checked + 600_000
      )
        return false;
      try {
        const url = new URL(row.sourceUrl);
        if (url.protocol !== "https:" || url.username || url.password)
          return false;
      } catch {
        return false;
      }
      const key = `${gtin(row.code)}:${row.country.toLowerCase()}:${row.storeId}`;
      if (found.has(key)) return false;
      found.add(key);
      return true;
    })
    .map((row) => ({
      code: row.code,
      retailer: row.retailer,
      storeId: row.storeId,
      address: row.address,
      city: row.city,
      country: row.country,
      sourceUrl: row.sourceUrl,
      evidence: row.evidence,
      availability: row.availability,
      checkedAt: row.checkedAt,
      expiresAt: row.expiresAt,
    }));
}
