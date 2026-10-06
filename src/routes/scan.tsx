import { useAppLanguage } from "@/lib/language";
import { createFileRoute, Link, Navigate, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Barcode, Camera, Search } from "lucide-react";
import { BarcodeScanner } from "@/components/BarcodeScanner";

type ScanSearch = { mode?: "barcode" | "photo" };

export const Route = createFileRoute("/scan")({
  validateSearch: (search: Record<string, unknown>): ScanSearch => ({
    mode: search["mode"] === "photo" ? "photo" : "barcode",
  }),
  head: () => ({
    meta: [
      { title: "Scansiona codice a barre — SafeFood Scan" },
      { name: "description", content: "Scansiona il codice a barre di un prodotto con la fotocamera." },
    ],
  }),
  component: ScanPage,
});

function ScanPage() {
  const { t } = useAppLanguage();

  const { mode } = Route.useSearch();
  const navigate = useNavigate();
  const [scannerOpen, setScannerOpen] = useState(false);
  const [manual, setManual] = useState("");
  if (mode === "photo") return <Navigate to="/ingredients" search={{}} replace />;
  const goTo = (code: string) => { setScannerOpen(false); navigate({ to: "/product/$code", params: { code } }); };
  const manualValid = /^\d{8,14}$/.test(manual.trim());
  return <div className="mx-auto flex min-h-screen w-full max-w-md flex-col px-5 pb-10 pt-6">
    {scannerOpen && <BarcodeScanner onDetected={goTo} onClose={() => setScannerOpen(false)} />}
    <header className="flex items-center gap-3"><Link to="/" aria-label={t("Torna alla home")} className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-secondary text-secondary-foreground"><ArrowLeft className="h-5 w-5" /></Link><h1 className="truncate text-lg font-extrabold text-foreground">{t("Scansiona codice a barre")}</h1></header>
    <button type="button" onClick={() => setScannerOpen(true)} className="relative mt-6 flex aspect-[4/5] flex-col items-center justify-center overflow-hidden rounded-3xl bg-foreground"><div className="absolute inset-6 rounded-2xl border-2 border-dashed border-primary-foreground/40" /><Barcode className="h-14 w-14 text-primary-foreground/80" /><p className="mt-4 max-w-[220px] text-center text-sm font-semibold text-primary-foreground/80">{t("Tocca per aprire la fotocamera e inquadrare il codice")}</p></button>
    <button type="button" onClick={() => setScannerOpen(true)} className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-4 text-lg font-extrabold text-primary-foreground"><Camera className="h-5 w-5" />{t("Apri fotocamera")}</button>
    <form className="mt-6" onSubmit={(e) => { e.preventDefault(); if (manualValid) goTo(manual.trim()); }}><label htmlFor="manual" className="text-sm font-extrabold text-foreground">{t("Oppure scrivi il numero sotto il codice")}</label><div className="mt-2 flex gap-2"><input id="manual" inputMode="numeric" value={manual} onChange={(e) => setManual(e.target.value.replace(/\D/g, ""))} placeholder={t("Es. 8001234567890")} className="min-w-0 flex-1 rounded-2xl border border-border bg-card px-4 py-3.5 font-mono text-base text-foreground outline-none focus:border-primary" /><button type="submit" disabled={!manualValid} className="shrink-0 rounded-2xl bg-secondary px-5 font-extrabold text-secondary-foreground disabled:opacity-50">{t("Vai")}</button></div></form>
    <Link to="/search" search={{ q: "" }} className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-primary py-3.5 text-base font-extrabold text-primary"><Search className="h-5 w-5" />{t("Cerca per nome o marca")}</Link>
  </div>;
}
