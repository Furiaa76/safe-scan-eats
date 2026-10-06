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
vm.runInContext(source + '\nthis.handler = POST;', sandbox);
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
const untouched = { id: 'manual', name: 'Pasta', quantity: '1 kg', checked: false };
items = [untouched];
let result = await say('CreateRecipeIntent', { dish: 'carbonara' });
assert.match(speech(result), /Per quante persone/);
assert.equal(writes, 0);
result = await say('ChangeServingsIntent', { servings: 'quattro' }, result.sessionAttributes);
assert.match(speech(result), /per 4 persone/);
assert.equal(items.length, 6);
assert.deepEqual(items[0], untouched);
const originalIds = items.map((item) => item.id);
items[2].checked = true;
result = await say('ChangeServingsIntent', { previousServings: '4', servings: '2' }, result.sessionAttributes);
assert.match(speech(result), /per 2 persone/);
assert.equal(items[1].quantity, '160 g');
assert.equal(items[2].quantity, '75 g');
assert.equal(items[2].checked, true);
assert.equal(items[3].quantity, '2');
assert.equal(items[5].quantity, 'q.b.');
assert.deepEqual(items.map((item) => item.id), originalIds);
assert.deepEqual(items[0], untouched);
result = await say('ChangeServingsIntent', { servings: '4' }, result.sessionAttributes);
assert.equal(items[1].quantity, '320 g');
const beforeInvalid = structuredClone(items);
for (const invalid of ['0', '21', '2.5', 'niente']) {
  const invalidResult = await say('ChangeServingsIntent', { servings: invalid }, result.sessionAttributes);
  assert.match(speech(invalidResult), /numero intero/);
  assert.deepEqual(items, beforeInvalid);
}
failWrite = true;
const failed = await say('ChangeServingsIntent', { servings: '2' }, result.sessionAttributes);
assert.match(speech(failed), /Non sono riuscito/);
assert.deepEqual(items, beforeInvalid);
failWrite = false;
const noContext = await say('ChangeServingsIntent', { servings: '2' });
assert.match(speech(noContext), /Quale ricetta/);
const attrs = result.sessionAttributes;
items.pop();
const stale = await say('ChangeServingsIntent', { servings: '2' }, attrs);
assert.match(speech(stale), /modificata o rimossa/);

