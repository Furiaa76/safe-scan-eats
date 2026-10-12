import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import ts from 'typescript';
import vm from 'node:vm';
const moduleUrl = (source) => 'data:text/javascript;base64,' + Buffer.from(ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText).toString('base64');
const allergens = moduleUrl(readFileSync(new URL('../src/lib/allergens.ts', import.meta.url), 'utf8').replace('from "lucide-react";', `from "${import.meta.resolve('lucide-react')}";`));
const verdictSource = readFileSync(new URL('../src/lib/verdict.ts', import.meta.url), 'utf8').replaceAll('from "./allergens";', `from "${allergens}";`);
const { compatiblePurchaseProducts, analyzeFood, purchaseProductGroups } = await import(moduleUrl(verdictSource));
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

const foodCases = [
 ['glutine', 'farina di frumento', 'wheat flour', 'en:gluten'],
 ['lattosio', 'lattosio', 'lactose', 'en:milk'],
 ['arachidi', 'arachide', 'peanut', 'en:peanuts'],
 ['frutta-guscio', 'mandorla', 'almond', 'en:nuts'],
 ['uova', 'uovo', 'egg', 'en:eggs'],
 ['soia', 'soia', 'soybeans', 'en:soybeans'],
 ['pesce', 'merluzzo', 'cod', 'en:fish'],
 ['crostacei', 'gambero', 'shrimp', 'en:crustaceans'],
 ['sesamo', 'sesamo', 'tahini', 'en:sesame-seeds'],
];
for (const [id, italian, english, tag] of foodCases) {
 test(`${id}: Italian and English ingredients are never compatible`, () => {
  for (const word of [italian, english]) assert.notEqual(analyzeFood(product('x', 'acqua, '+word), [id]).verdict, 'compatible', word);
 });
 test(`${id}: declared allergens and traces stay out of compatible purchase results`, () => {
  assert.notEqual(analyzeFood(product('tag', 'acqua, riso', {allergenTags:[tag]}), [id]).verdict, 'compatible');
  assert.equal(analyzeFood(product('trace', 'acqua, riso', {traceTags:[tag]}), [id]).verdict, 'warning');
  for (const prefix of ['può contenere ', 'may contain ']) assert.equal(analyzeFood(product('text-trace', 'acqua, riso; '+prefix+italian), [id]).verdict, 'warning');
 });
 test(`${id}: absent data is review, not compatibility`, () => {
  assert.equal(analyzeFood(product('unknown', ''), [id]).verdict, 'warning');
 });
}
test('plant milk removes dairy ambiguity but preserves nut and soy findings', () => {
 const almond = product('almond', 'acqua, latte di mandorla');
 assert.equal(analyzeFood(almond, ['lattosio']).verdict, 'compatible');
 assert.equal(analyzeFood(almond, ['frutta-guscio']).verdict, 'avoid');
 assert.equal(analyzeFood(product('soy', 'latte di soia, acqua'), ['soia']).verdict, 'avoid');
 assert.equal(analyzeFood(almond, [], ['mandorla']).verdict, 'avoid');
});
test('English eggplant does not trigger egg allergy', () => {
 assert.equal(analyzeFood(product('veg', 'eggplant, water, rice'), ['uova']).verdict, 'compatible');
});
test('nutmeg and coconut do not trigger tree nut allergy', () => {
 assert.equal(analyzeFood(product('spice', 'noce moscata, noce di cocco, acqua'), ['frutta-guscio']).verdict, 'compatible');
});
test('free labels apply to their own restriction, never to a second allergy', () => {
 const p=product('mix','latte, nocciola', {labelTags:['en:no-lactose','en:no-gluten']});
 assert.equal(analyzeFood(p,['lattosio','glutine']).verdict,'compatible');
 assert.equal(analyzeFood(p,['lattosio','frutta-guscio']).verdict,'avoid');
 assert.equal(analyzeFood({...p,traceTags:['en:nuts']},['frutta-guscio']).verdict,'avoid');
});
test('contradictory gluten-free declarations need review', () => {
 assert.equal(analyzeFood(product('conflict','acqua, amido', {labelTags:['en:no-gluten'],allergenTags:['en:gluten']}), ['glutine']).verdict,'warning');
});
test('review products stay separate from compatible and unsafe products', () => {
 const groups=purchaseProductGroups([product('ok','riso, acqua'), product('unknown',''),product('trace','riso, acqua',{traceTags:['en:nuts']}),product('avoid','mandorla, acqua')],{allergens:['frutta-guscio']});
 assert.deepEqual(groups.compatible.map(p=>p.code),['ok']);
 assert.deepEqual(groups.review.map(p=>p.code),['unknown','trace']);
 assert.deepEqual(groups.avoid.map(p=>p.code),['avoid']);
});
for (const [id, ingredient] of [['istamina','pomodoro'],['polline-betulla','mela'],['polline-graminacee','pesca'],['polline-ambrosia','banana'],['polline-artemisia-asteracee','camomilla']]) {
 test(`${id}: sensitivity and pollen findings remain warnings`,()=>{
  assert.equal(analyzeFood(product('sensitive',ingredient+', acqua'),[id]).verdict,'warning');
  assert.equal(analyzeFood(product('unknown',''),[id]).verdict,'warning');
 });
}
test('unknown profile entries never silently produce compatibility',()=>{
 assert.equal(analyzeFood(product('x','riso, acqua'),['unknown-id']).verdict,'warning');
});

test('recipe ingredient checks support every selectable profile without crashing', async()=>{
 const {ALLERGENS}=await import(allergens);
 const route=readFileSync(new URL('../src/routes/recipes.tsx',import.meta.url),'utf8');
 const snippet=route.slice(route.indexOf('const ENGLISH_ALLERGEN_WORDS'),route.indexOf('function safeIngredientName'));
 const code=ts.transpileModule(snippet,{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
 const context=vm.createContext({ALLERGENS});
 vm.runInContext(code+';globalThis.check=containsAllergen;',context);
 for(const allergen of ALLERGENS) assert.doesNotThrow(()=>context.check('riso',allergen.id),allergen.id);
});
