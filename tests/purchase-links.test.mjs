import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';
const compile = source => ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText;
const { freeFromClaim } = await import('data:text/javascript;base64,' + Buffer.from(compile(readFileSync(new URL('../src/lib/free-from.ts', import.meta.url),'utf8'))).toString('base64'));
const countrySource = readFileSync(new URL('../src/lib/purchase-countries.ts', import.meta.url), 'utf8').replaceAll('export ', '');
const purchaseSource = readFileSync(new URL('../src/lib/purchase.ts', import.meta.url), 'utf8').split('export function onlinePurchaseUrl')[1];
const context = vm.createContext({ freeFromClaim, URLSearchParams });
vm.runInContext(compile(countrySource + '\nfunction onlinePurchaseUrl' + purchaseSource.replaceAll('export ', '')) + '\nglobalThis.helpers={onlinePurchaseUrl,productPurchaseQuery,ingredientPurchaseQuery,shopMapUrl};', context);
const {onlinePurchaseUrl,productPurchaseQuery,ingredientPurchaseQuery,shopMapUrl} = context.helpers;
const product = fields => ({ name:'Besciamella 500 ml',brand:'Marca A',code:'8000000000001',source:'off',labelTags:[],...fields });
test('selected product links require the exact name, brand and selected free-from variant',()=>{
 const query=productPurchaseQuery(product({}),['glutine','lattosio']);
 assert.equal(query,'"Besciamella 500 ml" "Marca A" "senza glutine" "senza lattosio"');
 const url=new URL(onlinePurchaseUrl(query,{country:'it',city:'Como'},'it',true));
 assert.equal(url.searchParams.get('q'),query);
 assert.equal(url.searchParams.has('tbm'),false);
 assert.equal(url.searchParams.get('udm'),'web');
 assert.equal(url.searchParams.get('gl'),'it');
 assert.ok(!url.searchParams.get('q').includes('Italy'));
});
test('verified product declarations stay in the query even without an active profile',()=>{
 assert.equal(productPurchaseQuery(product({brand:'Schär',name:'Panfette'})), '"Panfette" "Schär" "senza glutine"');
 assert.equal(productPurchaseQuery(product({brand:'Zymil',name:'Latte intero'})), '"Latte intero" "Zymil" "senza lattosio"');
 assert.equal(productPurchaseQuery(product({name:'Pane "Classico"',brand:'Marca A, Other'})), '"Pane Classico" "Marca A"');
});
test('generic recipe ingredients retain their restrictions and supermarket maps use chosen location',()=>{
 assert.equal(ingredientPurchaseQuery('besciamella',['glutine','lattosio']),'besciamella senza glutine senza lattosio');
 const url=new URL(shopMapUrl(undefined,{country:'it',city:'Como'}));
 assert.equal(url.searchParams.get('query'),'supermarkets grocery stores, Como, Italy');
 assert.equal(new URL(shopMapUrl('Esselunga',{country:'it',city:'Como'})).searchParams.get('query'),'Esselunga, Como, Italy');
});

test('supermarket links follow cities and countries beyond Italy',()=>{
 for(const [country,city,countryName] of [['fr','Paris','France'],['de','Berlin','Germany'],['us','New York','United States']]){
  const url=new URL(shopMapUrl('Carrefour',{country,city}));
  assert.equal(url.searchParams.get('query'),`Carrefour, ${city}, ${countryName}`);
 }
});
