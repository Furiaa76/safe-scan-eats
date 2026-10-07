import { useEffect, useRef, useState } from 'react';
import { useLocation } from '@tanstack/react-router';
import { useAppLanguage } from '@/lib/language';
import { CHOICE_KEY, eraseStatistics, recordStatistics, statisticsRequest } from '@/lib/app-statistics';

export function AppStatistics() {
 const {language}=useAppLanguage();const en=language==='en';
 const pathname=useLocation({select:l=>l.pathname});
 const dialog=useRef<HTMLElement>(null);
 const [choice,setChoice]=useState<string|null>('loading');const [panel,setPanel]=useState(false);const [details,setDetails]=useState(false);
 const [rating,setRating]=useState('useful');const [reason,setReason]=useState('none');const [message,setMessage]=useState('');const [busy,setBusy]=useState(false);
 const text=(it:string,english:string)=>en?english:it;
 useEffect(()=>{
 if(!panel)return;
 const previous=document.activeElement as HTMLElement|null;
 dialog.current?.querySelector<HTMLElement>('button')?.focus();
 const key=(e:KeyboardEvent)=>{if(e.key==='Escape'){setPanel(false);return;}if(e.key!=='Tab')return;
 const nodes=[...(dialog.current?.querySelectorAll<HTMLElement>('button:not(:disabled),select,input,a[href]')??[])];const first=nodes[0],last=nodes.at(-1);
 if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}};
 document.addEventListener('keydown',key);return()=>{document.removeEventListener('keydown',key);previous?.focus();};
 },[panel]);
 useEffect(()=>{const storage=(e:StorageEvent)=>{if(e.key===CHOICE_KEY)setChoice(e.newValue);};window.addEventListener('storage',storage);return()=>window.removeEventListener('storage',storage);},[]);
 useEffect(()=>{try{setChoice(localStorage.getItem(CHOICE_KEY));}catch{setChoice('no');}},[]);
 useEffect(()=>{
  if(choice!=='yes'||pathname==='/statistics')return;
  const track=()=>{
   void recordStatistics('open').catch(()=>{});
   const category=({'/scan':'scan','/recipes':'recipes','/shopping':'shopping','/search':'search'} as Record<string,string>)[pathname];
   if(category)void recordStatistics(category).catch(()=>{});
   if(window.matchMedia?.('(display-mode: standalone)').matches||(navigator as Navigator&{standalone?:boolean}).standalone) void recordStatistics('installed').catch(()=>{});
  };
  track();const visible=()=>{if(document.visibilityState==='visible')track();};document.addEventListener('visibilitychange',visible);
  const installed=()=>{void recordStatistics('installed').catch(()=>{});};window.addEventListener('appinstalled',installed);
  return()=>{document.removeEventListener('visibilitychange',visible);window.removeEventListener('appinstalled',installed);};
 },[choice,pathname]);
 if(pathname==='/statistics')return null;
 function decide(value:string){try{localStorage.setItem(CHOICE_KEY,value);setChoice(value);}catch{setChoice('no');}}
 async function erase(){setBusy(true);setChoice('no');setMessage('');try{await eraseStatistics();setMessage(text('Statistiche revocate e dati di questo browser eliminati.','Statistics withdrawn and this browser’s data deleted.'));}catch{setMessage(text('Raccolta fermata. Eliminazione non riuscita: riprova quando sei online.','Collection stopped. Deletion failed: try again when online.'));}finally{setBusy(false);}}
 async function feedback(){setBusy(true);setMessage('');try{let token=localStorage.getItem('safe-scan-feedback-token-v1');const expiry=Number(localStorage.getItem('safe-scan-feedback-expires-v1'));if(!expiry||Date.now()>expiry)token=null;if(!token){token=crypto.randomUUID();localStorage.setItem('safe-scan-feedback-token-v1',token);localStorage.setItem('safe-scan-feedback-expires-v1',String(Date.now()+180*86400000));}await statisticsRequest({action:'feedback',token,rating,reason});setMessage(text('Grazie! Il tuo giudizio è stato salvato.','Thank you! Your feedback was saved.'));}catch{setMessage(text('Invio non riuscito. Riprova quando sei online.','Could not send. Try again when online.'));}finally{setBusy(false);}}
 const button='rounded-xl border px-4 py-3 font-bold';
 return <>
 {choice===null&&<section aria-label={text('Statistiche facoltative','Optional statistics')} className="fixed bottom-3 left-3 right-3 z-50 mx-auto max-w-xl rounded-2xl border bg-background p-5 shadow-xl">
 <p className="font-bold">{text('Ci aiuti a migliorare Safe Scan?','Help us improve Safe Scan?')}</p>
 <p className="my-2 text-sm">{text('Con il tuo consenso contiamo accessi e ritorni tramite un codice casuale del browser. Non inviamo nomi, allergie, ricette o lista della spesa. L’app funziona anche se rifiuti.','With your consent, a random browser code measures visits and returns. We do not send names, allergies, recipes or shopping lists. The app works if you decline.')}</p>
 <div className="flex flex-wrap gap-3"><button className={button} onClick={()=>decide('yes')}>{text('Accetto','Accept')}</button><button className={button} onClick={()=>decide('no')}>{text('Rifiuto','Decline')}</button><button className="underline" onClick={()=>{setPanel(true);setDetails(true);}}>{text('Dettagli','Details')}</button></div>
 </section>}
 <footer className="mx-auto max-w-3xl px-5 py-6 text-center"><button className="text-sm underline" onClick={()=>setPanel(true)}>{text('Il tuo giudizio e privacy delle statistiche','Feedback and statistics privacy')}</button></footer>
 {panel&&<div className="fixed inset-0 z-[60] overflow-y-auto bg-black/40 p-4" role="dialog" aria-modal="true" aria-label={text('Giudizio e statistiche','Feedback and statistics')}><section ref={dialog} className="mx-auto my-8 max-w-xl rounded-2xl bg-background p-6 shadow-xl">
 <button className="float-right rounded-lg border px-3 py-2" onClick={()=>setPanel(false)}>{text('Chiudi','Close')}</button><h2 className="mb-5 text-xl font-black">{text('Aiutaci a migliorare','Help us improve')}</h2>
 <label className="block font-bold">{text('L’app ti è utile?','Is the app useful?')}<select className="my-2 block w-full rounded-xl border bg-background p-3" value={rating} onChange={e=>setRating(e.target.value)}><option value="useful">{text('Sì, mi è utile','Yes, useful')}</option><option value="improve">{text('Utile, ma da migliorare','Useful, but needs improvement')}</option><option value="not_useful">{text('Non mi è utile','Not useful to me')}</option></select></label>
 <label className="block font-bold">{text('Cosa possiamo migliorare?','What can we improve?')}<select className="my-2 block w-full rounded-xl border bg-background p-3" value={reason} onChange={e=>setReason(e.target.value)}>{[['none','Nessun motivo','No reason'],['products','Prodotti non trovati','Missing products'],['recipes','Ricette','Recipes'],['difficult','Difficile da usare','Difficult to use'],['other','Altro','Other']].map(([v,it,english])=><option key={v} value={v}>{text(it??'',english??'')}</option>)}</select></label>
 <p className="mb-3 text-sm">{text('Invio facoltativo, separato dalle statistiche di utilizzo. Conserviamo un solo giudizio per codice casuale; puoi aggiornarlo o eliminarlo qui.','Optional feedback, separate from usage statistics. One rating per random code; you can update or delete it here.')}</p>
 <button className={button} disabled={busy} onClick={()=>void feedback()}>{text('Invia il giudizio','Send feedback')}</button>
 <hr className="my-5"/><button className="underline" onClick={()=>setDetails(!details)}>{text('Informazioni sulle statistiche','About statistics')}</button>
 {details&&<div className="my-3 space-y-3 text-sm"><p>{text('Gestore: Fabio Bellotti. Scopo: capire l’utilità dell’app e migliorare le funzioni. Base: consenso facoltativo per gli accessi; invio volontario per il giudizio.','Operator: Fabio Bellotti. Purpose: assess usefulness and improve features. Basis: optional consent for visits; voluntary feedback submission.')}</p><p>{text('Contatto per privacy e richieste:','Contact for privacy and requests:')} <a className="underline" href="mailto:bellottib76@gmail.com">bellottib76@gmail.com</a>. {text('Puoi chiedere accesso, rettifica, cancellazione e presentare reclamo al Garante per la protezione dei dati personali.','You may request access, correction, deletion and complain to the Italian data protection authority.')}</p><p>{text('Registriamo codice pseudonimo, giorno, provenienza Facebook/Instagram/TikTok o diretta, apertura di scanner/ricette/spesa/ricerca e uso dalla schermata Home quando rilevabile. Nessun dato alimentare, posizione precisa o testo digitato. Il codice distingue browser, non persone.','We record a pseudonymous code, day, Facebook/Instagram/TikTok or direct source, scanner/recipes/shopping/search use and Home Screen use when detectable. No dietary data, precise location or typed text. The code identifies browsers, not people.')}</p><p>{text('Database Supabase in Germania, dati eliminati dopo 180 giorni; il codice locale scade dopo 180 giorni. I fornitori possono trattare indirizzi IP nei log tecnici. Il pannello del gestore mostra solo totali. La cancellazione dell’app dal telefono non è rilevabile.','Supabase database in Germany; data deleted after 180 days, local code expires after 180 days. Providers may process IP addresses in technical logs. The operator dashboard shows totals only. App deletion cannot be detected.')}</p><p>{text('Puoi rifiutare, cambiare scelta e revocare il consenso senza perdere le funzioni. Il pulsante sotto elimina accessi e giudizio associati ai codici di questo browser. Se hai cancellato i dati del browser non possiamo più collegare quei codici a te.','You may decline, change your choice and withdraw consent without losing features. The button below deletes visits and feedback associated with this browser’s codes. If browser data has been cleared, we can no longer link those codes to you.')}</p></div>}
 <p className="my-3 text-sm">{text('Statistiche di utilizzo:','Usage statistics:')} {choice==='yes'?text('attive','enabled'):text('disattivate','disabled')}</p>
 <div className="flex flex-wrap gap-3"><button className={button} disabled={busy||choice==='yes'} onClick={()=>decide('yes')}>{text('Accetta statistiche','Accept statistics')}</button><button className={button} disabled={busy} onClick={()=>void erase()}>{text('Rifiuta ed elimina i miei dati','Decline and delete my data')}</button></div>
 <p aria-live="polite" className="mt-4 text-sm">{message}</p>
 </section></div>}
 </>;
}
