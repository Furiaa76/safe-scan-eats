import { useAppLanguage } from "@/lib/language";
import { PURCHASE_COUNTRIES } from "@/lib/purchase-countries";
import { setPurchaseLocation, usePurchaseLocation } from "@/lib/purchase";

export function PurchaseCountrySelector({ withCity = false }: { withCity?: boolean }) {
  const { t, language } = useAppLanguage();
  const location = usePurchaseLocation();
  return <section className="mt-4 rounded-2xl border border-border bg-card p-4">
    <label className="flex flex-col gap-2 text-sm font-extrabold text-foreground">
      {t("Paese per gli acquisti")}
      <select value={location.country} onChange={(event) => setPurchaseLocation({ country: event.target.value, city: "" })}
        className="w-full rounded-xl border border-border bg-background px-3 py-3 text-base font-semibold">
        {[...PURCHASE_COUNTRIES].sort((a, b) => a[language].localeCompare(b[language], language)).map((country) => <option key={country.code} value={country.code}>{country[language]}</option>)}
      </select>
    </label>
    {withCity && <label className="mt-3 flex flex-col gap-2 text-sm font-extrabold text-foreground">
      {t("Città per la mappa (facoltativa)")}
      <input value={location.city} maxLength={100} onChange={(event) => setPurchaseLocation({ ...location, city: event.target.value })}
        placeholder={t("Es. Como")} autoComplete="address-level2"
        className="w-full rounded-xl border border-border bg-background px-3 py-3 text-base font-normal" />
    </label>}
  </section>;
}
