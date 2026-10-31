import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import ts from 'typescript';
import vm from 'node:vm';
const asModule = source => 'data:text/javascript;base64,' + Buffer.from(ts.transpileModule(source, {compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText).toString('base64');
const { reviewedIngredientTranslation } = await import(asModule(readFileSync(new URL('../src/lib/ingredient-translations.ts',import.meta.url),'utf8')));
const { assessNickel } = await import(asModule(readFileSync(new URL('../src/lib/nickel.ts',import.meta.url),'utf8')));
const fixture = JSON.parse(readFileSync(new URL('./fixtures/giampaoli-pandoro-off.json',import.meta.url),'utf8'));
const source = readFileSync(new URL('../src/lib/off.ts',import.meta.url),'utf8').replace(/^import .*;\n/gm,'');
const js = ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText.replace(/^export /gm,'');
const context = vm.createContext({reviewedIngredientTranslation, fetch:async()=>({ok:true,status:200,json:async()=>fixture})});
vm.runInContext(js+'\nglobalThis.api = {map,fetchProduct};',context);
const settings = name => ({enabled:true,startPage:false,entries:[{id:name,kind:'ingredient',name,aliases:[],code:'',note:''}]});
test('reported Giampaoli barcode loads translated ingredients for personal nickel checks',async()=>{
 const p = await context.api.fetchProduct('8003040025431');
 assert.equal(p.ingredientsLanguage,'it');
 assert.equal(p.ingredientsTranslated,true);
 for (const name of ['cacao','latte','uova','frumento','mais','burro']) assert.equal(assessNickel(p,settings(name)).status,'avoid',name);
 assert.equal(assessNickel(p,settings('pomodoro')).status,'clear');
 assert.equal(assessNickel(p,{enabled:true,startPage:false,entries:[]}).status,'empty');
 assert.deepEqual(Array.from(p.allergenTags),fixture.product.allergens_tags);
 assert.deepEqual(Array.from(p.labelTags),fixture.product.labels_tags);
});
test('translation never covers changed recipes, other barcodes, brands, or languages',()=>{
 for(const changes of [{ingredients_text:fixture.product.ingredients_text+', noisettes'},{code:'8003040025432'},{brands:'Other'},{ingredients_lc:'de'}]){
  const p=context.api.map({...fixture.product,...changes});
  assert.equal(p.ingredientsTranslated,undefined);
  assert.equal(assessNickel(p,settings('pomodoro')).status,'incomplete');
 }
 const italian=context.api.map({...fixture.product,ingredients_text_it:'acqua, pomodoro'});
 assert.equal(italian.ingredientsText,'acqua, pomodoro');
 assert.equal(italian.ingredientsTranslated,undefined);
});
