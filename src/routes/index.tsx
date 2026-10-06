import { LanguageSelector } from "@/components/LanguageSelector";
import { useAppLanguage } from "@/lib/language";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Barcode, Camera, Check, ChefHat, ChevronRight, CreditCard, History, Plus, Salad, ShieldAlert, ShoppingCart, Trash2, TriangleAlert, User, Users } from "lucide-react";
import { ALLERGENS, type AllergenId } from "@/lib/allergens";
import { addProfile, enableFreeMode, removeProfile, saveProfile, setActiveProfile, useProfile, useProfilesState, useShoppingList } from "@/lib/store";



export const Route = createFileRoute("/")({
  server: { handlers: { POST: async ({ request }) => handleAlexaRequest(request) } },
  head: () => ({ meta: [
    { title: "Safe Scan Eats — Controlla allergeni e intolleranze" },
    { name: "description", content: "Scansiona i prodotti e scopri subito se sono compatibili con le tue intolleranze e allergie alimentari." },
    { property: "og:title", content: "Safe Scan Eats" },
    { property: "og:description", content: "Scopri subito se un prodotto è compatibile con le tue allergie e intolleranze." },
  ]}),
  component: Index,
});

function Disclaimer() {
  const { t } = useAppLanguage();

  return <div className="rounded-2xl border border-caution/40 bg-caution-soft p-4"><div className="flex items-start gap-3"><ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-caution-foreground" /><p className="text-sm leading-relaxed text-caution-foreground"><strong>{t("Importante:")}</strong> {t(" Safe Scan Eats è uno strumento informativo e ")}<strong>{t("non sostituisce il parere medico")}</strong>{t(". In caso di allergie gravi, verifica sempre l'etichetta del prodotto e contatta il produttore.")}</p></div></div>;
}

