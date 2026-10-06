// Deterministic localisation: no translation service or additional API cost.
const ENGLISH_TEXT: Record<string, string> = {
  "Quale piatto vuoi preparare?": "What would you like to cook?",
  "Dimmi un numero intero di persone da uno a venti.": "How many people? Please say a whole number from one to twenty.",
  "Prima collega Alexa alla lista della spesa nell'app Safe Scan Eats.": "First, link Alexa to your shopping list in the Safe Scan Eats app.",
  "Non c'è una ricetta in attesa di scelta del profilo.": "There is no recipe waiting for a profile. Tell me what you would like to cook.",
  "Dimmi il nome del profilo da usare.": "Please say the name of the profile to use.",
  "Che prodotto vuoi aggiungere alla lista?": "What item would you like to add to the list?",
  "Quale prodotto vuoi togliere dalla lista?": "What item would you like to remove from the list?",
  "Quale prodotto devo segnare come comprato?": "What item would you like to mark as bought?",
  "Quale prodotto devo rimettere tra quelli da comprare?": "What item would you like to mark as still needed?",
  "La lista della spesa è vuota.": "Your shopping list is empty.",
  "Vuoi davvero svuotare tutta la lista della spesa? Rispondi sì oppure no.": "Do you want to clear the entire shopping list? Say yes or no.",
  "Fatto. Ho svuotato tutta la lista della spesa.": "Done. I cleared the entire shopping list.",
  "Non c'è nessuna operazione da confermare.": "There is nothing waiting for confirmation.",
  "Va bene, non ho cancellato nulla.": "OK. I haven't deleted anything.",
  "Va bene.": "OK.",
  "Va bene, a presto.": "OK. Goodbye.",
  "Non c'è nessuna ricetta da aggiungere di nuovo.": "There is no recipe waiting to be added again.",
  "Non c'è nessuna ricetta da sostituire.": "There is no recipe waiting to be replaced. Tell me what you would like to cook first.",
  "Non riesco a individuare la ricetta da sostituire. Non ho modificato la lista.": "I couldn't identify the recipe to replace. I haven't changed your list.",
  "Non riesco a generare gli ingredienti della nuova versione in questo momento. La lista non è stata modificata. Puoi riprovare dicendo sostituisci, oppure annulla.": "I can't generate the new ingredients right now. Your list hasn't changed. Say replace to try again, or cancel.",
  "La ricetta da sostituire è stata modificata o rimossa. Non ho cambiato la lista. Chiedimi di nuovo quale ricetta vuoi preparare.": "The recipe to replace has been changed or removed. I haven't changed the list. Please tell me again what you would like to cook.",
  "Gli ingredienti della vecchia ricetta sono sommati a quelli di altre ricette. Non posso separarli senza cambiare le altre quantità. Non ho modificato nulla. Puoi dire aggiungi per inserire la nuova ricetta separatamente, oppure annulla.": "The old recipe's ingredients are combined with other recipes. I can't separate their quantities safely. I haven't changed anything. Say add to add the new recipe separately, or cancel.",
  "Quale ricetta vuoi preparare? Dimmi, per esempio: voglio fare la carbonara per due persone.": "What would you like to cook? For example, say: I want to make carbonara for two people.",
  "La ricetta è stata modificata o rimossa dalla lista. Chiedimi di prepararla di nuovo con il numero di persone desiderato.": "The recipe has been changed or removed from the list. Please request it again with the number of people you need.",
  "Questa ricetta contiene quantità che non posso ricalcolare con precisione. Non ho modificato la lista.": "This recipe has quantities I can't rescale accurately. I haven't changed the list.",
  "Benvenuto in Safe Scan. Dimmi quale piatto vuoi preparare, per esempio: voglio fare la carbonara.": "Welcome to Safe Scan. Tell me what you would like to cook. For example: I want to make carbonara.",
  "Non ho capito. Prova a dirmi quale piatto vuoi preparare.": "I didn't understand. Please tell me what you would like to cook.",
  "Puoi dirmi: voglio fare la carbonara per due persone. Se non indichi le persone, te le chiederò. Per cambiare l'ultima ricetta durante la conversazione puoi dire: anzi, falla per due persone. Puoi anche aggiungere o togliere prodotti dalla lista. Quando hai più profili ti chiederò quale usare. Se una ricetta è già presente, puoi dire aggiungi oppure sostituisci.": "Say: I want to make carbonara for two people. If you don't give a number, I'll ask how many people. During the conversation, say: make it for two people instead. You can add or remove shopping items. If you have multiple profiles, I'll ask which one to use. When I offer to add or replace a recipe, say add or replace.",
};

