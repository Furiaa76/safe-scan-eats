import assert from "node:assert/strict";
import { test } from "node:test";
import {
  groupShoppingByMarket,
  makeShoppingProductCheck,
  matchesShoppingMarket,
  shoppingProductVerdict,
  shoppingProfileKey,
  SHOPPING_DAYS,
  SHOPPING_MEALS,
} from "../src/lib/shopping-organization.ts";

const profile = { id: "profile-1", name: "Test", allergens: ["glutine"], severe: false };
const verified = { verdict: "compatible", incomplete: false, reasons: [] };
const oats = { id: "a", name: "Fiocchi di avena", quantity: "1", checked: false };

test("products are grouped by their assigned supermarket, with an unassigned group", () => {
  const milk = { ...oats, id: "b", name: "Latte" };
  const salt = { ...oats, id: "c", name: "Sale" };
  const bread = { ...oats, id: "d", name: "Pane" };
  const groups = groupShoppingByMarket([oats, milk, salt, bread], {
    a: { market: "Tigros" }, b: { market: "tigros" }, d: { market: "Coop" },
  });
  assert.deepEqual(groups.map(({ title, items }) => [title, items.map(({ id }) => id)]), [
    ["Coop", ["d"]], ["Tigros", ["a", "b"]], ["Senza supermercato", ["c"]],
  ]);
});

test("only a complete matching analysis can show a compatible status", () => {
  const check = makeShoppingProductCheck("12345678", oats.name, profile, verified);
  assert.equal(shoppingProductVerdict(oats, { check }, shoppingProfileKey(profile)), "compatible");
  assert.equal(shoppingProductVerdict(oats, undefined, shoppingProfileKey(profile)), "warning");
  assert.equal(shoppingProductVerdict(oats, { check }, shoppingProfileKey(null)), "warning");
  assert.equal(shoppingProductVerdict(oats, { check }, shoppingProfileKey({ ...profile, allergens: ["glutine", "soia"] })), "warning");
  assert.equal(shoppingProductVerdict({ name: "Fiocchi di frumento" }, { check }, shoppingProfileKey(profile)), "warning");
  assert.equal(makeShoppingProductCheck("", oats.name, profile, { ...verified, incomplete: true }).verdict, "warning");
  assert.equal(makeShoppingProductCheck("", oats.name, profile, { ...verified, verdict: "avoid", incomplete: true }).verdict, "avoid");
  assert.equal(makeShoppingProductCheck("", oats.name, { ...profile, allergens: [] }, verified).verdict, "warning");
});

test("a change to the nickel personal list invalidates a previous check", () => {
  const withNickel = { ...profile, nickel: { enabled: true, startPage: false, entries: [
    { id: "n1", kind: "ingredient", name: "cacao", aliases: ["cocoa"], code: "", note: "" },
  ] } };
  const next = { ...withNickel, nickel: { ...withNickel.nickel, entries: [
    { ...withNickel.nickel.entries[0], aliases: ["cocoa", "cioccolato"] },
  ] } };
  const check = makeShoppingProductCheck("", oats.name, withNickel, verified);
  assert.equal(shoppingProductVerdict(oats, { check }, shoppingProfileKey(next)), "warning");
});

test("the plan includes lunch and dinner for each day from Monday through Sunday", () => {
  assert.equal(new Set(SHOPPING_DAYS.flatMap((day) => SHOPPING_MEALS.map((meal) => `${day}-${meal}`))).size, 14);
  assert.equal(SHOPPING_DAYS[0], "Lunedì");
  assert.equal(SHOPPING_DAYS.at(-1), "Domenica");
  assert.deepEqual(SHOPPING_MEALS, ["Pranzo", "Cena"]);
});

test("same-name products assigned to different supermarkets or barcodes keep their own rows", async () => {
  const memory = new Map();
  globalThis.window = { localStorage: {
    getItem: (key) => memory.get(key) ?? null,
    setItem: (key, value) => memory.set(key, value),
    removeItem: (key) => memory.delete(key),
  } };
  try {
    const { addShoppingItem, addShoppingItems, getShoppingList } = await import("../src/lib/store.ts");
    const { getShoppingPreferences, setShoppingMealRecipe } = await import("../src/lib/shopping-preferences.ts");
    addShoppingItem("Pasta", "500 g", "Coop");
    addShoppingItem("Pasta", "1 kg", "Lidl");
    addShoppingItems([{ name: "Pasta", quantity: "1", check: makeShoppingProductCheck("12345678", "Pasta", profile, verified) }]);
    addShoppingItems([{ name: "Pasta", quantity: "1", check: makeShoppingProductCheck("12345679", "Pasta", profile, { ...verified, verdict: "avoid" }) }]);
    const items = getShoppingList();
    assert.equal(items.length, 4);
    const { details } = getShoppingPreferences();
    assert.equal(details[items[0].id].market, "Coop");
    assert.equal(details[items[1].id].market, "Lidl");
    assert.equal(details[items[2].id].check.verdict, "compatible");
    assert.equal(details[items[3].id].check.verdict, "avoid");
    const recipe = { key: "lasagne", title: "Lasagne" };
    setShoppingMealRecipe("Lunedì-Pranzo", recipe, true);
    setShoppingMealRecipe("Lunedì-Pranzo", recipe, true);
    setShoppingMealRecipe("Domenica-Cena", recipe, true);
    setShoppingMealRecipe("Lunedì-Pranzo", recipe, false);
    const saved = JSON.parse(memory.get("safe-scan-shopping-organization-v1"));
    assert.deepEqual(saved.meals["Lunedì-Pranzo"], []);
    assert.deepEqual(saved.meals["Domenica-Cena"], [recipe]);
  } finally {
    delete globalThis.window;
  }
});

test("chosen retailer matches case and common storefront naming without matching another chain", () => {
  assert.equal(matchesShoppingMarket("TIGROS", " tigros "), true);
  assert.equal(matchesShoppingMarket("Coop Shop", "Coop"), true);
  assert.equal(matchesShoppingMarket("Iperal", "Iper"), false);
  assert.equal(matchesShoppingMarket("Esselunga", ""), true);
});
