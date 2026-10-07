export const STATISTICS_URL='https://mqrmdynpcextvjgkkyfj.supabase.co/functions/v1/app-statistics';
export const CHOICE_KEY='safe-scan-statistics-choice-v1';
export const TOKEN_KEY='safe-scan-statistics-token-v1';
const SOURCE_KEY='safe-scan-statistics-source-v1';
export async function statisticsRequest(body:Record<string,unknown>,key?:string) {
 const response=await fetch(STATISTICS_URL,{method:'POST',headers:{'Content-Type':'application/json',...(key?{Authorization:`Bearer ${key}`}:{})},body:JSON.stringify(body)});
 if(!response.ok) throw new Error(response.status===401?'Accesso negato':'Servizio temporaneamente non disponibile');
 return response.json();
}
export function statisticsToken() {
 let token=localStorage.getItem(TOKEN_KEY);
 const expiry=Number(localStorage.getItem(TOKEN_KEY+'-expires'));
 if(token && (!expiry||Date.now()>expiry)){localStorage.removeItem(TOKEN_KEY);localStorage.removeItem(SOURCE_KEY);token=null;}
 if(!token){token=crypto.randomUUID();localStorage.setItem(TOKEN_KEY,token);localStorage.setItem(TOKEN_KEY+'-expires',String(Date.now()+180*86400000));}
 return token;
}
export function statisticsSource() {
 const saved=localStorage.getItem(SOURCE_KEY); if(saved) return saved;
 const source=new URLSearchParams(location.search).get('utm_source')?.toLowerCase();
 const value=['facebook','instagram','tiktok'].includes(source??'')?source!:'direct';
 localStorage.setItem(SOURCE_KEY,value);return value;
}
const sent=new Set<string>();
const pending=new Set<Promise<unknown>>();
export async function recordStatistics(category:string) {
 if(localStorage.getItem(CHOICE_KEY)!=='yes') return;
 const token=statisticsToken();const dedupe=token+new Date().toISOString().slice(0,10)+category;
 if(sent.has(dedupe))return;sent.add(dedupe);
 const request=statisticsRequest({action:'event',token,category,source:statisticsSource()});pending.add(request);
 try{await request;}catch(error){sent.delete(dedupe);throw error;}finally{pending.delete(request);}
}
export async function eraseStatistics() {
 const tokens=[localStorage.getItem(TOKEN_KEY),localStorage.getItem('safe-scan-feedback-token-v1')].filter(Boolean);
 localStorage.setItem(CHOICE_KEY,'no');
 await Promise.allSettled([...pending]);
 sent.clear();
 // Keep tokens until deletion succeeds, so a failed request can be retried.
 await Promise.all(tokens.map(token=>statisticsRequest({action:'erase',token})));
 for(const key of [TOKEN_KEY,TOKEN_KEY+'-expires',SOURCE_KEY,'safe-scan-feedback-token-v1','safe-scan-feedback-expires-v1']) localStorage.removeItem(key);
}
