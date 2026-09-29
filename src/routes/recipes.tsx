import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowLeft, Check, ChefHat, Minus, Plus, ShoppingCart, Trash2 } from "lucide-react";
import { useProfile, addShoppingItems, clearShoppingList, removeShoppingItem, toggleShoppingItem, useShoppingList } from "@/lib/store";

type Ingredient = { name: string; quantity: string; glutenSwap?: string; lactoseSwap?: string };
type Recipe = { id: string; title: string; aliases: string[]; servings: number; ingredients: Ingredient[] };

const RECIPES: Recipe[] = [
  {
    id: "lasagne",
    title: "Lasagne",
    aliases: ["lasagna", "lasagne", "lasagna al forno"],
    servings: 4,
    ingredients: [
      { name: "Sfoglia per lasagne", quantity: "250 g", glutenSwap: "Sfoglia per lasagne senza glutine" },
      { name: "Carne macinata", quantity: "400 g" },
      { name: "Passata di pomodoro", quantity: "500 g" },
      { name: "Cipolla", quantity: "1" },
      { name: "Carota", quantity: "1" },
      { name: "Sedano", quantity: "1 costa" },
      { name: "Besciamella", quantity: "500 ml", glutenSwap: "Besciamella senza glutine", lactoseSwap: "Besciamella senza lattosio" },
      { name: "Parmigiano grattugiato", quantity: "100 g", lactoseSwap: "Parmigiano stagionato o alternativa senza lattosio" },
      { name: "Olio extravergine d'oliva", quantity: "2 cucchiai" },
      { name: "Sale", quantity: "q.b." },
    ],
  },
  {
    id: "carbonara",
    title: "Pasta alla carbonara",
    aliases: ["carbonara", "pasta carbonara"],
    servings: 4,
    ingredients: [
      { name: "Pasta", quantity: "320 g", glutenSwap: "Pasta senza glutine" },
      { name: "Guanciale", quantity: "150 g" },
      { name: "Uova", quantity: "4" },
      { name: "Pecorino romano", quantity: "100 g", lactoseSwap: "Pecorino stagionato ben tollerato o alternativa senza lattosio" },
      { name: "Pepe nero", quantity: "q.b." },
    ],
  },
  {
    id: "pizza",
    title: "Pizza margherita",
    aliases: ["pizza", "margherita", "pizza margherita"],
    servings: 4,
    ingredients: [
      { name: "Farina", quantity: "500 g", glutenSwap: "Mix farina per pizza senza glutine" },
      { name: "Acqua", quantity: "325 ml" },
      { name: "Lievito di birra", quantity: "5 g" },
      { name: "Passata di pomodoro", quantity: "400 g" },
      { name: "Mozzarella", quantity: "300 g", lactoseSwap: "Mozzarella senza lattosio" },
      { name: "Olio extravergine d'oliva", quantity: "2 cucchiai" },
      { name: "Sale", quantity: "10 g" },
    ],
  },
];

export const Route = createFileRoute("/recipes")({
  head: () => ({ meta: [{ title: "Ricette e lista della spesa — SafeFood Scan" }] }),
  component: RecipesPage,
});

function scaleQuantity(quantity: string, factor: number) {
  const match = quantity.match(/^([0-9]+(?:[.,][0-9]+)?)\s*(.*)$/);
  if (!match || factor === 1) return quantity;
  const value = Number(match[1].replace(",", "."));
  if (!Number.isFinite(value)) return quantity;
  const scaled = Math.round(value * factor * 10) / 10;
  return `${String(scaled).replace(".", ",")} ${match[2]}`.trim();
}

