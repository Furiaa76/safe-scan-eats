import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import { test } from 'node:test';

const modules = new Map();
function moduleUrl(name) {
  if (modules.has(name)) return modules.get(name);
  let source = stripTypeScriptTypes(readFileSync(new URL(`../src/lib/${name}.ts`, import.meta.url), 'utf8'));
  // Icons are presentation only; exercise the real allergen definitions.
  source = source.replace(/import\s*\{([^}]+)\}\s*from "lucide-react";/, (_, names) => `const ${names.split(',').map(x => x.trim()).filter(Boolean).map(x => `${x} = null`).join(',')};`);
  source = source.replace(/from "\.\/([a-z-]+)"/g, (_, dependency) => `from "${moduleUrl(dependency)}"`);
  const url = 'data:text/javascript;base64,' + Buffer.from(source).toString('base64');
  modules.set(name, url);
  return url;
}
const { hasGlutenFreeDeclaration } = await import(moduleUrl('free-from'));
const { analyzeFood } = await import(moduleUrl('verdict'));
const product = ingredientsText => ({ name: 'Prodotto fotografato', brand: '', code: '', source: 'manual', ingredientsText, allergenTags: [], traceTags: [], labelTags: [] });

for (const claim of ['senza glutine', 'SENZA GLUTINE', 'privo di glutine', 'priva di glutine', 'privi di glutine', 'prive di glutine', 'naturalmente prive di glutine', 'esente da glutine', 'esenti da glutine', 'assenza di glutine', 'non contiene glutine', 'non contengono glutine', 'gluten free', 'gluten-free', 'glutenfree', 'free from gluten', 'no gluten', 'without gluten', 'sans gluten', 'sin gluten', 'sem gluten', 'glutenfrei', 'senza\nglutine', 's e n z a  g l u t i n e', 'prive di glu tine']) {
  test(`explicit declaration: ${claim}`, () => {
    assert.equal(hasGlutenFreeDeclaration(claim), true);
    assert.equal(analyzeFood(product(`Tortina ${claim}. Ingredienti: farina di riso, uova, latte, soia.`), ['glutine']).verdict, 'compatible');
  });
}
for (const text of ['contiene glutine', 'non è senza glutine', 'non privo di glutine', 'not gluten free', 'not\ngluten free', 'non è\nsenza glutine', 'no longer gluten free', 'forse senza glutine', 'potrebbe essere senza glutine', 'senza glutine?', 'a basso contenuto di glutine', 'senza aggiunta di glutine', 'farina di frumento', 'glutine']) {
  test(`not an absence declaration: ${text}`, () => {
    assert.equal(hasGlutenFreeDeclaration(text), false);
    assert.notEqual(analyzeFood(product(text), ['glutine']).verdict, 'compatible');
  });
}
test('reported OCR with repeated declarations and trace paragraph', () => {
  const text = 'al! A e a. CLITINE + G nn. PRIVE DI GLUTINE. TORTINA SENZA GLUTINE SPECIFICAMENTE FORMULATA PER PERSONE INTOLLEF JTINE CON FARINA INTEGRALE DI RISO E GOCCE DI CIOCCOLATI Ingredienti: uova fresche, zucchero, farina di riso, cioccolato, lecitina di soia, yogurt (latte). Può contenere tracce di frutta a guscio, semi di sesamo e lupino. PREPARATE CON MATERIE PRIME NATURALMENTE PRIVE DI GLUTINE';
  assert.equal(analyzeFood(product(text), ['glutine']).verdict, 'compatible');
  for (const allergen of ['uova', 'soia']) assert.equal(analyzeFood(product(text), ['glutine', allergen]).verdict, 'avoid');
});
test('real gluten traces and custom wheat exclusion stay active', () => {
  assert.equal(analyzeFood(product('Privo di glutine. Riso. Può contenere tracce di glutine.'), ['glutine']).verdict, 'warning');
  const p = product('Senza glutine. Amido di frumento deglutinato, zucchero.');
  assert.equal(analyzeFood(p, ['glutine']).verdict, 'compatible');
  assert.equal(analyzeFood(p, ['glutine'], ['frumento']).verdict, 'avoid');
});
test('catalog names use the same variants and preserve conflicting allergen tags', () => {
  const p = { ...product('riso, zucchero'), source: 'off', name: 'Biscotti privi di glutine' };
  assert.equal(analyzeFood(p, ['glutine']).verdict, 'compatible');
  assert.equal(analyzeFood({ ...p, allergenTags: ['en:gluten'] }, ['glutine']).verdict, 'warning');
});

test('Lindor 7610400010030 identifies barley malt in the catalog and on the package', () => {
  const catalog = {
    ...product("zucchero, lecitina di soia, estratto di malto d'orzo, aromi"),
    code: '7610400010030', name: 'LINDOR', brand: 'Lindt', source: 'off',
    ingredientsLanguage: 'it', allergenTags: ['en:gluten', 'en:milk', 'en:soybeans'],
    labelTags: ['en:green-dot'],
  };
  assert.equal(analyzeFood(catalog, ['glutine']).verdict, 'avoid');
  for (const barleyMalt of ["malto d’orzo", "extract of malt orge", "barley malt extract", "extrait de malt d’orge", "Gerstenmalzextrakt", "gerstemoutextract"]) {
    const result = analyzeFood(product(`zucchero, ${barleyMalt}, aromi`), ['glutine']);
    assert.equal(result.verdict, 'avoid', barleyMalt);
    assert.ok(result.reasons.some(reason => reason.text.includes('malto d’orzo')));
  }
  assert.equal(analyzeFood(product("riso, può contenere malto d'orzo"), ['glutine']).verdict, 'warning');
});

test('a catalog gluten-free tag cannot hide barley malt or replace missing ingredients', () => {
  const catalog = {
    ...product("zucchero, estratto di malto d'orzo"),
    source: 'off', labelTags: ['en:no-gluten'],
  };
  assert.equal(analyzeFood(catalog, ['glutine']).verdict, 'warning');
  assert.equal(analyzeFood({ ...catalog, ingredientsText: '' }, ['glutine']).verdict, 'warning');
  assert.equal(analyzeFood({ ...catalog, ingredientsText: 'Zucker, Aroma', ingredientsLanguage: 'de' }, ['glutine']).verdict, 'warning');
  assert.equal(analyzeFood(product("Senza glutine. Zucchero, estratto di malto d'orzo."), ['glutine']).verdict, 'compatible');
});
