import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import ts from 'typescript';

const asModule = source => 'data:text/javascript;base64,' + Buffer.from(ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText).toString('base64');
const nickelUrl = asModule(readFileSync(new URL('../src/lib/nickel.ts', import.meta.url), 'utf8'));
const { assessNickel, normalizeNickelSettings } = await import(nickelUrl);
const item = (name, aliases = []) => ({id:name,kind:'ingredient',name,aliases,code:'',note:''});
const settings = entries => ({enabled:true,startPage:false,entries});
const p = (ingredientsText, code = '') => ({ingredientsText,code});

test('nickel is disabled for existing profiles until selected', () => {
  assert.equal(assessNickel(p('cacao')), undefined);
  assert.equal(assessNickel(p('cacao'), {...settings([item('cacao')]),enabled:false}), undefined);
});
test('empty and incomplete lists never produce a green result', () => {
  assert.equal(assessNickel(p('riso'),settings([])).status,'empty');
  assert.equal(assessNickel(p(''),settings([item('cacao')])).status,'incomplete');
  assert.equal(assessNickel(p('...'),settings([item('cacao')])).status,'incomplete');
});
test('match uses full words, normalizes punctuation and accents, and only selected aliases', () => {
  assert.equal(assessNickel(p('cacao-magro (6%)'),settings([item('Cacao magro')])).status,'avoid');
  assert.equal(assessNickel(p('caffè'),settings([item('caffe')])).status,'avoid');
  assert.equal(assessNickel(p('gallatte'),settings([item('latte')])).status,'clear');
  assert.equal(assessNickel(p('pomodori'),settings([item('pomodoro')])).status,'clear');
  assert.equal(assessNickel(p('pomodori'),settings([item('pomodoro',['pomodori'])])).status,'avoid');
});
test('a personally saved barcode overrides missing ingredients', () => {
  const list=settings([{...item('Miei biscotti'),kind:'product',code:'2000000000039'}]);
  assert.equal(assessNickel(p('', '2000000000039'),list).status,'avoid');
  assert.equal(assessNickel(p('riso','2000000000022'),list).status,'clear');
  assert.equal(assessNickel(p('riso'),list).missing,'code');
});
test('foreign ingredient data cannot silently become green', () => {
  assert.equal(assessNickel({...p('lait'),source:'off',ingredientsLanguage:'fr'},settings([item('latte')])).missing,'language');
});
test('normalization drops invalid data, preserves opted-out entries, and imposes no item count limit', () => {
  const value=normalizeNickelSettings({enabled:false,startPage:true,entries:[null,{id:'bad',kind:'product',name:'bad',code:'abc'},...Array.from({length:500},(_,i)=>item('alimento '+i))]});
  assert.equal(value.entries.length,500);
  assert.equal(value.startPage,false);
  assert.equal(normalizeNickelSettings('bad'),undefined);
});
test('profile storage isolates lists, preserves changes on edit and switches startup per profile', async () => {
  const memory=new Map();
  globalThis.window={localStorage:{getItem:key=>memory.get(key)??null,setItem:(key,value)=>memory.set(key,value),removeItem:key=>memory.delete(key)}};
  const source=readFileSync(new URL('../src/lib/store.ts',import.meta.url),'utf8').replace('from "react";',`from "${import.meta.resolve('react')}";`).replace('from "./nickel";',`from "${nickelUrl}";`);
  const store=await import(asModule(source));
  const a=store.addProfile({name:'A',allergens:[],severe:false});
  const b=store.addProfile({name:'B',allergens:['glutine'],severe:false});
  store.saveNickelEntry(a.id,item('pomodoro'));
  store.updateNickelSettings(a.id,{startPage:true});
  assert.equal(store.getProfile().id,b.id,'editing A must not activate A');
  assert.equal(store.getProfile().nickel,undefined,'B must not inherit A’s list');
  store.setActiveProfile(a.id);
  assert.equal(store.getStartupPath(store.getProfile()),'/nichel');
  store.saveProfile({id:a.id,name:'A updated',allergens:[],severe:false});
  assert.equal(store.getProfile().nickel.entries[0].name,'pomodoro');
  assert.equal(store.getProfile().nickel.startPage,true);
  assert.throws(()=>store.saveNickelEntry(a.id,{...item('pomodoro'),id:'duplicate'}),/già/);
  store.removeNickelEntry(a.id,'pomodoro');
  assert.equal(store.getProfile().nickel.entries.length,0);
  store.setActiveProfile(b.id);
  assert.equal(store.getStartupPath(store.getProfile()),'/');
  store.enableFreeMode();
  assert.equal(store.getStartupPath(store.getProfile()),'/');
  const before=store.getProfilesState();
  window.localStorage.setItem=()=>{throw new Error('quota')};
  assert.throws(()=>store.updateNickelSettings(b.id,{enabled:true}),/quota/);
  assert.equal(store.getProfilesState(),before,'failed storage must not mutate the profile snapshot');
  delete globalThis.window;
});
