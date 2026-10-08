import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import vm from 'node:vm';

// Exercise the actual request handler with isolated cloud data and SDK stubs.
// Production signature and timestamp verification remain enabled in the source.
let items = [];
let profiles = [];
let writes = 0;
let failWrite = false;
let signatureOK = true;
const original = readFileSync(new URL('../api/alexa.ts', import.meta.url), 'utf8');
assert.ok(!original.includes('../src/lib/alexa-language'), 'Server entry must not depend on an extensionless local ESM module');
const source = stripTypeScriptTypes(original)
  .replace(/import \{ generateText \} from "ai";/, '')
  .replace(/import \{[\s\S]*?\} from "ask-sdk-express-adapter";/, '')
  .replace(/export async function /g, 'async function ');
const sandbox = {
  Request, Response, crypto,
  console: { log() {}, error() {} },
  generateText: async () => { throw new Error('AI must not be called for built-in recipes or resizing'); },
  SkillRequestSignatureVerifier: class { async verify() { if (!signatureOK) throw new Error('bad signature'); } },
  TimestampVerifier: class { async verify() {} },
  fetch: async (url, options) => {
    const name = url.split('/').at(-1);
    const payload = JSON.parse(options.body);
    let value;
    if (name === 'safe_scan_alexa_household') value = 'test-household';
    else if (name === 'safe_scan_get_profiles') value = profiles;
    else if (name === 'safe_scan_get_preferences') value = [];
    else if (name === 'safe_scan_get_shopping') value = structuredClone(items.map((item) => ({ ...item, created_at: item.createdAt })));
    else if (name === 'safe_scan_replace_shopping') {
      if (failWrite) return new Response('test failure', { status: 500 });
      writes++;
      items = structuredClone(payload.p_items);
      value = null;
    } else throw new Error(`Unexpected RPC: ${name}`);
    return new Response(JSON.stringify(value));
  },
};
vm.createContext(sandbox);
vm.runInContext(source + '\nthis.handler = POST; this.generate = generateIngredients; this.recipes = EXTRA_RECIPES; this.clean = cleanDish;', sandbox);
async function say(intent, slots = {}, attributes = {}, locale = 'it-IT') {
  const request = new Request('https://example.test/api/alexa', {
    method: 'POST', headers: { signature: 'test-only' },
    body: JSON.stringify({ context: { System: { user: { userId: 'test-user' } } },
      session: { attributes }, request: { type: 'IntentRequest', locale, intent: { name: intent,
        slots: Object.fromEntries(Object.entries(slots).map(([name, value]) => [name, { value }])) } } }),
  });
  return await (await sandbox.handler(request)).json();
}
const speech = (result) => result.response.outputSpeech.text;