const ENGLISH_ERRORS: Record<string, string> = {
  "Ho avuto un problema nell'aggiornare la lista della spesa. Riprova tra poco.": "I couldn't update your shopping list. Please try again shortly.",
  "Ho avuto un problema nel modificare la lista della spesa. Riprova tra poco.": "I couldn't change your shopping list. Please try again shortly.",
  "Ho avuto un problema con la lista della spesa. Riprova tra poco.": "There was a problem with your shopping list. Please try again shortly.",
  "Ho avuto un problema nell'aggiornare la lista. Riprova tra poco.": "I couldn't update your list. Please try again shortly.",
  "Non sono riuscito ad aggiornare le porzioni. Riprova tra poco.": "I couldn't update the servings. Please try again shortly.",
  "Non riesco a usare quel profilo in questo momento. Riprova tra poco.": "I can't use that profile right now. Please try again shortly.",
  "Non sono riuscito ad aggiungere quel prodotto. Riprova.": "I couldn't add that item. Please try again.",
  "Non riesco a leggere la lista della spesa in questo momento. Riprova tra poco.": "I can't read your shopping list right now. Please try again shortly.",
  "Non sono riuscito a svuotare la lista. Riprova tra poco.": "I couldn't clear the list. Please try again shortly.",
  "Non sono riuscito ad aggiungere di nuovo la ricetta. Riprova tra poco.": "I couldn't add the recipe again. Please try again shortly.",
};

const FOOD_EN: Record<string, string> = {
  "pasta alla norma": "pasta alla Norma", "lasagne": "lasagna", "tiramisu": "tiramisu",
  "pasta senza glutine": "gluten free pasta", "sfoglia per lasagne senza glutine": "gluten free lasagna sheets",
  "sfoglia per lasagne": "lasagna sheets", "carne macinata": "minced meat", "passata di pomodoro": "tomato passata",
  "besciamella senza glutine": "gluten free bechamel", "besciamella": "bechamel",
  "parmigiano grattugiato": "grated parmesan", "olio extravergine d'oliva": "extra virgin olive oil",
  "pecorino romano": "pecorino romano", "ricotta salata": "salted ricotta", "pepe nero": "black pepper",
  "uova": "eggs", "cipolla": "onion", "carota": "carrot", "sedano": "celery", "sale": "salt",
  "latte": "milk", "burro": "butter", "zucchero": "sugar", "farina": "flour", "melanzane": "aubergines",
  "basilico": "basil", "aglio": "garlic", "zucchine": "courgettes", "acqua": "water",
  "riso": "rice", "q.b.": "as needed", "cucchiai": "tablespoons", "costa": "stalk",
  "olio extravergine di oliva": "extra virgin olive oil", "savoiardi": "ladyfinger biscuits",
  "caffè": "coffee", "cacao amaro": "unsweetened cocoa", "piselli": "peas", "pangrattato": "breadcrumbs",
  "mele": "apples", "lievito per dolci": "baking powder", "torta di mele": "apple cake",
  "formaggio fresco non stagionato": "fresh unaged cheese", "carne fresca di pollo o tacchino": "fresh chicken or turkey",
  "carne fresca non stagionata": "fresh uncured meat", "pesce molto fresco": "very fresh fish",
  "zucca o crema di verdure tollerate": "pumpkin or a puree of tolerated vegetables", "bietole": "chard",
  "carruba": "carob", "succo di limone se tollerato": "lemon juice if tolerated",
  "acqua o brodo fresco": "water or fresh stock", "condimento non fermentato": "unfermented seasoning",
};