function RecipesPage() {
  const profile = useProfile();
  const shopping = useShoppingList();
  const [query, setQuery] = useState("lasagne");
  const [selectedId, setSelectedId] = useState("lasagne");
  const [servings, setServings] = useState(4);

  const selected = RECIPES.find((r) => r.id === selectedId) ?? RECIPES[0];
  const glutenFree = profile?.allergens.includes("glutine") ?? false;
  const lactoseFree = profile?.allergens.includes("lattosio") ?? false;

  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return RECIPES;
    return RECIPES.filter((r) => r.title.toLowerCase().includes(q) || r.aliases.some((a) => a.includes(q)));
  }, [query]);

  const adapted = selected.ingredients.map((item) => {
    let name = item.name;
    if (glutenFree && item.glutenSwap) name = item.glutenSwap;
    if (lactoseFree && item.lactoseSwap) name = item.lactoseSwap;
    return {
      name,
      quantity: scaleQuantity(item.quantity, servings / selected.servings),
      recipe: selected.title,
    };
  });

  const choose = (recipe: Recipe) => {
    setSelectedId(recipe.id);
    setQuery(recipe.title);
    setServings(recipe.servings);
  };

  return <div className="mx-auto flex min-h-screen w-full max-w-md flex-col px-5 pb-10 pt-6">
    <header className="flex items-center gap-3">
      <Link to="/" aria-label="Torna alla home" className="grid h-10 w-10 place-items-center rounded-full bg-secondary text-secondary-foreground"><ArrowLeft className="h-5 w-5" /></Link>
      <div><h1 className="text-lg font-extrabold text-foreground">Ricette e spesa</h1><p className="text-xs text-muted-foreground">Scegli cosa cucinare e prepara la lista</p></div>
    </header>

    <section className="mt-5 rounded-3xl border border-border bg-card p-4">
      <div className="flex items-center gap-2"><ChefHat className="h-5 w-5 text-primary" /><p className="font-extrabold">Cosa vuoi cucinare?</p></div>
      <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Es. lasagne" className="mt-3 w-full rounded-2xl border border-border bg-background px-4 py-3.5 text-base outline-none focus:border-primary" />
      <div className="mt-3 flex flex-wrap gap-2">
        {(suggestions.length ? suggestions : RECIPES).map((recipe) => <button key={recipe.id} type="button" onClick={() => choose(recipe)} className={`rounded-full px-3 py-2 text-xs font-extrabold ${recipe.id === selected.id ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}>{recipe.title}</button>)}
      </div>
    </section>

    <section className="mt-4 rounded-3xl border border-border bg-card p-4">
      <div className="flex items-center justify-between gap-3">
        <div><p className="text-xs font-bold uppercase text-muted-foreground">Ricetta scelta</p><h2 className="mt-1 text-xl font-black text-foreground">{selected.title}</h2></div>
        <div className="flex items-center gap-2 rounded-full bg-secondary p-1">
          <button type="button" onClick={() => setServings((v) => Math.max(1, v - 1))} className="grid h-8 w-8 place-items-center rounded-full bg-card"><Minus className="h-4 w-4" /></button>
          <span className="min-w-10 text-center text-sm font-extrabold">{servings}</span>
          <button type="button" onClick={() => setServings((v) => Math.min(12, v + 1))} className="grid h-8 w-8 place-items-center rounded-full bg-card"><Plus className="h-4 w-4" /></button>
        </div>
      </div>
      {(glutenFree || lactoseFree) && <p className="mt-3 rounded-2xl bg-secondary px-3 py-2 text-xs font-semibold text-secondary-foreground">Adattata al profilo attivo{glutenFree ? " · senza glutine" : ""}{lactoseFree ? " · senza lattosio" : ""}</p>}
      <div className="mt-4 space-y-2">{adapted.map((item) => <div key={item.name} className="flex items-center justify-between gap-3 rounded-2xl bg-muted px-3 py-3"><span className="text-sm font-bold text-foreground">{item.name}</span><span className="shrink-0 text-xs font-semibold text-muted-foreground">{item.quantity}</span></div>)}</div>
      <button type="button" onClick={() => addShoppingItems(adapted)} className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-4 text-base font-extrabold text-primary-foreground"><ShoppingCart className="h-5 w-5" />Aggiungi alla lista della spesa</button>
    </section>

    <section className="mt-4 rounded-3xl border border-border bg-card p-4">
      <div className="flex items-center justify-between gap-3"><div className="flex items-center gap-2"><ShoppingCart className="h-5 w-5 text-primary" /><h2 className="font-extrabold">Lista della spesa</h2></div>{shopping.length > 0 && <button type="button" onClick={clearShoppingList} className="text-xs font-extrabold text-danger">Svuota</button>}</div>
      {shopping.length === 0 ? <p className="mt-3 text-sm text-muted-foreground">La lista è vuota. Aggiungi una ricetta per iniziare.</p> : <div className="mt-3 space-y-2">{shopping.map((item) => <div key={item.id} className="flex items-center gap-3 rounded-2xl bg-muted px-3 py-3"><button type="button" onClick={() => toggleShoppingItem(item.id)} className={`grid h-7 w-7 shrink-0 place-items-center rounded-full border-2 ${item.checked ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card"}`}>{item.checked && <Check className="h-4 w-4" />}</button><div className="min-w-0 flex-1"><p className={`truncate text-sm font-bold ${item.checked ? "line-through opacity-50" : ""}`}>{item.name}</p><p className="text-xs text-muted-foreground">{item.quantity}{item.recipe ? ` · ${item.recipe}` : ""}</p></div><button type="button" onClick={() => removeShoppingItem(item.id)} aria-label="Rimuovi" className="text-muted-foreground"><Trash2 className="h-4 w-4" /></button></div>)}</div>}
    </section>
  </div>;
}
