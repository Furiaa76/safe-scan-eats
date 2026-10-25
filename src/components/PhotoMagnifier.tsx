import { useEffect, useRef, useState, type PointerEvent } from "react";
import { Search, X, ZoomIn, ZoomOut, RotateCcw } from "lucide-react";
import { useAppLanguage } from "@/lib/language";

type View = { scale: number; x: number; y: number };
const initial: View = { scale: 1, x: 0, y: 0 };

/** Inspect the captured image locally; zoom never changes the photo sent for OCR. */
export function PhotoMagnifier({ src }: { src: string }) {
  const { language } = useAppLanguage();
  const text = (it: string, en: string) => language === "en" ? en : it;
  const dialog = useRef<HTMLDialogElement>(null);
  const viewport = useRef<HTMLDivElement>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const viewRef = useRef<View>(initial);
  const [view, setView] = useState<View>(initial);
  const [open, setOpen] = useState(false);
  const [failed, setFailed] = useState(false);
  const titleId = "photo-magnifier-title";

  const update = (next: View) => {
    const scale = Math.max(1, Math.min(8, next.scale));
    const box = viewport.current?.getBoundingClientRect();
    const maxX = (box?.width ?? 0) * (scale - 1) / 2;
    const maxY = (box?.height ?? 0) * (scale - 1) / 2;
    const value = { scale, x: Math.max(-maxX, Math.min(maxX, next.x)), y: Math.max(-maxY, Math.min(maxY, next.y)) };
    viewRef.current = value;
    setView(value);
  };
  const zoom = (factor: number) => {
    const previous = viewRef.current;
    const scale = Math.max(1, Math.min(8, previous.scale * factor));
    update({ scale, x: previous.x * scale / previous.scale, y: previous.y * scale / previous.scale });
  };

  useEffect(() => {
    if (!open) return;
    const element = dialog.current;
    element?.showModal();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onResize = () => { viewRef.current = initial; setView(initial); pointers.current.clear(); };
    window.addEventListener("resize", onResize);
    return () => {
      element?.close();
      document.body.style.overflow = overflow;
      window.removeEventListener("resize", onResize);
      pointers.current.clear();
    };
  }, [open]);

  const move = (event: PointerEvent<HTMLDivElement>) => {
    const previousPoint = pointers.current.get(event.pointerId);
    if (!previousPoint) return;
    const before = [...pointers.current.values()];
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    const after = [...pointers.current.values()];
    const current = viewRef.current;
    if (before.length < 2) {
      update({ ...current, x: current.x + event.clientX - previousPoint.x, y: current.y + event.clientY - previousPoint.y });
      return;
    }
    const [oldFirst, oldSecond] = before;
    const [newFirst, newSecond] = after;
    if (!oldFirst || !oldSecond || !newFirst || !newSecond) return;
    const oldDistance = Math.hypot(oldSecond.x - oldFirst.x, oldSecond.y - oldFirst.y);
    if (oldDistance < 1) return;
    const newDistance = Math.hypot(newSecond.x - newFirst.x, newSecond.y - newFirst.y);
    const scale = Math.max(1, Math.min(8, current.scale * newDistance / oldDistance));
    const ratio = scale / current.scale;
    const box = event.currentTarget.getBoundingClientRect();
    const centerX = box.left + box.width / 2;
    const centerY = box.top + box.height / 2;
    const oldX = (oldFirst.x + oldSecond.x) / 2 - centerX;
    const oldY = (oldFirst.y + oldSecond.y) / 2 - centerY;
    const newX = (newFirst.x + newSecond.x) / 2 - centerX;
    const newY = (newFirst.y + newSecond.y) / 2 - centerY;
    update({ scale, x: newX - (oldX - current.x) * ratio, y: newY - (oldY - current.y) * ratio });
  };

  return <>
    <button type="button" onClick={() => { viewRef.current = initial; setView(initial); setFailed(false); setOpen(true); }} className="mt-3 flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border-2 border-primary px-4 py-3 font-extrabold text-primary">
      <Search className="h-5 w-5" />{text("Lente ingredienti · Ingrandisci foto", "Ingredient magnifier · Enlarge photo")}
    </button>
    {open && <dialog ref={dialog} aria-labelledby={titleId} onCancel={() => setOpen(false)} onClose={() => setOpen(false)} className="fixed inset-0 m-0 h-[100dvh] max-h-none w-screen max-w-none flex-col border-0 bg-black p-0 text-white backdrop:bg-black open:flex">
      <header className="flex shrink-0 items-center justify-between gap-3 px-4 pb-3 pt-[max(env(safe-area-inset-top),1rem)]">
        <h2 id={titleId} className="font-extrabold">{text("Lente ingredienti", "Ingredient magnifier")}</h2>
        <button autoFocus type="button" onClick={() => setOpen(false)} aria-label={text("Chiudi lente", "Close magnifier")} className="grid h-12 w-12 place-items-center rounded-full bg-white/20"><X /></button>
      </header>
      <p className="px-4 pb-3 text-center text-sm">{text("Allarga due dita per ingrandire. Trascina per leggere tutta l’etichetta.", "Spread two fingers to zoom. Drag to read the entire label.")}</p>
      <div ref={viewport} className="relative min-h-0 flex-1 overflow-hidden" style={{ touchAction: "none" }}
        onPointerDown={(event) => { if (event.pointerType === "mouse" && event.button !== 0) return; event.currentTarget.setPointerCapture(event.pointerId); pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY }); }}
        onPointerMove={move}
        onPointerUp={(event) => pointers.current.delete(event.pointerId)}
        onPointerCancel={(event) => pointers.current.delete(event.pointerId)}
        onLostPointerCapture={(event) => pointers.current.delete(event.pointerId)}
        onDoubleClick={() => viewRef.current.scale > 1 ? update(initial) : zoom(2)}>
        <img src={src} alt={text("Foto dell’etichetta ingredienti", "Ingredient label photo")} draggable={false} onError={() => setFailed(true)} className="h-full w-full select-none object-contain" style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})`, transformOrigin: "center", cursor: view.scale > 1 ? "grab" : "zoom-in" }} />
        {failed && <p role="alert" className="absolute inset-0 grid place-items-center bg-black p-6 text-center">{text("Impossibile aprire la foto. Chiudi la lente e scatta una nuova foto.", "Unable to open photo. Close the magnifier and take another photo.")}</p>}
      </div>
      <footer className="flex shrink-0 flex-wrap items-center justify-center gap-3 px-4 pt-4 pb-[max(env(safe-area-inset-bottom),1rem)]">
        <button type="button" disabled={view.scale <= 1} onClick={() => zoom(1 / 1.5)} aria-label={text("Riduci foto", "Zoom out")} className="grid h-12 w-12 place-items-center rounded-full bg-white/20 disabled:opacity-40"><ZoomOut /></button>
        <output className="min-w-14 text-center font-bold">{view.scale.toFixed(1)}×</output>
        <button type="button" disabled={view.scale >= 8} onClick={() => zoom(1.5)} aria-label={text("Ingrandisci foto", "Zoom in")} className="grid h-12 w-12 place-items-center rounded-full bg-white/20 disabled:opacity-40"><ZoomIn /></button>
        <button type="button" onClick={() => update(initial)} className="flex min-h-12 items-center gap-2 rounded-full bg-white/20 px-4"><RotateCcw className="h-5 w-5" />{text("Ripristina", "Reset")}</button>
      </footer>
    </dialog>}
  </>;
}
