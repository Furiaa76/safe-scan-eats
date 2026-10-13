import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import ts from 'typescript';
const source = ts.transpileModule(readFileSync('api/online-retailers.ts', 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText;
const { carrefourCatalogue, GET } = await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));
const code = '8002580001646';
const product = { '@type': 'Product', name: 'Chef Besciamella Senza Lattosio 500 ml', sku: code, offers: { url: `https://www.carrefour.it/p/chef-besciamella-senza-lattosio-500-ml/${code}.html`, availability: 'http://schema.org/InStock' } };
const html = (value) => `<script type="application/ld+json">${JSON.stringify(value)}</script>`;
test('exact retailer EAN and product page prove catalogue presence, never local stock', () => {
  const offer = carrefourCatalogue(html(product), code);
  assert.equal(offer.name, 'Carrefour');
  assert.equal(offer.country, 'it');
  assert.equal(offer.sourceUrl, product.offers.url);
  assert.equal(offer.availability, undefined);
  assert.equal(offer.city, undefined);
  assert.equal(offer.storeId, undefined);
  assert.equal(offer.pickup, undefined);
  assert.ok(Date.now() - Date.parse(offer.checkedAt) < 1000);
  assert.ok(carrefourCatalogue(html({ '@graph': [product] }), code));
});
test('names, brand matches, other barcodes and unrelated links are not evidence', () => {
  for (const value of [
    { ...product, sku: '8008698006511' },
    { ...product, sku: undefined },
    { ...product, '@type': 'Organization' },
    { ...product, offers: { url: 'https://www.carrefour.it/search?q=besciamella' } },
    { ...product, offers: { url: product.offers.url.replace('www.carrefour.it', 'evil.example') } },
    { ...product, offers: { url: product.offers.url.replace('https:', 'http:') } },
    { ...product, offers: { url: product.offers.url.replace('www.carrefour.it', 'user@www.carrefour.it') } },
  ]) assert.equal(carrefourCatalogue(html(value), code), null);
  assert.equal(carrefourCatalogue('<script type="application/ld+json">broken</script>', code), null);
});
test('unknown country and invalid codes never request a retailer', async () => {
  const original = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async () => { calls++; throw new Error('should not fetch'); };
  try {
    const foreign = await GET(new Request(`https://app.example/api/online-retailers?code=${code}&country=ch`));
    assert.deepEqual(await foreign.json(), { offers: [] });
    assert.equal((await GET(new Request('https://app.example/api/online-retailers?code=bad&country=it'))).status, 400);
    assert.equal(calls, 0);
  } finally { globalThis.fetch = original; }
});
test('actual handler follows only retailer redirects, caches proof and rejects blocked/oversized pages', async () => {
  const original = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async (url) => {
    calls++;
    assert.equal(new URL(url).hostname, 'www.carrefour.it');
    if (calls === 1) return new Response(null, { status: 302, headers: { location: product.offers.url } });
    return new Response(html(product), { headers: { 'content-type': 'text/html' } });
  };
  try {
    const request = new Request(`https://app.example/api/online-retailers?code=${code}&country=it`);
    assert.equal((await (await GET(request)).json()).offers[0].name, 'Carrefour');
    await GET(request);
    assert.equal(calls, 2);
    globalThis.fetch = async () => new Response(null, { status: 302, headers: { location: 'https://evil.example' } });
    assert.deepEqual(await (await GET(new Request('https://app.example/api/online-retailers?code=8008698006511&country=it'))).json(), { offers: [] });
    globalThis.fetch = async () => new Response('x'.repeat(500001) + html({ ...product, sku: '8008698006512' }), { headers: { 'content-type': 'text/html' } });
    assert.deepEqual(await (await GET(new Request('https://app.example/api/online-retailers?code=8008698006512&country=it'))).json(), { offers: [] });
    globalThis.fetch = async () => { throw new Error('blocked'); };
    assert.deepEqual(await (await GET(new Request('https://app.example/api/online-retailers?code=8008698006513&country=it'))).json(), { offers: [] });
  } finally { globalThis.fetch = original; }
});
const {digitelematicaCatalogue,esselungaCatalogue,conadCatalogue}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
test('TIGROS and Coop public catalogues identify actual EANs and direct pages, never warehouse stock',()=>{
 for(const [name,host] of [['TIGROS','www.tigros.it'],['Coop','www.coopshop.it']]){
  const rows=digitelematicaCatalogue({data:{products:[{barcode:code,name:'Besciamella senza lattosio',shortDescr:'Parmalat Chef',description:'500 ml',itemUrl:'/product/besciamella-slattosio-ml500-parmalat-chef',storeId:5}] }},name,host);
  assert.equal(rows[0].code,code);assert.equal(rows[0].name,name);assert.equal(rows[0].storeId,undefined);assert.equal(rows[0].availability,undefined);
  assert.equal(rows[0].sourceUrl,`https://${host}/product/besciamella-slattosio-ml500-parmalat-chef`);
  assert.deepEqual(digitelematicaCatalogue({data:{products:[{code:'7396197',name:'Chef',itemUrl:'/product/chef'}]}},name,host),[]);
  assert.deepEqual(digitelematicaCatalogue({data:{products:[{barcode:code,name:'Chef',itemUrl:'https://evil.example/product/chef'}]}},name,host),[]);
 }
});
test('Esselunga details match barcode and internal page code separately',()=>{
 const rows=esselungaCatalogue({displayableProduct:{barcode:code,code:'305017',description:'Chef Besciamella Senza Lattosio 500 ml',sanitizeDescription:'chef-besciamella-senza-lattosio-500-ml',outOfStock:false}});
 assert.equal(rows[0].code,code);assert.equal(rows[0].name,'Esselunga');assert.ok(rows[0].sourceUrl.includes('/305017/chef-besciamella-senza-lattosio-500-ml'));
 assert.equal(rows[0].availability,undefined);
 assert.deepEqual(esselungaCatalogue({displayableProduct:{code:'305017',description:'Chef'}}),[]);
});
test('Conad structured GTIN identifies product, never the internal SKU or a generic category',()=>{
 const conad={ '@type':'Product',name:'Besciamella per Cucinare 500 ml Conad',sku:'167680',gtin:'8003170410107',offers:{url:'https://spesaonline.conad.it/p/conad-besciamella-pronta-alluso-500-ml--167680'}};
 assert.equal(conadCatalogue(html(conad))[0].code,'8003170410107');
 assert.deepEqual(conadCatalogue(html({...conad,gtin:undefined})),[]);
 assert.deepEqual(conadCatalogue(html({...conad,offers:{url:'https://spesaonline.conad.it/c/besciamella'}})),[]);
});
test('batch lookup includes only the requested GTINs across all public supermarket sources',async()=>{
 const original=globalThis.fetch;
 globalThis.fetch=async(url)=>{
  const target=new URL(url);
  const json=value=>new Response(JSON.stringify(value),{headers:{'content-type':'application/json'}});
  if(target.hostname==='www.carrefour.it') return new Response('',{status:404});
  if(target.hostname==='www.tigros.it'||target.hostname==='www.coopshop.it') return json({data:{products:[{barcode:'8002580015414',name:'Besciamella Chef Leggera',itemUrl:'/product/chef-leggera'},{barcode:code,name:'Chef senza lattosio',itemUrl:'/product/chef-senza-lattosio'}]}});
  if(target.hostname==='spesaonline.esselunga.it'){
   if(target.pathname.endsWith('/facet')) return json({displayables:{entities:[{code:'305004'}]}});
   return json({displayableProduct:{barcode:'8002580015414',code:'305004',description:'Chef Besciamella Leggera 500 ml',sanitizeDescription:'chef-besciamella-leggera-500-ml'}});
  }
  if(target.pathname.endsWith('suggestions.json')) return json({data:{suggestedProducts:[{url:'/p/besciamella--167680'}]}});
  return new Response(html({'@type':'Product',name:'Besciamella Conad',gtin:'8003170410107',offers:{url:'https://spesaonline.conad.it/p/besciamella--167680'}}));
 };
 try{
  const reply=await(await GET(new Request('https://app.example/api/online-retailers?codes=8002580015414,8003170410107&country=it&q=besciamella'))).json();
  assert.deepEqual(reply.offers.map(x=>x.name).sort(),['Conad','Coop','Esselunga','TIGROS']);
  assert.ok(reply.offers.every(x=>x.code!==code));
 }finally{globalThis.fetch=original;}
});