const catalogSource = readFileSync(new URL('../src/lib/recipe-catalog.ts', import.meta.url), 'utf8');
const catalog = JSON.parse(catalogSource.match(/export const EXTRA_RECIPES: CatalogRecipe\[\] = ([\s\S]*?);\n/)[1]);
assert.deepEqual(JSON.parse(JSON.stringify(sandbox.recipes)), catalog, 'App and Alexa catalog must stay synchronized');
assert.equal(catalog.length, 108);
assert.equal(new Set(catalog.map(r => r.id)).size, catalog.length);
const aliases = new Map();
let cases = 0;
for (const recipe of catalog) {
  assert.equal(recipe.servings, 4);
  assert.ok(recipe.ingredients.length >= 3 && recipe.ingredients.length <= 30);
  for (const alias of [recipe.title, ...recipe.aliases]) {
    const key = sandbox.clean(alias);
    assert.ok(!aliases.has(key) || aliases.get(key) === recipe.id, `Ambiguous alias: ${alias}`);
    aliases.set(key, recipe.id);
    for (const servings of [1, 2, 3, 4, 10, 20]) {
      const result = await sandbox.generate(alias, servings);
      assert.ok(result, `${alias} must work without AI`);
      assert.equal(result.length, recipe.ingredients.length);
      assert.equal(result[0].name, recipe.ingredients[0].name);
      assert.ok(result.every(i => typeof i.quantity === 'string' && i.quantity && !i.quantity.includes('NaN')));
      cases++;
    }
  }
}
const meat = await sandbox.generate('i cannelloni', 2);
assert.ok(meat.some(i => i.name === 'Carne macinata'));
assert.equal(meat[0].quantity, '125 g');
const veg = await sandbox.generate('ricotta and spinach cannelloni', 2);
assert.ok(veg.some(i => i.name === 'Spinaci'));
assert.ok(!veg.some(i => i.name === 'Carne macinata'));
const adapted = await sandbox.generate('cannelloni', 2, false, ['glutine', 'lattosio']);
assert.equal(adapted[0].name, 'Cannelloni senza glutine');
assert.ok(adapted.some(i => i.name === 'Besciamella senza lattosio e senza glutine'));
assert.equal(await sandbox.generate('carbonara vegana sperimentale', 4), null, 'Unknown variant must not silently become carbonara');
items = [];
profiles = [{ id:'test-profile', name:'Fabio', allergens:['glutine','lattosio'] }];
let result = await say('CreateRecipeIntent', { dish:'cannelloni' });
assert.match(speech(result), /Per quante persone/);
result = await say('ChangeServingsIntent', { servings:'due' }, result.sessionAttributes);
assert.match(speech(result), /Ho aggiunto/);
assert.ok(items.some(i => i.name === 'Cannelloni senza glutine'));
result = await say('CreateRecipeIntent', { dish:'risotto ai funghi per quattro persone' }, result.sessionAttributes);
assert.match(speech(result), /sostituire/);
result = await say('ReplaceDuplicateRecipeIntent', {}, result.sessionAttributes);
assert.match(speech(result), /Ho sostituito/);
assert.ok(!items.some(i => i.name.includes('Cannelloni')));
assert.ok(items.some(i => i.name === 'Funghi'));
items=[]; profiles=[];
result=await say('CreateRecipeIntent',{dish:'ricotta and spinach cannelloni for two people'},{},'en-US');
assert.match(speech(result), /added/i);
result=await say('ReadShoppingListIntent',{},result.sessionAttributes,'en-US');
assert.match(speech(result), /spinach/i);
assert.ok(!speech(result).includes('Spinaci'));
console.log(`Recipe catalog passed: 115 available dishes, ${cases} alias/servings cases, variants, profile swaps, replacement and English/Italian requests.`);

items=[]; profiles=[{id:'laura',name:'Laura',allergens:['glutine']},{id:'fabio',name:'Fabio',allergens:[]}];
let profileTest=await say('CreateRecipeIntent',{dish:'pizzoccheri per due persone'});
assert.equal(profileTest.sessionAttributes.pendingAction,'recipeProfileSelection');
profileTest=await say('AddShoppingItemIntent',{item:'laura'},profileTest.sessionAttributes);
assert.match(speech(profileTest),/Ho aggiunto/);
assert.ok(items.some(i=>i.name==='Pizzoccheri senza glutine'));
assert.ok(!items.some(i=>i.name.toLowerCase()==='laura'));
const previous=JSON.stringify(items);
profileTest=await say('AddShoppingItemIntent',{item:'laura come profilo'});
assert.match(speech(profileTest),/prima dimmi/);
assert.equal(JSON.stringify(items),previous,'Profile expression must not become a grocery');
profileTest=await say('AddShoppingItemIntent',{item:'milk as a profile'},{},'en-US');
assert.match(speech(profileTest),/To choose a recipe profile/);
assert.equal(JSON.stringify(items),previous);
console.log('Profile/grocery confusion regression passed in Italian and English.');

items=[];
let lasagneTest=await say('CreateRecipeIntent',{dish:'lasagne'});
lasagneTest=await say('ChangeServingsIntent',{servings:'quattro'},lasagneTest.sessionAttributes);
lasagneTest=await say('SelectProfileIntent',{profile:'Laura'},lasagneTest.sessionAttributes);
assert.match(speech(lasagneTest),/8 ingredienti.*4 persone.*Laura/);
assert.ok(items.some(i=>i.name==='Sfoglia per lasagne senza glutine' && i.quantity==='250 g'));
assert.ok(items.some(i=>i.name==='Besciamella senza glutine' && i.quantity==='500 ml'));
assert.ok(!items.some(i=>['Sfoglia per lasagne','Besciamella'].includes(i.name)));
for (const [dish, expected] of [['carbonara','Pasta senza glutine'],['tiramisu','Savoiardi senza glutine'],['arancini','Farina senza glutine']]) {
  const generated=await sandbox.generate(dish,4,false,['glutine']);
  assert.ok(generated.some(i=>i.name===expected),dish);
}
console.log('Laura lasagne full-dialog regression and base-recipe substitutions passed.');
