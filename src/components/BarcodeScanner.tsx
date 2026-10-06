import { useAppLanguage } from "@/lib/language";
import { useEffect, useRef, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { Camera, CameraOff, Loader2, X } from "lucide-react";

type Controls = { stop: () => void };

type Props = {
  onDetected: (code: string) => void;
  onClose: () => void;
};

function errorMessage(err: unknown): string {
  const name = (err as { name?: string })?.name ?? "";
  if (name === "NotAllowedError" || name === "SecurityError")
    return "Accesso alla fotocamera negato. Consenti l'uso della fotocamera nelle impostazioni del browser o del dispositivo e riprova.";
  if (name === "NotFoundError" || name === "OverconstrainedError" || name === "DevicesNotFoundError")
    return "Nessuna fotocamera compatibile trovata su questo dispositivo.";
  if (name === "NotReadableError" || name === "TrackStartError" || name === "AbortError")
    return "La fotocamera è già in uso da un'altra app o scheda. Chiudila e riprova.";
  if (name === "Unsupported")
    return "Questo browser non supporta la fotocamera dal vivo. Usa un browser aggiornato oppure scatta una foto del codice.";
  return "Impossibile avviare la fotocamera. Puoi comunque scattare una foto del codice.";
}

async function makeReader() {
  const [{ BrowserMultiFormatReader }, { BarcodeFormat, DecodeHintType }] = await Promise.all([
    import("@zxing/browser"),
    import("@zxing/library"),
  ]);
  const hints = new Map();
  hints.set(DecodeHintType.POSSIBLE_FORMATS, [
    BarcodeFormat.EAN_13,
    BarcodeFormat.EAN_8,
    BarcodeFormat.UPC_A,
    BarcodeFormat.UPC_E,
  ]);
  hints.set(DecodeHintType.TRY_HARDER, true);
  return new BrowserMultiFormatReader(hints, { delayBetweenScanAttempts: 150 });
}

export function BarcodeScanner({ onDetected, onClose }: Props) {
  const { t } = useAppLanguage();

  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<Controls | null>(null);
  const doneRef = useRef(false);
  const [status, setStatus] = useState<"starting" | "live" | "error" | "decoding">("starting");
  const [error, setError] = useState<string | null>(null);
  const [restartKey, setRestartKey] = useState(0);

  const stopCamera = () => {
    controlsRef.current?.stop();
    controlsRef.current = null;
    const v = videoRef.current;
    const stream = v?.srcObject as MediaStream | null;
    stream?.getTracks().forEach((t) => t.stop());
    if (v) v.srcObject = null;
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setStatus("starting");
        setError(null);

        if (Capacitor.isNativePlatform()) {
          const {
            CapacitorBarcodeScanner,
            CapacitorBarcodeScannerTypeHint,
            CapacitorBarcodeScannerCameraDirection,
          } = await import("@capacitor/barcode-scanner");

          const result = await CapacitorBarcodeScanner.scanBarcode({
            hint: CapacitorBarcodeScannerTypeHint.ALL,
            cameraDirection: CapacitorBarcodeScannerCameraDirection.BACK,
            scanInstructions: "Inquadra il codice a barre del prodotto",
            scanButton: true,
            scanText: "Scansiona",
          });

          if (cancelled) return;
          const code = result.ScanResult?.trim();
          if (!code) {
            setError("Nessun codice rilevato. Riprova inquadrando bene il codice a barre.");
            setStatus("error");
            return;
          }
          doneRef.current = true;
          navigator.vibrate?.(80);
          onDetected(code);
          return;
        }

        if (!navigator.mediaDevices?.getUserMedia || !window.isSecureContext) {
          throw Object.assign(new Error("unsupported"), { name: "Unsupported" });
        }

        const reader = await makeReader();
        if (cancelled || !videoRef.current || document.visibilityState === "hidden") return;
        const controls = await reader.decodeFromConstraints(
          {
            audio: false,
            video: {
              facingMode: { ideal: "environment" },
              width: { ideal: 1280 },
              height: { ideal: 720 },
            },
          },
          videoRef.current,
          (result) => {
            if (!result || doneRef.current) return;
            doneRef.current = true;
            stopCamera();
            navigator.vibrate?.(80);
            onDetected(result.getText());
          },
        );
        if (cancelled) {
          controls.stop();
          return;
        }
        controlsRef.current = controls;
        setStatus("live");
      } catch (e) {
        if (cancelled) return;
        stopCamera();
        setError(errorMessage(e));
        setStatus("error");
      }
    })();

    return () => {
      cancelled = true;
      stopCamera();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restartKey]);

  useEffect(() => {
    if (Capacitor.isNativePlatform()) return;

    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        stopCamera();
        return;
      }
      if (!doneRef.current) setRestartKey((k) => k + 1);
    };
    const onPageHide = () => stopCamera();
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", onPageHide);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", onPageHide);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onPhoto = async (file: File | undefined) => {
    if (!file) return;
    stopCamera();
    setStatus("decoding");
    setError(null);
    const url = URL.createObjectURL(file);
    try {
      const reader = await makeReader();
      const result = await reader.decodeFromImageUrl(url);
      doneRef.current = true;
      onDetected(result.getText());
    } catch {
      setError("Non riesco a leggere il codice nella foto. Avvicinati, evita riflessi e riprova.");
      setStatus("error");
    } finally {
      URL.revokeObjectURL(url);
    }
  };

  const close = () => {
    stopCamera();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex h-[100dvh] min-h-0 flex-col overflow-hidden bg-foreground" role="dialog" aria-modal="true" aria-label={t("Scanner codice a barre")}>
      <div className="flex shrink-0 items-center justify-between px-5 pb-3 pt-[max(env(safe-area-inset-top),1rem)] landscape:pb-2 landscape:pt-[max(env(safe-area-inset-top),0.5rem)]">
        <p className="text-base font-extrabold text-primary-foreground">{t("Scansiona codice a barre")}</p>
        <button type="button" onClick={close} aria-label={t("Chiudi scanner")} className="grid h-10 w-10 place-items-center rounded-full bg-primary-foreground/15 text-primary-foreground">
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="relative mx-4 min-h-0 flex-1 overflow-hidden rounded-3xl bg-foreground">
        <video ref={videoRef} className="absolute inset-0 h-full w-full object-cover" playsInline muted autoPlay />
        {status === "live" && (
          <div className="pointer-events-none absolute inset-0 grid place-items-center">
            <div className="relative h-40 max-h-[35vh] w-[80%] max-w-2xl rounded-2xl border-4 border-primary-foreground/90 shadow-[0_0_0_9999px_rgba(0,0,0,0.45)] landscape:h-28 landscape:w-[65%]">
              <div className="absolute inset-x-3 top-1/2 h-0.5 animate-pulse bg-destructive" />
            </div>
          </div>
        )}
        {(status === "starting" || status === "decoding") && (
          <div className="absolute inset-0 grid place-items-center text-center">
            <div>
              <Loader2 className="mx-auto h-10 w-10 animate-spin text-primary-foreground" />
              <p className="mt-3 text-sm font-bold text-primary-foreground">{t(status === "starting" ? "Avvio fotocamera…" : "Leggo il codice…")}</p>
            </div>
          </div>
        )}
        {status === "error" && (
          <div className="absolute inset-0 grid place-items-center overflow-y-auto p-6 text-center">
            <div>
              <CameraOff className="mx-auto h-12 w-12 text-primary-foreground/80" />
              <p className="mt-4 text-sm font-semibold leading-relaxed text-primary-foreground">{t(error)}</p>
            </div>
          </div>
        )}
      </div>

      <div className="shrink-0 px-5 pb-[max(env(safe-area-inset-bottom),1.25rem)] pt-4 landscape:pb-[max(env(safe-area-inset-bottom),0.5rem)] landscape:pt-2">
        {status === "live" && <p className="mb-3 text-center text-sm font-semibold text-primary-foreground/80 landscape:mb-2">{t("Inquadra il codice a barre dentro il riquadro")}</p>}
        <label className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl bg-primary py-4 text-base font-extrabold text-primary-foreground landscape:py-3">
          <Camera className="h-5 w-5" />
          {t("Scatta foto del codice")}<input type="file" accept="image/*" capture="environment" className="sr-only" onChange={(e) => { void onPhoto(e.target.files?.[0]); e.target.value = ""; }} />
        </label>
      </div>
    </div>
  );
}
