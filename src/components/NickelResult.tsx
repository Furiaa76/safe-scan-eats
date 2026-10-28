import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { CheckCircle2, CircleX, Info, Plus, Camera, TriangleAlert } from "lucide-react";
import type { FoodProduct } from "@/lib/off";
import { assessNickel } from "@/lib/nickel";
import type { Profile } from "@/lib/store";
import { NickelEntryEditor, type NickelEntryDraft } from "./NickelEntryEditor";

export function NickelResult({ product, profile }: { product: FoodProduct; profile: Profile }) {
  const [draft, setDraft] = useState<NickelEntryDraft | null>(null);
  const assessment = assessNickel(product, profile.nickel);
  if (!assessment) return null;
  const { status, missing, matches } = assessment;
  const Icon = status === "avoid" ? CircleX : status === "clear" ? CheckCircle2 : status === "empty" ? Info : TriangleAlert;
  const color = status === "avoid" ? "bg-danger-soft text-danger" : status === "clear" ? "bg-safe-soft text-primary" : "bg-caution-soft text-caution-foreground";
  const title = status === "avoid" ? "Voce trovata nella tua lista" : status === "clear" ? "Nessuna corrispondenza con la tua lista personale" : status === "empty" ? "La tua lista personale è vuota" : "Controllo incompleto";
  return <section className="mt-5 rounded-2xl border border-border bg-card p-4" aria-label="Risultato lista personale Nichel">
    <p className="mb-3 text-xs font-extrabold uppercase tracking-wide text-muted-foreground">Nichel · lista personale di {profile.name}</p>
    <div className={`rounded-xl p-3.5 ${color}`} aria-live="polite"><div className="flex items-start gap-2"><Icon className="mt-0.5 h-6 w-6 shrink-0" /><h2 className="text-base font-extrabold">{title}</h2></div>
      {matches.length > 0 ? <ul className="mt-2 list-disc pl-6 text-sm leading-relaxed">{matches.map((x, i) => <li key={`${x.name}-${i}`}>{x.name} · {x.kind === "product" ? "codice a barre riconosciuto" : `trovata la dicitura “${x.term}”`}</li>)}</ul> : <p className="mt-2 text-sm leading-relaxed">{status === "empty" ? "Aggiungi gli alimenti, gli ingredienti e i prodotti che vuoi controllare." : status === "clear" ? "Il confronto riguarda solo ciò che hai inserito tu. Non indica che il prodotto sia senza nichel." : missing === "code" ? "Scansiona il codice a barre per controllare anche i prodotti specifici della tua lista." : missing === "language" ? "Verifica il testo originale: la lingua degli ingredienti non è supportata dal controllo. Puoi fotografare o trascrivere l’etichetta." : "Gli ingredienti del prodotto non sono disponibili. Fotografa l’etichetta per completare il controllo."}</p>}
    </div>
    {status === "incomplete" && missing !== "code" ? <Link to="/ingredients" search={{ mode: "label", ...(product.code ? { code: product.code } : {}), name: product.name, brand: product.brand }} className="mt-3 flex items-center justify-center gap-2 rounded-xl bg-primary px-3 py-3 text-sm font-extrabold text-primary-foreground"><Camera className="h-4 w-4" />Fotografa l’etichetta</Link> : status === "incomplete" ? <Link to="/scan" search={{ mode: "barcode" }} className="mt-3 block rounded-xl bg-primary px-3 py-3 text-center text-sm font-extrabold text-primary-foreground">Scansiona codice a barre</Link> : null}
    <div className="mt-3 grid grid-cols-2 gap-2"><button type="button" onClick={() => setDraft({ kind: "ingredient" })} className="flex items-center justify-center gap-1 rounded-xl bg-secondary px-2 py-3 text-xs font-extrabold text-secondary-foreground"><Plus className="h-4 w-4" />Aggiungi ingrediente</button><button type="button" disabled={!product.code} onClick={() => setDraft({ kind: "product", name: product.name, code: product.code })} className="rounded-xl bg-secondary px-2 py-3 text-xs font-extrabold text-secondary-foreground disabled:opacity-50">Aggiungi questo prodotto</button></div>
    {!product.code ? <p className="mt-2 text-xs text-muted-foreground">Per salvare un prodotto specifico serve il suo codice a barre.</p> : null}
    {product.ingredientsText ? <details className="mt-3"><summary className="cursor-pointer text-xs font-bold text-primary">Scegli un ingrediente dall’etichetta</summary><div className="mt-2 flex max-h-48 flex-wrap gap-2 overflow-y-auto">{Array.from(new Set(product.ingredientsText.split(/[,;\n]+/).map((x) => x.trim()).filter(Boolean))).map((term, i) => <button type="button" key={`${term}-${i}`} onClick={() => setDraft({ kind: "ingredient", name: term.replace(/\d+(?:[.,]\d+)?\s*%/g, "").replace(/^ingredienti\s*:?\s*/i, "").trim() })} className="rounded-lg border border-border px-2 py-2 text-left text-xs">{term}</button>)}</div><p className="mt-2 text-xs text-muted-foreground">Controlla e modifica il nome prima di salvarlo; rimuovi percentuali e parti che non vuoi cercare.</p></details> : null}
    <Link to="/nichel" className="mt-3 inline-block text-xs font-extrabold text-primary underline">Gestisci la mia lista</Link>
    {draft ? <NickelEntryEditor key={`${profile.id}-${draft.kind}-${draft.name ?? ""}`} profileId={profile.id} initial={draft} onClose={() => setDraft(null)} /> : null}
  </section>;
}
