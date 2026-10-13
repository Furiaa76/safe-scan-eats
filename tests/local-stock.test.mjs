import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { stripTypeScriptTypes } from "node:module";
import vm from "node:vm";
const source = stripTypeScriptTypes(
  readFileSync(new URL("../src/lib/local-stock.ts", import.meta.url), "utf8"),
).replace(/export /g, "");
const context = vm.createContext({ Set, Date, URL });
vm.runInContext(source + "\nthis.filter=confirmedLocalStock;", context);
const now = Date.now();
const offer = {
  code: "8002580001646",
  retailer: "Test store",
  storeId: "branch-1",
  address: "Test street 1",
  country: "it",
  city: "Como",
  sourceUrl:
    "https://inventory.example.test/stores/branch-1/items/8002580001646",
  evidence: "store-inventory",
  availability: "in-stock",
  checkedAt: new Date(now - 60000).toISOString(),
  expiresAt: new Date(now + 120000).toISOString(),
};
const check = (rows) =>
  context.filter(rows, ["8002580001646"], "it", "Como", now);
assert.equal(check([offer]).length, 1);
for (const patch of [
  { code: "8002580001647" },
  { city: "Milano" },
  { city: "Comox" },
  { country: "ch" },
  { address: "" },
  { storeId: "" },
  { sourceUrl: "https://user:password@inventory.example.test/x" },
  { sourceUrl: "http://inventory.example.test/x" },
  { evidence: "online-catalogue" },
  { availability: "out-of-stock" },
  { availability: "unknown" },
  { checkedAt: new Date(now - 900000).toISOString() },
  { checkedAt: new Date(now + 60000).toISOString() },
  { expiresAt: new Date(now - 1).toISOString() },
  { expiresAt: new Date(now + 900000).toISOString() },
])
  assert.equal(
    check([{ ...offer, ...patch }]).length,
    0,
    JSON.stringify(patch),
  );
assert.equal(check([]).length, 0);
assert.equal(check(null).length, 0);
assert.equal(
  check([{ code: offer.code, stores: ["Esselunga", "Carrefour"] }]).length,
  0,
);
assert.equal(
  context.filter([offer], ["8002580001646"], "it", "", now).length,
  0,
);
assert.equal(check([offer, offer]).length, 1);
assert.equal(
  check([{ ...offer, code: "08002580001646", city: "  COMO  " }]).length,
  1,
);
const links = readFileSync(
  new URL("../src/components/PurchaseLinks.tsx", import.meta.url),
  "utf8",
);
assert.ok(!links.includes("shopMapUrl"));
assert.ok(links.includes("local: true"));
assert.ok(links.includes("onlinePurchaseUrl"));
console.log(
  "Local stock: exact GTIN, physical branch, city/country, current stock, expiry, evidence, safe source and no generic map fallback passed.",
);
// Exercise the actual server handler: absent/failed integrations must not fall
// back to a store chain, a map, or an online catalogue.
const { z } = await import('zod');
context.z=z;context.process={env:{}};context.AbortSignal=AbortSignal;
let inventoryFetches=0;
context.fetch=async()=>{inventoryFetches++;throw new Error('unavailable');};
context.createServerFn=()=>({inputValidator(){return this;},handler(handler){return handler;}});
const server=stripTypeScriptTypes(readFileSync(new URL('../src/lib/local-stock.functions.ts',import.meta.url),'utf8')).replace(/^import .*;\n/gm,'').replace(/export /g,'');
vm.runInContext(server+'\nthis.checkStock=checkLocalStock;',context);
const input={data:{codes:['8002580001646'],country:'it',city:'Como'}};
assert.equal((await context.checkStock(input)).status,'unavailable');
assert.equal(inventoryFetches,0);
context.process.env.LOCAL_STOCK_FEED_URL='https://inventory.example.test/feed';
assert.equal((await context.checkStock(input)).offers.length,0);
context.fetch=async url=>{assert.equal(url.searchParams.get('city'),'Como');assert.equal(url.searchParams.get('codes'),'8002580001646');return {ok:true,headers:new Headers(),json:async()=>[offer,{...offer,storeId:'wrong-city',city:'Milano'}]};};
const available=await context.checkStock(input);
assert.equal(available.status,'ok');assert.equal(available.offers.length,1);
console.log('Store inventory handler: no source, failed source, and exact product/branch checks passed.');