items = [];
result = await say('CreateRecipeIntent', { dish: 'la carbonara per due persone' });
assert.match(speech(result), /per 2 persone/);
assert.equal(items[0].quantity, '160 g');
profiles = [{ id: 'one', name: 'Fabio', allergens: [] }, { id: 'two', name: 'Laura', allergens: [] }];
items = [];
result = await say('CreateRecipeIntent', { dish: 'carbonara' });
result = await say('ChangeServingsIntent', { servings: '2' }, result.sessionAttributes);
assert.equal(result.sessionAttributes.pendingAction, 'recipeProfileSelection');
assert.equal(items.length, 0);
result = await say('SelectProfileNameIntent', { profile: 'Fabio' }, result.sessionAttributes);
assert.match(speech(result), /profilo Fabio/);
assert.equal(items[0].quantity, '160 g');
result = await say('ChangeServingsIntent', { servings: '4' }, result.sessionAttributes);
assert.equal(items[0].quantity, '320 g');
profiles = [];
items = [];
result = await say('CreateRecipeIntent', { dish: 'lasagne' });
result = await say('SelectProfileIntent', { profile: '5' }, result.sessionAttributes);
assert.match(speech(result), /per 5 persone/);
assert.ok(items.length > 0);
items = [];
result = await say('CreateRecipeIntent', { dish: 'carbonara' });
const pendingNumber = result.sessionAttributes;
result = await say('SelectProfileNameIntent', { profile: 'giusy' }, pendingNumber);
assert.match(speech(result), /numero intero/);
assert.equal(result.sessionAttributes.pendingAction, 'recipeServingsSelection');
assert.equal(items.length, 0);
result = await say('SelectProfileNameIntent', { profile: 'una' }, result.sessionAttributes);
assert.match(speech(result), /per 1 persona/);
items = [];
result = await say('CreateRecipeIntent', { dish: 'carbonara per quattro persone' });
result = await say('CreateRecipeIntent', { dish: 'carbonara per due persone' });
assert.equal(result.sessionAttributes.pendingAction, 'duplicateRecipe');
result = await say('AddDuplicateRecipeIntent', {}, result.sessionAttributes);
assert.equal(items.length, 10);
result = await say('ChangeServingsIntent', { servings: '1' }, result.sessionAttributes);
assert.equal(items[0].quantity, '320 g');
assert.equal(items[5].quantity, '80 g');
items = [{ id: 'legacy', name: 'Pasta', quantity: '500 g', recipe: 'carbonara · lasagne', checked: false }];
result = await say('CreateRecipeIntent', { dish: 'carbonara per due persone' });
result = await say('ReplaceDuplicateRecipeIntent', {}, result.sessionAttributes);
assert.match(speech(result), /sommati a quelli di altre ricette/);
assert.equal(items[0].quantity, '500 g');
assert.equal(result.sessionAttributes.pendingAction, 'duplicateRecipe');
result = await say('AddDuplicateRecipeIntent', {}, result.sessionAttributes);
assert.equal(items[0].quantity, '500 g');
assert.equal(items.length, 6);
items = [untouched, { id: 'repeated', name: 'Pasta', quantity: '640 g', recipe: 'carbonara · carbonara (2 persone)', checked: true }];
result = await say('CreateRecipeIntent', { dish: 'carbonara per due persone' });
result = await say('ReplaceDuplicateRecipeIntent', {}, result.sessionAttributes);
assert.match(speech(result), /Ho sostituito carbonara/);
assert.deepEqual(items[0], untouched);
assert.equal(items.length, 6);
assert.equal(items[1].quantity, '160 g');
result = await say('ChangeServingsIntent', { servings: '1' }, result.sessionAttributes);
assert.equal(items[1].quantity, '80 g');
// Replacing with a different dish must remove only the selected last recipe.
items = [untouched];
result = await say('CreateRecipeIntent', { dish: 'carbonara per quattro persone' });
const carbonaraIds = items.slice(1).map((item) => item.id);
profiles = [{ id: 'one', name: 'Fabio', allergens: [] }, { id: 'two', name: 'Laura', allergens: [] }];
result = await say('CreateRecipeIntent', { dish: 'lasagne' }, result.sessionAttributes);
result = await say('ChangeServingsIntent', { servings: '2' }, result.sessionAttributes);
result = await say('SelectProfileNameIntent', { profile: 'Fabio' }, result.sessionAttributes);
assert.match(speech(result), /sostituire l'ultima ricetta, carbonara, con lasagne/);
assert.deepEqual(Array.from(result.sessionAttributes.replacementTarget.itemIds), carbonaraIds);
const beforeDifferent = structuredClone(items);
failWrite = true;
const failedReplacement = await say('ReplaceDuplicateRecipeIntent', {}, result.sessionAttributes);
assert.match(speech(failedReplacement), /problema/);
assert.deepEqual(items, beforeDifferent);
failWrite = false;
result = await say('ReplaceDuplicateRecipeIntent', {}, result.sessionAttributes);
assert.match(speech(result), /sostituito carbonara con lasagne per 2 persone/);
assert.deepEqual(items[0], untouched);
assert.ok(items.slice(1).every((item) => item.recipe === 'lasagne (2 persone)'));
assert.ok(items.every((item) => !carbonaraIds.includes(item.id)));
result = await say('ChangeServingsIntent', { servings: '3' }, result.sessionAttributes);
assert.match(speech(result), /per 3 persone/);
profiles = [];
// Outside a conversation the cloud timestamps select the most recent recipe.
const lasagneIds = items.slice(1).map((item) => item.id);
items.push({ id: 'older', name: 'Riso', quantity: '100 g', recipe: 'risotto', checked: true, createdAt: '2020-01-01T00:00:00.000Z' });
result = await say('CreateRecipeIntent', { dish: 'carbonara per due persone' });
assert.equal(result.sessionAttributes.replacementTarget.dish, 'lasagne');
assert.deepEqual(Array.from(result.sessionAttributes.replacementTarget.itemIds), lasagneIds);
const staleReplacementAttrs = result.sessionAttributes;
items = items.filter((item) => item.id !== lasagneIds[0]);
const beforeStaleReplacement = structuredClone(items);
result = await say('ReplaceDuplicateRecipeIntent', {}, staleReplacementAttrs);
assert.match(speech(result), /modificata o rimossa/);
assert.deepEqual(items, beforeStaleReplacement);
// Adding instead keeps every previous row.
items = [untouched];
result = await say('CreateRecipeIntent', { dish: 'carbonara per quattro persone' });
const previousItems = structuredClone(items);
result = await say('CreateRecipeIntent', { dish: 'lasagne per due persone' }, result.sessionAttributes);
result = await say('AddShoppingItemIntent', { item: 'la separatamente' }, result.sessionAttributes);
assert.deepEqual(items.slice(0, previousItems.length), previousItems);
assert.ok(items.every((item) => item.name !== 'la separatamente'));
// A shared legacy row remains protected when replacing with a different dish.
items = [{ id: 'shared', name: 'Pasta', quantity: '640 g', recipe: 'carbonara · lasagne', checked: false }];
const explicitShared = { pendingAction: 'duplicateRecipe', householdKey: 'test-household', dish: 'tiramisu', servings: 2,
  replacementTarget: { dish: 'carbonara', itemIds: ['shared'] } };
result = await say('ReplaceDuplicateRecipeIntent', {}, explicitShared);
assert.match(speech(result), /sommati a quelli di altre ricette/);
assert.equal(items[0].quantity, '640 g');
items = [];
const legacyModel = await say('CreateShoppingListIntent', { dish: 'carbonara' });
assert.match(speech(legacyModel), /per 4 persone/);
assert.equal(items[0].quantity, '320 g');
// English uses the same cloud list and request-local language selection.
items = [untouched];
profiles = [{ id: 'one', name: 'Fabio', allergens: [] }, { id: 'two', name: 'Laura', allergens: [] }];
result = await say('CreateRecipeIntent', { dish: 'carbonara' }, {}, 'en-GB');
assert.match(speech(result), /For how many people/);
result = await say('SelectProfileNameIntent', { profile: 'four' }, result.sessionAttributes, 'en-GB');
assert.match(speech(result), /Which profile/);
result = await say('SelectProfileNameIntent', { profile: 'Fabio' }, result.sessionAttributes, 'en-GB');
assert.match(speech(result), /4 people.*Fabio/);
assert.equal(items[1].quantity, '320 g');
result = await say('CreateRecipeIntent', { dish: 'lasagna for two people' }, result.sessionAttributes, 'en-US');
assert.match(speech(result), /Which profile/);
result = await say('SelectProfileNameIntent', { profile: 'Fabio' }, result.sessionAttributes, 'en-US');
assert.match(speech(result), /replace your last recipe, carbonara, with lasagna/);
result = await say('ReplaceDuplicateRecipeIntent', {}, result.sessionAttributes, 'en-US');
assert.match(speech(result), /replaced carbonara with lasagna for 2 people/);
assert.deepEqual(items[0], untouched);
result = await say('ChangeServingsIntent', { servings: 'one' }, result.sessionAttributes, 'en-US');
assert.match(speech(result), /1 person/);
profiles = [];
result = await say('ReadShoppingListIntent', {}, {}, 'en-US');
assert.match(speech(result), /items to buy/);
assert.match(speech(result), /lasagna sheets/);
result = await say('AddShoppingItemIntent', { item: 'milk 500 ml' }, {}, 'en-GB');
assert.match(speech(result), /added milk/);
assert.ok(items.some((item) => item.name === 'latte'));
result = await say('RemoveShoppingItemIntent', { item: 'milk' }, {}, 'en-US');
assert.match(speech(result), /removed milk/);
assert.ok(items.every((item) => item.name !== 'latte'));
result = await say('ClearShoppingListIntent', {}, {}, 'en-GB');
assert.match(speech(result), /clear the entire shopping list/);
const clearAttrs = result.sessionAttributes;
result = await say('AMAZON.NoIntent', {}, clearAttrs, 'en-GB');
assert.match(speech(result), /haven't deleted anything/);
assert.ok(items.length > 0);
result = await say('AMAZON.YesIntent', {}, clearAttrs, 'en-GB');
assert.match(speech(result), /cleared the entire/);
assert.equal(items.length, 0);
const [enPrompt, itPrompt] = await Promise.all([
  say('CreateRecipeIntent', { dish: 'carbonara' }, {}, 'en-US'),
  say('CreateRecipeIntent', { dish: 'carbonara' }, {}, 'it-IT'),
]);
assert.match(speech(enPrompt), /For how many people/);
assert.match(speech(itPrompt), /Per quante persone/);
for (const match of original.matchAll(/buildAlexaResponse\(\s*"([^"]+)"/g)) {
  const translated = vm.runInContext(`englishAlexaText(${JSON.stringify(match[1])})`, sandbox);
  assert.notEqual(translated, "Sorry, I couldn't complete that request. Please try again.", `Missing translation: ${match[1]}`);
}
const englishModel = JSON.parse(readFileSync(new URL('./interaction-model-en.json', import.meta.url), 'utf8'));
for (const intent of englishModel.interactionModel.languageModel.intents) {
  const slots = new Set((intent.slots ?? []).map((slot) => slot.name));
  for (const sample of intent.samples) for (const match of sample.matchAll(/\{([^}]+)\}/g)) assert(slots.has(match[1]));
}
signatureOK = false;
assert.deepEqual(await say('ChangeServingsIntent', { servings: '2' }), { error: 'Alexa request verification failed' });

const model = JSON.parse(readFileSync(new URL('./interaction-model-it-IT.json', import.meta.url), 'utf8'));
const intent = model.interactionModel.languageModel.intents.find((intent) => intent.name === 'ChangeServingsIntent');
assert.equal(intent.slots.find((slot) => slot.name === 'servings').type, 'AMAZON.NUMBER');
for (const intent of model.interactionModel.languageModel.intents) {
  const names = new Set((intent.slots ?? []).map((slot) => slot.name));
  for (const sample of intent.samples) for (const match of sample.matchAll(/\{([^}]+)\}/g)) assert(names.has(match[1]));
}
console.log('Alexa servings tests passed: prompts, profiles, resizing, duplicate isolation, invalid inputs, failed writes, stale context, signature verification, English/Italian localisation and model slots.');
