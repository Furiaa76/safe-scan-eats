import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import ts from 'typescript';
const js=ts.transpileModule(readFileSync(new URL('../src/lib/product-retailers.ts',import.meta.url),'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText;
const { productRetailers }=await import('data:text/javascript;base64,'+Buffer.from(js).toString('base64'));
test('exact online catalogue evidence never becomes local Como stock',()=>{
 const result=productRetailers({code:'8002580001646',source:'off',stores:['Esselunga','Carrefour']},{country:'it',city:'Como'});
 assert.equal(result[0].name,'Esselunga'); assert.equal(result[0].verified,true); assert.equal(result[0].pickup,undefined);
 assert.equal(result.length,1); assert.equal(result[0].country,'it'); assert.ok(result[0].sourceUrl.includes('/chef-besciamella-senza-lattosio-500-ml'));
 assert.equal(productRetailers({code:'8002580001646',source:'off'},{country:'it',city:'Milano'})[0].pickup,undefined);
});
test('manual entries, other barcodes and foreign markets do not inherit verified sellers',()=>{
 for(const [product,location] of [[{code:'other',source:'off'},{country:'it',city:'Como'}],[{code:'8002580001646',source:'manual'},{country:'it',city:'Como'}],[{code:'8002580001646',source:'off'},{country:'fr',city:'Paris'}]]) assert.deepEqual(productRetailers(product,location),[]);
});
test('global store reports never become local seller badges in any market',()=>{
 for (const location of [{country:'it',city:'Como'},{country:'ch',city:'Lugano'},{country:'fr',city:'Paris'},{country:'de',city:'Berlin'},{country:'us',city:'New York'}]) {
  assert.deepEqual(productRetailers({code:'unknown',source:'off',stores:['Esselunga','Carrefour','Coop','Tigros']},location),[]);
  if(location.country !== 'it') assert.deepEqual(productRetailers({code:'8002580001646',source:'off',stores:['Esselunga']},location),[]);
 }
});
test('verified catalogue offers do not claim stock in an arbitrary city and are immutable',()=>{
 const product={code:'8002580001646',source:'off'};
 const offer=productRetailers(product,{country:'it',city:'Milano'})[0];
 assert.equal(offer.pickup,undefined);
 offer.country='ch';
 assert.equal(productRetailers(product,{country:'it',city:'Como'})[0].country,'it');
});
