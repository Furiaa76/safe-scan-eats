import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import ts from 'typescript';
const moduleUrl = (source) => 'data:text/javascript;base64,' + Buffer.from(ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText).toString('base64');
const allergens = moduleUrl(readFileSync(new URL('../src/lib/allergens.ts', import.meta.url), 'utf8').replace('from "lucide-react";', `from "${import.meta.resolve('lucide-react')}";`));
const verdictSource = readFileSync(new URL('../src/lib/verdict.ts', import.meta.url), 'utf8').replaceAll('from "./allergens";', `from "${allergens}";`);
const { compatiblePurchaseProducts } = await import(moduleUrl(verdictSource));
const product = (code, ingredientsText, fields = {}) => ({ code, name: code, brand: '', source: 'off', ingredientsText, allergenTags: [], traceTags: [], labelTags: [], ...fields });
const products = [product('rice', 'farina di riso, acqua'), product('wheat', 'farina di frumento, acqua', { allergenTags: ['en:gluten'] }), product('traces', 'riso, acqua', { traceTags: ['en:gluten'] }), product('unknown', ''), product('soy', 'riso, soia', { allergenTags: ['en:soybeans'] })];
test('shopping excludes gluten, traces and missing ingredients', () => {
 assert.deepEqual(compatiblePurchaseProducts(products, { allergens: ['glutine'] }).map(p => p.code), ['rice', 'soy']);
});
test('switching profile applies all active restrictions', () => {
 assert.deepEqual(compatiblePurchaseProducts(products, { allergens: ['glutine', 'soia'] }).map(p => p.code), ['rice']);
});
test('manual allergens are also excluded, including regex characters', () => {
 assert.deepEqual(compatiblePurchaseProducts([product('custom', 'riso, E.123'), product('ok', 'riso, acqua')], { allergens: [], customAllergens: ['E.123'] }).map(p => p.code), ['ok']);
});
test('free mode retains unfiltered results', () => assert.equal(compatiblePurchaseProducts(products, null), products));
