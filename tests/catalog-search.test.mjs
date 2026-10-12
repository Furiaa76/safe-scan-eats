import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { test } from 'node:test';
import ts from 'typescript';
const claimJs = ts.transpileModule(readFileSync(new URL('../src/lib/free-from.ts',import.meta.url),'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText;
const { freeFromClaim } = await import('data:text/javascript;base64,'+Buffer.from(claimJs).toString('base64'));
const source = readFileSync(new URL('../src/lib/off-search.functions.ts', import.meta.url), 'utf8');
function catalog(fetch) {
 const js = ts.transpileModule(source.replace(/^import .*;\n/gm, '').replace('export const offSearch', 'const offSearch'), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText.replace(/export \{\};?/, '');
 const context = vm.createContext({ freeFromClaim, fetch, AbortSignal, console, foodCategories: JSON.parse(readFileSync(new URL('../src/lib/food-search-categories.json', import.meta.url), 'utf8')), purchaseCountry: () => ({ tag: 'en:italy' }), createServerFn: () => ({ inputValidator() { return this; }, handler(fn) { return fn; } }) });
 vm.runInContext(js + '\nglobalThis.api = { offSearch, queryVariants, matchesProductQuery, completeIngredients, ingredientCategories };', context);
 return context.api;
}
const unavailable = () => Promise.resolve({ ok: false });
test('catalog failures are reported as unavailable, not empty results', async () => {
 const res = await catalog(unavailable).offSearch({ data: { query: 'lasagne', fields: 'code' } });
 assert.equal(res.ok, false);
});
test('successful empty search stays a valid empty result', async () => {
 const res = await catalog(async () => ({ ok: true, json: async () => ({ products: [] }) })).offSearch({ data: { query: 'lasagne', fields: 'code' } });
 assert.equal(res.ok, true); assert.equal(res.json, '[]');
});
test('lasagne search retries shorter names but rejects ordinary wheat products', async () => {
 const api = catalog(unavailable);
 assert.ok(api.queryVariants('sfoglia per lasagne senza glutine').includes('lasagne'));
 assert.equal(api.matchesProductQuery({ product_name: 'Lasagne', labels_tags: ['en:gluten-free'] }, 'sfoglia per lasagne senza glutine'), true);
 assert.equal(api.matchesProductQuery({ product_name: 'Lasagne di grano' }, 'sfoglia per lasagne senza glutine'), false);
 assert.equal(api.matchesProductQuery({ product_name: 'Preparato per pane senza glutine' }, 'sfoglia per lasagne senza glutine'), false);
});
test('lactose-free declaration in labels counts without requiring it in product name', () => {
 assert.equal(catalog(unavailable).matchesProductQuery({ product_name: 'Latte', labels_tags: ['en:lactose-free'] }, 'latte senza lattosio'), true);
});

test('search results missing ingredients are completed from the barcode record', async () => {
 const api = catalog(async () => ({ ok: true, json: async () => ({ status: 1, product: { code: '12345678', ingredients_text: 'riso, acqua' } }) }));
 const result = await api.completeIngredients({ code: '12345678', product_name: 'Lasagne' }, 'code,ingredients_text');
 assert.equal(result.ingredients_text, 'riso, acqua');
 assert.equal(result.product_name, 'Lasagne');
});
test('failed ingredient lookup leaves data incomplete rather than inventing compatibility', async () => {
 const result = await catalog(unavailable).completeIngredients({ code: '12345678' }, 'ingredients_text');
 assert.equal(result.ingredients_text, undefined);
});
test('recognizes the canonical no-gluten label used by the catalog', () => {
 assert.equal(catalog(unavailable).matchesProductQuery({ product_name: 'Lasagne', labels_tags: ['en:no-gluten'] }, 'sfoglia per lasagne senza glutine'), true);
});
test('alternative searches filter by country before choosing the first page', async () => {
 const urls = [];
 const api = catalog(async (url) => { urls.push(url); return { ok: true, json: async () => url.includes('cgi/search') ? { products: [] } : { hits: [] } }; });
 await api.offSearch({ data: { query: 'lasagne', fields: 'code', country: 'it' } });
 assert.ok(urls.some(url => url.includes('search.openfoodfacts.org') && new URL(url).searchParams.get('q').includes('AND countries_tags:"en:italy"')));
});
test('recipe lasagne sheets match fresh sheets and canonical gluten-free labels', () => {
 const api = catalog(unavailable);
 const query = 'sfoglia er lasagne senza glutine';
 assert.ok(api.queryVariants(query).includes('sfoglia fresca'));
 assert.equal(api.matchesProductQuery({ product_name: 'Sfoglia fresca senza glutine', labels_tags: ['en:no-gluten'] }, query), true);
 assert.equal(api.matchesProductQuery({ product_name: 'Lasagne alla bolognese senza glutine', labels_tags: ['en:no-gluten'] }, query), false);
 assert.equal(api.matchesProductQuery({ product_name: 'Pasta sfoglia fresca senza glutine', labels_tags: ['en:no-gluten'] }, query), false);
});
test('an unrelated legacy result page cannot hide matching alternative results', async () => {
 const api = catalog(async (url) => ({ ok: true, json: async () => url.includes('cgi/search')
  ? { products: [{ code: '11111111', product_name: 'Pane senza glutine' }] }
  : { hits: [{ code: '8021228901643', product_name: 'Sfoglia fresca senza glutine', labels_tags: ['en:no-gluten'], countries_tags: ['en:italy'], ingredients_text: 'amido di mais, uova, riso' }] } }));
 const res = await api.offSearch({ data: { query: 'sfoglia per lasagne senza glutine', fields: 'code', country: 'it' } });
 assert.equal(res.ok, true);
 assert.equal(JSON.parse(res.json)[0].code, '8021228901643');
});
test('successful alternative search does not wait for the legacy endpoint', async () => {
 const urls = [];
 const api = catalog(async (url) => {
  urls.push(url);
  if (url.includes('cgi/search')) throw new Error('legacy should not be called');
  return { ok: true, json: async () => ({ hits: [{ code: '8021228901643', product_name: 'Lasagne senza glutine', ingredients_text: 'riso', countries_tags: ['en:italy'] }] }) };
 });
 const result = await api.offSearch({ data: { query: 'lasagne', fields: 'code', country: 'it' } });
 assert.equal(result.ok, true);
 assert.equal(JSON.parse(result.json).length, 1);
 assert.ok(urls.every(url => !url.includes('cgi/search')));
});
test('recipe sheets use category and gluten declarations rather than broad text results', async () => {
 const urls = [];
 const api = catalog(async (url) => {
  urls.push(url);
  return { ok: true, json: async () => ({ hits: [{ code: '8021228901643', product_name: 'Sfoglia fresca senza glutine', countries_tags: ['en:italy'], labels_tags: ['en:no-gluten'], ingredients_text: 'amido di mais, uova' }] }) };
 });
 const result = await api.offSearch({ data: { query: 'sfoglia per lasagne senza glutine', fields: 'code', country: 'it' } });
 assert.equal(JSON.parse(result.json)[0].code, '8021228901643');
 const query = new URL(urls.find(url => new URL(url).searchParams.get('q')?.includes('categories_tags:'))).searchParams.get('q');
 assert.ok(query.includes('categories_tags:"en:lasagna-sheets"'));
 assert.ok(query.includes('labels_tags:"en:no-gluten"'));
 assert.ok(query.includes('countries_tags:"en:italy"'));
});
test('shared taxonomy resolves different ingredients and equivalent spellings', () => {
 const api = catalog(unavailable);
 const cases = {
  'pane grattugiato senza glutine': 'en:bread-crumbs', 'pangrattato': 'en:bread-crumbs',
  'pan grattato': 'en:bread-crumbs', 'farina senza glutine': 'en:flours',
  'latte senza lattosio': 'en:milks', 'burro': 'en:butters', 'zucchero a velo': 'en:powdered-sugars',
  'riso': 'en:rices', 'spaghetti senza glutine': 'en:spaghetti', 'biscotti': 'en:biscuits',
  'mozzarella': 'en:mozzarella', 'uova': 'en:eggs', 'mascarpone': 'en:mascarpone',
  'pasta senza glutine': 'en:pastas'
 };
 for (const [query, tag] of Object.entries(cases)) assert.ok(api.ingredientCategories(query).includes(tag), query);
});
test('category matches accept branded names but still reject gluten and lactose without declarations', () => {
 const api = catalog(unavailable);
 const product = { product_name: 'PanGrati', categories_tags: ['en:bread-crumbs'], labels_tags: ['en:no-gluten'] };
 assert.equal(api.matchesProductQuery(product, 'pane grattugiato senza glutine'), true);
 assert.equal(api.matchesProductQuery({ ...product, labels_tags: [] }, 'pane grattugiato senza glutine'), false);
 assert.equal(api.matchesProductQuery({ product_name: 'Brand', categories_tags: ['en:milks'] }, 'latte senza lattosio'), false);
 assert.equal(api.matchesProductQuery(product, 'pane grattugiato marca inesistente senza glutine'), false);
});

// Regression: one categorised brand must not prevent uncategorised alternatives.
test('ingredient search combines category and name results across brands without duplicates', async () => {
 const common = { countries_tags: ['en:italy'], labels_tags: ['en:no-gluten'], ingredients_text: 'latte, amido di mais' };
 const api = catalog(async (url) => {
  const categorySearch = new URL(url).searchParams.get('q')?.includes('categories_tags:');
  return { ok: true, json: async () => ({ hits: categorySearch
   ? [{ ...common, code: '11111111', product_name: 'Besciamella', brands: ['Marca A'] }]
   : [{ ...common, code: '11111111', product_name: 'Besciamella', brands: ['Marca A'] },
      { ...common, code: '22222222', product_name: 'Besciamella senza glutine', brands: ['Marca B'] },
      { ...common, code: '33333333', product_name: 'Besciamella', brands: ['Marca C'] },
      { ...common, code: '44444444', product_name: 'Besciamella', countries_tags: ['en:france'] },
      { ...common, code: '55555555', product_name: 'Besciamella', labels_tags: [] },
      { ...common, code: '66666666', product_name: 'Pasta senza glutine' }] }) };
 });
 const result = await api.offSearch({ data: { query: 'besciamella senza glutine', fields: 'code', country: 'it' } });
 assert.equal(result.ok, true);
 assert.deepEqual(JSON.parse(result.json).map(p => p.code).sort(), ['11111111', '22222222', '33333333']);
});
test('category alternatives survive a failure of the text indexes', async () => {
 const api = catalog(async (url) => new URL(url).searchParams.get('q')?.includes('categories_tags:')
  ? { ok: true, json: async () => ({ hits: [{ code: '11111111', product_name: 'Besciamella', countries_tags: ['en:italy'], ingredients_text: 'latte, farina' }] }) }
  : { ok: false });
 const result = await api.offSearch({ data: { query: 'besciamella', fields: 'code', country: 'it' } });
 assert.equal(result.ok, true);
 assert.equal(JSON.parse(result.json).length, 1);
});

test('besciamella finds its sauce category and alternative catalog spellings', () => {
 const api = catalog(unavailable);
 assert.ok(api.ingredientCategories('besciamella senza glutine').includes('en:bechamel-sauces'));
 assert.ok(api.queryVariants('besciamella senza glutine').includes('bechamel'));
 assert.equal(api.matchesProductQuery({ product_name: 'Bechamel Sauce', labels_tags: ['en:no-gluten'] }, 'besciamella senza glutine'), true);
 assert.equal(api.matchesProductQuery({ product_name: 'Lasagne', ingredients_text: 'besciamella' }, 'besciamella'), false);
});

test('catalog pages expose more results and forward the next page to both searches', async () => {
 const urls=[];
 const api=catalog(async (url)=>{
  urls.push(url);
  const page=Number(new URL(url).searchParams.get('page') ?? 1);
  const count=page===1?60:2;
  return {ok:true,json:async()=>({hits:Array.from({length:count},(_,i)=>({code:String(page*10000000+i),product_name:'Riso',ingredients_text:'riso, acqua',countries_tags:['en:italy']}))})};
 });
 const first=await api.offSearch({data:{query:'riso',fields:'code',country:'it',page:1}});
 const second=await api.offSearch({data:{query:'riso',fields:'code',country:'it',page:2}});
 assert.equal(first.hasMore,true);
 assert.equal(second.hasMore,false);
 assert.equal(JSON.parse(second.json).length,2);
 assert.ok(urls.some(url=>new URL(url).searchParams.get('page')==='2'));
 assert.ok(urls.filter(url=>new URL(url).searchParams.get('page')==='2').every(url=>new URL(url).searchParams.get('page_size')==='60'));
});

test('country text search does not wrap brands in parentheses that the index treats literally', async()=>{
 const urls=[];
 const api=catalog(async(url)=>{urls.push(url);return {ok:true,json:async()=>({hits:[{code:'11111111',product_name:'Pane',brands:['Schär'],ingredients_text:'riso, acqua',countries_tags:['en:italy']}]})};});
 const result=await api.offSearch({data:{query:'Schär',fields:'code',country:'it'}});
 assert.equal(JSON.parse(result.json).length,1);
 assert.ok(urls.every(url=>!new URL(url).searchParams.get('q')?.startsWith('(')));
});

test('ingredient searches retain officially gluten-free Schär products when catalog labels are missing',()=>{
 const api=catalog(unavailable);
 assert.equal(api.matchesProductQuery({code:'11111111',product_name:'Farina',brands:'Schär'},'farina senza glutine'),true);
 assert.equal(api.matchesProductQuery({code:'22222222',product_name:'Farina',brands:'Other'},'farina senza glutine'),false);
 assert.equal(api.matchesProductQuery({code:'33333333',product_name:'Latte Zymil Magro',brands:'Parmalat'},'latte senza lattosio'),true);
 assert.equal(api.matchesProductQuery({code:'44444444',product_name:'Latte intero',brands:'Parmalat'},'latte senza lattosio'),false);
});
