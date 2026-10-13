import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';
const source = readFileSync(new URL('../src/lib/recipe-catalog.ts',import.meta.url),'utf8');
const recipes = JSON.parse(source.match(/export const EXTRA_RECIPES: CatalogRecipe\[\] = ([\s\S]*?);\n/)[1]);
const route = readFileSync(new URL('../src/routes/recipes.tsx',import.meta.url),'utf8');
const helper = route.slice(route.indexOf('function safeIngredientName('),route.indexOf('export const Route'));
const context=vm.createContext({containsAllergen:()=>false});
vm.runInContext(ts.transpileModule(helper,{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText+'\nthis.adapt=safeIngredientName;',context);
test('ravioli shopping list uses a ready-made product and its condiments',()=>{
 const recipe=recipes.find(r=>r.id==='ravioli-ricotta-e-spinaci');
 assert.equal(recipe.ingredients[0].name,'Ravioli ricotta e spinaci');
 assert.equal(recipe.ingredients[0].quantity,'800 g');
 assert.ok(!recipe.ingredients.some(i=>/^(farina|uova|ricotta|spinaci)\b/i.test(i.name)));
 for(const restrictions of [[],['glutine'],['lattosio'],['glutine','lattosio']]) {
  const {name}=context.adapt(recipe.ingredients[0],restrictions);
  assert.ok(name.startsWith('Ravioli ricotta e spinaci'));
  for(const restriction of restrictions) assert.ok(name.includes(`senza ${restriction}`));
 }
});
test('pasta, gnocchi, lasagne and cannelloni remain purchased pasta ingredients',()=>{
 for(const id of ['pasta-al-pomodoro','gnocchi-al-pomodoro','tortellini-in-brodo','cannelloni-di-carne','lasagne-vegetariane']) {
  const recipe=recipes.find(r=>r.id===id);
  assert.ok(recipe,id);
  assert.ok(!recipe.ingredients.some(i=>/^farina\b/i.test(i.name)),id);
 }
});
