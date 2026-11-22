import { useState } from "react";
import { LocateFixed, MapPin } from "lucide-react";
import { useAppLanguage } from "@/lib/language";
import {
  approximateCoordinates,
  isCoordinates,
  rankNearbySupermarkets,
  type Coordinates,
  type NearbySupermarket,
} from "@/lib/nearby-supermarkets";
import { shopMapUrl, type PurchaseLocation } from "@/lib/purchase";

type GpsStatus = "idle" | "locating" | "loading" | "ready" | "denied" | "location-unavailable" | "map-unavailable";
type RankedStore = ReturnType<typeof rankNearbySupermarkets>[number];

const OTHER_PAGE_SIZE = 8;
const MAP_LINK = "https://www.google.com/maps/search/";

export function NearbySupermarkets({ preferred, location }: {
  preferred: string[];
  location: PurchaseLocation;
}) {
  const { t, language } = useAppLanguage();
  const [status, setStatus] = useState<GpsStatus>("idle");
  const [position, setPosition] = useState<Coordinates | null>(null);
  const [stores, setStores] = useState<NearbySupermarket[]>([]);
  const [expanded, setExpanded] = useState(false);
  const busy = status === "locating" || status === "loading";
  const number = new Intl.NumberFormat(language, { maximumFractionDigits: 1 });
  const ranked = position ? rankNearbySupermarkets(stores, position, preferred) : [];
  const others = ranked.filter((store) => store.priority < 0);

  async function loadNearby(coords: Coordinates) {
    setStatus("loading");
    setPosition(coords);
    try {
      const response = await fetch("/api/nearby-supermarkets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(approximateCoordinates(coords)),
        signal: AbortSignal.timeout(10_000),
      });
      if (!response.ok) throw new Error("Map lookup failed");
      const payload: { stores: NearbySupermarket[] } = await response.json();
      if (!Array.isArray(payload.stores)) throw new Error("Invalid store list");
      setStores(payload.stores);
      setStatus("ready");
    } catch {
      setStatus("map-unavailable");
    }
  }

  function locate() {
    setStores([]);
    setPosition(null);
    setExpanded(false);

    if (!navigator.geolocation) {
      setStatus("location-unavailable");
      return;
    }
    setStatus("locating");
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const position = { latitude: coords.latitude, longitude: coords.longitude };
        if (isCoordinates(position)) void loadNearby(position);
        else setStatus("location-unavailable");
      },
      (error) => setStatus(error.code === 1 ? "denied" : "location-unavailable"),
      { maximumAge: 60_000, timeout: 10_000 },
    );
  }

  function storeRow(store: RankedStore, preferred = false) {
    const mapQuery = `${store.latitude},${store.longitude}`;
    return <li key={store.id}>
      <a
        href={`${MAP_LINK}?${new URLSearchParams({ api: "1", query: mapQuery })}`}
        target="_blank"
        rel="noopener noreferrer"
        className={`flex min-h-11 items-center gap-2 rounded-xl border bg-card px-3 py-2 text-sm ${
          preferred ? "border-primary/40 text-primary" : "border-border text-foreground"
        }`}
      >
        <MapPin aria-hidden="true" className="h-4 w-4 shrink-0 text-primary" />
        <span className="min-w-0 flex-1">
          <span className="block font-extrabold">{store.name}</span>
          {store.address && <span className="block text-xs text-muted-foreground">{store.address}</span>}
        </span>
        <span className="shrink-0 font-bold">
          {store.distance < 1 ? `${number.format(Math.round(store.distance * 1000 / 10) * 10)} m` : `${number.format(store.distance)} km`}
        </span>
      </a>
    </li>;
  }

  return <>
    <div className="mt-3 flex flex-wrap items-center gap-2">
      <button
        type="button"
        disabled={busy}
        onClick={locate}
        className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-3 py-2 text-sm font-extrabold text-primary-foreground disabled:opacity-60"
      >
        <LocateFixed aria-hidden="true" className="h-4 w-4" />
        {t(position ? "Aggiorna la posizione" : "Usa la mia posizione")}
      </button>
      {position && <button type="button" disabled={busy} onClick={() => {
        setPosition(null);
        setStores([]);
        setStatus("idle");
        setExpanded(false);
      }} className="min-h-11 px-2 text-sm font-bold text-primary disabled:opacity-60">{t("Rimuovi posizione")}</button>}
    </div>
    {status === "idle" && <p className="mt-1 text-xs text-muted-foreground">{t("Per cercare i negozi viene inviata una posizione approssimativa al servizio mappe.")}</p>}
    {status !== "idle" && status !== "ready" && <p role="status" className="mt-2 text-sm text-muted-foreground">
      {status === "locating" && t("Cerco la tua posizione…")}
      {status === "loading" && t("Cerco i supermercati vicini…")}
      {status === "denied" && t("Posizione negata. Puoi consentirla nelle impostazioni del browser oppure inserire la città.")}
      {status === "location-unavailable" && t("Posizione non disponibile. Riprova oppure inserisci la città.")}
      {status === "map-unavailable" && t("Ricerca dei supermercati vicini non disponibile. Riprova oppure usa la mappa.")}
    </p>}
    {status === "map-unavailable" && preferred.length === 0 && <a href={shopMapUrl(undefined, location)} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex self-start text-sm font-bold text-primary underline">{t("Cerca sulla mappa")}</a>}
    {preferred.length > 0 && <section className="mt-3 rounded-2xl border border-primary/40 bg-primary/5 p-3">
      <h2 className="text-sm font-extrabold text-primary">{t("Supermercati scelti")}</h2>
      <ul className="mt-2 space-y-2">
        {preferred.flatMap((name, index) => {
          const matches = ranked.filter((store) => store.priority === index);
          if (matches.length) return matches.map((store) => storeRow(store, true));
          return [<li key={`market:${name}`}>
            <a href={shopMapUrl(name, location)} target="_blank" rel="noopener noreferrer"
              className="flex min-h-11 items-center gap-2 rounded-xl border border-primary/40 bg-card px-3 py-2 text-sm font-extrabold text-primary">
              <MapPin aria-hidden="true" className="h-4 w-4 shrink-0" />{name} · {t("Cerca sulla mappa")}
            </a>
          </li>];
        })}
      </ul>
    </section>}
    {status === "ready" && <section className="mt-3 space-y-2">
      {others.length > 0 && <>
        <h2 className="text-sm font-extrabold">{t(preferred.length ? "Altri supermercati vicini" : "Supermercati vicini")}</h2>
        <ul className="space-y-2">{(expanded ? others : others.slice(0, OTHER_PAGE_SIZE)).map((store) => storeRow(store))}</ul>
        {others.length > OTHER_PAGE_SIZE && <button type="button" onClick={() => setExpanded((current) => !current)} className="min-h-10 px-2 text-sm font-bold text-primary">
          {t(expanded ? "Mostra meno supermercati" : "Mostra altri supermercati")}
        </button>}
      </>}
      {ranked.length === 0 ? <p className="text-sm text-muted-foreground">{t("Nessun supermercato trovato nelle vicinanze.")}</p> : <>
        <p className="text-xs text-muted-foreground">{t("Distanze in linea d’aria. Verifica in negozio la disponibilità del prodotto.")}</p>
        <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground underline">© OpenStreetMap contributors</a>
      </>}
    </section>}
  </>;
}