function englishFood(text: string): string {
  let result = text;
  for (const [it, en] of Object.entries(FOOD_EN).sort((a, b) => b[0].length - a[0].length)) {
    const escaped = it.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    result = result.replace(new RegExp(`(?<![a-z])${escaped}(?![a-z])`, "gi"), en);
  }
  return result;
}

export function englishDish(input: string): string {
  const aliases: Record<string, string> = {
    "lasagna": "lasagne", "lasagne": "lasagne", "apple cake": "torta di mele", "apple pie": "torta di mele",
    "carbonara pasta": "carbonara", "pasta carbonara": "carbonara", "margherita pizza": "pizza margherita",
    "pasta alla norma": "pasta alla norma", "rice balls": "arancini",
  };
  const match = input.trim().match(/^(.*?)(\s+for\s+(?:\d+(?:[.,]\d+)?|[a-z]+)\s+(?:people|persons?|servings?)\s*)?$/i);
  const base = (match?.[1] ?? input).trim().replace(/^(?:the|a|an)\s+/i, "");
  return `${aliases[base.toLowerCase()] ?? base}${match?.[2] ?? ""}`;
}

export function englishItem(input: string): string {
  // Keep manually entered quantities and match English item names to Italian cloud rows.
  let result = input;
  for (const [it, en] of Object.entries(FOOD_EN).sort((a, b) => b[1].length - a[1].length)) {
    if (it === "q.b." || it === "costa" || it === "cucchiai") continue;
    const escaped = en.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    result = result.replace(new RegExp(`(?<![a-z])${escaped}(?![a-z])`, "gi"), it);
  }
  return result;
}

