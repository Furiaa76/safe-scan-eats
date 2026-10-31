// Reviewed translation of one exact catalog text, not a recipe or an allergen
// exemption. If its source changes, keep the original language and warning.
const original = "Levure naturelle (eau, amidon de blé déglutiné, levure de bière, amidon de mais, dextrose, fibres végétales: psyllium et inuline; poudre de levain de mais, épaississants gomme de guar, hydroxy-propyl-methylcellulose; lactobacilles), beurre sans lactose*, amidon de mais, sucre, oeufs, jaune d'œuf, Lait frais partiellement écrémé sans lactose*, sirop de glucose, sucre glace, emulsitiant: mono et di-glycérides d'acides gras ; fibres vegetales: psylium; beurre de cacao, épaississant: gomme de guar; sel, conservateurs : acide sorbique, sorbate de potassium; arômes, enzymes: amylase.";
const italian = "Lievito naturale (acqua, amido di frumento deglutinato, lievito di birra, amido di mais, destrosio, fibre vegetali: psyllium e inulina; lievito madre di mais in polvere, addensanti: gomma di guar, idrossipropilmetilcellulosa; lattobacilli), burro senza lattosio*, amido di mais, zucchero, uova, tuorlo d’uovo, latte fresco parzialmente scremato senza lattosio*, sciroppo di glucosio, zucchero a velo, emulsionante: mono e digliceridi degli acidi grassi; fibre vegetali: psyllium; burro di cacao, addensante: gomma di guar; sale, conservanti: acido sorbico, sorbato di potassio; aromi, enzimi: amilasi.";
const normalize = (text: string) => text.normalize("NFC").trim().replace(/\s+/g, " ");

export function reviewedIngredientTranslation(code: string, brand: string, language: string, text: string): string | undefined {
  if (code !== "8003040025431" || brand.trim().toLowerCase() !== "giampaoli" || language !== "fr") return undefined;
  return normalize(text) === normalize(original) ? italian : undefined;
}
