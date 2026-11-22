import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { X } from "lucide-react";
import { ShoppingStatusBadge } from "@/components/ShoppingListItem";
import { useAppLanguage } from "@/lib/language";
import { SHOPPING_DAYS, SHOPPING_MEALS } from "@/lib/shopping-organization";
import { setShoppingMealRecipe, useShoppingPreferences } from "@/lib/shopping-preferences";
import type { getShoppingRecipes } from "@/lib/shopping-recipes";
import { toggleShoppingItem } from "@/lib/store";

export function ShoppingWeek({ recipes, activeProfileKey }: {
  recipes: ReturnType<typeof getShoppingRecipes>;
  activeProfileKey: string;
}) {
  const { t } = useAppLanguage();
  const { details, meals } = useShoppingPreferences();
  const [day, setDay] = useState<typeof SHOPPING_DAYS[number]>("Lunedì");

  return <section className="mt-4 rounded-3xl border border-border bg-card p-4">
    <div className="flex items-center justify-between gap-2">
      <h2 className="font-extrabold">{t("Menu settimanale")}</h2>
      <Link to="/recipes" className="text-xs font-extrabold text-primary">{t("Vai alle ricette")}</Link>
    </div>
    <div className="mt-3 grid grid-cols-4 gap-1.5" role="group" aria-label={t("Giorno della settimana")}>
      {SHOPPING_DAYS.map((option) => <button
        key={option}
        type="button"
        aria-label={t(option)}
        aria-pressed={day === option}
        onClick={() => setDay(option)}
        className={`min-h-10 rounded-xl px-1 text-xs font-extrabold ${day === option ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}
      >{t(option).slice(0, 3)}</button>)}
    </div>
    <h3 className="mt-4 text-lg font-black">{t(day)}</h3>
    {SHOPPING_MEALS.map((meal) => {
      const slot = `${day}-${meal}` as const;
      const planned = meals[slot] ?? [];
      const available = recipes.filter(({ key }) => !planned.some((recipe) => recipe.key === key));
      return <section key={meal} className="mt-3 rounded-2xl bg-muted p-3">
        <h4 className="font-extrabold">{t(meal)}</h4>
        {planned.map((plannedRecipe) => {
          const saved = recipes.find(({ key }) => key === plannedRecipe.key);
          return <div key={plannedRecipe.key} className="mt-2 rounded-xl bg-card p-2">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-extrabold">{t(plannedRecipe.title)}</p>
              <button type="button" onClick={() => setShoppingMealRecipe(slot, plannedRecipe, false)} aria-label={`${t("Rimuovi ricetta dal pasto")} · ${t(plannedRecipe.title)}`} className="grid h-9 w-9 shrink-0 place-items-center text-muted-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>
            {saved ? <ul className="space-y-1">
              {saved.items.map((item) => <li key={item.id}>
                <label className="flex min-h-8 cursor-pointer items-center gap-2 text-sm">
                  <input type="checkbox" checked={item.checked} onChange={() => toggleShoppingItem(item.id)} className="h-4 w-4 shrink-0 accent-primary" />
                  <span className={item.checked ? "line-through" : ""}>{t(item.name)}</span>
                  {!item.recipe?.includes("·") && <span className="ml-auto shrink-0 text-xs text-muted-foreground">{t(item.quantity)}</span>}
                </label>
                <div className="pl-6"><ShoppingStatusBadge item={item} details={details[item.id]} activeProfileKey={activeProfileKey} /></div>
              </li>)}
            </ul> : <p className="text-xs text-muted-foreground">{t("Ricetta non più nella lista della spesa.")}</p>}
          </div>;
        })}
        {available.length > 0 && <select
          value=""
          aria-label={`${t("Aggiungi una ricetta")} · ${t(meal)}`}
          onChange={(event) => {
            const recipe = available.find(({ key }) => key === event.target.value);
            if (recipe) setShoppingMealRecipe(slot, { key: recipe.key, title: recipe.title }, true);
          }}
          className="mt-2 min-h-11 w-full rounded-xl border border-border bg-card px-2 text-sm"
        >
          <option value="" disabled>{t("Aggiungi una ricetta")}</option>
          {available.map(({ key, title }) => <option key={key} value={key}>{t(title)}</option>)}
        </select>}
      </section>;
    })}
    {recipes.length === 0 && <p className="mt-3 text-sm text-muted-foreground">{t("Aggiungi gli ingredienti di una ricetta alla spesa per programmarla.")}</p>}
  </section>;
}
