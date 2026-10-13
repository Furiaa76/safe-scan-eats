import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import ts from 'typescript';
const source = ts.transpileModule(readFileSync('api/online-retailers.ts', 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText;
const { carrefourCatalogue, GET } = await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));
const code = '8002580001646';
const product = { '@type': 'Product', name: 'Chef Besciamella Senza Lattosio 500 ml', sku: code, offers: { url: `https://www.carrefour.it/p/chef-besciamella-senza-lattosio-500-ml/${code}.html`, availability: 'http://schema.org/InStock' } };
const html = (value) => `<script type="application/ld+json">${JSON.stringify(value)}</script>`;
test('exact retailer EAN and product page prove catalogue presence, never local stock', () => {
  const offer = carrefourCatalogue(html(product), code);
  assert.equal(offer.name, 'Carrefour');
  assert.equal(offer.country, 'it');
  assert.equal(offer.sourceUrl, product.offers.url);
  assert.equal(offer.availability, undefined);
  assert.equal(offer.city, undefined);
  assert.equal(offer.storeId, undefined);
  assert.equal(offer.pickup, undefined);
  assert.ok(Date.now() - Date.parse(offer.checkedAt) < 1000);
  assert.ok(carrefourCatalogue(html({ '@graph': [product] }), code));
});
test('names, brand matches, other barcodes and unrelated links are not evidence', () => {
  for (const value of [
    { ...product, sku: '8008698006511' },
    { ...product, sku: undefined },
    { ...product, '@type': 'Organization' },
    { ...product, offers: { url: 'https://www.carrefour.it/search?q=besciamella' } },
    { ...product, offers: { url: product.offers.url.replace('www.carrefour.it', 'evil.example') } },
    { ...product, offers: { url: product.offers.url.replace('https:', 'http:') } },
    { ...product, offers: { url: product.offers.url.replace('www.carrefour.it', 'user@www.carrefour.it') } },
  ]) assert.equal(carrefourCatalogue(html(value), code), null);
  assert.equal(carrefourCatalogue('<script type="application/ld+json">broken</script>', code), null);
});
test('unknown country and invalid codes never request a retailer', async () => {
  const original = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async () => { calls++; throw new Error('should not fetch'); };
  try {
    const foreign = await GET(new Request(`https://app.example/api/online-retailers?code=${code}&country=ch`));
    assert.deepEqual(await foreign.json(), { offers: [] });
    assert.equal((await GET(new Request('https://app.example/api/online-retailers?code=bad&country=it'))).status, 400);
    assert.equal(calls, 0);
  } finally { globalThis.fetch = original; }
});
test('actual handler follows only retailer redirects, caches proof and rejects blocked/oversized pages', async () => {
  const original = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async (url) => {
    calls++;
    assert.equal(new URL(url).hostname, 'www.carrefour.it');
    if (calls === 1) return new Response(null, { status: 302, headers: { location: product.offers.url } });
    return new Response(html(product), { headers: { 'content-type': 'text/html' } });
  };
  try {
    const request = new Request(`https://app.example/api/online-retailers?code=${code}&country=it`);
    assert.equal((await (await GET(request)).json()).offers[0].name, 'Carrefour');
    await GET(request);
    assert.equal(calls, 2);
    globalThis.fetch = async () => new Response(null, { status: 302, headers: { location: 'https://evil.example' } });
    assert.deepEqual(await (await GET(new Request('https://app.example/api/online-retailers?code=8008698006511&country=it'))).json(), { offers: [] });
    globalThis.fetch = async () => new Response('x'.repeat(500001) + html({ ...product, sku: '8008698006512' }), { headers: { 'content-type': 'text/html' } });
    assert.deepEqual(await (await GET(new Request('https://app.example/api/online-retailers?code=8008698006512&country=it'))).json(), { offers: [] });
    globalThis.fetch = async () => { throw new Error('blocked'); };
    assert.deepEqual(await (await GET(new Request('https://app.example/api/online-retailers?code=8008698006513&country=it'))).json(), { offers: [] });
  } finally { globalThis.fetch = original; }
});
