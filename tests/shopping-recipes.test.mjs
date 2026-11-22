import assert from "node:assert/strict";
import { test } from "node:test";
import { getShoppingRecipes } from "../src/lib/shopping-recipes.ts";
import { mergeShoppingChanges } from "../src/lib/shopping-sync.ts";

function item(id, name, attributes = {}) {
  return { id, name, quantity: "1", checked: false, ...attributes };
}

test("existing recipe labels group checked and shared ingredients and skip manual products", () => {
  const pasta = item("pasta", "Pasta", { recipe: "la carbonara (2 persone)", checked: true });
  const eggs = item("uova", "Uova", { recipe: "Carbonara (2 persone) · il tiramisù · TIRAMISÙ" });
  const milk = item("latte", "Latte");
  assert.deepEqual(getShoppingRecipes([pasta, eggs, milk]), [
    { key: "carbonara (2 persone)", title: "Carbonara (2 persone)", items: [pasta, eggs] },
    { key: "tiramisù", title: "Tiramisù", items: [eggs] },
  ]);
});

test("local recipe additions and edits survive hydration alongside newer Alexa entries", () => {
  const oil = item("olio", "Olio");
  const salt = item("sale", "Sale");
  const pasta = item("pasta", "Pasta", { recipe: "Carbonara" });
  const eggs = item("uova", "Uova", { recipe: "Tiramisù" });
  const remote = [{ ...oil, quantity: "2", recipe: "Tiramisù" }, salt, eggs];
  const local = [{ ...oil, checked: true }, pasta];
  assert.deepEqual(mergeShoppingChanges([oil, salt], local, remote), [
    { ...oil, quantity: "2", recipe: "Tiramisù", checked: true },
    eggs,
    pasta,
  ]);
});

test("a persisted baseline allows retries and does not restore recipes removed remotely", () => {
  const eggs = item("uova", "Uova", { recipe: "Tiramisù" });
  const pasta = item("pasta", "Pasta", { recipe: "Carbonara" });
  const remote = [];
  assert.equal(mergeShoppingChanges([{ ...eggs }], [{ ...eggs }], remote), remote);
  assert.deepEqual(mergeShoppingChanges([{ ...eggs }], [{ ...eggs }, pasta], remote), [pasta]);
});
