import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Barcode, Camera, Check, ChefHat, ChevronRight, CreditCard, History, Plus, Salad, ShieldAlert, ShoppingCart, Trash2, TriangleAlert, User, Users } from "lucide-react";
import { ALLERGENS, type AllergenId } from "@/lib/allergens";
import { addProfile, enableFreeMode, removeProfile, saveProfile, setActiveProfile, useProfile, useProfilesState, useShoppingList } from "@/lib/store";



export const Route = createFileRoute("/")({
  server: { handlers: { POST: async ({ request }) => handleAlexaRequest(request) } },
  head: () => ({ meta: [
    { title: "SafeFood Scan — Controlla allergeni e intolleranze" },
    { name: "description", content: "Scansiona i prodotti e scopri subito se sono compatibili con le tue intolleranze e allergie alimentari." },
    { property: "og:title", content: "SafeFood Scan" },
    { property: "og:description", content: "Scopri subito se un prodotto è compatibile con le tue allergie e intolleranze." },
  ]}),
  component: Index,
});

function Disclaimer() {
  return <div className="rounded-2xl border border-caution/40 bg-caution-soft p-4"><div className="flex items-start gap-3"><ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-caution-foreground" /><p className="text-sm leading-relaxed text-caution-foreground"><strong>Importante:</strong> SafeFood Scan è uno strumento informativo e <strong>non sostituisce il parere medico</strong>. In caso di allergie gravi, verifica sempre l'etichetta del prodotto e contatta il produttore.</p></div></div>;
}

