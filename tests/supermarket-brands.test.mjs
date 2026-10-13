import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import ts from 'typescript';
const js=ts.transpileModule(readFileSync('src/lib/supermarket-brands.ts','utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText;
const {supermarketBrandOwners}=await import('data:text/javascript;base64,'+Buffer.from(js).toString('base64'));
test('reported pea fusilli identify MD through exact retailer-owned Vivo Meglio brand',()=>{
 const product={code:'8019730069548',source:'off',brand:'Vivo Meglio'};
 const result=supermarketBrandOwners([product],'it');
 assert.equal(result[0].name,'MD'); assert.ok(result[0].sourceUrl.includes('/3-vivo-meglio/'));
 assert.equal(result[0].availability,undefined);
 assert.equal(result[0].evidence,undefined);
 assert.deepEqual(supermarketBrandOwners([{...product,source:'manual'}],'it'),[]);
 assert.deepEqual(supermarketBrandOwners([{...product,brand:'Vivo Meglio style'}],'it'),[]);
 assert.deepEqual(supermarketBrandOwners([product],'ch'),[]);
});
test('retailer-brand hints stay distinct from barcode catalogue and stock proof',()=>{
 const result=supermarketBrandOwners([{code:'8019730069548',source:'off',brand:'Combino'},{code:'8019730069547',source:'off',brand:'Tre Mulini'},{code:'8019730069546',source:'off',brand:'Barilla'}],'it');
 assert.deepEqual(result.map(x=>x.name),['Lidl','Eurospin']);
 assert.ok(result.every(x=>x.checkedAt===undefined && x.verified===undefined));
});
