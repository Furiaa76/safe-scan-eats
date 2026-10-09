import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { test } from 'node:test';
import ts from 'typescript';
const source = readFileSync(new URL('../src/lib/off-search.functions.ts', import.meta.url), 'utf8');
function catalog(fetch) {
 const js = ts.transpileModule(source.replace(/^import .*;\n/gm, '').replace('export const offSearch', 'const offSearch'), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText.replace(/export \{\};?/, '');
 const context = vm.createContext({ fetch, AbortSignal, console, purchaseCountry: () => ({ tag: 'en:italy' }), createServerFn: () => ({ inputValidator() { return this; }, handler(fn) { return fn; } }) });
 vm.runInContext(js + '\nglobalThis.api = { offSearch, queryVariants, matchesProductQuery };', context);
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