function ProfileForm({ adding = false, onCancel }: { adding?: boolean; onCancel?: () => void }) {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [selected, setSelected] = useState<Set<AllergenId>>(new Set());
  const [severe, setSevere] = useState(false);
  const toggle = (id: AllergenId) => setSelected((prev) => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
  const submit = () => {
    const data = { name: name.trim() || (adding ? "Nuovo profilo" : "Ospite"), allergens: Array.from(selected), severe };
    if (adding) addProfile(data); else saveProfile(data);
    onCancel?.();
    navigate({ to: "/", replace: true });
  };
  const free = () => { enableFreeMode(); onCancel?.(); navigate({ to: "/", replace: true }); };

  return <div className="mx-auto flex min-h-screen w-full max-w-md flex-col px-5 pb-10 pt-8">
    <div className="flex items-center gap-3"><div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-primary text-primary-foreground"><Salad className="h-6 w-6" /></div><div className="min-w-0"><h1 className="truncate text-2xl font-black text-foreground">SafeFood Scan</h1><p className="text-sm text-muted-foreground">Mangia sereno, in un tocco.</p></div></div>
    <h2 className="mt-8 text-xl font-extrabold text-foreground">{adding ? "Aggiungi un profilo" : "Ciao! Come ti chiami?"}</h2>
    <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome del profilo" className="mt-3 w-full rounded-2xl border border-input bg-card px-4 py-3.5 text-base text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
    <h2 className="mt-8 text-xl font-extrabold text-foreground">Cosa deve evitare?</h2><p className="mt-1 text-sm text-muted-foreground">Seleziona intolleranze e allergie. Il profilo verrà usato automaticamente nelle analisi.</p>
    <div className="mt-4 grid grid-cols-2 gap-3">{ALLERGENS.map((a) => { const active = selected.has(a.id); const Icon = a.icon; return <button key={a.id} type="button" onClick={() => toggle(a.id)} aria-pressed={active} className={`relative flex items-center gap-3 rounded-2xl border-2 p-4 text-left transition-colors ${active ? "border-primary bg-secondary" : "border-border bg-card"}`}><Icon className={`h-6 w-6 shrink-0 ${active ? "text-primary" : "text-muted-foreground"}`} /><span className="min-w-0 flex-1 text-sm font-bold leading-tight text-foreground">{a.label}</span>{active && <span className="absolute -right-1.5 -top-1.5 grid h-6 w-6 place-items-center rounded-full bg-primary text-primary-foreground"><Check className="h-4 w-4" /></span>}</button>; })}</div>
    <button type="button" onClick={() => setSevere(!severe)} aria-pressed={severe} className={`mt-5 flex items-center gap-3 rounded-2xl border-2 p-4 text-left transition-colors ${severe ? "border-danger bg-danger-soft" : "border-border bg-card"}`}><TriangleAlert className={`h-6 w-6 shrink-0 ${severe ? "text-danger" : "text-muted-foreground"}`} /><span className="min-w-0 flex-1 text-sm leading-snug text-foreground"><strong>Allergie gravi.</strong> L'app ricorderà di controllare sempre l'etichetta.</span>{severe && <Check className="h-5 w-5 shrink-0 text-danger" />}</button>
    <button type="button" disabled={selected.size === 0} onClick={submit} className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-4 text-lg font-extrabold text-primary-foreground transition-opacity disabled:opacity-40">Salva profilo<ChevronRight className="h-5 w-5" /></button>
    {!adding && <button type="button" onClick={free} className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-primary bg-card py-3.5 text-base font-extrabold text-primary"><User className="h-5 w-5" />Continua in modalità libera</button>}
    {adding && onCancel && <button type="button" onClick={onCancel} className="mt-3 py-3 text-sm font-bold text-muted-foreground">Annulla</button>}
    <div className="mt-6"><Disclaimer /></div>
  </div>;
}

function Home({ onAddProfile }: { onAddProfile: () => void }) {
  const profile = useProfile();
  const state = useProfilesState();
  const shopping = useShoppingList();
  const freeMode = state.freeMode;

  const deleteActiveProfile = () => {
    if (!profile) return;
    const ok = window.confirm(`Vuoi eliminare il profilo “${profile.name}”? Questa operazione non può essere annullata.`);
    if (ok) removeProfile(profile.id);
  };

  return <div className="mx-auto flex min-h-screen w-full max-w-md flex-col px-5 pb-10 pt-8">
    <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3"><div className="flex min-w-0 items-center gap-3"><div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-primary text-primary-foreground"><Salad className="h-5 w-5" /></div><div className="min-w-0"><p className="text-xs font-semibold text-muted-foreground">{freeMode ? "Modalità" : "Ciao,"}</p><h1 className="truncate text-xl font-black text-foreground">{freeMode ? "Libera" : profile?.name ?? "Profilo"}</h1></div></div><Link to="/history" className="flex shrink-0 items-center gap-1.5 rounded-full bg-secondary px-3.5 py-2 text-sm font-bold text-secondary-foreground"><History className="h-4 w-4" />Cronologia</Link></header>

    <section className="mt-5 rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center justify-between gap-3"><div className="flex items-center gap-2"><Users className="h-4 w-4 text-primary" /><p className="text-sm font-extrabold text-foreground">Profili</p></div><button type="button" onClick={onAddProfile} className="flex items-center gap-1 text-xs font-extrabold text-primary"><Plus className="h-4 w-4" />Aggiungi</button></div>
      <div className="mt-3 flex flex-wrap gap-2">
        {state.profiles.map((p) => <button key={p.id} type="button" onClick={() => setActiveProfile(p.id)} className={`rounded-full px-3 py-2 text-xs font-extrabold ${!freeMode && p.id === state.activeProfileId ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}>{p.name}</button>)}
        <button type="button" onClick={enableFreeMode} className={`rounded-full px-3 py-2 text-xs font-extrabold ${freeMode ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}>Modalità libera</button>
      </div>
      {freeMode ? <p className="mt-3 text-xs leading-relaxed text-muted-foreground">Nessun filtro personale: l'app mostra le informazioni del prodotto e gli allergeni rilevati senza giudicarli rispetto a un profilo.</p> : <>
        <div className="mt-3 flex flex-wrap items-center gap-2"><span className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground"><User className="h-3.5 w-3.5" />Evita:</span>{profile?.allergens.map((id) => { const a = ALLERGENS.find((x) => x.id === id); return a ? <span key={id} className="rounded-full bg-secondary px-3 py-1 text-xs font-bold text-secondary-foreground">{a.label}</span> : null; })}</div>
        {profile && <button type="button" onClick={deleteActiveProfile} className="mt-4 flex items-center gap-1.5 text-xs font-extrabold text-danger"><Trash2 className="h-4 w-4" />Elimina profilo “{profile.name}”</button>}
      </>}
    </section>

    <p className="mt-8 text-center text-lg font-bold text-foreground">Cosa vuoi controllare?</p>
    <div className="mt-4 flex flex-col gap-4"><Link to="/scan" search={{ mode: "barcode" }} className="flex items-center gap-4 rounded-3xl bg-primary p-6 text-primary-foreground shadow-lg transition-transform active:scale-[0.98]"><div className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-primary-foreground/20"><Barcode className="h-9 w-9" /></div><div className="min-w-0"><p className="text-xl font-extrabold leading-tight">Scansiona codice a barre</p><p className="mt-1 text-sm opacity-90">Inquadra il codice sul prodotto</p></div></Link>
    <Link to="/ingredients" search={{}} className="flex items-center gap-4 rounded-3xl border-2 border-primary bg-card p-6 text-foreground transition-transform active:scale-[0.98]"><div className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-secondary"><Camera className="h-9 w-9 text-primary" /></div><div className="min-w-0"><p className="text-xl font-extrabold leading-tight">Fotografa ingredienti</p><p className="mt-1 text-sm text-muted-foreground">Scatta una foto alla lista ingredienti</p></div></Link>
    <Link to="/crs" className="flex items-center gap-4 rounded-3xl border-2 border-border bg-card p-6 text-foreground transition-transform active:scale-[0.98]"><div className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-secondary"><CreditCard className="h-9 w-9 text-primary" /></div><div className="min-w-0 flex-1"><p className="text-xl font-extrabold leading-tight">CRS · Celiachia</p><p className="mt-1 text-sm text-muted-foreground">Tessera Sanitaria, budget e negozi convenzionati</p></div><CreditCard className="h-5 w-5 text-muted-foreground" /></Link><Link to="/recipes" className="flex items-center gap-4 rounded-3xl border-2 border-border bg-card p-6 text-foreground transition-transform active:scale-[0.98]"><div className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-secondary"><ChefHat className="h-9 w-9 text-primary" /></div><div className="min-w-0 flex-1"><p className="text-xl font-extrabold leading-tight">Ricette</p><p className="mt-1 text-sm text-muted-foreground">Scegli cosa cucinare e aggiungi gli ingredienti</p></div><ChefHat className="h-5 w-5 text-muted-foreground" /></Link><Link to="/shopping" className="flex items-center gap-4 rounded-3xl border-2 border-border bg-card p-6 text-foreground transition-transform active:scale-[0.98]"><div className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-secondary"><ShoppingCart className="h-9 w-9 text-primary" /></div><div className="min-w-0 flex-1"><p className="text-xl font-extrabold leading-tight">Lista della spesa</p><p className="mt-1 text-sm text-muted-foreground">{shopping.filter((item) => !item.checked).length} prodotti da comprare · aggiungi e modifica a mano</p></div><ShoppingCart className="h-5 w-5 text-muted-foreground" /></Link></div>
    <div className="mt-auto pt-8"><Disclaimer /></div>
  </div>;
}

function Index() {
  const state = useProfilesState();
  const [adding, setAdding] = useState(false);
  if (adding) return <ProfileForm adding onCancel={() => setAdding(false)} />;
  if (state.profiles.length === 0 && !state.freeMode) return <ProfileForm />;
  return <Home onAddProfile={() => setAdding(true)} />;
}