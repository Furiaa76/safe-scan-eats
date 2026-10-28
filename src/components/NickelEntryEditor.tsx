import { useEffect, useId, useRef, useState } from "react";
import { X } from "lucide-react";
import { NICKEL_DICTIONARY, normalizeNickelTerm, splitNickelAliases, type NickelEntry } from "@/lib/nickel";
import { saveNickelEntry } from "@/lib/store";

export type NickelEntryDraft = Partial<NickelEntry> & { kind: NickelEntry["kind"] };

export function NickelEntryEditor({ profileId, initial, onClose }: { profileId: string; initial: NickelEntryDraft; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const firstInput = useRef<HTMLInputElement>(null);
  const prefix = useId();
  const [kind, setKind] = useState(initial.kind);
  const [name, setName] = useState(initial.name ?? "");
  const [aliases, setAliases] = useState((initial.aliases ?? []).join("\n"));
  const [code, setCode] = useState(initial.code ?? "");
  const [note, setNote] = useState(initial.note ?? "");
  const [error, setError] = useState("");
  const words = splitNickelAliases(aliases);
  const suggestion = kind === "ingredient" ? NICKEL_DICTIONARY.find((x) => x.lookup.some((term) => normalizeNickelTerm(term) === normalizeNickelTerm(name))) : undefined;

  useEffect(() => { dialog.current?.showModal(); firstInput.current?.focus(); }, []);

  const save = () => {
    try {
      const id = initial.id ?? (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `nickel-${Date.now()}-${Math.random().toString(36).slice(2)}`);
      const entry: NickelEntry = { id, kind, name: name.trim(), aliases: kind === "ingredient" ? words.filter((x) => normalizeNickelTerm(x) !== normalizeNickelTerm(name)) : [], code: kind === "product" ? code.trim() : "", note: note.trim() };
      saveNickelEntry(profileId, entry);
      onClose();
    } catch (err) { setError(err instanceof Error ? err.message : "Non è stato possibile salvare la voce su questo dispositivo."); }
  };
  const inputClass = "mt-2 w-full rounded-xl border border-input bg-card px-3 py-3 text-base text-foreground outline-none focus:ring-2 focus:ring-primary";

  return <dialog ref={dialog} onCancel={onClose} aria-labelledby={`${prefix}-title`} className="m-auto max-h-[90dvh] w-[calc(100%_-_24px)] max-w-md overflow-y-auto rounded-3xl border border-border bg-background p-5 text-foreground shadow-xl backdrop:bg-black/40">
    <div className="flex items-center justify-between gap-3"><h2 id={`${prefix}-title`} className="text-xl font-extrabold">{initial.id ? "Modifica la tua voce" : "Aggiungi alla tua lista"}</h2><button type="button" onClick={onClose} aria-label="Chiudi" className="grid h-10 w-10 place-items-center rounded-full bg-secondary"><X className="h-5 w-5" /></button></div>
    <p className="mt-2 text-sm text-muted-foreground">La voce sarà usata subito nei controlli di questo profilo.</p>
    <div className="mt-4 grid grid-cols-2 gap-2">{([['ingredient', 'Alimento / ingrediente'], ['product', 'Prodotto specifico']] as const).map(([value, label]) => <button key={value} type="button" aria-pressed={kind === value} onClick={() => setKind(value)} className={`rounded-xl px-2 py-3 text-xs font-extrabold ${kind === value ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}>{label}</button>)}</div>
    <form onSubmit={(e) => { e.preventDefault(); save(); }}>
      <label htmlFor={`${prefix}-name`} className="mt-5 block text-sm font-bold">{kind === "product" ? "Nome del prodotto" : "Nome dell’alimento o ingrediente"}</label>
      <input ref={firstInput} id={`${prefix}-name`} required value={name} onChange={(e) => setName(e.target.value)} placeholder={kind === "product" ? "Es. i miei biscotti" : "Es. pomodoro"} className={inputClass} autoFocus />
      {kind === "ingredient" ? <>
        {suggestion ? <div className="mt-3 rounded-xl bg-secondary p-3"><p className="text-sm font-extrabold">Diciture suggerite per {suggestion.name}</p><p className="mt-1 text-xs leading-relaxed text-muted-foreground">Seleziona solo le diciture che vuoi includere. I derivati proposti non sono tutti sinonimi e non sono una lista medica.{suggestion.name === "Cioccolato" ? " Il cacao va aggiunto separatamente se vuoi evitarlo." : ""}</p><div className="mt-3 flex flex-wrap gap-2">{suggestion.aliases.map((term) => <label key={term} className="flex items-center gap-2 rounded-lg bg-card px-2 py-2 text-xs"><input type="checkbox" checked={words.includes(term)} onChange={(e) => setAliases((e.target.checked ? [...words, term] : words.filter((x) => x !== term)).join("\n"))} className="h-4 w-4 accent-primary" />{term}</label>)}</div></div> : name.trim() ? <p className="mt-3 rounded-xl bg-caution-soft p-3 text-xs leading-relaxed text-caution-foreground">Voce personale: puoi salvarla subito. Il controllo cercherà il nome e le diciture alternative che inserisci; altri nomi potrebbero non essere riconosciuti.</p> : null}
        <label htmlFor={`${prefix}-aliases`} className="mt-4 block text-sm font-bold">Altre diciture da cercare · facoltative</label><textarea id={`${prefix}-aliases`} value={aliases} onChange={(e) => setAliases(e.target.value)} placeholder="Una per riga, oppure separate da una virgola" rows={3} className={inputClass} />
      </> : <><label htmlFor={`${prefix}-code`} className="mt-4 block text-sm font-bold">Codice a barre del prodotto</label><input id={`${prefix}-code`} required inputMode="numeric" pattern="[0-9]{8}|[0-9]{12,14}" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} placeholder="8, 12, 13 o 14 cifre" className={inputClass} /><p className="mt-2 text-xs leading-relaxed text-muted-foreground">Il codice identifica questo prodotto, anche se i suoi ingredienti non sono disponibili.</p></>}
      <label htmlFor={`${prefix}-note`} className="mt-4 block text-sm font-bold">Nota personale · facoltativa</label><input id={`${prefix}-note`} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Es. indicazione del mio specialista" className={inputClass} />
      {error ? <p role="alert" className="mt-3 text-sm font-bold text-danger">{error}</p> : null}
      <div className="mt-6 grid grid-cols-2 gap-3"><button type="button" onClick={onClose} className="rounded-xl border border-border bg-card py-3 text-sm font-bold">Annulla</button><button type="submit" className="rounded-xl bg-primary px-2 py-3 text-sm font-extrabold text-primary-foreground">Salva nella mia lista</button></div>
    </form>
  </dialog>;
}
