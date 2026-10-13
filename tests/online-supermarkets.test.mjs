import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import ts from 'typescript';
const source=ts.transpileModule(readFileSync('src/lib/online-supermarkets.ts','utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText;
const {exactOnlineSupermarkets,findOnlineSupermarkets}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
const offer={code:'8002580001646',name:'TIGROS',country:'it',verified:true,sourceUrl:'https://www.tigros.it/product/besciamella-slattosio-ml500-parmalat-chef',checkedAt:new Date().toISOString(),productName:'Chef 500 ml'};
test('catalogue rows require exact barcode, retailer domain, market and recent proof',()=>{
 assert.equal(exactOnlineSupermarkets([offer],[offer.code],'it')[0].name,'TIGROS');
 for(const row of [{...offer,code:'8002580015414'},{...offer,name:'Conad'},{...offer,sourceUrl:'https://evil.example'},{...offer,verified:false},{...offer,checkedAt:'2020-01-01'},{...offer,checkedAt:new Date(Date.now()+60000).toISOString()}]) assert.deepEqual(exactOnlineSupermarkets([row],[offer.code],'it'),[]);
 assert.deepEqual(exactOnlineSupermarkets([offer],[offer.code],'ch'),[]);
});
test('client queries exact-code batches and rejects unrequested items in a successful response',async()=>{
 const original=globalThis.fetch;
 globalThis.fetch=async(url)=>{assert.ok(String(url).includes('codes=8002580001646'));return Response.json({offers:[offer,{...offer,code:'8002580015414'}]});};
 try{assert.equal((await findOnlineSupermarkets([offer.code],'it','besciamella')).length,1);assert.deepEqual(await findOnlineSupermarkets([offer.code],'ch','besciamella'),[]);}finally{globalThis.fetch=original;}
});
test('one seller card retains the exact compatible product ahead of variants needing review',async()=>{
 const {supermarketsBySeller}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
 const review={...offer,code:'8002580015414',sourceUrl:'https://www.tigros.it/product/chef-leggera'};
 assert.deepEqual(supermarketsBySeller([review,offer],[offer.code]),[offer]);
 assert.deepEqual(supermarketsBySeller([offer,review],[offer.code]),[offer]);
});
