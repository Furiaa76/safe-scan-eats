import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { stripTypeScriptTypes } from "node:module";
import { test } from "node:test";

const source = stripTypeScriptTypes(readFileSync(new URL("../src/lib/amazon-affiliate.ts", import.meta.url), "utf8"));
const { amazonAffiliateSearchUrl } = await import(`data:text/javascript,${encodeURIComponent(source)}`);

test("the Italian affiliate link preserves product identity and restrictions", () => {
  const query = '"Panfette" "Schär" "senza glutine" "senza lattosio"';
  const url = new URL(amazonAffiliateSearchUrl(query, "it", false));
  assert.equal(url.origin, "https://www.amazon.it");
  assert.equal(url.pathname, "/s");
  assert.equal(url.searchParams.get("k"), query);
  assert.equal(url.searchParams.get("tag"), "safescan-21");
});

test("query text cannot replace the host or tracking ID", () => {
  const query = 'Pasta & tag=other-21 #glutine? https://example.com';
  const url = new URL(amazonAffiliateSearchUrl(query, "it", false));
  assert.equal(url.origin, "https://www.amazon.it");
  assert.deepEqual(url.searchParams.getAll("tag"), ["safescan-21"]);
  assert.equal(url.searchParams.get("k"), query);
  assert.equal(url.hash, "");
});

test("native platforms, other markets and empty queries have no affiliate link", () => {
  assert.equal(amazonAffiliateSearchUrl("pasta", "it", true), null);
  for (const country of ["ch", "fr", "de", "us", ""]) {
    assert.equal(amazonAffiliateSearchUrl("pasta", country, false), null);
  }
  for (const query of ["", "   ", "a"]) assert.equal(amazonAffiliateSearchUrl(query, "it", false), null);
});
