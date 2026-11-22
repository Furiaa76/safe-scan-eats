import { useId, useState } from "react";
import { Check, Pencil, Trash2 } from "lucide-react";
import { PurchaseItemLink } from "@/components/PurchaseItemLink";
import { useAppLanguage } from "@/lib/language";
import { shoppingProductVerdict, type ShoppingItemDetails } from "@/lib/shopping-organization";
import { setShoppingItemDetails } from "@/lib/shopping-preferences";
import { removeShoppingItem, toggleShoppingItem, updateShoppingItem, type ShoppingItem } from "@/lib/store";

const FIELD = "min-h-11 w-full rounded-xl border border-border bg-card px-3 py-2 text-sm";
const STATUS = {
  compatible: { label: "Compatibile con il profilo", className: "bg-safe-soft text-safe" },
  warning: { label: "Da verificare", className: "bg-caution-soft text-caution-foreground" },
  avoid: { label: "Da evitare", className: "bg-danger-soft text-danger" },
} as const;

export function ShoppingMarketField({ markets, value, onChange }: {
  markets: string[];
  value: string;
  onChange: (value: string) => void;
}) {
  const { t } = useAppLanguage();
  const id = useId();
  const [custom, setCustom] = useState(Boolean(value && !markets.includes(value)));

  return <div className="space-y-2">
    <label htmlFor={id} className="text-sm font-bold">{t("Supermercato")}</label>
    <select
      id={id}
      value={custom ? "__other" : value}
      className={FIELD}
      onChange={(event) => {
        const next = event.target.value;
        setCustom(next === "__other");
        onChange(next === "__other" ? "" : next);
      }}
    >
      <option value="">{t("Senza supermercato")}</option>
      {!custom && value && !markets.includes(value) && <option value={value}>{value}</option>}
      {markets.map((market) => <option key={market} value={market}>{market}</option>)}
      <option value="__other">{t("Altro supermercato…")}</option>
    </select>
    {custom && <input
      value={value}
      onChange={(event) => onChange(event.target.value)}
      aria-label={t("Nome del supermercato")}
      placeholder={t("Nome del supermercato")}
      maxLength={60}
      className={FIELD}
    />}
  </div>;
}

export function ShoppingStatusBadge({ item, details, activeProfileKey }: {
  item: Pick<ShoppingItem, "name">;
  details: ShoppingItemDetails | undefined;
  activeProfileKey: string;
}) {
  const { t } = useAppLanguage();
  const status = STATUS[shoppingProductVerdict(item, details, activeProfileKey)];
  return <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-bold ${status.className}`}>{t(status.label)}</span>;
}

export function ShoppingListItem({ item, details, activeProfileKey, markets }: {
  item: ShoppingItem;
  details: ShoppingItemDetails | undefined;
  activeProfileKey: string;
  markets: string[];
}) {
  const { t } = useAppLanguage();
  const [edit, setEdit] = useState<{ name: string; quantity: string; market: string } | null>(null);

  return <article className="rounded-2xl bg-muted px-3 py-3">
    {edit ? (
      <form className="space-y-3" onSubmit={(event) => {
        event.preventDefault();
        updateShoppingItem(item.id, { name: edit.name, quantity: edit.quantity });
        setShoppingItemDetails(item.id, {
          market: edit.market,
          ...(edit.name.trim() !== item.name ? { check: undefined } : {}),
        });
        setEdit(null);
      }}>
        <div className="grid grid-cols-[minmax(0,1fr)_90px] gap-2">
          <input value={edit.name} onChange={(event) => setEdit({ ...edit, name: event.target.value })} aria-label={t("Nome del prodotto")} className={FIELD} />
          <input value={edit.quantity} onChange={(event) => setEdit({ ...edit, quantity: event.target.value })} aria-label={t("Qtà")} className={FIELD} />
        </div>
        <ShoppingMarketField markets={markets} value={edit.market} onChange={(market) => setEdit({ ...edit, market })} />
        <div className="flex justify-end gap-2">
          <button type="button" onClick={() => setEdit(null)} className="min-h-10 rounded-full bg-card px-3 text-xs font-bold">{t("Annulla")}</button>
          <button type="submit" disabled={!edit.name.trim()} className="min-h-10 rounded-full bg-primary px-4 text-xs font-extrabold text-primary-foreground disabled:opacity-50">{t("Salva")}</button>
        </div>
      </form>
    ) : (
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => toggleShoppingItem(item.id)}
          aria-label={t(item.checked ? "Rimetti tra i prodotti da comprare" : "Segna come acquistato")}
          className={`grid h-9 w-9 shrink-0 place-items-center rounded-full border-2 ${item.checked ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card"}`}
        >
          {item.checked && <Check className="h-4 w-4" />}
        </button>
        <div className="min-w-0 flex-1">
          <PurchaseItemLink name={item.name} from="shopping" className={`text-sm font-extrabold ${item.checked ? "line-through" : ""}`} />
          <p className="text-xs text-muted-foreground">{[t(item.quantity), item.recipe && t(item.recipe), details?.market].filter(Boolean).join(" · ")}</p>
          <div className="mt-1"><ShoppingStatusBadge item={item} details={details} activeProfileKey={activeProfileKey} /></div>
        </div>
        <button
          type="button"
          onClick={() => setEdit({ name: item.name, quantity: item.quantity, market: details?.market ?? "" })}
          aria-label={t("Modifica")}
          className="grid h-9 w-8 shrink-0 place-items-center text-muted-foreground"
        >
          <Pencil className="h-4 w-4" />
        </button>
        <button type="button" onClick={() => removeShoppingItem(item.id)} aria-label={t("Elimina")} className="grid h-9 w-8 shrink-0 place-items-center text-muted-foreground">
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    )}
  </article>;
}
