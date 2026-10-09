import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { test } from 'node:test';
import ts from 'typescript';
const source = readFileSync(new URL('../src/lib/off-search.functions.ts', import.meta.url), 'utf8');
function catalog(fetch) {
 const js = ts.transpileModule(source.replace(/^import .*;\n/gm, '').replace('export const offSearch', 'const offSearch'), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText.replace(/export \{\};?/, '');
 const context = vm.createContext({ fetch, AbortSignal, console, purchaseCountry: () => ({ tag: 'en:italy' }), createServerFn: () => ({ inputValidator() { return this; }, handler(fn) { return fn; } }) });
 vm.runInContext(js + '\nglobalThis.api = { offSearch, queryVariants, matchesProductQuery, completeIngredients };', context);
 return context.api;
}
const unavailable = () => Promise.resolve({ ok: false });
test('catalog failures are reported as unavailable, not empty results', async () => {
 const res = await catalog(unavailable).offSearch({ data: { query: 'lasagne', fields: 'code' } });
 assert.equal(res.ok, false);
});
test('successful empty search stays a valid empty result', async () => {
 const res = await catalog(async () => ({ ok: true, json: async () => ({ products: [] }) })).offSearch({ data: { query: 'lasagne', fields: 'code' } });
 assert.equal(res.ok, true); assert.equal(res.json, '[]');
});
test('lasagne search retries shorter names but rejects ordinary wheat products', async () => {
 const api = catalog(unavailable);
 assert.ok(api.queryVariants('sfoglia per lasagne senza glutine').includes('lasagne'));
 assert.equal(api.matchesProductQuery({ product_name: 'Lasagne', labels_tags: ['en:gluten-free'] }, 'sfoglia per lasagne senza glutine'), true);
 assert.equal(api.matchesProductQuery({ product_name: 'Lasagne di grano' }, 'sfoglia per lasagne senza glutine'), false);
 assert.equal(api.matchesProductQuery({ product_name: 'Preparato per pane senza glutine' }, 'sfoglia per lasagne senza glutine'), false);
});
test('lactose-free declaration in labels counts without requiring it in product name', () => {
 assert.equal(catalog(unavailable).matchesProductQuery({ product_name: 'Latte', labels_tags: ['en:lactose-free'] }, 'latte senza lattosio'), true);
});

test('search results missing ingredients are completed from the barcode record', async () => {
 const api = catalog(async () => ({ ok: true, json: async () => ({ status: 1, product: { code: '12345678', ingredients_text: 'riso, acqua' } }) }));
 const result = await api.completeIngredients({ code: '12345678', product_name: 'Lasagne' }, 'code,ingredients_text');
 assert.equal(result.ingredients_text, 'riso, acqua');
 assert.equal(result.product_name, 'Lasagne');
});
test('failed ingredient lookup leaves data incomplete rather than inventing compatibility', async () => {
 const result = await catalog(unavailable).completeIngredients({ code: '12345678' }, 'ingredients_text');
 assert.equal(result.ingredients_text, undefined);
});
test('recognizes the canonical no-gluten label used by the catalog', () => {
 assert.equal(catalog(unavailable).matchesProductQuery({ product_name: 'Lasagne', labels_tags: ['en:no-gluten'] }, 'sfoglia per lasagne senza glutine'), true);
});
test('alternative searches filter by country before choosing the first page', async () => {
 const urls = [];
 const api = catalog(async (url) => { urls.push(url); return { ok: true, json: async () => url.includes('cgi/search') ? { products: [] } : { hits: [] } }; });
 await api.offSearch({ data: { query: 'lasagne', fields: 'code', country: 'it' } });
 assert.ok(urls.some(url => url.includes('search.openfoodfacts.org') && new URL(url).searchParams.get('q').includes('AND countries_tags:"en:italy"')));
});
test('recipe lasagne sheets match fresh sheets and canonical gluten-free labels', () => {
 const api = catalog(unavailable);
 const query = 'sfoglia er lasagne senza glutine';
 assert.ok(api.queryVariants(query).includes('sfoglia fresca'));
 assert.equal(api.matchesProductQuery({ product_name: 'Sfoglia fresca senza glutine', labels_tags: ['en:no-gluten'] }, query), true);
 assert.equal(api.matchesProductQuery({ product_name: 'Lasagne alla bolognese senza glutine', labels_tags: ['en:no-gluten'] }, query), false);
 assert.equal(api.matchesProductQuery({ product_name: 'Pasta sfoglia fresca senza glutine', labels_tags: ['en:no-gluten'] }, query), false);
});
test('an unrelated legacy result page cannot hide matching alternative results', async () => {
 const api = catalog(async (url) => ({ ok: true, json: async () => url.includes('cgi/search')
  ? { products: [{ code: '11111111', product_name: 'Pane senza glutine' }] }
  : { hits: [{ code: '8021228901643', product_name: 'Sfoglia fresca senza glutine', labels_tags: ['en:no-gluten'], countries_tags: ['en:italy'], ingredients_text: 'amido di mais, uova, riso' }] } }));
 const res = await api.offSearch({ data: { query: 'sfoglia per lasagne senza glutine', fields: 'code', country: 'it' } });
 assert.equal(res.ok, true);
 assert.equal(JSON.parse(res.json)[0].code, '8021228901643');
});
test('successful alternative search does not wait for the legacy endpoint', async () => {
 const urls = [];
 const api = catalog(async (url) => {
  urls.push(url);
  if (url.includes('cgi/search')) throw new Error('legacy should not be called');
  return { ok: true, json: async () => ({ hits: [{ code: '8021228901643', product_name: 'Lasagne senza glutine', ingredients_text: 'riso', countries_tags: ['en:italy'] }] }) };
 });
 const result = await api.offSearch({ data: { query: 'lasagne', fields: 'code', country: 'it' } });
 assert.equal(result.ok, true);
 assert.equal(JSON.parse(result.json).length, 1);
 assert.ok(urls.every(url => !url.includes('cgi/search')));
});
test('recipe sheets use category and gluten declarations rather than broad text results', async () => {
 const urls = [];
 const api = catalog(async (url) => {
  urls.push(url);
  return { ok: true, json: async () => ({ hits: [{ code: '8021228901643', product_name: 'Sfoglia fresca senza glutine', countries_tags: ['en:italy'], labels_tags: ['en:no-gluten'], ingredients_text: 'amido di mais, uova' }] }) };
 });
 const result = await api.offSearch({ data: { query: 'sfoglia per lasagne senza glutine', fields: 'code', country: 'it' } });
 assert.equal(JSON.parse(result.json)[0].code, '8021228901643');
 assert.equal(urls.length, 1);
 const query = new URL(urls[0]).searchParams.get('q');
 assert.ok(query.includes('categories_tags:"en:lasagna-sheets"'));
 assert.ok(query.includes('labels_tags:"en:no-gluten"'));
 assert.ok(query.includes('countries_tags:"en:italy"'));
});
