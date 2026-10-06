import { readFileSync, writeFileSync } from 'node:fs';
// Keep Alexa self-contained: its serverless ESM runtime cannot resolve TS source imports.
const root = new URL('../', import.meta.url);
const catalog = readFileSync(new URL('src/lib/recipe-catalog.ts', root), 'utf8');
const json = catalog.match(/export const EXTRA_RECIPES: CatalogRecipe\[\] = ([\s\S]*?);\n/)?.[1];
if (!json) throw new Error('Recipe catalog format changed');
JSON.parse(json);
const path = new URL('api/alexa.ts', root);
let api = readFileSync(path, 'utf8');
const foodJson = catalog.match(/export const CATALOG_FOOD_EN: Record<string, string> = ([\s\S]*?);\n/)?.[1];
if (!foodJson) throw new Error('Food translations missing');
const foods = Object.fromEntries(Object.entries(JSON.parse(foodJson)).map(([it, en]) => [it.toLowerCase(), en]));
api = api.replace(/const CATALOG_FOOD_EN: Record<string, string> = [\s\S]*?;\n/, 'const CATALOG_FOOD_EN: Record<string, string> = ' + JSON.stringify(foods, null, 2) + ';\n');
const marker = '// Generated from src/lib/recipe-catalog.ts by scripts/sync-recipe-catalog.mjs.';
const start = api.indexOf(marker);
const end = api.indexOf('function cleanDish(input: string)', start);
if (start < 0 || end < 0) throw new Error('Alexa catalog markers missing');
writeFileSync(path, api.slice(0, start) + marker + '\nconst EXTRA_RECIPES: Array<{ id: string; title: string; englishTitle: string; aliases: string[]; servings: number; ingredients: Array<{ name: string; quantity: string; glutenSwap?: string; lactoseSwap?: string }> }> = ' + json + ';\n\n' + api.slice(end));