function ProfileForm({
  adding = false,
  editingProfile,
  onCancel,
}: {
  adding?: boolean;
  editingProfile?: ReturnType<typeof useProfile>;
  onCancel?: () => void;
}) {
  const { t } = useAppLanguage();

  const navigate = useNavigate();
  const [name, setName] = useState(editingProfile?.name ?? "");
  const [selected, setSelected] = useState<Set<AllergenId>>(new Set(editingProfile?.allergens ?? []));
  const [customText, setCustomText] = useState((editingProfile?.customAllergens ?? []).join(", "));
  const [severe, setSevere] = useState(editingProfile?.severe ?? false);
  const toggle = (id: AllergenId) => setSelected((prev) => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });
  const customAllergens = () => Array.from(new Set(
    customText
      .split(/[\n,;]+/)
      .map((x) => x.trim())
      .filter((x) => x.length >= 2)
  ));
  const submit = () => {
    const data = {
      id: editingProfile?.id,
      name: name.trim() || (adding ? t("Nuovo profilo") : editingProfile?.name || t("Ospite")),
      allergens: Array.from(selected),
      customAllergens: customAllergens(),
      severe,
    };
    if (adding) addProfile(data);
    else saveProfile(data);
    onCancel?.();
    navigate({ to: "/", replace: true });
  };
  const free = () => {
    enableFreeMode();
    onCancel?.();
    navigate({ to: "/", replace: true });
  };
  const isEditing = !!editingProfile;

  return <div className="mx-auto flex min-h-screen w-full max-w-md flex-col px-5 pb-10 pt-8">
    <div className="flex items-center gap-3"><div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-primary text-primary-foreground"><Salad className="h-6 w-6" /></div><div className="min-w-0"><h1 className="truncate text-2xl font-black text-foreground">{t("Safe Scan Eats")}</h1><p className="text-sm text-muted-foreground">{t("Mangia sereno, in un tocco.")}</p></div></div>
    <LanguageSelector />
    <h2 className="mt-8 text-xl font-extrabold text-foreground">{t(isEditing ? "Modifica profilo" : adding ? "Aggiungi un profilo" : "Ciao! Come ti chiami?")}</h2>
    <input value={name} onChange={(e) => setName(e.target.value)} placeholder={t("Nome del profilo")} className="mt-3 w-full rounded-2xl border border-input bg-card px-4 py-3.5 text-base text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" />

    <h2 className="mt-8 text-xl font-extrabold text-foreground">{t("Allergie e intolleranze alimentari")}</h2>
    <p className="mt-1 text-sm text-muted-foreground">{t("Seleziona ciò che deve essere controllato direttamente negli ingredienti.")}</p>
    <div className="mt-4 grid grid-cols-2 gap-3">{ALLERGENS.filter((a) => a.group !== "pollen").map((a) => {
      const active = selected.has(a.id);
      const Icon = a.icon;
      return <button key={a.id} type="button" onClick={() => toggle(a.id)} aria-pressed={active} className={`relative flex items-center gap-3 rounded-2xl border-2 p-4 text-left transition-colors ${active ? "border-primary bg-secondary" : "border-border bg-card"}`}><Icon className={`h-6 w-6 shrink-0 ${active ? "text-primary" : "text-muted-foreground"}`} /><span className="min-w-0 flex-1 text-sm font-bold leading-tight text-foreground">{t(a.label)}</span>{active && <span className="absolute -right-1.5 -top-1.5 grid h-6 w-6 place-items-center rounded-full bg-primary text-primary-foreground"><Check className="h-4 w-4" /></span>}</button>;
    })}</div>

    <h2 className="mt-8 text-xl font-extrabold text-foreground">{t("Pollini, piante e tisane")}</h2>
    <p className="mt-1 text-sm text-muted-foreground">{t("Queste voci generano solo avvisi di possibile reattività crociata quando esiste un collegamento specifico con un ingrediente.")}</p>
    <div className="mt-4 grid grid-cols-2 gap-3">{ALLERGENS.filter((a) => a.group === "pollen").map((a) => {
      const active = selected.has(a.id);
      const Icon = a.icon;
      return <button key={a.id} type="button" onClick={() => toggle(a.id)} aria-pressed={active} className={`relative flex items-center gap-3 rounded-2xl border-2 p-4 text-left transition-colors ${active ? "border-primary bg-secondary" : "border-border bg-card"}`}><Icon className={`h-6 w-6 shrink-0 ${active ? "text-primary" : "text-muted-foreground"}`} /><span className="min-w-0 flex-1 text-sm font-bold leading-tight text-foreground">{t(a.label)}</span>{active && <span className="absolute -right-1.5 -top-1.5 grid h-6 w-6 place-items-center rounded-full bg-primary text-primary-foreground"><Check className="h-4 w-4" /></span>}</button>;
    })}</div>

    <h2 className="mt-8 text-xl font-extrabold text-foreground">{t("Allergie specifiche dichiarate")}</h2>
    <p className="mt-1 text-sm text-muted-foreground">{t("Scrivi solo sostanze o piante che sai di dover evitare, per esempio “menta” o “echinacea”. Separale con una virgola. L’app le confronterà direttamente con gli ingredienti senza considerarle una diagnosi.")}</p>
    <textarea value={customText} onChange={(e) => setCustomText(e.target.value)} rows={3} placeholder={t("Es. menta, echinacea")} className="mt-3 w-full resize-none rounded-2xl border border-input bg-card px-4 py-3.5 text-base text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" />

    <button type="button" onClick={() => setSevere(!severe)} aria-pressed={severe} className={`mt-5 flex items-center gap-3 rounded-2xl border-2 p-4 text-left transition-colors ${severe ? "border-danger bg-danger-soft" : "border-border bg-card"}`}><TriangleAlert className={`h-6 w-6 shrink-0 ${severe ? "text-danger" : "text-muted-foreground"}`} /><span className="min-w-0 flex-1 text-sm leading-snug text-foreground"><strong>{t("Allergie gravi.")}</strong> {t(" L'app ricorderà di controllare sempre l'etichetta.")}</span>{severe && <Check className="h-5 w-5 shrink-0 text-danger" />}</button>
    <button type="button" disabled={selected.size === 0 && customAllergens().length === 0} onClick={submit} className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-4 text-lg font-extrabold text-primary-foreground transition-opacity disabled:opacity-40">{t("Salva profilo")}<ChevronRight className="h-5 w-5" /></button>
    {!adding && !isEditing && <button type="button" onClick={free} className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-primary bg-card py-3.5 text-base font-extrabold text-primary"><User className="h-5 w-5" />{t("Continua in modalità libera")}</button>}
    {(adding || isEditing) && onCancel && <button type="button" onClick={onCancel} className="mt-3 py-3 text-sm font-bold text-muted-foreground">{t("Annulla")}</button>}
    <div className="mt-6"><Disclaimer /></div>
  </div>;
}

