import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Barcode, Camera, Check, ChevronRight, History, Salad, ShieldAlert, TriangleAlert, User } from "lucide-react";
import { ALLERGENS, type AllergenId } from "@/lib/allergens";
import { getProfile, saveProfile, useProfile } from "@/lib/store";

export const Route = createFileRoute("/")({
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

function Onboarding() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [selected, setSelected] = useState<Set<AllergenId>>(new Set());
  const [severe, setSevere] = useState(false);
  const toggle = (id: AllergenId) => setSelected((prev) => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
  const submit = () => { saveProfile({ name: name.trim() || "Ospite", allergens: Array.from(selected), severe }); navigate({ to: "/", replace: true }); };
  return <div className="mx-auto flex min-h-screen w-full max-w-md flex-col px-5 pb-10 pt-8">
    <div className="flex items-center gap-3"><div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-primary text-primary-foreground"><Salad className="h-6 w-6" /></div><div className="min-w-0"><h1 className="truncate text-2xl font-black text-foreground">SafeFood Scan</h1><p className="text-sm text-muted-foreground">Mangia sereno, in un tocco.</p></div></div>
    <h2 className="mt-8 text-xl font-extrabold text-foreground">Ciao! Come ti chiami?</h2>
    <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Il tuo nome (facoltativo)" className="mt-3 w-full rounded-2xl border border-input bg-card px-4 py-3.5 text-base text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
    <h2 className="mt-8 text-xl font-extrabold text-foreground">Cosa devi evitare?</h2><p className="mt-1 text-sm text-muted-foreground">Seleziona le tue intolleranze e allergie. Potrai modificarle in qualsiasi momento.</p>
    <div className="mt-4 grid grid-cols-2 gap-3">{ALLERGENS.map((a) => { const active = selected.has(a.id); const Icon = a.icon; return <button key={a.id} type="button" onClick={() => toggle(a.id)} aria-pressed={active} className={`relative flex items-center gap-3 rounded-2xl border-2 p-4 text-left transition-colors ${active ? "border-primary bg-secondary" : "border-border bg-card"}`}><Icon className={`h-6 w-6 shrink-0 ${active ? "text-primary" : "text-muted-foreground"}`} /><span className="min-w-0 flex-1 text-sm font-bold leading-tight text-foreground">{a.label}</span>{active && <span className="absolute -right-1.5 -top-1.5 grid h-6 w-6 place-items-center rounded-full bg-primary text-primary-foreground"><Check className="h-4 w-4" /></span>}</button>; })}</div>
    <button type="button" onClick={() => setSevere(!severe)} aria-pressed={severe} className={`mt-5 flex items-center gap-3 rounded-2xl border-2 p-4 text-left transition-colors ${severe ? "border-danger bg-danger-soft" : "border-border bg-card"}`}><TriangleAlert className={`h-6 w-6 shrink-0 ${severe ? "text-danger" : "text-muted-foreground"}`} /><span className="min-w-0 flex-1 text-sm leading-snug text-foreground"><strong>Ho allergie gravi.</strong> Mi verrà ricordato di controllare sempre l'etichetta.</span>{severe && <Check className="h-5 w-5 shrink-0 text-danger" />}</button>
    <button type="button" disabled={selected.size === 0} onClick={submit} className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-4 text-lg font-extrabold text-primary-foreground transition-opacity disabled:opacity-40">Inizia<ChevronRight className="h-5 w-5" /></button>
    <div className="mt-6"><Disclaimer /></div>
  </div>;
}

function Home({ profile }: { profile: NonNullable<ReturnType<typeof getProfile>> }) {
  return <div className="mx-auto flex min-h-screen w-full max-w-md flex-col px-5 pb-10 pt-8">
    <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3"><div className="flex min-w-0 items-center gap-3"><div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-primary text-primary-foreground"><Salad className="h-5 w-5" /></div><div className="min-w-0"><p className="text-xs font-semibold text-muted-foreground">Ciao,</p><h1 className="truncate text-xl font-black text-foreground">{profile.name}</h1></div></div><Link to="/history" className="flex shrink-0 items-center gap-1.5 rounded-full bg-secondary px-3.5 py-2 text-sm font-bold text-secondary-foreground"><History className="h-4 w-4" />Cronologia</Link></header>
    <div className="mt-5 flex flex-wrap items-center gap-2"><span className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground"><User className="h-3.5 w-3.5" />Eviti:</span>{profile.allergens.map((id) => { const a = ALLERGENS.find((x) => x.id === id)!; return <span key={id} className="rounded-full bg-secondary px-3 py-1 text-xs font-bold text-secondary-foreground">{a.label}</span>; })}</div>
    <p className="mt-8 text-center text-lg font-bold text-foreground">Cosa vuoi controllare?</p>
    <div className="mt-4 flex flex-col gap-4"><Link to="/scan" search={{ mode: "barcode" }} className="flex items-center gap-4 rounded-3xl bg-primary p-6 text-primary-foreground shadow-lg transition-transform active:scale-[0.98]"><div className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-primary-foreground/20"><Barcode className="h-9 w-9" /></div><div className="min-w-0"><p className="text-xl font-extrabold leading-tight">Scansiona codice a barre</p><p className="mt-1 text-sm opacity-90">Inquadra il codice sul prodotto</p></div></Link>
    <Link to="/ingredients" search={{}} className="flex items-center gap-4 rounded-3xl border-2 border-primary bg-card p-6 text-foreground transition-transform active:scale-[0.98]"><div className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-secondary"><Camera className="h-9 w-9 text-primary" /></div><div className="min-w-0"><p className="text-xl font-extrabold leading-tight">Fotografa ingredienti</p><p className="mt-1 text-sm text-muted-foreground">Scatta una foto alla lista ingredienti</p></div></Link></div>
    <div className="mt-auto pt-8"><Disclaimer /></div>
  </div>;
}

function Index() { const profile = useProfile(); return profile === null ? <Onboarding /> : <Home profile={profile} />; }