import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Check, Pencil, Plus, ShoppingCart, Trash2, X } from "lucide-react";
import {
  addShoppingItem,
  clearCheckedShoppingItems,
  clearShoppingList,
  removeShoppingItem,
  replaceShoppingList,
  toggleShoppingItem,
  updateShoppingItem,
  useShoppingList,
  getShoppingCategory,
  SHOPPING_CATEGORIES,
} from "@/lib/store";
import {
  isCloudShoppingConfigured,
  loadCloudShopping,
  saveCloudShopping,
  linkAlexaPairingCode,
} from "@/lib/cloud-shopping";

export const Route = createFileRoute("/shopping")({
  component: ShoppingPage,
});

function ShoppingPage() {
  const items = useShoppingList();
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editQuantity, setEditQuantity] = useState("");
  const [alexaCode, setAlexaCode] = useState("");
  const [alexaMessage, setAlexaMessage] = useState("");
  const [alexaLinking, setAlexaLinking] = useState(false);
  const [cloudReady, setCloudReady] = useState(false);
  const [cloudState, setCloudState] = useState<"local" | "syncing" | "synced" | "error">(
    isCloudShoppingConfigured() ? "syncing" : "local",
  );
  const hydrating = useRef(false);

  useEffect(() => {
    if (!isCloudShoppingConfigured()) {
      setCloudState("local");
      return;
    }

    let cancelled = false;
    hydrating.current = true;
    setCloudState("syncing");

    void (async () => {
      try {
        const remote = await loadCloudShopping();
        if (cancelled) return;

        if (remote && remote.length > 0) {
          replaceShoppingList(remote);
        } else if (items.length > 0) {
          await saveCloudShopping(items);
        }

        if (!cancelled) {
          setCloudReady(true);
          setCloudState("synced");
        }
      } catch {
        if (!cancelled) setCloudState("error");
      } finally {
        hydrating.current = false;
      }
    })();

    return () => {
      cancelled = true;
    };
    // Prima sincronizzazione: deve partire una sola volta all'apertura della pagina.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!cloudReady || hydrating.current || !isCloudShoppingConfigured()) return;
    const timer = window.setTimeout(() => {
      setCloudState("syncing");
      void saveCloudShopping(items)
        .then(() => setCloudState("synced"))
        .catch(() => setCloudState("error"));
    }, 350);
    return () => window.clearTimeout(timer);
  }, [items, cloudReady]);

  const pending = useMemo(() => items.filter((item) => !item.checked), [items]);
  const checked = useMemo(() => items.filter((item) => item.checked), [items]);
  const groupedPending = useMemo(() => {
    const groups = SHOPPING_CATEGORIES.map((category) => ({
      category,
      items: pending.filter((item) => getShoppingCategory(item.name).id === category.id),
    })).filter((group) => group.items.length > 0);
    return groups;
  }, [pending]);

  const addManual = () => {
    const clean = name.trim();
    if (!clean) return;
    addShoppingItem(clean, quantity.trim() || "1");
    setName("");
    setQuantity("1");
  };

  const beginEdit = (id: string, currentName: string, currentQuantity: string) => {
    setEditingId(id);
    setEditName(currentName);
    setEditQuantity(currentQuantity);
  };

  const saveEdit = () => {
    if (!editingId) return;
    updateShoppingItem(editingId, {
      name: editName,
      quantity: editQuantity,
    });
    setEditingId(null);
  };

  const linkAlexa = async () => {
    const code = alexaCode.replace(/\D/g, "").slice(0, 6);
    if (code.length !== 6) {
      setAlexaMessage("Inserisci il codice di 6 cifre detto da Alexa.");
      return;
    }
    setAlexaLinking(true);
    setAlexaMessage("");
    try {
      const ok = await linkAlexaPairingCode(code);
      setAlexaMessage(ok ? "Alexa collegata alla tua lista della spesa." : "Codice non valido o scaduto. Chiedi ad Alexa un nuovo codice.");
      if (ok) setAlexaCode("");
    } catch {
      setAlexaMessage("Non riesco a collegare Alexa in questo momento.");
    } finally {
      setAlexaLinking(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col px-5 pb-10 pt-6">
      <header className="flex items-center gap-3">
        <Link to="/" aria-label="Torna alla home" className="grid h-10 w-10 place-items-center rounded-full bg-secondary text-secondary-foreground">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="text-lg font-extrabold text-foreground">Lista della spesa</h1>
          <p className="text-xs text-muted-foreground">
            {pending.length} da comprare · {checked.length} acquistati
            {cloudState === "synced" ? " · ☁️ sincronizzata" : cloudState === "syncing" ? " · sincronizzo…" : cloudState === "error" ? " · sync non disponibile" : ""}
          </p>
        </div>
        <ShoppingCart className="h-6 w-6 text-primary" />
      </header>

      <section className="mt-5 rounded-3xl border border-border bg-card p-4">
        <p className="font-extrabold text-foreground">Collega Alexa</p>
        <p className="mt-1 text-xs text-muted-foreground">Apri la skill “Safe Scan” su Alexa. Se non è ancora collegata, Alexa ti dirà un codice di 6 cifre.</p>
        <div className="mt-3 flex gap-2">
          <input
            value={alexaCode}
            onChange={(e) => setAlexaCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            inputMode="numeric"
            placeholder="Codice 6 cifre"
            className="min-w-0 flex-1 rounded-2xl border border-border bg-background px-4 py-3 text-center text-lg font-extrabold tracking-[0.25em] outline-none focus:border-primary"
          />
          <button
            type="button"
            onClick={() => void linkAlexa()}
            disabled={alexaLinking || alexaCode.length !== 6}
            className="rounded-2xl bg-secondary px-4 text-sm font-extrabold text-secondary-foreground disabled:opacity-40"
          >
            {alexaLinking ? "Collego…" : "Collega"}
          </button>
        </div>
        {alexaMessage && <p className="mt-2 text-xs font-semibold text-muted-foreground">{alexaMessage}</p>}
      </section>

      <section className="mt-4 rounded-3xl border border-border bg-card p-4">
        <p className="font-extrabold text-foreground">Aggiungi un prodotto</p>
        <div className="mt-3 grid grid-cols-[minmax(0,1fr)_95px] gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addManual();
              }
            }}
            placeholder="Es. Latte"
            className="min-w-0 rounded-2xl border border-border bg-background px-4 py-3 text-base outline-none focus:border-primary"
          />
          <input
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            placeholder="Qtà"
            className="rounded-2xl border border-border bg-background px-3 py-3 text-center text-base outline-none focus:border-primary"
          />
        </div>
        <button
          type="button"
          onClick={addManual}
          disabled={!name.trim()}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-3.5 text-sm font-extrabold text-primary-foreground disabled:opacity-40"
        >
          <Plus className="h-4 w-4" />
          Aggiungi alla lista
        </button>
        <p className="mt-2 text-xs text-muted-foreground">Puoi scrivere quantità come 2, 500 g, 1 kg, 750 ml. I doppioni compatibili vengono sommati automaticamente.</p>
      </section>

      {items.length === 0 ? (
        <section className="mt-4 rounded-3xl border border-border bg-card p-5 text-center">
          <ShoppingCart className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-3 font-extrabold text-foreground">La lista è vuota</p>
          <p className="mt-1 text-sm text-muted-foreground">Aggiungi prodotti a mano oppure da una ricetta.</p>
          <Link to="/recipes" className="mt-4 inline-flex rounded-full bg-secondary px-4 py-2 text-sm font-extrabold text-secondary-foreground">
            Vai alle ricette
          </Link>
        </section>
      ) : (
        <>
          <section className="mt-4 rounded-3xl border border-border bg-card p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="font-extrabold text-foreground">Da comprare</h2>
                <p className="text-xs text-muted-foreground">{pending.length} prodotti</p>
              </div>
              {items.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm("Vuoi svuotare tutta la lista della spesa?")) clearShoppingList();
                  }}
                  className="text-xs font-extrabold text-danger"
                >
                  Svuota tutto
                </button>
              )}
            </div>

            {pending.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">Hai già spuntato tutto.</p>
            ) : (
              <div className="mt-4 space-y-5">
                {groupedPending.map(({ category, items: categoryItems }) => (
                  <div key={category.id}>
                    <div className="mb-2 flex items-center gap-2">
                      <span className="text-lg">{category.emoji}</span>
                      <h3 className="text-sm font-extrabold text-foreground">{category.label}</h3>
                      <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] font-bold text-secondary-foreground">{categoryItems.length}</span>
                    </div>
                    <div className="space-y-2">
                      {categoryItems.map((item) => (
                        <div key={item.id} className="rounded-2xl bg-muted px-3 py-3">
                          {editingId === item.id ? (
                            <div>
                              <div className="grid grid-cols-[minmax(0,1fr)_90px] gap-2">
                                <input
                                  value={editName}
                                  onChange={(e) => setEditName(e.target.value)}
                                  className="min-w-0 rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary"
                                />
                                <input
                                  value={editQuantity}
                                  onChange={(e) => setEditQuantity(e.target.value)}
                                  className="rounded-xl border border-border bg-card px-2 py-2 text-center text-sm outline-none focus:border-primary"
                                />
                              </div>
                              <div className="mt-2 flex justify-end gap-2">
                                <button type="button" onClick={() => setEditingId(null)} className="grid h-8 w-8 place-items-center rounded-full bg-card text-muted-foreground">
                                  <X className="h-4 w-4" />
                                </button>
                                <button type="button" onClick={saveEdit} className="rounded-full bg-primary px-4 py-2 text-xs font-extrabold text-primary-foreground">
                                  Salva
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center gap-3">
                              <button
                                type="button"
                                onClick={() => toggleShoppingItem(item.id)}
                                className="grid h-8 w-8 shrink-0 place-items-center rounded-full border-2 border-border bg-card"
                                aria-label="Segna come acquistato"
                              />
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-extrabold text-foreground">{item.name}</p>
                                <p className="text-xs text-muted-foreground">{item.quantity}{item.recipe ? ` · ${item.recipe}` : ""}</p>
                              </div>
                              <button type="button" onClick={() => beginEdit(item.id, item.name, item.quantity)} className="text-muted-foreground" aria-label="Modifica">
                                <Pencil className="h-4 w-4" />
                              </button>
                              <button type="button" onClick={() => removeShoppingItem(item.id)} className="text-muted-foreground" aria-label="Elimina">
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {checked.length > 0 && (
            <section className="mt-4 rounded-3xl border border-border bg-card p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="font-extrabold text-foreground">Acquistati</h2>
                  <p className="text-xs text-muted-foreground">{checked.length} prodotti</p>
                </div>
                <button type="button" onClick={clearCheckedShoppingItems} className="text-xs font-extrabold text-danger">
                  Elimina acquistati
                </button>
              </div>
              <div className="mt-3 space-y-2">
                {checked.map((item) => (
                  <div key={item.id} className="flex items-center gap-3 rounded-2xl bg-muted px-3 py-3 opacity-70">
                    <button
                      type="button"
                      onClick={() => toggleShoppingItem(item.id)}
                      className="grid h-8 w-8 shrink-0 place-items-center rounded-full border-2 border-primary bg-primary text-primary-foreground"
                      aria-label="Rimetti tra i prodotti da comprare"
                    >
                      <Check className="h-4 w-4" />
                    </button>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold line-through text-foreground">{item.name}</p>
                      <p className="text-xs text-muted-foreground">{item.quantity}</p>
                    </div>
                    <button type="button" onClick={() => removeShoppingItem(item.id)} className="text-muted-foreground" aria-label="Elimina">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