export function englishAlexaText(text: string): string {
  const exact = ENGLISH_TEXT[text] ?? ENGLISH_ERRORS[text];
  if (exact) return exact;
  const rules: Array<[RegExp, (...args: string[]) => string]> = [
    [/^Per quante persone vuoi preparare (.+)\?$/, (_m, dish) => `For how many people would you like to make ${dish}?`],
    [/^Per quale profilo vuoi preparare (.+)\? Puoi scegliere: (.+)\.$/, (_m, dish, profiles) => `Which profile should I use for ${dish}? You can choose: ${profiles}.`],
    [/^Non trovo il profilo (.+)\. Puoi scegliere: (.+)\.$/, (_m, name, profiles) => `I couldn't find the profile ${name}. You can choose: ${profiles}.`],
    [/^(.+) è già presente nella lista\. Vuoi aggiungerla a quella esistente oppure sostituirla\?$/, (_m, dish) => `${dish} is already in your list. Would you like to add it again or replace it?`],
    [/^Vuoi aggiungere (.+) oppure sostituire l'ultima ricetta, (.+), con (.+)\? Rispondi aggiungi oppure sostituisci\.$/, (_m, dish, old) => `Would you like to add ${dish}, or replace your last recipe, ${old}, with ${dish}? Say add or replace.`],
    [/^Ho capito (.+), ma non riesco a creare la lista ingredienti in questo momento\.$/, (_m, dish) => `I understood ${dish}, but I can't generate its ingredients right now.`],
    [/^Fatto\. Ho aggiunto (\d+) ingredienti per (.+) per (\d+) person[ae](?: per il profilo (.+?))? alla lista della spesa di Safe Scan Eats\.(.*)$/, (_m, count, dish, n, profile, note) => `Done. I added ${count} ingredients for ${dish} for ${n} ${n === "1" ? "person" : "people"}${profile ? ` using the ${profile} profile` : ""} to your Safe Scan Eats shopping list.${note ? " I adapted the ingredients to avoid foods typically problematic for histamine sensitivity where possible." : ""}`],
    [/^Fatto\. Ho aggiornato (.+) per (\d+) person[ae], senza aggiungere altri ingredienti\.$/, (_m, dish, n) => `Done. I updated ${dish} for ${n} ${n === "1" ? "person" : "people"}, without adding more ingredients.`],
    [/^Va bene, per (\d+) persone\. Quale profilo vuoi usare\?$/, (_m, n) => `OK, for ${n} ${n === "1" ? "person" : "people"}. Which profile should I use?`],
    [/^Va bene, per (\d+) persone\. Vuoi aggiungere la ricetta oppure sostituirla\?$/, (_m, n) => `OK, for ${n} ${n === "1" ? "person" : "people"}. Would you like to add the recipe or replace it?`],
    [/^Fatto\. Ho sostituito (.+) con la versione per (\d+) person[ae]\.$/, (_m, dish, n) => `Done. I replaced ${dish} with the version for ${n} ${n === "1" ? "person" : "people"}.`],
    [/^Fatto\. Ho sostituito (.+) con (.+) per (\d+) person[ae]\.$/, (_m, old, dish, n) => `Done. I replaced ${old} with ${dish} for ${n} ${n === "1" ? "person" : "people"}.`],
    [/^Va bene\. Ho aggiunto un'altra (.+) per (\d+) person[ae] alla lista\.$/, (_m, dish, n) => `OK. I added another ${dish} for ${n} ${n === "1" ? "person" : "people"} to the list.`],
    [/^Fatto\. Ho aggiunto (.+), (.+), alla lista della spesa\.$/, (_m, name, qty) => `Done. I added ${name}, ${qty}, to the shopping list.`],
    [/^Fatto\. Ho tolto (.+) dalla lista della spesa\.$/, (_m, name) => `Done. I removed ${name} from the shopping list.`],
    [/^Fatto\. Ho segnato (.+) come comprato\.$/, (_m, name) => `Done. I marked ${name} as bought.`],
    [/^Fatto\. Ho rimesso (.+) tra i prodotti da comprare\.$/, (_m, name) => `Done. I marked ${name} as still needed.`],
    [/^Non trovo (.+) (?:nella lista della spesa|tra i prodotti da comprare|tra i prodotti acquistati)\.$/, (_m, name) => `I couldn't find ${name} in that part of the shopping list.`],
    [/^Hai (\d+) prodotti da comprare\. I primi sono: (.+)\. E altri (\d+)\.$/, (_m, n, list, rest) => `You have ${n} items to buy. The first are: ${list}. And ${rest} more.`],
    [/^Hai (\d+) prodotti da comprare: (.+)\.$/, (_m, n, list) => `You have ${n} items to buy: ${list}.`],
    [/^Prima (?:devo collegarmi alla tua lista|colleghiamo la tua lista della spesa)\. Apri Safe Scan Eats(?:, entra nella lista della spesa)? e inserisci il codice (.+?)(?: nella sezione Collega Alexa)?\.(?: Il codice dura dieci minuti\.)?$/, (_m, code) => `First, link your shopping list. Open Safe Scan Eats and enter the code ${code} in Link Alexa. The code lasts ten minutes.`],
  ];
  for (const [pattern, replace] of rules) {
    const match = text.match(pattern);
    if (match) return englishFood(replace(...match));
  }
  console.error("[Alexa] missing English response translation");
  return "Sorry, I couldn't complete that request. Please try again.";
}

export function localizeAlexaResponse(data: unknown, english: boolean): unknown {
  if (!english || !data || typeof data !== "object") return data;
  const response = data as { response?: { outputSpeech?: { type?: string; text?: string } } };
  if (response.response?.outputSpeech?.type !== "PlainText" || !response.response.outputSpeech.text) return data;
  return { ...data, response: { ...response.response, outputSpeech: {
    ...response.response.outputSpeech, text: englishAlexaText(response.response.outputSpeech.text),
  } } };
}
