// Confirmed in the Amazon Associates welcome email. Valid for Amazon.it only.
export const AMAZON_ASSOCIATE_TAG = "safescan-21";

export function amazonAffiliateSearchUrl(
  query: string,
  country: string,
  isNative: boolean,
): string | null {
  // Native apps require a separate Amazon approval. Other markets need their
  // own account/tag; do not silently redirect their users to the Italian store.
  if (isNative || country !== "it") return null;
  const keywords = query.trim().slice(0, 350);
  if (keywords.length < 2) return null;
  const params = new URLSearchParams({ k: keywords, tag: AMAZON_ASSOCIATE_TAG });
  return `https://www.amazon.it/s?${params}`;
}