function Home({ onAddProfile, onEditProfile }: { onAddProfile: () => void; onEditProfile: () => void }) {
  const { t } = useAppLanguage();

  const profile = useProfile();
  const state = useProfilesState();
  const shopping = useShoppingList();
  const freeMode = state.freeMode;

  const deleteActiveProfile = () => {
    if (!profile) return;
    const ok = window.confirm(t(`Vuoi eliminare il profilo “${profile.name}”? Questa operazione non può essere annullata.`));
    if (ok) removeProfile(profile.id);
  };

  return <div className="mx-auto flex min-h-screen w-full max-w-md flex-col px-5 pb-10 pt-8">
    <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3"><div className="flex min-w-0 items-center gap-3"><div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-primary text-primary-foreground"><Salad className="h-5 w-5" /></div><div className="min-w-0"><p className="text-xs font-semibold text-muted-foreground">{t(freeMode ? "Modalità" : "Ciao,")}</p><h1 className="truncate text-xl font-black text-foreground">{t(freeMode ? "Libera" : profile?.name ?? "Profilo")}</h1></div></div><Link to="/history" className="flex shrink-0 items-center gap-1.5 rounded-full bg-secondary px-3.5 py-2 text-sm font-bold text-secondary-foreground"><History className="h-4 w-4" />{t("Cronologia")}</Link></header>

    <LanguageSelector />
    <section className="mt-5 rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center justify-between gap-3"><div className="flex items-center gap-2"><Users className="h-4 w-4 text-primary" /><p className="text-sm font-extrabold text-foreground">{t("Profili")}</p></div><button type="button" onClick={onAddProfile} className="flex items-center gap-1 text-xs font-extrabold text-primary"><Plus className="h-4 w-4" />{t("Aggiungi")}</button></div>
      <div className="mt-3 flex flex-wrap gap-2">
        {state.profiles.map((p) => <button key={p.id} type="button" onClick={() => setActiveProfile(p.id)} className={`rounded-full px-3 py-2 text-xs font-extrabold ${!freeMode && p.id === state.activeProfileId ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}>{p.name}</button>)}
        <button type="button" onClick={enableFreeMode} className={`rounded-full px-3 py-2 text-xs font-extrabold ${freeMode ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}>{t("Modalità libera")}</button>
      </div>
      {freeMode ? <p className="mt-3 text-xs leading-relaxed text-muted-foreground">{t("Nessun filtro personale: l'app mostra le informazioni del prodotto e gli allergeni rilevati senza giudicarli rispetto a un profilo.")}</p> : <>
        <div className="mt-3 flex flex-wrap items-center gap-2"><span className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground"><User className="h-3.5 w-3.5" />{t("Evita:")}</span>{profile?.allergens.filter((id) => ALLERGENS.find((x) => x.id === id)?.group !== "pollen").map((id) => { const a = ALLERGENS.find((x) => x.id === id); return a ? <span key={id} className="rounded-full bg-secondary px-3 py-1 text-xs font-bold text-secondary-foreground">{t(a.label)}</span> : null; })}</div>
        {!!profile?.allergens.some((id) => ALLERGENS.find((x) => x.id === id)?.group === "pollen") && <div className="mt-2 flex flex-wrap items-center gap-2"><span className="text-xs font-semibold text-muted-foreground">{t("Pollini/piante:")}</span>{profile.allergens.filter((id) => ALLERGENS.find((x) => x.id === id)?.group === "pollen").map((id) => { const a = ALLERGENS.find((x) => x.id === id); return a ? <span key={id} className="rounded-full bg-caution-soft px-3 py-1 text-xs font-bold text-caution-foreground">{t(a.label)}</span> : null; })}</div>}
        {!!profile?.customAllergens?.length && <div className="mt-2 flex flex-wrap items-center gap-2"><span className="text-xs font-semibold text-muted-foreground">{t("Dichiarate da te:")}</span>{profile.customAllergens.map((name) => <span key={name} className="rounded-full bg-danger-soft px-3 py-1 text-xs font-bold text-danger">{name}</span>)}</div>}
        {profile && <div className="mt-4 flex flex-wrap gap-4"><button type="button" onClick={onEditProfile} className="text-xs font-extrabold text-primary">{t("Modifica profilo")}</button><button type="button" onClick={deleteActiveProfile} className="flex items-center gap-1.5 text-xs font-extrabold text-danger"><Trash2 className="h-4 w-4" />{t("Elimina profilo “")}{profile.name}{t("”")}</button></div>}
      </>}
    </section>

    <p className="mt-8 text-center text-lg font-bold text-foreground">{t("Cosa vuoi controllare?")}</p>
    <div className="mt-4 flex flex-col gap-4"><Link to="/scan" search={{ mode: "barcode" }} className="flex items-center gap-4 rounded-3xl bg-primary p-6 text-primary-foreground shadow-lg transition-transform active:scale-[0.98]"><div className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-primary-foreground/20"><Barcode className="h-9 w-9" /></div><div className="min-w-0"><p className="text-xl font-extrabold leading-tight">{t("Scansiona codice a barre")}</p><p className="mt-1 text-sm opacity-90">{t("Inquadra il codice sul prodotto")}</p></div></Link>
    <Link to="/ingredients" search={{}} className="flex items-center gap-4 rounded-3xl border-2 border-primary bg-card p-6 text-foreground transition-transform active:scale-[0.98]"><div className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-secondary"><Camera className="h-9 w-9 text-primary" /></div><div className="min-w-0"><p className="text-xl font-extrabold leading-tight">{t("Fotografa ingredienti")}</p><p className="mt-1 text-sm text-muted-foreground">{t("Scatta una foto alla lista ingredienti")}</p></div></Link>
    <Link to="/crs" className="flex items-center gap-4 rounded-3xl border-2 border-border bg-card p-6 text-foreground transition-transform active:scale-[0.98]"><div className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-secondary"><CreditCard className="h-9 w-9 text-primary" /></div><div className="min-w-0 flex-1"><p className="text-xl font-extrabold leading-tight">{t("CRS · Celiachia")}</p><p className="mt-1 text-sm text-muted-foreground">{t("Tessera Sanitaria, budget e negozi convenzionati")}</p></div><CreditCard className="h-5 w-5 text-muted-foreground" /></Link><Link to="/recipes" className="flex items-center gap-4 rounded-3xl border-2 border-border bg-card p-6 text-foreground transition-transform active:scale-[0.98]"><div className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-secondary"><ChefHat className="h-9 w-9 text-primary" /></div><div className="min-w-0 flex-1"><p className="text-xl font-extrabold leading-tight">{t("Ricette")}</p><p className="mt-1 text-sm text-muted-foreground">{t("Scegli cosa cucinare e aggiungi gli ingredienti")}</p></div><ChefHat className="h-5 w-5 text-muted-foreground" /></Link><Link to="/shopping" className="flex items-center gap-4 rounded-3xl border-2 border-border bg-card p-6 text-foreground transition-transform active:scale-[0.98]"><div className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-secondary"><ShoppingCart className="h-9 w-9 text-primary" /></div><div className="min-w-0 flex-1"><p className="text-xl font-extrabold leading-tight">{t("Lista della spesa")}</p><p className="mt-1 text-sm text-muted-foreground">{shopping.filter((item) => !item.checked).length} {t(" prodotti da comprare · aggiungi e modifica a mano")}</p></div><ShoppingCart className="h-5 w-5 text-muted-foreground" /></Link></div>
    <div className="mt-auto pt-8"><Disclaimer /></div>
  </div>;
}

function Index() {
  const { t } = useAppLanguage();

  const state = useProfilesState();
  const profile = useProfile();
  const [formMode, setFormMode] = useState<"home" | "add" | "edit">("home");

  if (formMode === "add") return <ProfileForm adding onCancel={() => setFormMode("home")} />;
  if (formMode === "edit" && profile) return <ProfileForm editingProfile={profile} onCancel={() => setFormMode("home")} />;
  if (state.profiles.length === 0 && !state.freeMode) return <ProfileForm />;
  return <Home onAddProfile={() => setFormMode("add")} onEditProfile={() => setFormMode("edit")} />;
}
