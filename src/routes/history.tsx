import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, CheckCircle2, CircleX, History, Package, Trash2, TriangleAlert } from "lucide-react";
import type { Verdict } from "@/lib/verdict";
import { VERDICT_LABEL } from "@/lib/verdict";
import { clearHistory, useHistory } from "@/lib/store";

export const Route = createFileRoute("/history")({ head: () => ({ meta: [{ title: "Cronologia — SafeFood Scan" }, { name: "description", content: "I prodotti che hai analizzato di recente." }] }), component: HistoryPage });
const ICONS: Record<Verdict, { Icon: typeof CheckCircle2; cls: string }> = { compatible: { Icon: CheckCircle2, cls: "text-safe" }, warning: { Icon: TriangleAlert, cls: "text-caution-foreground" }, avoid: { Icon: CircleX, cls: "text-danger" } };

function HistoryPage() {
  const history = useHistory();
  return <div className="mx-auto flex min-h-screen w-full max-w-md flex-col px-5 pb-10 pt-6">
    <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3"><div className="flex min-w-0 items-center gap-3"><Link to="/" aria-label="Torna alla home" className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-secondary text-secondary-foreground"><ArrowLeft className="h-5 w-5" /></Link><h1 className="truncate text-lg font-extrabold text-foreground">Cronologia</h1></div>{history.length > 0 && <button type="button" onClick={clearHistory} className="flex shrink-0 items-center gap-1.5 rounded-full bg-secondary px-3 py-2 text-xs font-bold text-secondary-foreground"><Trash2 className="h-3.5 w-3.5" />Svuota</button>}</header>
    {history.length === 0 ? <div className="flex flex-1 flex-col items-center justify-center text-center"><History className="h-14 w-14 text-muted-foreground/50" /><p className="mt-4 text-base font-bold text-foreground">Nessun prodotto analizzato</p><p className="mt-1 text-sm text-muted-foreground">Le tue scansioni appariranno qui.</p><Link to="/scan" search={{ mode: "barcode" }} className="mt-6 rounded-2xl bg-primary px-6 py-3.5 text-base font-extrabold text-primary-foreground">Scansiona ora</Link></div> : <div className="mt-5 flex flex-col gap-2">{history.map((entry, i) => {
      if (!entry.name) return null; const { Icon, cls } = ICONS[entry.verdict]; const date = new Date(entry.date); const cardCls = "flex items-center gap-3 rounded-2xl border border-border bg-card p-3.5 transition-colors active:bg-secondary"; const key = `${entry.code ?? "m"}-${entry.date}-${i}`;
      const inner = <>{entry.imageUrl ? <img src={entry.imageUrl} alt="" className="h-10 w-10 shrink-0 rounded-xl object-contain" /> : <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-secondary"><Package className="h-5 w-5 text-primary" /></div>}<div className="min-w-0 flex-1"><p className="truncate text-sm font-bold text-foreground">{entry.name}</p><p className="text-xs text-muted-foreground">{date.toLocaleDateString("it-IT", { day: "numeric", month: "short" })} · {date.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })}</p></div><span className={`flex shrink-0 items-center gap-1 text-xs font-extrabold ${cls}`}><Icon className="h-4 w-4" />{VERDICT_LABEL[entry.verdict]}</span></>;
      return entry.source === "off" && entry.code ? <Link key={key} to="/product/$code" params={{ code: entry.code }} className={cardCls}>{inner}</Link> : <Link key={key} to="/analysis" search={{ text: entry.text ?? "", code: entry.code, name: entry.name }} className={cardCls}>{inner}</Link>;
    })}</div>}
  </div>;
}