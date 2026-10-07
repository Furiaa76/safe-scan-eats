import { createClient } from 'npm:@supabase/supabase-js@2';
const origins = new Set(['https://safe-scan-eats.vercel.app','https://safe-scan-eats-b8lm.vercel.app']);
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const categories = ['open','scan','recipes','shopping','search','installed'];
// Short-lived in-memory abuse protection; IP hashes are never written to the database.
const bursts=new Map<string,{n:number,until:number}>();
const sources = ['facebook','instagram','tiktok','direct'];
export async function hash(value: string) {
 return [...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)))].map(x=>x.toString(16).padStart(2,'0')).join('');
}
export async function handler(req: Request) {
 const origin=req.headers.get('origin');
 const headers: Record<string,string>={'Content-Type':'application/json','Cache-Control':'no-store','Vary':'Origin'};
 if(origin && origins.has(origin)) headers['Access-Control-Allow-Origin']=origin;
 const respond=(status:number,data:unknown)=>new Response(JSON.stringify(data),{status,headers});
 if(origin && !origins.has(origin)) return respond(403,{error:'origin'});
 if(req.method==='OPTIONS') return new Response(null,{status:204,headers:{...headers,'Access-Control-Allow-Methods':'POST, OPTIONS','Access-Control-Allow-Headers':'content-type,authorization'}});
 if(req.method!=='POST') return respond(405,{error:'method'});
 const ip=req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()??'unknown';
 const rateKey=await hash(ip+new Date().toISOString().slice(0,10));
 const now=Date.now();for(const [key,entry] of bursts)if(entry.until<now)bursts.delete(key);
 const rate=bursts.get(rateKey)??{n:0,until:now+60000};rate.n++;bursts.set(rateKey,rate);
 if(rate.n>60)return respond(429,{error:'rate_limit'});
 const raw=await req.text(); if(raw.length>1024) return respond(413,{error:'size'});
 let b: Record<string,unknown>; try{ b=JSON.parse(raw); if(!b || typeof b!=='object'||Array.isArray(b)) throw Error(); }catch{return respond(400,{error:'json'});}
 const db=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false,autoRefreshToken:false}});
 try {
 if(b.action==='report') {
  if(Object.keys(b).some(k=>k!=='action')) return respond(400,{error:'fields'});
  const key=req.headers.get('authorization')?.replace(/^Bearer /,'')??'';
  if(key.length<24||key.length>100) return respond(401,{error:'unauthorized'});
  const {data,error}=await db.from('app_statistics_admin').select('password_hash').eq('id',true).single();
  if(error||data?.password_hash!==await hash(key)) return respond(401,{error:'unauthorized'});
  const report=await db.rpc('app_statistics_report'); if(report.error) throw report.error;
  return respond(200,report.data);
 }
 const allowed=b.action==='event'?['action','token','category','source']:b.action==='feedback'?['action','token','rating','reason']:b.action==='erase'?['action','token']:[];
 if(!allowed.length||Object.keys(b).some(k=>!allowed.includes(k))||typeof b.token!=='string'||!uuid.test(b.token)) return respond(400,{error:'fields'});
 const token=await hash(b.token), day=new Date().toISOString().slice(0,10);
 if(b.action==='event') {
  if(!categories.includes(String(b.category))||!sources.includes(String(b.source))) return respond(400,{error:'event'});
  const {error}=await db.from('app_statistics_events').upsert({visitor_hash:token,day,category:b.category,source:b.source},{onConflict:'visitor_hash,day,category',ignoreDuplicates:true});if(error) throw error;
 } else if(b.action==='feedback') {
  if(!['useful','improve','not_useful'].includes(String(b.rating))||!['none','products','recipes','difficult','other'].includes(String(b.reason))) return respond(400,{error:'feedback'});
  const {error}=await db.from('app_statistics_feedback').upsert({token_hash:token,day,rating:b.rating,reason:b.reason});if(error) throw error;
 } else {
  const results=await Promise.all([db.from('app_statistics_events').delete().eq('visitor_hash',token),db.from('app_statistics_feedback').delete().eq('token_hash',token)]);
  if(results.some(r=>r.error)) throw Error('erase');
 }
 return respond(200,{ok:true});
 }catch {return respond(503,{error:'temporarily_unavailable'});}
}
Deno.serve(handler);
